class_name ChunkStreamRuntime
extends RefCounted

const TerrainGeneratorRuntime = preload("res://godot/scripts/terrain_generator.gd")

var seed: String
var prompt: String
var version: int
var render_distance: int
var unload_distance: int
var center_chunk := Vector2i.ZERO
var chunks: Dictionary = {}
var pending: Dictionary = {}
var wanted: Dictionary = {}

var _results: Dictionary = {}
var _result_mutex := Mutex.new()
var _disposed := false

func _init(world_seed: String = "1", world_prompt: String = "", terrain_version: int = TerrainGeneratorRuntime.TERRAIN_GENERATOR_VERSION, view_distance: int = 2) -> void:
	seed = world_seed
	prompt = world_prompt
	version = TerrainGeneratorRuntime.normalize_version(terrain_version)
	render_distance = maxi(0, view_distance)
	unload_distance = render_distance + 1

static func chunk_from_world(world_x: float, world_z: float) -> Vector2i:
	return Vector2i(
		int(floor(world_x / float(TerrainGeneratorRuntime.CHUNK_SIZE))),
		int(floor(world_z / float(TerrainGeneratorRuntime.CHUNK_SIZE)))
	)

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
		if typeof(data) != TYPE_PACKED_BYTE_ARRAY:
			push_error("terrain task for chunk %s completed without PackedByteArray data" % key)
			continue
		var bytes: PackedByteArray = data
		if bytes.size() != TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.WORLD_HEIGHT:
			push_error("terrain task for chunk %s returned invalid byte count: %d" % [key, bytes.size()])
			continue
		chunks[key] = bytes
		installed.append(key)
	return installed

func has_chunk(key: Vector2i) -> bool:
	return chunks.has(key)

func get_chunk(key: Vector2i) -> PackedByteArray:
	var data: Variant = chunks.get(key)
	return data if typeof(data) == TYPE_PACKED_BYTE_ARRAY else PackedByteArray()

func get_block(world_cell: Vector3i) -> int:
	if world_cell.y < 0 or world_cell.y >= TerrainGeneratorRuntime.WORLD_HEIGHT:
		return 0
	var key := Vector2i(
		int(floor(float(world_cell.x) / float(TerrainGeneratorRuntime.CHUNK_SIZE))),
		int(floor(float(world_cell.z) / float(TerrainGeneratorRuntime.CHUNK_SIZE)))
	)
	var data: Variant = chunks.get(key)
	if typeof(data) != TYPE_PACKED_BYTE_ARRAY:
		return 0
	var local_x: int = posmod(world_cell.x, TerrainGeneratorRuntime.CHUNK_SIZE)
	var local_z: int = posmod(world_cell.z, TerrainGeneratorRuntime.CHUNK_SIZE)
	var index: int = TerrainGeneratorRuntime.terrain_chunk_index(local_x, world_cell.y, local_z)
	return int(data[index])

func dispose() -> void:
	if _disposed:
		return
	_disposed = true
	for task_variant in pending.values():
		var task_id: int = int(task_variant)
		WorkerThreadPool.wait_for_task_completion(task_id)
	pending.clear()
	_result_mutex.lock()
	_results.clear()
	_result_mutex.unlock()
	chunks.clear()
	wanted.clear()

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

func _unload_far_chunks() -> void:
	for key_variant in chunks.keys():
		var key: Vector2i = key_variant
		if maxi(absi(key.x - center_chunk.x), absi(key.y - center_chunk.y)) > unload_distance:
			chunks.erase(key)
