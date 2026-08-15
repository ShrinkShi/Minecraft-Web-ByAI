const MODEL_UV_SIZE=16;
const RENDER_LAYERS=Object.freeze(['opaque','cutout','translucent']);
const RENDER_LAYER_SET=new Set(RENDER_LAYERS);
const EPSILON=1e-9;

function finite(value,label){
  if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);
  return value;
}

function coordinate(value,label){
  if(!Number.isInteger(value))throw new TypeError(`${label} must be an integer block coordinate`);
  return value;
}

function normalizeRegion(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  const u0=finite(value.u0,`${label}.u0`),v0=finite(value.v0,`${label}.v0`),u1=finite(value.u1,`${label}.u1`),v1=finite(value.v1,`${label}.v1`);
  if(u0<0||v0<0||u1>1||v1>1||u1-u0<=EPSILON||v1-v0<=EPSILON)throw new RangeError(`${label} must be a non-empty normalized atlas rectangle`);
  return Object.freeze({u0,v0,u1,v1});
}

function normalizeBinding(value,texture){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`texture binding for ${texture} must be an object`);
  if(!RENDER_LAYER_SET.has(value.layer))throw new TypeError(`texture binding for ${texture} has unsupported render layer: ${value.layer}`);
  return Object.freeze({layer:value.layer,region:normalizeRegion(value.region,`texture binding for ${texture}.region`)});
}

function normalizeColor(value,label){
  if(value===undefined||value===null)return Object.freeze([1,1,1]);
  if(!Array.isArray(value)||value.length!==3)throw new TypeError(`${label} must contain exactly three color components`);
  const normalized=value.map((component,index)=>finite(component,`${label}[${index}]`));
  if(normalized.some(component=>component<0||component>1))throw new RangeError(`${label} components must be within 0..1`);
  return Object.freeze(normalized);
}

function mapUvCorner(corner,region,label){
  if(!Array.isArray(corner)||corner.length!==2)throw new TypeError(`${label} must contain two numbers`);
  const u=finite(corner[0],`${label}[0]`),v=finite(corner[1],`${label}[1]`);
  if(u<-EPSILON||u>MODEL_UV_SIZE+EPSILON||v<-EPSILON||v>MODEL_UV_SIZE+EPSILON){
    throw new RangeError(`${label} is outside the current 0..16 model-atlas contract`);
  }
  const nu=Math.max(0,Math.min(1,u/MODEL_UV_SIZE));
  const nv=Math.max(0,Math.min(1,v/MODEL_UV_SIZE));
  return[
    region.u0+(region.u1-region.u0)*nu,
    region.v1-(region.v1-region.v0)*nv
  ];
}

function createMutableBatch(){
  return{positions:[],normals:[],uvs:[],colors:[],indices:[],faceCount:0};
}

function finalizeBatch(batch){
  return Object.freeze({
    positions:new Float32Array(batch.positions),
    normals:new Float32Array(batch.normals),
    uvs:new Float32Array(batch.uvs),
    colors:new Float32Array(batch.colors),
    indices:new Uint32Array(batch.indices),
    faceCount:batch.faceCount,
    vertexCount:batch.positions.length/3
  });
}

function appendFace(batch,instance,face,binding,color){
  if(!Array.isArray(face.vertices)||face.vertices.length!==4)throw new TypeError(`model face ${face.direction} must contain four vertices`);
  if(!Array.isArray(face.normal)||face.normal.length!==3)throw new TypeError(`model face ${face.direction} must contain a normal`);
  if(!Array.isArray(face.uvCorners)||face.uvCorners.length!==4)throw new TypeError(`model face ${face.direction} must contain four final uvCorners`);
  const base=batch.positions.length/3;
  for(let i=0;i<4;i++){
    const vertex=face.vertices[i];
    if(!Array.isArray(vertex)||vertex.length!==3)throw new TypeError(`model face ${face.direction} vertex ${i} must contain three numbers`);
    batch.positions.push(
      finite(vertex[0],`model face ${face.direction} vertex ${i}[0]`)+instance.x,
      finite(vertex[1],`model face ${face.direction} vertex ${i}[1]`)+instance.y,
      finite(vertex[2],`model face ${face.direction} vertex ${i}[2]`)+instance.z
    );
    batch.normals.push(
      finite(face.normal[0],`model face ${face.direction} normal[0]`),
      finite(face.normal[1],`model face ${face.direction} normal[1]`),
      finite(face.normal[2],`model face ${face.direction} normal[2]`)
    );
    const uv=mapUvCorner(face.uvCorners[i],binding.region,`model face ${face.direction} uvCorners[${i}]`);
    batch.uvs.push(uv[0],uv[1]);
    batch.colors.push(color[0],color[1],color[2]);
  }
  batch.indices.push(base,base+1,base+2,base,base+2,base+3);
  batch.faceCount++;
}

function normalizeInstance(value,index){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`model instance ${index} must be an object`);
  const model=value.model;
  if(!model||typeof model!=='object'||!Array.isArray(model.faces))throw new TypeError(`model instance ${index}.model must contain final compiled faces`);
  return Object.freeze({
    ...value,
    x:coordinate(value.x,`model instance ${index}.x`),
    y:coordinate(value.y,`model instance ${index}.y`),
    z:coordinate(value.z,`model instance ${index}.z`),
    model
  });
}

export function buildMinecraftModelMeshBatches(instances,{textureBinding,resolveTint,isCullFaceVisible}={}){
  if(!Array.isArray(instances))throw new TypeError('model instances must be an array');
  if(typeof textureBinding!=='function')throw new TypeError('textureBinding must be a function');
  if(resolveTint!==undefined&&typeof resolveTint!=='function')throw new TypeError('resolveTint must be a function');
  if(isCullFaceVisible!==undefined&&typeof isCullFaceVisible!=='function')throw new TypeError('isCullFaceVisible must be a function');
  const mutable=Object.fromEntries(RENDER_LAYERS.map(layer=>[layer,createMutableBatch()]));
  for(let index=0;index<instances.length;index++){
    const instance=normalizeInstance(instances[index],index);
    for(const face of instance.model.faces){
      if(!face||typeof face!=='object'||typeof face.texture!=='string'||!face.texture)throw new TypeError(`model instance ${index} contains an invalid face`);
      if(face.cullface!==null&&face.cullface!==undefined&&isCullFaceVisible){
        const visible=isCullFaceVisible(Object.freeze({instance,face,x:instance.x,y:instance.y,z:instance.z,direction:face.cullface}));
        if(typeof visible!=='boolean')throw new TypeError('isCullFaceVisible must return a boolean');
        if(!visible)continue;
      }
      const binding=normalizeBinding(textureBinding(face.texture,face,instance),face.texture);
      const color=normalizeColor(resolveTint?resolveTint(face,instance):null,`tint for ${face.texture}`);
      appendFace(mutable[binding.layer],instance,face,binding,color);
    }
  }
  return Object.freeze(Object.fromEntries(RENDER_LAYERS.map(layer=>[layer,finalizeBatch(mutable[layer])])));
}

export function minecraftModelBatchTransferables(batches){
  if(!batches||typeof batches!=='object')throw new TypeError('batches must be a Minecraft model mesh batch set');
  const transfer=[];
  for(const layer of RENDER_LAYERS){
    const batch=batches[layer];
    if(!batch)throw new TypeError(`missing Minecraft model mesh batch: ${layer}`);
    for(const key of ['positions','normals','uvs','colors','indices']){
      if(!ArrayBuffer.isView(batch[key]))throw new TypeError(`Minecraft model mesh batch ${layer}.${key} must be a typed array`);
      transfer.push(batch[key].buffer);
    }
  }
  return transfer;
}

export const MINECRAFT_MODEL_RENDER_LAYERS=RENDER_LAYERS;
