import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {
  BLOCK_STATE_SCHEMA_REGISTRY,
  blockDefaultStateKey,
  blockStateSchemaForId,
  canonicalBlockStateKeyForId,
  normalizeBlockStateForId,
  parseCanonicalBlockStateKeyForId
} from '../src/block-state-registry.js';
import {
  BlockStateSidecar,
  blockIdentity,
  blockIdentityEqual,
  blockIdentityFromKey
} from '../src/block-state-sidecar.js';
import {FURNACE_BLOCK_STATE_SCHEMA,LOG_BLOCK_STATE_SCHEMA} from '../src/block-state-schema.js';

assert.equal(blockStateSchemaForId(BLOCK.LOG),LOG_BLOCK_STATE_SCHEMA);
assert.equal(blockStateSchemaForId(BLOCK.STRIPPED_OAK_LOG),LOG_BLOCK_STATE_SCHEMA);
assert.equal(blockStateSchemaForId(BLOCK.FURNACE),FURNACE_BLOCK_STATE_SCHEMA);
assert.equal(blockStateSchemaForId(BLOCK.FARMLAND),null,'legacy farmland state remains block-id encoded in B1');
assert.equal(blockStateSchemaForId(BLOCK.WHEAT_AGE_0),null,'legacy wheat age remains block-id encoded in B1');
assert.deepEqual(Object.keys(BLOCK_STATE_SCHEMA_REGISTRY).map(Number).sort((a,b)=>a-b),[BLOCK.LOG,BLOCK.FURNACE,BLOCK.STRIPPED_OAK_LOG].sort((a,b)=>a-b));

assert.equal(blockDefaultStateKey(BLOCK.LOG),'axis=y');
assert.equal(blockDefaultStateKey(BLOCK.FURNACE),'facing=north,lit=false');
assert.equal(blockDefaultStateKey(BLOCK.STONE),null);
assert.deepEqual(normalizeBlockStateForId(BLOCK.LOG,{axis:'x'}),{axis:'x'});
assert.equal(canonicalBlockStateKeyForId(BLOCK.LOG,{axis:'z'}),'axis=z');
assert.deepEqual(parseCanonicalBlockStateKeyForId(BLOCK.FURNACE,'facing=west,lit=true'),{facing:'west',lit:'true'});
assert.deepEqual(normalizeBlockStateForId(BLOCK.STONE),{});
assert.throws(()=>normalizeBlockStateForId(BLOCK.STONE,{axis:'x'}),/does not define mutable/);

const defaultLog=blockIdentity(BLOCK.LOG);
const horizontalLog=blockIdentity(BLOCK.LOG,{axis:'x'});
assert.deepEqual(defaultLog,{id:BLOCK.LOG,stateKey:'axis=y'});
assert.deepEqual(horizontalLog,{id:BLOCK.LOG,stateKey:'axis=x'});
assert.ok(Object.isFrozen(defaultLog));
assert.ok(blockIdentityEqual(defaultLog,blockIdentityFromKey(BLOCK.LOG,'axis=y')));
assert.ok(!blockIdentityEqual(defaultLog,horizontalLog));
assert.deepEqual(blockIdentity(BLOCK.STONE),{id:BLOCK.STONE,stateKey:null});
assert.throws(()=>blockIdentityFromKey(BLOCK.LOG,'axis=north'),/log\.axis must be one of/);
assert.throws(()=>blockIdentity(BLOCK.STONE,{axis:'x'}),/does not define mutable/);

const states=new BlockStateSidecar();
assert.equal(states.size,0);
assert.deepEqual(states.get('0,0',17,BLOCK.LOG),defaultLog);
assert.deepEqual(states.set('0,0',17,BLOCK.LOG,{axis:'x'}),horizontalLog);
assert.equal(states.size,1);
assert.deepEqual(states.get('0,0',17,BLOCK.LOG),horizontalLog);
assert.deepEqual(states.get('0,0',17,BLOCK.STONE),{id:BLOCK.STONE,stateKey:null},'stored state must never leak across a block-id replacement');

states.set('0,0',17,BLOCK.LOG,{axis:'y'});
assert.equal(states.size,0,'default state must be omitted from sparse storage');
states.set('1,0',9,BLOCK.FURNACE,{facing:'west',lit:true});
states.set('-1,2',4,BLOCK.LOG,{axis:'z'});
states.set('1,0',3,BLOCK.LOG,{axis:'x'});
assert.equal(states.size,3);
assert.deepEqual(states.export(),{
  '-1,2':[[4,BLOCK.LOG,'axis=z']],
  '1,0':[
    [3,BLOCK.LOG,'axis=x'],
    [9,BLOCK.FURNACE,'facing=west,lit=true']
  ]
},'snapshot order must be deterministic by chunk key then cell index');
assert.throws(()=>states.reconcileChunk('1,0',null),/indexed block-id collection/);

const restored=new BlockStateSidecar(states.export());
assert.deepEqual(restored.export(),states.export());
assert.deepEqual(restored.get('1,0',9,BLOCK.FURNACE),{id:BLOCK.FURNACE,stateKey:'facing=west,lit=true'});
assert.deepEqual(restored.setFromKey('1,0',9,BLOCK.FURNACE,'facing=north,lit=false'),{id:BLOCK.FURNACE,stateKey:'facing=north,lit=false'});
assert.equal(restored.size,2,'setting canonical default through key path must remove sparse entry');
assert.ok(restored.delete('1,0',3));
assert.ok(!restored.delete('1,0',3));
assert.equal(restored.size,1);
restored.clear();
assert.equal(restored.size,0);
assert.deepEqual(restored.export(),{});

const reconciled=new BlockStateSidecar({
  '0,0':[
    [2,BLOCK.LOG,'axis=x'],
    [5,BLOCK.FURNACE,'facing=east,lit=false'],
    [99,BLOCK.LOG,'axis=z']
  ]
});
const blockIds=new Uint8Array(8);
blockIds[2]=BLOCK.LOG;
blockIds[5]=BLOCK.STONE;
assert.equal(reconciled.reconcileChunk('0,0',blockIds),2,'mismatched and out-of-range sparse states must be pruned');
assert.deepEqual(reconciled.export(),{'0,0':[[2,BLOCK.LOG,'axis=x']]});
blockIds[2]=BLOCK.STONE;
assert.equal(reconciled.reconcileChunk('0,0',blockIds),1);
assert.equal(reconciled.size,0);
assert.equal(reconciled.reconcileChunk('missing',blockIds),0);

assert.throws(()=>new BlockStateSidecar({'0,0':[[0,BLOCK.LOG,'axis=north']]}),/log\.axis must be one of/);
assert.throws(()=>new BlockStateSidecar({'0,0':[[0,BLOCK.STONE,'axis=x']]}),/does not define mutable/);
assert.throws(()=>new BlockStateSidecar({'0,0':[[0,BLOCK.LOG,'axis=x'],[0,BLOCK.LOG,'axis=y']]}),/duplicate cell index: 0/);
assert.throws(()=>states.set('',0,BLOCK.LOG,{axis:'x'}),/chunk key/);
assert.throws(()=>states.set('0,0',-1,BLOCK.LOG,{axis:'x'}),/non-negative/);
assert.throws(()=>blockIdentity(256),/0\.\.255/);

console.log('block state sidecar checks passed');
