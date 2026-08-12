import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCK} from './blocks.js';
import {EntityStore} from './entity-store.js';
import {HOSTILE_MOBS,chooseHostileMob,isNightTime} from './mobs.js';
import {applyDamage,knockbackDirection} from './combat.js';
import {resolveSpiderClimb} from './spider-rules.js';
import {SLEEP_MONSTER_HORIZONTAL,firstSleepBlocker} from './sleep-safety-rules.js';

const tempA=new THREE.Vector3(),tempB=new THREE.Vector3(),SPAWN_GROUND=new Set([BLOCK.GRASS,BLOCK.DIRT,BLOCK.STONE,BLOCK.SAND,BLOCK.COBBLESTONE]);

function addBox(group,resources,material,w,h,d,x,y,z){const geometry=new THREE.BoxGeometry(w,h,d);resources.geometries.add(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
function createHumanoidTemplate(def,resources){
  const group=new THREE.Group(),body=new THREE.MeshLambertMaterial({color:def.color}),accent=new THREE.MeshLambertMaterial({color:def.accent});resources.materials.add(body);resources.materials.add(accent);
  const scale=def.height/1.8;addBox(group,resources,body,.52,.52,.52,0,1.55*scale,0);addBox(group,resources,accent,.58,.68,.3,0,1.04*scale,0);addBox(group,resources,body,.18,.72,.2,-.39,1.08*scale,-.08);addBox(group,resources,body,.18,.72,.2,.39,1.08*scale,-.08);addBox(group,resources,accent,.22,.74,.24,-.15,.37*scale,0);addBox(group,resources,accent,.22,.74,.24,.15,.37*scale,0);return group;
}
function createSpiderTemplate(def,resources){
  const group=new THREE.Group(),body=new THREE.MeshLambertMaterial({color:def.color}),accent=new THREE.MeshLambertMaterial({color:def.accent});resources.materials.add(body);resources.materials.add(accent);
  addBox(group,resources,body,.82,.38,.95,0,.42,.2);addBox(group,resources,body,.76,.48,.78,0,.46,.72);addBox(group,resources,body,.58,.36,.52,0,.42,-.52);addBox(group,resources,accent,.34,.12,.04,0,.47,-.79);
  const legZ=[-.38,-.12,.18,.46];for(const side of[-1,1])for(let i=0;i<4;i++){const leg=addBox(group,resources,body,.78,.1,.1,side*.68,.34,legZ[i]);leg.rotation.z=-side*.32;leg.rotation.y=side*(i<2?.22:-.22);}
  return group;
}
function createMobTemplate(def,resources){return def.model==='spider'?createSpiderTemplate(def,resources):createHumanoidTemplate(def,resources);}

export class HostileMobSystem{
  constructor(scene,world,{maxEntities=8,cellSize=8,onPlayerHit=()=>{},onProjectile=()=>{},onExplosion=()=>{},onDeath=()=>{}}={}){
    this.scene=scene;this.world=world;this.maxEntities=maxEntities;this.onPlayerHit=onPlayerHit;this.onProjectile=onProjectile;this.onExplosion=onExplosion;this.onDeath=onDeath;this.store=new EntityStore({cellSize});this.visuals=new Map();this.spawnTimer=.7;this.aiAccumulator=0;
    this.resources={geometries:new Set(),materials:new Set()};this.templates=new Map();for(const[type,def]of Object.entries(HOSTILE_MOBS))this.templates.set(type,createMobTemplate(def,this.resources));
  }

  spawn(type,position){
    const def=HOSTILE_MOBS[type];if(!def||this.store.size>=this.maxEntities)return null;
    const record=this.store.spawn(type,position,{hp:def.hp,hurtUntil:-Infinity,attackTimer:.3+Math.random()*.5,pushX:0,pushZ:0,hurtPulse:0,strafeDir:Math.random()<.5?-1:1,strafeTimer:1+Math.random()*1.5,fuse:0});
    const visual=this.templates.get(type).clone(true);visual.position.set(position.x,position.y,position.z);this.scene.add(visual);this.visuals.set(record.id,visual);return record;
  }

  despawn(id){const visual=this.visuals.get(id);if(visual)this.scene.remove(visual);this.visuals.delete(id);return this.store.despawn(id);}

  raycast(origin,direction,maxDistance=4.5){
    const candidates=this.store.nearby(origin.x,origin.z,maxDistance+2);let best=null,bestDistance=maxDistance;
    for(const record of candidates){const def=HOSTILE_MOBS[record.type],position=this.store.getPosition(record.id);if(!def||!position)continue;const center=tempA.set(position.x,position.y+def.height*.5,position.z),to=tempB.copy(center).sub(origin),distance=to.dot(direction);if(distance<0||distance>bestDistance)continue;const closestX=origin.x+direction.x*distance,closestY=origin.y+direction.y*distance,closestZ=origin.z+direction.z*distance,radius=Math.max(def.width*.62,def.height*.32),dx=closestX-center.x,dy=closestY-center.y,dz=closestZ-center.z;if(dx*dx+dy*dy+dz*dz<=radius*radius){best=record;bestDistance=distance;}}
    return best?{entity:best,distance:bestDistance}:null;
  }

  hurt(record,amount,sourcePosition,now){
    if(!record||!this.store.has(record.id))return{applied:false,dead:false};const def=HOSTILE_MOBS[record.type],position=this.store.getPosition(record.id);if(!def||!position)return{applied:false,dead:false};const result=applyDamage(record.components,amount,now,{maxHp:def.hp});if(!result.applied)return result;record.components.hurtPulse=.12;
    if(sourcePosition){const direction=knockbackDirection(sourcePosition.x,sourcePosition.z,position.x,position.z);record.components.pushX+=direction.x*4.1;record.components.pushZ+=direction.z*4.1;}if(result.dead){this.onDeath({type:record.type,position:{...position},entity:record});this.despawn(record.id);}return result;
  }

  trySpawnAround(player,gameTime){
    if(!player||!isNightTime(gameTime)||this.store.size>=this.maxEntities)return;const angle=Math.random()*Math.PI*2,distance=16+Math.random()*16,x=Math.floor(player.position.x+Math.cos(angle)*distance),z=Math.floor(player.position.z+Math.sin(angle)*distance),y=this.world.highestSolid(x,z)+1;if(y<=1||!SPAWN_GROUND.has(this.world.getBlock(x,y-1,z)))return;this.spawn(chooseHostileMob(),{x:x+.5,y,z:z+.5});
  }

  desiredVelocity(def,state,position,player,planar,vertical,dt){
    let vx=state.pushX,vz=state.pushZ;if(planar>def.followRange||vertical>=5)return{vx,vz};const nx=(player.position.x-position.x)/Math.max(planar,.001),nz=(player.position.z-position.z)/Math.max(planar,.001);
    if(def.attackStyle==='ranged'){
      state.strafeTimer-=dt;if(state.strafeTimer<=0){state.strafeTimer=1.2+Math.random()*1.8;if(Math.random()<.45)state.strafeDir*=-1;}
      if(planar>def.idealRange+1){vx+=nx*def.speed;vz+=nz*def.speed;}else if(planar<def.minRange){vx-=nx*def.speed;vz-=nz*def.speed;}else{vx+=-nz*def.speed*.48*state.strafeDir;vz+=nx*def.speed*.48*state.strafeDir;}
    }else if(def.attackStyle==='fuse'){
      if(planar>def.fuseRange){vx+=nx*def.speed;vz+=nz*def.speed;}
    }else if(planar>def.attackRange*.78){vx+=nx*def.speed;vz+=nz*def.speed;}
    return{vx,vz};
  }

  updateFuse(record,def,state,position,planar,vertical,dt){
    if(def.attackStyle!=='fuse')return false;
    if(planar<=def.fuseRange&&vertical<3)state.fuse=Math.min(def.fuseTime,state.fuse+dt);else state.fuse=Math.max(0,state.fuse-dt*(planar>=def.cancelRange||vertical>=4?2:1));
    if(state.fuse<def.fuseTime)return false;
    const event={position:{x:position.x,y:position.y+def.height*.45,z:position.z},radius:def.explosionRadius,damageRadius:def.damageRadius,maxDamage:def.maxDamage,entity:record};this.despawn(record.id);this.onExplosion(event);return true;
  }

  attack(record,def,state,position,player,planar,vertical){
    if(def.attackStyle==='fuse'||state.attackTimer>0||vertical>=5||planar>def.followRange)return;
    if(def.attackStyle==='ranged'){state.attackTimer=def.attackCooldown;this.onProjectile({kind:'arrow',damage:def.attackDamage,speed:def.projectileSpeed,source:{x:position.x,y:position.y+def.height*.72,z:position.z},target:{x:player.position.x,y:player.position.y+player.eye*.8,z:player.position.z},entity:record});return;}
    if(planar<=def.attackRange&&vertical<1.7){state.attackTimer=def.attackCooldown;this.onPlayerHit({amount:def.attackDamage,source:{x:position.x,z:position.z},entity:record});}
  }

  moveAndAttack(record,dt,player){
    const def=HOSTILE_MOBS[record.type],state=record.components,position=this.store.getPosition(record.id);if(!def||!position)return;state.attackTimer=Math.max(0,state.attackTimer-dt);state.hurtPulse=Math.max(0,state.hurtPulse-dt);
    const toX=player.position.x-position.x,toZ=player.position.z-position.z,planar=Math.hypot(toX,toZ),vertical=Math.abs(player.position.y-position.y);if(this.updateFuse(record,def,state,position,planar,vertical,dt))return;
    let{vx,vz}=this.desiredVelocity(def,state,position,player,planar,vertical,dt);const pushDrag=Math.exp(-8*dt);state.pushX*=pushDrag;state.pushZ*=pushDrag;const length=Math.hypot(vx,vz);
    if(length>0){
      const maxSpeed=def.speed+4.5,scale=length>maxSpeed?maxSpeed/length:1,nx=position.x+vx*scale*dt,nz=position.z+vz*scale*dt,nextY=this.world.highestSolid(nx,nz)+1,ground=this.world.getBlock(Math.floor(nx),Math.floor(nextY-1),Math.floor(nz));
      if(nextY>1&&ground!==BLOCK.WATER){
        const rise=nextY-position.y,drop=position.y-nextY;
        if(def.model==='spider'&&rise>1.05){const climb=resolveSpiderClimb(position.y,nextY,dt,{climbRate:def.climbRate,maxClimbHeight:def.maxClimbHeight});if(!climb.blocked){position.y=climb.y;if(climb.canAdvance){position.x=nx;position.z=nz;}this.store.setPosition(record.id,position);}}
        else if(rise<=1.05&&drop<=2){position.x=nx;position.y=nextY;position.z=nz;this.store.setPosition(record.id,position);}
      }
    }
    const visual=this.visuals.get(record.id);if(visual){if((def.attackStyle==='ranged'||def.attackStyle==='fuse')&&planar>.01)visual.rotation.y=Math.atan2(toX,toZ);else if(length>0)visual.rotation.y=Math.atan2(vx,vz);}this.attack(record,def,state,position,player,planar,vertical);
  }

  tick(dt,player,gameTime){this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTimer=1.15;this.trySpawnAround(player,gameTime);}for(const record of[...this.store.values()]){const position=this.store.getPosition(record.id);if(!position)continue;const dx=position.x-player.position.x,dz=position.z-player.position.z;if(dx*dx+dz*dz>48*48){this.despawn(record.id);continue;}this.moveAndAttack(record,dt,player);}}
  update(dt,player,gameTime){
    if(!player)return;this.aiAccumulator=Math.min(.5,this.aiAccumulator+dt);while(this.aiAccumulator>=.1){this.tick(.1,player,gameTime);this.aiAccumulator-=.1;}
    const smoothing=1-Math.exp(-14*dt);for(const record of this.store.values()){const position=this.store.getPosition(record.id),visual=this.visuals.get(record.id),def=HOSTILE_MOBS[record.type];if(!position||!visual||!def)continue;visual.position.lerp(tempA.set(position.x,position.y,position.z),smoothing);let scale=record.components.hurtPulse>0?1.08:1;if(def.attackStyle==='fuse'&&record.components.fuse>0){const progress=record.components.fuse/def.fuseTime;scale+=progress*.08*(.55+.45*Math.sin(record.components.fuse*28));}visual.scale.setScalar(scale);}
  }
  sleepBlockerNear(position){
    if(!position||![position.x,position.y,position.z].every(Number.isFinite))return null;
    const radius=Math.SQRT2*SLEEP_MONSTER_HORIZONTAL,candidates=this.store.nearby(position.x,position.z,radius),monsters=[];
    for(const record of candidates){const at=this.store.getPosition(record.id);if(at)monsters.push({id:record.id,type:record.type,position:at,entity:record});}
    return firstSleepBlocker(position,monsters);
  }

  dispose(){for(const id of[...this.visuals.keys()])this.despawn(id);this.store.clear();for(const geometry of this.resources.geometries)geometry.dispose();for(const material of this.resources.materials)material.dispose();this.resources.geometries.clear();this.resources.materials.clear();this.templates.clear();}
  get size(){return this.store.size;}
}
