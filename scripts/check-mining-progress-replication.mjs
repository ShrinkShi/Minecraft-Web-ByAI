import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {encodeMiningProgress,decodeMiningProgress,MINING_PROGRESS_KIND,MINING_PROGRESS_REPLICATION_VERSION,isCompatibleMiningProgress} from '../src/mining-progress-replication.js';

const active=encodeMiningProgress({session:'s:mining-progress',tick:7,active:true,progress:.375,target:{x:1,y:64,z:-2,id:BLOCK.STONE}});
assert.deepEqual(active,{v:MINING_PROGRESS_REPLICATION_VERSION,kind:MINING_PROGRESS_KIND,session:'s:mining-progress',tick:7,active:true,progress:.375,target:[1,64,-2,BLOCK.STONE]});
const decoded=decodeMiningProgress(active,{expectedSession:'s:mining-progress'});assert.equal(decoded.active,true);assert.equal(decoded.progress,.375);assert.deepEqual(decoded.target,{x:1,y:64,z:-2,id:BLOCK.STONE});assert.equal(Object.isFrozen(decoded),true);assert.equal(Object.isFrozen(decoded.target),true);
const reset=encodeMiningProgress({session:'s:mining-progress',tick:8,active:false,progress:0,target:null});assert.deepEqual(decodeMiningProgress(reset,{expectedSession:'s:mining-progress'}),{version:MINING_PROGRESS_REPLICATION_VERSION,kind:MINING_PROGRESS_KIND,session:'s:mining-progress',tick:8,active:false,progress:0,target:null});
assert.equal(isCompatibleMiningProgress(active),true);assert.equal(isCompatibleMiningProgress({...active,extra:true}),false);
assert.throws(()=>encodeMiningProgress({session:'s:mining-progress',tick:1,active:true,progress:0,target:{x:0,y:0,z:0,id:BLOCK.STONE}}),/greater than 0/);
assert.throws(()=>encodeMiningProgress({session:'s:mining-progress',tick:1,active:true,progress:1,target:{x:0,y:0,z:0,id:BLOCK.STONE}}),/less than 1/);
assert.throws(()=>encodeMiningProgress({session:'s:mining-progress',tick:1,active:false,progress:.1,target:null}),/inactive/);
assert.throws(()=>decodeMiningProgress({...active,session:'s:other'},{expectedSession:'s:mining-progress'}),/session mismatch/);
assert.throws(()=>decodeMiningProgress({...active,tick:-1}),/network sequence/i);
assert.throws(()=>decodeMiningProgress({...active,target:[1,2,3,0]}),/non-air/);
console.log('strict mining-progress v1 wire encode/decode: PASS');
