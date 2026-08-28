extends SceneTree

const TerrainGeneratorRuntime = preload("res://godot/scripts/terrain_generator.gd")

func _init() -> void:
	var fixture_path := OS.get_environment("GODOT_TERRAIN_FIXTURE")
	if fixture_path.is_empty():
		push_error("GODOT_TERRAIN_FIXTURE is required")
		quit(1)
		return
	var text := FileAccess.get_file_as_string(fixture_path)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("invalid Godot terrain fixture document")
		quit(1)
		return
	var document: Dictionary = parsed
	if document.get("schema", "") != "minecraft-godot-terrain-fixture-v1":
		push_error("unsupported Godot terrain fixture schema")
		quit(1)
		return
	var fixtures: Array = document.get("fixtures", [])
	assert(fixtures.size() >= 6)
	for fixture_variant in fixtures:
		var fixture: Dictionary = fixture_variant
		var seed: String = str(fixture.get("seed", "1"))
		var prompt: String = str(fixture.get("prompt", ""))
		var version: int = int(fixture.get("version", -1))
		var generator := TerrainGeneratorRuntime.new(seed, prompt, version)
		assert(generator.version == version)
		assert(generator.seed_hash == int(fixture.get("seedHash", -1)))
		var expected_parameters: Dictionary = fixture.get("parameters", {})
		assert(int(generator.parameters["amp"]) == int(expected_parameters["amp"]))
		assert(int(generator.parameters["sea"]) == int(expected_parameters["sea"]))
		assert(is_equal_approx(float(generator.parameters["forest"]), float(expected_parameters["forest"])))
		assert(is_equal_approx(float(generator.parameters["sand"]), float(expected_parameters["sand"])))
		var cx: int = int(fixture["cx"])
		var cz: int = int(fixture["cz"])
		var chunk: PackedByteArray = generator.generate_chunk(cx, cz)
		var actual_hex: String = chunk.hex_encode()
		var expected_hex: String = str(fixture.get("chunkHex", ""))
		if actual_hex != expected_hex:
			push_error("terrain byte mismatch for seed=%s prompt=%s version=%d chunk=(%d,%d)" % [seed, prompt, version, cx, cz])
			quit(1)
			return
	print("Godot terrain generator byte parity: PASS (%d fixtures)" % fixtures.size())
	quit(0)
