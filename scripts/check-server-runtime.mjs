import assert from 'node:assert/strict';
import WebSocket from 'ws';
import './check-world-edit-replication.mjs';
import {BLOCK,CHUNK_SIZE} from '../src/blocks.js';
import {encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {encodePlayerControlFrame} from '../src/player-control-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {decodeServerInventorySnapshot} from '../src/server-inventory-snapshot.js';
import {decodeServerWorldInfo} from '../src/server-world-info.js';
import {decodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {WorldEditSyncAssembler,authoritativeEditsToVoxelEdits} from '../src/world-edit-replication.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';
import {normalizeRuntimeConfig,runtimeConfigFromEnv,DEFAULT_RUNTIME_PORT,DEFAULT_RUNTIME_WORLD_ID,DEFAULT_RUNTIME_WORLD_SEED,DEFAULT_RUNTIME_TERRAIN_PROMPT,DEFAULT_RUNTIME_MODE} from '../server/runtime-config.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
const near=(actual,expected,epsilon=1e-9,label='value')=>assert.ok(Math.abs(actual-expected)<=epsilon,`${label}: expected ${expected}, got ${actual}`);

const defaults=normalizeRuntimeConfig();assert.equal(defaults.host,'127.0.0.1');assert.equal(defaults.port,DEFAULT_RUNTIME_PORT);assert.equal(defaults.worldId,DEFAULT_RUNTIME_WORLD_ID);assert.equal(defaults.seed,DEFAULT_RUNTIME_WORLD_SEED);assert.equal(defaults.prompt,DEFAULT_RUNTIME_TERRAIN_PROMPT);assert.equal(defaults.mode,DEFAULT_RUNTIME_MODE);assert.equal(defaults.spawnX,0);assert.equal(defaults.spawnZ,0);assert.equal(defaults.prefetchRadius,1);assert.equal(defaults.terrainCacheChunks,256);assert.equal(defaults.allowMissingOrigin,false);assert.deepEqual(defaults.allowedOrigins,['http://localhost:4173','http://127.0.0.1:4173']);assert.equal(Object.isFrozen(defaults),true);assert.equal(Object.isFrozen(defaults.allowedOrigins),true);
const direct=normalizeRuntimeConfig({host:'0.0.0.0',port:0,allowedOrigins:' * ',allowMissingOrigin:'true',worldId:'world:test',seed:'世界种子',prompt:'森林',mode:'creative',spawnX:'33',spawnZ:'-17',prefetchRadius:'2',terrainCacheChunks:'64'});assert.equal(direct.port,0,'runtime factory may use ephemeral port for tests/embedding');assert.equal(direct.allowedOrigins,'*');assert.equal(direct.allowMissingOrigin,true);assert.equal(direct.mode,'creative');assert.equal(direct.spawnX,33);assert.equal(direct.spawnZ,-17);assert.equal(direct.prefetchRadius,2);assert.equal(direct.terrainCacheChunks,64);
const envConfig=runtimeConfigFromEnv({MCWEB_WS_HOST:'10.0.0.5',MCWEB_WS_PORT:'9090',HOST:'ignored',PORT:'9999',MCWEB_ALLOWED_ORIGINS:'https://a.example, https://b.example',MCWEB_ALLOW_MISSING_ORIGIN:'0',MCWEB_WORLD_ID:'env-world',MCWEB_WORLD_SEED:'env-seed',MCWEB_TERRAIN_PROMPT:'平原',MCWEB_WORLD_MODE:'adventure',MCWEB_SPAWN_X:'4.5',MCWEB_SPAWN_Z:'-2.5',MCWEB_PREFETCH_RADIUS:'0',MCWEB_TERRAIN_CACHE_CHUNKS:'32'});assert.equal(envConfig.host,'10.0.0.5');assert.equal(envConfig.port,9090);assert.deepEqual(envConfig.allowedOrigins,['https://a.example','https://b.example']);assert.equal(envConfig.worldId,'env-world');assert.equal(envConfig.mode,'adventure');assert.equal(envConfig.spawnX,4.5);assert.equal(envConfig.spawnZ,-2.5);assert.equal(envConfig.prefetchRadius,0);assert.equal(envConfig.terrainCacheChunks,32);
const fallbackEnv=runtimeConfigFromEnv({HOST:'127.0.0.2',PORT:'8081'});assert.equal(fallbackEnv.host,'127.0.0.2');assert.equal(fallbackEnv.port,8081);
assert.throws(()=>runtimeConfigFromEnv({MCWEB_WS_PORT:'0'}),/1 to 65535/);assert.throws(()=>normalizeRuntimeConfig({worldId:'bad world'}),/worldId/);assert.throws(()=>normalizeRuntimeConfig({seed:'bad\nseed'}),/world seed/);assert.throws(()=>normalizeRuntimeConfig({prompt:'bad\tprompt'}),/terrain prompt/);assert.throws(()=>normalizeRuntimeConfig({mode:'builder'}),/unsupported authoritative/);assert.throws(()=>normalizeRuntimeConfig({prefetchRadius:17}),/prefetchRadius/);assert.throws(()=>normalizeRuntimeConfig({terrainCacheChunks:0}),/terrainCacheChunks/);assert.throws(()=>normalizeRuntimeConfig({allowMissingOrigin:'yes'}),/1\/0\/true\/false/);assert.throws(()=>normalizeRuntimeConfig({host:''}),/non-empty/);

function openClient(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(2500,'runtime websocket open')]);}
function messageQueue(socket){const queued=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else queued.push(value);});return{next(label){if(queued.length)return Promise.resolve(queued.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(2500,label)]);}};}
async function waitUntil(predicate,label){return Promise.race([new Promise(resolve=>{const poll=()=>predicate()?resolve():setTimeout(poll,10);poll();}),timeout(2500,label)]);}

let tickCallback=null,tickDelay=null,clearedTimer=null;const logs=[],errors=[];
const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'runtime-world',seed:'golden-seed',prompt:'mountain forest',mode:'survival',spawnX:33,spawnZ:-17,prefetchRadius:1,terrainCacheChunks:32},setIntervalFn:(callback,ms)=>(tickCallback=callback,tickDelay=ms,{timer:'runtime'}),clearIntervalFn:timer=>{clearedTimer=timer;},onLog:event=>logs.push(event),onError:event=>errors.push(event)});
assert.equal(runtime.state,'idle');assert.equal(runtime.running,false);assert.equal(runtime.authoritative.running,false);assert.equal(runtime.config.worldId,'runtime-world');assert.equal(runtime.world.seed,'golden-seed');
const editX=100,editY=63,editZ=100,baseId=runtime.world.getBaseBlock(editX,editY,editZ),editId=baseId===BLOCK.AIR?BLOCK.STONE:BLOCK.AIR,seededEdit=runtime.world.setBlock(editX,editY,editZ,editId);assert.equal(seededEdit.changed,true);assert.equal(seededEdit.revision,1);assert.equal(runtime.world.revision,1);
let socket=null;
try{
  const address=await runtime.start();assert.equal(runtime.state,'running');assert.equal(runtime.running,true);assert.equal(runtime.address,address);assert.ok(address.port>0);assert.equal(tickDelay,50);assert.equal(typeof tickCallback,'function');assert.equal(runtime.authoritative.running,true);assert.equal(logs[0].event,'listening');assert.equal((await runtime.start()).port,address.port,'second start while running is idempotent');
  const health=await fetch(`http://127.0.0.1:${address.port}/healthz`);assert.equal(health.status,200);assert.deepEqual(await health.json(),{ok:true,protocol:MULTIPLAYER_SUBPROTOCOL});

  socket=await openClient(`ws://127.0.0.1:${address.port}${runtime.server.path}`);const messages=messageQueue(socket);socket.send(JSON.stringify(encodeClientHello()));
  const welcome=await messages.next('runtime welcome');assert.equal(welcome.kind,'welcome');
  const worldInfo=decodeServerWorldInfo(await messages.next('runtime world info'),{expectedSession:welcome.session});assert.deepEqual({worldId:worldInfo.worldId,terrainVersion:worldInfo.terrainVersion,seed:worldInfo.seed,prompt:worldInfo.prompt,tickRate:worldInfo.tickRate},{worldId:'runtime-world',terrainVersion:1,seed:'golden-seed',prompt:'mountain forest',tickRate:20});
  const editAssembler=new WorldEditSyncAssembler({session:welcome.session,worldId:worldInfo.worldId});let editSnapshot=null;while(!editSnapshot){const step=editAssembler.accept(await messages.next('runtime world edit sync'));if(step.complete)editSnapshot=step.result;}
  assert.equal(editSnapshot.revision,1);assert.deepEqual(editSnapshot.edits,{[`${editX},${editY},${editZ}`]:editId});
  const voxelEdits=authoritativeEditsToVoxelEdits(editSnapshot.edits),localX=editX%CHUNK_SIZE,localZ=editZ%CHUNK_SIZE,localIndex=localX+CHUNK_SIZE*(localZ+CHUNK_SIZE*editY);assert.deepEqual(voxelEdits['6,6'],[[localIndex,editId]]);
  assert.deepEqual(authoritativeEditsToVoxelEdits({'-1,10,-1':BLOCK.WATER})['-1,-1'],[[15+CHUNK_SIZE*(15+CHUNK_SIZE*10),BLOCK.WATER]]);assert.throws(()=>authoritativeEditsToVoxelEdits({'1,2,3':999}),/known block/);
  const initial=decodeServerPlayerSnapshot(await messages.next('runtime initial snapshot'),{expectedSession:welcome.session});assert.equal(initial.tick,0);assert.deepEqual(initial.position,{x:33.5,y:23.001,z:-16.5});
  const inventory=decodeServerInventorySnapshot(await messages.next('runtime initial inventory'),{expectedSession:welcome.session});assert.equal(inventory.mode,'survival');assert.equal(inventory.revision,0);assert.equal(inventory.slots.length,36);assert.equal(inventory.slots.every(slot=>slot===null),true);
  assert.equal(runtime.server.sessionCount,1);assert.equal(runtime.authoritative.sessionCount,1);

  const view=encodePlayerViewFrame({yaw:Math.PI/2,pitch:0},7),control=encodePlayerControlFrame({side:0,forward:1,jump:false,sneak:false,sprint:false,primary:false},8);socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:0,kind:'view',payload:view})));socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:1,kind:'control',payload:control})));
  await waitUntil(()=>runtime.server.getSessionInputState(welcome.session)?.control?.sequence===8,'runtime validated input state');const movedPromise=messages.next('runtime tick1 snapshot');tickCallback();const moved=decodeServerPlayerSnapshot(await movedPromise,{expectedSession:welcome.session});assert.equal(moved.tick,1);near(moved.position.x,33.5-4.3*.05,1e-9,'production runtime +90 W x');near(moved.position.z,-16.5,1e-9,'production runtime +90 W z');assert.equal(moved.grounded,true);assert.deepEqual(errors,[]);

  const closePromise=new Promise(resolve=>socket.once('close',(code,reason)=>resolve({code,reason:reason.toString('utf8')})));await runtime.stop();const closed=await Promise.race([closePromise,timeout(2500,'runtime client close')]);assert.ok(closed.code===1006||closed.code===1001||closed.code===1000);assert.equal(runtime.state,'stopped');assert.equal(runtime.running,false);assert.equal(runtime.authoritative.running,false);assert.deepEqual(clearedTimer,{timer:'runtime'});assert.equal(runtime.authoritative.sessionCount,0);assert.equal(logs.at(-1).event,'stopped');await runtime.stop();await assert.rejects(runtime.start(),/cannot start authoritative runtime while stopped/);
}finally{if(runtime.state!=='stopped')await runtime.stop();if(socket&&socket.readyState===WebSocket.OPEN)socket.terminate();}

assert.throws(()=>createAuthoritativeServerRuntime({config:null}),/runtime config/);assert.throws(()=>createAuthoritativeServerRuntime({onLog:null}),/onLog/);assert.throws(()=>createAuthoritativeServerRuntime({onError:null}),/onError/);
console.log('production authoritative runtime + world edits + inventory bootstrap + tick lifecycle: PASS');
