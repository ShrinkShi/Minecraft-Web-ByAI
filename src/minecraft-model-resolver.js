import {normalizeMinecraftResourceId} from './minecraft-resource-id.js';

const DIRECTIONS=Object.freeze(['down','up','north','south','west','east']);
const DIRECTION_SET=new Set(DIRECTIONS);
const FACE_ROTATIONS=new Set([0,90,180,270]);
const ELEMENT_ROTATION_AXES=new Set(['x','y','z']);
const ELEMENT_ROTATION_ANGLES=new Set([-45,-22.5,0,22.5,45]);
const TEXTURE_VARIABLE_RE=/^[a-z0-9_.-]+$/;

function object(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  return value;
}

function boolean(value,label){
  if(typeof value!=='boolean')throw new TypeError(`${label} must be a boolean`);
  return value;
}

function finite(value,label){
  if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);
  return value;
}

function vector(value,length,label){
  if(!Array.isArray(value)||value.length!==length)throw new TypeError(`${label} must contain exactly ${length} numbers`);
  return Object.freeze(value.map((entry,index)=>finite(entry,`${label}[${index}]`)));
}

function textureVariableName(value,label='texture variable'){
  if(typeof value!=='string'||!TEXTURE_VARIABLE_RE.test(value))throw new TypeError(`${label} must match [a-z0-9_.-]+`);
  return value;
}

function normalizeTextureReference(value,label){
  if(typeof value!=='string'||!value)throw new TypeError(`${label} must be a non-empty string`);
  if(value.startsWith('#'))return{kind:'variable',value:textureVariableName(value.slice(1),label)};
  return{kind:'resource',value:normalizeMinecraftResourceId(value)};
}

function normalizeTextureVariables(raw){
  if(raw===undefined)return{};
  object(raw,'model textures');
  const output={};
  for(const [name,value] of Object.entries(raw)){
    textureVariableName(name);
    if(typeof value!=='string'||!value)throw new TypeError(`texture variable ${name} must be a non-empty string`);
    output[name]=value;
  }
  return output;
}

function resolveTextureVariables(raw){
  const resolved={};
  const resolving=[];
  const resolve=name=>{
    textureVariableName(name);
    if(Object.hasOwn(resolved,name))return resolved[name];
    if(!Object.hasOwn(raw,name))throw new Error(`missing Minecraft texture variable: #${name}`);
    const cycleAt=resolving.indexOf(name);
    if(cycleAt!==-1)throw new Error(`Minecraft texture variable cycle: ${[...resolving.slice(cycleAt),name].map(entry=>`#${entry}`).join(' -> ')}`);
    resolving.push(name);
    const reference=normalizeTextureReference(raw[name],`texture variable ${name}`);
    const value=reference.kind==='variable'?resolve(reference.value):reference.value;
    resolving.pop();
    resolved[name]=value;
    return value;
  };
  for(const name of Object.keys(raw))resolve(name);
  return Object.freeze({...resolved});
}

function resolveFaceTexture(reference,textures,label){
  const parsed=normalizeTextureReference(reference,label);
  if(parsed.kind==='resource')return parsed.value;
  if(!Object.hasOwn(textures,parsed.value))throw new Error(`missing Minecraft texture variable: #${parsed.value}`);
  return textures[parsed.value];
}

function normalizeElementRotation(raw,label){
  if(raw===undefined)return null;
  object(raw,label);
  const axis=raw.axis;
  if(!ELEMENT_ROTATION_AXES.has(axis))throw new TypeError(`${label}.axis must be x, y, or z`);
  const angle=finite(raw.angle,`${label}.angle`);
  if(!ELEMENT_ROTATION_ANGLES.has(angle))throw new RangeError(`${label}.angle is not supported by Minecraft block models`);
  const rescale=raw.rescale===undefined?false:boolean(raw.rescale,`${label}.rescale`);
  return Object.freeze({
    origin:vector(raw.origin,3,`${label}.origin`),
    axis,
    angle,
    rescale
  });
}

function normalizeFace(raw,direction,textures,label){
  object(raw,label);
  if(typeof raw.texture!=='string'||!raw.texture)throw new TypeError(`${label}.texture must be a non-empty string`);
  const rotation=raw.rotation===undefined?0:finite(raw.rotation,`${label}.rotation`);
  if(!FACE_ROTATIONS.has(rotation))throw new RangeError(`${label}.rotation must be 0, 90, 180, or 270`);
  let cullface=null;
  if(raw.cullface!==undefined){
    if(!DIRECTION_SET.has(raw.cullface))throw new TypeError(`${label}.cullface must be a cardinal block face`);
    cullface=raw.cullface;
  }
  let tintIndex=null;
  if(raw.tintindex!==undefined){
    if(!Number.isInteger(raw.tintindex)||raw.tintindex<0)throw new TypeError(`${label}.tintindex must be a non-negative integer`);
    tintIndex=raw.tintindex;
  }
  return Object.freeze({
    direction,
    texture:resolveFaceTexture(raw.texture,textures,`${label}.texture`),
    textureReference:raw.texture,
    uv:raw.uv===undefined?null:vector(raw.uv,4,`${label}.uv`),
    cullface,
    rotation,
    tintIndex
  });
}

function normalizeElement(raw,index,textures){
  const label=`model element ${index}`;
  object(raw,label);
  const facesRaw=object(raw.faces,`${label}.faces`);
  const faces={};
  for(const [direction,face] of Object.entries(facesRaw)){
    if(!DIRECTION_SET.has(direction))throw new TypeError(`${label}.faces contains unknown direction: ${direction}`);
    faces[direction]=normalizeFace(face,direction,textures,`${label}.faces.${direction}`);
  }
  if(!Object.keys(faces).length)throw new TypeError(`${label}.faces must contain at least one face`);
  return Object.freeze({
    from:vector(raw.from,3,`${label}.from`),
    to:vector(raw.to,3,`${label}.to`),
    rotation:normalizeElementRotation(raw.rotation,`${label}.rotation`),
    shade:raw.shade===undefined?true:boolean(raw.shade,`${label}.shade`),
    faces:Object.freeze(faces)
  });
}

function own(raw,key){return Object.prototype.hasOwnProperty.call(raw,key);}

async function loadModelLineage(modelId,loadModel){
  if(typeof loadModel!=='function')throw new TypeError('loadModel must be a function');
  const lineage=[];
  const active=[];
  let current=normalizeMinecraftResourceId(modelId);
  while(current){
    const cycleAt=active.indexOf(current);
    if(cycleAt!==-1)throw new Error(`Minecraft model parent cycle: ${[...active.slice(cycleAt),current].join(' -> ')}`);
    active.push(current);
    const raw=await loadModel(current);
    if(raw===null||raw===undefined)throw new Error(`missing Minecraft model: ${current}`);
    object(raw,`Minecraft model ${current}`);
    lineage.push({id:current,raw});
    if(raw.parent===undefined){current=null;continue;}
    if(typeof raw.parent!=='string'||!raw.parent)throw new TypeError(`Minecraft model ${current}.parent must be a non-empty string`);
    current=normalizeMinecraftResourceId(raw.parent);
  }
  return lineage.reverse();
}

export async function resolveMinecraftBlockModel(modelId,{loadModel}={}){
  const requestedId=normalizeMinecraftResourceId(modelId);
  const lineage=await loadModelLineage(requestedId,loadModel);
  let textureVariables={};
  let elementsRaw=[];
  let ambientOcclusion=true;
  let guiLight=null;
  let hasElements=false;

  for(const {id,raw} of lineage){
    textureVariables={...textureVariables,...normalizeTextureVariables(raw.textures)};
    if(own(raw,'elements')){
      if(!Array.isArray(raw.elements))throw new TypeError(`Minecraft model ${id}.elements must be an array`);
      elementsRaw=raw.elements;
      hasElements=true;
    }
    if(own(raw,'ambientocclusion'))ambientOcclusion=boolean(raw.ambientocclusion,`Minecraft model ${id}.ambientocclusion`);
    if(own(raw,'gui_light')){
      if(raw.gui_light!=='front'&&raw.gui_light!=='side')throw new TypeError(`Minecraft model ${id}.gui_light must be front or side`);
      guiLight=raw.gui_light;
    }
  }

  const textures=resolveTextureVariables(textureVariables);
  const elements=Object.freeze((hasElements?elementsRaw:[]).map((element,index)=>normalizeElement(element,index,textures)));
  return Object.freeze({
    id:requestedId,
    parent:lineage.length>1?lineage[lineage.length-2].id:null,
    lineage:Object.freeze(lineage.map(entry=>entry.id)),
    ambientOcclusion,
    guiLight,
    textures,
    elements
  });
}

export const MINECRAFT_MODEL_FACE_DIRECTIONS=DIRECTIONS;
