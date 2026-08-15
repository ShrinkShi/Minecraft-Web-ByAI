import assert from 'node:assert/strict';
import {MultiplayerWebSocketClient,HANDSHAKE_TIMEOUT_CLOSE_CODE} from '../src/websocket-client.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {MultiplayerSessionBootstrap,WORLD_SYNC_TIMEOUT_CLOSE_CODE} from '../src/multiplayer-session-bootstrap.js';

class FakeSocket{
  constructor(){this.protocol=MULTIPLAYER_SUBPROTOCOL;this.readyState=1;this.listeners=new Map();this.sent=[];this.closed=[];}
  addEventListener(type,handler){const list=this.listeners.get(type)||[];list.push(handler);this.listeners.set(type,list);}
  emit(type,event={}){for(const handler of this.listeners.get(type)||[])handler(event);}
  send(value){this.sent.push(value);}
  close(code,reason){this.closed.push({code,reason});this.readyState=3;}
}

{
  const socket=new FakeSocket(),scheduled=[],cleared=[];
  const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,allowInsecure:true,handshakeTimeoutMs:250,setTimer:(handler,ms)=>{const token={handler,ms};scheduled.push(token);return token;},clearTimer:token=>cleared.push(token)});
  client.connect('ws://localhost/ws');socket.emit('open');assert.equal(client.state,'handshaking');assert.equal(scheduled.length,1);assert.equal(scheduled[0].ms,250);assert.equal(client.handshakeTimer,scheduled[0]);
  socket.emit('message',{data:JSON.stringify(encodeServerWelcome('s:timer-clear'))});assert.equal(client.state,'ready');assert.equal(cleared.length,1);assert.equal(cleared[0],scheduled[0]);assert.equal(client.handshakeTimer,null);
}

{
  const socket=new FakeSocket(),scheduled=[];
  const client=new MultiplayerWebSocketClient({socketFactory:()=>socket,allowInsecure:true,handshakeTimeoutMs:250,setTimer:(handler,ms)=>{const token={handler,ms};scheduled.push(token);return token;},clearTimer:()=>{}});
  client.connect('ws://localhost/ws');socket.emit('open');scheduled[0].handler();assert.equal(client.state,'error');assert.deepEqual(socket.closed,[{code:HANDSHAKE_TIMEOUT_CLOSE_CODE,reason:'handshake timeout'}]);
}

{
  let callbacks=null;const scheduled=[],closed=[];
  const fakeClient={state:'idle',connect(){this.state='connecting';return 'ws://localhost/ws';},close(code,reason){closed.push({code,reason});this.state='closed';}};
  const bootstrap=new MultiplayerSessionBootstrap({worldSyncTimeoutMs:1000,clientFactory:options=>(callbacks=options,fakeClient),setTimer:(handler,ms)=>{const token={handler,ms};scheduled.push(token);return token;},clearTimer:()=>{}});
  bootstrap.connect('ws://localhost/ws');fakeClient.state='ready';callbacks.onStateChange({state:'ready',detail:'s:bootstrap-timer'});assert.equal(bootstrap.state,'synchronizing');assert.equal(scheduled.length,1);assert.equal(scheduled[0].ms,1000);scheduled[0].handler();assert.equal(bootstrap.state,'failed');assert.equal(bootstrap.lastError?.message,'multiplayer world synchronization timed out');assert.deepEqual(closed,[{code:WORLD_SYNC_TIMEOUT_CLOSE_CODE,reason:'world sync timeout'}]);
}

console.log('multiplayer handshake/bootstrap timer injection contract: PASS');
