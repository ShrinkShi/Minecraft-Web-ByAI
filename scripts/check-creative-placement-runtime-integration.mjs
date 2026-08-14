import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {BLOCK} from '../src/blocks.js';
import {PLAYER_EYE_HEIGHT} from '../src/player-environment-rules.js';
import {encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {encodePlayerActionFrame} from '../src/player-action-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {decodeServerInventorySnapshot} from '../src/server-inventory-snapshot.js';
import {decodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {decodeWorldEditReplication,WORLD_BLOCK_CHANGE_KIND,WORLD_EDIT_SYNC_END_KIND} from '../src/world-edit-replication.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function queue(socket){const values=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(2500,label)]);}};}
async function open(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(2500,'creative placement websocket open')]);}
async function waitUntil(predicate,label){return Promise.race([new Promise(resolve=>{const poll=()=>predicate()?resolve():setTimeout(poll,5);poll();}),timeout(2500,label)]);}

let tick=null;const errors=[];const runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'creative-placement-runtime',seed:'creative-placement-seed',prompt:'plains',mode:'creative',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:32},setIntervalFn:callback=>(tick=callback,{timer:'creative-placement'}),clearIntervalFn:()=>{},onError:event=>errors.push(event)});let socket=null;
try{
  const address=await runtime.start();socket=await open(`ws://127.0.0.1:${address.port}${runtime.server.path}`);const messages=queue(socket);socket.send(JSON.stringify(encodeClientHello()));const welcome=await messages.next('placement welcome');assert.equal(welcome.kind,'welcome');await messages.next('placement world info');for(;;){const message=await messages.next('placement initial edit sync');if(message.kind===WORLD_EDIT_SYNC_END_KIND)break;}
  const initial=decodeServerPlayerSnapshot(await messages.next('placement initial snapshot'),{expectedSession:welcome.session});assert.equal(initial.mode,'creative');
  const inventory=decodeServerInventorySnapshot(await messages.next('placement initial inventory'),{expectedSession:welcome.session});assert.equal(inventory.mode,'creative');assert.equal(inventory.revision,0);
  const x=Math.floor(initial.position.x),y=Math.floor(initial.position.y+PLAYER_EYE_HEIGHT),anchorZ=Math.floor(initial.position.z)-2,placeZ=anchorZ+1;
  const clear=runtime.setBlock(x,y,placeZ,BLOCK.AIR);if(clear.changed){const wire=decodeWorldEditReplication(await messages.next('placement clear change'),{expectedSession:welcome.session,expectedWorldId:'creative-placement-runtime'});assert.equal(wire.revision,clear.revision);}
  const anchor=runtime.setBlock(x,y,anchorZ,BLOCK.STONE);assert.equal(anchor.changed,true);const anchorWire=decodeWorldEditReplication(await messages.next('placement anchor change'),{expectedSession:welcome.session,expectedWorldId:'creative-placement-runtime'});assert.equal(anchorWire.kind,WORLD_BLOCK_CHANGE_KIND);assert.equal(anchorWire.revision,anchor.revision);assert.equal(runtime.world.getBlock(x,y,placeZ),BLOCK.AIR);
  const revisionBeforeUse=runtime.world.revision;

  const viewAtUse=encodePlayerViewFrame({yaw:0,pitch:0},0);socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:0,kind:'view',payload:viewAtUse})));
  const use=encodePlayerActionFrame({kind:'use',viewSeq:0},0);socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:1,kind:'action',payload:use})));
  const laterView=encodePlayerViewFrame({yaw:Math.PI/2,pitch:0},1);socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:2,kind:'view',payload:laterView})));
  const laterHotbar=encodePlayerActionFrame({kind:'hotbar-select',slot:8},1);socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:3,kind:'action',payload:laterHotbar})));
  await waitUntil(()=>{const input=runtime.server.getSessionInputState(welcome.session);return input?.selectedSlot===8&&input?.view?.sequence===1&&input?.pendingActionCount===1;},'queued use followed by newer view/hotbar');assert.equal(runtime.selectedStack(welcome.session).id,'wooden_pickaxe','live hotbar must now point at the later pickaxe selection');

  tick();const snapshot=decodeServerPlayerSnapshot(await messages.next('placement tick snapshot'),{expectedSession:welcome.session});assert.equal(snapshot.tick,1);assert.ok(Math.abs(snapshot.yaw-Math.PI/2)<1e-12,'player simulation should use the newer live view');
  const placed=decodeWorldEditReplication(await messages.next('placement authoritative block change'),{expectedSession:welcome.session,expectedWorldId:'creative-placement-runtime'});assert.equal(placed.kind,WORLD_BLOCK_CHANGE_KIND);assert.deepEqual({x:placed.x,y:placed.y,z:placed.z,previous:placed.previous,id:placed.id},{x,y,z:placeZ,previous:BLOCK.AIR,id:BLOCK.GRASS},'queued use must place the block selected and aimed at when use was accepted, not the later hotbar/view state');assert.equal(placed.revision,(revisionBeforeUse+1)>>>0);assert.equal(runtime.world.getBlock(x,y,placeZ),BLOCK.GRASS);assert.deepEqual(errors,[]);
}finally{if(runtime.state!=='stopped')await runtime.stop();if(socket&&socket.readyState===WebSocket.OPEN)socket.terminate();}

console.log('websocket inventory bootstrap + use snapshot -> authoritative creative placement runtime: PASS');
