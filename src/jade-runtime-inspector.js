import {JadeHud} from './jade-hud.js';
import {chooseLookTargetInfo} from './target-inspector.js';

export const JADE_INSPECTION_INTERVAL_MS=50;

function browserAvailable(){return typeof document!=='undefined'&&typeof globalThis.requestAnimationFrame==='function';}

export class JadeRuntimeInspector{
  constructor({world,player,inventory,passiveMobs=null,hostileMobs=null}={}){
    this.world=world;this.player=player;this.inventory=inventory;this.passiveMobs=passiveMobs;this.hostileMobs=hostileMobs;this.hud=null;this.frameHandle=null;this.disposed=false;this.lastAt=-Infinity;
    if(browserAvailable()){this.hud=new JadeHud();this.schedule();}
  }

  schedule(){if(this.disposed||!this.hud)return;this.frameHandle=requestAnimationFrame(now=>{this.update(now);this.schedule();});}
  visibleGameplay(){
    const hud=document.querySelector('#hud');if(!hud||hud.classList.contains('hidden'))return false;
    if(document.querySelector('.screen.active'))return false;
    if(!document.querySelector('#inventory')?.classList.contains('hidden'))return false;
    if(!document.querySelector('#workbench')?.classList.contains('hidden'))return false;
    if(!document.querySelector('#chat-input-wrap')?.classList.contains('hidden'))return false;
    return true;
  }
  selectedItemId(){
    const selected=document.querySelector('#hotbar [data-hotbar-index].selected'),index=Number(selected?.dataset?.hotbarIndex);if(!Number.isInteger(index)||index<0||index>8)return null;return this.inventory?.hotbar?.(index)?.id||null;
  }
  entityHit(origin,direction){
    const hits=[];const passive=this.passiveMobs?.raycast?.(origin,direction,4.5);if(passive)hits.push(passive);const hostile=this.hostileMobs?.raycast?.(origin,direction,4.5);if(hostile)hits.push(hostile);hits.sort((a,b)=>a.distance-b.distance);return hits[0]||null;
  }
  update(now=performance.now()){
    if(this.disposed||!this.hud)return;if(now-this.lastAt<JADE_INSPECTION_INTERVAL_MS)return;this.lastAt=now;
    if(!this.visibleGameplay()||!this.world||!this.player){this.hud.hide();return;}
    const origin=this.player.eyePosition(),direction=this.player.lookDirection(),blockHit=this.world.raycast(origin,direction,6),entityHit=this.entityHit(origin,direction);
    this.hud.render(chooseLookTargetInfo({blockHit,entityHit,selectedItemId:this.selectedItemId()}));
  }
  dispose(){if(this.disposed)return false;this.disposed=true;if(this.frameHandle!==null)cancelAnimationFrame(this.frameHandle);this.frameHandle=null;this.hud?.hide();this.hud=null;return true;}
}
