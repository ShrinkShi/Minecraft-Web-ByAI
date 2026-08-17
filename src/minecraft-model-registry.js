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
  [BLOCK.CRAFTING_TABLE]:descriptor('minecraft:crafting_table')
});

export function minecraftModelBlockDescriptor(blockId){
  return MINECRAFT_MODEL_BLOCK_REGISTRY[Number(blockId)]||null;
}

export function minecraftModelBlockIds(){
  return Object.freeze(Object.keys(MINECRAFT_MODEL_BLOCK_REGISTRY).map(Number));
}
