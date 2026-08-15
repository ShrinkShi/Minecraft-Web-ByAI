import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {encodeMultiplayerChatSend,decodeMultiplayerChatMessage,MULTIPLAYER_CHAT_MESSAGE_KIND} from '../src/multiplayer-chat-wire.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function queue(socket){const values=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(3000,label)]);}};}
async function open(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(3000,'chat runtime websocket open')]);}
async function nextKind(messages,kind,label){for(let i=0;i<100;i++){const message=await messages.next(label);if(message.kind===kind)return message;}throw new Error(`did not receive ${kind}`);}
async function connect(url){const socket=await open(url),messages=queue(socket);socket.send(JSON.stringify(encodeClientHello()));const welcome=await messages.next('chat welcome');assert.equal(welcome.kind,'welcome');return{socket,messages,welcome};}
function closeEvent(socket,label){return Promise.race([new Promise(resolve=>socket.once('close',(code,reason)=>resolve({code,reason:reason.toString('utf8')}))),timeout(3000,label)]);}

const errors=[],runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'chat-runtime',seed:'chat-runtime',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:16},setIntervalFn:()=>({timer:'disabled'}),clearIntervalFn:()=>{},onError:event=>errors.push(event)});
let a=null,b=null;
try{
  const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}${runtime.server.path}`;
  a=await connect(url);b=await connect(url);
  const send=encodeMultiplayerChatSend({session:a.welcome.session,clientSeq:0,text:'来自 A 的消息'});a.socket.send(JSON.stringify(send));
  const aMessage=decodeMultiplayerChatMessage(await nextKind(a.messages,MULTIPLAYER_CHAT_MESSAGE_KIND,'A chat echo')),bMessage=decodeMultiplayerChatMessage(await nextKind(b.messages,MULTIPLAYER_CHAT_MESSAGE_KIND,'B chat receive'));
  assert.deepEqual(aMessage,bMessage,'all clients must receive the same server-ordered chat message');assert.equal(aMessage.sender,a.welcome.session,'sender identity must come from the authoritative session');assert.equal(aMessage.text,'来自 A 的消息');assert.equal(aMessage.messageSeq,0);

  const replayClose=closeEvent(a.socket,'replayed chat close');a.socket.send(JSON.stringify(send));const replay=await replayClose;assert.equal(replay.code,1008);assert.match(replay.reason,/stale or duplicate chat send/);

  for(let i=0;i<8;i++)b.socket.send(JSON.stringify(encodeMultiplayerChatSend({session:b.welcome.session,clientSeq:i,text:`burst-${i}`})));
  for(let i=0;i<8;i++){const message=decodeMultiplayerChatMessage(await nextKind(b.messages,MULTIPLAYER_CHAT_MESSAGE_KIND,`accepted burst ${i}`));assert.equal(message.sender,b.welcome.session);assert.equal(message.text,`burst-${i}`);}
  const rateClose=closeEvent(b.socket,'chat rate limit close');b.socket.send(JSON.stringify(encodeMultiplayerChatSend({session:b.welcome.session,clientSeq:8,text:'burst-over-limit'})));const limited=await rateClose;assert.equal(limited.code,1008);assert.match(limited.reason,/chat rate limit exceeded/);
  assert.deepEqual(errors,[]);
}finally{
  if(a?.socket?.readyState===WebSocket.OPEN)a.socket.terminate();if(b?.socket?.readyState===WebSocket.OPEN)b.socket.terminate();await runtime.stop();
}

console.log('real WebSocket authoritative chat broadcast + replay gate + rate limit: PASS');
