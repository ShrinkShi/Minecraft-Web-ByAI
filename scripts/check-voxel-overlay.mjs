import assert from 'node:assert/strict';
import {BLOCK,CHUNK_SIZE} from '../src/blocks.js';
import {BlockStateSidecar} from '../src/block-state-sidecar.js';
import {applyVoxelOverlay} from '../src/voxel-overlay.js';
const index=(x,y,z)=>x+CHUNK_SIZE*(z+CHUNK_SIZE*y);

const a={chunks:new Map(),edits:new Map(),index,requestMesh(){}};
const first=applyVoxelOverlay(a,{x:33,y:20,z:-17,previous:BLOCK.AIR,id:BLOCK.STONE});
assert.equal(first.chunkLoaded,false);assert.equal(first.stateChanged,false);assert.equal(a.edits.get('2,-2').get(first.index),BLOCK.STONE);

const data=new Uint8Array(CHUNK_SIZE*CHUNK_SIZE*64),calls=[],b={chunks:new Map([['0,0',data]]),edits:new Map(),index,requestMesh:(x,z)=>calls.push(`${x},${z}`)};data[index(1,20,1)]=BLOCK.STONE;
applyVoxelOverlay(b,{x:1,y:20,z:1,previous:BLOCK.STONE,id:BLOCK.WATER});
assert.equal(data[index(1,20,1)],BLOCK.WATER);assert.deepEqual(calls,['0,0']);

const stateData=new Uint8Array(CHUNK_SIZE*CHUNK_SIZE*64),stateCalls=[],sidecar=new BlockStateSidecar(),stateWorld={chunks:new Map([['0,0',stateData]]),edits:new Map(),blockStates:sidecar,index,requestMesh:(x,z)=>stateCalls.push(`${x},${z}`)},stateIndex=index(2,20,3);stateData[stateIndex]=BLOCK.LOG;
const stateChange=applyVoxelOverlay(stateWorld,{x:2,y:20,z:3,previous:BLOCK.LOG,previousStateKey:'axis=y',id:BLOCK.LOG,stateKey:'axis=x'});
assert.equal(stateChange.applied,true);assert.equal(stateChange.stateChanged,true);assert.equal(stateData[stateIndex],BLOCK.LOG,'state-only replication must not require a numeric block-id mutation');assert.deepEqual(sidecar.get('0,0',stateIndex,BLOCK.LOG),{id:BLOCK.LOG,stateKey:'axis=x'});assert.equal(stateWorld.edits.get('0,0').get(stateIndex),BLOCK.LOG);assert.deepEqual(stateCalls,['0,0'],'state-only changes must invalidate the loaded chunk mesh');
assert.throws(()=>applyVoxelOverlay(stateWorld,{x:2,y:20,z:3,previous:BLOCK.LOG,previousStateKey:'axis=z',id:BLOCK.LOG,stateKey:'axis=y'}),/previous state mismatch/);assert.deepEqual(sidecar.get('0,0',stateIndex,BLOCK.LOG),{id:BLOCK.LOG,stateKey:'axis=x'},'rejected stale state changes must not mutate the sidecar');
assert.throws(()=>applyVoxelOverlay(a,{x:4,y:20,z:4,previous:BLOCK.LOG,previousStateKey:'axis=y',id:BLOCK.LOG,stateKey:'axis=x'}),/blockStates/);

console.log('voxel overlay numeric + state-only replication: PASS');
