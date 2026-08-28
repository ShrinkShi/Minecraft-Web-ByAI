extends Node3D

const MigrationContractCheck = preload("res://godot/scripts/migration_contract_check.gd")
const NativeWorldSaveRuntime = preload("res://godot/scripts/native_world_save.gd")

const INPUT_BINDINGS := {
	"move_forward": KEY_W,
	"move_backward": KEY_S,
	"move_left": KEY_A,
	"move_right": KEY_D,
	"jump": KEY_SPACE,
	"sprint": KEY_CTRL,
}

@export var native_save_path := "user://worlds/native-default.json"
@export var native_world_id := "native-default"
@export var native_world_name := "Native World"
@export_range(0.25, 60.0, 0.25) var autosave_interval_seconds := 5.0

@onready var environment_node: WorldEnvironment = $WorldEnvironment
@onready var world = $World
@onready var player = $Player
@onready var hud = $HUD

var _base_save_record: Dictionary = {}
var _last_saved_edits: Dictionary = {}
var _last_saved_block_states: Dictionary = {}
var _autosave_elapsed := 0.0
var _persistence_blocked := false
var _previous_auto_accept_quit := true

func _enter_tree() -> void:
	var tree := get_tree()
	_previous_auto_accept_quit = tree.auto_accept_quit
	tree.auto_accept_quit = false
	_restore_native_world_before_child_ready()

func _ready() -> void:
	MigrationContractCheck.run()
	_configure_input_map()
	_configure_environment()
	player.global_position = world.spawn_position_at(0.0, 0.0)
	world.update_stream_center(player.global_position)
	_last_saved_edits = world.export_edits()
	_last_saved_block_states = world.export_block_states()
	player.selected_slot_changed.connect(hud.set_selected_slot)
	hud.set_selected_slot(player.selected_slot)
	DisplayServer.window_set_title("Minecraft Godot By AI — Native")

func _process(delta: float) -> void:
	world.update_stream_center(player.global_position)
	if _persistence_blocked:
		return
	_autosave_elapsed += delta
	if _autosave_elapsed >= autosave_interval_seconds:
		_autosave_elapsed = 0.0
		flush_native_save_if_dirty()

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		flush_native_save_if_dirty()
		get_tree().quit()

func _exit_tree() -> void:
	var tree := get_tree()
	if tree != null:
		tree.auto_accept_quit = _previous_auto_accept_quit

func flush_native_save_if_dirty() -> bool:
	if _persistence_blocked or world == null or not is_instance_valid(world):
		return false
	var edits: Dictionary = world.export_edits()
	var block_states: Dictionary = world.export_block_states()
	if edits == _last_saved_edits and block_states == _last_saved_block_states:
		return false
	var record: Dictionary = NativeWorldSaveRuntime.make_record(
		_base_save_record,
		native_world_id,
		native_world_name,
		str(world.world_seed),
		str(world.world_prompt),
		int(world.terrain_version),
		edits,
		block_states
	)
	if record.is_empty():
		push_error("failed to build native world save record")
		return false
	var written: Dictionary = NativeWorldSaveRuntime.write_json_file(native_save_path, record)
	if not bool(written.get("ok", false)):
		push_error("native world autosave failed: %s" % str(written.get("error", "unknown error")))
		return false
	_base_save_record = record.duplicate(true)
	_last_saved_edits = edits.duplicate(true)
	_last_saved_block_states = block_states.duplicate(true)
	return true

func persistence_blocked() -> bool:
	return _persistence_blocked

func _restore_native_world_before_child_ready() -> void:
	var world_node = get_node_or_null("World")
	if world_node == null or native_save_path.is_empty() or not FileAccess.file_exists(native_save_path):
		return
	var resolved: Dictionary = NativeWorldSaveRuntime.load_resolved(native_save_path)
	if not bool(resolved.get("ok", false)):
		_persistence_blocked = true
		push_warning("native world save is invalid; continuing without persistence: %s" % str(resolved.get("error", "unknown error")))
		return
	var source_variant: Variant = resolved.get("record")
	var source: Dictionary = source_variant if typeof(source_variant) == TYPE_DICTIONARY else {}
	world_node.world_seed = str(source.get("seed", world_node.world_seed))
	world_node.world_prompt = str(source.get("prompt", world_node.world_prompt))
	world_node.terrain_version = int(resolved.get("terrainVersion", world_node.terrain_version))
	if not world_node.configure_restore(resolved.get("edits", {}), resolved.get("blockStates", {})):
		_persistence_blocked = true
		push_warning("native world restore state was rejected; continuing without persistence")
		return
	_base_save_record = source.duplicate(true)
	native_world_id = str(source.get("id", native_world_id))
	native_world_name = str(source.get("name", native_world_name))

func _configure_input_map() -> void:
	for action_name in INPUT_BINDINGS:
		if not InputMap.has_action(action_name):
			InputMap.add_action(action_name)
		if InputMap.action_get_events(action_name).is_empty():
			var event := InputEventKey.new()
			event.physical_keycode = INPUT_BINDINGS[action_name]
			InputMap.action_add_event(action_name, event)

func _configure_environment() -> void:
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color(0.46, 0.69, 0.95)
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color(0.72, 0.78, 0.9)
	environment.ambient_light_energy = 0.55
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment_node.environment = environment
