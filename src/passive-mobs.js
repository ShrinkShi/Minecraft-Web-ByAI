import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCK} from './blocks.js';
import {EntityStore} from './entity-store.js';
import {PASSIVE_MOBS,choosePassiveMob} from './mobs.js';
import {applyDamage,knockbackDirection} from './combat.js';
import {animateMobVisual,applyMobVisualState,bindMobVisual,createMobModelTemplate,disposeMobModelResources,disposeMobVisualInstance} from './mob-model-renderer.js';
import {MOB_HURT_FLASH_SECONDS,mobHitVisual} from './combat-mob-presentation-rules.js';

const tempA=new THREE.Vector3(),tempB=new THREE.Vector3();
const nextAmbientDelay=()=>7+Math.random()*9;

export class PassiveMobSystem{
  constructor(scene,world,{maxEntities=16,cellSize=8,onDeath=()=>{},onSound=()=>{}}={}){
    this.scene=scene;this.world=world;this.maxEntities=maxEntities;this.onDeath=onDeath;this.onSound=typeof onSound==='function'?onSound:()=>{};this.store=new EntityStore({cellSize});this.visuals=new Map();this.spawnTimer=.5;this.aiAccumulator=0;
    this.resources={geometries:new Set(),materials:new Set(),textures:new Set(),textureCache:new Map(),materialCache:new Map()};this.templates=new Map();for(const[type,def]of Object.entries(PASSIVE_MOBS))this.templates.set(type,createMobModelTemplate(type,def,this.resources));
  }

  spawn(type,position){
    const def=PASSIVE_MOBS[type];if(!def||this.store.size>=this.maxEntities)return null;const record=this.store.spawn(type,position,{hp:def.hp,hurtUntil:-Infinity,wanderAngle:Math.random()*Math.PI*2,wanderTimer:.5+Math.random()*2.5,fleeTimer:0,fleeX:position.x,fleeZ:position.z,pushX:0,pushZ:0,hurtPulse:0,ambientTimer:2+Math.random()*8});const visual=bindMobVisual(this.templates.get(type).clone(true));visual.position.set(position.x,position.y,position.z);this.scene.add(visual);this.visuals.set(record.id,visual);return record;
  }

  despawn(id){const visual=this.visuals.get(id);if(visual){disposeMobVisualInstance(visual);this.scene.remove(visual);}this.visuals.delete(id);return this.store.despawn(id);}

  raycast(origin,direction,maxDistance=4.5){
    const candidates=this.store.nearby(origin.x,origin.z,maxDistance+2);let best=null,bestDistance=maxDistance;for(const record of candidates){const def=PASSIVE_MOBS[record.type],position=this.store.getPosition(record.id);if(!def||!position)continue;const center=tempA.set(position.x,position.y+def.height*.5,position.z),to=tempB.copy(center).sub(origin),distance=to.dot(direction);if(distance<0||distance>bestDistance)continue;const closestX=origin.x+direction.x*distance,closestY=origin.y+direction.y*distance,closestZ=origin.z+direction.z*distance,radius=Math.max(def.width*.56,def.height*.34),dx=closestX-center.x,dy=closestY-center.y,dz=closestZ-center.z;if(dx*dx+dy*dy+dz*dz<=radius*radius){best=record;bestDistance=distance;}}return best?{entity:best,distance:bestDistance}:null;
  }

  hurt(record,amount,sourcePosition,now){
    if(!record||!this.store.has(record.id))return{applied:false,dead:false};const def=PASSIVE_MOBS[record.type],position=this.store.getPosition(record.id);if(!def||!position)return{applied:false,dead:false};const result=applyDamage(record.components,amount,now,{maxHp:def.hp});if(!result.applied)return result;const state=record.components;state.fleeTimer=3;state.hurtPulse=MOB_HURT_FLASH_SECONDS;if(sourcePosition){state.fleeX=sourcePosition.x;state.fleeZ=sourcePosition.z;const direction=knockbackDirection(sourcePosition.x,sourcePosition.z,position.x,position.z);state.pushX+=direction.x*3.8;state.pushZ+=direction.z*3.8;}this.onSound({type:record.type,kind:result.dead?'death':'hurt',position:{...position},entity:record});if(result.dead){this.onDeath({type:record.type,position:{...position},entity:record});this.despawn(record.id);}return result;
  }

  trySpawnAround(player){
    if(!player||this.store.size>=this.maxEntities)return;const angle=Math.random()*Math.PI*2,distance=12+Math.random()*18,x=Math.floor(player.position.x+Math.cos(angle)*distance),z=Math.floor(player.position.z+Math.sin(angle)*distance),y=this.world.highestSolid(x,z)+1;if(y<=1)return;const ground=this.world.getBlock(x,y-1,z);if(ground!==BLOCK.GRASS&&ground!==BLOCK.DIRT)return;this.spawn(choosePassiveMob(),{x:x+.5,y,z:z+.5});
  }

  move(record,dt){
    const def=PASSIVE_MOBS[record.type],state=record.components,position=this.store.getPosition(record.id);if(!def||!position)return;state.wanderTimer-=dt;if(state.wanderTimer<=0){state.wanderTimer=1.4+Math.random()*3.2;state.wanderAngle+=(Math.random()-.5)*2.5;}let angle=state.wanderAngle,speed=def.speed*.42;if(state.fleeTimer>0){state.fleeTimer=Math.max(0,state.fleeTimer-dt);angle=Math.atan2(position.x-state.fleeX,position.z-state.fleeZ);speed=def.speed*1.8;}if(Math.random()<.012)speed=0;let vx=Math.sin(angle)*speed+state.pushX,vz=Math.cos(angle)*speed+state.pushZ;const drag=Math.exp(-8*dt);state.pushX*=drag;state.pushZ*=drag;const length=Math.hypot(vx,vz),maxSpeed=def.speed*1.8+4,scale=length>maxSpeed?maxSpeed/length:1,dx=vx*scale*dt,dz=vz*scale*dt,nx=position.x+dx,nz=position.z+dz,nextY=this.world.highestSolid(nx,nz)+1,ground=this.world.getBlock(Math.floor(nx),Math.floor(nextY-1),Math.floor(nz));if(nextY>1&&nextY-position.y<=1.05&&position.y-nextY<=2&&ground!==BLOCK.WATER){position.x=nx;position.y=nextY;position.z=nz;this.store.setPosition(record.id,position);}const visual=this.visuals.get(record.id);if(visual){visual.userData.mobSpeed=Math.min(1,length/Math.max(def.speed,.001));if(length>0)visual.rotation.y=Math.atan2(vx,vz)+Math.PI;}
  }

  tick(dt,player){
    this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTimer=1.35;this.trySpawnAround(player);}for(const record of[...this.store.values()]){const position=this.store.getPosition(record.id);if(!position)continue;const dx=position.x-player.position.x,dz=position.z-player.position.z;if(dx*dx+dz*dz>48*48){this.despawn(record.id);continue;}const state=record.components;state.hurtPulse=Math.max(0,state.hurtPulse-dt);state.ambientTimer=(Number(state.ambientTimer)||0)-dt;if(state.ambientTimer<=0){state.ambientTimer=nextAmbientDelay();this.onSound({type:record.type,kind:'ambient',position:{...position},entity:record});}this.move(record,dt);}
  }

  update(dt,player){
    if(!player)return;this.aiAccumulator=Math.min(.5,this.aiAccumulator+dt);while(this.aiAccumulator>=.1){this.tick(.1,player);this.aiAccumulator-=.1;}const smoothing=1-Math.exp(-14*dt);for(const record of this.store.values()){const position=this.store.getPosition(record.id),visual=this.visuals.get(record.id);if(!position||!visual)continue;visual.position.lerp(tempA.set(position.x,position.y,position.z),smoothing);const hit=mobHitVisual(record.components.hurtPulse);visual.scale.setScalar(hit.scale);applyMobVisualState(visual,{hurtStrength:hit.strength});animateMobVisual(visual,dt,visual.userData.mobSpeed||0);}
  }

  dispose(){for(const id of[...this.visuals.keys()])this.despawn(id);this.store.clear();disposeMobModelResources(this.resources);this.templates.clear();}
  get size(){return this.store.size;}
}
