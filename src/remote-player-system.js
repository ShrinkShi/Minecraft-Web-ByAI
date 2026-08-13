import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {AuthoritativePlayerInterpolator} from './authoritative-player-interpolator.js';
import {assertRemotePlayerId} from './remote-player-replication.js';

function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function cloneState(value){return value?{...value,position:{...value.position},velocity:{...value.velocity}}:null;}

export class RemotePlayerSystem{
  constructor(scene,{tickRate=20}={}){
    if(!scene||typeof scene.add!=='function'||typeof scene.remove!=='function')throw new TypeError('scene must be a Three.js scene-like object');
    this.scene=scene;this.tickRate=finite(tickRate,'tickRate');if(this.tickRate<=0)throw new RangeError('tickRate must be greater than zero');this.players=new Map();
    this.geometries={head:new THREE.BoxGeometry(.5,.5,.5),body:new THREE.BoxGeometry(.5,.7,.28),arm:new THREE.BoxGeometry(.18,.68,.22),leg:new THREE.BoxGeometry(.22,.72,.24)};
    this.materials={skin:new THREE.MeshLambertMaterial({color:0xc98f68}),shirt:new THREE.MeshLambertMaterial({color:0x3f87a6}),pants:new THREE.MeshLambertMaterial({color:0x334c7a}),shoe:new THREE.MeshLambertMaterial({color:0x2b2b2b})};this.disposed=false;
  }

  get size(){return this.players.size;}
  has(playerId){return this.players.has(assertRemotePlayerId(playerId));}
  state(playerId){return cloneState(this.players.get(assertRemotePlayerId(playerId))?.interpolator.current()||null);}
  states(){return [...this.players.entries()].map(([playerId,entry])=>({playerId,state:cloneState(entry.interpolator.current())}));}

  createModel(){
    const root=new THREE.Group(),bodyPivot=new THREE.Group(),head=new THREE.Mesh(this.geometries.head,this.materials.skin),body=new THREE.Mesh(this.geometries.body,this.materials.shirt),leftArm=new THREE.Mesh(this.geometries.arm,this.materials.skin),rightArm=new THREE.Mesh(this.geometries.arm,this.materials.skin),leftLeg=new THREE.Mesh(this.geometries.leg,this.materials.pants),rightLeg=new THREE.Mesh(this.geometries.leg,this.materials.pants);
    head.position.set(0,1.53,0);body.position.set(0,1.0,0);leftArm.position.set(-.35,1.0,0);rightArm.position.set(.35,1.0,0);leftLeg.position.set(-.13,.37,0);rightLeg.position.set(.13,.37,0);bodyPivot.add(head,body,leftArm,rightArm,leftLeg,rightLeg);root.add(bodyPivot);root.userData.remotePlayer=true;return{root,head,leftArm,rightArm,leftLeg,rightLeg,walkPhase:0};
  }

  apply(entry,state,dt=0){
    const {model}=entry,{root,head,leftArm,rightArm,leftLeg,rightLeg}=model;root.position.set(state.position.x,state.position.y,state.position.z);root.rotation.y=state.yaw;head.rotation.x=-state.pitch;root.visible=!state.voided;
    const horizontal=Math.hypot(state.velocity.x,state.velocity.z),walking=horizontal>.08;if(walking)model.walkPhase=(model.walkPhase+dt*Math.min(14,5+horizontal*1.6))%(Math.PI*2);const swing=walking?Math.sin(model.walkPhase)*.55:0;leftArm.rotation.x=swing;rightArm.rotation.x=-swing;leftLeg.rotation.x=-swing;rightLeg.rotation.x=swing;
  }

  spawn(message){
    if(this.disposed)throw new Error('remote player system is disposed');const playerId=assertRemotePlayerId(message?.playerId);if(this.players.has(playerId))throw new Error(`remote player already exists: ${playerId}`);const interpolator=new AuthoritativePlayerInterpolator({tickRate:this.tickRate});interpolator.accept(message);const model=this.createModel(),entry={playerId,interpolator,model};this.players.set(playerId,entry);this.scene.add(model.root);this.apply(entry,interpolator.current());return cloneState(interpolator.current());
  }

  snapshot(message){
    if(this.disposed)throw new Error('remote player system is disposed');const playerId=assertRemotePlayerId(message?.playerId),entry=this.players.get(playerId);if(!entry)throw new Error(`unknown remote player: ${playerId}`);return entry.interpolator.accept(message);
  }

  despawn(playerId){playerId=assertRemotePlayerId(playerId);const entry=this.players.get(playerId);if(!entry)return false;this.players.delete(playerId);this.scene.remove(entry.model.root);return true;}
  update(dt){dt=finite(dt,'remote player dt');if(dt<0)throw new RangeError('remote player dt must be non-negative');for(const entry of this.players.values()){const state=entry.interpolator.step(dt);if(state)this.apply(entry,state,dt);}return this.size;}

  dispose(){
    if(this.disposed)return false;for(const entry of this.players.values())this.scene.remove(entry.model.root);this.players.clear();for(const geometry of Object.values(this.geometries))geometry.dispose();for(const material of Object.values(this.materials))material.dispose();this.disposed=true;return true;
  }
}
