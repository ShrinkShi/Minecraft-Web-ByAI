import assert from 'node:assert/strict';
import {canHarvestBlock,miningDurationMs,miningProgressDelta,miningToolMultiplier} from '../src/mining-rules.js';

assert.equal(miningToolMultiplier(3,null),1);assert.equal(miningToolMultiplier(3,'wooden_pickaxe'),5,'matching wooden pickaxe uses 2.5 * tool speed');assert.equal(miningToolMultiplier(2,'wooden_pickaxe'),1.2,'a tool on a block that does not require that tool keeps the existing generic 1.2 multiplier');
assert.equal(miningDurationMs(1,null,'survival'),540);assert.equal(miningDurationMs(2,null,'survival'),450);assert.equal(miningDurationMs(3,null,'survival'),1350);assert.equal(miningDurationMs(3,'wooden_pickaxe','survival'),270);assert.equal(miningDurationMs(3,'wooden_pickaxe','creative'),70);assert.equal(miningDurationMs(3,'wooden_pickaxe','adventure'),Infinity);assert.equal(miningDurationMs(3,'wooden_pickaxe','spectator'),Infinity);
assert.equal(canHarvestBlock(2,null),true);assert.equal(canHarvestBlock(3,null),false);assert.equal(canHarvestBlock(3,'stick'),false);assert.equal(canHarvestBlock(3,'wooden_pickaxe'),true);assert.equal(canHarvestBlock(10,'wooden_pickaxe'),true);
assert.ok(Math.abs(miningProgressDelta(3,'wooden_pickaxe',.05,'survival')-50/270)<1e-12);assert.equal(miningProgressDelta(3,null,0,'survival'),0);assert.throws(()=>miningProgressDelta(3,null,-.01),/non-negative/);assert.throws(()=>miningDurationMs(999,null),/known block/);
console.log('shared mining speed + harvest rules: PASS');
