extends SceneTree

const TerrainGeneratorRuntime = preload("res://godot/scripts/terrain_generator.gd")

func _init() -> void:
	var fixture_path: String = OS.get_environment("GODOT_TERRAIN_FIXTURE")
	if fixture_path.is_empty():
		_fail("GODOT_TERRAIN_FIXTURE is required")
		return
	var text: String = FileAccess.get_file_as_string(fixture_path)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		_fail("invalid Godot terrain fixture document")
		return
	var document: Dictionary = parsed
	if str(document.get("schema", "")) != "minecraft-godot-terrain-fixture-v2":
		_fail("unsupported Godot terrain fixture schema")
		return
	var probes: Array = document.get("probes", [])
	if probes.size() < 4:
		_fail("expected at least four terrain probes")
		return
	for probe_variant in probes:
		var probe: Dictionary = probe_variant
		if not _check_probe(probe):
			return
	if not _check_version_gates(document):
		return
	if not _check_full_chunk(document.get("fullChunk", {})):
		return
	print("Godot terrain generator compatibility parity: PASS (%d probes + 1 full chunk)" % probes.size())
	quit(0)

func _check_probe(probe: Dictionary) -> bool:
	var seed: String = str(probe.get("seed", "1"))
	var prompt: String = str(probe.get("prompt", ""))
	var version: int = int(probe.get("version", -1))
	var x: int = int(probe.get("x", 0))
	var y: int = int(probe.get("y", 4))
	var z: int = int(probe.get("z", 0))
	var generator = TerrainGeneratorRuntime.new(seed, prompt, version)
	if generator.version != version:
		return _fail_bool("terrain version mismatch")
	if generator.seed_hash != int(probe.get("seedHash", -1)):
		return _fail_bool("terrain seed hash mismatch for %s" % seed)
	var expected_parameters: Dictionary = probe.get("parameters", {})
	if int(generator.parameters["amp"]) != int(expected_parameters.get("amp", -1)):
		return _fail_bool("terrain amplitude mismatch")
	if int(generator.parameters["sea"]) != int(expected_parameters.get("sea", -1)):
		return _fail_bool("terrain sea mismatch")
	if not is_equal_approx(float(generator.parameters["forest"]), float(expected_parameters.get("forest", -1.0))):
		return _fail_bool("terrain forest mismatch")
	if not is_equal_approx(float(generator.parameters["sand"]), float(expected_parameters.get("sand", -1.0))):
		return _fail_bool("terrain sand mismatch")
	var top: int = generator.height_at(x, z)
	if top != int(probe.get("height", -1)):
		return _fail_bool("terrain height mismatch at (%d,%d)" % [x, z])
	if abs(generator.hash2(x, z) - float(probe.get("hash2", -1.0))) > 1e-12:
		return _fail_bool("terrain hash2 mismatch at (%d,%d)" % [x, z])
	if abs(generator.hash3(x, y, z, 0x51ad) - float(probe.get("hash3", -1.0))) > 1e-12:
		return _fail_bool("terrain hash3 mismatch at (%d,%d,%d)" % [x, y, z])
	if generator.is_iron_ore(x, y, z, top) != bool(probe.get("iron", false)):
		return _fail_bool("terrain iron predicate mismatch")
	if generator.is_coal_ore(x, y, z, top) != bool(probe.get("coal", false)):
		return _fail_bool("terrain coal predicate mismatch")
	if generator.is_short_grass_decoration(x, top + 1, z) != bool(probe.get("shortGrass", false)):
		return _fail_bool("terrain short-grass predicate mismatch")
	return true

func _check_version_gates(document: Dictionary) -> bool:
	var coal: Dictionary = document.get("coalGate", {})
	var coal_seed: String = str(coal.get("seed", "1"))
	var coal_prompt: String = str(coal.get("prompt", ""))
	var cx: int = int(coal.get("x", 0))
	var cy: int = int(coal.get("y", 4))
	var cz: int = int(coal.get("z", 0))
	var ctop: int = int(coal.get("top", 20))
	var v2 = TerrainGeneratorRuntime.new(coal_seed, coal_prompt, 2)
	var v3 = TerrainGeneratorRuntime.new(coal_seed, coal_prompt, 3)
	if v2.is_coal_ore(cx, cy, cz, ctop):
		return _fail_bool("terrain v2 unexpectedly generated coal")
	if not v3.is_coal_ore(cx, cy, cz, ctop):
		return _fail_bool("terrain v3 coal gate mismatch")

	var grass: Dictionary = document.get("grassGate", {})
	var grass_seed: String = str(grass.get("seed", "1"))
	var grass_prompt: String = str(grass.get("prompt", ""))
	var gx: int = int(grass.get("x", 0))
	var gy: int = int(grass.get("y", 1))
	var gz: int = int(grass.get("z", 0))
	var v3_grass = TerrainGeneratorRuntime.new(grass_seed, grass_prompt, 3)
	var v4_grass = TerrainGeneratorRuntime.new(grass_seed, grass_prompt, 4)
	if v3_grass.is_short_grass_decoration(gx, gy, gz):
		return _fail_bool("terrain v3 unexpectedly generated short grass")
	if not v4_grass.is_short_grass_decoration(gx, gy, gz):
		return _fail_bool("terrain v4 short-grass gate mismatch")
	return true

func _check_full_chunk(full_variant: Variant) -> bool:
	if typeof(full_variant) != TYPE_DICTIONARY:
		return _fail_bool("missing full terrain chunk fixture")
	var full: Dictionary = full_variant
	var generator = TerrainGeneratorRuntime.new(str(full.get("seed", "1")), str(full.get("prompt", "")), int(full.get("version", 4)))
	var chunk: PackedByteArray = generator.generate_chunk(int(full.get("cx", 0)), int(full.get("cz", 0)))
	if chunk.size() != TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.CHUNK_SIZE * TerrainGeneratorRuntime.WORLD_HEIGHT:
		return _fail_bool("terrain full chunk has wrong byte size")
	if chunk.hex_encode() != str(full.get("chunkHex", "")):
		return _fail_bool("terrain full chunk byte mismatch")
	return true

func _fail_bool(message: String) -> bool:
	push_error(message)
	quit(1)
	return false

func _fail(message: String) -> void:
	push_error(message)
	quit(1)
