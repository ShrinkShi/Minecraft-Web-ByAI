class_name BlockStateSchemaRuntime
extends RefCounted

const HORIZONTAL_FACING := ["north", "east", "south", "west"]
const STAIR_SHAPES := ["straight", "inner_left", "inner_right", "outer_left", "outer_right"]

const SCHEMAS := {
	"log": {"name": "log", "properties": {"axis": {"kind": "enum", "values": ["x", "y", "z"], "has_default": true, "default": "y"}}},
	"furnace": {"name": "furnace", "properties": {
		"facing": {"kind": "enum", "values": HORIZONTAL_FACING, "has_default": true, "default": "north"},
		"lit": {"kind": "boolean", "has_default": true, "default": false},
	}},
	"farmland": {"name": "farmland", "properties": {"moisture": {"kind": "integer", "min": 0, "max": 7, "has_default": true, "default": 0}}},
	"wheat": {"name": "wheat", "properties": {"age": {"kind": "integer", "min": 0, "max": 7, "has_default": true, "default": 0}}},
	"slab": {"name": "slab", "properties": {
		"type": {"kind": "enum", "values": ["bottom", "top", "double"], "has_default": true, "default": "bottom"},
		"waterlogged": {"kind": "boolean", "has_default": true, "default": false},
	}},
	"stair": {"name": "stair", "properties": {
		"facing": {"kind": "enum", "values": HORIZONTAL_FACING, "has_default": true, "default": "north"},
		"half": {"kind": "enum", "values": ["bottom", "top"], "has_default": true, "default": "bottom"},
		"shape": {"kind": "enum", "values": STAIR_SHAPES, "has_default": true, "default": "straight"},
		"waterlogged": {"kind": "boolean", "has_default": true, "default": false},
	}},
	"fence": {"name": "fence", "properties": {
		"east": {"kind": "boolean", "has_default": true, "default": false},
		"north": {"kind": "boolean", "has_default": true, "default": false},
		"south": {"kind": "boolean", "has_default": true, "default": false},
		"waterlogged": {"kind": "boolean", "has_default": true, "default": false},
		"west": {"kind": "boolean", "has_default": true, "default": false},
	}},
	"door": {"name": "door", "properties": {
		"facing": {"kind": "enum", "values": HORIZONTAL_FACING, "has_default": true, "default": "north"},
		"half": {"kind": "enum", "values": ["lower", "upper"], "has_default": true, "default": "lower"},
		"hinge": {"kind": "enum", "values": ["left", "right"], "has_default": true, "default": "left"},
		"open": {"kind": "boolean", "has_default": true, "default": false},
		"powered": {"kind": "boolean", "has_default": true, "default": false},
	}},
}

static func schema(schema_name: String) -> Dictionary:
	return SCHEMAS.get(schema_name, {})

static func normalize_properties(schema_value: Dictionary, value: Dictionary = {}) -> Variant:
	if schema_value.is_empty() or not schema_value.has("properties"):
		return _fail("block state schema is missing properties")
	var properties: Dictionary = schema_value["properties"]
	for raw_key in value.keys():
		var key: String = str(raw_key)
		if not properties.has(key):
			return _fail("%s block state contains unknown property: %s" % [schema_value.get("name", "unknown"), key])
	var names: Array = properties.keys()
	names.sort()
	var output: Dictionary = {}
	for raw_name in names:
		var property_name: String = str(raw_name)
		var spec: Dictionary = properties[property_name]
		var raw_value: Variant
		if value.has(property_name):
			raw_value = value[property_name]
		elif bool(spec.get("has_default", false)):
			raw_value = spec.get("default")
		else:
			return _fail("%s.%s is required" % [schema_value.get("name", "unknown"), property_name])
		var normalized: Variant = _normalize_property(raw_value, spec, "%s.%s" % [schema_value.get("name", "unknown"), property_name])
		if normalized == null:
			return null
		output[property_name] = normalized
	return output

static func canonical_key(schema_value: Dictionary, value: Dictionary = {}) -> Variant:
	var normalized: Variant = normalize_properties(schema_value, value)
	if normalized == null:
		return null
	return _canonical_from_normalized(normalized)

static func parse_canonical_key(schema_value: Dictionary, state_key: String) -> Variant:
	var properties: Dictionary = {}
	if not state_key.is_empty():
		for term in state_key.split(",", false):
			var separator: int = term.find("=")
			if separator <= 0 or separator != term.rfind("=") or separator >= term.length() - 1:
				return _fail("invalid canonical block state term: %s" % term)
			var property_name: String = term.substr(0, separator)
			var property_value: String = term.substr(separator + 1)
			if properties.has(property_name):
				return _fail("duplicate canonical block state property: %s" % property_name)
			properties[property_name] = property_value
	var normalized: Variant = normalize_properties(schema_value, properties)
	if normalized == null:
		return null
	var canonical: String = _canonical_from_normalized(normalized)
	if state_key != canonical:
		return _fail("block state key is not canonical; expected %s" % canonical)
	return normalized

static func _canonical_from_normalized(normalized: Dictionary) -> String:
	var names: Array = normalized.keys()
	names.sort()
	var parts := PackedStringArray()
	for raw_name in names:
		var name: String = str(raw_name)
		parts.append("%s=%s" % [name, normalized[name]])
	return ",".join(parts)

static func _normalize_property(value: Variant, spec: Dictionary, label: String) -> Variant:
	var kind: String = str(spec.get("kind", ""))
	if kind == "enum":
		var values: Array = spec.get("values", [])
		if typeof(value) != TYPE_STRING or not values.has(value):
			var allowed := PackedStringArray()
			for option in values:
				allowed.append(str(option))
			return _fail("%s must be one of: %s" % [label, ", ".join(allowed)])
		return str(value)
	if kind == "boolean":
		if typeof(value) == TYPE_BOOL:
			return "true" if bool(value) else "false"
		if typeof(value) == TYPE_STRING:
			var text: String = str(value)
			if text == "true" or text == "false":
				return text
		return _fail("%s must be true or false" % label)
	if kind == "integer":
		var number: Variant = _integer_value(value)
		if number == null:
			return _fail("%s must be an integer" % label)
		var minimum: int = int(spec.get("min", -9223372036854775807))
		var maximum: int = int(spec.get("max", 9223372036854775807))
		if int(number) < minimum or int(number) > maximum:
			return _fail("%s must be an integer in %d..%d" % [label, minimum, maximum])
		return str(int(number))
	return _fail("%s has unsupported schema kind: %s" % [label, kind])

static func _integer_value(value: Variant) -> Variant:
	if typeof(value) == TYPE_INT:
		return int(value)
	if typeof(value) == TYPE_FLOAT:
		var floating: float = float(value)
		if is_nan(floating) or is_inf(floating) or floating != floor(floating):
			return null
		return int(floating)
	if typeof(value) != TYPE_STRING:
		return null
	var text: String = str(value)
	if text == "0":
		return 0
	var digits: String = text
	if text.begins_with("-"):
		digits = text.substr(1)
	if digits.is_empty() or digits.begins_with("0"):
		return null
	for index in range(digits.length()):
		var code: int = digits.unicode_at(index)
		if code < 48 or code > 57:
			return null
	return int(text)

static func _fail(message: String) -> Variant:
	push_error(message)
	return null
