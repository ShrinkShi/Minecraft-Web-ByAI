import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeServerInventorySnapshot} from '../src/server-inventory-snapshot.js';
import {encodeServerEquipmentSnapshot} from '../src/server-equipment-snapshot.js';
import {encodeServerWorldInfo} from '../src/server-world-info.js';
import {encodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {encodeWorldEditSync} from '../src/world-edit-replication.js';
import {encodeRemotePlayerSpawn,encodeRemotePlayerSnapshot,encodeRemotePlayerDespawn} from '../src/remote-player-replication.js';
import {MultiplayerWebSocketClient} from '../src/websocket-client.js';
import {MultiplayerMovementSession} from '../src/multiplayer-movement-session.js';

class FakeSocket{constructor(){this.protocol=MULTIPLAYER_SUBPROTOCOL;this.readyState=0;this.sent=[];this.closed=[];this.listeners=new Map();}addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}emit(type,event={}){for(const listener of this.listeners.get(type)||[])listener(event);}open(){this.readyState=1;this.emit('open',{});}message(value){this.emit('message',{data:JSON.stringify(value)});}send(value){this.sent.push(value);}close(code=1000,reason=''){this.closed.push({code,reason});this.readyState=3;this.emit('close',{code,reason});}}
const info=session=>encodeServerWorldInfo({session,worldId:'remote-buffer-world',terrainVersion:1,seed:'seed',prompt:'平原',tickRate:20});
const self=session=>encodeServerPlayerSnapshot({session,tick:0,position:{x:.5,y:25.001,z:.5},velocity:{x:0,y:0,z:0},yaw:0,pitch:0,mode:'survival',grounded:true,swimCoverage:0,voided:false});
const inventory=session=>encodeServerInventorySnapshot({session,revision:0,mode:'survival',slots:Array(36).fill(null),cursor:null});
const equipment=session=>encodeServerEquipmentSnapshot({session,revision:0,slots:{head:null,chest:null,legs:null,feet:null}});
const sync=(socket,session)=>encodeWorldEditSync({session,worldId:'remote-buffer-world',revision:0,edits:[]}).forEach(message=>socket.message(message));
const remote=(playerId,tick,x)=>({playerId,tick,position:{x,y:25.001,z:.5},velocity:{x:0,y:0,z:0},yaw:0,pitch:0,mode:'survival',grounded:true,swimCoverage:0,voided:false});

const socket=new FakeSocket(),events=[];const movement=new MultiplayerMovementSession({bootstrapOptions:{clientFactory:options=>new MultiplayerWebSocketClient({...options,socketFactory:()=>socket})},onRemotePlayerSpawn:value=>events.push(['spawn',value.playerId,value.tick]),onRemotePlayerSnapshot:value=>events.push(['snapshot',value.playerId,value.tick]),onRemotePlayerDespawn:value=>events.push(['despawn',value.playerId])});
movement.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:self'));socket.message(info('s:self'));sync(socket,'s:self');socket.message(inventory('s:self'));socket.message(equipment('s:self'));socket.message(self('s:self'));assert.equal(movement.ready,true);
socket.message(encodeRemotePlayerSpawn(remote('p:other',0,3)));socket.message(encodeRemotePlayerSnapshot(remote('p:other',1,2.8)));assert.deepEqual(events,[['spawn','p:other',0],['snapshot','p:other',1]]);assert.equal(movement.remotePlayerState('p:other').position.x,2.8);
const renderCalls=[],fakeSystem={states(){return[{playerId:'p:other',tick:1,position:{x:2.8,y:25.001,z:.5},velocity:{x:0,y:0,z:0}}];},spawn(value){renderCalls.push(['spawn',value.playerId,value.tick]);},snapshot(value){renderCalls.push(['snapshot',value.playerId,value.tick]);},despawn(playerId){renderCalls.push(['despawn',playerId]);return true;},update(dt){renderCalls.push(['update',dt]);},dispose(){renderCalls.push(['dispose']);}};
movement.attachRemotePlayerSystem(fakeSystem);assert.deepEqual(renderCalls,[['spawn','p:other',1]]);socket.message(encodeRemotePlayerSnapshot(remote('p:other',2,2.5)));assert.deepEqual(renderCalls.at(-1),['snapshot','p:other',2]);movement.step(.025);assert.deepEqual(renderCalls.at(-1),['update',.025]);socket.message(encodeRemotePlayerDespawn('p:other'));assert.deepEqual(renderCalls.at(-1),['despawn','p:other']);movement.close();assert.deepEqual(renderCalls.at(-1),['dispose']);

const socket2=new FakeSocket(),movement2=new MultiplayerMovementSession({bootstrapOptions:{clientFactory:options=>new MultiplayerWebSocketClient({...options,socketFactory:()=>socket2})}});movement2.connect('wss://example.test/ws');socket2.open();socket2.message(encodeServerWelcome('s:two'));socket2.message(info('s:two'));sync(socket2,'s:two');socket2.message(inventory('s:two'));socket2.message(equipment('s:two'));socket2.message(self('s:two'));socket2.message(encodeRemotePlayerSpawn(remote('p:fail',0,1)));let disposed=false;const broken={states:()=>[],spawn:()=>{throw new Error('model construction failed');},snapshot:()=>{},despawn:()=>{},update:()=>{},dispose:()=>{disposed=true;}};assert.throws(()=>movement2.attachRemotePlayerSystem(broken),/model construction failed/);assert.equal(disposed,true);movement2.close();
console.log('remote player buffering/renderer lifecycle remains valid behind world-edit + inventory + equipment bootstrap barrier: PASS');
