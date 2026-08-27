"""Shared acceptance roots for the generic Minecraft block-model pipeline."""

MINECRAFT_MODEL_ACCEPTANCE_BLOCKS = (
    "minecraft:iron_ore",
    "minecraft:glass",
    "minecraft:oak_log",
    "minecraft:stripped_oak_log",
    "minecraft:oak_slab",
    "minecraft:oak_stairs",
    "minecraft:oak_door",
    "minecraft:oak_fence",
    "minecraft:torch",
    "minecraft:grass_block",
    "minecraft:crafting_table",
    "minecraft:furnace",
    "minecraft:farmland",
    "minecraft:wheat",
    "minecraft:grass",
    # Registry breadth phase 1: ordinary full cubes must travel through the
    # same canonical blockstate/model/texture closure as stateful models.
    "minecraft:oak_planks",
    "minecraft:granite",
    "minecraft:diorite",
    "minecraft:andesite",
    "minecraft:spruce_planks",
    "minecraft:birch_planks",
    "minecraft:jungle_planks",
    "minecraft:acacia_planks",
    "minecraft:dark_oak_planks",
    "minecraft:mangrove_planks",
    "minecraft:cherry_planks",
)
