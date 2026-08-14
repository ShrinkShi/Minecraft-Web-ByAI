import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {Inventory} from '../src/inventory.js';
import {CREATIVE_START} from '../src/items.js';
import {HOTBAR_START,INVENTORY_SLOT_COUNT} from '../src/inventory-layout.js';
import {encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {encodePlayerActionFrame} from '../src/player-action-frame.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {ServerPlayerInventoryHub,ServerPlayerInventoryState} from '../server/player-inventory-state.mjs';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const creative=new Inventory('creative');
assert.equal(creative.slots.length,INVENTORY_SLOT_COUNT,'creative client inventory must stay exactly 36 slots');
assert.equal(creative.hotbar(0).id,CREATIVE_START[0]);assert.equal(creative.hotbar(8).id,CREATIVE_START[8]);assert.equal(creative.slots[0].id,CREATIVE_START[9],'starter overflow belongs in main inventory instead of creating slot 36');assert.equal(creative.slots[36],undefined);
const legacySlots=Array(37).fill(null);legacySlots[36]={id:'bed',count:1};const migrated=new Inventory('survival',{slots:legacySlots});assert.equal(migrated.slots.length,INVENTORY_SLOT_COUNT);assert.deepEqual(migrated.slots[0],{id:'bed',count:1},'legacy slot 36 must migrate into the real 36-slot inventory instead of disappearing');

const state=new ServerPlayerInventoryState('s:inventory',{mode:'creative'});const snapshot=state.snapshot();assert.equal(snapshot.slots.length,INVENTORY_SLOT_COUNT);assert.equal(snapshot.slots[HOTBAR_START].id,CREATIVE_START[0]);assert.equal(snapshot.slots[0].id,CREATIVE_START[9]);assert.equal(state.selectedStack(8).id,'wooden_pickaxe');assert.equal(state.add('stick',65),0);assert.equal(state.remove(1,1).id,'stick');assert.throws(()=>state.add('missing-item',1),/known item/);assert.throws(()=>state.selectedStack(9),/0 to 8/);
const survival=new ServerPlayerInventoryState('s:survival',{mode:'survival'});assert.equal(survival.snapshot().slots.every(value=>value===null),true);
const hub=new ServerPlayerInventoryHub();hub.join('s:hub',{mode:'creative'});assert.equal(hub.sessionCount,1);assert.equal(hub.selectedStack('s:hub',0).id,CREATIVE_START[0]);assert.equal(hub.leave('s:hub'),true);assert.equal(hub.sessionCount,0);assert.throws(()=>hub.snapshot('s:hub'),/unknown inventory session/);

const ORIGIN='http://localhost:4173';const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function queue(socket){const values=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(2500,label)]);}};}
async function open(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(2500,'inventory runtime websocket open')]);}
async function waitUntil(predicate,label){return Promise.race([new Promise(resolve=>{const poll=()=>predicate()?resolve():setTimeout(poll,5);poll();}),timeout(2500,label)]);}

const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'inventory-runtime',seed:'inventory-seed',prompt:'plains',mode:'creative',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},setIntervalFn:()=>({timer:'inventory'}),clearIntervalFn:()=>{}});let socket=null;
try{
  const address=await runtime.start();socket=await open(`ws://127.0.0.1:${address.port}${runtime.server.path}`);const messages=queue(socket);socket.send(JSON.stringify(encodeClientHello()));const welcome=await messages.next('inventory welcome');assert.equal(welcome.kind,'welcome');
  await waitUntil(()=>runtime.inventories.sessionCount===1,'runtime inventory join');assert.equal(runtime.inventories.snapshot(welcome.session).slots.length,INVENTORY_SLOT_COUNT);assert.equal(runtime.selectedStack(welcome.session).id,CREATIVE_START[0]);
  const select=encodePlayerActionFrame({kind:'hotbar-select',slot:8},0);socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:0,kind:'action',payload:select})));await waitUntil(()=>runtime.server.getSessionInputState(welcome.session)?.selectedSlot===8,'authoritative hotbar selection');assert.equal(runtime.selectedStack(welcome.session).id,'wooden_pickaxe','runtime selection must combine validated hotbar input with server-owned inventory contents');
  const closed=new Promise(resolve=>socket.once('close',resolve));socket.close(1000,'inventory test complete');await Promise.race([closed,timeout(2500,'inventory websocket close')]);await waitUntil(()=>runtime.inventories.sessionCount===0,'runtime inventory leave');
}finally{if(runtime.state!=='stopped')await runtime.stop();if(socket&&socket.readyState===WebSocket.OPEN)socket.terminate();}

console.log('36-slot inventory layout + legacy migration + authoritative inventory/hotbar runtime foundation: PASS');
