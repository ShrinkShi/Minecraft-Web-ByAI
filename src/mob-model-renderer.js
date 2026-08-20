import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {requireAssetUrl} from './asset-manifest.js';
import {minecraftCubeUvRects,mobModelSpec} from './mob-model-specs.js';

const PIXEL=1/16;
const FACE_ORDER=['right','left','top','bottom','front','back'];

function ensureResources(resources){
  resources.geometries??=new Set();resources.materials??=new Set();resources.textures??=new Set();resources.textureCache??=new Map();resources.materialCache??=new Map();return resources;
}
function entityTexture(resources,assetKey){
  if(resources.textureCache.has(assetKey))return resources.textureCache.get(assetKey);const texture=new THREE.TextureLoader().load(requireAssetUrl(assetKey));texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;resources.textureCache.set(assetKey,texture);resources.textures.add(texture);return texture;
}
function entityMaterial(resources,assetKey){
  if(resources.materialCache.has(assetKey))return resources.materialCache.get(assetKey);const material=new THREE.MeshLambertMaterial({map:entityTexture(resources,assetKey),transparent:true,alphaTest:.01});resources.materialCache.set(assetKey,material);resources.materials.add(material);return material;
}
function itemSpriteMaterial(resources,assetKey){
  const key=`item-sprite:${assetKey}`;if(resources.materialCache.has(key))return resources.materialCache.get(key);const material=new THREE.MeshBasicMaterial({map:entityTexture(resources,assetKey),transparent:true,alphaTest:.03,side:THREE.DoubleSide,toneMapped:false});resources.materialCache.set(key,material);resources.materials.add(material);return material;
}
function pushFace(positions,uvs,indices,vertices,rect,textureSize){
  const base=positions.length/3;for(const vertex of vertices)positions.push(vertex[0]*PIXEL,vertex[1]*PIXEL,vertex[2]*PIXEL);const[u0,v0,u1,v1]=rect,[tw,th]=textureSize,left=u0/tw,right=u1/tw,top=1-v0/th,bottom=1-v1/th;uvs.push(left,bottom,left,top,right,top,right,bottom);indices.push(base,base+1,base+2,base,base+2,base+3);
}
function cuboidGeometry(box,textureSize){
  const[w,h,d]=box.size,inflate=Number(box.inflate)||0,[ox,oy,oz]=box.offset,x0=ox-inflate,x1=ox+w+inflate,y0=oy-inflate,y1=oy+h+inflate,z0=oz-inflate,z1=oz+d+inflate,rects=minecraftCubeUvRects(box.uv[0],box.uv[1],w,h,d);
  const faces={right:[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],left:[[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]],top:[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],bottom:[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],front:[[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]],back:[[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1]]};const positions=[],uvs=[],indices=[];for(const face of FACE_ORDER)pushFace(positions,uvs,indices,faces[face],rects[face],textureSize);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
function attachSkeletonBow(part,resources){
  const geometry=new THREE.PlaneGeometry(.72,.72);resources.geometries.add(geometry);const bow=new THREE.Mesh(geometry,itemSpriteMaterial(resources,'item.bow'));bow.name='mob-equipment:skeleton:bow';bow.position.set(0,-.57,-.09);bow.rotation.set(0,Math.PI,.18);part.add(bow);
}

export function createMobModelTemplate(type,def,rawResources){
  const spec=mobModelSpec(type);if(!spec)throw new Error(`missing mob model spec: ${type}`);const resources=ensureResources(rawResources),root=new THREE.Group(),modelRoot=new THREE.Group();root.userData.mobModelType=type;modelRoot.name=`mob-model:${type}`;const scale=Number(def?.height)>0?def.height/(spec.heightPixels*PIXEL):1;modelRoot.scale.setScalar(scale);root.add(modelRoot);const materials=Object.fromEntries(Object.entries(spec.materials).map(([slot,assetKey])=>[slot,entityMaterial(resources,assetKey)]));
  for(const partSpec of spec.parts){const part=new THREE.Group();part.name=`mob:${type}:${partSpec.name}`;part.position.set(...partSpec.pivot.map(value=>value*PIXEL));part.rotation.set(...partSpec.rotation);part.userData.mobWalk=partSpec.walk;part.userData.mobBaseRotation=[...partSpec.rotation];for(const boxSpec of partSpec.boxes){const geometry=cuboidGeometry(boxSpec,spec.textureSize);resources.geometries.add(geometry);const mesh=new THREE.Mesh(geometry,materials[boxSpec.material]);mesh.name=`mob-box:${boxSpec.name}`;part.add(mesh);}if(type==='skeleton'&&partSpec.name==='rightArm')attachSkeletonBow(part,resources);modelRoot.add(part);}return root;
}

function cloneInstanceMaterials(visual){
  const materials=[];visual.traverse(object=>{if(!object.isMesh||!object.material)return;const source=Array.isArray(object.material)?object.material:[object.material],clones=source.map(material=>{const clone=material.clone();clone.userData.mobInstanceMaterial=true;materials.push(clone);return clone;});object.material=Array.isArray(object.material)?clones:clones[0];});return materials;
}
function makeFireVisual(){
  const group=new THREE.Group();group.name='mob-fire-overlay';const geometry=new THREE.PlaneGeometry(.68,1.65),material=new THREE.MeshBasicMaterial({color:0xff7a18,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});const a=new THREE.Mesh(geometry,material),b=new THREE.Mesh(geometry,material.clone());a.position.y=.82;b.position.y=.82;b.rotation.y=Math.PI/2;group.add(a,b);group.visible=false;group.userData.instanceGeometry=geometry;group.userData.instanceMaterials=[material,b.material];return group;
}
export function bindMobVisual(visual){
  const animated=[],parts={};visual.traverse(object=>{if(object.userData?.mobWalk)animated.push(object);if(typeof object.name==='string'&&object.name.startsWith('mob:'))parts[object.name.split(':').at(-1)]=object;});visual.userData.mobAnimatedParts=animated;visual.userData.mobParts=parts;visual.userData.mobWalkPhase=Math.random()*Math.PI*2;visual.userData.mobInstanceMaterials=cloneInstanceMaterials(visual);const fire=makeFireVisual();visual.add(fire);visual.userData.mobFireGroup=fire;return visual;
}

export function applyMobVisualState(visual,{hurtStrength=0,burning=false,white=0}={}){
  if(!visual)return;const hurt=Math.max(0,Math.min(1,Number(hurtStrength)||0)),flash=Math.max(0,Math.min(1,Number(white)||0));
  for(const material of visual.userData.mobInstanceMaterials||[]){if(material.color){material.color.setRGB(1,1-hurt*.72,1-hurt*.72);}if(material.emissive){const burn=burning ? .22 : 0;material.emissive.setRGB(Math.max(flash,burn),Math.max(flash,burning ? .07 : 0),flash*.95);material.emissiveIntensity=1;}}
  const fire=visual.userData.mobFireGroup;if(fire){fire.visible=!!burning;if(burning){const phase=visual.userData.mobWalkPhase||0,scale=1+.06*Math.sin(phase*2.7);fire.scale.set(scale,1+.08*Math.sin(phase*3.4),scale);for(const child of fire.children)if(child.material)child.material.opacity=.4+.13*(.5+.5*Math.sin(phase*4+child.rotation.y));}}
}

export function animateMobVisual(visual,dt,speed=0){
  if(!visual)return;const amount=Math.min(1,Math.max(0,Number(speed)||0));visual.userData.mobWalkPhase=(visual.userData.mobWalkPhase||0)+dt*(4+amount*7);const phase=visual.userData.mobWalkPhase;
  for(const part of visual.userData.mobAnimatedParts||[]){const base=part.userData.mobBaseRotation||[0,0,0],walk=part.userData.mobWalk;part.rotation.set(...base);const swing=Math.sin(phase)*(.7*amount);if(walk==='leg-left'||walk==='arm-right')part.rotation.x+=swing;else if(walk==='leg-right'||walk==='arm-left')part.rotation.x-=swing;else if(walk==='wing-left')part.rotation.z+=Math.abs(Math.sin(phase*1.7))*.45*amount;else if(walk==='wing-right')part.rotation.z-=Math.abs(Math.sin(phase*1.7))*.45*amount;else if(walk==='spider-left')part.rotation.y+=Math.sin(phase)*.18*amount;else if(walk==='spider-right')part.rotation.y-=Math.sin(phase)*.18*amount;}
  if(visual.userData.mobModelType==='skeleton'){const right=visual.userData.mobParts?.rightArm,left=visual.userData.mobParts?.leftArm;if(right){right.rotation.x=1.28+Math.sin(phase*.7)*.035;right.rotation.y=-.18;}if(left){left.rotation.x=1.08+Math.sin(phase*.7)*.025;left.rotation.y=.42;}}
}
export function disposeMobVisualInstance(visual){
  for(const material of visual?.userData?.mobInstanceMaterials||[])material.dispose?.();const fire=visual?.userData?.mobFireGroup;if(fire){fire.userData.instanceGeometry?.dispose?.();for(const material of fire.userData.instanceMaterials||[])material.dispose?.();}if(visual?.userData){visual.userData.mobInstanceMaterials=[];visual.userData.mobFireGroup=null;}
}
export function disposeMobModelResources(resources){for(const geometry of resources.geometries||[])geometry.dispose();for(const material of resources.materials||[])material.dispose();for(const texture of resources.textures||[])texture.dispose();resources.geometries?.clear();resources.materials?.clear();resources.textures?.clear();resources.textureCache?.clear();resources.materialCache?.clear();}
