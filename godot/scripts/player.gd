class_name PlayerController
extends CharacterBody3D

signal selected_slot_changed(index: int)

@export var walk_speed := 4.32
@export var sprint_speed := 5.61
@export var jump_velocity := 8.0
@export var ground_acceleration := 28.0
@export var air_acceleration := 8.0
@export var mouse_sensitivity := 0.0022

@onready var head: Node3D = $Head

var selected_slot := 0
var _gravity := 28.0

func _ready() -> void:
	_gravity = float(ProjectSettings.get_setting("physics/3d/default_gravity", 28.0))
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		head.rotation.x = clampf(head.rotation.x - event.relative.y * mouse_sensitivity, deg_to_rad(-89.0), deg_to_rad(89.0))
		get_viewport().set_input_as_handled()
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			get_viewport().set_input_as_handled()
			return
		if event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_UP:
			_set_selected_slot(selected_slot - 1)
			get_viewport().set_input_as_handled()
			return
		if event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_set_selected_slot(selected_slot + 1)
			get_viewport().set_input_as_handled()
			return
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		get_viewport().set_input_as_handled()

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= _gravity * delta
	elif Input.is_action_just_pressed("jump"):
		velocity.y = jump_velocity

	var input_vector := Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	var local_direction := Vector3(input_vector.x, 0.0, input_vector.y)
	var direction := (transform.basis * local_direction).normalized()
	var sprinting := Input.is_action_pressed("sprint") and Input.is_action_pressed("move_forward")
	var target_speed := sprint_speed if sprinting else walk_speed
	var acceleration := ground_acceleration if is_on_floor() else air_acceleration
	var target_velocity := direction * target_speed
	velocity.x = move_toward(velocity.x, target_velocity.x, acceleration * delta)
	velocity.z = move_toward(velocity.z, target_velocity.z, acceleration * delta)
	move_and_slide()

func _set_selected_slot(index: int) -> void:
	selected_slot = wrapi(index, 0, 9)
	selected_slot_changed.emit(selected_slot)
