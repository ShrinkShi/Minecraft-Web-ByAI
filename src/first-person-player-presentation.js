import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {requireAssetUrl} from './asset-manifest.js';
import {ITEMS} from './items.js';
import {FIRST_PERSON_ATTACK_DURATION,FIRST_PERSON_USE_DURATION,STEVE_RIGHT_ARM_BASE_FRONT,STEVE_RIGHT_ARM_SLEEVE_FRONT,STEVE_RIGHT_ARM_SLEEVE_UVS,STEVE_RIGHT_ARM_UVS,STEVE_SKIN_SIZE,firstPersonActionPose,minecraftSkinCropCss} from './first-person-presentation-rules.js';

export {FIRST_PERSON_ATTACK_DURATION,FIRST_PERSON_USE_DURATION,STEVE_RIGHT_ARM_BASE_FRONT,STEVE_RIGHT_ARM_SLEEVE_FRONT,STEVE_RIGHT_ARM_SLEEVE_UVS,STEVE_RIGHT_ARM_UVS,STEVE_SKIN_SIZE,firstPersonActionPose,minecraftSkinCropCss};

const FACE_ORDER=Object.freeze(['right','left','top','bottom','front','back']);
const BLOCK_COLORS=Object.freeze({1:0x6ea84f,2:0x79553a,3:0x777777,4:0xd8c487,5:0xa97845,6:0x76502f,7:0x5c8f46,9:0x9a6b3f,10:0x6f6f6f,20:0xd9f4f4,21:0x777777});

function configureTexture(texture){texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;return texture;}
function cropTexture(url,rect){
  const texture=configureTexture(new THREE.TextureLoader().load(url)),[u0,v0,u1,v1]=rect;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.repeat.set((u1-u0)/STEVE_SKIN_SIZE,(v1-v0)/STEVE_SKIN_SIZE);texture.offset.set(u0/STEVE_SKIN_SIZE,1-v1/STEVE_SKIN_SIZE);texture.needsUpdate=true;return texture;
}
function skinMaterials(url,uvs,{transparent=false}={}){return FACE_ORDER.map(face=>new THREE.MeshBasicMaterial({map:cropTexture(url,uvs[face]),transparent,alphaTest:transparent ? .01 : 0,side:THREE.FrontSide,toneMapped:false}));}
function disposeObject(root){
  const geometries=new Set(),materials=new Set(),textures=new Set();root?.traverse?.(object=>{if(object.geometry)geometries.add(object.geometry);const list=Array.isArray(object.material)?object.material:[object.material];for(const material of list)if(material){materials.add(material);if(material.map)textures.add(material.map);}});for(const geometry of geometries)geometry.dispose?.();for(const material of materials)material.dispose?.();for(const texture of textures)texture.dispose?.();
}
function blockMaterial(url){const map=configureTexture(new THREE.TextureLoader().load(url));return new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.02,toneMapped:false});}
function flatItemGroup(def){
  const group=new THREE.Group(),front=blockMaterial(def.texture),back=front.clone(),edge=new THREE.MeshBasicMaterial({color:0x3d352f,toneMapped:false}),geometry=new THREE.BoxGeometry(.38,.38,.045),materials=[edge,edge,edge,edge,front,back],mesh=new THREE.Mesh(geometry,materials);mesh.rotation.z=-Math.PI/4;group.add(mesh);return group;
}
function sourceBlockGroup(def){
  const group=new THREE.Group(),geometry=new THREE.BoxGeometry(.34,.34,.34);
  if(def.blockPreviewFaces){const top=blockMaterial(def.blockPreviewFaces.top),left=blockMaterial(def.blockPreviewFaces.left),right=blockMaterial(def.blockPreviewFaces.right);group.add(new THREE.Mesh(geometry,[right,left,top,top,left,right]));}
  else group.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:BLOCK_COLORS[def.blockId]||0x8b8b8b,toneMapped:false})));
  group.rotation.set(.25,-.55,.08);return group;
}

export class FirstPersonViewModel{
  constructor(){
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(54,1,.02,10);this.root=new THREE.Group();this.root.name='first-person-viewmodel';this.scene.add(this.root);this.scene.add(new THREE.AmbientLight(0xffffff,2));const key=new THREE.DirectionalLight(0xffffff,1.4);key.position.set(-2,3,4);this.scene.add(key);
    const skin=requireAssetUrl('entity.player.steve'),armPivot=new THREE.Group();armPivot.name='first-person-right-arm';this.root.add(armPivot);this.armPivot=armPivot;
    // The view-model enters from the lower-right shoulder. The previous mesh
    // extended downward from that pivot, putting Steve's sleeve above the hand
    // and visually reversing the arm. Extend toward the screen centre instead,
    // and rotate the skin cuboids so shoulder/hand texels keep anatomical order.
    const base=new THREE.Mesh(new THREE.BoxGeometry(.27,.78,.27),skinMaterials(skin,STEVE_RIGHT_ARM_UVS));base.position.y=.39;base.rotation.z=Math.PI;base.name='first-person-arm-base';armPivot.add(base);
    const sleeve=new THREE.Mesh(new THREE.BoxGeometry(.292,.806,.292),skinMaterials(skin,STEVE_RIGHT_ARM_SLEEVE_UVS,{transparent:true}));sleeve.position.y=.403;sleeve.rotation.z=Math.PI;sleeve.name='first-person-arm-sleeve';armPivot.add(sleeve);
    this.itemAnchor=new THREE.Group();this.itemAnchor.name='first-person-held-item';this.itemAnchor.position.set(-.04,.77,-.12);armPivot.add(this.itemAnchor);this.itemVisual=null;this.itemId=null;this.attackRemaining=0;this.useRemaining=0;this.visible=false;this.disposed=false;this.resize(globalThis.innerWidth||1280,globalThis.innerHeight||720);this.applyPose();
  }

  resize(width,height){if(this.disposed)return;const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  setItem(itemId){
    const normalized=typeof itemId==='string'?itemId:null;if(normalized===this.itemId)return;this.itemId=normalized;if(this.itemVisual){this.itemAnchor.remove(this.itemVisual);disposeObject(this.itemVisual);this.itemVisual=null;}
    const def=normalized?ITEMS[normalized]:null;if(!def)return;this.itemVisual=def.texture?flatItemGroup(def):def.blockId?sourceBlockGroup(def):null;if(this.itemVisual)this.itemAnchor.add(this.itemVisual);
  }
  triggerAttack(){this.attackRemaining=FIRST_PERSON_ATTACK_DURATION;}
  triggerUse(){this.useRemaining=FIRST_PERSON_USE_DURATION;}
  applyPose(){const pose=firstPersonActionPose({attackRemaining:this.attackRemaining,useRemaining:this.useRemaining});this.root.position.set(pose.x,pose.y,pose.z);this.root.rotation.set(pose.rotX,pose.rotY,pose.rotZ);this.itemAnchor.rotation.set(pose.itemRotX,0,pose.itemRotZ);}
  update(dt,{visible=true,itemId=null}={}){if(this.disposed)return;this.visible=!!visible;this.setItem(itemId);if(Number.isFinite(dt)&&dt>0){this.attackRemaining=Math.max(0,this.attackRemaining-dt);this.useRemaining=Math.max(0,this.useRemaining-dt);}this.applyPose();}
  render(renderer){if(this.disposed||!this.visible||!renderer)return;const autoClear=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(this.scene,this.camera);renderer.autoClear=autoClear;}
  snapshot(){return Object.freeze({visible:this.visible,itemId:this.itemId,attackRemaining:this.attackRemaining,useRemaining:this.useRemaining,armGeometry:'BoxGeometry',sleeveGeometry:'BoxGeometry',itemGeometry:this.itemVisual?'3d':null,rootPosition:Object.freeze(this.root.position.toArray()),rootRotation:Object.freeze([this.root.rotation.x,this.root.rotation.y,this.root.rotation.z]),armDirection:'shoulder-to-centre'});}
  dispose(){if(this.disposed)return false;disposeObject(this.root);this.scene.clear();this.itemVisual=null;this.disposed=true;return true;}
}
