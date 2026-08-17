import {AuthoritativePlayerInterpolator} from './authoritative-player-interpolator.js';
import {assertRemotePlayerId} from './remote-player-replication.js';
import {PlayerModelFactory} from './player-model-renderer.js';

function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function interpolationState(message){const playerId=assertRemotePlayerId(message?.playerId);return{session:playerId,tick:message.tick,position:{...message.position},velocity:{...message.velocity},yaw:message.yaw,pitch:message.pitch,mode:message.mode,grounded:message.grounded,swimCoverage:message.swimCoverage,voided:message.voided};}
function publicState(playerId,value){if(!value)return null;const{session,...state}=value;return{playerId,...state,position:{...state.position},velocity:{...state.velocity}};}

export class RemotePlayerSystem{
  constructor(scene,{tickRate=20}={}){
    if(!scene||typeof scene.add!=='function'||typeof scene.remove!=='function')throw new TypeError('scene must be a Three.js scene-like object');
    this.scene=scene;this.tickRate=finite(tickRate,'tickRate');if(this.tickRate<=0)throw new RangeError('tickRate must be greater than zero');this.players=new Map();this.modelFactory=new PlayerModelFactory();this.disposed=false;
  }

  get size(){return this.players.size;}
  has(playerId){return this.players.has(assertRemotePlayerId(playerId));}
  state(playerId){playerId=assertRemotePlayerId(playerId);return publicState(playerId,this.players.get(playerId)?.interpolator.current()||null);}
  states(){return [...this.players.entries()].map(([playerId,entry])=>publicState(playerId,entry.interpolator.current()));}

  createModel(){const visual=this.modelFactory.create();visual.root.userData.remotePlayer=true;return visual;}

  apply(entry,state,dt=0){
    const visual=entry.model,root=visual.root;root.position.set(state.position.x,state.position.y,state.position.z);root.rotation.y=state.yaw;root.visible=!state.voided;
    const horizontal=Math.hypot(state.velocity.x,state.velocity.z),sprinting=horizontal>5;
    this.modelFactory.animate(visual,dt,{speed:horizontal,sprint:sprinting,headPitch:-state.pitch,headYaw:0,dead:false});
  }

  spawn(message){
    if(this.disposed)throw new Error('remote player system is disposed');const playerId=assertRemotePlayerId(message?.playerId);if(this.players.has(playerId))throw new Error(`remote player already exists: ${playerId}`);const interpolator=new AuthoritativePlayerInterpolator({tickRate:this.tickRate});interpolator.accept(interpolationState(message));const model=this.createModel(),entry={playerId,interpolator,model};this.players.set(playerId,entry);this.scene.add(model.root);this.apply(entry,interpolator.current());return this.state(playerId);
  }

  snapshot(message){
    if(this.disposed)throw new Error('remote player system is disposed');const playerId=assertRemotePlayerId(message?.playerId),entry=this.players.get(playerId);if(!entry)throw new Error(`unknown remote player: ${playerId}`);return entry.interpolator.accept(interpolationState(message));
  }

  despawn(playerId){playerId=assertRemotePlayerId(playerId);const entry=this.players.get(playerId);if(!entry)return false;this.players.delete(playerId);this.scene.remove(entry.model.root);return true;}
  update(dt){dt=finite(dt,'remote player dt');if(dt<0)throw new RangeError('remote player dt must be non-negative');for(const entry of this.players.values()){const state=entry.interpolator.step(dt);if(state)this.apply(entry,state,dt);}return this.size;}

  dispose(){if(this.disposed)return false;for(const entry of this.players.values())this.scene.remove(entry.model.root);this.players.clear();this.modelFactory.dispose();this.disposed=true;return true;}
}
