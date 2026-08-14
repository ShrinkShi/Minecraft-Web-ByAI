import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {encodePlayerControlFrame} from '../src/player-control-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {MULTIPLAYER_HANDSHAKE_VERSION,MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {decodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {createMultiplayerServer} from '../server/multiplayer-server.mjs';
import {ServerTerrainWorld} from '../server/terrain-world.mjs';
import {AUTHORITATIVE_WORLD_TICK_MS,AuthoritativeWorldSession} from '../server/authoritative-world-session.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
const near=(actual,expected,epsilon=1e-9,label='value')=>assert.ok(Math.abs(actual-expected)<=epsilon,`${label}: expected ${expected}, got ${actual}`);
const neutralControl={version:1,side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false,sequence:0};
const inputState=(session,control=neutralControl,view=null)=>({session,control,view,selectedSlot:0,pendingActionCount:0,retainedViewCount:view?1:0});

assert.equal(AUTHORITATIVE_WORLD_TICK_MS,50);

const pureWorld=new ServerTerrainWorld({seed:'golden-seed',prompt:'mountain forest',maxCacheChunks:16});
const pureInputs=new Map(),pureSnapshots=[],errors=[];let timerCallback=null,clearedTimer=null;
const pure=new AuthoritativeWorldSession({
  world:pureWorld,
  getInputState:session=>pureInputs.get(session)??null,
  sendPlayerSnapshot:(session,snapshot)=>(pureSnapshots.push({session,snapshot}),{sent:true}),
  setIntervalFn:(callback,ms)=>(assert.equal(ms,50),timerCallback=callback,{id:77}),
  clearIntervalFn:timer=>{clearedTimer=timer;},
  onSessionError:event=>errors.push(event),
  spawnX:33,spawnZ:-17,prefetchRadius:1
});
assert.equal(pure.sessionCount,0);assert.equal(pure.running,false);
const joined=pure.join('pure-1');assert.equal(joined.spawn.ground,22);assert.deepEqual(joined.spawn,{x:33.5,y:23.001,z:-16.5,ground:22});assert.equal(joined.snapshot.tick,0);assert.equal(joined.snapshot.position.y,23.001);assert.equal(pure.sessionCount,1);assert.equal(pureSnapshots.length,1,'join sends the authoritative initial snapshot');assert.equal(pure.hasSession('pure-1'),true);assert.throws(()=>pure.join('pure-1'),/already joined/);
const joinCopy=pure.snapshot('pure-1');joinCopy.position.x=999;assert.equal(pure.snapshot('pure-1').position.x,33.5,'world session snapshot must not expose mutable simulation state');

assert.deepEqual(pure.tickOnce(),[{session:'pure-1',stepped:false,sent:false,reason:'input-unavailable'}],'missing transport input pauses only that session rather than inventing client input');assert.equal(pure.snapshot('pure-1').tick,0);
pureInputs.set('pure-1',inputState('pure-1'));let tickResult=pure.tickOnce()[0];assert.equal(tickResult.reason,'snapshot-sent');assert.equal(tickResult.snapshot.tick,1);assert.equal(tickResult.snapshot.grounded,true);assert.equal(pureSnapshots.at(-1).snapshot.tick,1);
pureInputs.set('pure-1',inputState('pure-1',{...neutralControl,forward:1,sequence:1},{yaw:Math.PI/2,pitch:0,sequence:1}));tickResult=pure.tickOnce()[0];assert.equal(tickResult.snapshot.tick,2);near(tickResult.snapshot.position.x,33.5-4.3*.05,1e-9,'terrain-backed +90 yaw W movement');near(tickResult.snapshot.position.z,-16.5,1e-9,'terrain-backed +90 yaw W z');
assert.equal(pure.setMode('pure-1','creative').flying,true);assert.throws(()=>pure.setMode('pure-1','builder'),/unsupported authoritative/);assert.throws(()=>pure.setMode('missing','survival'),/unknown authoritative/);

assert.equal(pure.start(),true);assert.equal(pure.running,true);assert.equal(typeof timerCallback,'function');assert.equal(pure.start(),false,'double start must not create a second scheduler');const beforeTimerTick=pure.snapshot('pure-1').tick;timerCallback();assert.equal(pure.snapshot('pure-1').tick,(beforeTimerTick+1)>>>0);assert.equal(pure.stop(),true);assert.deepEqual(clearedTimer,{id:77});assert.equal(pure.running,false);assert.equal(pure.stop(),false);

const isolatedInputs=new Map([['good',inputState('good')],['bad',inputState('bad')]]),isolatedSnapshots=[];
const isolated=new AuthoritativeWorldSession({world:new ServerTerrainWorld({seed:'golden-seed',prompt:'mountain forest',maxCacheChunks:16}),getInputState:session=>{if(session==='bad')throw new Error('input backend failed');return isolatedInputs.get(session);},sendPlayerSnapshot:(session,snapshot)=>(isolatedSnapshots.push({session,snapshot}),true),onSessionError:event=>errors.push(event)});
isolated.join('bad');isolated.join('good');const isolatedResults=isolated.tickOnce();assert.equal(isolatedResults.find(value=>value.session==='bad').reason,'input-error');assert.equal(isolated.hasSession('bad'),false,'faulting session is removed so it cannot fail every future tick');assert.equal(isolatedResults.find(value=>value.session==='good').reason,'snapshot-sent');assert.equal(isolated.snapshot('good').tick,1);assert.ok(errors.some(event=>event.session==='bad'&&event.phase==='input'&&event.error.message==='input backend failed'));

const rollback=new AuthoritativeWorldSession({world:new ServerTerrainWorld({seed:'golden-seed',prompt:'mountain forest'}),getInputState:()=>null,sendPlayerSnapshot:()=>{throw new Error('initial snapshot failed');}});assert.throws(()=>rollback.join('rollback'),/initial snapshot failed/);assert.equal(rollback.sessionCount,0);assert.equal(rollback.simulation.hasSession('rollback'),false,'failed initial snapshot must rollback simulation membership');
const absentTransport=new AuthoritativeWorldSession({world:new ServerTerrainWorld({seed:'golden-seed',prompt:'mountain forest'}),getInputState:session=>inputState(session),sendPlayerSnapshot:()=>null});assert.throws(()=>absentTransport.join('offline'),/initial authoritative snapshot transport is unavailable/);assert.equal(absentTransport.sessionCount,0);assert.equal(absentTransport.simulation.hasSession('offline'),false,'null initial transport result must rollback simulation membership');

assert.equal(pure.leave('pure-1'),true);assert.equal(pure.leave('pure-1'),false);assert.equal(pure.sessionCount,0);pure.close();isolated.close();rollback.close();absentTransport.close();
assert.throws(()=>new AuthoritativeWorldSession({getInputState:()=>null,sendPlayerSnapshot:()=>null,worldOptions:null}),/worldOptions/);assert.throws(()=>new AuthoritativeWorldSession({world:{},getInputState:()=>null,sendPlayerSnapshot:()=>null}),/world.environment/);assert.throws(()=>new AuthoritativeWorldSession({world:pureWorld,getInputState:null,sendPlayerSnapshot:()=>null}),/getInputState/);assert.throws(()=>new AuthoritativeWorldSession({world:pureWorld,getInputState:()=>null,sendPlayerSnapshot:null}),/sendPlayerSnapshot/);assert.throws(()=>new AuthoritativeWorldSession({world:pureWorld,getInputState:()=>null,sendPlayerSnapshot:()=>null,prefetchRadius:17}),/prefetchRadius/);

function openClient(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(2500,'real websocket open')]);}
function messageQueue(socket){
  const queued=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;let value;try{value=JSON.parse(data.toString('utf8'));}catch{return;}const waiter=waiters.shift();if(waiter)waiter(value);else queued.push(value);});
  return{next(label='websocket message'){if(queued.length)return Promise.resolve(queued.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(2500,label)]);}};
}
async function waitUntil(predicate,label){return Promise.race([new Promise(resolve=>{const poll=()=>predicate()?resolve():setTimeout(poll,10);poll();}),timeout(2500,label)]);}

let server;const realWorld=new ServerTerrainWorld({seed:'golden-seed',prompt:'mountain forest',maxCacheChunks:32});const realErrors=[];
const authoritative=new AuthoritativeWorldSession({world:realWorld,getInputState:session=>server.getSessionInputState(session),sendPlayerSnapshot:(session,snapshot)=>server.sendPlayerSnapshot(session,snapshot),onSessionError:event=>realErrors.push(event),spawnX:33,spawnZ:-17,prefetchRadius:1});
server=createMultiplayerServer({port:0,allowedOrigins:[ORIGIN],sessionFactory:()=> 'real-world-session',onSessionReady:({session})=>authoritative.join(session),onSessionClose:({session})=>{if(session)authoritative.leave(session);},onSocketError:event=>realErrors.push({...event,phase:'socket'})});
try{
  const address=await server.listen(),url=`ws://127.0.0.1:${address.port}${server.path}`,socket=await openClient(url),messages=messageQueue(socket);
  socket.send(JSON.stringify(encodeClientHello()));const welcome=await messages.next('welcome'),initialWire=await messages.next('initial authoritative snapshot');assert.deepEqual(welcome,{v:MULTIPLAYER_HANDSHAKE_VERSION,kind:'welcome',session:'real-world-session'});const initial=decodeServerPlayerSnapshot(initialWire,{expectedSession:welcome.session});assert.equal(initial.tick,0);assert.deepEqual(initial.position,{x:33.5,y:23.001,z:-16.5});assert.equal(authoritative.hasSession(welcome.session),true);assert.equal(server.getSessionInputState(welcome.session).control,null);

  const viewFrame=encodePlayerViewFrame({yaw:Math.PI/2,pitch:0},10),controlFrame=encodePlayerControlFrame({side:0,forward:1,jump:false,sneak:false,sprint:false,primary:false},11);
  socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:0,kind:'view',payload:viewFrame})));
  socket.send(JSON.stringify(encodeClientInputEnvelope({session:welcome.session,packetSeq:1,kind:'control',payload:controlFrame})));
  await waitUntil(()=>server.getSessionInputState(welcome.session)?.control?.sequence===11&&server.getSessionInputState(welcome.session)?.view?.sequence===10,'real server semantic input state');
  const nextSnapshotPromise=messages.next('tick 1 authoritative snapshot'),realTick=authoritative.tickOnce()[0];assert.equal(realTick.reason,'snapshot-sent');const moved=decodeServerPlayerSnapshot(await nextSnapshotPromise,{expectedSession:welcome.session});assert.equal(moved.tick,1);near(moved.position.x,33.5-4.3*.05,1e-9,'real websocket authoritative W/+90 x');near(moved.position.z,-16.5,1e-9,'real websocket authoritative W/+90 z');assert.equal(moved.grounded,true);assert.equal(realErrors.length,0);

  socket.close(1000,'test complete');await waitUntil(()=>!authoritative.hasSession(welcome.session),'real websocket close removes authoritative player');assert.equal(authoritative.sessionCount,0);
}finally{authoritative.close();await server.close();}

console.log('terrain-backed authoritative world session + real websocket tick/snapshot loop: PASS');
