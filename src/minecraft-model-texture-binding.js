import {requireAssetUrl} from './asset-manifest.js';
import {MINECRAFT_MODEL_RENDER_LAYERS} from './minecraft-model-mesh-batch.js';
import {normalizeMinecraftResourceId} from './minecraft-resource-id.js';

const SHA256_RE=/^[0-9a-f]{64}$/;
const RENDER_LAYER_SET=new Set(MINECRAFT_MODEL_RENDER_LAYERS);
const REGION_EPSILON=1e-12;
const ATLAS_PACKING='power-of-two-shelf-v1';
const ATLAS_GUTTER_PX=1;

function object(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  return value;
}

function finite(value,label){
  if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);
  return value;
}

function integer(value,label,{min=0}={}){
  if(!Number.isInteger(value)||value<min)throw new TypeError(`${label} must be an integer >= ${min}`);
  return value;
}

function nonEmptyString(value,label){
  if(typeof value!=='string'||!value)throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function sha256(value,label){
  if(typeof value!=='string'||!SHA256_RE.test(value))throw new TypeError(`${label} must be a lowercase SHA-256 hex digest`);
  return value;
}

function powerOfTwo(value){return value>0&&(value&(value-1))===0;}

function normalizedRegion(raw,label){
  object(raw,label);
  const region=Object.freeze({
    u0:finite(raw.u0,`${label}.u0`),
    v0:finite(raw.v0,`${label}.v0`),
    u1:finite(raw.u1,`${label}.u1`),
    v1:finite(raw.v1,`${label}.v1`)
  });
  if(region.u0<0||region.v0<0||region.u1>1||region.v1>1||region.u0>=region.u1||region.v0>=region.v1){
    throw new RangeError(`${label} must be a non-empty normalized atlas rectangle`);
  }
  return region;
}

function pixelRegion(raw,label,atlasWidth,atlasHeight){
  object(raw,label);
  const region=Object.freeze({
    x:integer(raw.x,`${label}.x`),
    y:integer(raw.y,`${label}.y`),
    width:integer(raw.width,`${label}.width`,{min:1}),
    height:integer(raw.height,`${label}.height`,{min:1})
  });
  if(region.x+region.width>atlasWidth||region.y+region.height>atlasHeight){
    throw new RangeError(`${label} must stay inside the atlas bounds`);
  }
  return region;
}

function near(left,right){return Math.abs(left-right)<=REGION_EPSILON;}

function validateRegionMapping(region,pixels,atlasWidth,atlasHeight,label){
  const expected={
    u0:pixels.x/atlasWidth,
    v0:pixels.y/atlasHeight,
    u1:(pixels.x+pixels.width)/atlasWidth,
    v1:(pixels.y+pixels.height)/atlasHeight
  };
  for(const key of ['u0','v0','u1','v1']){
    if(!near(region[key],expected[key]))throw new RangeError(`${label}.${key} does not match pixelRegion/atlas dimensions`);
  }
}

function canonicalTexturePath(resourceId){
  const separator=resourceId.indexOf(':');
  const namespace=resourceId.slice(0,separator);
  const path=resourceId.slice(separator+1);
  return `assets/${namespace}/textures/${path}.png`;
}

function normalizeTextureRecord(resourceId,raw,atlasWidth,atlasHeight){
  const label=`model atlas texture ${resourceId}`;
  object(raw,label);
  const canonical=nonEmptyString(raw.canonical,`${label}.canonical`);
  const expectedCanonical=canonicalTexturePath(resourceId);
  if(canonical!==expectedCanonical)throw new RangeError(`${label}.canonical must match its resource ID`);
  const source=nonEmptyString(raw.source,`${label}.source`);
  if(!source.replaceAll('\\','/').endsWith(canonical))throw new RangeError(`${label}.source must end with its canonical path`);

  const width=integer(raw.width,`${label}.width`,{min:1});
  const height=integer(raw.height,`${label}.height`,{min:1});
  const pixels=pixelRegion(raw.pixelRegion,`${label}.pixelRegion`,atlasWidth,atlasHeight);
  if(pixels.width!==width||pixels.height!==height)throw new RangeError(`${label} dimensions must match pixelRegion`);
  const region=normalizedRegion(raw.region,`${label}.region`);
  validateRegionMapping(region,pixels,atlasWidth,atlasHeight,`${label}.region`);
  return Object.freeze({
    resourceId,
    canonical,
    source,
    sourceSha256:sha256(raw.sourceSha256,`${label}.sourceSha256`),
    sourceBytes:integer(raw.sourceBytes,`${label}.sourceBytes`,{min:1}),
    width,
    height,
    pixelRegion:pixels,
    region
  });
}

function normalizeClosure(raw){
  object(raw,'Minecraft model atlas manifest.closure');
  return Object.freeze({
    blockstates:integer(raw.blockstates,'Minecraft model atlas manifest.closure.blockstates'),
    models:integer(raw.models,'Minecraft model atlas manifest.closure.models'),
    textures:integer(raw.textures,'Minecraft model atlas manifest.closure.textures'),
    metadata:integer(raw.metadata,'Minecraft model atlas manifest.closure.metadata')
  });
}

export function normalizeMinecraftModelAtlasManifest(raw){
  object(raw,'Minecraft model atlas manifest');
  if(raw.format!==1)throw new RangeError('Minecraft model atlas manifest format must be 1');
  if(raw.minecraftVersion!=='1.20.1')throw new RangeError('Minecraft model atlas manifest must target Java 1.20.1');

  const atlasRaw=object(raw.atlas,'Minecraft model atlas manifest.atlas');
  const atlas=Object.freeze({
    path:nonEmptyString(atlasRaw.path,'Minecraft model atlas manifest.atlas.path'),
    sha256:sha256(atlasRaw.sha256,'Minecraft model atlas manifest.atlas.sha256'),
    width:integer(atlasRaw.width,'Minecraft model atlas manifest.atlas.width',{min:1}),
    height:integer(atlasRaw.height,'Minecraft model atlas manifest.atlas.height',{min:1}),
    gutterPx:integer(atlasRaw.gutterPx,'Minecraft model atlas manifest.atlas.gutterPx'),
    packing:nonEmptyString(atlasRaw.packing,'Minecraft model atlas manifest.atlas.packing')
  });
  if(atlas.path!=='model-texture-atlas.png')throw new RangeError('Minecraft model atlas manifest.atlas.path must name model-texture-atlas.png');
  if(atlas.width!==atlas.height||!powerOfTwo(atlas.width))throw new RangeError('Minecraft model atlas must be a square power-of-two texture');
  if(atlas.gutterPx!==ATLAS_GUTTER_PX)throw new RangeError(`Minecraft model atlas gutter must be ${ATLAS_GUTTER_PX}px for manifest format 1`);
  if(atlas.packing!==ATLAS_PACKING)throw new RangeError(`Minecraft model atlas packing must be ${ATLAS_PACKING} for manifest format 1`);

  const closure=normalizeClosure(raw.closure);
  const sourceArchiveSha256=sha256(raw.sourceArchiveSha256,'Minecraft model atlas manifest.sourceArchiveSha256');
  const rawTextures=object(raw.textures,'Minecraft model atlas manifest.textures');
  const textures=Object.create(null);
  for(const [rawId,rawRecord] of Object.entries(rawTextures)){
    const resourceId=normalizeMinecraftResourceId(rawId);
    if(resourceId!==rawId)throw new TypeError(`model atlas texture key must be canonical: ${rawId}`);
    textures[resourceId]=normalizeTextureRecord(resourceId,rawRecord,atlas.width,atlas.height);
  }
  const textureCount=Object.keys(textures).length;
  if(!textureCount)throw new RangeError('Minecraft model atlas manifest.textures must not be empty');
  if(closure.textures!==textureCount)throw new RangeError('Minecraft model atlas closure texture count must match manifest.textures');

  return Object.freeze({
    format:1,
    minecraftVersion:'1.20.1',
    sourceArchiveSha256,
    closure,
    atlas,
    textures:Object.freeze(textures)
  });
}

export function createMinecraftModelAtlasResolver(rawManifest){
  const manifest=normalizeMinecraftModelAtlasManifest(rawManifest);
  const textureCount=Object.keys(manifest.textures).length;
  const textureRecord=value=>{
    const resourceId=normalizeMinecraftResourceId(value);
    return manifest.textures[resourceId]||null;
  };
  const requireTextureRecord=value=>{
    const resourceId=normalizeMinecraftResourceId(value);
    const record=manifest.textures[resourceId];
    if(!record)throw new Error(`Minecraft model texture is not present in the tracked atlas: ${resourceId}`);
    return record;
  };
  return Object.freeze({
    manifest,
    atlas:manifest.atlas,
    textureCount,
    hasTexture:value=>textureRecord(value)!==null,
    textureRecord,
    requireTextureRecord,
    requireRegion:value=>requireTextureRecord(value).region
  });
}

export function createMinecraftModelTextureBinding(atlasResolver,{resolveLayer}={}){
  if(!atlasResolver||typeof atlasResolver.requireTextureRecord!=='function')throw new TypeError('atlasResolver must expose requireTextureRecord(texture)');
  if(typeof resolveLayer!=='function')throw new TypeError('resolveLayer must be a function');
  return (texture,face,instance)=>{
    const record=atlasResolver.requireTextureRecord(texture);
    const layer=resolveLayer(record.resourceId,face,instance);
    if(!RENDER_LAYER_SET.has(layer))throw new RangeError(`unsupported Minecraft model render layer: ${layer}`);
    return Object.freeze({layer,region:record.region});
  };
}

export async function loadMinecraftModelAtlasResolver({
  manifestUrl=requireAssetUrl('metadata.minecraft_model_atlas'),
  fetchImpl=globalThis.fetch
}={}){
  nonEmptyString(manifestUrl,'manifestUrl');
  if(typeof fetchImpl!=='function')throw new TypeError('fetchImpl must be a function');
  const response=await fetchImpl(manifestUrl);
  if(!response||typeof response!=='object')throw new TypeError('model atlas fetch must return a response object');
  if(response.ok!==true)throw new Error(`failed to load Minecraft model atlas manifest: HTTP ${response.status??'unknown'}`);
  if(typeof response.json!=='function')throw new TypeError('model atlas response must expose json()');
  return createMinecraftModelAtlasResolver(await response.json());
}
