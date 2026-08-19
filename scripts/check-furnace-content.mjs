import assert from 'node:assert/strict';
import {BLOCK,BLOCKS} from '../src/blocks.js';
import {ITEMS,CREATIVE_START} from '../src/items.js';
import {ITEM_ALIASES} from '../src/commands.js';
import {blockItemFaceTextures,blockItemFaceTiles} from '../src/block-item-preview.js';
import {minecraftModelBlockDescriptor,MINECRAFT_MODEL_BLOCK_REGISTRY,MINECRAFT_MODEL_RUNTIME_VERSION} from '../src/minecraft-model-registry.js';
import {CraftingGrid} from '../src/recipes.js';
import {SMELTING_RECIPES,smeltingRecipeFor} from '../src/smelting.js';

assert.equal(BLOCK.FURNACE,21);
assert.deepEqual(BLOCKS[BLOCK.FURNACE],{
  name:'熔炉',solid:true,hardness:3.5,tiles:[3,3,3],drops:'block:21',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'wood',interactive:true,interactionKind:'furnace'
});
assert.equal(MINECRAFT_MODEL_RUNTIME_VERSION,1);
assert.equal(MINECRAFT_MODEL_BLOCK_REGISTRY[BLOCK.FURNACE],minecraftModelBlockDescriptor(BLOCK.FURNACE));
assert.deepEqual(minecraftModelBlockDescriptor(BLOCK.FURNACE),{
  blockstate:'minecraft:furnace',state:{facing:'north',lit:'false'},renderLayer:'opaque',textureLayers:{}
});

const furnace=ITEMS['block:21'];
assert.equal(furnace.name,'熔炉');assert.equal(furnace.stack,64);assert.equal(furnace.blockId,BLOCK.FURNACE);assert.equal(furnace.blockPreview,'source-faces');
assert.deepEqual(furnace.blockPreviewFaces,{
  top:'./assets/items/furnace_top.png',left:'./assets/items/furnace_side.png',right:'./assets/items/furnace_front.png'
});
assert.deepEqual(blockItemFaceTextures(furnace),furnace.blockPreviewFaces);assert.equal(blockItemFaceTiles(furnace),null);
assert.equal(CREATIVE_START.at(-1),'block:21');
assert.equal(ITEM_ALIASES.furnace,'block:21');assert.equal(ITEM_ALIASES['minecraft:furnace'],'block:21');
assert.equal(ITEMS.iron_ingot.name,'铁锭');assert.equal(ITEMS.iron_ingot.assetKey,'item.iron_ingot');assert.equal(ITEMS.iron_ingot.texture,'./assets/items/iron_ingot.png');
assert.equal(ITEM_ALIASES.iron_ingot,'iron_ingot');assert.equal(ITEM_ALIASES['minecraft:iron_ingot'],'iron_ingot');assert.equal(ITEM_ALIASES.raw_iron,'raw_iron');
assert.equal(SMELTING_RECIPES.raw_iron.output,'iron_ingot');assert.equal(smeltingRecipeFor('raw_iron').output,'iron_ingot');

const grid=new CraftingGrid(3);grid.slots=[
  {id:'block:10',count:1},{id:'block:10',count:1},{id:'block:10',count:1},
  {id:'block:10',count:1},null,{id:'block:10',count:1},
  {id:'block:10',count:1},{id:'block:10',count:1},{id:'block:10',count:1}
];
assert.deepEqual(grid.refresh(),{id:'block:21',count:1});assert.deepEqual(grid.consume(),{id:'block:21',count:1});assert.ok(grid.slots.every(slot=>slot===null));
const small=new CraftingGrid(2);small.slots=[{id:'block:10',count:1},{id:'block:10',count:1},{id:'block:10',count:1},{id:'block:10',count:1}];assert.equal(small.refresh(),null);

console.log('furnace gameplay + source-backed presentation + recipe/smelting integration: PASS');
