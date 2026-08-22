import {BLOCK} from './blocks.js';

export const MINECRAFT_MODEL_RUNTIME_VERSION=1;

const descriptor=(blockstate,{state={},renderLayer='opaque',textureLayers={}}={})=>Object.freeze({
  blockstate,
  state:Object.freeze({...state}),
  renderLayer,
  textureLayers:Object.freeze({...textureLayers})
});

// Explicit opt-in only. Blocks not listed here remain on the existing terrain
// atlas fast path. Keep visual-model registration separate from gameplay
// collision/state rules in blocks.js.
export const MINECRAFT_MODEL_BLOCK_REGISTRY=Object.freeze({
  [BLOCK.CRAFTING_TABLE]:descriptor('minecraft:crafting_table'),
  [BLOCK.IRON_ORE]:descriptor('minecraft:iron_ore'),
  [BLOCK.GLASS]:descriptor('minecraft:glass',{renderLayer:'translucent'}),
  // The current voxel payload stores block IDs only, so the first furnace slice
  // uses the canonical north-facing unlit state. Facing/lit are state upgrades,
  // not reasons to fall back to handmade geometry or textures.
  [BLOCK.FURNACE]:descriptor('minecraft:furnace',{state:{facing:'north',lit:'false'}}),
  [BLOCK.FARMLAND]:descriptor('minecraft:farmland',{state:{moisture:'0'}}),
  [BLOCK.FARMLAND_MOISTURE_1]:descriptor('minecraft:farmland',{state:{moisture:'1'}}),
  [BLOCK.FARMLAND_MOISTURE_2]:descriptor('minecraft:farmland',{state:{moisture:'2'}}),
  [BLOCK.FARMLAND_MOISTURE_3]:descriptor('minecraft:farmland',{state:{moisture:'3'}}),
  [BLOCK.FARMLAND_MOISTURE_4]:descriptor('minecraft:farmland',{state:{moisture:'4'}}),
  [BLOCK.FARMLAND_MOISTURE_5]:descriptor('minecraft:farmland',{state:{moisture:'5'}}),
  [BLOCK.FARMLAND_MOISTURE_6]:descriptor('minecraft:farmland',{state:{moisture:'6'}}),
  [BLOCK.FARMLAND_MOISTURE_7]:descriptor('minecraft:farmland',{state:{moisture:'7'}}),
  [BLOCK.WHEAT_AGE_0]:descriptor('minecraft:wheat',{state:{age:'0'},renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_1]:descriptor('minecraft:wheat',{state:{age:'1'},renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_2]:descriptor('minecraft:wheat',{state:{age:'2'},renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_3]:descriptor('minecraft:wheat',{state:{age:'3'},renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_4]:descriptor('minecraft:wheat',{state:{age:'4'},renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_5]:descriptor('minecraft:wheat',{state:{age:'5'},renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_6]:descriptor('minecraft:wheat',{state:{age:'6'},renderLayer:'cutout'}),
  [BLOCK.WHEAT_AGE_7]:descriptor('minecraft:wheat',{state:{age:'7'},renderLayer:'cutout'})
});

export function minecraftModelBlockDescriptor(blockId){
  return MINECRAFT_MODEL_BLOCK_REGISTRY[Number(blockId)]||null;
}

export function minecraftModelBlockIds(){
  return Object.freeze(Object.keys(MINECRAFT_MODEL_BLOCK_REGISTRY).map(Number));
}
