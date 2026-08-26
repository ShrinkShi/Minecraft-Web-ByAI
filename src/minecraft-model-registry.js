import {BLOCK} from './blocks.js';
import {FARMLAND_BLOCK_STATE_SCHEMA,FURNACE_BLOCK_STATE_SCHEMA,WHEAT_BLOCK_STATE_SCHEMA,normalizeBlockStateProperties} from './block-state-schema.js';

export const MINECRAFT_MODEL_RUNTIME_VERSION=1;

const descriptor=(blockstate,{state={},renderLayer='opaque',textureLayers={}}={})=>Object.freeze({
  blockstate,
  state:Object.freeze({...state}),
  renderLayer,
  textureLayers:Object.freeze({...textureLayers})
});
const schemaState=(schema,state={})=>normalizeBlockStateProperties(schema,state);

// Full-cube blocks are deliberately data-driven here. This is the reusable path
// for ordinary source-backed cubes; stateful/non-cube families stay explicit.
export const MINECRAFT_SIMPLE_FULL_CUBE_MODELS=Object.freeze([
  Object.freeze({blockId:BLOCK.PLANKS,blockstate:'minecraft:oak_planks'}),
  Object.freeze({blockId:BLOCK.GRANITE,blockstate:'minecraft:granite'}),
  Object.freeze({blockId:BLOCK.DIORITE,blockstate:'minecraft:diorite'}),
  Object.freeze({blockId:BLOCK.ANDESITE,blockstate:'minecraft:andesite'}),
  Object.freeze({blockId:BLOCK.SPRUCE_PLANKS,blockstate:'minecraft:spruce_planks'}),
  Object.freeze({blockId:BLOCK.BIRCH_PLANKS,blockstate:'minecraft:birch_planks'}),
  Object.freeze({blockId:BLOCK.JUNGLE_PLANKS,blockstate:'minecraft:jungle_planks'}),
  Object.freeze({blockId:BLOCK.ACACIA_PLANKS,blockstate:'minecraft:acacia_planks'}),
  Object.freeze({blockId:BLOCK.DARK_OAK_PLANKS,blockstate:'minecraft:dark_oak_planks'}),
  Object.freeze({blockId:BLOCK.MANGROVE_PLANKS,blockstate:'minecraft:mangrove_planks'}),
  Object.freeze({blockId:BLOCK.CHERRY_PLANKS,blockstate:'minecraft:cherry_planks'})
]);
const SIMPLE_FULL_CUBE_REGISTRY=Object.fromEntries(MINECRAFT_SIMPLE_FULL_CUBE_MODELS.map(({blockId,blockstate})=>[blockId,descriptor(blockstate)]));

// Explicit opt-in only. Blocks not listed here remain on the existing terrain
// atlas fast path. Keep visual-model registration separate from gameplay
// collision/state rules in blocks.js.
export const MINECRAFT_MODEL_BLOCK_REGISTRY=Object.freeze({
  ...SIMPLE_FULL_CUBE_REGISTRY,
  [BLOCK.CRAFTING_TABLE]:descriptor('minecraft:crafting_table'),
  [BLOCK.IRON_ORE]:descriptor('minecraft:iron_ore'),
  [BLOCK.GLASS]:descriptor('minecraft:glass',{renderLayer:'translucent'}),
  // The current voxel payload stores block IDs only, so the first furnace slice
  // still uses the canonical north-facing unlit state. The value now passes
  // through the same schema layer that later persisted properties will use.
  [BLOCK.FURNACE]:descriptor('minecraft:furnace',{state:schemaState(FURNACE_BLOCK_STATE_SCHEMA)}),
  [BLOCK.FARMLAND]:descriptor('minecraft:farmland',{state:schemaState(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:0})}),
  [BLOCK.FARMLAND_MOISTURE_1]:descriptor('minecraft:farmland',{state:schemaState(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:1})}),
  [BLOCK.FARMLAND_MOISTURE_2]:descriptor('minecraft:farmland',{state:schemaState(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:2})}),
  [BLOCK.FARMLAND_MOISTURE_3]:descriptor('minecraft:farmland',{state:schemaState(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:3})}),
  [BLOCK.FARMLAND_MOISTURE_4]:descriptor('minecraft:farmland',{state:schemaState(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:4})}),
  [BLOCK.FARMLAND_MOISTURE_5]:descriptor('minecraft:farmland',{state:schemaState(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:5})}),
  [BLOCK.FARMLAND_MOISTURE_6]:descriptor('minecraft:farmland',{state:schemaState(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:6})}),
  [BLOCK.FARMLAND_MOISTURE_7]:descriptor('minecraft:farmland',{state:schemaState(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:7})}),
  [BLOCK.WHEAT_AGE_0]:descriptor('minecraft:wheat',{state:schemaState(WHEAT_BLOCK_STATE_SCHEMA,{age:0}),renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_1]:descriptor('minecraft:wheat',{state:schemaState(WHEAT_BLOCK_STATE_SCHEMA,{age:1}),renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_2]:descriptor('minecraft:wheat',{state:schemaState(WHEAT_BLOCK_STATE_SCHEMA,{age:2}),renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_3]:descriptor('minecraft:wheat',{state:schemaState(WHEAT_BLOCK_STATE_SCHEMA,{age:3}),renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_4]:descriptor('minecraft:wheat',{state:schemaState(WHEAT_BLOCK_STATE_SCHEMA,{age:4}),renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_5]:descriptor('minecraft:wheat',{state:schemaState(WHEAT_BLOCK_STATE_SCHEMA,{age:5}),renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_6]:descriptor('minecraft:wheat',{state:schemaState(WHEAT_BLOCK_STATE_SCHEMA,{age:6}),renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_7]:descriptor('minecraft:wheat',{state:schemaState(WHEAT_BLOCK_STATE_SCHEMA,{age:7}),renderLayer:'cutout'}),
  // Java 1.20.1 canonical resource name is minecraft:grass. The model inherits
  // tinted_cross, so BLOCKS[SHORT_GRASS].tint supplies the current non-biome fallback.
  [BLOCK.SHORT_GRASS]:descriptor('minecraft:grass',{renderLayer:'cutout'})
});

export function minecraftModelBlockDescriptor(blockId){
  return MINECRAFT_MODEL_BLOCK_REGISTRY[Number(blockId)]||null;
}

export function minecraftModelBlockIds(){
  return Object.freeze(Object.keys(MINECRAFT_MODEL_BLOCK_REGISTRY).map(Number));
}
