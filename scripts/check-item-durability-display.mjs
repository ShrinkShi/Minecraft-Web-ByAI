import assert from 'node:assert/strict';
import {itemDurabilityDisplay} from '../src/item-durability-display.js';

assert.equal(itemDurabilityDisplay(null),null);assert.equal(itemDurabilityDisplay({id:'stick',count:1}),null);assert.equal(itemDurabilityDisplay({id:'wooden_pickaxe',count:1}),null,'undamaged tools should not draw a durability bar');
let display=itemDurabilityDisplay({id:'wooden_pickaxe',count:1,damage:1});assert.equal(display.damage,1);assert.equal(display.remaining,58);assert.equal(display.maximum,59);assert.equal(display.ratio,58/59);assert.equal(display.hue,118);assert.equal(display.label,'耐久 58 / 59');assert.equal(Object.isFrozen(display),true);
display=itemDurabilityDisplay({id:'wooden_pickaxe',count:1,damage:58});assert.equal(display.remaining,1);assert.equal(display.maximum,59);assert.equal(display.ratio,1/59);assert.equal(display.hue,2);assert.equal(display.label,'耐久 1 / 59');
assert.throws(()=>itemDurabilityDisplay({id:'wooden_pickaxe',count:1,damage:59}),/0 to 58/);
console.log('Minecraft-style damaged-item durability display rules: PASS');
