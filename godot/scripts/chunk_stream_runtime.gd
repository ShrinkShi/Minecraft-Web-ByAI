class_name ChunkStreamRuntime
extends RefCounted

const TerrainGeneratorRuntime = preload("res://godot/scripts/terrain_generator.gd")
const WorldEditSidecar = preload("res://godot/scripts/world_edit_sidecar.gd")

var seed: String
var prompt: String
var version: int
var render_distance: int
var unload_distance: int
var center_chunk := Vector2i.ZERO
var chunks: Dictionary = {}
var pending: Dictionary = {}
var wanted: Dictionary = {}

var _edits
var _results: Dictionary = {}
var _result_mutex := Mutex.new()
var _disposed := false

func _init(world_seed: String = "1", world_prompt: String = "", terrain_version: int = TerrainGeneratorRuntime.TERRAIN_GENERATOR_VERSION, view_distance: int = 2, saved_edits: Dictionary = {}) -> void:
	seed = world_seed
	prompt = world_prompt
	version = TerrainGeneratorRuntime.normalize_version(terrain_version)
	render_distance = maxi(0, view_distance)
	unload_distance = render_distance + 1
	_edits = WorldEditSidecar.new()
	if not _edits.import_snapshot(saved_edits):
		push_error("chunk stream received invalid saved world edits")

static func chunk_from_world(world_x: float, world_z: float) -> Vector2i:
	return Vector2i(
		int(floor(world_x / float(TerrainGeneratorRuntime.CHUNK_SIZE))),
		int(floor(world_z / float(TerrainGeneratorRuntime.CHUNK_SIZE)))
	)

static func chunk_from_cell(cell: Vector3i) -> Vector2i:
	return chunk_from_world(float(cell.x), float(cell.z))

static func chunk_key_string(key: Vector2i) -> String:
	return "%d,%d" % [key.x, key.y]

func desired_keys(center: Vector2i, radius: int = -1) -> Array[Vector2i]:
	var resolved_radius: int = render_distance if radius < 0 else maxi(0, radius)
	var result: Array[Vector2i] = []
	for ring in range(resolved_radius + 1):
		for dx in range(-ring, ring + 1):
			for dz in range(-ring, ring + 1):
				if maxi(absi(dx), absi(dz)) != ring:
					continue
				result.append(center + Vector2i(dx, dz))
	return result

func prime_chunk_sync(key: Vector2i) -> bool:
	if _disposed:
		return false
	wanted[key] = true
	if chunks.has(key):
		return true
	if pending.has(key):
		var task_id: int = int(pending[key])
		var wait_error: Error = WorkerThreadPool.wait_for_task_completion(task_id)
		pending.erase(key)
		var pending_data: Variant = _take_result(key)
		if wait_error != OK:
			push_error("failed to synchronously reap terrain task %d for chunk %s: %s" % [task_id, key, error_string(wait_error)])
			return false
		return _install_chunk(key, pending_data)
	var generator = TerrainGeneratorRuntime.new(seed, prompt, version)
	return _install_chunk(key, generator.generate_chunk(key.x, key.y))

func request_around_world(world_x: float, world_z: float) -> Array[Vector2i]:
	if _disposed:
		return []
	center_chunk = chunk_from_world(world_x, world_z)
	var desired: Array[Vector2i] = desired_keys(center_chunk)
	wanted.clear()
	for key in desired:
		wanted[key] = true
		_request_chunk(key)
	_unload_far_chunks()
	return desired

func poll_completed(max_results: int = 4) -> Array[Vector2i]:
	var installed: Array[Vector2i] = []
	if _disposed or max_results <= 0:
		return installed
	for key_variant in pending.keys():
		if installed.size() >= max_results:
			break
		var key: Vector2i = key_variant
		var task_id: int = int(pending[key])
		if not WorkerThreadPool.is_task_completed(task_id):
			continue
		var wait_error: Error = WorkerThreadPool.wait_for_task_completion(task_id)
		pending.erase(key)
		if wait_error != OK:
			push_error("failed to reap terrain task %d for chunk %s: %s" % [task_id, key, error_string(wait_error)])
			_take_result(key)
			continue
		var data: Variant = _take_result(key)
		if not wanted.has(key):
			continue
		if _install_chunk(key, data):
			installed.append(key)
	return installed

func has_chunk(key: Vector2i) -> bool:
	return chunks.has(key)

func loaded_keys() -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for key_variant in chunks.keys():
		result.append(key_variant)
	return result

func get_chunk(key: Vector2i) -> PackedByteArray:
	var data: Variant = chunks.get(key)
	return data if typeof(data) == TYPE_PACKED_BYTE_ARRAY else PackedByteArray()

func get_block(world_cell: Vector3i) -> int:
	if world_cell.y < 0 or world_cell.y >= TerrainGeneratorRuntime.WORLD_HEIGHT:
		return 0
	var key: Vector2i = chunk_from_cell(world_cell)
	var data: Variant = chunks.get(key)
	if typeof(data) != TYPE_PACKED_BYTE_ARRAY:
		return 0
	var local_x: int = posmod(world_cell.x, TerrainGeneratorRuntime.CHUNK_SIZE)
	var local_z: int = posmod(world_cell.z, TerrainGeneratorRuntime.CHUNK_SIZE)
	var index: int = TerrainGeneratorRuntime.terrain_chunk_index(local_x, world_cell.y, local_z)
	return int(data[index])

func set_block(world_cell: Vector3i, block_id: int, record_same_id: bool = false) -> bool:
	if _disposed or world_cell.y < 0 or world_cell.y >= TerrainGeneratorRuntime.WORLD_HEIGHT or block_id < 0 or block_id > 255:
		return false
	var key: Vector2i = chunk_from_cell(world_cell)
	var data: Variant = chunks.get(key)
	if typeof(data) != TYPE_PACKED_BYTE_ARRAY:
		return false
	var bytes: PackedByteArray = data
	var local_x: int = posmod(world_cell.x, TerrainGeneratorRuntime.CHUNK_SIZE)
	var local_z: int = posmod(world_cell.z, TerrainGeneratorRuntime.CHUNK_SIZE)
	var index: int = TerrainGeneratorRuntime.terrain_chunk_index(local_x, world_cell.y, local_z)
	var id_changed: bool = int(bytes[index]) != block_id
	if not id_changed and not record_same_id:
		return false
	if id_changed:
		bytes[index] = block_id
		chunks[key] = bytes
	_edits.set_edit(chunk_key_string(key), index, block_id)
	return true

func export_edits() -> Dictionary:
	return {} if _edits == null else _edits.export_snapshot()

func dispose() -> void:
	_result_mutex.lock()
	if _disposed:
		_result_mutex.unlock()
		return
	_disposed = true
	_result_mutex.unlock()
	for task_variant in pending.values():
		var task_id: int = int(task_variant)
		WorkerThreadPool.wait_for_task_completion(task_id)
	pending.clear()
	_result_mutex.lock()
	_results.clear()
	_result_mutex.unlock()
	chunks.clear()
	wanted.clear()
	if _edits != null:
		_edits.clear()

func _request_chunk(key: Vector2i) -> void:
	if chunks.has(key) or pending.has(key):
		return
	var task_id: int = WorkerThreadPool.add_task(_generate_chunk_task.bind(key), false, "terrain chunk %d,%d" % [key.x, key.y])
	pending[key] = task_id

func _generate_chunk_task(key: Vector2i) -> void:
	var generator = TerrainGeneratorRuntime.new(seed, prompt, version)
	var data: PackedByteArray = generator.generate_chunk(key.x, key.y)
	_result_mutex.lock()
	if not _disposed:
		_results[key] = data
	_result_mutex.unlock()

func _take_result(key: Vector2i) -> Variant:
	_result_mutex.lock()
	var data: Variant = _results.get(key)
	_results.erase(key)
	_result_mutex.unlock()
	return data

func _install_chunk(key: Vector2i, data: Variant) -> bool:
	if typeof(data) != TYPE_PACKED_BYTE_ARRAY:
		push_error("terrain chunk %s did not produce PackedByteArray data" % key)
		return false
	var bytes: PackedByteArray = data
	var expected_size: int = TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.WORLD_HEIGHT
	if bytes.size() != expected_size:
		push_error("terrain chunk %s returned invalid byte count: %d" % [key, bytes.size()])
		return false
	if _edits != null:
		bytes = _edits.apply_chunk(chunk_key_string(key), bytes)
	chunks[key] = bytes
	return true

func _unload_far_chunks() -> void:
	for key_variant in chunks.keys():
		var key: Vector2i = key_variant
		if maxi(absi(key.x - center_chunk.x), absi(key.y - center_chunk.y)) > unload_distance:
			chunks.erase(key)
