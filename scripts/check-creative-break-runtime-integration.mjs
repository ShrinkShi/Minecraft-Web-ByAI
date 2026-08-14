import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {BLOCK} from '../src/blocks.js';
import {PLAYER_EYE_HEIGHT} from '../src/player-environment-rules.js';
import {encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {encodePlayerControlFrame} from '../src/player-control-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {decodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {decodeWorldEditReplication,WORLD_BLOCK_CHANGE_KIND,WORLD_EDIT_SYNC_END_KIND} from '../src/world-edit-replication.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function queue(socket){const values=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(2500,label)]);}};}
async function open(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(2500,'creative runtime websocket open')]);}
async function waitUntil(predicate,label){return Promise.race([new Promise(resolve=>{const poll=()=>predicate()?resolve():setTimeout(poll,5);poll();}),timeout(2500,label)]);}

let tick=null;const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'creative-break-runtime',seed:'creative-break-seed',prompt:'plains',mode:'creative',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},setIntervalFn:callback=>(tick=callback,{timer:'creative-break'}),clearIntervalFn:()=>{}});
let socket=null;
try{
  const address=await runtime.start();socket=await open(`ws://127.0.0.1:${address.port}${runtime.server.path}`);const messages=queue(socket);socket.send(JSON.stringify(encodeClientHello()));
  const welcome=await messages.next('creative welcome');assert.equal(welcome.kind,'welcome');await messages.next('creative world info');
  for(;;){const message=await messages.next('creative initial edit sync');if(message.kind===WORLD_EDIT_SYNC_END_KIND)break;}
  const initial=decodeServerPlayerSnapshot(await messages.next('creative initial snapshot'),{expectedSession:welcome.session});assert.equal(initial.mode,'creative');

  const x=Math.floor(initial.position.x),y=Math.floor(initial.position.y+PLAYER_EYE_HEIGHT),frontZ=Math.floor(initial.position.z)-1,targetZ=Math.floor(initial.position.z)-2;
  for(const change of [runtime.setBlock(x,y,frontZ,BLOCK.AIR),runtime.setBlock(x,y,targetZ,BLOCK.STONE)]){
    if(!change.changed)continue;const wire=decodeWorldEditReplication(await messages.next('creative setup block change'),{expectedSession:welcome.session,expectedWorldId:'creative-break-runtime'});assert.equal(wire.kind,WORLD_BLOCK_CHANGE_KIND);assert.equal(wire.revision,change.revision);
  }
  assert.equal(runtime.world.getBlock(x,y,targetZ),BLOCK.STONE);const revisionBeforeBreak=runtime.world.revision;

  const view=encodePlayerViewFrame({yaw:0,pitch:0},0),press=encodePlayerControlFrame({side:0,forward:0,jump:false,sneak:false,sprint:false,primary:true},0),release=encodePlayerControlFrame({side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false},1);
  socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:0,kind:'view',payload:view})));
  socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:1,kind:'control',payload:press})));
  socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:2,kind:'control',payload:release})));
  await waitUntil(()=>runtime.server.getSessionInputState(welcome.session)?.control?.sequence===1,'creative press+release input application');assert.equal(runtime.server.getSessionInputState(welcome.session).control.primary,false,'release must arrive before the authoritative tick');

  tick();const snapshot=decodeServerPlayerSnapshot(await messages.next('creative tick snapshot'),{expectedSession:welcome.session});assert.equal(snapshot.tick,1);
  const broken=decodeWorldEditReplication(await messages.next('creative authoritative block change'),{expectedSession:welcome.session,expectedWorldId:'creative-break-runtime'});assert.equal(broken.kind,WORLD_BLOCK_CHANGE_KIND);assert.deepEqual({x:broken.x,y:broken.y,z:broken.z,previous:broken.previous,id:broken.id},{x,y,z:targetZ,previous:BLOCK.STONE,id:BLOCK.AIR});assert.equal(broken.revision,(revisionBeforeBreak+1)>>>0);assert.equal(runtime.world.getBlock(x,y,targetZ),BLOCK.AIR,'latched short click must mutate the authoritative world on the next tick');
}finally{if(runtime.state!=='stopped')await runtime.stop();if(socket&&socket.readyState===WebSocket.OPEN)socket.terminate();}

console.log('websocket primary edge -> authoritative creative block break runtime: PASS');
