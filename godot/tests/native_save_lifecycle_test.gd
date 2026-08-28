extends SceneTree

const SaveRuntime = preload("res://godot/scripts/native_world_save.gd")
const StateSidecar = preload("res://godot/scripts/block_state_sidecar.gd")

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
		_fail(null, "native lifecycle fixture is missing currentRecord or expected")
		return
	var record: Dictionary = record_variant
	var expected: Dictionary = expected_variant
	var cells_variant: Variant = expected.get("cells")
	if typeof(cells_variant) != TYPE_DICTIONARY:
		_fail(null, "native lifecycle fixture is missing cells")
		return
	var cells: Dictionary = cells_variant
	var state_descriptor_variant: Variant = cells.get("state")
	if typeof(state_descriptor_variant) != TYPE_DICTIONARY:
		_fail(null, "native lifecycle fixture is missing state cell")
		return
	var state_descriptor: Dictionary = state_descriptor_variant
	var state_cell: Vector3i = _world_cell(state_descriptor)
	if state_cell.y < 0:
		_fail(null, "native lifecycle fixture has invalid state cell")
		return

	var save_path := "user://migration-tests/native-main-lifecycle-v11.json"
	_cleanup_file(save_path)
	var seeded: Dictionary = SaveRuntime.write_json_file(save_path, record)
	if not bool(seeded.get("ok", false)):
		_fail(null, "failed to seed native lifecycle save: %s" % seeded)
		return

	var first = _instantiate_main(save_path)
	if first == null:
		_cleanup_file(save_path)
		_fail(null, "failed to instantiate native main scene")
		return
	get_root().add_child(first)
	var first_world = first.get_node("World")
	var expected_id: int = int(state_descriptor.get("id", -1))
	if first_world.get_block_identity(state_cell) != {"id": expected_id, "stateKey": str(state_descriptor.get("stateKey", ""))}:
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "Main._enter_tree did not restore the save before VoxelWorld._ready")
		return
	if bool(first.call("persistence_blocked")):
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "valid v11 save unexpectedly blocked native persistence")
		return
	if not first_world.set_block(state_cell, expected_id, "axis=z"):
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "native lifecycle could not create a dirty state-only mutation")
		return
	if not bool(first.call("flush_native_save_if_dirty")):
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "dirty native world did not flush through the application lifecycle")
		return
	if bool(first.call("flush_native_save_if_dirty")):
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "unchanged sparse snapshots must not rewrite the native save")
		return

	var flushed: Dictionary = SaveRuntime.load_resolved(save_path)
	if not bool(flushed.get("ok", false)):
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "flushed native lifecycle save could not be reloaded: %s" % flushed)
		return
	var state_probe := StateSidecar.new()
	if not state_probe.import_snapshot(flushed.get("blockStates", {})):
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "flushed native lifecycle blockStates are invalid")
		return
	if state_probe.get_identity(str(state_descriptor.get("chunkKey", "")), int(state_descriptor.get("index", -1)), expected_id) != {"id": expected_id, "stateKey": "axis=z"}:
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "application save flush lost the state-only mutation")
		return
	var flushed_record_variant: Variant = flushed.get("record")
	if typeof(flushed_record_variant) != TYPE_DICTIONARY:
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "application save flush returned no canonical record")
		return
	var flushed_record: Dictionary = flushed_record_variant
	if flushed_record.get("customFutureField", {}) != {"preserve": true}:
		_cleanup_main(first)
		_cleanup_file(save_path)
		_fail(null, "application save flush dropped unknown future record fields")
		return
	_cleanup_main(first)

	var second = _instantiate_main(save_path)
	if second == null:
		_cleanup_file(save_path)
		_fail(null, "failed to instantiate second native main scene")
		return
	get_root().add_child(second)
	var second_world = second.get_node("World")
	if second_world.get_block_identity(state_cell) != {"id": expected_id, "stateKey": "axis=z"}:
		_cleanup_main(second)
		_cleanup_file(save_path)
		_fail(null, "application restart did not restore the last flushed native block state")
		return
	_cleanup_main(second)

	if not _check_corrupt_save_protection(state_cell, expected_id):
		_cleanup_file(save_path)
		return
	_cleanup_file(save_path)
	print("Godot native application save lifecycle: PASS")
	quit(0)

func _check_corrupt_save_protection(state_cell: Vector3i, block_id: int) -> bool:
	var corrupt_path := "user://migration-tests/native-main-corrupt.json"
	_cleanup_file(corrupt_path)
	var file := FileAccess.open(corrupt_path, FileAccess.WRITE)
	if file == null:
		return _fail_bool(null, "failed to create corrupt-save fixture")
	file.store_string("{ definitely-not-json")
	file.close()
	var before: String = FileAccess.get_file_as_string(corrupt_path)
	var main = _instantiate_main(corrupt_path)
	if main == null:
		_cleanup_file(corrupt_path)
		return _fail_bool(null, "failed to instantiate corrupt-save native main")
	get_root().add_child(main)
	if not bool(main.call("persistence_blocked")):
		_cleanup_main(main)
		_cleanup_file(corrupt_path)
		return _fail_bool(null, "invalid existing save must block automatic persistence")
	var world = main.get_node("World")
	var replacement: int = 0 if world.get_block(state_cell) != 0 else block_id
	world.set_block(state_cell, replacement)
	if bool(main.call("flush_native_save_if_dirty")):
		_cleanup_main(main)
		_cleanup_file(corrupt_path)
		return _fail_bool(null, "blocked corrupt-save session must not overwrite the source file")
	if FileAccess.get_file_as_string(corrupt_path) != before:
		_cleanup_main(main)
		_cleanup_file(corrupt_path)
		return _fail_bool(null, "corrupt native save was overwritten during blocked persistence session")
	_cleanup_main(main)
	_cleanup_file(corrupt_path)
	return true

func _instantiate_main(save_path: String):
	var scene := load("res://godot/scenes/main.tscn") as PackedScene
	if scene == null:
		return null
	var main = scene.instantiate()
	main.set("native_save_path", save_path)
	main.set("autosave_interval_seconds", 60.0)
	return main

func _world_cell(descriptor: Dictionary) -> Vector3i:
	var value: Variant = descriptor.get("world")
	if typeof(value) != TYPE_ARRAY:
		return Vector3i(0, -1, 0)
	var row: Array = value
	if row.size() != 3:
		return Vector3i(0, -1, 0)
	return Vector3i(int(row[0]), int(row[1]), int(row[2]))

func _cleanup_main(main: Node) -> void:
	if main != null and is_instance_valid(main):
		if main.get_parent() != null:
			main.get_parent().remove_child(main)
		main.free()

func _cleanup_file(path: String) -> void:
	var absolute := ProjectSettings.globalize_path(path)
	if FileAccess.file_exists(path):
		DirAccess.remove_absolute(absolute)

func _fail_bool(main: Node, message: String) -> bool:
	push_error(message)
	_cleanup_main(main)
	quit(1)
	return false

func _fail(main: Node, message: String) -> void:
	push_error(message)
	_cleanup_main(main)
	quit(1)
