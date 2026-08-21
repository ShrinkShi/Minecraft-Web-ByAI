import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {MULTIPLAYER_SUBPROTOCOL} from '../src/multiplayer-handshake.js';
import {LiveWorldWebSocketClient} from '../src/live-world-websocket-client.js';
import {MultiplayerInputBridge} from '../src/multiplayer-input-bridge.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check,label,timeoutMs=5000){const deadline=Date.now()+timeoutMs;while(Date.now()<deadline){const value=check();if(value)return value;await sleep(10);}throw new Error(`timeout waiting for ${label}`);}
async function pumpUntil(check,label,timeoutMs=5000){const deadline=Date.now()+timeoutMs;while(Date.now()<deadline){const value=check();if(value)return value;if(typeof tick==='function')tick();await sleep(10);}throw new Error(`timeout waiting for ${label}`);}
function createClient(){return new LiveWorldWebSocketClient({allowInsecure:true,socketFactory:(url,protocol)=>new WebSocket(url,[protocol],{origin:ORIGIN})});}
async function ready(client,url,label){client.connect(url);await waitFor(()=>client.session&&client.worldInfo&&client.worldEditSync&&client.inventorySnapshot&&client.equipmentSnapshot&&client.playerCraftingSnapshot&&client.combatSnapshot,`${label} bootstrap`);return client.session;}

let tick=null;const errors=[];const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'pvp-runtime',seed:'pvp-runtime-seed',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},setIntervalFn:fn=>(tick=fn,{id:'manual-pvp-tick'}),clearIntervalFn:()=>{},combatOptions:{attackCooldownMs:0,hurtCooldownMs:0},onError:event=>errors.push(event)});const a=createClient(),b=createClient();
try{
  const address=await runtime.start(),url=`ws://127.0.0.1:${address.port}${runtime.server.path}`,sessionA=await ready(a,url,'attacker'),sessionB=await ready(b,url,'target');assert.notEqual(sessionA,sessionB);assert.equal(typeof tick,'function');
  const base=runtime.authoritative.snapshot(sessionA).position,y=base.y;runtime.authoritative.simulation.relocate(sessionA,{x:base.x,y,z:base.z},{velocity:{x:0,y:0,z:0}});runtime.authoritative.simulation.relocate(sessionB,{x:base.x,y,z:base.z-2.4},{velocity:{x:0,y:0,z:0}});tick();await waitFor(()=>runtime.authoritative.snapshot(sessionB).tick>=1,'aligned player tick');
  assert.deepEqual(a.combatSnapshot,{version:1,kind:'player-combat-snapshot',session:sessionA,revision:0,hp:20,maxHp:20,dead:false});assert.equal(b.combatSnapshot.hp,20);

  runtime.addInventoryItem(sessionB,'iron_helmet',1);runtime.inventories.click(sessionB,0,0,false);const equipped=runtime.equipments.click(sessionB,runtime.inventories.state(sessionB),'head',0);assert.equal(equipped.changed,true);assert.equal(runtime.equipments.armorPoints(sessionB),2);runtime.server.sendEquipmentSnapshot(sessionB,runtime.equipments.snapshot(sessionB));await waitFor(()=>b.equipmentSnapshot?.revision===1,'equipped iron helmet snapshot');assert.deepEqual(b.equipmentSnapshot.slots.head,{id:'iron_helmet',count:1});

  const bridgeA=new MultiplayerInputBridge({transport:a,isReady:()=>a.state==='ready',viewProvider:()=>({yaw:0,pitch:0})}),bridgeB=new MultiplayerInputBridge({transport:b,isReady:()=>b.state==='ready',viewProvider:()=>({yaw:Math.PI,pitch:0})});bridgeA.sendAttack({yaw:0,pitch:0});await pumpUntil(()=>b.combatSnapshot?.revision===1&&b.equipmentSnapshot?.revision===2,'first armored PvP damage');assert.ok(Math.abs(b.combatSnapshot.hp-19.06)<1e-9);assert.equal(b.combatSnapshot.dead,false);assert.deepEqual(b.equipmentSnapshot.slots.head,{id:'iron_helmet',count:1,damage:1},'successful PvP damage must wear and replicate armor');assert.ok(runtime.authoritative.snapshot(sessionB).velocity.z<0,'server must apply knockback away from attacker');

  runtime.addInventoryItem(sessionB,'block:6',3);await waitFor(()=>b.inventorySnapshot?.slots.some(stack=>stack?.id==='block:6'&&stack.count===3),'target inventory replication');runtime.setPlayerMode(sessionA,'creative');bridgeA.sendAttack({yaw:0,pitch:0});await pumpUntil(()=>b.combatSnapshot?.dead===true,'lethal PvP combat');assert.equal(b.combatSnapshot.hp,0);assert.equal(runtime.combats.isDead(sessionB),true);assert.equal(runtime.inventories.snapshot(sessionB).slots.every(stack=>stack===null),true);assert.equal(runtime.inventories.snapshot(sessionB).cursor,null);assert.equal(runtime.equipments.snapshot(sessionB).slots.head,null);assert.equal(runtime.craftings.snapshot(sessionB).slots.every(stack=>stack===null),true);assert.ok(runtime.itemEntities.size>=1,'death inventory and surviving armor must become authoritative item entities');
  const deathInventoryRevision=runtime.inventories.snapshot(sessionB).revision;for(let i=0;i<4;i++)tick();assert.equal(runtime.inventories.snapshot(sessionB).revision,deathInventoryRevision,'dead player must not pick death drops back up');assert.equal(runtime.inventories.snapshot(sessionB).slots.every(stack=>stack===null),true);

  const deadPosition={...runtime.authoritative.snapshot(sessionB).position},deadTick=runtime.authoritative.snapshot(sessionB).tick;bridgeB.sendRespawn();await pumpUntil(()=>b.combatSnapshot?.dead===false,'authoritative respawn combat');assert.equal(b.combatSnapshot.hp,20);assert.equal(runtime.combats.isDead(sessionB),false);tick();const respawned=runtime.authoritative.snapshot(sessionB);assert.ok(respawned.tick>deadTick);assert.ok(Math.hypot(respawned.position.x-deadPosition.x,respawned.position.z-deadPosition.z)>.5,'respawn must relocate through authoritative world spawn');assert.deepEqual(errors,[]);
}finally{try{a.close();}catch{}try{b.close();}catch{}if(runtime.state!=='stopped')await runtime.stop();}
console.log('real two-client PvP armor mitigation + wear replication + death drops + respawn: PASS');
