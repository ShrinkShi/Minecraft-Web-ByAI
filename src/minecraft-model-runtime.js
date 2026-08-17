import {resolveMinecraftBlockstate,selectMinecraftWeightedModel} from './minecraft-blockstate-resolver.js';
import {resolveMinecraftBlockModel} from './minecraft-model-resolver.js';
import {compileMinecraftBlockModelGeometry} from './minecraft-model-geometry.js';
import {applyMinecraftModelInstanceTransform} from './minecraft-model-instance.js';
import {MINECRAFT_MODEL_RENDER_LAYERS} from './minecraft-model-mesh-batch.js';
import {normalizeMinecraftResourceId} from './minecraft-resource-id.js';
import {MINECRAFT_MODEL_BLOCK_REGISTRY,MINECRAFT_MODEL_RUNTIME_VERSION} from './minecraft-model-registry.js';

const LAYER_SET=new Set(MINECRAFT_MODEL_RENDER_LAYERS);
const UINT8_MAX=255;

function object(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  return value;
}

function blockId(value,label='block id'){
  const id=Number(value);
  if(!Number.isInteger(id)||id<=0||id>UINT8_MAX)throw new RangeError(`${label} must be an integer within 1..${UINT8_MAX}`);
  return id;
}

function renderLayer(value,label='render layer'){
  if(!LAYER_SET.has(value))throw new RangeError(`${label} must be one of ${MINECRAFT_MODEL_RENDER_LAYERS.join(', ')}`);
  return value;
}

function normalizedTextureLayers(raw={}){
  object(raw,'texture layer overrides');
  const output=Object.create(null);
  for(const [rawId,rawLayer] of Object.entries(raw)){
    const textureId=normalizeMinecraftResourceId(rawId);
    if(textureId!==rawId)throw new TypeError(`texture layer override key must be canonical: ${rawId}`);
    output[textureId]=renderLayer(rawLayer,`texture layer override ${textureId}`);
  }
  return Object.freeze(output);
}

function normalizeRegistry(rawRegistry){
  object(rawRegistry,'Minecraft model block registry');
  const entries=[];
  const seen=new Set();
  for(const [rawBlockId,rawDescriptor] of Object.entries(rawRegistry)){
    const id=blockId(rawBlockId,'Minecraft model registry block id');
    if(seen.has(id))throw new Error(`duplicate Minecraft model registry block id: ${id}`);
    seen.add(id);
    object(rawDescriptor,`Minecraft model registry block ${id}`);
    const blockstate=normalizeMinecraftResourceId(rawDescriptor.blockstate);
    const state=object(rawDescriptor.state??{},`Minecraft model registry block ${id}.state`);
    const renderLayerValue=renderLayer(rawDescriptor.renderLayer??'opaque',`Minecraft model registry block ${id}.renderLayer`);
    entries.push(Object.freeze({
      blockId:id,
      blockstate,
      state:Object.freeze({...state}),
      renderLayer:renderLayerValue,
      textureLayers:normalizedTextureLayers(rawDescriptor.textureLayers??{})
    }));
  }
  entries.sort((a,b)=>a.blockId-b.blockId);
  return Object.freeze(entries);
}

function runtimePart(kind,index,alternatives){
  return Object.freeze({kind,index,alternatives});
}

async function compileAlternativeSet(alternatives,geometryFor){
  const models=[];
  for(const entry of alternatives.models){
    const geometry=await geometryFor(entry.model);
    models.push(Object.freeze({
      modelId:entry.model,
      x:entry.x,
      y:entry.y,
      uvlock:entry.uvlock,
      weight:entry.weight,
      model:applyMinecraftModelInstanceTransform(geometry,entry)
    }));
  }
  return Object.freeze({models:Object.freeze(models),totalWeight:alternatives.totalWeight});
}

export async function compileMinecraftModelRuntime({
  registry=MINECRAFT_MODEL_BLOCK_REGISTRY,
  loadBlockstate,
  loadModel
}={}){
  if(typeof loadBlockstate!=='function')throw new TypeError('loadBlockstate must be a function');
  if(typeof loadModel!=='function')throw new TypeError('loadModel must be a function');

  const descriptors=normalizeRegistry(registry);
  const rawBlockstateCache=new Map();
  const rawModelCache=new Map();
  const geometryCache=new Map();

  const cachedBlockstate=async id=>{
    const normalized=normalizeMinecraftResourceId(id);
    if(!rawBlockstateCache.has(normalized))rawBlockstateCache.set(normalized,Promise.resolve(loadBlockstate(normalized)));
    const value=await rawBlockstateCache.get(normalized);
    if(value===null||value===undefined)throw new Error(`missing Minecraft blockstate: ${normalized}`);
    return value;
  };
  const cachedModel=async id=>{
    const normalized=normalizeMinecraftResourceId(id);
    if(!rawModelCache.has(normalized))rawModelCache.set(normalized,Promise.resolve(loadModel(normalized)));
    const value=await rawModelCache.get(normalized);
    if(value===null||value===undefined)throw new Error(`missing Minecraft model: ${normalized}`);
    return value;
  };
  const geometryFor=async id=>{
    const normalized=normalizeMinecraftResourceId(id);
    if(!geometryCache.has(normalized))geometryCache.set(normalized,(async()=>{
      const resolved=await resolveMinecraftBlockModel(normalized,{loadModel:cachedModel});
      return compileMinecraftBlockModelGeometry(resolved);
    })());
    return geometryCache.get(normalized);
  };

  const blocks=Object.create(null);
  for(const descriptor of descriptors){
    const resolvedState=resolveMinecraftBlockstate(await cachedBlockstate(descriptor.blockstate),descriptor.state);
    const parts=[];
    if(resolvedState.variant){
      parts.push(runtimePart('variant',0,await compileAlternativeSet(resolvedState.variant.alternatives,geometryFor)));
    }
    for(const multipart of resolvedState.multipart){
      parts.push(runtimePart('multipart',multipart.index,await compileAlternativeSet(multipart.alternatives,geometryFor)));
    }
    if(parts.length===0)throw new Error(`Minecraft model registry block ${descriptor.blockId} resolved to no renderable model parts`);
    blocks[descriptor.blockId]=Object.freeze({
      blockId:descriptor.blockId,
      blockstate:descriptor.blockstate,
      state:resolvedState.state,
      renderLayer:descriptor.renderLayer,
      textureLayers:descriptor.textureLayers,
      parts:Object.freeze(parts)
    });
  }

  return Object.freeze({
    format:MINECRAFT_MODEL_RUNTIME_VERSION,
    minecraftVersion:'1.20.1',
    blocks:Object.freeze(blocks),
    blockIds:Object.freeze(Object.keys(blocks).map(Number).sort((a,b)=>a-b))
  });
}

function resourceJsonUrl(resourceId,kind,assetRootUrl){
  const normalized=normalizeMinecraftResourceId(resourceId);
  const separator=normalized.indexOf(':'),namespace=normalized.slice(0,separator),path=normalized.slice(separator+1);
  if(kind!=='blockstates'&&kind!=='models')throw new TypeError(`unsupported Minecraft JSON resource kind: ${kind}`);
  return new URL(`${namespace}/${kind}/${path}.json`,assetRootUrl).href;
}

async function fetchJson(url,fetchImpl,label){
  const response=await fetchImpl(url);
  if(!response||typeof response!=='object')throw new TypeError(`${label} fetch must return a response object`);
  if(response.ok!==true)throw new Error(`failed to load ${label}: HTTP ${response.status??'unknown'} (${url})`);
  if(typeof response.json!=='function')throw new TypeError(`${label} response must expose json()`);
  return response.json();
}

export async function loadMinecraftModelRuntime({
  registry=MINECRAFT_MODEL_BLOCK_REGISTRY,
  assetRootUrl=new URL('../assets/',import.meta.url),
  fetchImpl=globalThis.fetch
}={}){
  if(typeof fetchImpl!=='function')throw new TypeError('fetchImpl must be a function');
  const root=assetRootUrl instanceof URL?assetRootUrl:new URL(String(assetRootUrl),import.meta.url);
  const blockstates=new Map(),models=new Map();
  const loadResource=(cache,kind,id)=>{
    const normalized=normalizeMinecraftResourceId(id);
    if(!cache.has(normalized)){
      const url=resourceJsonUrl(normalized,kind,root);
      cache.set(normalized,fetchJson(url,fetchImpl,`Minecraft ${kind==='models'?'model':'blockstate'} ${normalized}`));
    }
    return cache.get(normalized);
  };
  return compileMinecraftModelRuntime({
    registry,
    loadBlockstate:id=>loadResource(blockstates,'blockstates',id),
    loadModel:id=>loadResource(models,'models',id)
  });
}

export function assertMinecraftModelRuntime(value){
  object(value,'Minecraft model runtime');
  if(value.format!==MINECRAFT_MODEL_RUNTIME_VERSION)throw new RangeError(`Minecraft model runtime format must be ${MINECRAFT_MODEL_RUNTIME_VERSION}`);
  if(value.minecraftVersion!=='1.20.1')throw new RangeError('Minecraft model runtime must target Java 1.20.1');
  object(value.blocks,'Minecraft model runtime.blocks');
  if(!Array.isArray(value.blockIds))throw new TypeError('Minecraft model runtime.blockIds must be an array');
  const seen=new Set();
  for(const rawId of value.blockIds){
    const id=blockId(rawId,'Minecraft model runtime block id');
    if(seen.has(id))throw new Error(`duplicate Minecraft model runtime block id: ${id}`);
    seen.add(id);
    const template=object(value.blocks[id],`Minecraft model runtime block ${id}`);
    if(template.blockId!==id)throw new RangeError(`Minecraft model runtime block ${id} identity mismatch`);
    renderLayer(template.renderLayer,`Minecraft model runtime block ${id}.renderLayer`);
    object(template.textureLayers??{},`Minecraft model runtime block ${id}.textureLayers`);
    if(!Array.isArray(template.parts)||template.parts.length===0)throw new TypeError(`Minecraft model runtime block ${id}.parts must be a non-empty array`);
    for(const [partIndex,part] of template.parts.entries()){
      object(part,`Minecraft model runtime block ${id}.parts[${partIndex}]`);
      const alternatives=object(part.alternatives,`Minecraft model runtime block ${id}.parts[${partIndex}].alternatives`);
      if(!Array.isArray(alternatives.models)||alternatives.models.length===0||!Number.isSafeInteger(alternatives.totalWeight)||alternatives.totalWeight<=0){
        throw new TypeError(`Minecraft model runtime block ${id}.parts[${partIndex}] has invalid alternatives`);
      }
      for(const alternative of alternatives.models){
        object(alternative,`Minecraft model runtime block ${id}.parts[${partIndex}] alternative`);
        if(!Number.isSafeInteger(alternative.weight)||alternative.weight<=0)throw new TypeError('Minecraft model runtime alternative weight must be positive');
        if(!alternative.model||!Array.isArray(alternative.model.faces))throw new TypeError('Minecraft model runtime alternative must contain compiled model faces');
      }
    }
  }
  if(Object.keys(value.blocks).length!==seen.size)throw new RangeError('Minecraft model runtime blocks must exactly match blockIds');
  return value;
}

function mix32(hash,value){
  hash^=Number(value)>>>0;
  hash=Math.imul(hash,0x01000193)>>>0;
  hash^=hash>>>16;
  return hash>>>0;
}

export function minecraftModelSelectionHash(x,y,z,blockIdValue,partIndex=0){
  for(const [value,label] of [[x,'x'],[y,'y'],[z,'z'],[partIndex,'partIndex']])if(!Number.isInteger(value))throw new TypeError(`Minecraft model selection ${label} must be an integer`);
  const id=blockId(blockIdValue,'Minecraft model selection block id');
  let hash=0x811c9dc5;
  hash=mix32(hash,x);hash=mix32(hash,y);hash=mix32(hash,z);hash=mix32(hash,id);hash=mix32(hash,partIndex);
  return hash>>>0;
}

export function minecraftModelTemplate(value,blockIdValue){
  const runtime=assertMinecraftModelRuntime(value),id=blockId(blockIdValue);
  return runtime.blocks[id]||null;
}

export function instantiateMinecraftModelTemplate(template,x,y,z,{selectionX=x,selectionY=y,selectionZ=z}={}){
  object(template,'Minecraft model template');
  const id=blockId(template.blockId,'Minecraft model template.blockId');
  if(!Array.isArray(template.parts)||template.parts.length===0)throw new TypeError('Minecraft model template.parts must be a non-empty array');
  for(const [value,label] of [[x,'x'],[y,'y'],[z,'z'],[selectionX,'selectionX'],[selectionY,'selectionY'],[selectionZ,'selectionZ']]){
    if(!Number.isInteger(value))throw new TypeError(`Minecraft model instance ${label} must be an integer`);
  }
  const instances=[];
  template.parts.forEach((part,partIndex)=>{
    const selection=minecraftModelSelectionHash(selectionX,selectionY,selectionZ,id,partIndex);
    const selected=selectMinecraftWeightedModel(part.alternatives,selection);
    instances.push(Object.freeze({
      x,y,z,
      blockId:id,
      model:selected.model,
      modelId:selected.modelId,
      renderLayer:template.renderLayer,
      textureLayers:template.textureLayers??{}
    }));
  });
  return Object.freeze(instances);
}

export function minecraftModelLayerForTexture(texture,instance){
  const resourceId=normalizeMinecraftResourceId(texture);
  const overrides=instance?.textureLayers;
  if(overrides&&Object.hasOwn(overrides,resourceId))return renderLayer(overrides[resourceId],`texture layer override ${resourceId}`);
  return renderLayer(instance?.renderLayer??'opaque',`Minecraft model ${resourceId} render layer`);
}

// createMinecraftModelTextureBinding invokes layer resolvers as
// (texture, face, instance). Keep the two-argument semantic helper above and
// adapt that callback contract explicitly so face metadata can never be
// mistaken for the model instance again.
export function minecraftModelTextureLayerResolver(texture,_face,instance){
  return minecraftModelLayerForTexture(texture,instance);
}
