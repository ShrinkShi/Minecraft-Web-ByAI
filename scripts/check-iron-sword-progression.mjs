import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ITEMS,CREATIVE_START} from '../src/items.js';
import {assetRecord,assetUrl} from '../src/asset-manifest.js';
import {itemDurability} from '../src/item-stack.js';
import {matchRecipe} from '../src/recipes.js';
import {meleeProfile} from '../src/melee-rules.js';

const root=process.cwd(),expectedHash='ed1fa2f83955583e70a19791455d13989e8bd93b1d7240e775a57141022bed6b';
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const pngSize=path=>{const bytes=readFileSync(path);assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');return[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];};

assert.equal(ITEMS.iron_sword.name,'铁剑');assert.equal(ITEMS.iron_sword.stack,1);assert.equal(ITEMS.iron_sword.assetKey,'item.iron_sword');assert.equal(ITEMS.iron_sword.texture,'./assets/items/iron_sword.png');assert.equal(ITEMS.iron_sword.attackDamage,6);assert.equal(ITEMS.iron_sword.durability,250);assert.equal(ITEMS.iron_sword.tool,undefined,'sword must not be represented as a mining tool');assert.deepEqual(ITEMS.iron_sword.combat,{attackSpeed:1.6,durabilityCost:1});assert.equal(itemDurability('iron_sword'),250);assert.deepEqual(meleeProfile('iron_sword'),{itemId:'iron_sword',damage:6,attackSpeed:1.6,attackIntervalMs:625,durabilityCost:1});
assert.deepEqual(CREATIVE_START,['block:1','block:2','block:3','block:4','block:5','block:6','block:7','block:9','wooden_pickaxe','bed','stone_pickaxe','block:20','block:21'],'iron sword must not shift historical starter hotbar slots');

const grid=Array(9).fill(null);grid[1]={id:'iron_ingot',count:1};grid[4]={id:'iron_ingot',count:1};grid[7]={id:'stick',count:1};
const recipe=matchRecipe(grid,3);assert.equal(recipe?.recipe?.id,'iron_sword');assert.deepEqual(recipe.recipe.result,{id:'iron_sword',count:1});assert.deepEqual(recipe.used,[1,4,7]);assert.equal(matchRecipe(grid,2),null,'three-tall sword recipe cannot fit the player 2x2 crafting grid');

const record=assetRecord('item.iron_sword'),runtime=resolve(root,'assets/items/iron_sword.png'),canonical=resolve(root,'MC原版素材assets/minecraft/textures/item/iron_sword.png');
assert.equal(assetUrl('item.iron_sword'),'./assets/items/iron_sword.png');assert.equal(record.minecraftVersion,'1.20.1');assert.equal(record.sha256,expectedHash);assert.equal(sha256(runtime),expectedHash);assert.equal(sha256(canonical),expectedHash);assert.equal(sha256(runtime),sha256(canonical),'runtime iron sword texture must stay byte-identical to canonical source');assert.deepEqual(pngSize(runtime),[16,16]);

console.log('source-backed iron sword recipe + durability + melee profile contract: PASS');
