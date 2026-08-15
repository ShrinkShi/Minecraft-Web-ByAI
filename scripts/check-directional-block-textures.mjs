import assert from 'node:assert/strict';
import {BLOCK,tileForFace} from '../src/blocks.js';

assert.equal(tileForFace(BLOCK.CRAFTING_TABLE,'top'),10);
assert.equal(tileForFace(BLOCK.CRAFTING_TABLE,'bottom'),5);
assert.equal(tileForFace(BLOCK.CRAFTING_TABLE,'east'),11);
assert.equal(tileForFace(BLOCK.CRAFTING_TABLE,'south'),11);
assert.equal(tileForFace(BLOCK.CRAFTING_TABLE,'north'),12);
assert.equal(tileForFace(BLOCK.CRAFTING_TABLE,'west'),12);

// Legacy cube definitions still fall back to their generic side tile when the
// mesher supplies a cardinal face name.
for(const face of ['east','west','north','south'])assert.equal(tileForFace(BLOCK.LOG,face),6);
assert.equal(tileForFace(BLOCK.LOG,'top'),7);
assert.equal(tileForFace(BLOCK.LOG,'bottom'),7);

console.log('cardinal block face -> Minecraft atlas tile mapping: PASS');
