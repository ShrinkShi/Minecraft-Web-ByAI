import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeServerInventorySnapshot} from '../src/server-inventory-snapshot.js';
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
const wire=(session='s:inventory-client',revision=3,slot=null)=>{const slots=Array(36).fill(null);if(slot)slots[slot.index]={id:slot.id,count:slot.count};return encodeServerInventorySnapshot({session,revision,mode:'survival',slots});};

const socket=new FakeSocket(),received=[],errors=[];const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,onInventorySnapshot:value=>received.push(value),onProtocolError:error=>errors.push(error.message)});client.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:inventory-client'));socket.message(wire());assert.equal(client.state,'ready');assert.equal(received.length,1);assert.equal(received[0].revision,3);assert.equal(received[0].slots.length,36);assert.equal(client.inventorySnapshot.revision,3);
socket.message(wire('s:inventory-client',4,{index:27,id:'stick',count:2}));assert.equal(client.state,'ready');assert.equal(received.length,2);assert.equal(received[1].revision,4);assert.deepEqual(received[1].slots[27],{id:'stick',count:2});assert.equal(client.inventorySnapshot.revision,4);
socket.message(wire('s:inventory-client',4,{index:27,id:'stick',count:3}));assert.equal(client.state,'error');assert.equal(socket.closed.at(-1).code,1002);assert.match(errors.at(-1),/stale or duplicate server inventory revision/);assert.equal(client.inventorySnapshot,null,'protocol failure clears retained inventory state');

const staleSocket=new FakeSocket(),staleErrors=[];const stale=new MultiplayerWebSocketClient({socketFactory:()=>staleSocket,onProtocolError:error=>staleErrors.push(error.message)});stale.connect('wss://example.test/ws');staleSocket.open();staleSocket.message(encodeServerWelcome('s:inventory-client'));staleSocket.message(wire('s:inventory-client',8));staleSocket.message(wire('s:inventory-client',7));assert.equal(stale.state,'error');assert.match(staleErrors.at(-1),/stale or duplicate/);

const mismatchSocket=new FakeSocket(),mismatch=new MultiplayerWebSocketClient({socketFactory:()=>mismatchSocket});mismatch.connect('wss://example.test/ws');mismatchSocket.open();mismatchSocket.message(encodeServerWelcome('s:expected'));mismatchSocket.message(wire('s:other'));assert.equal(mismatch.state,'error');assert.equal(mismatchSocket.closed.at(-1).code,1002);

const handlerSocket=new FakeSocket(),handlerErrors=[];const handler=new MultiplayerWebSocketClient({socketFactory:()=>handlerSocket,onProtocolError:error=>handlerErrors.push(error.message),onInventorySnapshot:()=>{throw new Error('inventory handler failed');}});handler.connect('wss://example.test/ws');handlerSocket.open();handlerSocket.message(encodeServerWelcome('s:inventory-client'));handlerSocket.message(wire());assert.equal(handler.state,'error');assert.equal(handlerSocket.closed.at(-1).code,1011);assert.match(handlerErrors.at(-1),/inventory handler failed/);
assert.throws(()=>new MultiplayerWebSocketClient({onInventorySnapshot:null}),/onInventorySnapshot/);
console.log('websocket ordered initial + live inventory snapshot handling: PASS');
