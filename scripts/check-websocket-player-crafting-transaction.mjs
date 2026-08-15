import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeServerPlayerCraftingSnapshot} from '../src/server-player-crafting-snapshot.js';
import {encodePlayerCraftingTransactionResult,PLAYER_CRAFTING_TRANSACTION_REQUEST_KIND} from '../src/player-crafting-transaction-wire.js';
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

const socket=new FakeSocket(),snapshots=[],results=[],errors=[];const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,onPlayerCraftingSnapshot:snapshot=>snapshots.push(snapshot),onPlayerCraftingTransactionResult:result=>results.push(result),onProtocolError:error=>errors.push(error.message)});
client.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:craft-client'));assert.equal(client.state,'ready');
socket.message(encodeServerPlayerCraftingSnapshot({session:'s:craft-client',revision:0,size:2,slots:[null,null,null,null],result:null}));assert.equal(snapshots.length,1);assert.equal(client.playerCraftingSnapshot.revision,0);
const request=client.sendPlayerCraftingTransaction({type:'input-click',slot:0,button:2,shift:false},4,0);assert.deepEqual(request,{v:1,kind:PLAYER_CRAFTING_TRANSACTION_REQUEST_KIND,session:'s:craft-client',requestId:0,expectedInventoryRevision:4,expectedCraftingRevision:0,action:{type:'input-click',slot:0,button:2,shift:false}});assert.deepEqual(JSON.parse(socket.sent.at(-1)),request);
assert.throws(()=>client.sendPlayerCraftingTransaction({type:'close'},4,0),/already awaiting the server/,'client must serialize player crafting transactions');
socket.message(encodePlayerCraftingTransactionResult({session:'s:craft-client',requestId:0,ok:true,code:'placed-one',inventoryRevision:5,craftingRevision:1}));assert.equal(results.length,1);assert.equal(results[0].craftingRevision,1);
const second=client.sendPlayerCraftingTransaction({type:'take-result',shift:true},5,1);assert.equal(second.requestId,1);socket.message(encodePlayerCraftingTransactionResult({session:'s:craft-client',requestId:1,ok:false,code:'stale-revision',inventoryRevision:6,craftingRevision:2}));assert.equal(results.length,2);assert.equal(client.state,'ready');
socket.message(encodePlayerCraftingTransactionResult({session:'s:craft-client',requestId:1,ok:true,code:'no-change',inventoryRevision:6,craftingRevision:2}));assert.equal(client.state,'error');assert.equal(socket.closed.at(-1).code,1002);assert.match(errors.at(-1),/unexpected player crafting transaction result requestId/);
console.log('websocket player crafting serialization + snapshot/result correlation: PASS');
