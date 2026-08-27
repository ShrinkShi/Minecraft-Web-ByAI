import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeServerWorldInfo} from '../src/server-world-info.js';
import {TERRAIN_GENERATOR_VERSION} from '../src/terrain-generator.js';
import {encodeWorldEditSync,encodeWorldBlockChange} from '../src/world-edit-replication.js';
import {LiveWorldWebSocketClient} from '../src/live-world-websocket-client.js';
class Socket{constructor(){this.protocol=MULTIPLAYER_SUBPROTOCOL;this.readyState=0;this.sent=[];this.listeners=new Map();}addEventListener(t,f){const a=this.listeners.get(t)||[];a.push(f);this.listeners.set(t,a);}emit(t,e={}){for(const f of this.listeners.get(t)||[])f(e);}open(){this.readyState=1;this.emit('open');}message(v){this.emit('message',{data:JSON.stringify(v)});}send(v){this.sent.push(v);}close(){this.readyState=3;}}
const socket=new Socket(),changes=[],client=new LiveWorldWebSocketClient({socketFactory:()=>socket,onWorldBlockChange:value=>changes.push(value)});
client.connect('wss://localhost/ws');socket.open();socket.message(encodeServerWelcome('s:live'));socket.message(encodeServerWorldInfo({session:'s:live',worldId:'live-world',terrainVersion:TERRAIN_GENERATOR_VERSION,seed:'seed',prompt:'plain',tickRate:20}));for(const message of encodeWorldEditSync({session:'s:live',worldId:'live-world',revision:7,edits:[]}))socket.message(message);assert.equal(client.worldRevision,7);
socket.message(encodeWorldBlockChange({session:'s:live',worldId:'live-world',revision:8,x:1,y:20,z:1,previous:BLOCK.AIR,id:BLOCK.LOG,stateKey:'axis=x'}));assert.equal(changes.length,1);assert.deepEqual({revision:changes[0].revision,previous:changes[0].previous,previousStateKey:changes[0].previousStateKey,id:changes[0].id,stateKey:changes[0].stateKey},{revision:8,previous:BLOCK.AIR,previousStateKey:null,id:BLOCK.LOG,stateKey:'axis=x'});assert.equal(client.worldRevision,8);
socket.message(encodeWorldBlockChange({session:'s:live',worldId:'live-world',revision:9,x:1,y:20,z:1,previous:BLOCK.LOG,previousStateKey:'axis=x',id:BLOCK.LOG,stateKey:'axis=z'}));assert.equal(changes.length,2);assert.deepEqual({revision:changes[1].revision,previous:changes[1].previous,previousStateKey:changes[1].previousStateKey,id:changes[1].id,stateKey:changes[1].stateKey},{revision:9,previous:BLOCK.LOG,previousStateKey:'axis=x',id:BLOCK.LOG,stateKey:'axis=z'});assert.equal(client.worldRevision,9);
console.log('live world client block-state-aware realtime wiring: PASS');
