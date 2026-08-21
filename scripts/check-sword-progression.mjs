import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ITEMS,CREATIVE_START} from '../src/items.js';
import {assetRecord,assetUrl} from '../src/asset-manifest.js';
import {itemDurability} from '../src/item-stack.js';
import {matchRecipe} from '../src/recipes.js';
import {meleeProfile} from '../src/melee-rules.js';

const pngSize=path=>{const bytes=readFileSync(path);assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');return[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];};
const cases=[
  {id:'wooden_sword',name:'木剑',material:'block:5',damage:4,durability:59,path:'wooden_sword.png'},
  {id:'stone_sword',name:'石剑',material:'block:10',damage:5,durability:131,path:'stone_sword.png'}
];
for(const entry of cases){
  const item=ITEMS[entry.id];assert.equal(item.name,entry.name);assert.equal(item.stack,1);assert.equal(item.assetKey,`item.${entry.id}`);assert.equal(item.attackDamage,entry.damage);assert.equal(item.durability,entry.durability);assert.equal(item.tool,undefined);assert.deepEqual(item.combat,{attackSpeed:1.6,durabilityCost:1});assert.equal(itemDurability(entry.id),entry.durability);assert.deepEqual(meleeProfile(entry.id),{itemId:entry.id,damage:entry.damage,attackSpeed:1.6,attackIntervalMs:625,durabilityCost:1});
  const grid=Array(9).fill(null);grid[1]={id:entry.material,count:1};grid[4]={id:entry.material,count:1};grid[7]={id:'stick',count:1};const match=matchRecipe(grid,3);assert.equal(match?.recipe?.id,entry.id);assert.deepEqual(match.recipe.result,{id:entry.id,count:1});assert.deepEqual(match.used,[1,4,7]);assert.equal(matchRecipe(grid,2),null);
  const record=assetRecord(`item.${entry.id}`),canonical=resolve(process.cwd(),'MC原版素材assets/minecraft/textures/item',entry.path);assert.equal(record.directCanonical,true);assert.equal(record.minecraftVersion,'1.20.1');assert.equal(assetUrl(`item.${entry.id}`),`./MC原版素材assets/minecraft/textures/item/${entry.path}`);assert.deepEqual(pngSize(canonical),[16,16]);
}
assert.deepEqual(CREATIVE_START,['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe','bed','stone_pickaxe','block:20','block:21'],'new swords must not shift historical starter hotbar slots');
console.log('wooden + stone sword recipes, durability, melee profiles and canonical assets: PASS');
