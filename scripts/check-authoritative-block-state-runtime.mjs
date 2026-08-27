import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {BLOCK,CHUNK_SIZE} from '../src/blocks.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {WorldEditSyncAssembler,authoritativeEditsToVoxelWorldState,decodeWorldEditReplication,WORLD_BLOCK_CHANGE_KIND} from '../src/world-edit-replication.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function queue(socket){
  const values=[],waiters=[];
  socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});
  return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(2500,label)]);}};
}
async function nextKind(messages,kind,label){for(let i=0;i<64;i++){const value=await messages.next(label);if(value.kind===kind)return value;}throw new Error(`did not receive ${kind}`);}

let tickCallback=null;
const runtime=createAuthoritativeServerRuntime({
  config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'state-runtime',seed:'state-seed',prompt:'plain',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:16},
  setIntervalFn:callback=>(tickCallback=callback,{timer:'state-runtime'}),
  clearIntervalFn:()=>{}
});
const x=100,y=40,z=100;
const seeded=runtime.setBlock(x,y,z,BLOCK.LOG,'axis=x');
assert.equal(seeded.changed,true);assert.equal(seeded.revision,1);assert.equal(seeded.broadcast,0);assert.equal(seeded.failed,0);assert.deepEqual(runtime.world.getBlockState(x,y,z),{id:BLOCK.LOG,stateKey:'axis=x'});

let socket=null;
try{
  const address=await runtime.start();assert.equal(typeof tickCallback,'function');
  socket=await Promise.race([new Promise((resolve,reject)=>{const value=new WebSocket(`ws://127.0.0.1:${address.port}${runtime.server.path}`,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});value.once('open',()=>resolve(value));value.once('error',reject);}),timeout(2500,'state runtime websocket open')]);
  const messages=queue(socket);socket.send(JSON.stringify(encodeClientHello()));
  const welcome=await messages.next('state runtime welcome');assert.equal(welcome.kind,'welcome');
  const worldInfo=await messages.next('state runtime world info');assert.equal(worldInfo.kind,'world-info');assert.equal(worldInfo.worldId,'state-runtime');
  const assembler=new WorldEditSyncAssembler({session:welcome.session,worldId:'state-runtime'});let snapshot=null;
  while(!snapshot){const step=assembler.accept(await messages.next('state runtime initial world edits'));if(step.complete)snapshot=step.result;}
  assert.equal(snapshot.revision,1);assert.deepEqual(snapshot.edits[`${x},${y},${z}`],{id:BLOCK.LOG,stateKey:'axis=x'},'late join must receive the server-owned non-default state');
  const hydrated=authoritativeEditsToVoxelWorldState(snapshot.edits),cx=Math.floor(x/CHUNK_SIZE),cz=Math.floor(z/CHUNK_SIZE),lx=x%CHUNK_SIZE,lz=z%CHUNK_SIZE,index=lx+CHUNK_SIZE*(lz+CHUNK_SIZE*y),chunkKey=`${cx},${cz}`;
  assert.deepEqual(hydrated.savedEdits[chunkKey],[[index,BLOCK.LOG]]);assert.deepEqual(hydrated.savedBlockStates[chunkKey],[[index,BLOCK.LOG,'axis=x']]);

  const changed=runtime.setBlock(x,y,z,BLOCK.LOG,'axis=z');assert.equal(changed.changed,true);assert.equal(changed.revision,2);assert.equal(changed.previousStateKey,'axis=x');assert.equal(changed.stateKey,'axis=z');assert.equal(changed.broadcast,1);assert.equal(changed.failed,0);
  const wire=decodeWorldEditReplication(await nextKind(messages,WORLD_BLOCK_CHANGE_KIND,'state runtime incremental world edit'),{expectedSession:welcome.session,expectedWorldId:'state-runtime'});
  assert.deepEqual({revision:wire.revision,previous:wire.previous,previousStateKey:wire.previousStateKey,id:wire.id,stateKey:wire.stateKey},{revision:2,previous:BLOCK.LOG,previousStateKey:'axis=x',id:BLOCK.LOG,stateKey:'axis=z'});
}finally{
  if(runtime.state!=='stopped')await runtime.stop();
  if(socket&&socket.readyState===WebSocket.OPEN)socket.terminate();
}

console.log('authoritative block-state late join + state-only realtime replication: PASS');
