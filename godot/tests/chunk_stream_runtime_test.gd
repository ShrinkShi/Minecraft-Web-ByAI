extends SceneTree

const ChunkStreamRuntime = preload("res://godot/scripts/chunk_stream_runtime.gd")
const TerrainGeneratorRuntime = preload("res://godot/scripts/terrain_generator.gd")

func _init() -> void:
	var shape_runtime = ChunkStreamRuntime.new("1", "", 4, 1)
	var desired: Array[Vector2i] = shape_runtime.desired_keys(Vector2i(3, -2))
	if desired.size() != 9 or desired[0] != Vector2i(3, -2):
		_fail("chunk desired-set ring ordering mismatch")
		return
	var unique: Dictionary = {}
	for key in desired:
		unique[key] = true
	if unique.size() != desired.size():
		_fail("chunk desired-set contains duplicates")
		return
	if ChunkStreamRuntime.chunk_from_world(-0.1, -16.1) != Vector2i(-1, -2):
		_fail("negative world-to-chunk floor mapping mismatch")
		return
	shape_runtime.dispose()

	var runtime = ChunkStreamRuntime.new("ci-terrain-2026", "平原", 4, 0)
	var requested: Array[Vector2i] = runtime.request_around_world(0.25, 0.25)
	if requested != [Vector2i.ZERO] or runtime.pending.size() != 1:
		_fail("single-chunk worker request contract mismatch")
		runtime.dispose()
		return
	var deadline: int = Time.get_ticks_msec() + 10000
	while not runtime.has_chunk(Vector2i.ZERO) and Time.get_ticks_msec() < deadline:
		runtime.poll_completed(1)
		OS.delay_msec(2)
	if not runtime.has_chunk(Vector2i.ZERO):
		_fail("worker terrain chunk did not complete within 10 seconds")
		runtime.dispose()
		return
	var chunk: PackedByteArray = runtime.get_chunk(Vector2i.ZERO)
	var expected_size: int = TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.WORLD_HEIGHT
	if chunk.size() != expected_size:
		_fail("worker terrain chunk byte-size mismatch")
		runtime.dispose()
		return
	if runtime.get_block(Vector3i(0, 0, 0)) == 0:
		_fail("streamed terrain did not expose dense block lookup")
		runtime.dispose()
		return
	if not runtime.pending.is_empty():
		_fail("completed WorkerThreadPool task was not reaped")
		runtime.dispose()
		return
	runtime.dispose()
	print("Godot chunk streaming worker checks: PASS")
	quit(0)

func _fail(message: String) -> void:
	push_error(message)
	quit(1)
