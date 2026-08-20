import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCKS} from './blocks.js';
import {explosionDamage,explosionDestroysBlock,explosionKnockback} from './explosion-rules.js';

export class ExplosionSystem{
  constructor(scene,world,{onPlayerBlast=()=>{},onBlockDestroyed=()=>{}}={}){
    this.scene=scene;this.world=world;this.onPlayerBlast=onPlayerBlast;this.onBlockDestroyed=onBlockDestroyed;this.particles=[];
    this.sparkGeometry=new THREE.BoxGeometry(.1,.1,.1);this.smokeGeometry=new THREE.BoxGeometry(.22,.22,.22);this.flashGeometry=new THREE.IcosahedronGeometry(.55,1);
    this.sparkMaterial=new THREE.MeshBasicMaterial({color:0xffbd3d,toneMapped:false});this.emberMaterial=new THREE.MeshBasicMaterial({color:0xff6f1f,toneMapped:false});this.smokeMaterial=new THREE.MeshBasicMaterial({color:0x777777,transparent:true,opacity:.72,toneMapped:false});this.flashMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.88,depthWrite:false,toneMapped:false});
  }

  explode(position,{radius=3,damageRadius=6,maxDamage=12,player=null}={}){
    if(!position||!Number.isFinite(radius)||radius<=0)return{destroyed:0,damage:0};let destroyed=0;
    const minX=Math.floor(position.x-radius),maxX=Math.floor(position.x+radius),minY=Math.max(0,Math.floor(position.y-radius)),maxY=Math.floor(position.y+radius),minZ=Math.floor(position.z-radius),maxZ=Math.floor(position.z+radius);
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)for(let z=minZ;z<=maxZ;z++){
      const id=this.world.getBlock(x,y,z),def=BLOCKS[id];if(!def?.solid)continue;const dx=x+.5-position.x,dy=y+.5-position.y,dz=z+.5-position.z,distance=Math.hypot(dx,dy,dz);
      if(explosionDestroysBlock(distance,radius,def.hardness||0)&&this.world.setBlock(x,y,z,0)){destroyed++;this.onBlockDestroyed({id,block:def,position:{x,y,z},explosion:{x:position.x,y:position.y,z:position.z,radius}});}
    }
    let damage=0;if(player){const centerY=player.position.y+player.height*.5,distance=Math.hypot(player.position.x-position.x,centerY-position.y,player.position.z-position.z);damage=explosionDamage(distance,damageRadius,maxDamage);if(damage>0)this.onPlayerBlast({amount:damage,source:{x:position.x,z:position.z},knockback:explosionKnockback(distance,damageRadius),position});}
    this.spawnParticles(position,radius);return{destroyed,damage};
  }

  direction(speed,biasY=0){const theta=Math.random()*Math.PI*2,u=Math.random()*2-1,s=Math.sqrt(Math.max(0,1-u*u));return new THREE.Vector3(Math.cos(theta)*s*speed,u*speed+biasY,Math.sin(theta)*s*speed);}
  spawnParticles(position,radius){
    const flash=new THREE.Mesh(this.flashGeometry,this.flashMaterial);flash.position.copy(position);this.scene.add(flash);this.particles.push({kind:'flash',visual:flash,age:0,lifetime:.18,velocity:new THREE.Vector3()});
    for(let i=0;i<48;i++){const visual=new THREE.Mesh(this.sparkGeometry,i%3===0?this.emberMaterial:this.sparkMaterial);visual.position.copy(position).add(this.direction(Math.random()*.35));this.scene.add(visual);this.particles.push({kind:'spark',visual,age:0,lifetime:.32+Math.random()*.55,velocity:this.direction(3.2+Math.random()*radius*2.5,1.3)});}
    for(let i=0;i<18;i++){const visual=new THREE.Mesh(this.smokeGeometry,this.smokeMaterial);visual.position.copy(position).add(this.direction(Math.random()*.55));this.scene.add(visual);this.particles.push({kind:'smoke',visual,age:0,lifetime:.65+Math.random()*.8,velocity:this.direction(.45+Math.random()*1.4,1.1)});}
  }

  update(dt){
    for(let i=this.particles.length-1;i>=0;i--){const particle=this.particles[i];particle.age+=dt;if(particle.age>=particle.lifetime){this.scene.remove(particle.visual);this.particles.splice(i,1);continue;}const t=particle.age/particle.lifetime;
      if(particle.kind==='flash'){particle.visual.scale.setScalar(1+t*2.8);continue;}
      if(particle.kind==='spark'){particle.velocity.y-=9*dt;particle.visual.position.addScaledVector(particle.velocity,dt);particle.visual.rotation.x+=dt*8;particle.visual.rotation.y+=dt*11;particle.visual.scale.setScalar(Math.max(.04,1-t));continue;}
      particle.velocity.y+=.65*dt;particle.velocity.multiplyScalar(Math.pow(.35,dt));particle.visual.position.addScaledVector(particle.velocity,dt);particle.visual.rotation.y+=dt*.8;particle.visual.scale.setScalar(.55+t*1.9);
    }
  }

  snapshot(){const counts={flash:0,spark:0,smoke:0};for(const particle of this.particles)if(particle.kind in counts)counts[particle.kind]++;return Object.freeze({...counts,total:this.particles.length});}
  dispose(){for(const particle of this.particles)this.scene.remove(particle.visual);this.particles.length=0;for(const geometry of [this.sparkGeometry,this.smokeGeometry,this.flashGeometry])geometry.dispose();for(const material of [this.sparkMaterial,this.emberMaterial,this.smokeMaterial,this.flashMaterial])material.dispose();}
  get size(){return this.particles.length;}
}
