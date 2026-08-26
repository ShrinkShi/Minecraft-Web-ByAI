import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {aimVelocity,segmentAabbIntersectionT} from './projectile-rules.js';
import {requireAssetUrl} from './asset-manifest.js';

const Y_AXIS=new THREE.Vector3(0,1,0),tempDirection=new THREE.Vector3(),tempEnd=new THREE.Vector3();
function projectileSource(source,origin){
  if(!source||typeof source!=='object')return{x:origin.x,y:origin.y,z:origin.z};
  const normalized={x:Number.isFinite(source.x)?source.x:origin.x,y:Number.isFinite(source.y)?source.y:origin.y,z:Number.isFinite(source.z)?source.z:origin.z};
  if(source.entitySystem==='hostile'||source.entitySystem==='passive')normalized.entitySystem=source.entitySystem;if(Number.isInteger(source.entityId))normalized.entityId=source.entityId;if(typeof source.entityType==='string')normalized.entityType=source.entityType;return normalized;
}

export class ProjectileSystem{
  constructor(scene,world,{onPlayerHit=()=>{}}={}){
    this.scene=scene;this.world=world;this.onPlayerHit=onPlayerHit;this.projectiles=[];this.mobSystems=[];this.simulationTimeMs=0;
    this.arrowTexture=new THREE.TextureLoader().load(requireAssetUrl('item.arrow'));this.arrowTexture.magFilter=THREE.NearestFilter;this.arrowTexture.minFilter=THREE.NearestFilter;this.arrowTexture.generateMipmaps=false;this.arrowTexture.colorSpace=THREE.SRGBColorSpace;
    this.arrowGeometry=new THREE.PlaneGeometry(.76,.76);this.arrowMaterial=new THREE.MeshBasicMaterial({map:this.arrowTexture,transparent:true,alphaTest:.04,side:THREE.DoubleSide,toneMapped:false});
  }

  setMobSystems({passiveMobs=null,hostileMobs=null}={}){this.mobSystems=[];if(passiveMobs)this.mobSystems.push({kind:'passive',system:passiveMobs});if(hostileMobs)this.mobSystems.push({kind:'hostile',system:hostileMobs});return this;}
  createArrowVisual(){const group=new THREE.Group();group.userData.projectileModel='item.arrow';const a=new THREE.Mesh(this.arrowGeometry,this.arrowMaterial),b=new THREE.Mesh(this.arrowGeometry,this.arrowMaterial);a.rotation.z=-Math.PI/4;b.rotation.set(0,Math.PI/2,-Math.PI/4);group.add(a,b);return group;}

  spawnArrow(origin,target,{damage=2,speed=15,gravity=4,lifetime=8,source=null}={}){
    if(!origin||!target||!Number.isFinite(damage)||damage<=0||!Number.isFinite(lifetime)||lifetime<=0)return null;
    const velocityData=aimVelocity(origin,target,speed,gravity),velocity=new THREE.Vector3(velocityData.x,velocityData.y,velocityData.z),visual=this.createArrowVisual();visual.position.copy(origin);this.orient(visual,velocity);this.scene.add(visual);
    const projectile={kind:'arrow',visual,velocity,gravity,damage,age:0,lifetime,source:projectileSource(source,origin)};this.projectiles.push(projectile);return projectile;
  }

  orient(visual,velocity){tempDirection.copy(velocity);if(tempDirection.lengthSq()>.000001){tempDirection.normalize();visual.quaternion.setFromUnitVectors(Y_AXIS,tempDirection);}}
  remove(projectile){const i=this.projectiles.indexOf(projectile);if(i>=0)this.projectiles.splice(i,1);this.scene.remove(projectile.visual);}
  closestMobHit(start,end,projectile){
    let best=null,bestT=Infinity;for(const entry of this.mobSystems){const excludeId=projectile.source?.entitySystem===entry.kind?projectile.source?.entityId:null,hit=entry.system?.projectileHit?.(start,end,{excludeId});if(hit&&hit.t<bestT){bestT=hit.t;best={...hit,kind:entry.kind,system:entry.system};}}return best;
  }
  applyMobHit(hit,projectile){if(!hit?.entity||!hit.system)return false;const method=typeof hit.system.hurtByProjectile==='function'?'hurtByProjectile':'hurt';hit.system[method]?.(hit.entity,projectile.damage,projectile.source,this.simulationTimeMs);return true;}

  update(dt,player){
    if(!Number.isFinite(dt)||dt<=0)return;this.simulationTimeMs+=dt*1000;
    for(let i=this.projectiles.length-1;i>=0;i--){
      const projectile=this.projectiles[i];projectile.age+=dt;if(projectile.age>=projectile.lifetime){this.remove(projectile);continue;}
      const start=projectile.visual.position,velocity=projectile.velocity;velocity.y-=projectile.gravity*dt;tempEnd.copy(start).addScaledVector(velocity,dt);tempDirection.copy(tempEnd).sub(start);const travelDistance=tempDirection.length();let blockDistance=Infinity;
      if(travelDistance>.000001){const hit=this.world.raycast(start,tempDirection.normalize(),travelDistance+.03);if(hit)blockDistance=Math.max(0,hit.distance);}
      let playerT=null;if(player&&player.mode!=='spectator'&&player.mode!=='creative'){const pad=.08,bounds={minX:player.position.x-player.radius-pad,maxX:player.position.x+player.radius+pad,minY:player.position.y-pad,maxY:player.position.y+player.height+pad,minZ:player.position.z-player.radius-pad,maxZ:player.position.z+player.radius+pad};playerT=segmentAabbIntersectionT(start,tempEnd,bounds);}
      const mobHit=this.closestMobHit(start,tempEnd,projectile),mobDistance=mobHit?mobHit.t*travelDistance:Infinity,playerDistance=playerT===null?Infinity:playerT*travelDistance;
      if(mobDistance<=playerDistance+.000001&&mobDistance<=blockDistance+.0001){this.applyMobHit(mobHit,projectile);this.remove(projectile);continue;}
      if(playerDistance<=mobDistance+.000001&&playerDistance<=blockDistance+.0001){this.onPlayerHit({amount:projectile.damage,source:projectile.source,projectile});this.remove(projectile);continue;}
      if(blockDistance<=travelDistance+.03){this.remove(projectile);continue;}start.copy(tempEnd);this.orient(projectile.visual,velocity);
    }
  }

  snapshot(){return Object.freeze(this.projectiles.map(projectile=>Object.freeze({kind:projectile.kind,model:projectile.visual.userData.projectileModel||null,position:Object.freeze(projectile.visual.position.toArray()),age:projectile.age,damage:projectile.damage,source:projectile.source?Object.freeze({...projectile.source}):null})));}
  dispose(){for(const projectile of[...this.projectiles])this.remove(projectile);this.mobSystems=[];this.arrowGeometry.dispose();this.arrowMaterial.dispose();this.arrowTexture.dispose();}
  get size(){return this.projectiles.length;}
}