import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCKS} from './blocks.js';

export class ExperienceOrbSystem{
  constructor(scene,world,onPickup=()=>{}){
    this.scene=scene;this.world=world;this.onPickup=onPickup;this.orbs=[];
    this.geometry=new THREE.SphereGeometry(.13,6,4);this.material=new THREE.MeshBasicMaterial({color:0xb7ff32});
  }

  spawn(value,position){
    if(!Number.isFinite(value)||!position)return null;const amount=Math.floor(value);if(amount<=0)return null;
    const visual=new THREE.Mesh(this.geometry,this.material);visual.position.copy(position);this.scene.add(visual);
    const orb={value:amount,visual,age:0,pickupDelay:.35,velocity:new THREE.Vector3((Math.random()-.5)*1.8,2.6,(Math.random()-.5)*1.8)};this.orbs.push(orb);return orb;
  }

  remove(orb){const i=this.orbs.indexOf(orb);if(i>=0)this.orbs.splice(i,1);this.scene.remove(orb.visual);}

  update(dt,player){
    for(let i=this.orbs.length-1;i>=0;i--){
      const orb=this.orbs[i];orb.age+=dt;if(orb.age>=300){this.remove(orb);continue;}orb.pickupDelay=Math.max(0,orb.pickupDelay-dt);
      const p=orb.visual.position;if(player){const dx=player.position.x-p.x,dy=player.position.y+.8-p.y,dz=player.position.z-p.z,dist2=dx*dx+dy*dy+dz*dz;if(orb.pickupDelay===0&&dist2<36&&dist2>.0001){const dist=Math.sqrt(dist2),pull=Math.min(12,3.5+6/dist);orb.velocity.x+=dx/dist*pull*dt;orb.velocity.y+=dy/dist*pull*dt;orb.velocity.z+=dz/dist*pull*dt;}}
      orb.velocity.y-=12*dt;orb.velocity.x*=Math.pow(.22,dt);orb.velocity.z*=Math.pow(.22,dt);const next=p.clone().addScaledVector(orb.velocity,dt),bx=Math.floor(next.x),bz=Math.floor(next.z),belowY=Math.floor(next.y-.13),below=BLOCKS[this.world.getBlock(bx,belowY,bz)];
      if(below?.solid&&next.y-.13<belowY+1&&orb.velocity.y<0){next.y=belowY+1.13;orb.velocity.y*=-.28;if(Math.abs(orb.velocity.y)<.2)orb.velocity.y=0;}p.copy(next);visualPulse(orb);
      if(orb.pickupDelay===0&&player){const dx=player.position.x-p.x,dy=player.position.y+.8-p.y,dz=player.position.z-p.z;if(dx*dx+dy*dy+dz*dz<1.6){this.onPickup(orb.value);this.remove(orb);}}
    }
  }

  dispose(){for(const orb of[...this.orbs])this.remove(orb);this.geometry.dispose();this.material.dispose();}
  get size(){return this.orbs.length;}
}

function visualPulse(orb){const scale=.85+Math.sin(orb.age*8)*.15;orb.visual.scale.setScalar(scale);orb.visual.rotation.y+=.08;}
