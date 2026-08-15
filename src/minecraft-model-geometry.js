const FACE_DIRECTIONS=Object.freeze(['down','up','north','south','west','east']);
const FACE_SET=new Set(FACE_DIRECTIONS);
const MODEL_UNIT=16;
const EPSILON=1e-10;

function finite(value,label){
  if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);
  return value;
}

function vec3(value,label){
  if(!Array.isArray(value)||value.length!==3)throw new TypeError(`${label} must contain exactly three numbers`);
  return value.map((entry,index)=>finite(entry,`${label}[${index}]`));
}

function vec4(value,label){
  if(!Array.isArray(value)||value.length!==4)throw new TypeError(`${label} must contain exactly four numbers`);
  return value.map((entry,index)=>finite(entry,`${label}[${index}]`));
}

function freezeVec(value){return Object.freeze(value.map(number=>Object.is(number,-0)?0:number));}
function freezeVertices(vertices){return Object.freeze(vertices.map(vertex=>freezeVec(vertex)));}

export function defaultMinecraftFaceUv(fromValue,toValue,direction){
  const from=vec3(fromValue,'element from'),to=vec3(toValue,'element to');
  if(!FACE_SET.has(direction))throw new TypeError(`unknown Minecraft model face direction: ${direction}`);
  const [fx,fy,fz]=from,[tx,ty,tz]=to;
  let uv;
  switch(direction){
    case'down':uv=[fx,MODEL_UNIT-tz,tx,MODEL_UNIT-fz];break;
    case'up':uv=[fx,fz,tx,tz];break;
    case'north':uv=[MODEL_UNIT-tx,MODEL_UNIT-ty,MODEL_UNIT-fx,MODEL_UNIT-fy];break;
    case'south':uv=[fx,MODEL_UNIT-ty,tx,MODEL_UNIT-fy];break;
    case'west':uv=[fz,MODEL_UNIT-ty,tz,MODEL_UNIT-fy];break;
    case'east':uv=[MODEL_UNIT-tz,MODEL_UNIT-ty,MODEL_UNIT-fz,MODEL_UNIT-fy];break;
  }
  return freezeVec(uv);
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
    default:throw new TypeError(`unknown Minecraft model face direction: ${direction}`);
  }
}

function rotateVector(vector,axis,radians){
  const [x,y,z]=vector,c=Math.cos(radians),s=Math.sin(radians);
  if(axis==='x')return[x,y*c-z*s,y*s+z*c];
  if(axis==='y')return[x*c+z*s,y,-x*s+z*c];
  if(axis==='z')return[x*c-y*s,x*s+y*c,z];
  throw new TypeError(`unknown Minecraft element rotation axis: ${axis}`);
}

function rescaleVector(axis,angle){
  const scale=Math.abs(angle)<EPSILON?1:1/Math.cos(Math.abs(angle)*Math.PI/180);
  if(axis==='x')return[1,scale,scale];
  if(axis==='y')return[scale,1,scale];
  if(axis==='z')return[scale,scale,1];
  throw new TypeError(`unknown Minecraft element rotation axis: ${axis}`);
}

function transformElementVertex(vertex,rotation){
  if(!rotation)return vertex;
  const origin=vec3(rotation.origin,'element rotation origin');
  const angle=finite(rotation.angle,'element rotation angle');
  const axis=rotation.axis;
  const local=[vertex[0]-origin[0],vertex[1]-origin[1],vertex[2]-origin[2]];
  let transformed=local;
  if(rotation.rescale){
    const scale=rescaleVector(axis,angle);
    transformed=[local[0]*scale[0],local[1]*scale[1],local[2]*scale[2]];
  }
  transformed=rotateVector(transformed,axis,angle*Math.PI/180);
  return[transformed[0]+origin[0],transformed[1]+origin[1],transformed[2]+origin[2]];
}

function subtract(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function normalizedFaceNormal(vertices,label){
  const a=subtract(vertices[1],vertices[0]),b=subtract(vertices[2],vertices[0]),normal=cross(a,b);
  const length=Math.hypot(...normal);
  if(length<EPSILON)throw new RangeError(`${label} has degenerate geometry`);
  return freezeVec(normal.map(value=>value/length));
}

function normalizedLocalVertex(vertex){return freezeVec(vertex.map(value=>value/MODEL_UNIT));}

function compileFace(element,face,direction,elementIndex){
  const from=vec3(element.from,`element ${elementIndex}.from`),to=vec3(element.to,`element ${elementIndex}.to`);
  const modelVertices=faceVertices(from,to,direction).map(vertex=>transformElementVertex(vertex,element.rotation));
  const vertices=modelVertices.map(normalizedLocalVertex);
  const uv=face.uv===null||face.uv===undefined?defaultMinecraftFaceUv(from,to,direction):freezeVec(vec4(face.uv,`element ${elementIndex}.faces.${direction}.uv`));
  return Object.freeze({
    direction,
    texture:face.texture,
    textureReference:face.textureReference??null,
    vertices:freezeVertices(vertices),
    normal:normalizedFaceNormal(vertices,`element ${elementIndex}.faces.${direction}`),
    uv,
    uvSource:face.uv===null||face.uv===undefined?'derived':'explicit',
    rotation:face.rotation??0,
    cullface:face.cullface??null,
    tintIndex:face.tintIndex??null,
    shade:element.shade!==false
  });
}

function boundsForFaces(faces){
  if(!faces.length)return null;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const face of faces)for(const vertex of face.vertices)for(let axis=0;axis<3;axis++){
    min[axis]=Math.min(min[axis],vertex[axis]);max[axis]=Math.max(max[axis],vertex[axis]);
  }
  return Object.freeze({min:freezeVec(min),max:freezeVec(max)});
}

export function compileMinecraftBlockModelGeometry(model){
  if(!model||typeof model!=='object'||!Array.isArray(model.elements))throw new TypeError('model must be a resolved Minecraft block model');
  const elements=[];
  const faces=[];
  model.elements.forEach((element,elementIndex)=>{
    if(!element||typeof element!=='object'||!element.faces||typeof element.faces!=='object')throw new TypeError(`model element ${elementIndex} is not normalized`);
    const compiledFaces=[];
    for(const direction of FACE_DIRECTIONS){
      const face=element.faces[direction];if(!face)continue;
      const compiled=compileFace(element,face,direction,elementIndex);compiledFaces.push(compiled);faces.push(compiled);
    }
    elements.push(Object.freeze({
      index:elementIndex,
      from:freezeVec(vec3(element.from,`element ${elementIndex}.from`).map(value=>value/MODEL_UNIT)),
      to:freezeVec(vec3(element.to,`element ${elementIndex}.to`).map(value=>value/MODEL_UNIT)),
      rotation:element.rotation,
      shade:element.shade!==false,
      faces:Object.freeze(compiledFaces),
      bounds:boundsForFaces(compiledFaces)
    }));
  });
  return Object.freeze({
    modelId:model.id??null,
    ambientOcclusion:model.ambientOcclusion!==false,
    elements:Object.freeze(elements),
    faces:Object.freeze(faces),
    bounds:boundsForFaces(faces)
  });
}

export const MINECRAFT_GEOMETRY_FACE_DIRECTIONS=FACE_DIRECTIONS;
