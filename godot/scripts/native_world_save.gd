class_name NativeWorldSaveRuntime
extends RefCounted

const TerrainGeneratorRuntime = preload("res://godot/scripts/terrain_generator.gd")
const WorldEditSidecarRuntime = preload("res://godot/scripts/world_edit_sidecar.gd")
const BlockStateSidecarRuntime = preload("res://godot/scripts/block_state_sidecar.gd")

const LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION := 2
const TERRAIN_VERSIONED_SAVE_MIN_VERSION := 8
const BLOCK_STATE_SAVE_MIN_VERSION := 11
const SINGLEPLAYER_SAVE_VERSION := 11

static func resolve_record(record: Variant = null) -> Dictionary:
	if record == null:
		return _success(TerrainGeneratorRuntime.TERRAIN_GENERATOR_VERSION, {}, {}, {})
	if typeof(record) != TYPE_DICTIONARY:
		return _failure("singleplayer world record must be an object or null")
	var source: Dictionary = record
	var save_version: Variant = _optional_json_integer(source.get("version"))
	var terrain_version: int
	if not source.has("terrainVersion") or source.get("terrainVersion") == null:
		if save_version != null and int(save_version) >= TERRAIN_VERSIONED_SAVE_MIN_VERSION:
			return _failure("save version %d is missing terrainVersion" % int(save_version))
		terrain_version = LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION
	else:
		var terrain_value: Variant = _optional_json_integer(source.get("terrainVersion"))
		if terrain_value == null or not TerrainGeneratorRuntime.SUPPORTED_VERSIONS.has(int(terrain_value)):
			return _failure("unsupported terrain generator version: %s" % str(source.get("terrainVersion")))
		terrain_version = int(terrain_value)

	var edits_raw: Variant = source.get("edits", {})
	if edits_raw == null:
		edits_raw = {}
	if typeof(edits_raw) != TYPE_DICTIONARY:
		return _failure("singleplayer edits must be an object")
	var edit_sidecar := WorldEditSidecarRuntime.new()
	if not edit_sidecar.import_snapshot(edits_raw):
		return _failure("singleplayer edits are invalid")

	var states_raw: Variant
	if not source.has("blockStates"):
		if save_version != null and int(save_version) >= BLOCK_STATE_SAVE_MIN_VERSION:
			return _failure("save version %d is missing blockStates" % int(save_version))
		states_raw = {}
	else:
		states_raw = source.get("blockStates")
		if typeof(states_raw) != TYPE_DICTIONARY:
			return _failure("singleplayer blockStates must be an object")
	var state_sidecar := BlockStateSidecarRuntime.new()
	if not state_sidecar.import_snapshot(states_raw):
		return _failure("singleplayer blockStates are invalid")

	return _success(
		terrain_version,
		edit_sidecar.export_snapshot(),
		state_sidecar.export_snapshot(),
		source.duplicate(true)
	)

static func make_record(
	base_record: Dictionary,
	world_id: String,
	world_name: String,
	seed: String,
	prompt: String,
	terrain_version: int,
	edits: Dictionary,
	block_states: Dictionary,
	updated_at_ms: int = -1
) -> Dictionary:
	if not TerrainGeneratorRuntime.SUPPORTED_VERSIONS.has(terrain_version):
		push_error("unsupported terrain generator version: %d" % terrain_version)
		return {}
	var edit_sidecar := WorldEditSidecarRuntime.new()
	if not edit_sidecar.import_snapshot(edits):
		return {}
	var state_sidecar := BlockStateSidecarRuntime.new()
	if not state_sidecar.import_snapshot(block_states):
		return {}
	var result: Dictionary = base_record.duplicate(true)
	result["id"] = world_id
	result["name"] = world_name
	result["seed"] = seed
	result["prompt"] = prompt
	result["terrainVersion"] = terrain_version
	result["version"] = SINGLEPLAYER_SAVE_VERSION
	result["edits"] = edit_sidecar.export_snapshot()
	result["blockStates"] = state_sidecar.export_snapshot()
	result["updatedAt"] = updated_at_ms if updated_at_ms >= 0 else int(Time.get_unix_time_from_system() * 1000.0)
	return result

static func write_json_file(path: String, record: Dictionary) -> Dictionary:
	if path.is_empty():
		return _failure("native save path must be non-empty")
	var directory: String = path.get_base_dir()
	if not directory.is_empty() and directory != ".":
		var mkdir_error: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
		if mkdir_error != OK and mkdir_error != ERR_ALREADY_EXISTS:
			return _failure("failed to create native save directory: %s" % error_string(mkdir_error))
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return _failure("failed to open native save for writing: %s" % path)
	file.store_string(JSON.stringify(record))
	file.close()
	return {"ok": true, "path": path}

static func read_json_file(path: String) -> Dictionary:
	if path.is_empty():
		return _failure("native save path must be non-empty")
	if not FileAccess.file_exists(path):
		return _failure("native save file does not exist: %s" % path)
	var text: String = FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return _failure("native save JSON must contain an object record")
	return {"ok": true, "record": parsed}

static func load_resolved(path: String) -> Dictionary:
	var loaded: Dictionary = read_json_file(path)
	if not bool(loaded.get("ok", false)):
		return loaded
	return resolve_record(loaded.get("record"))

static func _success(terrain_version: int, edits: Dictionary, block_states: Dictionary, source: Dictionary) -> Dictionary:
	return {
		"ok": true,
		"terrainVersion": terrain_version,
		"edits": edits,
		"blockStates": block_states,
		"record": source,
	}

static func _failure(message: String) -> Dictionary:
	return {"ok": false, "error": message}

static func _optional_json_integer(value: Variant) -> Variant:
	if typeof(value) == TYPE_INT:
		return int(value)
	if typeof(value) == TYPE_FLOAT:
		var numeric: float = float(value)
		if is_finite(numeric) and floor(numeric) == numeric:
			return int(numeric)
	return null
