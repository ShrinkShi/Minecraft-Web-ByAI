import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {subscribeMultiplayerMiningProgress} from './multiplayer-mining-progress-channel.js';
import {MINING_CRACK_STAGE_COUNT,miningCrackStage,miningCrackTarget} from './mining-crack-rules.js';

function sceneLike(value){if(!value||typeof value!=='object'||typeof value.add!=='function'||typeof value.remove!=='function')throw new TypeError('mining crack overlay requires a scene');return value;}
function textureSize(value){if(!Number.isInteger(value)||value<16||value>256)throw new RangeError('mining crack textureSize must be an integer from 16 to 256');return value;}
function rng(seed){let value=seed>>>0;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/0x100000000;};}

function createCrackTexture(stage,size){
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('2D canvas is unavailable for mining crack texture');
  ctx.clearRect(0,0,size,size);ctx.strokeStyle='rgba(18,18,18,.92)';ctx.lineCap='square';ctx.lineJoin='miter';ctx.lineWidth=Math.max(1,Math.round(size/32));
  const random=rng(0x51f15e+stage*0);const center=size*.5,branches=4+stage,steps=3+stage;
  for(let branch=0;branch<branches;branch++){
    let x=center+(random()-.5)*size*.12,y=center+(random()-.5)*size*.12,angle=random()*Math.PI*2;ctx.beginPath();ctx.moveTo(Math.round(x)+.5,Math.round(y)+.5);
    for(let step=0;step<steps;step++){
      angle+=(random()-.5)*1.25;const length=size*(.035+random()*.035);x=Math.max(1,Math.min(size-2,x+Math.cos(angle)*length));y=Math.max(1,Math.min(size-2,y+Math.sin(angle)*length));ctx.lineTo(Math.round(x)+.5,Math.round(y)+.5);
      if(step>0&&stage>=3&&random()<.24){const fork=angle+(random()<.5?-1:1)*(.45+random()*.65),forkLength=length*(.55+random()*.45);ctx.moveTo(Math.round(x)+.5,Math.round(y)+.5);ctx.lineTo(Math.round(x+Math.cos(fork)*forkLength)+.5,Math.round(y+Math.sin(fork)*forkLength)+.5);ctx.moveTo(Math.round(x)+.5,Math.round(y)+.5);}
    }
    ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}

export class MiningCrackOverlay{
  constructor(scene,{textureSize:size=64}={}){
    this.scene=sceneLike(scene);this.textureSize=textureSize(size);this.textures=Array.from({length:MINING_CRACK_STAGE_COUNT},(_,stage)=>createCrackTexture(stage,this.textureSize));
    this.geometry=new THREE.BoxGeometry(1.012,1.012,1.012);this.material=new THREE.MeshBasicMaterial({map:this.textures[0],transparent:true,alphaTest:.02,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.visible=false;this.mesh.renderOrder=20;this.mesh.frustumCulled=false;this.scene.add(this.mesh);this.current=null;this.disposed=false;
    this.release=subscribeMultiplayerMiningProgress(state=>this.apply(state));
  }

  apply(state){
    if(this.disposed)return null;if(!state?.active)return this.hide();const stage=miningCrackStage(state.progress);if(stage===null)return this.hide();const target=miningCrackTarget(state.target);
    this.material.map=this.textures[stage];this.material.needsUpdate=true;this.mesh.position.set(target.x+.5,target.y+.5,target.z+.5);this.mesh.visible=true;
    this.current=Object.freeze({visible:true,stage,progress:state.progress,tick:state.tick??null,target});return this.snapshot();
  }

  hide(){if(this.disposed)return null;this.mesh.visible=false;this.current=null;return this.snapshot();}
  snapshot(){if(!this.current)return Object.freeze({visible:false,stage:null,progress:0,tick:null,target:null});return Object.freeze({...this.current,target:Object.freeze({...this.current.target})});}
  dispose(){if(this.disposed)return false;this.disposed=true;this.release?.();this.release=null;this.scene.remove(this.mesh);this.mesh.visible=false;this.geometry.dispose();this.material.dispose();for(const texture of this.textures)texture.dispose();this.current=null;return true;}
}
