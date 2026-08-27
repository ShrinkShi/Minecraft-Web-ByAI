import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BLOCK} from '../src/blocks.js';
import {
  BLOCK_STATE_SAVE_MIN_VERSION,
  SINGLEPLAYER_SAVE_VERSION,
  resolveSingleplayerBlockStates
} from '../src/world-save-compatibility.js';

assert.equal(BLOCK_STATE_SAVE_MIN_VERSION,11);
assert.equal(SINGLEPLAYER_SAVE_VERSION,11);
assert.deepEqual(resolveSingleplayerBlockStates(null),{});
assert.deepEqual(resolveSingleplayerBlockStates(undefined),{});
assert.deepEqual(resolveSingleplayerBlockStates({version:10}),{},'pre-v11 saves must migrate with default block states');
assert.throws(()=>resolveSingleplayerBlockStates({version:11}),/save version 11 is missing blockStates/);
assert.throws(()=>resolveSingleplayerBlockStates({version:11,blockStates:null}),/blockStates must be an object/);
assert.throws(()=>resolveSingleplayerBlockStates({version:11,blockStates:[]}),/blockStates must be an object/);
assert.throws(()=>resolveSingleplayerBlockStates([]),/world record must be an object or null/);

const savedStates={'0,0':[[3,BLOCK.LOG,'axis=x']]};
const restored=resolveSingleplayerBlockStates({version:11,blockStates:savedStates});
assert.deepEqual(restored,savedStates);
assert.notEqual(restored,savedStates,'compatibility resolver must return a validated snapshot, not retain the IndexedDB object');
assert.throws(()=>resolveSingleplayerBlockStates({version:11,blockStates:{'0,0':[[3,BLOCK.LOG,'axis=north']]}}),/log\.axis must be one of/);
assert.throws(()=>resolveSingleplayerBlockStates({version:11,blockStates:{'0,0':[[3,BLOCK.STONE,'axis=x']]}}),/does not define mutable/);

const runtimeSource=readFileSync(new URL('../src/client-gameplay-runtime.js',import.meta.url),'utf8');
const mainSource=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(runtimeSource,/savedEdits=\{\},savedBlockStates=\{\}/);
assert.match(runtimeSource,/onWorldEdit=\(\)=>\{\},onWorldBlockStateEdit=\(\)=>\{\}/);
assert.match(runtimeSource,/savedBlockStates,onEdit:onWorldEdit,onBlockStateEdit:onWorldBlockStateEdit/);
assert.match(mainSource,/resolveSingleplayerBlockStates\(saved\)/);
assert.match(mainSource,/blockStates:world\.exportBlockStates\(\)/);
assert.match(mainSource,/savedEdits:saved\?\.edits\|\|\{\},savedBlockStates/);
assert.match(mainSource,/onWorldBlockStateEdit:\(\)=>markSaveDirty\(\)/);

console.log('singleplayer block state save checks passed');
