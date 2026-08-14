import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeMiningProgress} from '../src/mining-progress-replication.js';
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
const active=(tick,progress,session='s:mining-client')=>encodeMiningProgress({session,tick,active:true,progress,target:{x:1,y:64,z:-2,id:BLOCK.STONE}});
const reset=(tick,session='s:mining-client')=>encodeMiningProgress({session,tick,active:false,progress:0,target:null});

const socket=new FakeSocket(),received=[],errors=[];const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,onMiningProgress:value=>received.push(value),onProtocolError:error=>errors.push(error.message)});client.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:mining-client'));socket.message(active(3,.2));assert.equal(client.state,'ready');assert.equal(received.length,1);assert.equal(received[0].tick,3);assert.equal(received[0].progress,.2);assert.deepEqual(received[0].target,{x:1,y:64,z:-2,id:BLOCK.STONE});
socket.message(active(4,.4));socket.message(reset(5));assert.equal(received.length,3);assert.equal(received[1].progress,.4);assert.equal(received[2].active,false);assert.equal(received[2].progress,0);
socket.message(reset(5));assert.equal(client.state,'error','duplicate mining tick must fail closed');assert.equal(socket.closed.at(-1).code,1002);assert.match(errors.at(-1),/stale or duplicate mining progress tick/);

const mismatchSocket=new FakeSocket(),mismatch=new MultiplayerWebSocketClient({socketFactory:()=>mismatchSocket});mismatch.connect('wss://example.test/ws');mismatchSocket.open();mismatchSocket.message(encodeServerWelcome('s:expected'));mismatchSocket.message(active(1,.2,'s:other'));assert.equal(mismatch.state,'error');assert.equal(mismatchSocket.closed.at(-1).code,1002);

const handlerSocket=new FakeSocket(),handlerErrors=[];const handler=new MultiplayerWebSocketClient({socketFactory:()=>handlerSocket,onProtocolError:error=>handlerErrors.push(error.message),onMiningProgress:()=>{throw new Error('mining progress handler failed');}});handler.connect('wss://example.test/ws');handlerSocket.open();handlerSocket.message(encodeServerWelcome('s:mining-client'));handlerSocket.message(active(1,.2));assert.equal(handler.state,'error');assert.equal(handlerSocket.closed.at(-1).code,1011);assert.match(handlerErrors.at(-1),/mining progress handler failed/);
assert.throws(()=>new MultiplayerWebSocketClient({onMiningProgress:null}),/onMiningProgress/);
console.log('websocket strict ordered mining progress handling: PASS');
