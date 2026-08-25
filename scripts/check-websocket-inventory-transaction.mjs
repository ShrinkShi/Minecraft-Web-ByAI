import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeInventoryTransactionResult,INVENTORY_TRANSACTION_PROTOCOL_VERSION,INVENTORY_TRANSACTION_REQUEST_KIND} from '../src/inventory-transaction-wire.js';
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

const socket=new FakeSocket(),results=[],errors=[];
const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,onInventoryTransactionResult:result=>results.push(result),onProtocolError:error=>errors.push(error.message)});
client.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:inventory-client'));assert.equal(client.state,'ready');
const request=client.sendInventoryTransaction({type:'slot-click',slot:27,button:0,shift:false},6);assert.deepEqual(request,{v:INVENTORY_TRANSACTION_PROTOCOL_VERSION,kind:INVENTORY_TRANSACTION_REQUEST_KIND,session:'s:inventory-client',requestId:0,expectedRevision:6,action:{type:'slot-click',slot:27,button:0,shift:false}});assert.deepEqual(JSON.parse(socket.sent.at(-1)),request);
assert.throws(()=>client.sendInventoryTransaction({type:'return-cursor'},6),/already awaiting the server/,'client must serialize revision-dependent inventory transactions');
socket.message(encodeInventoryTransactionResult({session:'s:inventory-client',requestId:0,ok:true,code:'picked-up',revision:7}));assert.equal(results.length,1);assert.equal(results[0].revision,7);
const creativePick=client.sendInventoryTransaction({type:'creative-pick',itemId:'wooden_pickaxe'},7);assert.equal(creativePick.requestId,1);assert.equal(creativePick.expectedRevision,7);assert.deepEqual(creativePick.action,{type:'creative-pick',itemId:'wooden_pickaxe'});assert.deepEqual(JSON.parse(socket.sent.at(-1)),creativePick);
socket.message(encodeInventoryTransactionResult({session:'s:inventory-client',requestId:1,ok:true,code:'creative-picked',revision:8}));assert.equal(results.length,2);assert.equal(results[1].code,'creative-picked');assert.equal(results[1].revision,8);
const third=client.sendInventoryTransaction({type:'return-cursor'},8);assert.equal(third.requestId,2);assert.equal(third.expectedRevision,8);
socket.message(encodeInventoryTransactionResult({session:'s:inventory-client',requestId:2,ok:false,code:'stale-revision',revision:9}));assert.equal(results.length,3);assert.equal(client.state,'ready');
socket.message(encodeInventoryTransactionResult({session:'s:inventory-client',requestId:2,ok:true,code:'no-change',revision:9}));assert.equal(client.state,'error');assert.equal(socket.closed.at(-1).code,1002);assert.match(errors.at(-1),/unexpected inventory transaction result requestId/);

console.log('websocket inventory transaction v2 serialization + creative pick + result correlation: PASS');
