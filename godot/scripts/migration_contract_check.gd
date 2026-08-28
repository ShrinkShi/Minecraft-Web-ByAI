class_name MigrationContractCheck
extends RefCounted

const BlockRegistry = preload("res://godot/scripts/block_registry.gd")
const BlockStateCodec = preload("res://godot/scripts/block_state_codec.gd")

static func run() -> void:
	assert(BlockRegistry.AIR == 0)
	assert(BlockRegistry.GRASS == 1)
	assert(BlockRegistry.DIRT == 2)
	assert(BlockRegistry.STONE == 3)
	assert(BlockRegistry.BED_NORTH_FOOT == 11)
	assert(BlockRegistry.BED_EAST_HEAD == 18)
	assert(BlockRegistry.IRON_ORE == 19)
	assert(BlockRegistry.FARMLAND == 24)
	assert(BlockRegistry.COAL_ORE == 27)
	assert(BlockRegistry.WHEAT_AGE_7 == 42)
	assert(BlockRegistry.SHORT_GRASS == 43)
	assert(BlockRegistry.CHERRY_PLANKS == 53)
	assert(BlockRegistry.CURRENT_MAX_ID == 53)

	var canonical: String = BlockStateCodec.canonical_key({"waterlogged": "false", "axis": "x"})
	assert(canonical == "axis=x,waterlogged=false")
	assert(BlockStateCodec.normalized_key("waterlogged=false,axis=x") == canonical)
	assert(BlockStateCodec.parse_key(canonical) == {"axis": "x", "waterlogged": "false"})

	assert(FileAccess.file_exists(BlockRegistry.texture_for_face(BlockRegistry.GRASS, "top")))
	assert(FileAccess.file_exists(BlockRegistry.texture_for_face(BlockRegistry.DIRT, "side")))
	assert(FileAccess.file_exists(BlockRegistry.texture_for_face(BlockRegistry.STONE, "side")))
