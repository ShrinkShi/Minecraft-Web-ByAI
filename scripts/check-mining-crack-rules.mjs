import assert from 'node:assert/strict';
import {MINING_CRACK_STAGE_COUNT,miningCrackStage,miningCrackTarget} from '../src/mining-crack-rules.js';

assert.equal(MINING_CRACK_STAGE_COUNT,10);assert.equal(miningCrackStage(0),null);assert.equal(miningCrackStage(1),null);assert.equal(miningCrackStage(.001),0);assert.equal(miningCrackStage(.099),0);assert.equal(miningCrackStage(.1),1);assert.equal(miningCrackStage(.5),5);assert.equal(miningCrackStage(.999),9);
const target=miningCrackTarget({x:-2,y:63,z:5,id:3});assert.deepEqual(target,{x:-2,y:63,z:5,id:3});assert.equal(Object.isFrozen(target),true);assert.throws(()=>miningCrackStage(Number.NaN),/finite number/);assert.throws(()=>miningCrackTarget({x:.5,y:1,z:2,id:3}),/x must be an integer/);assert.throws(()=>miningCrackTarget({x:0,y:1,z:2,id:0}),/non-air/);
console.log('server progress -> ten deterministic mining crack stages: PASS');
