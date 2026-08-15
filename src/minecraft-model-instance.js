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

function freezeVec(value){return Object.freeze(value.map(number=>Math.abs(number)<EPSILON?0:number));}
function freezeVertices(value){return Object.freeze(value.map(vertex=>freezeVec(vertex)));}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function modelRotation(value,label){if(value===undefined)return 0;if(!Number.isInteger(value)||!MODEL_ROTATIONS.has(value))throw new RangeError(`${label} must be 0, 90, 180, or 270`);return value;}
function boolean(value,label){if(typeof value!=='boolean')throw new TypeError(`${label} must be a boolean`);return value;}
function vec3(value,label){if(!Array.isArray(value)||value.length!==3)throw new TypeError(`${label} must contain exactly three numbers`);return value.map((entry,index)=>finite(entry,`${label}[${index}]`));}

function rotateX(vector,radians){
  const [x,y,z]=vector,c=Math.cos(radians),s=Math.sin(radians);
  return[x,y*c-z*s,y*s+z*c];
}
function rotateY(vector,radians){
  const [x,y,z]=vector,c=Math.cos(radians),s=Math.sin(radians);
  return[x*c+z*s,y,-x*s+z*c];
}

function rotateVectorForModel(vector,x,y){
  // Blockstate model rotations use clockwise-positive quarter turns in the
  // Minecraft model coordinate convention. With the right-handed vector
  // helpers used here that is the negative mathematical angle. Apply X,
  // then Y, matching the model-state transform composition.
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

function faceVertices(from,to,direction){
  const [x0,y0,z0]=from,[x1,y1,z1]=to;
  switch(direction){
    case'east':return[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]];
    case'west':return[[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]];
    case'up':return[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]];
    case'down':return[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]];
    case'south':return[[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1]];
    case'north':return[[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]];
    default:throw new TypeError(`unknown Minecraft model direction: ${direction}`);
  }
}

function projectFacePoint(vertex,direction){
  const [x,y,z]=vertex;
  switch(direction){
    case'down':return[x,1-z];
    case'up':return[x,z];
    case'north':return[1-x,1-y];
    case'south':return[x,1-y];
    case'west':return[z,1-y];
    case'east':return[1-z,1-y];
    default:throw new TypeError(`unknown Minecraft model direction: ${direction}`);
  }
}

function faceProjectionRoles(vertices,direction){
  const projected=vertices.map(vertex=>projectFacePoint(vertex,direction));
  const us=projected.map(value=>value[0]),vs=projected.map(value=>value[1]);
  const minU=Math.min(...us),maxU=Math.max(...us),minV=Math.min(...vs),maxV=Math.max(...vs);
  const width=maxU-minU,height=maxV-minV;
  if(width<EPSILON||height<EPSILON)throw new RangeError(`cannot derive UV roles for degenerate ${direction} face`);
  return projected.map(([u,v])=>[(u-minU)/width,(v-minV)/height]);
}

function rotateUvRoleClockwise(role,rotation){
  const [u,v]=role;
  switch(rotation){
    case 0:return[u,v];
    case 90:return[v,1-u];
    case 180:return[1-u,1-v];
    case 270:return[1-v,u];
    default:throw new RangeError('face uv rotation must be 0, 90, 180, or 270');
  }
}

function uvFromRole(uv,role,rotation){
  if(!Array.isArray(uv)||uv.length!==4)throw new TypeError('face uv must contain exactly four numbers');
  const [u0,v0,u1,v1]=uv.map((value,index)=>finite(value,`face uv[${index}]`));
  const [ru,rv]=rotateUvRoleClockwise(role,rotation);
  return freezeVec([u0+(u1-u0)*ru,v0+(v1-v0)*rv]);
}

export function minecraftFaceUvCorners(uv,rotation=0,{vertices,direction}={}){
  rotation=modelRotation(rotation,'face uv rotation');
  if(!Array.isArray(vertices)||vertices.length!==4||!DIRECTION_VECTORS[direction])throw new TypeError('face UV corner projection requires four vertices and a Minecraft direction');
  const roles=faceProjectionRoles(vertices,direction);
  return Object.freeze(roles.map(role=>uvFromRole(uv,role,rotation)));
}

function transformedUvCorners(face,sourceVertices,x,y,uvlock){
  const rotation=modelRotation(face.rotation??0,'face uv rotation');
  if(!uvlock)return minecraftFaceUvCorners(face.uv,rotation,{vertices:sourceVertices,direction:face.direction});
  const targetDirection=transformMinecraftModelDirection(face.direction,{x,y});
  const targetVertices=sourceVertices.map(vertex=>rotatePointForModel(vertex,x,y));
  return minecraftFaceUvCorners(face.uv,rotation,{vertices:targetVertices,direction:targetDirection});
}

function boundsForFaces(faces){
  if(!faces.length)return null;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const face of faces)for(const vertex of face.vertices)for(let axis=0;axis<3;axis++){
    min[axis]=Math.min(min[axis],vertex[axis]);max[axis]=Math.max(max[axis],vertex[axis]);
  }
  return Object.freeze({min:freezeVec(min),max:freezeVec(max)});
}

function transformFace(face,element,x,y,uvlock){
  if(!face||typeof face!=='object'||!DIRECTION_VECTORS[face.direction])throw new TypeError('compiled face must have a Minecraft direction');
  if(!Array.isArray(face.vertices)||face.vertices.length!==4)throw new TypeError(`compiled ${face.direction} face must contain four vertices`);
  const sourceFrom=vec3(element.from,'compiled element from'),sourceTo=vec3(element.to,'compiled element to');
  const sourceVertices=faceVertices(sourceFrom,sourceTo,face.direction);
  const vertices=freezeVertices(face.vertices.map((vertex,index)=>{
    if(!Array.isArray(vertex)||vertex.length!==3)throw new TypeError(`compiled ${face.direction} vertex ${index} must contain three numbers`);
    return rotatePointForModel(vertex.map((value,axis)=>finite(value,`compiled ${face.direction} vertex ${index}[${axis}]`)),x,y);
  }));
  if(!Array.isArray(face.normal)||face.normal.length!==3)throw new TypeError(`compiled ${face.direction} face must contain a normal`);
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
    uvCorners:transformedUvCorners(face,sourceVertices,x,y,uvlock),
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
      const transformed=transformFace(face,element,x,y,uvlock);faces.push(transformed);return transformed;
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
