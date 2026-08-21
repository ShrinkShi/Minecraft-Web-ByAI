import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {TOOL_SECONDARY_ACTIONS,resolveToolSecondaryAction,toolActionFaceY,toolSecondaryActionRule} from '../src/tool-secondary-actions.js';

assert.equal(BLOCK.FARMLAND,24);assert.equal(BLOCK.DIRT_PATH,25);assert.equal(BLOCK.STRIPPED_OAK_LOG,26);
assert.deepEqual(resolveToolSecondaryAction({itemId:'iron_hoe',targetBlockId:BLOCK.GRASS,aboveBlockId:BLOCK.AIR,faceY:1}),{kind:TOOL_SECONDARY_ACTIONS.TILL,itemId:'iron_hoe',targetBlockId:BLOCK.GRASS,resultBlockId:BLOCK.FARMLAND,durabilityCost:1});
assert.equal(resolveToolSecondaryAction({itemId:'iron_hoe',targetBlockId:BLOCK.DIRT,aboveBlockId:BLOCK.STONE,faceY:1}),null,'covered soil may not be tilled');
assert.equal(resolveToolSecondaryAction({itemId:'iron_hoe',targetBlockId:BLOCK.DIRT,aboveBlockId:BLOCK.AIR,faceY:-1}),null,'bottom-face hoe use must not till');
assert.deepEqual(resolveToolSecondaryAction({itemId:'iron_axe',targetBlockId:BLOCK.LOG,aboveBlockId:BLOCK.STONE,faceY:-1}),{kind:TOOL_SECONDARY_ACTIONS.STRIP,itemId:'iron_axe',targetBlockId:BLOCK.LOG,resultBlockId:BLOCK.STRIPPED_OAK_LOG,durabilityCost:1},'log stripping is face/above independent');
assert.deepEqual(resolveToolSecondaryAction({itemId:'iron_shovel',targetBlockId:BLOCK.DIRT,aboveBlockId:BLOCK.AIR,faceY:0}),{kind:TOOL_SECONDARY_ACTIONS.FLATTEN,itemId:'iron_shovel',targetBlockId:BLOCK.DIRT,resultBlockId:BLOCK.DIRT_PATH,durabilityCost:1});
assert.equal(resolveToolSecondaryAction({itemId:'iron_shovel',targetBlockId:BLOCK.STONE,aboveBlockId:BLOCK.AIR,faceY:1}),null);
assert.equal(resolveToolSecondaryAction({itemId:'iron_pickaxe',targetBlockId:BLOCK.STONE,aboveBlockId:BLOCK.AIR,faceY:1}),null);
assert.equal(toolSecondaryActionRule('iron_hoe').durabilityCost,1);assert.equal(toolActionFaceY({y:5,previous:{y:6}}),1);assert.equal(toolActionFaceY({y:5,previous:{y:4}}),-1);assert.equal(toolActionFaceY({normal:{y:.8}}),1);
console.log('shared hoe till + axe strip + shovel flatten secondary-action rules: PASS');
