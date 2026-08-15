import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeMultiplayerCommandResult,MULTIPLAYER_COMMAND_REQUEST_KIND} from '../src/multiplayer-command-wire.js';
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

const socket=new FakeSocket(),results=[],errors=[];const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,onCommandResult:result=>results.push(result),onProtocolError:error=>errors.push(error.message)});client.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:commands'));assert.equal(client.state,'ready');
const request=client.sendCommand(' /help ');assert.deepEqual(request,{v:1,kind:MULTIPLAYER_COMMAND_REQUEST_KIND,session:'s:commands',requestId:0,text:'/help'});assert.deepEqual(JSON.parse(socket.sent.at(-1)),request);assert.equal(client.pendingCommands.has(0),true);
socket.message(encodeMultiplayerCommandResult({session:'s:commands',requestId:0,ok:true,code:'ok',message:'多人可用：/help'}));assert.equal(client.state,'ready');assert.equal(client.pendingCommands.size,0);assert.equal(results.length,1);assert.equal(results[0].message,'多人可用：/help');
const second=client.sendCommand('/give stick 1');assert.equal(second.requestId,1,'command request sequence is independent and ordered');socket.message(encodeMultiplayerCommandResult({session:'s:commands',requestId:1,ok:false,code:'denied',message:'服务器未启用作弊指令'}));assert.equal(results.at(-1).code,'denied');

const unexpectedSocket=new FakeSocket(),unexpectedErrors=[];const unexpected=new MultiplayerWebSocketClient({socketFactory:()=>unexpectedSocket,onProtocolError:error=>unexpectedErrors.push(error.message)});unexpected.connect('wss://example.test/ws');unexpectedSocket.open();unexpectedSocket.message(encodeServerWelcome('s:unexpected'));unexpectedSocket.message(encodeMultiplayerCommandResult({session:'s:unexpected',requestId:4,ok:true,code:'ok',message:'unexpected'}));assert.equal(unexpected.state,'error');assert.equal(unexpectedSocket.closed.at(-1).code,1002);assert.match(unexpectedErrors.at(-1),/unexpected multiplayer command result/);

const mismatchSocket=new FakeSocket(),mismatch=new MultiplayerWebSocketClient({socketFactory:()=>mismatchSocket});mismatch.connect('wss://example.test/ws');mismatchSocket.open();mismatchSocket.message(encodeServerWelcome('s:expected'));mismatch.sendCommand('/help');mismatchSocket.message(encodeMultiplayerCommandResult({session:'s:other',requestId:0,ok:true,code:'ok',message:'wrong session'}));assert.equal(mismatch.state,'error');assert.equal(mismatchSocket.closed.at(-1).code,1002);

console.log('websocket correlated multiplayer command request/result handling: PASS');
