import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {MULTIPLAYER_SUBPROTOCOL} from '../src/multiplayer-handshake.js';
import {createMultiplayerServer} from '../server/multiplayer-server.mjs';

const ORIGIN='http://localhost:4173';
const LEGACY_SUBPROTOCOL='minecraft-web-v5';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));

const server=createMultiplayerServer({port:0,allowedOrigins:[ORIGIN]});
try{
  const address=await server.listen(),url=`ws://127.0.0.1:${address.port}${server.path}`;
  assert.equal(MULTIPLAYER_SUBPROTOCOL,'minecraft-web-v6');
  const status=await Promise.race([new Promise((resolve,reject)=>{
    const socket=new WebSocket(url,[LEGACY_SUBPROTOCOL],{origin:ORIGIN});
    socket.once('open',()=>{socket.terminate();reject(new Error('legacy v5 websocket unexpectedly opened'));});
    socket.once('unexpected-response',(_request,response)=>{const value=response.statusCode;response.resume();resolve(value);});
    socket.once('error',()=>{});
  }),timeout(2500,'legacy websocket rejection')]);
  assert.equal(status,426,'legacy v5 subprotocol must fail at the HTTP upgrade boundary');
  assert.equal(server.sessionCount,0,'rejected legacy clients must never allocate authoritative sessions');
}finally{
  await server.close();
}

console.log('real websocket server rejects legacy minecraft-web-v5 before session allocation: PASS');
