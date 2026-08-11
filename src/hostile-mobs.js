import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCK} from './blocks.js';
import {EntityStore} from './entity-store.js';
import {HOSTILE_MOBS,isNightTime} from './mobs.js';
import {applyDamage,knockbackDirection} from './combat.js';

const tempA=new THREE.Vector3(),tempB=new THREE.Vector3(),SPAWN_GROUND=new Set([BLOCK.GRASS,BLOCK.DIRT,BLOCK.STONE,BLOCK.SAND,BLOCK.COBBLESTONE]);

function addBox(group,resources,material,w,h,d,x,y,z){
  const geometry=new THREE.BoxGeometry(w,h,d);resources.geometries.add(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;
}

function createZombieTemplate(def,resources){
  const group=new THREE.Group(),skin=new THREE.MeshLambertMaterial({color:def.color}),clothes=new THREE.MeshLambertMaterial({color:def.accent});
  resources.materials.add(skin);resources.materials.add(clothes);
  addBox(group,resources,skin,.52,.52,.52,0,1.55,0);addBox(group,resources,clothes,.58,.68,.3,0,1.04,0);
  addBox(group,resources,skin,.18,.72,.2,-.39,1.08,-.08);addBox(group,resources,skin,.18,.72,.2,.39,1.08,-.08);
  addBox(group,resources,clothes,.22,.74,.24,-.15,.37,0);addBox(group,resources,clothes,.22,.74,.24,.15,.37,0);return group;
}

export class HostileMobSystem{
  constructor(scene,world,{maxEntities=8,cellSize=8,onPlayerHit=()=>{}}={}){
    this.scene=scene;this.world=world;this.maxEntities=maxEntities;this.onPlayerHit=onPlayerHit;this.store=new EntityStore({cellSize});this.visuals=new Map();this.spawnTimer=.7;this.aiAccumulator=0;
    this.resources={geometries:new Set(),materials:new Set()};this.templates=new Map();
    for(const[type,def]of Object.entries(HOSTILE_MOBS))this.templates.set(type,createZombieTemplate(def,this.resources));
  }

  spawn(type,position){
    const def=HOSTILE_MOBS[type];if(!def||this.store.size>=this.maxEntities)return null;
    const record=this.store.spawn(type,position,{hp:def.hp,hurtUntil:-Infinity,attackTimer:.3+Math.random()*.5,pushX:0,pushZ:0,hurtPulse:0});
    const visual=this.templates.get(type).clone(true);visual.position.set(position.x,position.y,position.z);this.scene.add(visual);this.visuals.set(record.id,visual);return record;
  }

  despawn(id){const visual=this.visuals.get(id);if(visual)this.scene.remove(visual);this.visuals.delete(id);return this.store.despawn(id);}

  raycast(origin,direction,maxDistance=4.5){
    const candidates=this.store.nearby(origin.x,origin.z,maxDistance+2);let best=null,bestDistance=maxDistance;
    for(const record of candidates){
      const def=HOSTILE_MOBS[record.type],position=this.store.getPosition(record.id);if(!def||!position)continue;
      const center=tempA.set(position.x,position.y+def.height*.5,position.z),to=tempB.copy(center).sub(origin),distance=to.dot(direction);if(distance<0||distance>bestDistance)continue;
      const closestX=origin.x+direction.x*distance,closestY=origin.y+direction.y*distance,closestZ=origin.z+direction.z*distance,radius=Math.max(def.width*.62,def.height*.32);
      const dx=closestX-center.x,dy=closestY-center.y,dz=closestZ-center.z;if(dx*dx+dy*dy+dz*dz<=radius*radius){best=record;bestDistance=distance;}
    }
    return best?{entity:best,distance:bestDistance}:null;
  }

  hurt(record,amount,sourcePosition,now){
    if(!record||!this.store.has(record.id))return{applied:false,dead:false};const def=HOSTILE_MOBS[record.type],position=this.store.getPosition(record.id);if(!def||!position)return{applied:false,dead:false};
    const result=applyDamage(record.components,amount,now,{maxHp:def.hp});if(!result.applied)return result;
    record.components.hurtPulse=.12;
    if(sourcePosition){const direction=knockbackDirection(sourcePosition.x,sourcePosition.z,position.x,position.z);record.components.pushX+=direction.x*4.1;record.components.pushZ+=direction.z*4.1;}
    if(result.dead)this.despawn(record.id);return result;
  }

  trySpawnAround(player,gameTime){
    if(!player||!isNightTime(gameTime)||this.store.size>=this.maxEntities)return;
    const angle=Math.random()*Math.PI*2,distance=16+Math.random()*16,x=Math.floor(player.position.x+Math.cos(angle)*distance),z=Math.floor(player.position.z+Math.sin(angle)*distance),y=this.world.highestSolid(x,z)+1;
    if(y<=1||!SPAWN_GROUND.has(this.world.getBlock(x,y-1,z)))return;this.spawn('zombie',{x:x+.5,y,z:z+.5});
  }

  moveAndAttack(record,dt,player){
    const def=HOSTILE_MOBS[record.type],state=record.components,position=this.store.getPosition(record.id);if(!def||!position)return;
    state.attackTimer=Math.max(0,state.attackTimer-dt);state.hurtPulse=Math.max(0,state.hurtPulse-dt);
    const toX=player.position.x-position.x,toZ=player.position.z-position.z,planar=Math.hypot(toX,toZ),vertical=Math.abs(player.position.y-position.y);
    let vx=state.pushX,vz=state.pushZ;
    if(planar<=def.followRange&&planar>def.attackRange*.78&&vertical<5){vx+=(toX/Math.max(planar,.001))*def.speed;vz+=(toZ/Math.max(planar,.001))*def.speed;}
    const pushDrag=Math.exp(-8*dt);state.pushX*=pushDrag;state.pushZ*=pushDrag;
    const length=Math.hypot(vx,vz);if(length>0){const maxSpeed=def.speed+4.5,scale=length>maxSpeed?maxSpeed/length:1,nx=position.x+vx*scale*dt,nz=position.z+vz*scale*dt,nextY=this.world.highestSolid(nx,nz)+1,ground=this.world.getBlock(Math.floor(nx),Math.floor(nextY-1),Math.floor(nz));if(nextY>1&&nextY-position.y<=1.05&&position.y-nextY<=2&&ground!==BLOCK.WATER){position.x=nx;position.y=nextY;position.z=nz;this.store.setPosition(record.id,position);const visual=this.visuals.get(record.id);if(visual)visual.rotation.y=Math.atan2(vx,vz);}}
    const dx=player.position.x-position.x,dz=player.position.z-position.z,range=Math.hypot(dx,dz);if(range<=def.attackRange&&Math.abs(player.position.y-position.y)<1.7&&state.attackTimer<=0){state.attackTimer=def.attackCooldown;this.onPlayerHit({amount:def.attackDamage,source:{x:position.x,z:position.z},entity:record});}
  }

  tick(dt,player,gameTime){
    this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTimer=1.15;this.trySpawnAround(player,gameTime);}
    for(const record of[...this.store.values()]){const position=this.store.getPosition(record.id);if(!position)continue;const dx=position.x-player.position.x,dz=position.z-player.position.z;if(dx*dx+dz*dz>48*48){this.despawn(record.id);continue;}this.moveAndAttack(record,dt,player);}
  }

  update(dt,player,gameTime){
    if(!player)return;this.aiAccumulator=Math.min(.5,this.aiAccumulator+dt);while(this.aiAccumulator>=.1){this.tick(.1,player,gameTime);this.aiAccumulator-=.1;}
    const smoothing=1-Math.exp(-14*dt);for(const record of this.store.values()){const position=this.store.getPosition(record.id),visual=this.visuals.get(record.id);if(!position||!visual)continue;visual.position.lerp(tempA.set(position.x,position.y,position.z),smoothing);visual.scale.setScalar(record.components.hurtPulse>0?1.08:1);}
  }

  dispose(){for(const id of[...this.visuals.keys()])this.despawn(id);this.store.clear();for(const geometry of this.resources.geometries)geometry.dispose();for(const material of this.resources.materials)material.dispose();this.resources.geometries.clear();this.resources.materials.clear();this.templates.clear();}
  get size(){return this.store.size;}
}
