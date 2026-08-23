import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {explosionDropForBlock} from '../src/explosion-drop-rules.js';

assert.equal(explosionDropForBlock(BLOCK.GRASS),'block:2','exploded grass block must drop dirt, not the creative grass-block item');
assert.equal(explosionDropForBlock(BLOCK.DIRT),'block:2');
assert.equal(explosionDropForBlock(BLOCK.STONE),'block:10','exploded stone follows its cobblestone drop rule');
assert.equal(explosionDropForBlock(BLOCK.GLASS),null,'glass has no current explosion drop');
assert.equal(explosionDropForBlock(BLOCK.WATER),null);
assert.equal(explosionDropForBlock(9999),null);
assert.throws(()=>explosionDropForBlock(1.5),/integer/);
console.log('explosion destruction uses block drop rules (grass -> dirt): PASS');
