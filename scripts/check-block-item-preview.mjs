import assert from 'node:assert/strict';
import {blockItemAtlasStyle,blockItemFaceTextures,blockItemFaceTiles,isBlockItemDefinition} from '../src/block-item-preview.js';
import {ITEMS} from '../src/items.js';
import {tileForFace} from '../src/blocks.js';

const blockEntry=Object.entries(ITEMS).find(([,definition])=>Number.isInteger(definition?.blockId)&&definition.blockPreview!==false&&definition.blockPreview!=='source-texture');
assert.ok(blockEntry,'at least one registered item must expose blockId for block-item preview coverage');
const [itemId,definition]=blockEntry;
const faces=blockItemFaceTiles(definition);
assert.ok(faces,`${itemId} must resolve a block preview`);
assert.equal(faces.top,tileForFace(definition.blockId,'top'));
assert.equal(faces.left,tileForFace(definition.blockId,'north'));
assert.equal(faces.right,tileForFace(definition.blockId,'east'));
assert.equal(Object.isFrozen(faces),true);
assert.equal(isBlockItemDefinition(definition),true);

const glass=ITEMS['block:20'];
assert.equal(blockItemFaceTiles(glass),null,'source-textured glass must not fake a legacy terrain-atlas preview');
assert.deepEqual(blockItemFaceTextures(glass),{top:glass.texture,left:glass.texture,right:glass.texture});
assert.equal(Object.isFrozen(blockItemFaceTextures(glass)),true);
assert.equal(isBlockItemDefinition(glass),true);

const wool=ITEMS.white_wool;
assert.equal(isBlockItemDefinition(wool),true,'white wool must be semantically classified as a block item');
assert.deepEqual(blockItemFaceTextures(wool),{top:wool.texture,left:wool.texture,right:wool.texture},'white wool must expose three cube faces instead of a flat inventory sprite');

assert.equal(blockItemFaceTextures({texture:'./x.png'}),null);
assert.equal(isBlockItemDefinition({texture:'./x.png'}),false);
assert.throws(()=>blockItemFaceTextures({blockPreview:'source-texture'}),/requires itemDefinition\.texture/);
assert.deepEqual(blockItemFaceTiles({tile:15}),{top:15,left:15,right:15});
assert.equal(isBlockItemDefinition({tile:15}),true);
assert.equal(blockItemFaceTiles({icon:'not-a-block'}),null);
assert.throws(()=>blockItemFaceTiles({tile:999}),/valid terrain atlas tile/);

assert.deepEqual(blockItemAtlasStyle(5,{facePixels:24}),{
  backgroundSize:'96px 96px',
  backgroundPosition:'-24px -24px'
});
assert.throws(()=>blockItemAtlasStyle(-1),/valid terrain atlas tile/);
assert.throws(()=>blockItemAtlasStyle(0,{facePixels:0}),/facePixels must be > 0/);

console.log('semantic block-item + terrain/source three-face preview contract: PASS');
