import assert from 'node:assert/strict';
import {assetRecord,requireAssetUrl} from '../src/asset-manifest.js';
import {BLOCK,BLOCKS} from '../src/blocks.js';
import {creativeCatalogCategoryFor} from '../src/creative-catalog.js';
import {CREATIVE_START,ITEMS,itemForBlock} from '../src/items.js';
import {MINECRAFT_SIMPLE_FULL_CUBE_MODELS,minecraftModelBlockDescriptor} from '../src/minecraft-model-registry.js';

const HISTORICAL_CREATIVE_START=['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe','bed','stone_pickaxe','block:20','block:21'];
assert.deepEqual(CREATIVE_START,HISTORICAL_CREATIVE_START,'registry breadth may not shift historical starter slots');

const breadth=[
  ['GRANITE',44,'granite','花岗岩','stone'],
  ['DIORITE',45,'diorite','闪长岩','stone'],
  ['ANDESITE',46,'andesite','安山岩','stone'],
  ['SPRUCE_PLANKS',47,'spruce_planks','云杉木板','wood'],
  ['BIRCH_PLANKS',48,'birch_planks','白桦木板','wood'],
  ['JUNGLE_PLANKS',49,'jungle_planks','丛林木板','wood'],
  ['ACACIA_PLANKS',50,'acacia_planks','金合欢木板','wood'],
  ['DARK_OAK_PLANKS',51,'dark_oak_planks','深色橡木木板','wood'],
  ['MANGROVE_PLANKS',52,'mangrove_planks','红树木板','wood'],
  ['CHERRY_PLANKS',53,'cherry_planks','樱花木板','wood']
];
assert.deepEqual(breadth.map(([,id])=>id),Array.from({length:10},(_,index)=>44+index),'phase-1 block IDs must be one append-only range');

for(const [constant,id,resource,name,family] of breadth){
  assert.equal(BLOCK[constant],id,`${constant} must retain its append-only block ID`);
  const block=BLOCKS[id];
  assert.ok(block,`BLOCKS must register ${constant}`);
  assert.equal(block.name,name);
  assert.equal(block.solid,true);
  assert.notEqual(block.fullCube,false,`${constant} must remain an ordinary full cube`);
  assert.equal(block.drops,`block:${id}`);
  assert.equal(itemForBlock(id),`block:${id}`);

  if(family==='stone'){
    assert.equal(block.hardness,1.5);
    assert.equal(block.requires,'pickaxe');
    assert.equal(block.effectiveTool,'pickaxe');
    assert.equal(block.minToolTier,'wood');
  }else{
    assert.equal(block.hardness,2);
    assert.equal(block.effectiveTool,'axe');
    assert.equal(block.requires,undefined);
  }

  const itemId=`block:${id}`,item=ITEMS[itemId],assetKey=`block.${resource}`;
  assert.ok(item,`${itemId} must be obtainable as an item`);
  assert.equal(item.name,name);
  assert.equal(item.blockId,id);
  assert.equal(item.stack,64);
  assert.equal(item.assetKey,assetKey);
  assert.equal(item.texture,requireAssetUrl(assetKey));
  assert.equal(item.blockPreview,'source-texture');
  assert.equal(creativeCatalogCategoryFor(itemId),'building');
  assert.equal(assetRecord(assetKey).directCanonical,true);

  const model=minecraftModelBlockDescriptor(id);
  assert.ok(model,`${constant} must opt into source-backed model rendering`);
  assert.equal(model.blockstate,`minecraft:${resource}`);
  assert.deepEqual(model.state,{});
  assert.equal(model.renderLayer,'opaque');
}

const oak=ITEMS['block:5'];
assert.equal(oak.assetKey,'block.oak_planks');
assert.equal(oak.blockPreview,'source-texture');
assert.equal(minecraftModelBlockDescriptor(BLOCK.PLANKS)?.blockstate,'minecraft:oak_planks','existing oak planks must join the same full-cube source path');
assert.deepEqual(
  MINECRAFT_SIMPLE_FULL_CUBE_MODELS.map(({blockId})=>blockId),
  [BLOCK.PLANKS,...breadth.map(([,id])=>id)],
  'simple full-cube model registration must remain declarative and complete'
);

console.log('append-only stone/wood registry breadth + source-backed items/models + Creative discovery: PASS');
