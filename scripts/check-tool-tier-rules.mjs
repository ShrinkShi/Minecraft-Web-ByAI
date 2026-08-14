import assert from 'node:assert/strict';
import {minimumToolTier,toolMeetsBlockRequirement,toolTierLabel,toolTierRank} from '../src/tool-tier-rules.js';

assert.equal(toolTierRank(null),-1);
assert.equal(toolTierRank('wood'),0);
assert.equal(toolTierRank('gold'),0,'gold harvest level intentionally matches wood even though its mining speed can differ');
assert.equal(toolTierRank('stone'),1);
assert.equal(toolTierRank('iron'),2);
assert.equal(toolTierRank('diamond'),3);
assert.equal(toolTierRank('netherite'),4);
assert.equal(toolTierLabel('wood'),'木质');
assert.equal(toolTierLabel('stone'),'石质');
assert.equal(toolTierLabel(null),null);
assert.throws(()=>toolTierRank('copper'),/unsupported tool tier/);
assert.throws(()=>toolTierLabel('copper'),/unsupported tool tier/);

const free={drops:'block:2'};
const woodPickaxeBlock={requires:'pickaxe'};
const stonePickaxeBlock={requires:'pickaxe',minToolTier:'stone'};
assert.equal(minimumToolTier(free),null);
assert.equal(minimumToolTier(woodPickaxeBlock),'wood','tool-requiring blocks default to wood when no explicit tier is declared');
assert.equal(minimumToolTier(stonePickaxeBlock),'stone');
assert.equal(toolMeetsBlockRequirement(null,free),true);
assert.equal(toolMeetsBlockRequirement(null,woodPickaxeBlock),false);
assert.equal(toolMeetsBlockRequirement({kind:'axe',tier:'diamond'},stonePickaxeBlock),false,'tier never bypasses the required tool kind');
assert.equal(toolMeetsBlockRequirement({kind:'pickaxe',tier:'wood'},stonePickaxeBlock),false);
assert.equal(toolMeetsBlockRequirement({kind:'pickaxe',tier:'gold'},stonePickaxeBlock),false);
assert.equal(toolMeetsBlockRequirement({kind:'pickaxe',tier:'stone'},stonePickaxeBlock),true);
assert.equal(toolMeetsBlockRequirement({kind:'pickaxe',tier:'iron'},stonePickaxeBlock),true);
assert.equal(toolMeetsBlockRequirement({kind:'pickaxe'},woodPickaxeBlock),true,'legacy tools without an explicit tier remain wood-tier compatible');
assert.throws(()=>minimumToolTier({requires:'pickaxe',minToolTier:'copper'}),/unsupported tool tier/);

console.log('shared tool kind + harvest tier ordering: PASS');
