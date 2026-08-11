import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCKS} from './blocks.js';
import {explosionDamage,explosionDestroysBlock,explosionKnockback} from './explosion-rules.js';

export class ExplosionSystem{
  constructor(scene,world,{onPlayerBlast=()=>{}}={}){
    this.scene=scene;this.world=world;this.onPlayerBlast=onPlayerBlast;this.particles=[];
    this.geometry=new THREE.BoxGeometry(.14,.14,.14);this.material=new THREE.MeshBasicMaterial({color:0xffb12e});
  }

  explode(position,{radius=3,damageRadius=6,maxDamage=12,player=null}={}){
    if(!position||!Number.isFinite(radius)||radius<=0)return{destroyed:0,damage:0};let destroyed=0;
    const minX=Math.floor(position.x-radius),maxX=Math.floor(position.x+radius),minY=Math.max(0,Math.floor(position.y-radius)),maxY=Math.floor(position.y+radius),minZ=Math.floor(position.z-radius),maxZ=Math.floor(position.z+radius);
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)for(let z=minZ;z<=maxZ;z++){
      const id=this.world.getBlock(x,y,z),def=BLOCKS[id];if(!def?.solid)continue;const dx=x+.5-position.x,dy=y+.5-position.y,dz=z+.5-position.z,distance=Math.hypot(dx,dy,dz);if(explosionDestroysBlock(distance,radius,def.hardness||0)&&this.world.setBlock(x,y,z,0))destroyed++;
    }
    let damage=0;if(player){const centerY=player.position.y+player.height*.5,distance=Math.hypot(player.position.x-position.x,centerY-position.y,player.position.z-position.z);damage=explosionDamage(distance,damageRadius,maxDamage);if(damage>0)this.onPlayerBlast({amount:damage,source:{x:position.x,z:position.z},knockback:explosionKnockback(distance,damageRadius),position});}
    this.spawnParticles(position,radius);return{destroyed,damage};
  }

  spawnParticles(position,radius){
    for(let i=0;i<24;i++){const visual=new THREE.Mesh(this.geometry,this.material);visual.position.copy(position);this.scene.add(visual);const theta=Math.random()*Math.PI*2,u=Math.random()*2-1,s=Math.sqrt(1-u*u),speed=2.5+Math.random()*radius*2;this.particles.push({visual,age:0,lifetime:.35+Math.random()*.45,velocity:new THREE.Vector3(Math.cos(theta)*s*speed,u*speed+1.2,Math.sin(theta)*s*speed)});}
  }

  update(dt){
    for(let i=this.particles.length-1;i>=0;i--){const particle=this.particles[i];particle.age+=dt;if(particle.age>=particle.lifetime){this.scene.remove(particle.visual);this.particles.splice(i,1);continue;}particle.velocity.y-=8*dt;particle.visual.position.addScaledVector(particle.velocity,dt);const scale=Math.max(.05,1-particle.age/particle.lifetime);particle.visual.scale.setScalar(scale);}
  }

  dispose(){for(const particle of this.particles)this.scene.remove(particle.visual);this.particles.length=0;this.geometry.dispose();this.material.dispose();}
  get size(){return this.particles.length;}
}
