class_name TerrainGeneratorRuntime
extends RefCounted

const BlockRegistry = preload("res://godot/scripts/block_registry.gd")

const TERRAIN_GENERATOR_VERSION := 4
const SUPPORTED_VERSIONS := [2, 3, 4]
const CHUNK_SIZE := 16
const WORLD_HEIGHT := 64
const UINT32_MASK := 0xffffffff
const UINT32_MOD := 0x100000000
const FNV_OFFSET := 2166136261
const FNV_PRIME := 16777619
const IRON_MIN_Y := 4
const IRON_MAX_Y := 48
const IRON_VEIN_CELL := 3
const IRON_VEIN_CHANCE := 0.045
const IRON_FILL_CHANCE := 0.22
const IRON_VEIN_SALT := 0x49a2
const IRON_FILL_SALT := 0x1f2e
const COAL_MIN_Y := 4
const COAL_MAX_Y := 56
const COAL_VEIN_CELL := 4
const COAL_VEIN_CHANCE := 0.07
const COAL_FILL_CHANCE := 0.28
const COAL_VEIN_SALT := 0x0c0a1
const COAL_FILL_SALT := 0x51ad
const SHORT_GRASS_SURFACE_CHANCE := 0.18
const SHORT_GRASS_SALT := 0x61a55

var version: int
var seed_hash: int
var parameters: Dictionary
var _hash2_cache: Dictionary = {}

func _init(seed: String = "1", prompt: String = "", generator_version: int = TERRAIN_GENERATOR_VERSION) -> void:
	version = normalize_version(generator_version)
	seed_hash = hash_terrain_seed(seed)
	parameters = terrain_parameters(prompt)

static func normalize_version(value: int) -> int:
	if not SUPPORTED_VERSIONS.has(value):
		push_error("unsupported terrain generator version: %d" % value)
		return -1
	return value

static func terrain_chunk_index(x: int, y: int, z: int) -> int:
	return x + CHUNK_SIZE * (z + CHUNK_SIZE * y)

static func hash_terrain_seed(value: String = "1") -> int:
	var text: String = value if not value.is_empty() else "1"
	var hash: int = FNV_OFFSET
	for index in range(text.length()):
		var codepoint: int = text.unicode_at(index)
		if codepoint <= 0xffff:
			hash = _imul32(hash ^ codepoint, FNV_PRIME)
		else:
			var scalar: int = codepoint - 0x10000
			var high: int = 0xd800 + (scalar >> 10)
			var low: int = 0xdc00 + (scalar & 0x3ff)
			hash = _imul32(hash ^ high, FNV_PRIME)
			hash = _imul32(hash ^ low, FNV_PRIME)
	return hash & UINT32_MASK

static func terrain_parameters(value: String = "") -> Dictionary:
	var prompt: String = value.to_lower()
	var amplitude: int = 10
	if prompt.contains("山") or prompt.contains("mountain") or prompt.contains("峭壁"):
		amplitude = 18
	elif prompt.contains("平原") or prompt.contains("plain"):
		amplitude = 5
	var sea: int = 20
	if prompt.contains("海") or prompt.contains("ocean") or prompt.contains("湖") or prompt.contains("lake") or prompt.contains("河") or prompt.contains("river"):
		sea = 24
	var forest: float = 0.055
	if prompt.contains("森林") or prompt.contains("forest") or prompt.contains("丛林") or prompt.contains("jungle"):
		forest = 0.11
	var sand: float = 0.14
	if prompt.contains("沙漠") or prompt.contains("desert") or prompt.contains("沙地"):
		sand = 0.36
	return {"amp": amplitude, "sea": sea, "forest": forest, "sand": sand}

func hash2(x: int, z: int) -> float:
	var cache_key := Vector2i(x, z)
	var cached: Variant = _hash2_cache.get(cache_key)
	if cached != null:
		return float(cached)
	var hash: int = (_imul32(x, 374761393) ^ _imul32(z, 668265263) ^ seed_hash) & UINT32_MASK
	var mixed_signed: int = _i32((hash ^ (hash >> 13)) & UINT32_MASK)
	var multiplied: float = float(mixed_signed) * 1274126177.0
	var multiplied_bits: int = _number_to_uint32(multiplied)
	var output: int = (multiplied_bits ^ (multiplied_bits >> 16)) & UINT32_MASK
	var result: float = float(output) / 4294967295.0
	_hash2_cache[cache_key] = result
	return result

func hash3(x: int, y: int, z: int, salt: int = 0) -> float:
	var hash: int = (seed_hash ^ _imul32(x, 374761393) ^ _imul32(y, 668265263) ^ _imul32(z, 1274126177) ^ _imul32(salt, 1597334677)) & UINT32_MASK
	hash = _imul32((hash ^ (hash >> 13)) & UINT32_MASK, 1274126177)
	var output: int = (hash ^ (hash >> 16)) & UINT32_MASK
	return float(output) / 4294967295.0

func value_noise(x: float, z: float) -> float:
	var x0: int = int(floor(x))
	var z0: int = int(floor(z))
	var tx: float = _smooth(x - float(x0))
	var tz: float = _smooth(z - float(z0))
	var a: float = hash2(x0, z0)
	var b: float = hash2(x0 + 1, z0)
	var c: float = hash2(x0, z0 + 1)
	var d: float = hash2(x0 + 1, z0 + 1)
	var ab: float = a + (b - a) * tx
	var cd: float = c + (d - c) * tx
	return ab + (cd - ab) * tz

func fbm(x: float, z: float) -> float:
	var result: float = 0.0
	var amplitude: float = 0.55
	var frequency: float = 0.035
	var normalizer: float = 0.0
	for _iteration in range(4):
		result += value_noise(x * frequency, z * frequency) * amplitude
		normalizer += amplitude
		amplitude *= 0.5
		frequency *= 2.0
	return result / normalizer

func height_at(x: int, z: int) -> int:
	var continental: float = (fbm(float(x) * 0.55, float(z) * 0.55) - 0.5) * float(parameters["amp"])
	var detail: float = (fbm(float(x) + 731.0, float(z) - 271.0) - 0.5) * 4.0
	return maxi(6, mini(WORLD_HEIGHT - 10, int(floor(25.0 + continental + detail))))

func is_iron_ore(x: int, y: int, z: int, top: int = IRON_MAX_Y + 4) -> bool:
	var maximum_y: int = mini(IRON_MAX_Y, top - 4)
	if y < IRON_MIN_Y or y > maximum_y:
		return false
	var vein: float = hash3(_floor_div(x, IRON_VEIN_CELL), _floor_div(y, IRON_VEIN_CELL), _floor_div(z, IRON_VEIN_CELL), IRON_VEIN_SALT)
	return vein < IRON_VEIN_CHANCE and hash3(x, y, z, IRON_FILL_SALT) < IRON_FILL_CHANCE

func is_coal_ore(x: int, y: int, z: int, top: int = COAL_MAX_Y + 4) -> bool:
	if version < 3:
		return false
	var maximum_y: int = mini(COAL_MAX_Y, top - 4)
	if y < COAL_MIN_Y or y > maximum_y:
		return false
	var vein: float = hash3(_floor_div(x, COAL_VEIN_CELL), _floor_div(y, COAL_VEIN_CELL), _floor_div(z, COAL_VEIN_CELL), COAL_VEIN_SALT)
	return vein < COAL_VEIN_CHANCE and hash3(x, y, z, COAL_FILL_SALT) < COAL_FILL_CHANCE

func is_short_grass_decoration(x: int, y: int, z: int) -> bool:
	return version >= 4 and hash3(x, y, z, SHORT_GRASS_SALT) < SHORT_GRASS_SURFACE_CHANCE

func generate_chunk(cx: int, cz: int) -> PackedByteArray:
	var chunk := PackedByteArray()
	chunk.resize(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
	chunk.fill(BlockRegistry.AIR)
	for lx in range(CHUNK_SIZE):
		for lz in range(CHUNK_SIZE):
			var wx: int = cx * CHUNK_SIZE + lx
			var wz: int = cz * CHUNK_SIZE + lz
			var top: int = height_at(wx, wz)
			var moisture: float = fbm(float(wx) + 2000.0, float(wz) - 900.0)
			var sandy: bool = top <= int(parameters["sea"]) + 1 or moisture < float(parameters["sand"])
			for y in range(top + 1):
				var block_id: int = BlockRegistry.STONE
				if y == top:
					block_id = BlockRegistry.SAND if sandy else BlockRegistry.GRASS
				elif y >= top - 3:
					block_id = BlockRegistry.SAND if sandy else BlockRegistry.DIRT
				elif is_iron_ore(wx, y, wz, top):
					block_id = BlockRegistry.IRON_ORE
				elif is_coal_ore(wx, y, wz, top):
					block_id = BlockRegistry.COAL_ORE
				_set_block(chunk, lx, y, lz, block_id)
			for y in range(top + 1, int(parameters["sea"]) + 1):
				_set_block(chunk, lx, y, lz, BlockRegistry.WATER)
			if top > int(parameters["sea"]) + 1 and chunk[terrain_chunk_index(lx, top, lz)] == BlockRegistry.GRASS and hash2(wx * 7, wz * 7) < float(parameters["forest"]) and lx > 2 and lx < 13 and lz > 2 and lz < 13:
				_tree(chunk, lx, top + 1, lz)
			if version >= 4 and top > int(parameters["sea"]) + 1 and top + 1 < WORLD_HEIGHT and chunk[terrain_chunk_index(lx, top, lz)] == BlockRegistry.GRASS and chunk[terrain_chunk_index(lx, top + 1, lz)] == BlockRegistry.AIR and is_short_grass_decoration(wx, top + 1, wz):
				_set_block(chunk, lx, top + 1, lz, BlockRegistry.SHORT_GRASS)
	return chunk

func _tree(chunk: PackedByteArray, lx: int, base: int, lz: int) -> void:
	for y in range(4):
		_set_block(chunk, lx, base + y, lz, BlockRegistry.LOG)
	for y in range(base + 2, base + 6):
		for x in range(lx - 2, lx + 3):
			for z in range(lz - 2, lz + 3):
				var distance: int = absi(x - lx) + absi(z - lz) + (1 if y == base + 5 else 0)
				if distance <= 4 and not (x == lx and z == lz and y < base + 4):
					_set_block(chunk, x, y, z, BlockRegistry.LEAVES)

static func _set_block(chunk: PackedByteArray, x: int, y: int, z: int, block_id: int) -> void:
	if x >= 0 and x < CHUNK_SIZE and z >= 0 and z < CHUNK_SIZE and y >= 0 and y < WORLD_HEIGHT:
		chunk[terrain_chunk_index(x, y, z)] = block_id

static func _smooth(value: float) -> float:
	return value * value * (3.0 - 2.0 * value)

static func _floor_div(value: int, divisor: int) -> int:
	return int(floor(float(value) / float(divisor)))

static func _i32(bits: int) -> int:
	var value: int = bits & UINT32_MASK
	return value - UINT32_MOD if value >= 0x80000000 else value

static func _number_to_uint32(value: float) -> int:
	if is_nan(value) or is_inf(value) or value == 0.0:
		return 0
	return int(value) & UINT32_MASK

static func _imul32(a: int, b: int) -> int:
	var left: int = a & UINT32_MASK
	var right: int = b & UINT32_MASK
	var left_low: int = left & 0xffff
	var left_high: int = (left >> 16) & 0xffff
	var right_low: int = right & 0xffff
	var right_high: int = (right >> 16) & 0xffff
	return (left_low * right_low + ((left_high * right_low + left_low * right_high) << 16)) & UINT32_MASK
