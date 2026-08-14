import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeItemEntitySpawn,encodeItemEntitySnapshot,encodeItemEntityDespawn} from '../src/item-entity-replication.js';
import {MultiplayerWebSocketClient} from '../src/websocket-client.js';

class FakeSocket{
  constructor(){this.protocol=MULTIPLAYER_SUBPROTOCOL;this.readyState=0;this.sent=[];this.closed=[];this.listeners=new Map();}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  emit(type,event={}){for(const listener of this.listeners.get(type)||[])listener(event);}
  open(){this.readyState=1;this.emit('open',{});}
  message(value){this.emit('message',{data:JSON.stringify(value)});}
  send(value){this.sent.push(value);}
  close(code=1000,reason=''){this.closed.push({code,reason});this.readyState=3;this.emit('close',{code,reason});}
}
const state=(revision=0)=>({entityId:'i:socket_drop',revision,itemId:'stick',count:1,position:{x:0,y:2,z:0},velocity:{x:0,y:0,z:0},age:revision*.05,pickupDelay:0});
const socket=new FakeSocket(),events=[],errors=[];const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,onItemEntitySpawn:value=>events.push(['spawn',value]),onItemEntitySnapshot:value=>events.push(['snapshot',value]),onItemEntityDespawn:value=>events.push(['despawn',value]),onProtocolError:error=>errors.push(error.message)});client.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:item-client'));socket.message(encodeItemEntitySpawn(state(0)));socket.message(encodeItemEntitySnapshot(state(1)));socket.message(encodeItemEntityDespawn('i:socket_drop',2,'picked'));assert.deepEqual(events.map(value=>value[0]),['spawn','snapshot','despawn']);assert.equal(client.state,'ready');
const duplicateSocket=new FakeSocket(),duplicateErrors=[];const duplicate=new MultiplayerWebSocketClient({socketFactory:()=>duplicateSocket,onProtocolError:error=>duplicateErrors.push(error.message)});duplicate.connect('wss://example.test/ws');duplicateSocket.open();duplicateSocket.message(encodeServerWelcome('s:item-client'));duplicateSocket.message(encodeItemEntitySpawn(state(0)));duplicateSocket.message(encodeItemEntitySnapshot(state(1)));duplicateSocket.message(encodeItemEntitySnapshot(state(1)));assert.equal(duplicate.state,'error');assert.equal(duplicateSocket.closed.at(-1).code,1002);assert.match(duplicateErrors.at(-1),/stale or duplicate item entity revision/);
const unknownSocket=new FakeSocket();const unknown=new MultiplayerWebSocketClient({socketFactory:()=>unknownSocket});unknown.connect('wss://example.test/ws');unknownSocket.open();unknownSocket.message(encodeServerWelcome('s:item-client'));unknownSocket.message(encodeItemEntitySnapshot(state(1)));assert.equal(unknown.state,'error');assert.equal(unknownSocket.closed.at(-1).code,1002);
assert.throws(()=>new MultiplayerWebSocketClient({onItemEntitySpawn:null}),/onItemEntitySpawn/);
console.log('websocket item entity spawn/snapshot/despawn ordering: PASS');
