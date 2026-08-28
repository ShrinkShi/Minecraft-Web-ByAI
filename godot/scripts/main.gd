extends Node3D

const MigrationContractCheck = preload("res://godot/scripts/migration_contract_check.gd")

const INPUT_BINDINGS := {
	"move_forward": KEY_W,
	"move_backward": KEY_S,
	"move_left": KEY_A,
	"move_right": KEY_D,
	"jump": KEY_SPACE,
	"sprint": KEY_CTRL,
}

@onready var environment_node: WorldEnvironment = $WorldEnvironment
@onready var player: CharacterBody3D = $Player
@onready var hud: CanvasLayer = $HUD

func _ready() -> void:
	MigrationContractCheck.run()
	_configure_input_map()
	_configure_environment()
	player.selected_slot_changed.connect(hud.set_selected_slot)
	hud.set_selected_slot(player.selected_slot)
	DisplayServer.window_set_title("Minecraft Godot By AI — Native")

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
