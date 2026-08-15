export const ASSET_MANIFEST_VERSION=2;

export const ASSET_SOURCE=Object.freeze({
  PROTOTYPE:'prototype',
  USER_SUPPLIED:'user-supplied',
  MISSING:'missing'
});

const supplied=(kind,url,extra={})=>Object.freeze({kind,source:ASSET_SOURCE.USER_SUPPLIED,url,...extra});

const RECORDS=Object.freeze({
  'terrain.block_atlas':supplied('texture-atlas','./assets/textures/atlas.png',{minecraftVersion:'1.20.1'}),
  'block.iron_ore':supplied('atlas-tile','./assets/textures/atlas.png',{tile:14}),
  'block.white_wool':supplied('atlas-tile','./assets/textures/atlas.png',{tile:15}),

  'item.stick':supplied('item-texture','./assets/items/stick.png'),
  'item.wooden_pickaxe':supplied('item-texture','./assets/items/wooden_pickaxe.png'),
  'item.stone_pickaxe':supplied('item-texture','./assets/items/stone_pickaxe.png'),
  'item.raw_iron':supplied('item-texture','./assets/items/raw_iron.png'),
  'item.leather_helmet':supplied('item-texture','./assets/items/leather_helmet.png'),
  'item.leather_chestplate':supplied('item-texture','./assets/items/leather_chestplate.png'),
  'item.leather_leggings':supplied('item-texture','./assets/items/leather_leggings.png'),
  'item.leather_boots':supplied('item-texture','./assets/items/leather_boots.png'),
  'item.raw_beef':supplied('item-texture','./assets/items/raw_beef.png'),
  'item.leather':supplied('item-texture','./assets/items/leather.png'),
  'item.raw_mutton':supplied('item-texture','./assets/items/raw_mutton.png'),
  'item.raw_porkchop':supplied('item-texture','./assets/items/raw_porkchop.png'),
  'item.raw_chicken':supplied('item-texture','./assets/items/raw_chicken.png'),
  'item.feather':supplied('item-texture','./assets/items/feather.png'),
  'item.rotten_flesh':supplied('item-texture','./assets/items/rotten_flesh.png'),
  'item.bone':supplied('item-texture','./assets/items/bone.png'),
  'item.arrow':supplied('item-texture','./assets/items/arrow.png'),
  'item.gunpowder':supplied('item-texture','./assets/items/gunpowder.png'),
  'item.string':supplied('item-texture','./assets/items/string.png'),

  'entity.bed.red':supplied('entity-texture','./assets/minecraft/textures/entity/bed/red.png'),
  'metadata.minecraft_runtime':supplied('asset-metadata','./assets/minecraft/runtime-manifest.json')
});

export const ASSET_KEYS=Object.freeze(Object.keys(RECORDS));

function key(value){
  if(typeof value!=='string'||!value.trim())throw new TypeError('asset key must be a non-empty string');
  return value;
}

export function assetRecord(value){
  return RECORDS[key(value)]||null;
}

export function assetUrl(value){
  return assetRecord(value)?.url||null;
}

export function assetAvailable(value){
  return assetUrl(value)!==null;
}

export function assetIsPrototype(value){
  return assetRecord(value)?.source===ASSET_SOURCE.PROTOTYPE;
}

export function requireAssetUrl(value){
  const normalized=key(value),url=assetUrl(normalized);
  if(!url)throw new Error(`required asset is unavailable: ${normalized}`);
  return url;
}

export function assetManifestSnapshot(){
  return Object.freeze(Object.fromEntries(ASSET_KEYS.map(assetKey=>[assetKey,Object.freeze({...RECORDS[assetKey]})])));
}
