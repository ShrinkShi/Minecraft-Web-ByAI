import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {requireAssetUrl} from './asset-manifest.js';
import {minecraftCubeUvRects,mobModelSpec} from './mob-model-specs.js';

const PIXEL=1/16;
const FACE_ORDER=['right','left','top','bottom','front','back'];

function ensureResources(resources){
  resources.geometries??=new Set();resources.materials??=new Set();resources.textures??=new Set();resources.textureCache??=new Map();resources.materialCache??=new Map();
  return resources;
}

function entityTexture(resources,assetKey){
  if(resources.textureCache.has(assetKey))return resources.textureCache.get(assetKey);
  const texture=new THREE.TextureLoader().load(requireAssetUrl(assetKey));
  texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;
  resources.textureCache.set(assetKey,texture);resources.textures.add(texture);return texture;
}

function entityMaterial(resources,assetKey){
  if(resources.materialCache.has(assetKey))return resources.materialCache.get(assetKey);
  const material=new THREE.MeshLambertMaterial({map:entityTexture(resources,assetKey),transparent:true,alphaTest:.01});
  resources.materialCache.set(assetKey,material);resources.materials.add(material);return material;
}

function pushFace(positions,uvs,indices,vertices,rect,textureSize){
  const base=positions.length/3;
  for(const vertex of vertices)positions.push(vertex[0]*PIXEL,vertex[1]*PIXEL,vertex[2]*PIXEL);
  const [u0,v0,u1,v1]=rect,[tw,th]=textureSize;
  // TextureLoader flips image Y; convert Minecraft's top-left pixel rectangles
  // into WebGL's bottom-left UV convention.
  const left=u0/tw,right=u1/tw,top=1-v0/th,bottom=1-v1/th;
  uvs.push(left,bottom,left,top,right,top,right,bottom);
  indices.push(base,base+1,base+2,base,base+2,base+3);
}

function cuboidGeometry(box,textureSize){
  const [w,h,d]=box.size,inflate=Number(box.inflate)||0,[ox,oy,oz]=box.offset;
  const x0=ox-inflate,x1=ox+w+inflate,y0=oy-inflate,y1=oy+h+inflate,z0=oz-inflate,z1=oz+d+inflate;
  const rects=minecraftCubeUvRects(box.uv[0],box.uv[1],w,h,d);
  const faces={
    right:[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],
    left:[[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]],
    top:[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],
    bottom:[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],
    front:[[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]],
    back:[[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1]]
  };
  const positions=[],uvs=[],indices=[];
  for(const face of FACE_ORDER)pushFace(positions,uvs,indices,faces[face],rects[face],textureSize);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export function createMobModelTemplate(type,def,rawResources){
  const spec=mobModelSpec(type);if(!spec)throw new Error(`missing mob model spec: ${type}`);
  const resources=ensureResources(rawResources),root=new THREE.Group();root.userData.mobModelType=type;
  const scale=Number(def?.height)>0?def.height/(spec.heightPixels*PIXEL):1;root.scale.setScalar(scale);
  const materials=Object.fromEntries(Object.entries(spec.materials).map(([slot,assetKey])=>[slot,entityMaterial(resources,assetKey)]));
  for(const partSpec of spec.parts){
    const part=new THREE.Group();part.name=`mob:${type}:${partSpec.name}`;part.position.set(...partSpec.pivot.map(value=>value*PIXEL));part.rotation.set(...partSpec.rotation);part.userData.mobWalk=partSpec.walk;part.userData.mobBaseRotation=[...partSpec.rotation];
    for(const boxSpec of partSpec.boxes){
      const geometry=cuboidGeometry(boxSpec,spec.textureSize);resources.geometries.add(geometry);
      const mesh=new THREE.Mesh(geometry,materials[boxSpec.material]);mesh.name=`mob-box:${boxSpec.name}`;part.add(mesh);
    }
    root.add(part);
  }
  return root;
}

export function bindMobVisual(visual){
  const animated=[];visual.traverse(object=>{if(object.userData?.mobWalk)animated.push(object);});
  visual.userData.mobAnimatedParts=animated;visual.userData.mobWalkPhase=Math.random()*Math.PI*2;return visual;
}

export function animateMobVisual(visual,dt,speed=0){
  if(!visual)return;const amount=Math.min(1,Math.max(0,Number(speed)||0));visual.userData.mobWalkPhase=(visual.userData.mobWalkPhase||0)+dt*(4+amount*7);const phase=visual.userData.mobWalkPhase;
  for(const part of visual.userData.mobAnimatedParts||[]){
    const base=part.userData.mobBaseRotation||[0,0,0],walk=part.userData.mobWalk;part.rotation.set(...base);
    const swing=Math.sin(phase)*(0.7*amount);
    if(walk==='leg-left'||walk==='arm-right')part.rotation.x+=swing;
    else if(walk==='leg-right'||walk==='arm-left')part.rotation.x-=swing;
    else if(walk==='wing-left')part.rotation.z+=Math.abs(Math.sin(phase*1.7))*.45*amount;
    else if(walk==='wing-right')part.rotation.z-=Math.abs(Math.sin(phase*1.7))*.45*amount;
    else if(walk==='spider-left')part.rotation.y+=Math.sin(phase)*.18*amount;
    else if(walk==='spider-right')part.rotation.y-=Math.sin(phase)*.18*amount;
  }
}

export function disposeMobModelResources(resources){
  for(const geometry of resources.geometries||[])geometry.dispose();
  for(const material of resources.materials||[])material.dispose();
  for(const texture of resources.textures||[])texture.dispose();
  resources.geometries?.clear();resources.materials?.clear();resources.textures?.clear();resources.textureCache?.clear();resources.materialCache?.clear();
}
