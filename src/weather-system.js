import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {WEATHER_MAX_SEGMENTS,precipitationProfile} from './weather-rules.js';

const RADIUS=16;
const TOP_MIN=7;
const TOP_RANGE=13;
const BOTTOM_OFFSET=4;
const TAU=Math.PI*2;

function hash01(value){
  let x=(value|0)^0x9e3779b9;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return((x^(x>>>15))>>>0)/4294967296;
}

export class WeatherSystem{
  constructor(scene,{maxSegments=WEATHER_MAX_SEGMENTS}={}){
    if(!scene)throw new TypeError('scene is required');
    if(!Number.isInteger(maxSegments)||maxSegments<=0)throw new RangeError('maxSegments must be a positive integer');
    this.scene=scene;this.maxSegments=maxSegments;this.type='clear';this.profile=precipitationProfile('clear',maxSegments);this.activeCount=0;
    this.positions=new Float32Array(maxSegments*6);this.x=new Float32Array(maxSegments);this.y=new Float32Array(maxSegments);this.z=new Float32Array(maxSegments);this.speedScale=new Float32Array(maxSegments);this.generation=new Uint32Array(maxSegments);
    this.geometry=new THREE.BufferGeometry();this.attribute=new THREE.BufferAttribute(this.positions,3);this.attribute.setUsage(THREE.DynamicDrawUsage);this.geometry.setAttribute('position',this.attribute);this.geometry.setDrawRange(0,0);
    this.material=new THREE.LineBasicMaterial({color:0xcfe9ff,transparent:true,opacity:0,depthWrite:false});
    this.lines=new THREE.LineSegments(this.geometry,this.material);this.lines.frustumCulled=false;this.lines.renderOrder=3;this.lines.visible=false;this.scene.add(this.lines);
  }

  setWeather(type){
    this.profile=precipitationProfile(type,this.maxSegments);this.type=type;this.activeCount=this.profile.count;this.material.opacity=this.profile.opacity;this.geometry.setDrawRange(0,this.activeCount*2);this.lines.visible=this.activeCount>0;
    if(this.activeCount>0)for(let i=0;i<this.activeCount;i++)this.respawn(i,null,true);
    return this.profile;
  }

  respawn(i,player,initial=false){
    const generation=initial?0:++this.generation[i],base=i*17+generation*104729,u=hash01(base+1),v=hash01(base+2),w=hash01(base+3),q=hash01(base+4),angle=u*TAU,radius=Math.sqrt(v)*RADIUS,px=player?.position?.x||0,py=player?.position?.y||0,pz=player?.position?.z||0;
    this.x[i]=px+Math.cos(angle)*radius;this.z[i]=pz+Math.sin(angle)*radius;this.y[i]=py+TOP_MIN+w*TOP_RANGE;this.speedScale[i]=.82+q*.36;
  }

  update(dt,player){
    if(!Number.isFinite(dt)||dt<0)throw new RangeError('dt must be finite and >= 0');
    if(!player||this.activeCount===0){this.lines.visible=false;return;}
    this.lines.visible=true;const p=player.position,profile=this.profile,minY=p.y-BOTTOM_OFFSET,maxDistance=RADIUS*1.35,maxDistanceSq=maxDistance*maxDistance;
    for(let i=0;i<this.activeCount;i++){
      if(this.generation[i]===0&&this.y[i]<TOP_MIN)this.respawn(i,player,true);
      this.y[i]-=profile.fallSpeed*this.speedScale[i]*dt;this.x[i]+=profile.windX*dt;this.z[i]+=profile.windZ*dt;
      const dx=this.x[i]-p.x,dz=this.z[i]-p.z;
      if(this.y[i]<minY||dx*dx+dz*dz>maxDistanceSq)this.respawn(i,player,false);
      const o=i*6,x=this.x[i],y=this.y[i],z=this.z[i];this.positions[o]=x;this.positions[o+1]=y;this.positions[o+2]=z;this.positions[o+3]=x-profile.windX*.025;this.positions[o+4]=y-profile.length;this.positions[o+5]=z-profile.windZ*.025;
    }
    this.attribute.needsUpdate=true;
  }

  dispose(){this.scene.remove(this.lines);this.geometry.dispose();this.material.dispose();}
}
