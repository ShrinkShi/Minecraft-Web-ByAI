class_name BlockStateCodec
extends RefCounted

# Godot-side equivalent of the canonical JavaScript stateKey contract:
# sorted name=value pairs separated by commas. Empty/default state is represented by "".
static func canonical_key(properties: Dictionary) -> String:
	if properties.is_empty():
		return ""
	var keys: Array = properties.keys()
	keys.sort()
	var parts: PackedStringArray = []
	for raw_key in keys:
		var key := str(raw_key)
		var value := str(properties[raw_key])
		if key.is_empty() or key.contains(",") or key.contains("="):
			push_error("Invalid block-state property name: %s" % key)
			return ""
		if value.contains(",") or value.contains("="):
			push_error("Invalid block-state property value: %s" % value)
			return ""
		parts.append("%s=%s" % [key, value])
	return ",".join(parts)

static func parse_key(state_key: String) -> Dictionary:
	var result := {}
	var trimmed := state_key.strip_edges()
	if trimmed.is_empty():
		return result
	for part in trimmed.split(",", false):
		var separator := part.find("=")
		if separator <= 0 or separator >= part.length() - 1:
			push_error("Invalid stateKey segment: %s" % part)
			return {}
		var key := part.substr(0, separator)
		var value := part.substr(separator + 1)
		if result.has(key):
			push_error("Duplicate block-state property: %s" % key)
			return {}
		result[key] = value
	return result

static func normalized_key(state_key: String) -> String:
	return canonical_key(parse_key(state_key))
