class_name BlockStateRegistryRuntime
extends RefCounted

const StateSchema = preload("res://godot/scripts/block_state_schema.gd")

const SCHEMA_NAME_BY_ID := {
	6: "log",
	26: "log",
	21: "furnace",
}

static func schema_for_id(block_id: int) -> Dictionary:
	var schema_name: Variant = SCHEMA_NAME_BY_ID.get(block_id)
	if schema_name == null:
		return {}
	return StateSchema.schema(str(schema_name))

static func default_state_key(block_id: int) -> Variant:
	var schema_value: Dictionary = schema_for_id(block_id)
	if schema_value.is_empty():
		return null
	return StateSchema.canonical_key(schema_value)

static func normalize_state_for_id(block_id: int, state: Dictionary = {}) -> Variant:
	var schema_value: Dictionary = schema_for_id(block_id)
	if schema_value.is_empty():
		if state.is_empty():
			return {}
		push_error("block %d does not define mutable block-state properties" % block_id)
		return null
	return StateSchema.normalize_properties(schema_value, state)

static func canonical_key_for_id(block_id: int, state: Dictionary = {}) -> Variant:
	var schema_value: Dictionary = schema_for_id(block_id)
	if schema_value.is_empty():
		if normalize_state_for_id(block_id, state) == null:
			return null
		return null
	return StateSchema.canonical_key(schema_value, state)

static func parse_key_for_id(block_id: int, state_key: Variant) -> Variant:
	var schema_value: Dictionary = schema_for_id(block_id)
	if schema_value.is_empty():
		if state_key == null or (typeof(state_key) == TYPE_STRING and str(state_key).is_empty()):
			return {}
		push_error("block %d does not define mutable block-state properties" % block_id)
		return null
	if typeof(state_key) != TYPE_STRING:
		push_error("stateful block %d requires a string stateKey" % block_id)
		return null
	return StateSchema.parse_canonical_key(schema_value, str(state_key))

static func block_identity(block_id: int, state: Dictionary = {}) -> Variant:
	if not _valid_block_id(block_id):
		return null
	var schema_value: Dictionary = schema_for_id(block_id)
	if schema_value.is_empty():
		if not state.is_empty():
			push_error("block %d does not define mutable block-state properties" % block_id)
			return null
		return {"id": block_id, "stateKey": null}
	var key: Variant = StateSchema.canonical_key(schema_value, state)
	if key == null:
		return null
	return {"id": block_id, "stateKey": str(key)}

static func block_identity_from_key(block_id: int, state_key: Variant = null) -> Variant:
	if not _valid_block_id(block_id):
		return null
	var schema_value: Dictionary = schema_for_id(block_id)
	if schema_value.is_empty():
		if state_key != null and not (typeof(state_key) == TYPE_STRING and str(state_key).is_empty()):
			push_error("block %d does not define mutable block-state properties" % block_id)
			return null
		return {"id": block_id, "stateKey": null}
	var resolved_key: Variant = state_key
	if resolved_key == null:
		resolved_key = default_state_key(block_id)
	if typeof(resolved_key) != TYPE_STRING:
		push_error("stateful block %d requires a canonical stateKey" % block_id)
		return null
	if StateSchema.parse_canonical_key(schema_value, str(resolved_key)) == null:
		return null
	return {"id": block_id, "stateKey": str(resolved_key)}

static func identity_equal(a: Variant, b: Variant) -> bool:
	if typeof(a) != TYPE_DICTIONARY or typeof(b) != TYPE_DICTIONARY:
		return false
	var left: Dictionary = a
	var right: Dictionary = b
	return int(left.get("id", -1)) == int(right.get("id", -2)) and left.get("stateKey") == right.get("stateKey")

static func _valid_block_id(block_id: int) -> bool:
	if block_id < 0 or block_id > 255:
		push_error("block id must be an integer in 0..255")
		return false
	return true
