import assert from 'node:assert/strict';
import {FIRST_PERSON_ITEM_TRANSFORMS,firstPersonActionPose,firstPersonItemKind} from '../src/first-person-presentation-rules.js';
import {ITEMS} from '../src/items.js';

const idle=firstPersonActionPose();
assert.ok(idle.x>=.88,`idle hand must rest in the lower-right view quadrant (x=${idle.x})`);
assert.ok(idle.y<=-.76,`idle hand must rest below the old viewmodel anchor (y=${idle.y})`);

const tool=FIRST_PERSON_ITEM_TRANSFORMS.tool,flat=FIRST_PERSON_ITEM_TRANSFORMS.flat;
assert.ok(tool.scale>=flat.scale*1.5,'tool/weapon presentation must be visibly larger than a generic flat item');
assert.ok(Math.abs(tool.rotation[2]-flat.rotation[2])>.7,'tool/weapon presentation must use a distinct diagonal rotation');
assert.ok(tool.position[1]>flat.position[1]+.15,'tool/weapon presentation must pivot farther from the wrist than a generic flat item');

assert.equal(firstPersonItemKind('wooden_pickaxe',ITEMS.wooden_pickaxe),'tool');
assert.equal(firstPersonItemKind('iron_sword',ITEMS.iron_sword),'tool','swords without tool mining metadata must still use the weapon/tool pose');
assert.equal(firstPersonItemKind('apple',ITEMS.apple),'food');
assert.equal(firstPersonItemKind('block:1',ITEMS['block:1']),'block');
assert.equal(firstPersonItemKind('white_wool',ITEMS.white_wool),'block','source-backed wool must render as a block in first person');
assert.equal(firstPersonItemKind('missing',null),'empty');

const attacking=firstPersonActionPose({attackRemaining:.14});
assert.ok(attacking.x<idle.x,'attack animation must swing inward from the lower-right rest anchor');
const eating=firstPersonActionPose({foodUseActive:true,foodUseProgress:.5});
assert.ok(eating.y>idle.y,'food use must still raise the held item toward the camera after the rest-anchor change');

console.log('first-person lower-right rest + block/tool pose rules: PASS');
