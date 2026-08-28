class_name BlockRegistry
extends RefCounted

# Compatibility contract copied from the merged JavaScript registry.
# Existing IDs are append-only and must not be renumbered during the Godot migration.
const AIR := 0
const GRASS := 1
const DIRT := 2
const STONE := 3
const SAND := 4
const PLANKS := 5
const LOG := 6
const LEAVES := 7
const WATER := 8
const CRAFTING_TABLE := 9
const COBBLESTONE := 10
const BED_NORTH_FOOT := 11
const BED_NORTH_HEAD := 12
const BED_SOUTH_FOOT := 13
const BED_SOUTH_HEAD := 14
const BED_WEST_FOOT := 15
const BED_WEST_HEAD := 16
const BED_EAST_FOOT := 17
const BED_EAST_HEAD := 18
const IRON_ORE := 19
const GLASS := 20
const FURNACE := 21
const FARMLAND := 24
const DIRT_PATH := 25
const STRIPPED_OAK_LOG := 26
const COAL_ORE := 27
const FARMLAND_MOISTURE_1 := 28
const FARMLAND_MOISTURE_2 := 29
const FARMLAND_MOISTURE_3 := 30
const FARMLAND_MOISTURE_4 := 31
const FARMLAND_MOISTURE_5 := 32
const FARMLAND_MOISTURE_6 := 33
const FARMLAND_MOISTURE_7 := 34
const WHEAT_AGE_0 := 35
const WHEAT_AGE_1 := 36
const WHEAT_AGE_2 := 37
const WHEAT_AGE_3 := 38
const WHEAT_AGE_4 := 39
const WHEAT_AGE_5 := 40
const WHEAT_AGE_6 := 41
const WHEAT_AGE_7 := 42
const SHORT_GRASS := 43
const GRANITE := 44
const DIORITE := 45
const ANDESITE := 46
const SPRUCE_PLANKS := 47
const BIRCH_PLANKS := 48
const JUNGLE_PLANKS := 49
const ACACIA_PLANKS := 50
const DARK_OAK_PLANKS := 51
const MANGROVE_PLANKS := 52
const CHERRY_PLANKS := 53
const CURRENT_MAX_ID := 53

const DEFINITIONS := {
	AIR: {"name": "空气", "solid": false},
	GRASS: {"name": "草方块", "solid": true},
	DIRT: {"name": "泥土", "solid": true},
	STONE: {"name": "石头", "solid": true},
	SAND: {"name": "沙子", "solid": true},
	PLANKS: {"name": "橡木木板", "solid": true},
	LOG: {"name": "橡木原木", "solid": true},
	LEAVES: {"name": "橡树树叶", "solid": true, "transparent": true},
	WATER: {"name": "水", "solid": false, "liquid": true, "transparent": true},
	CRAFTING_TABLE: {"name": "工作台", "solid": true},
	COBBLESTONE: {"name": "圆石", "solid": true},
	IRON_ORE: {"name": "铁矿石", "solid": true},
	GLASS: {"name": "玻璃", "solid": true, "transparent": true},
	FURNACE: {"name": "熔炉", "solid": true},
	FARMLAND: {"name": "耕地", "solid": true, "full_cube": false},
	DIRT_PATH: {"name": "土径", "solid": true, "full_cube": false},
	STRIPPED_OAK_LOG: {"name": "去皮橡木原木", "solid": true},
	COAL_ORE: {"name": "煤矿石", "solid": true},
	SHORT_GRASS: {"name": "矮草", "solid": false, "transparent": true, "full_cube": false},
	GRANITE: {"name": "花岗岩", "solid": true},
	DIORITE: {"name": "闪长岩", "solid": true},
	ANDESITE: {"name": "安山岩", "solid": true},
	SPRUCE_PLANKS: {"name": "云杉木板", "solid": true},
	BIRCH_PLANKS: {"name": "白桦木板", "solid": true},
	JUNGLE_PLANKS: {"name": "丛林木板", "solid": true},
	ACACIA_PLANKS: {"name": "金合欢木板", "solid": true},
	DARK_OAK_PLANKS: {"name": "深色橡木木板", "solid": true},
	MANGROVE_PLANKS: {"name": "红树木板", "solid": true},
	CHERRY_PLANKS: {"name": "樱花木板", "solid": true},
}

const TEXTURE_ROOT := "res://MC原版素材assets/minecraft/textures/block/"
const TEXTURES := {
	GRASS: {"top": "grass_block_top.png", "bottom": "dirt.png", "side": "grass_block_side.png"},
	DIRT: {"all": "dirt.png"},
	STONE: {"all": "stone.png"},
	SAND: {"all": "sand.png"},
	PLANKS: {"all": "oak_planks.png"},
	LOG: {"top": "oak_log_top.png", "bottom": "oak_log_top.png", "side": "oak_log.png"},
	LEAVES: {"all": "oak_leaves.png"},
	COBBLESTONE: {"all": "cobblestone.png"},
	IRON_ORE: {"all": "iron_ore.png"},
	GLASS: {"all": "glass.png"},
	FURNACE: {"top": "furnace_top.png", "bottom": "furnace_top.png", "side": "furnace_side.png", "north": "furnace_front.png"},
	COAL_ORE: {"all": "coal_ore.png"},
	GRANITE: {"all": "granite.png"},
	DIORITE: {"all": "diorite.png"},
	ANDESITE: {"all": "andesite.png"},
	SPRUCE_PLANKS: {"all": "spruce_planks.png"},
	BIRCH_PLANKS: {"all": "birch_planks.png"},
	JUNGLE_PLANKS: {"all": "jungle_planks.png"},
	ACACIA_PLANKS: {"all": "acacia_planks.png"},
	DARK_OAK_PLANKS: {"all": "dark_oak_planks.png"},
	MANGROVE_PLANKS: {"all": "mangrove_planks.png"},
	CHERRY_PLANKS: {"all": "cherry_planks.png"},
}

static func is_solid(block_id: int) -> bool:
	return bool(DEFINITIONS.get(block_id, DEFINITIONS[AIR]).get("solid", false))

static func block_name(block_id: int) -> String:
	return str(DEFINITIONS.get(block_id, DEFINITIONS[AIR]).get("name", "未知"))

static func texture_for_face(block_id: int, face_name: String) -> String:
	var faces: Dictionary = TEXTURES.get(block_id, {})
	var filename := str(faces.get(face_name, faces.get("side", faces.get("all", "stone.png"))))
	return TEXTURE_ROOT + filename
