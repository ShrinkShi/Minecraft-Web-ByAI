import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {requireAssetUrl} from './asset-manifest.js';
import {PLAYER_MODEL_SCALE,PLAYER_MODEL_SPEC,normalizePlayerVisualInput,playerModelUvRects} from './player-model-specs.js';

const PIXEL=1/16;
const FACE_ORDER=['right','left','top','bottom','front','back'];

function pushFace(positions,uvs,indices,vertices,rect,textureSize){
  const base=positions.length/3;
  for(const vertex of vertices)positions.push(vertex[0]*PIXEL,vertex[1]*PIXEL,vertex[2]*PIXEL);
  const [u0,v0,u1,v1]=rect,[tw,th]=textureSize,left=u0/tw,right=u1/tw,top=1-v0/th,bottom=1-v1/th;
  uvs.push(left,bottom,left,top,right,top,right,bottom);
  indices.push(base,base+1,base+2,base,base+2,base+3);
}

function cuboidGeometry(box){
  const [w,h,d]=box.size,inflate=Number(box.inflate)||0,[ox,oy,oz]=box.offset;
  const x0=ox-inflate,x1=ox+w+inflate,y0=oy-inflate,y1=oy+h+inflate,z0=oz-inflate,z1=oz+d+inflate;
  const rects=playerModelUvRects(box),faces={
    right:[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],
    left:[[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]],
    top:[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],
    bottom:[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],
    front:[[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]],
    back:[[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1]]
  },positions=[],uvs=[],indices=[];
  for(const face of FACE_ORDER)pushFace(positions,uvs,indices,faces[face],rects[face],PLAYER_MODEL_SPEC.textureSize);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

function easeOutCubic(value){const x=1-Math.max(0,Math.min(1,value));return 1-x*x*x;}
function approach(value,target,amount){return value<target?Math.min(target,value+amount):Math.max(target,value-amount);}

export class PlayerModelFactory{
  constructor({assetKey='entity.player.steve'}={}){
    this.assetKey=assetKey;this.geometries=new Set();this.disposed=false;
    this.texture=new THREE.TextureLoader().load(requireAssetUrl(assetKey));
    this.texture.name=assetKey;this.texture.userData.assetKey=assetKey;this.texture.magFilter=THREE.NearestFilter;this.texture.minFilter=THREE.NearestFilter;this.texture.generateMipmaps=false;this.texture.colorSpace=THREE.SRGBColorSpace;
    this.material=new THREE.MeshLambertMaterial({map:this.texture,transparent:true,alphaTest:.01,side:THREE.FrontSide});
    this.template=this.makeTemplate();
  }

  makeTemplate(){
    const root=new THREE.Group(),poseRoot=new THREE.Group(),modelRoot=new THREE.Group();root.name='player-model';root.userData.playerModel=true;poseRoot.name='player-pose-root';modelRoot.name='player-model-root';modelRoot.scale.setScalar(PLAYER_MODEL_SCALE);root.add(poseRoot);poseRoot.add(modelRoot);
    for(const partSpec of PLAYER_MODEL_SPEC.parts){
      const part=new THREE.Group();part.name=`player:${partSpec.name}`;part.position.set(...partSpec.pivot.map(value=>value*PIXEL));part.userData.basePosition=[...part.position];
      for(const boxSpec of partSpec.boxes){const geometry=cuboidGeometry(boxSpec);this.geometries.add(geometry);const mesh=new THREE.Mesh(geometry,this.material);mesh.name=`player-box:${boxSpec.name}`;mesh.userData.playerLayer=boxSpec.layer;part.add(mesh);}
      modelRoot.add(part);
    }
    return root;
  }

  create(){
    if(this.disposed)throw new Error('player model factory is disposed');
    const root=this.template.clone(true),parts={};root.traverse(object=>{if(object.name?.startsWith('player:'))parts[object.name.slice('player:'.length)]=object;});
    const visual={root,poseRoot:root.getObjectByName('player-pose-root'),modelRoot:root.getObjectByName('player-model-root'),parts,state:{walkPhase:0,primaryPulse:0,useRemaining:0,deathProgress:0}};
    root.userData.playerVisualState=visual.state;return visual;
  }

  triggerPrimary(visual,duration=.28){if(!visual?.state)return false;visual.state.primaryPulse=Math.max(visual.state.primaryPulse,Math.max(0,Number(duration)||0));return true;}
  triggerUse(visual,duration=.34){if(!visual?.state)return false;visual.state.useRemaining=Math.max(visual.state.useRemaining,Math.max(0,Number(duration)||0));return true;}

  animate(visual,dt,input={}){
    if(!visual?.root||!visual?.parts)return false;if(!Number.isFinite(dt)||dt<0)throw new RangeError('player visual dt must be a non-negative finite number');
    const state=visual.state,pose=normalizePlayerVisualInput(input),parts=visual.parts;
    state.primaryPulse=Math.max(0,state.primaryPulse-dt);state.useRemaining=Math.max(0,state.useRemaining-dt);state.deathProgress=approach(state.deathProgress,pose.dead?1:0,dt*3.6);
    const moving=Math.min(1,pose.speed/(pose.sprint?5.6:4.3)),phaseSpeed=pose.sprint?13:Math.min(11,4+pose.speed*1.65);if(moving>.01)state.walkPhase=(state.walkPhase+dt*phaseSpeed)%(Math.PI*2);
    const swing=Math.sin(state.walkPhase)*(pose.sprint?.82:.58)*moving;
    for(const part of Object.values(parts))part.rotation.set(0,0,0);
    parts.head.rotation.x=pose.headPitch;parts.head.rotation.y=pose.headYaw;
    parts.leftArm.rotation.x=-swing;parts.rightArm.rotation.x=swing;parts.leftLeg.rotation.x=swing;parts.rightLeg.rotation.x=-swing;
    const attacking=pose.primary||state.primaryPulse>0;
    if(attacking){const attack=Math.sin((state.walkPhase*1.65+performance.now()*.014)%Math.PI);parts.rightArm.rotation.x=-.65-Math.abs(attack)*1.25;parts.rightArm.rotation.z=-.08;}
    if(state.useRemaining>0){const t=Math.min(1,state.useRemaining/.34);parts.rightArm.rotation.x=-1.05-Math.sin((1-t)*Math.PI)*.22;parts.rightArm.rotation.y=-.28;parts.rightArm.rotation.z=-.12;}
    visual.modelRoot.rotation.x=pose.sprint&&moving>.15?-.12:0;
    const death=easeOutCubic(state.deathProgress);visual.poseRoot.rotation.set(0,0,-Math.PI/2*death);visual.poseRoot.position.set(0,.08*death,0);
    visual.root.userData.animation=Object.freeze({speed:pose.speed,sprint:pose.sprint,primary:attacking,use:state.useRemaining>0,dead:pose.dead,deathProgress:state.deathProgress,headYaw:pose.headYaw,headPitch:pose.headPitch});
    return true;
  }

  dispose(){if(this.disposed)return false;this.disposed=true;for(const geometry of this.geometries)geometry.dispose();this.geometries.clear();this.material.dispose();this.texture.dispose();this.template.clear();return true;}
}
