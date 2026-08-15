import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeEquipmentTransactionResult,EQUIPMENT_TRANSACTION_REQUEST_KIND} from '../src/equipment-transaction-wire.js';
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

const socket=new FakeSocket(),results=[],errors=[];const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,onEquipmentTransactionResult:result=>results.push(result),onProtocolError:error=>errors.push(error.message)});
client.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:equipment-client'));assert.equal(client.state,'ready');
const request=client.sendEquipmentTransaction({slot:'head',button:0},6,2);assert.deepEqual(request,{v:1,kind:EQUIPMENT_TRANSACTION_REQUEST_KIND,session:'s:equipment-client',requestId:0,expectedInventoryRevision:6,expectedEquipmentRevision:2,slot:'head',button:0});assert.deepEqual(JSON.parse(socket.sent.at(-1)),request);
assert.throws(()=>client.sendEquipmentTransaction({slot:'head',button:0},6,2),/already awaiting the server/,'client must serialize equipment transactions');
socket.message(encodeEquipmentTransactionResult({session:'s:equipment-client',requestId:0,ok:true,code:'equipped',inventoryRevision:7,equipmentRevision:3}));assert.equal(results.length,1);assert.equal(results[0].inventoryRevision,7);assert.equal(results[0].equipmentRevision,3);
const second=client.sendEquipmentTransaction({slot:'head',button:2},7,3);assert.equal(second.requestId,1);socket.message(encodeEquipmentTransactionResult({session:'s:equipment-client',requestId:1,ok:false,code:'stale-revision',inventoryRevision:8,equipmentRevision:4}));assert.equal(results.length,2);assert.equal(client.state,'ready');
socket.message(encodeEquipmentTransactionResult({session:'s:equipment-client',requestId:1,ok:true,code:'no-change',inventoryRevision:8,equipmentRevision:4}));assert.equal(client.state,'error');assert.equal(socket.closed.at(-1).code,1002);assert.match(errors.at(-1),/unexpected equipment transaction result requestId/);
console.log('websocket equipment transaction serialization + result correlation: PASS');
