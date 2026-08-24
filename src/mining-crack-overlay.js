import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {MINING_CRACK_ASSET_COUNT,miningCrackAssetUrl} from './mining-crack-assets.js';
import {subscribeMultiplayerMiningProgress} from './multiplayer-mining-progress-channel.js';
import {subscribeSingleplayerMiningProgress} from './singleplayer-mining-progress-channel.js';
import {MINING_CRACK_STAGE_COUNT,miningCrackStage,miningCrackTarget} from './mining-crack-rules.js';

function sceneLike(value){if(!value||typeof value!=='object'||typeof value.add!=='function'||typeof value.remove!=='function')throw new TypeError('mining crack overlay requires a scene');return value;}
function loadCrackTexture(stage){const texture=new THREE.TextureLoader().load(miningCrackAssetUrl(stage));texture.name=`block.destroy_stage_${stage}`;texture.userData.assetKey=texture.name;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;return texture;}

export class MiningCrackOverlay{
  constructor(scene){
    if(MINING_CRACK_ASSET_COUNT!==MINING_CRACK_STAGE_COUNT)throw new Error('mining crack asset/rule stage count mismatch');
    this.scene=sceneLike(scene);this.textures=Array.from({length:MINING_CRACK_STAGE_COUNT},(_,stage)=>loadCrackTexture(stage));
    this.geometry=new THREE.BoxGeometry(1.012,1.012,1.012);this.material=new THREE.MeshBasicMaterial({map:this.textures[0],transparent:true,alphaTest:.02,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.visible=false;this.mesh.renderOrder=20;this.mesh.frustumCulled=false;this.scene.add(this.mesh);this.current=null;this.disposed=false;
    this.releases=[subscribeMultiplayerMiningProgress(state=>this.apply(state)),subscribeSingleplayerMiningProgress(state=>this.apply(state))];
  }

  apply(state){
    if(this.disposed)return null;if(!state?.active)return this.hide();const stage=miningCrackStage(state.progress);if(stage===null)return this.hide();const target=miningCrackTarget(state.target);
    if(this.current?.stage!==stage)this.material.map=this.textures[stage];this.mesh.position.set(target.x+.5,target.y+.5,target.z+.5);this.mesh.visible=true;
    this.current=Object.freeze({visible:true,stage,progress:state.progress,tick:state.tick??null,target});return this.snapshot();
  }

  hide(){if(this.disposed)return null;this.mesh.visible=false;this.current=null;return this.snapshot();}
  snapshot(){if(!this.current)return Object.freeze({visible:false,stage:null,progress:0,tick:null,target:null});return Object.freeze({...this.current,target:Object.freeze({...this.current.target})});}
  dispose(){if(this.disposed)return false;this.disposed=true;for(const release of this.releases)release?.();this.releases.length=0;this.scene.remove(this.mesh);this.mesh.visible=false;this.geometry.dispose();this.material.dispose();for(const texture of this.textures)texture.dispose();this.current=null;return true;}
}
