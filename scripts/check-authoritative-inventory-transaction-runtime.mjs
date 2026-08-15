import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {decodeServerInventorySnapshot,SERVER_INVENTORY_SNAPSHOT_KIND} from '../src/server-inventory-snapshot.js';
import {decodeInventoryTransactionResult,encodeInventoryTransactionRequest,INVENTORY_TRANSACTION_RESULT_KIND} from '../src/inventory-transaction-wire.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function queue(socket){const values=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(3000,label)]);}};}
async function nextKind(messages,kind,label){for(let i=0;i<200;i++){const message=await messages.next(label);if(message.kind===kind)return message;}throw new Error(`did not receive ${kind}`);}
async function open(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(3000,'inventory transaction websocket open')]);}
function closeEvent(socket,label){return Promise.race([new Promise(resolve=>socket.once('close',(code,reason)=>resolve({code,reason:reason.toString('utf8')}))),timeout(3000,label)]);}

const errors=[],runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'inventory-transactions',seed:'inventory-transactions',prompt:'plains',mode:'creative',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:16},setIntervalFn:()=>({timer:'disabled'}),clearIntervalFn:()=>{},onError:event=>errors.push(event)});
let socket=null;
try{
  const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}${runtime.server.path}`;socket=await open(url);const messages=queue(socket);socket.send(JSON.stringify(encodeClientHello()));const welcome=await messages.next('inventory transaction welcome');assert.equal(welcome.kind,'welcome');const session=welcome.session;
  const initial=decodeServerInventorySnapshot(await nextKind(messages,SERVER_INVENTORY_SNAPSHOT_KIND,'initial inventory snapshot'),{expectedSession:session});assert.equal(initial.revision,0);assert.equal(initial.cursor,null);assert.deepEqual(initial.slots[HOTBAR_START],{id:'block:1',count:64});

  const pick=encodeInventoryTransactionRequest({session,requestId:0,expectedRevision:0,action:{type:'slot-click',slot:HOTBAR_START,button:0,shift:false}});socket.send(JSON.stringify(pick));
  const changed=decodeServerInventorySnapshot(await nextKind(messages,SERVER_INVENTORY_SNAPSHOT_KIND,'changed inventory snapshot'),{expectedSession:session});assert.equal(changed.revision,1);assert.equal(changed.slots[HOTBAR_START],null);assert.deepEqual(changed.cursor,{id:'block:1',count:64});
  const pickResult=decodeInventoryTransactionResult(await nextKind(messages,INVENTORY_TRANSACTION_RESULT_KIND,'picked-up transaction result'),{expectedSession:session});assert.deepEqual(pickResult,{v:1,kind:INVENTORY_TRANSACTION_RESULT_KIND,session,requestId:0,ok:true,code:'picked-up',revision:1});

  const stale=encodeInventoryTransactionRequest({session,requestId:1,expectedRevision:0,action:{type:'return-cursor'}});socket.send(JSON.stringify(stale));const staleResult=decodeInventoryTransactionResult(await nextKind(messages,INVENTORY_TRANSACTION_RESULT_KIND,'stale transaction result'),{expectedSession:session});assert.equal(staleResult.requestId,1);assert.equal(staleResult.ok,false);assert.equal(staleResult.code,'stale-revision');assert.equal(staleResult.revision,1);const authoritative=runtime.inventories.snapshot(session);assert.equal(authoritative.revision,1);assert.deepEqual(authoritative.cursor,{id:'block:1',count:64},'stale request must not mutate authoritative cursor');

  const replayClose=closeEvent(socket,'inventory transaction replay close');socket.send(JSON.stringify(stale));const replay=await replayClose;assert.equal(replay.code,1008);assert.match(replay.reason,/stale or duplicate inventory transaction request/);assert.deepEqual(errors,[]);
}finally{if(socket?.readyState===WebSocket.OPEN)socket.terminate();await runtime.stop();}

console.log('real WebSocket inventory transaction revision guard + replay rejection: PASS');
