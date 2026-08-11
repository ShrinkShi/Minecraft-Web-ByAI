import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCKS} from './blocks.js';

export class PlayerController{
  constructor(camera,canvas,world,scene){
    this.camera=camera;this.canvas=canvas;this.world=world;this.scene=scene;
    this.position=new THREE.Vector3(0,40,0);this.velocity=new THREE.Vector3();
    this.yaw=0;this.pitch=0;this.keys=new Set();this.grounded=false;this.flying=false;this.viewMode=0;
    this.mode='survival';this.hp=20;this.hunger=20;this.saturation=5;
    this.eye=1.62;this.height=1.8;this.radius=.3;this.walk=4.3;this.sprint=5.6;
    this.avatar=this.createAvatar();this.bind();
  }

  createAvatar(){
    if(!this.scene)return null;
    const group=new THREE.Group();group.userData.transient=true;
    const skin=new THREE.MeshLambertMaterial({color:0xc58a63}),shirt=new THREE.MeshLambertMaterial({color:0x38a5a5}),pants=new THREE.MeshLambertMaterial({color:0x334b8c});
    const part=(w,h,d,mat,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;};
    part(.5,.5,.5,skin,0,1.55,0);part(.55,.7,.28,shirt,0,1.0,0);part(.18,.68,.22,skin,-.38,1.0,0);part(.18,.68,.22,skin,.38,1.0,0);part(.22,.75,.24,pants,-.14,.3,0);part(.22,.75,.24,pants,.14,.3,0);
    this.scene.add(group);group.visible=false;return group;
  }

  bind(){
    this.onKeyDown=e=>{this.keys.add(e.code);if(e.code==='Space')e.preventDefault();};
    this.onKeyUp=e=>this.keys.delete(e.code);
    this.onMove=e=>{if(document.pointerLockElement!==this.canvas)return;this.yaw-=e.movementX*.0022;this.pitch-=e.movementY*.0022;this.pitch=Math.max(-1.553,Math.min(1.553,this.pitch));};
    window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);document.addEventListener('mousemove',this.onMove);
  }

  setMode(mode){this.mode=mode;this.flying=mode==='creative'||mode==='spectator';}
  cycleView(){this.viewMode=(this.viewMode+1)%3;this.syncCamera();return this.viewMode;}

  spawn(x,z){const y=this.world.highestSolid(x,z)+1.001;this.position.set(x+.5,y,z+.5);this.velocity.set(0,0,0);this.syncCamera();}

  restore(snapshot){
    if(!snapshot)return false;const p=snapshot.position;if(!p||![p.x,p.y,p.z].every(Number.isFinite))return false;
    this.position.set(p.x,p.y,p.z);this.velocity.set(0,0,0);this.yaw=Number.isFinite(snapshot.yaw)?snapshot.yaw:0;this.pitch=Number.isFinite(snapshot.pitch)?snapshot.pitch:0;
    this.hp=Number.isFinite(snapshot.hp)?Math.max(0,Math.min(20,snapshot.hp)):20;this.hunger=Number.isFinite(snapshot.hunger)?Math.max(0,Math.min(20,snapshot.hunger)):20;this.saturation=Number.isFinite(snapshot.saturation)?Math.max(0,Math.min(20,snapshot.saturation)):5;
    this.viewMode=Number.isInteger(snapshot.viewMode)?((snapshot.viewMode%3)+3)%3:0;if(this.collides(this.position)&&this.mode!=='spectator')return false;this.syncCamera();return true;
  }

  snapshot(){return{position:{x:this.position.x,y:this.position.y,z:this.position.z},yaw:this.yaw,pitch:this.pitch,hp:this.hp,hunger:this.hunger,saturation:this.saturation,mode:this.mode,viewMode:this.viewMode};}

  collides(pos){
    if(this.mode==='spectator')return false;
    const r=this.radius,h=this.height,eps=.001,minX=Math.floor(pos.x-r+eps),maxX=Math.floor(pos.x+r-eps),minY=Math.floor(pos.y+eps),maxY=Math.floor(pos.y+h-eps),minZ=Math.floor(pos.z-r+eps),maxZ=Math.floor(pos.z+r-eps);
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)for(let z=minZ;z<=maxZ;z++){if(BLOCKS[this.world.getBlock(x,y,z)]?.solid)return true;}return false;
  }

  moveAxis(axis,amount){if(!amount)return;const next=this.position.clone();next[axis]+=amount;if(!this.collides(next)){this.position.copy(next);return true;}if(axis==='y'&&amount<0)this.grounded=true;this.velocity[axis]=0;return false;}

  update(dt){
    dt=Math.min(dt,.05);const forward=(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0),side=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0),sprint=this.keys.has('ControlLeft')||this.keys.has('ControlRight'),sneak=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');
    const speed=(sprint?this.sprint:this.walk)*(sneak ? .35 : 1),dir=new THREE.Vector3();if(forward||side)dir.set(Math.sin(this.yaw)*forward+Math.cos(this.yaw)*side,0,-Math.cos(this.yaw)*forward+Math.sin(this.yaw)*side).normalize().multiplyScalar(speed*dt);
    if(this.flying){const vertical=((this.keys.has('Space')?1:0)-(sneak?1:0))*7*dt;this.moveAxis('x',dir.x);this.moveAxis('z',dir.z);this.moveAxis('y',vertical);this.velocity.set(0,0,0);}else{this.grounded=false;this.velocity.y-=24*dt;if(this.keys.has('Space')&&this.isGroundedProbe())this.velocity.y=8.2;this.moveAxis('x',dir.x);this.moveAxis('z',dir.z);this.moveAxis('y',this.velocity.y*dt);if(this.position.y<-10){this.hp=Math.max(0,this.hp-5);this.spawn(0,0);}}
    this.syncCamera();
  }

  isGroundedProbe(){const p=this.position.clone();p.y-=.06;return this.collides(p);}
  eyePosition(target=new THREE.Vector3()){return target.set(this.position.x,this.position.y+this.eye,this.position.z);}
  lookDirection(target=new THREE.Vector3()){const cp=Math.cos(this.pitch);return target.set(Math.sin(this.yaw)*cp,Math.sin(this.pitch),-Math.cos(this.yaw)*cp).normalize();}

  syncCamera(){
    const target=this.eyePosition(new THREE.Vector3()),forward=this.lookDirection(new THREE.Vector3());
    if(this.viewMode===0){this.camera.position.copy(target);this.camera.rotation.order='YXZ';this.camera.rotation.y=this.yaw;this.camera.rotation.x=this.pitch;}
    else{const sign=this.viewMode===1?-1:1;this.camera.position.copy(target).addScaledVector(forward,sign*4).add(new THREE.Vector3(0,.35,0));this.camera.lookAt(target);}
    if(this.avatar){this.avatar.visible=this.viewMode!==0;this.avatar.position.copy(this.position);this.avatar.rotation.y=this.yaw;}
  }

  dispose(){window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);document.removeEventListener('mousemove',this.onMove);if(this.avatar){this.scene?.remove(this.avatar);for(const child of this.avatar.children){child.geometry?.dispose();child.material?.dispose();}}}
}
