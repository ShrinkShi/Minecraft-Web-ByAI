import {randomUUID} from 'node:crypto';
import {assertClientSessionId} from '../src/client-input-envelope.js';
import {assertRemotePlayerId} from '../src/remote-player-replication.js';

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function cloneSnapshot(snapshot){if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new TypeError('authoritative snapshot must be an object');return{tick:snapshot.tick,position:{...snapshot.position},velocity:{...snapshot.velocity},yaw:snapshot.yaw,pitch:snapshot.pitch,mode:snapshot.mode,grounded:snapshot.grounded,swimCoverage:snapshot.swimCoverage,voided:snapshot.voided};}
function remoteState(entry,snapshot=entry.snapshot){return{playerId:entry.playerId,...cloneSnapshot(snapshot)};}
function defaultPlayerIdFactory(){return `p:${randomUUID()}`;}

export class RemotePlayerReplicationHub{
  constructor({sendSpawn,sendSnapshot,sendDespawn,playerIdFactory=defaultPlayerIdFactory,onSendError=()=>{}}={}){
    this.sendSpawn=callback(sendSpawn,'sendSpawn');this.sendSnapshot=callback(sendSnapshot,'sendSnapshot');this.sendDespawn=callback(sendDespawn,'sendDespawn');this.playerIdFactory=callback(playerIdFactory,'playerIdFactory');this.onSendError=callback(onSendError,'onSendError');this.entries=new Map();this.playerIds=new Set();
  }

  get sessionCount(){return this.entries.size;}
  hasSession(session){return this.entries.has(assertClientSessionId(session));}
  playerIdForSession(session){return this.entries.get(assertClientSessionId(session))?.playerId||null;}
  snapshotForSession(session){const entry=this.entries.get(assertClientSessionId(session));return entry?remoteState(entry):null;}

  reportSendError(event){try{this.onSendError(event);}catch{}}
  sendExistingToNew(targetSession,entry){const wire=this.sendSpawn(targetSession,remoteState(entry));if(wire===null||wire===undefined)throw new Error(`remote spawn transport unavailable for new session ${targetSession}`);return wire;}
  sendBestEffort(kind,targetSession,state){
    try{const fn=kind==='spawn'?this.sendSpawn:kind==='snapshot'?this.sendSnapshot:this.sendDespawn,wire=kind==='despawn'?fn(targetSession,state.playerId):fn(targetSession,state);if(wire===null||wire===undefined)this.reportSendError({kind,targetSession,playerId:state.playerId,error:new Error('remote replication transport unavailable')});return wire;}catch(error){this.reportSendError({kind,targetSession,playerId:state.playerId,error});return null;}
  }

  join(session,snapshot){
    session=assertClientSessionId(session);if(this.entries.has(session))throw new Error(`remote replication session already joined: ${session}`);const playerId=assertRemotePlayerId(this.playerIdFactory(session));if(this.playerIds.has(playerId))throw new Error(`duplicate remote playerId: ${playerId}`);const candidate={session,playerId,snapshot:cloneSnapshot(snapshot)};
    for(const entry of this.entries.values())this.sendExistingToNew(session,entry);
    this.entries.set(session,candidate);this.playerIds.add(playerId);
    for(const entry of this.entries.values())if(entry.session!==session)this.sendBestEffort('spawn',entry.session,remoteState(candidate));
    return remoteState(candidate);
  }

  update(session,snapshot){
    session=assertClientSessionId(session);const entry=this.entries.get(session);if(!entry)return{updated:false,broadcast:0};entry.snapshot=cloneSnapshot(snapshot);let broadcast=0;const state=remoteState(entry);for(const target of this.entries.values())if(target.session!==session){if(this.sendBestEffort('snapshot',target.session,state)!==null)broadcast++;}return{updated:true,broadcast,state};
  }

  leave(session){
    session=assertClientSessionId(session);const entry=this.entries.get(session);if(!entry)return false;this.entries.delete(session);this.playerIds.delete(entry.playerId);const state={playerId:entry.playerId};for(const target of this.entries.values())this.sendBestEffort('despawn',target.session,state);return true;
  }

  close(){this.entries.clear();this.playerIds.clear();}
}
