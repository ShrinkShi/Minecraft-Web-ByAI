import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello,encodeServerWelcome} from '../src/multiplayer-handshake.js';
import {encodeServerWorldInfo,decodeServerWorldInfo} from '../src/server-world-info.js';
import {MultiplayerWebSocketClient} from '../src/websocket-client.js';
import {createMultiplayerServer} from '../server/multiplayer-server.mjs';

class FakeSocket{
  constructor(url='wss://example.test/ws',protocol=MULTIPLAYER_SUBPROTOCOL){this.url=url;this.protocol=protocol;this.readyState=0;this.sent=[];this.closed=[];this.listeners=new Map();}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  emit(type,event={}){for(const listener of this.listeners.get(type)||[])listener(event);}
  open(){this.readyState=1;this.emit('open',{});}
  message(value){this.emit('message',{data:typeof value==='string'?value:JSON.stringify(value)});}
  send(value){this.sent.push(value);}
  close(code=1000,reason=''){this.closed.push({code,reason});this.readyState=3;this.emit('close',{code,reason});}
}
const infoState=(session,overrides={})=>({session,worldId:'world-main',terrainVersion:1,seed:'世界种子',prompt:'森林',tickRate:20,...overrides});

const infos=[],errors=[],socket=new FakeSocket(),client=new MultiplayerWebSocketClient({socketFactory:()=>socket,onWorldInfo:info=>infos.push(info),onProtocolError:error=>errors.push(error.message)});
client.connect('wss://example.test/ws');socket.open();assert.deepEqual(JSON.parse(socket.sent[0]),encodeClientHello());socket.message(encodeServerWelcome('world-session'));assert.equal(client.state,'ready');assert.equal(client.worldInfo,null);
const wire=encodeServerWorldInfo(infoState('world-session'));socket.message(wire);assert.equal(client.state,'ready');assert.equal(infos.length,1);assert.deepEqual(infos[0],decodeServerWorldInfo(wire,{expectedSession:'world-session'}));assert.deepEqual(client.worldInfo,infos[0]);
socket.message(wire);assert.equal(client.state,'error','world description cannot be changed/repeated inside one ready transport session');assert.equal(socket.closed.at(-1).code,1002);assert.match(errors.at(-1),/duplicate server world info/);assert.equal(client.worldInfo,null,'protocol failure clears connection-scoped world metadata');

const mismatchSocket=new FakeSocket(),mismatch=new MultiplayerWebSocketClient({socketFactory:()=>mismatchSocket});mismatch.connect('wss://example.test/ws');mismatchSocket.open();mismatchSocket.message(encodeServerWelcome('expected'));mismatchSocket.message(encodeServerWorldInfo(infoState('other')));assert.equal(mismatch.state,'error');assert.equal(mismatchSocket.closed.at(-1).code,1002);
const versionSocket=new FakeSocket(),versionErrors=[],versionClient=new MultiplayerWebSocketClient({socketFactory:()=>versionSocket,onProtocolError:error=>versionErrors.push(error.message)});versionClient.connect('wss://example.test/ws');versionSocket.open();versionSocket.message(encodeServerWelcome('version'));const badVersion={...encodeServerWorldInfo(infoState('version')),terrainVersion:2};versionSocket.message(badVersion);assert.equal(versionClient.state,'error');assert.match(versionErrors.at(-1),/unsupported terrain generator version/);
const handlerSocket=new FakeSocket(),handlerErrors=[],handler=new MultiplayerWebSocketClient({socketFactory:()=>handlerSocket,onWorldInfo:()=>{throw new Error('world setup failed');},onProtocolError:error=>handlerErrors.push(error.message)});handler.connect('wss://example.test/ws');handlerSocket.open();handlerSocket.message(encodeServerWelcome('handler'));handlerSocket.message(encodeServerWorldInfo(infoState('handler')));assert.equal(handler.state,'error');assert.equal(handlerSocket.closed.at(-1).code,1011);assert.match(handlerErrors.at(-1),/world setup failed/);
const unsupportedSocket=new FakeSocket(),unsupported=new MultiplayerWebSocketClient({socketFactory:()=>unsupportedSocket});unsupported.connect('wss://example.test/ws');unsupportedSocket.open();unsupportedSocket.message(encodeServerWelcome('unknown'));unsupportedSocket.message({v:1,kind:'entity-snapshot'});assert.equal(unsupported.state,'error');assert.equal(unsupportedSocket.closed.at(-1).code,1002);
assert.throws(()=>new MultiplayerWebSocketClient({onWorldInfo:null}),/onWorldInfo/);

const ORIGIN='http://localhost:4173',timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function openClient(url){return Promise.race([new Promise((resolve,reject)=>{const ws=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});ws.once('open',()=>resolve(ws));ws.once('error',reject);}),timeout(2500,'real websocket open')]);}
function queue(socket){const values=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(2500,label)]);}};}

let server;server=createMultiplayerServer({port:0,allowedOrigins:[ORIGIN],sessionFactory:()=> 'real-world-info-session',onSessionReady:({session})=>{const sent=server.sendWorldInfo(session,infoState(session,{worldId:'real-world',seed:'golden-seed',prompt:'mountain forest'}));assert.equal(sent.kind,'world-info');}});
try{
  const address=await server.listen(),ws=await openClient(`ws://127.0.0.1:${address.port}${server.path}`),messages=queue(ws);ws.send(JSON.stringify(encodeClientHello()));const welcome=await messages.next('real welcome'),realInfoWire=await messages.next('real world info');assert.deepEqual(welcome,{v:1,kind:'welcome',session:'real-world-info-session'});assert.deepEqual(decodeServerWorldInfo(realInfoWire,{expectedSession:welcome.session}),{version:1,kind:'world-info',session:welcome.session,worldId:'real-world',terrainVersion:1,seed:'golden-seed',prompt:'mountain forest',tickRate:20});assert.throws(()=>server.sendWorldInfo(welcome.session,infoState('other')),/must match target session/);assert.equal(server.sendWorldInfo('missing',infoState('missing')),null);ws.close(1000,'done');
}finally{await server.close();}

console.log('websocket single-world metadata delivery + real server downlink: PASS');
