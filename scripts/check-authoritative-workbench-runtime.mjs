import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {BLOCK} from '../src/blocks.js';
import {MULTIPLAYER_SUBPROTOCOL} from '../src/multiplayer-handshake.js';
import {LiveWorldWebSocketClient} from '../src/live-world-websocket-client.js';
import {MultiplayerInputBridge} from '../src/multiplayer-input-bridge.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check,label,timeoutMs=5000){const deadline=Date.now()+timeoutMs;while(Date.now()<deadline){const value=check();if(value)return value;await sleep(10);}throw new Error(`timeout waiting for ${label}`);}

let tick=null;const errors=[];const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'workbench-runtime',seed:'workbench-runtime',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:16},setIntervalFn:fn=>(tick=fn,{id:'manual-tick'}),clearIntervalFn:()=>{},workbenchContainerIdFactory:()=> 'w:runtime',onError:event=>errors.push(event)});
const client=new LiveWorldWebSocketClient({allowInsecure:true,socketFactory:(url,protocol)=>new WebSocket(url,[protocol],{origin:ORIGIN})});
try{
  const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}${runtime.server.path}`;client.connect(url);await waitFor(()=>client.session&&client.worldInfo&&client.worldEditSync&&client.inventorySnapshot&&client.playerCraftingSnapshot,'multiplayer bootstrap');const session=client.session;assert.equal(typeof tick,'function');const player=runtime.authoritative.snapshot(session);assert.ok(player);assert.equal(runtime.inventories.selectedStack(session,0),null,'workbench must be openable with an empty selected slot');
  const table={x:Math.floor(player.position.x),y:Math.floor(player.position.y+1.62),z:Math.floor(player.position.z)-2};runtime.setBlock(table.x,table.y,table.z,BLOCK.CRAFTING_TABLE);await waitFor(()=>client.worldRevision===runtime.world.revision,'workbench block replication');
  const bridge=new MultiplayerInputBridge({transport:client,isReady:()=>client.state==='ready',viewProvider:()=>({yaw:0,pitch:0})});bridge.sendUse({yaw:0,pitch:0});tick();const opened=await waitFor(()=>client.workbenchSnapshot,'workbench open');assert.equal(opened.containerId,'w:runtime');assert.deepEqual(opened.target,table);assert.equal(opened.revision,0);assert.equal(runtime.workbenches.hub.sessionCount,1);

  runtime.addInventoryItem(session,'block:6',1);await waitFor(()=>client.inventorySnapshot?.revision===1,'log inventory replication');client.sendInventoryTransaction({type:'slot-click',slot:0,button:0,shift:false},client.inventorySnapshot.revision);await waitFor(()=>client.inventorySnapshot?.cursor?.id==='block:6','log cursor pickup');await waitFor(()=>client.pendingInventoryTransactions.size===0,'inventory transaction result');client.sendWorkbenchTransaction({type:'input-click',slot:0,button:0,shift:false},client.inventorySnapshot.revision);await waitFor(()=>client.workbenchSnapshot?.revision===1,'workbench input snapshot');await waitFor(()=>client.pendingWorkbenchTransactions.size===0,'workbench input result');assert.deepEqual(client.workbenchSnapshot.result,{id:'block:5',count:4});assert.equal(client.inventorySnapshot.cursor,null);

  client.sendWorkbenchTransaction({type:'take-result',shift:false},client.inventorySnapshot.revision);await waitFor(()=>client.inventorySnapshot?.cursor?.id==='block:5','workbench result cursor');await waitFor(()=>client.workbenchSnapshot?.revision===2,'workbench result snapshot');await waitFor(()=>client.pendingWorkbenchTransactions.size===0,'workbench result acknowledgement');assert.equal(client.inventorySnapshot.cursor.count,4);const staleInventoryRevision=0;client.sendWorkbenchTransaction({type:'close'},staleInventoryRevision);await waitFor(()=>client.workbenchSnapshot===null,'workbench close');await waitFor(()=>client.pendingWorkbenchTransactions.size===0,'workbench close result');assert.equal(runtime.workbenches.hub.sessionCount,0);assert.equal(runtime.inventories.snapshot(session).cursor,null);assert.equal(runtime.inventories.snapshot(session).slots.some(stack=>stack?.id==='block:5'&&stack.count===4),true,'close cleanup returns cursor to inventory despite stale expected revision');

  bridge.sendUse({yaw:0,pitch:0});tick();await waitFor(()=>client.workbenchSnapshot?.containerId==='w:runtime','workbench reopen');runtime.setBlock(table.x,table.y,table.z,BLOCK.AIR);tick();await waitFor(()=>client.workbenchSnapshot===null,'forced close after table removal');assert.equal(runtime.workbenches.hub.sessionCount,0);assert.equal(errors.length,0);
}finally{try{client.close();}catch{}await runtime.stop();}
console.log('real runtime empty-hand workbench open + authoritative transaction + stale-safe close + forced invalidation: PASS');
