extends SceneTree

const SaveRuntime = preload("res://godot/scripts/native_world_save.gd")
const EditSidecar = preload("res://godot/scripts/world_edit_sidecar.gd")
const StateSidecar = preload("res://godot/scripts/block_state_sidecar.gd")
const TerrainGeneratorRuntime = preload("res://godot/scripts/terrain_generator.gd")

func _init() -> void:
	var fixture_path: String = OS.get_environment("GODOT_SAVE_FIXTURE")
	if fixture_path.is_empty():
		_fail("GODOT_SAVE_FIXTURE is required")
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(fixture_path))
	if typeof(parsed) != TYPE_DICTIONARY:
		_fail("invalid Godot save fixture document")
		return
	var document: Dictionary = parsed
	if str(document.get("schema", "")) != "minecraft-godot-save-fixture-v1":
		_fail("unsupported Godot save fixture schema")
		return
	if int(document.get("chunkSize", -1)) != TerrainGeneratorRuntime.CHUNK_SIZE or int(document.get("worldHeight", -1)) != TerrainGeneratorRuntime.WORLD_HEIGHT:
		_fail("save fixture chunk dimensions do not match the native terrain runtime")
		return
	if not _check_compatibility_cases(document.get("compatibilityCases", [])):
		return
	if not _check_current_record(document):
		return
	print("Godot native save compatibility codec: PASS")
	quit(0)

func _check_compatibility_cases(cases_variant: Variant) -> bool:
	if typeof(cases_variant) != TYPE_ARRAY:
		return _fail_bool("save compatibility cases must be an array")
	var cases: Array = cases_variant
	if cases.size() < 5:
		return _fail_bool("expected at least five save compatibility cases")
	for case_variant in cases:
		if typeof(case_variant) != TYPE_DICTIONARY:
			return _fail_bool("save compatibility case must be an object")
		var fixture_case: Dictionary = case_variant
		var result: Dictionary = SaveRuntime.resolve_record(fixture_case.get("record"))
		var expected_ok: bool = bool(fixture_case.get("ok", false))
		if bool(result.get("ok", false)) != expected_ok:
			return _fail_bool("save compatibility result mismatch for %s: %s" % [str(fixture_case.get("name", "unnamed")), result])
		if expected_ok:
			if int(result.get("terrainVersion", -1)) != int(fixture_case.get("terrainVersion", -2)):
				return _fail_bool("terrain version compatibility mismatch for %s" % str(fixture_case.get("name", "unnamed")))
			if not _state_snapshots_equal(result.get("blockStates", {}), fixture_case.get("blockStates", {})):
				return _fail_bool("block-state compatibility mismatch for %s" % str(fixture_case.get("name", "unnamed")))
		else:
			var expected_error: String = str(fixture_case.get("errorIncludes", ""))
			if expected_error.is_empty() or str(result.get("error", "")).find(expected_error) < 0:
				return _fail_bool("save compatibility error mismatch for %s: %s" % [str(fixture_case.get("name", "unnamed")), result])
	return true

func _check_current_record(document: Dictionary) -> bool:
	var record_variant: Variant = document.get("currentRecord")
	var expected_variant: Variant = document.get("expected")
	if typeof(record_variant) != TYPE_DICTIONARY or typeof(expected_variant) != TYPE_DICTIONARY:
		return _fail_bool("save fixture is missing currentRecord or expected")
	var record: Dictionary = record_variant
	var expected: Dictionary = expected_variant
	var resolved: Dictionary = SaveRuntime.resolve_record(record)
	if not bool(resolved.get("ok", false)):
		return _fail_bool("current Web v11 fixture was rejected by native save runtime: %s" % resolved)
	if int(resolved.get("terrainVersion", -1)) != int(expected.get("terrainVersion", -2)):
		return _fail_bool("current Web v11 terrain version changed during native decode")
	if not _state_snapshots_equal(resolved.get("blockStates", {}), expected.get("blockStates", {})):
		return _fail_bool("current Web v11 blockStates changed during native decode")

	var edits := EditSidecar.new()
	if not edits.import_snapshot(resolved.get("edits", {})) or edits.entry_count() != 3:
		return _fail_bool("current Web edits did not import as three sparse native edits")
	var states := StateSidecar.new()
	if not states.import_snapshot(resolved.get("blockStates", {})) or states.entry_count() != 1:
		return _fail_bool("current Web blockStates did not import as one sparse native state")
	var cells: Dictionary = expected.get("cells", {})
	var state_cell: Dictionary = cells.get("state", {})
	var plain_cell: Dictionary = cells.get("plain", {})
	var negative_cell: Dictionary = cells.get("negative", {})
	if edits.get_edit(str(state_cell.get("chunkKey", "")), int(state_cell.get("index", -1))) != int(state_cell.get("id", -2)):
		return _fail_bool("stateful block id edit did not survive Web -> Godot decode")
	if edits.get_edit(str(plain_cell.get("chunkKey", "")), int(plain_cell.get("index", -1))) != int(plain_cell.get("id", -2)):
		return _fail_bool("plain block id edit did not survive Web -> Godot decode")
	if states.get_identity(str(state_cell.get("chunkKey", "")), int(state_cell.get("index", -1)), int(state_cell.get("id", -1))) != {"id": int(state_cell.get("id", -1)), "stateKey": str(state_cell.get("stateKey", ""))}:
		return _fail_bool("stateful block identity did not survive Web -> Godot decode")

	var dense := PackedByteArray()
	dense.resize(TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.WORLD_HEIGHT)
	dense.fill(0)
	var applied_negative: PackedByteArray = edits.apply_chunk(str(negative_cell.get("chunkKey", "")), dense)
	if int(applied_negative[int(negative_cell.get("index", -1))]) != int(negative_cell.get("id", -2)):
		return _fail_bool("negative-chunk sparse edit did not apply to dense native chunk bytes")

	if not edits.set_edit("0,0", 99, 10):
		return _fail_bool("native edit sidecar failed to record a new edit")
	if states.set_from_key("0,0", 101, 6, "axis=z") != {"id": 6, "stateKey": "axis=z"}:
		return _fail_bool("native state sidecar failed to record a new non-default state")
	var exported: Dictionary = SaveRuntime.make_record(
		record,
		str(record.get("id", "")),
		str(record.get("name", "")),
		str(record.get("seed", "")),
		str(record.get("prompt", "")),
		int(resolved.get("terrainVersion", 4)),
		edits.export_snapshot(),
		states.export_snapshot(),
		1234567890
	)
	if exported.is_empty() or int(exported.get("version", -1)) != SaveRuntime.SINGLEPLAYER_SAVE_VERSION:
		return _fail_bool("native save export did not emit current save schema v11")
	if exported.get("customFutureField", {}) != {"preserve": true}:
		return _fail_bool("native save export must preserve unknown future record fields")
	if int(exported.get("updatedAt", -1)) != 1234567890:
		return _fail_bool("native save export did not retain explicit test timestamp")

	var save_path := "user://migration-tests/world-save-v11.json"
	var write_result: Dictionary = SaveRuntime.write_json_file(save_path, exported)
	if not bool(write_result.get("ok", false)):
		return _fail_bool("native user:// save write failed: %s" % write_result)
	var loaded: Dictionary = SaveRuntime.load_resolved(save_path)
	DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
	if not bool(loaded.get("ok", false)):
		return _fail_bool("native user:// save reload failed: %s" % loaded)
	if int(loaded.get("terrainVersion", -1)) != 4:
		return _fail_bool("native JSON round-trip changed terrainVersion")
	var reloaded_edits := EditSidecar.new()
	if not reloaded_edits.import_snapshot(loaded.get("edits", {})) or reloaded_edits.get_edit("0,0", 99) != 10:
		return _fail_bool("native JSON round-trip lost sparse block edits")
	var reloaded_states := StateSidecar.new()
	if not reloaded_states.import_snapshot(loaded.get("blockStates", {})) or reloaded_states.get_identity("0,0", 101, 6) != {"id": 6, "stateKey": "axis=z"}:
		return _fail_bool("native JSON round-trip lost block-state sidecar entries")
	if loaded.get("record", {}).get("customFutureField", {}) != {"preserve": true}:
		return _fail_bool("native JSON round-trip dropped unknown future record fields")
	return true

func _state_snapshots_equal(actual_variant: Variant, expected_variant: Variant) -> bool:
	if typeof(actual_variant) != TYPE_DICTIONARY or typeof(expected_variant) != TYPE_DICTIONARY:
		return false
	var actual := StateSidecar.new()
	var expected := StateSidecar.new()
	if not actual.import_snapshot(actual_variant) or not expected.import_snapshot(expected_variant):
		return false
	return actual.export_snapshot() == expected.export_snapshot()

func _fail_bool(message: String) -> bool:
	push_error(message)
	quit(1)
	return false

func _fail(message: String) -> void:
	push_error(message)
	quit(1)
