import assert from 'node:assert/strict';
import {canHarvestBlock,miningDurationMs,miningProgressDelta,miningToolMultiplier} from '../src/mining-rules.js';

assert.equal(miningToolMultiplier(3,null),1);
assert.equal(miningToolMultiplier(3,'wooden_pickaxe'),5,'matching wooden pickaxe uses 2.5 * tool speed');
assert.equal(miningToolMultiplier(2,'wooden_pickaxe'),1.2,'a non-effective tool keeps the existing generic 1.2 multiplier');
assert.equal(miningToolMultiplier(2,'iron_shovel'),15,'iron shovel is effective for dirt without becoming a harvest requirement');
assert.equal(miningToolMultiplier(4,'iron_shovel'),15,'iron shovel is effective for sand');
assert.equal(miningToolMultiplier(1,'iron_shovel'),15,'iron shovel is effective for grass blocks');
assert.equal(miningToolMultiplier(5,'iron_axe'),15,'iron axe is effective for planks without becoming a harvest requirement');
assert.equal(miningToolMultiplier(6,'iron_axe'),15,'iron axe is effective for logs');
assert.equal(miningToolMultiplier(9,'iron_axe'),15,'iron axe is effective for crafting tables');
assert.equal(miningToolMultiplier(5,'iron_shovel'),1.2,'wrong iron tool does not receive effective-tool speed');

assert.equal(miningDurationMs(1,null,'survival'),540);
assert.equal(miningDurationMs(2,null,'survival'),450);
assert.equal(miningDurationMs(3,null,'survival'),1350);
assert.equal(miningDurationMs(3,'wooden_pickaxe','survival'),270);
assert.equal(miningDurationMs(2,'iron_shovel','survival'),120,'fast dirt mining respects the shared minimum break duration');
assert.equal(miningDurationMs(5,'iron_axe','survival'),120,'fast plank mining respects the shared minimum break duration');
assert.equal(miningDurationMs(9,'iron_axe','survival'),150,'crafting-table hardness still affects effective axe timing');
assert.equal(miningDurationMs(3,'wooden_pickaxe','creative'),70);
assert.equal(miningDurationMs(3,'wooden_pickaxe','adventure'),Infinity);
assert.equal(miningDurationMs(3,'wooden_pickaxe','spectator'),Infinity);

assert.equal(canHarvestBlock(2,null),true,'dirt remains harvestable by hand');
assert.equal(canHarvestBlock(4,null),true,'sand remains harvestable by hand');
assert.equal(canHarvestBlock(5,null),true,'planks remain harvestable by hand');
assert.equal(canHarvestBlock(6,null),true,'logs remain harvestable by hand');
assert.equal(canHarvestBlock(9,null),true,'crafting tables remain harvestable by hand');
assert.equal(canHarvestBlock(3,null),false);
assert.equal(canHarvestBlock(3,'stick'),false);
assert.equal(canHarvestBlock(3,'iron_axe'),false,'effective-tool metadata never bypasses a pickaxe harvest requirement');
assert.equal(canHarvestBlock(3,'wooden_pickaxe'),true);
assert.equal(canHarvestBlock(10,'wooden_pickaxe'),true);

assert.ok(Math.abs(miningProgressDelta(3,'wooden_pickaxe',.05,'survival')-50/270)<1e-12);
assert.equal(miningProgressDelta(3,null,0,'survival'),0);
assert.throws(()=>miningProgressDelta(3,null,-.01),/non-negative/);
assert.throws(()=>miningDurationMs(999,null),/known block/);
console.log('shared effective-tool mining speed + independent harvest requirements: PASS');
