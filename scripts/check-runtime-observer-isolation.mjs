import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

let errorCalls=0,logCalls=0;
const runtime=createAuthoritativeServerRuntime({
  config:{host:'127.0.0.1',port:0,worldId:'observer-world'},
  setIntervalFn:()=>({timer:'observer'}),
  clearIntervalFn:()=>{},
  onError:()=>{errorCalls++;throw new Error('observer error must be isolated');},
  onLog:()=>{logCalls++;throw new Error('log observer must be isolated');}
});

runtime.authoritative.sessions.add('s:observer');
const x=7,y=10,z=-3,base=runtime.world.getBaseBlock(x,y,z),id=base===BLOCK.AIR?BLOCK.STONE:BLOCK.AIR,before=runtime.world.revision;
const change=runtime.setBlock(x,y,z,id);
assert.equal(change.changed,true);assert.equal(change.revision,(before+1)>>>0);assert.equal(change.broadcast,0);assert.equal(change.failed,1);assert.equal(runtime.world.getBlock(x,y,z),id);assert.equal(errorCalls,1,'throwing onError observer must not escape after a committed world mutation');
runtime.authoritative.sessions.clear();
try{
  const address=await runtime.start();assert.ok(address.port>0);assert.equal(runtime.state,'running');assert.equal(logCalls,1,'throwing listening observer must be isolated');
  await runtime.stop();assert.equal(runtime.state,'stopped');assert.equal(logCalls,2,'throwing stopped observer must be isolated');
}finally{if(runtime.state!=='stopped')await runtime.stop();}
console.log('runtime log/error observer isolation: PASS');
