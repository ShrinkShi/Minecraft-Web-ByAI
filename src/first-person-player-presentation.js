import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {requireAssetUrl} from './asset-manifest.js';
import {ITEMS} from './items.js';
import {FIRST_PERSON_ATTACK_DURATION,FIRST_PERSON_ITEM_TRANSFORMS,FIRST_PERSON_RIGHT_ARM_LAYOUT,FIRST_PERSON_USE_DURATION,FIRST_PERSON_VIEWMODEL_FOV,STEVE_RIGHT_ARM_BASE_FRONT,STEVE_RIGHT_ARM_SLEEVE_FRONT,STEVE_RIGHT_ARM_SLEEVE_UVS,STEVE_RIGHT_ARM_UVS,STEVE_SKIN_SIZE,firstPersonActionPose,firstPersonItemKind,minecraftSkinCropCss} from './first-person-presentation-rules.js';

export {FIRST_PERSON_ATTACK_DURATION,FIRST_PERSON_ITEM_TRANSFORMS,FIRST_PERSON_RIGHT_ARM_LAYOUT,FIRST_PERSON_USE_DURATION,FIRST_PERSON_VIEWMODEL_FOV,STEVE_RIGHT_ARM_BASE_FRONT,STEVE_RIGHT_ARM_SLEEVE_FRONT,STEVE_RIGHT_ARM_SLEEVE_UVS,STEVE_RIGHT_ARM_UVS,STEVE_SKIN_SIZE,firstPersonActionPose,firstPersonItemKind,minecraftSkinCropCss};

const FACE_ORDER=Object.freeze(['right','left','top','bottom','front','back']);
const BLOCK_COLORS=Object.freeze({1:0x6ea84f,2:0x79553a,3:0x777777,4:0xd8c487,5:0xa97845,6:0x76502f,7:0x5c8f46,9:0x9a6b3f,10:0x6f6f6f,20:0xd9f4f4,21:0x777777,27:0x5f5f5f});

function configureTexture(texture){texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;return texture;}
function cropTexture(url,rect){
  const texture=configureTexture(new THREE.TextureLoader().load(url)),[u0,v0,u1,v1]=rect;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.repeat.set((u1-u0)/STEVE_SKIN_SIZE,(v1-v0)/STEVE_SKIN_SIZE);texture.offset.set(u0/STEVE_SKIN_SIZE,1-v1/STEVE_SKIN_SIZE);texture.needsUpdate=true;return texture;
}
function skinMaterials(url,uvs,{transparent=false}={}){return FACE_ORDER.map(face=>new THREE.MeshBasicMaterial({map:cropTexture(url,uvs[face]),transparent,alphaTest:transparent?.01:0,side:THREE.FrontSide,toneMapped:false}));}
function disposeObject(root){
  const geometries=new Set(),materials=new Set(),textures=new Set();root?.traverse?.(object=>{if(object.geometry)geometries.add(object.geometry);const list=Array.isArray(object.material)?object.material:[object.material];for(const material of list)if(material){materials.add(material);if(material.map)textures.add(material.map);}});for(const geometry of geometries)geometry.dispose?.();for(const material of materials)material.dispose?.();for(const texture of textures)texture.dispose?.();
}
function blockMaterial(url){const map=configureTexture(new THREE.TextureLoader().load(url));return new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.02,side:THREE.DoubleSide,toneMapped:false});}
function flatItemGroup(def){
  if(!def?.texture)return null;const group=new THREE.Group(),geometry=new THREE.PlaneGeometry(.34,.34),mesh=new THREE.Mesh(geometry,blockMaterial(def.texture));mesh.name='first-person-flat-item';group.add(mesh);return group;
}
function sourceBlockGroup(def){
  const group=new THREE.Group(),geometry=new THREE.BoxGeometry(.32,.32,.32);let mesh;
  if(def.blockPreviewFaces){const top=blockMaterial(def.blockPreviewFaces.top),left=blockMaterial(def.blockPreviewFaces.left),right=blockMaterial(def.blockPreviewFaces.right);mesh=new THREE.Mesh(geometry,[right,left,top,top,left,right]);}
  else if(def.texture)mesh=new THREE.Mesh(geometry,blockMaterial(def.texture));
  else mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:BLOCK_COLORS[def.blockId]||0x8b8b8b,toneMapped:false}));
  mesh.name='first-person-block-item';group.add(mesh);return group;
}

export class FirstPersonViewModel{
  constructor(){
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(FIRST_PERSON_VIEWMODEL_FOV,1,.02,10);this.root=new THREE.Group();this.root.name='first-person-viewmodel';this.scene.add(this.root);this.scene.add(new THREE.AmbientLight(0xffffff,2));const key=new THREE.DirectionalLight(0xffffff,1.4);key.position.set(-2,3,4);this.scene.add(key);
    const skin=requireAssetUrl('entity.player.steve'),layout=FIRST_PERSON_RIGHT_ARM_LAYOUT;
    this.armPivot=new THREE.Group();this.armPivot.name='first-person-right-arm';this.root.add(this.armPivot);
    this.armGroup=new THREE.Group();this.armGroup.name='first-person-arm-group';this.armPivot.add(this.armGroup);
    const base=new THREE.Mesh(new THREE.BoxGeometry(layout.width,layout.height,layout.depth),skinMaterials(skin,STEVE_RIGHT_ARM_UVS));base.position.y=layout.baseCenterY;base.rotation.z=layout.skinRotationZ;base.name='first-person-arm-base';this.armGroup.add(base);this.base=base;
    const sleeve=new THREE.Mesh(new THREE.BoxGeometry(layout.sleeveWidth,layout.sleeveHeight,layout.sleeveDepth),skinMaterials(skin,STEVE_RIGHT_ARM_SLEEVE_UVS,{transparent:true}));sleeve.position.y=layout.sleeveCenterY;sleeve.rotation.z=layout.skinRotationZ;sleeve.name='first-person-arm-sleeve';this.armGroup.add(sleeve);this.sleeve=sleeve;
    this.wristPivot=new THREE.Group();this.wristPivot.name='first-person-wrist';this.wristPivot.position.set(0,layout.wristY,0);this.armGroup.add(this.wristPivot);
    this.itemAnchor=new THREE.Group();this.itemAnchor.name='first-person-held-item';this.wristPivot.add(this.itemAnchor);
    this.itemVisual=null;this.itemId=null;this.itemKind='empty';this.attackRemaining=0;this.useRemaining=0;this.foodUseActive=false;this.foodUseProgress=0;this.foodUseItemId=null;this.visible=false;this.disposed=false;this.resize(globalThis.innerWidth||1280,globalThis.innerHeight||720);this.applyPose();
  }

  resize(width,height){if(this.disposed)return;const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  setFov(value){if(this.disposed||!Number.isFinite(value)||value<30||value>110)return false;if(this.camera.fov===value)return true;this.camera.fov=value;this.camera.updateProjectionMatrix();return true;}
  setItem(itemId){
    const normalized=typeof itemId==='string'?itemId:null;if(normalized===this.itemId)return;this.itemId=normalized;if(this.itemVisual){this.itemAnchor.remove(this.itemVisual);disposeObject(this.itemVisual);this.itemVisual=null;}
    const def=normalized?ITEMS[normalized]:null;this.itemKind=firstPersonItemKind(normalized,def);if(!def||this.itemKind==='empty')return;this.itemVisual=this.itemKind==='block'?sourceBlockGroup(def):flatItemGroup(def);if(this.itemVisual)this.itemAnchor.add(this.itemVisual);
  }
  triggerAttack(){this.attackRemaining=FIRST_PERSON_ATTACK_DURATION;}
  triggerUse(){this.useRemaining=FIRST_PERSON_USE_DURATION;}
  setFoodUseState(value={}){
    if(this.disposed)return false;const active=!!value?.active,itemId=active&&typeof value.itemId==='string'?value.itemId:null,progress=active&&Number.isFinite(Number(value.progress))?Math.max(0,Math.min(1,Number(value.progress))):0;this.foodUseActive=active&&!!itemId;this.foodUseItemId=this.foodUseActive?itemId:null;this.foodUseProgress=this.foodUseActive?progress:0;return this.foodUseActive;
  }
  applyPose(){
    const foodUseActive=this.foodUseActive&&this.foodUseItemId===this.itemId&&this.itemKind==='food',pose=firstPersonActionPose({attackRemaining:this.attackRemaining,useRemaining:this.useRemaining,foodUseActive,foodUseProgress:this.foodUseProgress}),item=FIRST_PERSON_ITEM_TRANSFORMS[this.itemKind]||FIRST_PERSON_ITEM_TRANSFORMS.flat;
    this.root.position.set(pose.x,pose.y,pose.z);this.root.rotation.set(pose.rotX,pose.rotY,pose.rotZ);
    this.armPivot.rotation.set(pose.shoulderRotX,pose.shoulderRotY,pose.shoulderRotZ);
    this.wristPivot.rotation.set(pose.wristRotX,pose.wristRotY,pose.wristRotZ);
    this.itemAnchor.position.set(item.position[0],item.position[1],item.position[2]);this.itemAnchor.rotation.set(item.rotation[0]+pose.itemRotX,item.rotation[1],item.rotation[2]+pose.itemRotZ);this.itemAnchor.scale.setScalar(item.scale);
  }
  update(dt,{visible=true,itemId=null}={}){if(this.disposed)return;this.visible=!!visible;this.setItem(itemId);if(Number.isFinite(dt)&&dt>0){this.attackRemaining=Math.max(0,this.attackRemaining-dt);this.useRemaining=Math.max(0,this.useRemaining-dt);}this.applyPose();}
  render(renderer){if(this.disposed||!this.visible||!renderer)return;const autoClear=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(this.scene,this.camera);renderer.autoClear=autoClear;}
  snapshot(){
    const layout=FIRST_PERSON_RIGHT_ARM_LAYOUT;return Object.freeze({visible:this.visible,itemId:this.itemId,itemKind:this.itemKind,attackRemaining:this.attackRemaining,useRemaining:this.useRemaining,foodUseActive:this.foodUseActive&&this.foodUseItemId===this.itemId,foodUseProgress:this.foodUseProgress,foodUseItemId:this.foodUseItemId,cameraFov:this.camera.fov,armGeometry:'BoxGeometry',sleeveGeometry:'BoxGeometry',itemGeometry:this.itemVisual?'3d':null,itemMeshGeometry:this.itemVisual?(this.itemKind==='block'?'BoxGeometry':'PlaneGeometry'):null,armSize:Object.freeze([layout.width,layout.height,layout.depth]),rootPosition:Object.freeze(this.root.position.toArray()),rootRotation:Object.freeze([this.root.rotation.x,this.root.rotation.y,this.root.rotation.z]),shoulderRotation:Object.freeze([this.armPivot.rotation.x,this.armPivot.rotation.y,this.armPivot.rotation.z]),wristPosition:Object.freeze(this.wristPivot.position.toArray()),itemLocalPosition:Object.freeze(this.itemAnchor.position.toArray()),hierarchy:Object.freeze({armParent:this.armGroup.parent?.name||null,wristParent:this.wristPivot.parent?.name||null,itemParent:this.itemAnchor.parent?.name||null}),armDirection:'shoulder-to-centre'});
  }
  dispose(){if(this.disposed)return false;disposeObject(this.root);this.scene.clear();this.itemVisual=null;this.disposed=true;return true;}
}
