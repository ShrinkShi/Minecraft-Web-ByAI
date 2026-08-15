const MODEL_ROTATIONS=new Set([0,90,180,270]);
const EPSILON=1e-9;
const CENTER=Object.freeze([.5,.5,.5]);

const DIRECTION_VECTORS=Object.freeze({
  down:Object.freeze([0,-1,0]),
  up:Object.freeze([0,1,0]),
  north:Object.freeze([0,0,-1]),
  south:Object.freeze([0,0,1]),
  west:Object.freeze([-1,0,0]),
  east:Object.freeze([1,0,0])
});

const CANONICAL_FACE_VERTICES=Object.freeze({
  east:Object.freeze([[1,0,0],[1,1,0],[1,1,1],[1,0,1]].map(Object.freeze)),
  west:Object.freeze([[0,0,1],[0,1,1],[0,1,0],[0,0,0]].map(Object.freeze)),
  up:Object.freeze([[0,1,1],[1,1,1],[1,1,0],[0,1,0]].map(Object.freeze)),
  down:Object.freeze([[0,0,0],[1,0,0],[1,0,1],[0,0,1]].map(Object.freeze)),
  south:Object.freeze([[1,0,1],[1,1,1],[0,1,1],[0,0,1]].map(Object.freeze)),
  north:Object.freeze([[0,0,0],[0,1,0],[1,1,0],[1,0,0]].map(Object.freeze))
});

function freezeVec(value){return Object.freeze(value.map(number=>Math.abs(number)<EPSILON?0:number));}
function freezeVertices(value){return Object.freeze(value.map(vertex=>freezeVec(vertex)));}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function modelRotation(value,label){if(value===undefined)return 0;if(!Number.isInteger(value)||!MODEL_ROTATIONS.has(value))throw new RangeError(`${label} must be 0, 90, 180, or 270`);return value;}
function boolean(value,label){if(typeof value!=='boolean')throw new TypeError(`${label} must be a boolean`);return value;}

function rotateX(vector,radians){
  const [x,y,z]=vector,c=Math.cos(radians),s=Math.sin(radians);
  return[x,y*c-z*s,y*s+z*c];
}
function rotateY(vector,radians){
  const [x,y,z]=vector,c=Math.cos(radians),s=Math.sin(radians);
  return[x*c+z*s,y,-x*s+z*c];
}

function rotateVectorForModel(vector,x,y){
  // Minecraft blockstate x/y values rotate the baked model in the opposite
  // mathematical sign around positive axes. Apply X first, then Y.
  let result=rotateX(vector,-x*Math.PI/180);
  result=rotateY(result,-y*Math.PI/180);
  return result;
}

function rotatePointForModel(point,x,y){
  const local=[point[0]-CENTER[0],point[1]-CENTER[1],point[2]-CENTER[2]];
  const rotated=rotateVectorForModel(local,x,y);
  return[rotated[0]+CENTER[0],rotated[1]+CENTER[1],rotated[2]+CENTER[2]];
}

function normalized(vector,label){
  const length=Math.hypot(...vector);
  if(length<EPSILON)throw new RangeError(`${label} must not be zero-length`);
  return vector.map(value=>value/length);
}

function directionFromVector(vector,label='direction vector'){
  const unit=normalized(vector,label);
  let best=null,bestDot=-Infinity;
  for(const [direction,axis] of Object.entries(DIRECTION_VECTORS)){
    const dot=unit[0]*axis[0]+unit[1]*axis[1]+unit[2]*axis[2];
    if(dot>bestDot){best=direction;bestDot=dot;}
  }
  if(bestDot<1-EPSILON)throw new RangeError(`${label} does not resolve to a cardinal direction`);
  return best;
}

export function transformMinecraftModelDirection(direction,{x=0,y=0}={}){
  const vector=DIRECTION_VECTORS[direction];
  if(!vector)throw new TypeError(`unknown Minecraft model direction: ${direction}`);
  x=modelRotation(x,'model x rotation');y=modelRotation(y,'model y rotation');
  return directionFromVector(rotateVectorForModel(vector,x,y),`rotated ${direction}`);
}

function samePoint(a,b){return a.every((value,index)=>Math.abs(value-b[index])<=EPSILON);}

function uvRoleMap(direction,x,y){
  const targetDirection=transformMinecraftModelDirection(direction,{x,y});
  const target=CANONICAL_FACE_VERTICES[targetDirection];
  return CANONICAL_FACE_VERTICES[direction].map(source=>{
    const transformed=rotatePointForModel(source,x,y).map(value=>Math.round(value));
    const index=target.findIndex(candidate=>samePoint(transformed,candidate));
    if(index===-1)throw new Error(`cannot map UV role for ${direction} after x=${x}, y=${y}`);
    return index;
  });
}

function baseUvCorners(uv){
  if(!Array.isArray(uv)||uv.length!==4)throw new TypeError('face uv must contain exactly four numbers');
  const [u0,v0,u1,v1]=uv.map((value,index)=>finite(value,`face uv[${index}]`));
  return[[u0,v1],[u0,v0],[u1,v0],[u1,v1]];
}

export function minecraftFaceUvCorners(uv,rotation=0){
  rotation=modelRotation(rotation,'face uv rotation');
  const base=baseUvCorners(uv),quarter=rotation/90;
  return Object.freeze(base.map((_,index)=>freezeVec(base[(index-quarter+4)%4])));
}

function transformedUvCorners(face,x,y,uvlock){
  const authored=minecraftFaceUvCorners(face.uv,face.rotation??0);
  if(!uvlock)return authored;
  const roles=uvRoleMap(face.direction,x,y);
  return Object.freeze(roles.map(role=>authored[role]));
}

function boundsForFaces(faces){
  if(!faces.length)return null;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const face of faces)for(const vertex of face.vertices)for(let axis=0;axis<3;axis++){
    min[axis]=Math.min(min[axis],vertex[axis]);max[axis]=Math.max(max[axis],vertex[axis]);
  }
  return Object.freeze({min:freezeVec(min),max:freezeVec(max)});
}

function transformFace(face,x,y,uvlock){
  if(!face||typeof face!=='object'||!DIRECTION_VECTORS[face.direction])throw new TypeError('compiled face must have a Minecraft direction');
  if(!Array.isArray(face.vertices)||face.vertices.length!==4)throw new TypeError(`compiled ${face.direction} face must contain four vertices`);
  const vertices=freezeVertices(face.vertices.map((vertex,index)=>{
    if(!Array.isArray(vertex)||vertex.length!==3)throw new TypeError(`compiled ${face.direction} vertex ${index} must contain three numbers`);
    return rotatePointForModel(vertex.map((value,axis)=>finite(value,`compiled ${face.direction} vertex ${index}[${axis}]`)),x,y);
  }));
  const normal=freezeVec(normalized(rotateVectorForModel(face.normal,x,y),`compiled ${face.direction} normal`));
  const direction=transformMinecraftModelDirection(face.direction,{x,y});
  const cullface=face.cullface===null||face.cullface===undefined?null:transformMinecraftModelDirection(face.cullface,{x,y});
  return Object.freeze({
    ...face,
    sourceDirection:face.direction,
    direction,
    vertices,
    normal,
    sourceCullface:face.cullface??null,
    cullface,
    uvCorners:transformedUvCorners(face,x,y,uvlock),
    uvlock
  });
}

export function applyMinecraftModelInstanceTransform(geometry,modelEntry={}){
  if(!geometry||typeof geometry!=='object'||!Array.isArray(geometry.elements)||!Array.isArray(geometry.faces))throw new TypeError('geometry must be compiled Minecraft model geometry');
  const x=modelRotation(modelEntry.x,'model x rotation'),y=modelRotation(modelEntry.y,'model y rotation');
  const uvlock=modelEntry.uvlock===undefined?false:boolean(modelEntry.uvlock,'model uvlock');
  const elements=[];
  const faces=[];
  for(const element of geometry.elements){
    if(!element||!Array.isArray(element.faces))throw new TypeError('compiled geometry element must contain faces');
    const transformedFaces=Object.freeze(element.faces.map(face=>{
      const transformed=transformFace(face,x,y,uvlock);faces.push(transformed);return transformed;
    }));
    elements.push(Object.freeze({...element,faces:transformedFaces,bounds:boundsForFaces(transformedFaces)}));
  }
  return Object.freeze({
    modelId:geometry.modelId??modelEntry.model??null,
    x,y,uvlock,
    ambientOcclusion:geometry.ambientOcclusion!==false,
    elements:Object.freeze(elements),
    faces:Object.freeze(faces),
    bounds:boundsForFaces(faces)
  });
}
