import assert from 'node:assert/strict';
import {Equipment} from '../src/equipment.js';
import {ITEMS,CREATIVE_START} from '../src/items.js';
import {matchRecipe} from '../src/recipes.js';

const armor={
  iron_helmet:{slot:'head',points:2,durability:165,asset:'item.iron_helmet'},
  iron_chestplate:{slot:'chest',points:6,durability:240,asset:'item.iron_chestplate'},
  iron_leggings:{slot:'legs',points:5,durability:225,asset:'item.iron_leggings'},
  iron_boots:{slot:'feet',points:2,durability:195,asset:'item.iron_boots'}
};
for(const [id,expected] of Object.entries(armor)){const item=ITEMS[id];assert.ok(item,`${id} must exist`);assert.equal(item.stack,1);assert.equal(item.armorSlot,expected.slot);assert.equal(item.armorPoints,expected.points);assert.equal(item.durability,expected.durability);assert.equal(item.assetKey,expected.asset);assert.match(item.texture,new RegExp(`/textures/item/${id}\\.png$`));assert.ok(CREATIVE_START.includes(id),`${id} must be reachable from creative inventory`);}

const stack=id=>id?{id,count:1}:null;
const recipe=(rows)=>matchRecipe(rows.flat().map(stack),3)?.recipe?.result||null;
assert.deepEqual(recipe([
  ['iron_ingot','iron_ingot','iron_ingot'],
  ['iron_ingot',null,'iron_ingot'],
  [null,null,null]
]),{id:'iron_helmet',count:1});
assert.deepEqual(recipe([
  [null,null,null],
  ['iron_ingot','iron_ingot','iron_ingot'],
  ['iron_ingot',null,'iron_ingot']
]),{id:'iron_helmet',count:1},'trimmed shaped recipes must allow the vanilla helmet pattern one row lower');
assert.deepEqual(recipe([
  ['iron_ingot',null,'iron_ingot'],
  ['iron_ingot','iron_ingot','iron_ingot'],
  ['iron_ingot','iron_ingot','iron_ingot']
]),{id:'iron_chestplate',count:1});
assert.deepEqual(recipe([
  ['iron_ingot','iron_ingot','iron_ingot'],
  ['iron_ingot',null,'iron_ingot'],
  ['iron_ingot',null,'iron_ingot']
]),{id:'iron_leggings',count:1});
assert.deepEqual(recipe([
  ['iron_ingot',null,'iron_ingot'],
  ['iron_ingot',null,'iron_ingot'],
  [null,null,null]
]),{id:'iron_boots',count:1});
assert.equal(matchRecipe([stack('iron_ingot'),stack('iron_ingot'),stack('iron_ingot'),stack('iron_ingot')],2),null,'iron armor recipes must require a workbench');

const full=new Equipment({slots:{head:{id:'iron_helmet',count:1},chest:{id:'iron_chestplate',count:1},legs:{id:'iron_leggings',count:1},feet:{id:'iron_boots',count:1}}});assert.equal(full.armorPoints(),15);assert.equal(full.armorToughness(),0);
for(const [id,durability] of Object.entries({leather_helmet:55,leather_chestplate:80,leather_leggings:75,leather_boots:65}))assert.equal(ITEMS[id].durability,durability,`${id} should regain Java durability semantics alongside generic armor wear`);

console.log('source-backed iron armor items + recipes + 15-point full-set progression: PASS');
