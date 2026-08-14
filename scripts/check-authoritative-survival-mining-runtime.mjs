import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {BLOCK} from '../src/blocks.js';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {PLAYER_EYE_HEIGHT} from '../src/player-environment-rules.js';
import {encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {encodePlayerControlFrame} from '../src/player-control-frame.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {decodeServerInventorySnapshot} from '../src/server-inventory-snapshot.js';
import {decodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {decodeItemEntityReplication,ITEM_ENTITY_SPAWN_KIND,ITEM_ENTITY_DESPAWN_KIND} from '../src/item-entity-replication.js';
import {WORLD_EDIT_SYNC_END_KIND} from '../src/world-edit-replication.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function queue(socket){const values=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(2500,label)]);}};}
async function open(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(2500,'survival mining websocket open')]);}
async function waitUntil(predicate,label){return Promise.race([new Promise(resolve=>{const poll=()=>predicate()?resolve():setTimeout(poll,5);poll();}),timeout(2500,label)]);}

let tick=null;const errors=[];const runtime=createAuthoritativeServerRuntime({itemEntityIdFactory:()=> 'i:mining_drop',config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'survival-mining-runtime',seed:'survival-mining-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},setIntervalFn:callback=>(tick=callback,{timer:'mining'}),clearIntervalFn:()=>{},onError:event=>errors.push(event)});let socket=null;
try{
  const address=await runtime.start();socket=await open(`ws://127.0.0.1:${address.port}${runtime.server.path}`);const messages=queue(socket);socket.send(JSON.stringify(encodeClientHello()));const welcome=await messages.next('mining welcome');assert.equal(welcome.kind,'welcome');await messages.next('mining world info');for(;;){const message=await messages.next('mining initial edit sync');if(message.kind===WORLD_EDIT_SYNC_END_KIND)break;}
  const initial=decodeServerPlayerSnapshot(await messages.next('mining initial player'),{expectedSession:welcome.session});const initialInventory=decodeServerInventorySnapshot(await messages.next('mining initial inventory'),{expectedSession:welcome.session});assert.equal(initial.mode,'survival');assert.equal(initialInventory.revision,0);
  assert.equal(runtime.inventories.addPickup(welcome.session,'wooden_pickaxe',1),0);assert.deepEqual(runtime.inventories.snapshot(welcome.session).slots[HOTBAR_START],{id:'wooden_pickaxe',count:1});
  const x=Math.floor(initial.position.x),y=Math.floor(initial.position.y+PLAYER_EYE_HEIGHT),z=Math.floor(initial.position.z)-1;const placed=runtime.setBlock(x,y,z,BLOCK.STONE);assert.equal(placed.changed,true);const placedWire=await messages.next('authoritative target placement');assert.equal(placedWire.kind,'world-block-change');assert.equal(placedWire.id,BLOCK.STONE);
  const control=encodePlayerControlFrame({side:0,forward:0,jump:false,sneak:false,sprint:false,primary:true},0);socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:0,kind:'control',payload:control})));await waitUntil(()=>runtime.server.getSessionInputState(welcome.session)?.primary===true,'server primary hold');
  for(let i=1;i<=5;i++){tick();const player=decodeServerPlayerSnapshot(await messages.next(`mining player tick ${i}`),{expectedSession:welcome.session});assert.equal(player.tick,i);assert.equal(runtime.world.getBlock(x,y,z),BLOCK.STONE,`stone must remain before mining tick 6 (tick ${i})`);}
  tick();const sixth=decodeServerPlayerSnapshot(await messages.next('mining player tick 6'),{expectedSession:welcome.session});assert.equal(sixth.tick,6);assert.equal(runtime.world.getBlock(x,y,z),BLOCK.AIR,'wooden pickaxe must complete authoritative stone mining after six 50ms ticks');
  const brokenWire=await messages.next('authoritative mined block change');assert.equal(brokenWire.kind,'world-block-change');assert.equal(brokenWire.previous,BLOCK.STONE);assert.equal(brokenWire.id,BLOCK.AIR);
  const spawn=decodeItemEntityReplication(await messages.next('mined cobblestone spawn'));assert.equal(spawn.kind,ITEM_ENTITY_SPAWN_KIND);assert.equal(spawn.entityId,'i:mining_drop');assert.equal(spawn.itemId,'block:10');assert.equal(spawn.count,1);
  const pickedInventory=decodeServerInventorySnapshot(await messages.next('mined cobblestone pickup inventory'),{expectedSession:welcome.session});assert.equal(pickedInventory.revision,2);assert.deepEqual(pickedInventory.slots[HOTBAR_START],{id:'wooden_pickaxe',count:1});assert.deepEqual(pickedInventory.slots[HOTBAR_START+1],{id:'block:10',count:1},'authoritative mined drop pickup must use the hotbar-first ordering');
  const despawn=decodeItemEntityReplication(await messages.next('mined cobblestone despawn'));assert.equal(despawn.kind,ITEM_ENTITY_DESPAWN_KIND);assert.equal(despawn.reason,'picked');assert.equal(runtime.itemEntities.size,0);assert.deepEqual(errors,[]);
}finally{if(runtime.state!=='stopped')await runtime.stop();if(socket&&socket.readyState===WebSocket.OPEN)socket.terminate();}

console.log('primary hold -> timed stone break -> harvest drop -> hotbar-first pickup: PASS');
