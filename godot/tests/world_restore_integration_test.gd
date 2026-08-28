extends SceneTree

const SaveRuntime = preload("res://godot/scripts/native_world_save.gd")
const EditSidecar = preload("res://godot/scripts/world_edit_sidecar.gd")
const StateSidecar = preload("res://godot/scripts/block_state_sidecar.gd")
const ChunkStreamRuntime = preload("res://godot/scripts/chunk_stream_runtime.gd")
const VoxelWorldRuntime = preload("res://godot/scripts/voxel_world.gd")

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var fixture_path: String = OS.get_environment("GODOT_SAVE_FIXTURE")
	if fixture_path.is_empty():
		_fail(null, "GODOT_SAVE_FIXTURE is required")
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(fixture_path))
	if typeof(parsed) != TYPE_DICTIONARY:
		_fail(null, "invalid Godot save fixture document")
		return
	var document: Dictionary = parsed
	var record_variant: Variant = document.get("currentRecord")
	var expected_variant: Variant = document.get("expected")
	if typeof(record_variant) != TYPE_DICTIONARY or typeof(expected_variant) != TYPE_DICTIONARY:
		_fail(null, "save restore fixture is missing currentRecord or expected")
		return
	var record: Dictionary = record_variant
	var expected: Dictionary = expected_variant
	var resolved: Dictionary = SaveRuntime.resolve_record(record)
	if not bool(resolved.get("ok", false)):
		_fail(null, "current Web save fixture was rejected before world restore: %s" % resolved)
		return
	var cells_variant: Variant = expected.get("cells")
	if typeof(cells_variant) != TYPE_DICTIONARY:
		_fail(null, "save restore fixture is missing cell descriptors")
		return
	var cells: Dictionary = cells_variant
	var state_cell: Vector3i = _world_cell(cells.get("state"))
	var plain_cell: Vector3i = _world_cell(cells.get("plain"))
	var negative_cell: Vector3i = _world_cell(cells.get("negative"))
	if state_cell.y < 0 or plain_cell.y < 0 or negative_cell.y < 0:
		_fail(null, "save restore fixture cell descriptors are invalid")
		return

	if not _check_chunk_stream_restore(record, resolved, cells, state_cell, plain_cell, negative_cell):
		return
	if not _check_voxel_world_restore(record, resolved, cells, state_cell, plain_cell):
		return
	print("Godot restored edits/block-state world integration: PASS")
	quit(0)

func _check_chunk_stream_restore(record: Dictionary, resolved: Dictionary, cells: Dictionary, state_cell: Vector3i, plain_cell: Vector3i, negative_cell: Vector3i) -> bool:
	var stream = ChunkStreamRuntime.new(
		str(record.get("seed", "1")),
		str(record.get("prompt", "")),
		int(resolved.get("terrainVersion", 4)),
		0,
		resolved.get("edits", {})
	)
	if not stream.prime_chunk_sync(Vector2i.ZERO):
		stream.dispose()
		return _fail_bool(null, "saved spawn chunk could not be synchronously restored")
	var state_descriptor: Dictionary = cells.get("state", {})
	var plain_descriptor: Dictionary = cells.get("plain", {})
	if stream.get_block(state_cell) != int(state_descriptor.get("id", -1)):
		stream.dispose()
		return _fail_bool(null, "synchronous chunk install did not apply the saved stateful block id edit")
	if stream.get_block(plain_cell) != int(plain_descriptor.get("id", -1)):
		stream.dispose()
		return _fail_bool(null, "synchronous chunk install did not apply the saved plain block id edit")

	stream.request_around_world(float(negative_cell.x) + 0.5, float(negative_cell.z) + 0.5)
	var negative_key: Vector2i = ChunkStreamRuntime.chunk_from_cell(negative_cell)
	var deadline: int = Time.get_ticks_msec() + 10000
	while not stream.has_chunk(negative_key) and Time.get_ticks_msec() < deadline:
		stream.poll_completed(1)
		OS.delay_msec(2)
	if not stream.has_chunk(negative_key):
		stream.dispose()
		return _fail_bool(null, "asynchronous worker chunk did not install within 10 seconds")
	var negative_descriptor: Dictionary = cells.get("negative", {})
	if stream.get_block(negative_cell) != int(negative_descriptor.get("id", -1)):
		stream.dispose()
		return _fail_bool(null, "asynchronous chunk install did not apply the saved negative-chunk edit")
	var canonical_edits := EditSidecar.new()
	if not canonical_edits.import_snapshot(stream.export_edits()) or canonical_edits.entry_count() != 3:
		stream.dispose()
		return _fail_bool(null, "streamed world did not retain all sparse saved edits after sync/async installs")
	stream.dispose()
	return true

func _check_voxel_world_restore(record: Dictionary, resolved: Dictionary, cells: Dictionary, state_cell: Vector3i, plain_cell: Vector3i) -> bool:
	var world = VoxelWorldRuntime.new()
	world.world_seed = str(record.get("seed", "1"))
	world.world_prompt = str(record.get("prompt", ""))
	world.terrain_version = int(resolved.get("terrainVersion", 4))
	world.render_distance = 0
	world.chunk_install_budget = 1
	world.mesh_rebuild_budget = 1
	if not world.configure_restore(resolved.get("edits", {}), resolved.get("blockStates", {})):
		return _fail_bool(world, "VoxelWorld rejected validated saved edits/blockStates")
	get_root().add_child(world)

	var state_descriptor: Dictionary = cells.get("state", {})
	var plain_descriptor: Dictionary = cells.get("plain", {})
	var negative_descriptor: Dictionary = cells.get("negative", {})
	var expected_identity := {
		"id": int(state_descriptor.get("id", -1)),
		"stateKey": str(state_descriptor.get("stateKey", "")),
	}
	if world.get_block_identity(state_cell) != expected_identity:
		return _fail_bool(world, "VoxelWorld did not restore the saved non-default block state")
	if world.get_block(plain_cell) != int(plain_descriptor.get("id", -1)):
		return _fail_bool(world, "VoxelWorld did not restore the saved plain block edit")
	if not world.has_chunk_mesh(Vector2i.ZERO):
		return _fail_bool(world, "restored spawn chunk was not meshed from edited terrain bytes")

	if not world.set_block(state_cell, int(state_descriptor.get("id", -1)), "axis=z"):
		return _fail_bool(world, "state-only mutation on an unchanged block id was not accepted")
	if world.get_block_identity(state_cell) != {"id": int(state_descriptor.get("id", -1)), "stateKey": "axis=z"}:
		return _fail_bool(world, "state-only mutation did not update the live block identity")
	var replacement_id: int = int(negative_descriptor.get("id", -1))
	if replacement_id < 0 or not world.set_block(plain_cell, replacement_id):
		return _fail_bool(world, "plain restored block could not be mutated before round-trip")

	var saved_edits: Dictionary = world.export_edits()
	var saved_states: Dictionary = world.export_block_states()
	var edit_probe := EditSidecar.new()
	var state_probe := StateSidecar.new()
	var state_chunk_key: String = str(state_descriptor.get("chunkKey", ""))
	var state_index: int = int(state_descriptor.get("index", -1))
	if not edit_probe.import_snapshot(saved_edits) or edit_probe.get_edit(state_chunk_key, state_index) != int(state_descriptor.get("id", -1)):
		return _fail_bool(world, "state-only mutation did not preserve the owning block id in sparse edits")
	if not state_probe.import_snapshot(saved_states) or state_probe.get_identity(state_chunk_key, state_index, int(state_descriptor.get("id", -1))) != {"id": int(state_descriptor.get("id", -1)), "stateKey": "axis=z"}:
		return _fail_bool(world, "state-only mutation did not persist through the block-state sidecar")

	_cleanup(world)
	world = null

	var restored = VoxelWorldRuntime.new()
	restored.world_seed = str(record.get("seed", "1"))
	restored.world_prompt = str(record.get("prompt", ""))
	restored.terrain_version = int(resolved.get("terrainVersion", 4))
	restored.render_distance = 0
	restored.chunk_install_budget = 1
	restored.mesh_rebuild_budget = 1
	if not restored.configure_restore(saved_edits, saved_states):
		return _fail_bool(restored, "second VoxelWorld rejected exported sparse restore state")
	get_root().add_child(restored)
	if restored.get_block_identity(state_cell) != {"id": int(state_descriptor.get("id", -1)), "stateKey": "axis=z"}:
		return _fail_bool(restored, "destroy/regenerate/restore round-trip lost the non-default block state")
	if restored.get_block(plain_cell) != replacement_id:
		return _fail_bool(restored, "destroy/regenerate/restore round-trip lost the plain block id edit")
	_cleanup(restored)
	return true

func _world_cell(descriptor_variant: Variant) -> Vector3i:
	if typeof(descriptor_variant) != TYPE_DICTIONARY:
		return Vector3i(0, -1, 0)
	var descriptor: Dictionary = descriptor_variant
	var world_variant: Variant = descriptor.get("world")
	if typeof(world_variant) != TYPE_ARRAY:
		return Vector3i(0, -1, 0)
	var row: Array = world_variant
	if row.size() != 3:
		return Vector3i(0, -1, 0)
	return Vector3i(int(row[0]), int(row[1]), int(row[2]))

func _cleanup(world: Node) -> void:
	if world != null and is_instance_valid(world):
		if world.get_parent() != null:
			world.get_parent().remove_child(world)
		world.free()

func _fail_bool(world: Node, message: String) -> bool:
	push_error(message)
	_cleanup(world)
	quit(1)
	return false

func _fail(world: Node, message: String) -> void:
	push_error(message)
	_cleanup(world)
	quit(1)
