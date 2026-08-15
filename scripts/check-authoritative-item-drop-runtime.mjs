import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {encodePlayerActionFrame} from '../src/player-action-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {decodeServerInventorySnapshot,SERVER_INVENTORY_SNAPSHOT_KIND} from '../src/server-inventory-snapshot.js';
import {decodeServerPlayerSnapshot,SERVER_PLAYER_SNAPSHOT_KIND} from '../src/server-player-snapshot.js';
import {decodeItemEntityReplication,ITEM_ENTITY_SPAWN_KIND,ITEM_ENTITY_SNAPSHOT_KIND} from '../src/item-entity-replication.js';
import {WORLD_EDIT_SYNC_END_KIND} from '../src/world-edit-replication.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function queue(socket){const values=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(2500,label)]);}};}
async function nextKind(messages,kind,label){for(let i=0;i<64;i++){const message=await messages.next(label);if(message.kind===kind)return message;}throw new Error(`did not receive ${kind}`);}
async function open(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(2500,'item drop websocket open')]);}
async function waitUntil(predicate,label){return Promise.race([new Promise(resolve=>{const poll=()=>predicate()?resolve():setTimeout(poll,5);poll();}),timeout(2500,label)]);}

let tick=null;const errors=[];const runtime=createAuthoritativeServerRuntime({itemEntityIdFactory:()=> 'i:runtime_drop',config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'item-drop-runtime',seed:'item-drop-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},setIntervalFn:callback=>(tick=callback,{timer:'item-drop'}),clearIntervalFn:()=>{},onError:event=>errors.push(event)});let socket=null;
try{
  const address=await runtime.start();socket=await open(`ws://127.0.0.1:${address.port}${runtime.server.path}`);const messages=queue(socket);socket.send(JSON.stringify(encodeClientHello()));const welcome=await messages.next('item drop welcome');assert.equal(welcome.kind,'welcome');await messages.next('item drop world info');for(;;){const message=await messages.next('item drop initial edit sync');if(message.kind===WORLD_EDIT_SYNC_END_KIND)break;}
  const initial=decodeServerPlayerSnapshot(await nextKind(messages,SERVER_PLAYER_SNAPSHOT_KIND,'item drop initial player'),{expectedSession:welcome.session});assert.equal(initial.mode,'survival');const initialInventory=decodeServerInventorySnapshot(await nextKind(messages,SERVER_INVENTORY_SNAPSHOT_KIND,'item drop initial inventory'),{expectedSession:welcome.session});assert.equal(initialInventory.revision,0);assert.equal(initialInventory.slots[HOTBAR_START],null);
  assert.equal(runtime.inventories.addPickup(welcome.session,'stick',1),0);assert.deepEqual(runtime.inventories.snapshot(welcome.session).slots[HOTBAR_START],{id:'stick',count:1});assert.equal(runtime.inventories.snapshot(welcome.session).revision,1);
  const view=encodePlayerViewFrame({yaw:.35,pitch:-.1},0);socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:0,kind:'view',payload:view})));const drop=encodePlayerActionFrame({kind:'drop',viewSeq:0},0);socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:1,kind:'action',payload:drop})));await waitUntil(()=>runtime.server.getSessionInputState(welcome.session)?.pendingActionCount===1,'queued authoritative drop');
  tick();const playerWire=decodeServerPlayerSnapshot(await nextKind(messages,SERVER_PLAYER_SNAPSHOT_KIND,'item drop tick player'),{expectedSession:welcome.session});assert.equal(playerWire.tick,1);
  const inventoryWire=decodeServerInventorySnapshot(await nextKind(messages,SERVER_INVENTORY_SNAPSHOT_KIND,'item drop inventory mutation'),{expectedSession:welcome.session});assert.equal(inventoryWire.revision,2);assert.equal(inventoryWire.slots[HOTBAR_START],null,'survival drop must consume the server-owned selected hotbar item');assert.equal(runtime.inventories.snapshot(welcome.session).slots[HOTBAR_START],null);
  const spawn=decodeItemEntityReplication(await nextKind(messages,ITEM_ENTITY_SPAWN_KIND,'item drop entity spawn'));assert.equal(spawn.kind,ITEM_ENTITY_SPAWN_KIND);assert.equal(spawn.entityId,'i:runtime_drop');assert.equal(spawn.itemId,'stick');assert.equal(spawn.count,1);assert.equal(runtime.itemEntities.size,1);
  const moved=decodeItemEntityReplication(await nextKind(messages,ITEM_ENTITY_SNAPSHOT_KIND,'item drop first entity snapshot'));assert.equal(moved.kind,ITEM_ENTITY_SNAPSHOT_KIND);assert.equal(moved.entityId,spawn.entityId);assert.equal(moved.revision,1);assert.deepEqual(errors,[]);
}finally{if(runtime.state!=='stopped')await runtime.stop();if(socket&&socket.readyState===WebSocket.OPEN)socket.terminate();}

console.log('referenced drop action -> survival inventory consume + authoritative item entity spawn: PASS');
