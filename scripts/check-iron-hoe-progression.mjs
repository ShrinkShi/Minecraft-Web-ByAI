import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ITEMS,CREATIVE_START} from '../src/items.js';
import {assetRecord,assetUrl} from '../src/asset-manifest.js';
import {itemDurability} from '../src/item-stack.js';
import {matchRecipe} from '../src/recipes.js';

const item=ITEMS.iron_hoe;assert.equal(item.name,'铁锄');assert.equal(item.stack,1);assert.equal(item.assetKey,'item.iron_hoe');assert.deepEqual(item.tool,{kind:'hoe',tier:'iron',speed:6,durability:250});assert.equal(itemDurability('iron_hoe'),250);
const grid=Array(9).fill(null);grid[0]={id:'iron_ingot',count:1};grid[1]={id:'iron_ingot',count:1};grid[4]={id:'stick',count:1};grid[7]={id:'stick',count:1};const match=matchRecipe(grid,3);assert.equal(match?.recipe?.id,'iron_hoe');assert.deepEqual(match.recipe.result,{id:'iron_hoe',count:1});assert.deepEqual(match.used,[0,1,4,7]);assert.equal(matchRecipe(grid,2),null);
const mirrored=Array(9).fill(null);mirrored[1]={id:'iron_ingot',count:1};mirrored[2]={id:'iron_ingot',count:1};mirrored[4]={id:'stick',count:1};mirrored[7]={id:'stick',count:1};assert.equal(matchRecipe(mirrored,3)?.recipe?.id,'iron_hoe');
const canonical=resolve(process.cwd(),'MC原版素材assets/minecraft/textures/item/iron_hoe.png'),bytes=readFileSync(canonical),hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,'4ed88a87c141168b4552041174e83105e5d5825ea9b96836dd4869c674848d69');assert.equal(bytes.readUInt32BE(16),16);assert.equal(bytes.readUInt32BE(20),16);assert.equal(assetUrl('item.iron_hoe'),'./MC原版素材assets/minecraft/textures/item/iron_hoe.png');assert.equal(assetRecord('item.iron_hoe').directCanonical,true);
assert.deepEqual(CREATIVE_START,['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe','bed','stone_pickaxe','block:20','block:21']);
console.log('source-backed iron hoe recipe + 250 durability + canonical texture contract: PASS');
