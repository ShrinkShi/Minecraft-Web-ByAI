import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeServerWorldInfo} from '../src/server-world-info.js';
import {encodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {encodeRemotePlayerSpawn,encodeRemotePlayerSnapshot,encodeRemotePlayerDespawn} from '../src/remote-player-replication.js';
import {MultiplayerWebSocketClient} from '../src/websocket-client.js';
import {MultiplayerMovementSession} from '../src/multiplayer-movement-session.js';

class FakeSocket{
  constructor(){this.protocol=MULTIPLAYER_SUBPROTOCOL;this.readyState=0;this.sent=[];this.closed=[];this.listeners=new Map();}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  emit(type,event={}){for(const listener of this.listeners.get(type)||[])listener(event);}
  open(){this.readyState=1;this.emit('open',{});}
  message(value){this.emit('message',{data:JSON.stringify(value)});}
  send(value){this.sent.push(value);}
  close(code=1000,reason=''){this.closed.push({code,reason});this.readyState=3;this.emit('close',{code,reason});}
}
const info=session=>encodeServerWorldInfo({session,worldId:'remote-buffer-world',terrainVersion:1,seed:'seed',prompt:'平原',tickRate:20});
const self=session=>encodeServerPlayerSnapshot({session,tick:0,position:{x:.5,y:25.001,z:.5},velocity:{x:0,y:0,z:0},yaw:0,pitch:0,mode:'survival',grounded:true,swimCoverage:0,voided:false});
const remote=(playerId,tick,x)=>({playerId,tick,position:{x,y:25.001,z:.5},velocity:{x:0,y:0,z:0},yaw:0,pitch:0,mode:'survival',grounded:true,swimCoverage:0,voided:false});

const socket=new FakeSocket(),events=[];
const movement=new MultiplayerMovementSession({
  bootstrapOptions:{clientFactory:options=>new MultiplayerWebSocketClient({...options,socketFactory:()=>socket})},
  onRemotePlayerSpawn:value=>events.push(['spawn',value.playerId,value.tick]),
  onRemotePlayerSnapshot:value=>events.push(['snapshot',value.playerId,value.tick]),
  onRemotePlayerDespawn:value=>events.push(['despawn',value.playerId])
});
movement.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:self'));socket.message(info('s:self'));socket.message(self('s:self'));assert.equal(movement.ready,true);

socket.message(encodeRemotePlayerSpawn(remote('p:other',0,3)));socket.message(encodeRemotePlayerSnapshot(remote('p:other',1,2.8)));assert.deepEqual(events,[['spawn','p:other',0],['snapshot','p:other',1]]);assert.equal(movement.remotePlayerStates().length,1);assert.equal(movement.remotePlayerState('p:other').tick,1);assert.equal(movement.remotePlayerState('p:other').position.x,2.8);
const clone=movement.remotePlayerState('p:other');clone.position.x=999;assert.equal(movement.remotePlayerState('p:other').position.x,2.8,'remote state getter must clone buffered state');

const renderCalls=[],fakeSystem={
  states(){return[{playerId:'p:other',tick:1,position:{x:2.8,y:25.001,z:.5},velocity:{x:0,y:0,z:0}}];},
  spawn(value){renderCalls.push(['spawn',value.playerId,value.tick,value.position.x]);},
  snapshot(value){renderCalls.push(['snapshot',value.playerId,value.tick,value.position.x]);},
  despawn(playerId){renderCalls.push(['despawn',playerId]);return true;},
  update(dt){renderCalls.push(['update',dt]);},
  dispose(){renderCalls.push(['dispose']);}
};
assert.equal(movement.attachRemotePlayerSystem(fakeSystem),fakeSystem);assert.deepEqual(renderCalls,[['spawn','p:other',1,2.8]],'attach should reconstruct only the latest buffered remote state');assert.throws(()=>movement.attachRemotePlayerSystem(fakeSystem),/already attached/);
const visualClone=movement.remoteVisualStates();visualClone[0].position.x=777;assert.equal(fakeSystem.states()[0].position.x,2.8);

socket.message(encodeRemotePlayerSnapshot(remote('p:other',2,2.5)));assert.deepEqual(renderCalls.at(-1),['snapshot','p:other',2,2.5]);movement.step(.025);assert.deepEqual(renderCalls.at(-1),['update',.025]);socket.message(encodeRemotePlayerDespawn('p:other'));assert.deepEqual(renderCalls.at(-1),['despawn','p:other']);assert.equal(movement.remotePlayerStates().length,0);
movement.close();assert.deepEqual(renderCalls.at(-1),['dispose']);assert.equal(movement.remoteVisualStates().length,0);assert.equal(movement.remotePlayerStates().length,0);

const socket2=new FakeSocket(),movement2=new MultiplayerMovementSession({bootstrapOptions:{clientFactory:options=>new MultiplayerWebSocketClient({...options,socketFactory:()=>socket2})}});movement2.connect('wss://example.test/ws');socket2.open();socket2.message(encodeServerWelcome('s:two'));socket2.message(info('s:two'));socket2.message(self('s:two'));socket2.message(encodeRemotePlayerSpawn(remote('p:fail',0,1)));
let disposed=false;const brokenSystem={states:()=>[],spawn:()=>{throw new Error('model construction failed');},snapshot:()=>{},despawn:()=>{},update:()=>{},dispose:()=>{disposed=true;}};assert.throws(()=>movement2.attachRemotePlayerSystem(brokenSystem),/model construction failed/);assert.equal(disposed,true,'failed renderer attachment must dispose the partial render system');assert.equal(movement2.remotePlayerSystem,null);movement2.close();

assert.throws(()=>new MultiplayerMovementSession().attachRemotePlayerSystem({}),/remote player system\.spawn/);
console.log('multiplayer remote player buffering + renderer attachment lifecycle: PASS');
