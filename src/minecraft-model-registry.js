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
  [BLOCK.FURNACE]:descriptor('minecraft:furnace',{state:{facing:'north',lit:'false'}})
});

export function minecraftModelBlockDescriptor(blockId){
  return MINECRAFT_MODEL_BLOCK_REGISTRY[Number(blockId)]||null;
}

export function minecraftModelBlockIds(){
  return Object.freeze(Object.keys(MINECRAFT_MODEL_BLOCK_REGISTRY).map(Number));
}
