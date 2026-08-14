export const ASSET_MANIFEST_VERSION=1;

export const ASSET_SOURCE=Object.freeze({
  PROTOTYPE:'prototype',
  USER_SUPPLIED:'user-supplied',
  MISSING:'missing'
});

const RECORDS=Object.freeze({
  'terrain.block_atlas':Object.freeze({kind:'texture-atlas',source:ASSET_SOURCE.PROTOTYPE,url:'./assets/textures/atlas.png'}),
  'item.stick':Object.freeze({kind:'item-texture',source:ASSET_SOURCE.PROTOTYPE,url:'./assets/items/stick.png'}),
  'item.wooden_pickaxe':Object.freeze({kind:'item-texture',source:ASSET_SOURCE.PROTOTYPE,url:'./assets/items/wooden_pickaxe.png'}),

  // Known gameplay resources that intentionally remain unresolved until the
  // user-supplied Minecraft archive is available in the active workspace.
  'item.stone_pickaxe':Object.freeze({kind:'item-texture',source:ASSET_SOURCE.MISSING,url:null}),
  'item.raw_iron':Object.freeze({kind:'item-texture',source:ASSET_SOURCE.MISSING,url:null}),
  'block.iron_ore':Object.freeze({kind:'block-texture',source:ASSET_SOURCE.MISSING,url:null})
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
