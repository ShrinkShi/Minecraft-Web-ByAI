import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {PlayerModelFactory} from './player-model-renderer.js';
import {inventoryPreviewPointerPose} from './player-presentation-rules.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const damp=(current,target,dt,speed=12)=>current+(target-current)*(1-Math.exp(-speed*dt));

export class InventoryPlayerPreview{
  constructor(container,{panel=container?.closest?.('.inventory-panel')||container}={}){
    if(!container||typeof container.append!=='function')throw new TypeError('inventory player preview container is required');
    this.container=container;this.panel=panel||container;this.disposed=false;this.lastTime=0;this.bodyYaw=0;this.targetBodyYaw=0;this.headYaw=0;this.targetHeadYaw=0;this.headPitch=0;this.targetHeadPitch=0;this.frame=0;

    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(30,100/144,.05,20);this.camera.position.set(0,.92,4.1);this.camera.lookAt(0,.9,0);
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor(0x000000,0);this.renderer.domElement.className='inventory-player-canvas';this.renderer.domElement.setAttribute('aria-label','玩家 3D 预览');this.container.textContent='';this.container.append(this.renderer.domElement);

    const hemi=new THREE.HemisphereLight(0xffffff,0x555555,2.2);const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(-2,4,4);this.scene.add(hemi,key);
    this.factory=new PlayerModelFactory();this.visual=this.factory.create();this.visual.root.rotation.y=Math.PI;this.scene.add(this.visual.root);

    this.onPointerMove=event=>this.trackPointer(event.clientX,event.clientY);
    this.onPointerLeave=()=>this.resetPointer();
    this.panel?.addEventListener?.('pointermove',this.onPointerMove);
    this.panel?.addEventListener?.('pointerleave',this.onPointerLeave);
    this.resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>this.resize()):null;this.resizeObserver?.observe(this.container);
    this.resize();
    this.factory.ready.then(()=>{if(!this.disposed)this.renderFrame(performance.now());}).catch(error=>{if(!this.disposed)this.container.dataset.previewError=error?.message||String(error);});
    this.frame=requestAnimationFrame(time=>this.renderFrame(time));
  }

  visible(){return !this.disposed&&this.container.getClientRects().length>0&&this.container.clientWidth>0&&this.container.clientHeight>0;}

  resize(){
    if(this.disposed)return false;const width=Math.max(1,Math.round(this.container.clientWidth||100)),height=Math.max(1,Math.round(this.container.clientHeight||144)),ratio=Math.min(globalThis.devicePixelRatio||1,2);
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.container.dataset.previewSize=`${width}x${height}`;return true;
  }

  trackPointer(clientX,clientY){
    if(this.disposed||!Number.isFinite(clientX)||!Number.isFinite(clientY))return false;const rect=this.container.getBoundingClientRect(),panelRect=this.panel?.getBoundingClientRect?.()||rect,cx=rect.left+rect.width/2,cy=rect.top+rect.height*.48;
    const horizontal=clamp((clientX-cx)/Math.max(40,panelRect.width*.42),-1,1),vertical=clamp((clientY-cy)/Math.max(55,panelRect.height*.42),-1,1),pose=inventoryPreviewPointerPose(horizontal,vertical);
    this.targetBodyYaw=pose.bodyYaw;this.targetHeadYaw=pose.headYaw;this.targetHeadPitch=pose.headPitch;this.container.dataset.pointerPose=`${this.targetHeadYaw.toFixed(3)},${this.targetHeadPitch.toFixed(3)}`;return true;
  }

  resetPointer(){this.targetBodyYaw=0;this.targetHeadYaw=0;this.targetHeadPitch=0;}

  renderFrame(time){
    if(this.disposed)return;const dt=this.lastTime?Math.min(.05,Math.max(0,(time-this.lastTime)/1000)):0;this.lastTime=time;
    this.bodyYaw=damp(this.bodyYaw,this.targetBodyYaw,dt,9);this.headYaw=damp(this.headYaw,this.targetHeadYaw,dt,13);this.headPitch=damp(this.headPitch,this.targetHeadPitch,dt,13);
    this.visual.root.rotation.y=Math.PI+this.bodyYaw;this.factory.animate(this.visual,dt,{headYaw:this.headYaw-this.bodyYaw*.35,headPitch:this.headPitch});
    if(this.visible())this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(next=>this.renderFrame(next));
  }

  snapshot(){return Object.freeze({bodyYaw:this.bodyYaw,headYaw:this.headYaw,headPitch:this.headPitch,targetBodyYaw:this.targetBodyYaw,targetHeadYaw:this.targetHeadYaw,targetHeadPitch:this.targetHeadPitch,visible:this.visible(),textureKey:this.factory.texture.userData.assetKey||this.factory.texture.name});}

  dispose(){
    if(this.disposed)return false;this.disposed=true;cancelAnimationFrame(this.frame);this.resizeObserver?.disconnect();this.panel?.removeEventListener?.('pointermove',this.onPointerMove);this.panel?.removeEventListener?.('pointerleave',this.onPointerLeave);this.scene.remove(this.visual.root);this.factory.dispose();this.renderer.dispose();this.renderer.domElement.remove();return true;
  }
}

let installedPreview=null;
export function installInventoryPlayerPreview(){
  if(installedPreview)return installedPreview;if(typeof document==='undefined')return null;const container=document.querySelector('#inventory .player-preview');if(!container)return null;installedPreview=new InventoryPlayerPreview(container);return installedPreview;
}

export function inventoryPlayerPreview(){return installedPreview;}
