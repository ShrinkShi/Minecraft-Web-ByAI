import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeMultiplayerChatMessage,MULTIPLAYER_CHAT_SEND_KIND} from '../src/multiplayer-chat-wire.js';
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

const socket=new FakeSocket(),messages=[],errors=[];
const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,onChatMessage:message=>messages.push(message),onProtocolError:error=>errors.push(error.message)});
client.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:chat-client'));assert.equal(client.state,'ready');
const first=client.sendChat('  大家好  ');assert.deepEqual(first,{v:1,kind:MULTIPLAYER_CHAT_SEND_KIND,session:'s:chat-client',clientSeq:0,text:'大家好'});assert.deepEqual(JSON.parse(socket.sent.at(-1)),first);
const command=client.sendCommand('/help');assert.equal(command.requestId,0,'chat sequencing must not consume command request ids');
const second=client.sendChat('第二条');assert.equal(second.clientSeq,1,'chat sends use their own sequence');

socket.message(encodeMultiplayerChatMessage({messageSeq:9,sender:'s:peer',text:'远端消息'}));assert.equal(messages.length,1);assert.equal(messages[0].text,'远端消息');
socket.message(encodeMultiplayerChatMessage({messageSeq:10,sender:'s:chat-client',text:'自己的服务端回显'}));assert.equal(messages.length,2);assert.equal(client.state,'ready');
socket.message(encodeMultiplayerChatMessage({messageSeq:10,sender:'s:peer',text:'重放'}));assert.equal(client.state,'error');assert.equal(socket.closed.at(-1).code,1002);assert.match(errors.at(-1),/stale or duplicate multiplayer chat message sequence/);

console.log('websocket multiplayer chat send + independent sequencing + replay rejection: PASS');
