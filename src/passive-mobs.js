import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCK} from './blocks.js';
import {EntityStore} from './entity-store.js';
import {PASSIVE_MOBS,choosePassiveMob} from './mobs.js';

const tempA=new THREE.Vector3(),tempB=new THREE.Vector3();

function addBox(group,geometrySet,material,w,h,d,x,y,z){
  const geometry=new THREE.BoxGeometry(w,h,d);geometrySet.add(geometry);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;
}

function createTemplate(def,resources){
  const group=new THREE.Group();
  const bodyMaterial=new THREE.MeshLambertMaterial({color:def.color}),accentMaterial=new THREE.MeshLambertMaterial({color:def.accent});
  resources.materials.add(bodyMaterial);resources.materials.add(accentMaterial);
  const bodyH=Math.max(.36,def.height*.48),bodyY=def.height*.48;
  addBox(group,resources.geometries,bodyMaterial,def.width,bodyH,def.width*.62,0,bodyY,0);
  addBox(group,resources.geometries,accentMaterial,def.width*.58,def.height*.34,def.width*.54,0,def.height*.68,-def.width*.43);
  const legH=Math.max(.24,def.height*.34),legY=legH*.5;
  for(const sx of[-1,1])for(const sz of[-1,1])addBox(group,resources.geometries,bodyMaterial,Math.max(.12,def.width*.16),legH,Math.max(.12,def.width*.16),sx*def.width*.34,legY,sz*def.width*.23);
  return group;
}

export class PassiveMobSystem{
  constructor(scene,world,{maxEntities=16,cellSize=8}={}){
    this.scene=scene;this.world=world;this.maxEntities=maxEntities;this.store=new EntityStore({cellSize});this.visuals=new Map();this.spawnTimer=.5;this.aiAccumulator=0;
    this.resources={geometries:new Set(),materials:new Set()};this.templates=new Map();
    for(const[type,def]of Object.entries(PASSIVE_MOBS))this.templates.set(type,createTemplate(def,this.resources));
  }

  spawn(type,position){
    const def=PASSIVE_MOBS[type];if(!def||this.store.size>=this.maxEntities)return null;
    const record=this.store.spawn(type,position,{hp:def.hp,hurtCooldown:0,wanderAngle:Math.random()*Math.PI*2,wanderTimer:.5+Math.random()*2.5,fleeTimer:0,fleeX:position.x,fleeZ:position.z,hurtPulse:0});
    const visual=this.templates.get(type).clone(true);visual.position.set(position.x,position.y,position.z);this.scene.add(visual);this.visuals.set(record.id,visual);return record;
  }

  despawn(id){
    const visual=this.visuals.get(id);if(visual)this.scene.remove(visual);this.visuals.delete(id);return this.store.despawn(id);
  }

  raycast(origin,direction,maxDistance=4.5){
    const candidates=this.store.nearby(origin.x,origin.z,maxDistance+2);let best=null,bestDistance=maxDistance;
    for(const record of candidates){
      const def=PASSIVE_MOBS[record.type],position=this.store.getPosition(record.id);if(!def||!position)continue;
      const center=tempA.set(position.x,position.y+def.height*.5,position.z),to=tempB.copy(center).sub(origin),distance=to.dot(direction);
      if(distance<0||distance>bestDistance)continue;
      const closest=origin.clone().addScaledVector(direction,distance),radius=Math.max(def.width*.56,def.height*.34);
      if(closest.distanceToSquared(center)<=radius*radius){best=record;bestDistance=distance;}
    }
    return best?{entity:best,distance:bestDistance}:null;
  }

  hurt(record,amount,sourcePosition=null){
    if(!record||!this.store.has(record.id)||!Number.isFinite(amount)||amount<=0)return false;
    const state=record.components;if(state.hurtCooldown>0)return false;
    state.hp-=amount;state.hurtCooldown=.45;state.fleeTimer=3;state.hurtPulse=.12;
    if(sourcePosition){state.fleeX=sourcePosition.x;state.fleeZ=sourcePosition.z;}
    if(state.hp<=0)this.despawn(record.id);return true;
  }

  trySpawnAround(player){
    if(!player||this.store.size>=this.maxEntities)return;
    const angle=Math.random()*Math.PI*2,distance=12+Math.random()*18;
    const x=Math.floor(player.position.x+Math.cos(angle)*distance),z=Math.floor(player.position.z+Math.sin(angle)*distance),y=this.world.highestSolid(x,z)+1;
    if(y<=1)return;const ground=this.world.getBlock(x,y-1,z);if(ground!==BLOCK.GRASS&&ground!==BLOCK.DIRT)return;
    this.spawn(choosePassiveMob(),{x:x+.5,y,z:z+.5});
  }

  move(record,dt){
    const def=PASSIVE_MOBS[record.type],state=record.components,position=this.store.getPosition(record.id);if(!def||!position)return;
    state.wanderTimer-=dt;if(state.wanderTimer<=0){state.wanderTimer=1.4+Math.random()*3.2;state.wanderAngle+=(Math.random()-.5)*2.5;}
    let angle=state.wanderAngle,speed=def.speed*.42;
    if(state.fleeTimer>0){state.fleeTimer=Math.max(0,state.fleeTimer-dt);angle=Math.atan2(position.x-state.fleeX,position.z-state.fleeZ);speed=def.speed*1.8;}
    if(Math.random()<.012)speed=0;
    const dx=Math.sin(angle)*speed*dt,dz=Math.cos(angle)*speed*dt,nx=position.x+dx,nz=position.z+dz,nextY=this.world.highestSolid(nx,nz)+1;
    const ground=this.world.getBlock(Math.floor(nx),Math.floor(nextY-1),Math.floor(nz));
    if(nextY>1&&nextY-position.y<=1.05&&position.y-nextY<=2&&ground!==BLOCK.WATER){position.x=nx;position.y=nextY;position.z=nz;this.store.setPosition(record.id,position);}
    const visual=this.visuals.get(record.id);if(visual){if(speed>0)visual.rotation.y=Math.atan2(dx,dz);}
  }

  tick(dt,player){
    this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTimer=1.35;this.trySpawnAround(player);}
    for(const record of[...this.store.values()]){
      const position=this.store.getPosition(record.id);if(!position)continue;
      const dx=position.x-player.position.x,dz=position.z-player.position.z;if(dx*dx+dz*dz>48*48){this.despawn(record.id);continue;}
      const state=record.components;state.hurtCooldown=Math.max(0,state.hurtCooldown-dt);state.hurtPulse=Math.max(0,state.hurtPulse-dt);this.move(record,dt);
    }
  }

  update(dt,player){
    if(!player)return;this.aiAccumulator=Math.min(.5,this.aiAccumulator+dt);
    while(this.aiAccumulator>=.1){this.tick(.1,player);this.aiAccumulator-=.1;}
    const smoothing=1-Math.exp(-14*dt);
    for(const record of this.store.values()){
      const position=this.store.getPosition(record.id),visual=this.visuals.get(record.id);if(!position||!visual)continue;
      visual.position.lerp(tempA.set(position.x,position.y,position.z),smoothing);visual.scale.setScalar(record.components.hurtPulse>0?1.08:1);
    }
  }

  dispose(){
    for(const id of[...this.visuals.keys()])this.despawn(id);this.store.clear();
    for(const geometry of this.resources.geometries)geometry.dispose();for(const material of this.resources.materials)material.dispose();this.resources.geometries.clear();this.resources.materials.clear();this.templates.clear();
  }

  get size(){return this.store.size;}
}
