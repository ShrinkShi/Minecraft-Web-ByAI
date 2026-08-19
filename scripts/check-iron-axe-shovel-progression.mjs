import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {BLOCKS} from '../src/blocks.js';
import {CREATIVE_START,ITEMS} from '../src/items.js';
import {assetRecord,assetUrl} from '../src/asset-manifest.js';
import {canHarvestBlock,miningDurationMs,miningToolMultiplier} from '../src/mining-rules.js';
import {matchRecipe} from '../src/recipes.js';

const root=process.cwd();
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const pngSize=path=>{const bytes=readFileSync(path);assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');return[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];};
const stack=id=>({id,count:1});

assert.deepEqual(ITEMS.iron_axe.tool,{kind:'axe',tier:'iron',speed:6,durability:250});
assert.equal(ITEMS.iron_axe.attackDamage,9);
assert.equal(ITEMS.iron_axe.stack,1);
assert.equal(ITEMS.iron_axe.assetKey,'item.iron_axe');
assert.equal(ITEMS.iron_axe.texture,'./assets/items/iron_axe.png');
assert.deepEqual(ITEMS.iron_shovel.tool,{kind:'shovel',tier:'iron',speed:6,durability:250});
assert.equal(ITEMS.iron_shovel.attackDamage,4.5);
assert.equal(ITEMS.iron_shovel.stack,1);
assert.equal(ITEMS.iron_shovel.assetKey,'item.iron_shovel');
assert.equal(ITEMS.iron_shovel.texture,'./assets/items/iron_shovel.png');
assert.deepEqual(CREATIVE_START,['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe','bed','stone_pickaxe','block:20','block:21'],'new iron tools must not shift the historical starter hotbar');

const axeSlots=Array(9).fill(null);for(const index of [0,1,3])axeSlots[index]=stack('iron_ingot');for(const index of [4,7])axeSlots[index]=stack('stick');
assert.equal(matchRecipe(axeSlots,3)?.recipe.id,'iron_axe');
assert.deepEqual(matchRecipe(axeSlots,3)?.recipe.result,{id:'iron_axe',count:1});
const mirroredAxe=Array(9).fill(null);for(const index of [1,2,5])mirroredAxe[index]=stack('iron_ingot');for(const index of [4,7])mirroredAxe[index]=stack('stick');
assert.equal(matchRecipe(mirroredAxe,3)?.recipe.id,'iron_axe','axe recipe must accept the horizontal mirror');
const shovelSlots=Array(9).fill(null);for(const [index,id] of [[1,'iron_ingot'],[4,'stick'],[7,'stick']])shovelSlots[index]=stack(id);
assert.equal(matchRecipe(shovelSlots,3)?.recipe.id,'iron_shovel');
assert.deepEqual(matchRecipe(shovelSlots,3)?.recipe.result,{id:'iron_shovel',count:1});
assert.equal(matchRecipe(shovelSlots.slice(0,4),2),null,'iron shovel remains a workbench recipe');

for(const id of [1,2,4])assert.equal(BLOCKS[id].effectiveTool,'shovel');
for(const id of [5,6,9])assert.equal(BLOCKS[id].effectiveTool,'axe');
for(const id of [3,10,19,21]){assert.equal(BLOCKS[id].effectiveTool,'pickaxe');assert.equal(BLOCKS[id].requires,'pickaxe');}
assert.equal(canHarvestBlock(2,null),true);
assert.equal(canHarvestBlock(4,null),true);
assert.equal(canHarvestBlock(5,null),true);
assert.equal(canHarvestBlock(6,null),true);
assert.equal(canHarvestBlock(3,'iron_axe'),false);
assert.equal(miningToolMultiplier(2,'iron_shovel'),15);
assert.equal(miningToolMultiplier(6,'iron_axe'),15);
assert.equal(miningToolMultiplier(6,'iron_shovel'),1.2);
assert.ok(miningDurationMs(2,'iron_shovel')<miningDurationMs(2,null));
assert.ok(miningDurationMs(6,'iron_axe')<miningDurationMs(6,null));

const assets={
  iron_axe:{hash:'8dea40bac06c6f14bb0ad9e8b47de63250f6d6a46ae9439b85ddd1377f1edb49'},
  iron_shovel:{hash:'c9d36d59ec53ebc631bd24930f62087c316eef39bd237d8bb69cb2bb629dfae5'}
};
for(const [itemId,{hash}] of Object.entries(assets)){
  const key=`item.${itemId}`,runtime=resolve(root,`assets/items/${itemId}.png`),canonical=resolve(root,`MC原版素材assets/minecraft/textures/item/${itemId}.png`),record=assetRecord(key);
  assert.equal(assetUrl(key),`./assets/items/${itemId}.png`);
  assert.equal(record.minecraftVersion,'1.20.1');
  assert.equal(record.sha256,hash);
  assert.equal(sha256(runtime),hash);
  assert.equal(sha256(canonical),hash);
  assert.equal(sha256(runtime),sha256(canonical),`${itemId} runtime texture must stay byte-identical to canonical source`);
  assert.deepEqual(pngSize(runtime),[16,16]);
}

console.log('effective-tool split + source-backed iron axe/shovel crafting, mining and durability metadata: PASS');
