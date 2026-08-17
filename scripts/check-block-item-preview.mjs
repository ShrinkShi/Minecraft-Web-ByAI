import assert from 'node:assert/strict';
import {blockItemAtlasStyle,blockItemFaceTiles} from '../src/block-item-preview.js';
import {ITEMS} from '../src/items.js';
import {tileForFace} from '../src/blocks.js';

const blockEntry=Object.entries(ITEMS).find(([,definition])=>Number.isInteger(definition?.blockId)&&definition.blockPreview!==false);
assert.ok(blockEntry,'at least one registered item must expose blockId for block-item preview coverage');
const [itemId,definition]=blockEntry;
const faces=blockItemFaceTiles(definition);
assert.ok(faces,`${itemId} must resolve a block preview`);
assert.equal(faces.top,tileForFace(definition.blockId,'top'));
assert.equal(faces.left,tileForFace(definition.blockId,'north'));
assert.equal(faces.right,tileForFace(definition.blockId,'east'));
assert.equal(Object.isFrozen(faces),true);

assert.equal(blockItemFaceTiles(ITEMS['block:20']),null,'source-textured glass must not fake a legacy terrain-atlas preview');
assert.deepEqual(blockItemFaceTiles({tile:15}),{top:15,left:15,right:15});
assert.equal(blockItemFaceTiles({icon:'not-a-block'}),null);
assert.throws(()=>blockItemFaceTiles({tile:999}),/valid terrain atlas tile/);

assert.deepEqual(blockItemAtlasStyle(5,{facePixels:24}),{
  backgroundSize:'96px 96px',
  backgroundPosition:'-24px -24px'
});
assert.throws(()=>blockItemAtlasStyle(-1),/valid terrain atlas tile/);
assert.throws(()=>blockItemAtlasStyle(0,{facePixels:0}),/facePixels must be > 0/);

console.log('terrain-atlas block preview + source-textured fallback contract: PASS');
