import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {BLOCK} from '../src/blocks.js';
import {LiveWorldWebSocketClient} from '../src/live-world-websocket-client.js';
import {MultiplayerInputBridge} from '../src/multiplayer-input-bridge.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check,label,timeoutMs=5000){const deadline=Date.now()+timeoutMs;while(Date.now()<deadline){const value=check();if(value)return value;await sleep(10);}throw new Error(`timeout waiting for ${label}`);}
async function waitForTick(check,label,timeoutMs=5000){const deadline=Date.now()+timeoutMs;while(Date.now()<deadline){const value=check();if(value)return value;if(typeof tick==='function')tick();await sleep(10);}throw new Error(`timeout waiting for ${label}`);}

let tick=null;const errors=[];const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'furnace-runtime',seed:'furnace-runtime',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:16},setIntervalFn:fn=>(tick=fn,{id:'manual-tick'}),clearIntervalFn:()=>{},onError:event=>errors.push(event)});
const client=new LiveWorldWebSocketClient({allowInsecure:true,socketFactory:(url,protocol)=>new WebSocket(url,[protocol],{origin:ORIGIN})});
try{
  const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}${runtime.server.path}`;client.connect(url);await waitFor(()=>client.session&&client.worldInfo&&client.worldEditSync&&client.inventorySnapshot&&client.playerCraftingSnapshot&&client.combatSnapshot,'multiplayer bootstrap');const session=client.session;assert.equal(typeof tick,'function');const player=runtime.authoritative.snapshot(session);assert.ok(player);
  const furnace={x:Math.floor(player.position.x),y:Math.floor(player.position.y+1.62),z:Math.floor(player.position.z)-2};runtime.setBlock(furnace.x,furnace.y,furnace.z,BLOCK.FURNACE);await waitFor(()=>client.worldRevision===runtime.world.revision,'furnace block replication');
  const bridge=new MultiplayerInputBridge({transport:client,isReady:()=>client.state==='ready',viewProvider:()=>({yaw:0,pitch:0})});bridge.sendUse({yaw:0,pitch:0});const opened=await waitForTick(()=>client.furnaceSnapshot,'furnace open');assert.deepEqual(opened.target,furnace);assert.equal(opened.revision,0);assert.equal(runtime.furnaces.hub.furnaceCount,1);

  runtime.addInventoryItem(session,'raw_iron',2);await waitFor(()=>client.inventorySnapshot?.revision===1,'raw iron inventory replication');client.sendInventoryTransaction({type:'slot-click',slot:0,button:0,shift:false},client.inventorySnapshot.revision);await waitFor(()=>client.inventorySnapshot?.cursor?.id==='raw_iron','raw iron cursor pickup');client.sendFurnaceTransaction({type:'slot-click',slot:0,button:0,shift:false},client.inventorySnapshot.revision);await waitFor(()=>client.furnaceSnapshot?.revision===1,'raw iron furnace insert');await waitFor(()=>client.inventorySnapshot?.cursor===null,'raw iron cursor cleared');assert.deepEqual(client.furnaceSnapshot.slots[0],{id:'raw_iron',count:2});

  runtime.addInventoryItem(session,'block:5',1);await waitFor(()=>client.inventorySnapshot?.slots[0]?.id==='block:5','fuel inventory replication');client.sendInventoryTransaction({type:'slot-click',slot:0,button:0,shift:false},client.inventorySnapshot.revision);await waitFor(()=>client.inventorySnapshot?.cursor?.id==='block:5','fuel cursor pickup');client.sendFurnaceTransaction({type:'slot-click',slot:1,button:0,shift:false},client.inventorySnapshot.revision);await waitFor(()=>client.furnaceSnapshot?.revision===2,'fuel furnace insert');await waitFor(()=>client.inventorySnapshot?.cursor===null,'fuel cursor cleared');

  tick();const burning=await waitFor(()=>client.furnaceSnapshot?.cookProgress===1&&client.furnaceSnapshot?.revision===3&&client.furnaceSnapshot?.lit,'first furnace burn tick');tick();const timerOnly=await waitFor(()=>client.furnaceSnapshot?.cookProgress===2,'timer-only furnace progress');assert.equal(timerOnly.revision,3,'timer-only furnace progress must retain the transaction revision');assert.equal(client.state,'ready','same-revision timer snapshots must not trip websocket protocol guards');

  client.sendFurnaceTransaction({type:'close'},0);await waitFor(()=>client.furnaceSnapshot===null,'furnace close');await waitFor(()=>client.pendingFurnaceTransactions.size===0,'furnace close acknowledgement');assert.equal(runtime.furnaces.openBySession.has(session),false);assert.equal(runtime.furnaces.hub.furnaceCount,1,'closing GUI keeps furnace world state alive');for(let i=0;i<198;i++)tick();const closedState=runtime.furnaces.hub.snapshot(furnace);assert.equal(closedState.revision,4);assert.deepEqual(closedState.slots,[{id:'raw_iron',count:1},null,{id:'iron_ingot',count:1}]);

  bridge.sendUse({yaw:0,pitch:0});await waitForTick(()=>client.furnaceSnapshot?.slots[2]?.id==='iron_ingot','furnace reopen with output');client.sendFurnaceTransaction({type:'take-output',button:0,shift:false},client.inventorySnapshot.revision);await waitFor(()=>client.inventorySnapshot?.cursor?.id==='iron_ingot','authoritative furnace output cursor');await waitFor(()=>client.pendingFurnaceTransactions.size===0,'furnace output acknowledgement');assert.equal(client.furnaceSnapshot.slots[2],null);

  runtime.setBlock(furnace.x,furnace.y,furnace.z,BLOCK.AIR);await waitFor(()=>client.furnaceSnapshot===null,'furnace forced close after block removal');assert.equal(runtime.furnaces.hub.furnaceCount,0);assert.equal(errors.length,0);
}finally{try{client.close();}catch{}await runtime.stop();}
console.log('live authoritative furnace open + same-revision progress + close persistence + smelt + output + block removal: PASS');
