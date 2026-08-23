import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {assetRecord} from '../src/asset-manifest.js';
import {BLOCK,BLOCKS} from '../src/blocks.js';
import {ITEMS} from '../src/items.js';
import {matchRecipe} from '../src/recipes.js';
import {canHarvestBlock,miningDurationMs} from '../src/mining-rules.js';
import {TERRAIN_GENERATOR_VERSION,createTerrainGenerator} from '../src/terrain-generator.js';
import {SurvivalBlockBreakController} from '../server/survival-block-break-controller.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

assert.equal(BLOCK.IRON_ORE,19,'new block must use the free id after existing bed states');
assert.deepEqual({...BLOCKS[BLOCK.IRON_ORE],tiles:undefined},{name:'铁矿石',solid:true,hardness:3,tiles:undefined,drops:'raw_iron',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'stone'});
assert.equal(ITEMS.stone_pickaxe.name,'石镐');assert.equal(ITEMS.stone_pickaxe.stack,1);assert.equal(ITEMS.stone_pickaxe.assetKey,'item.stone_pickaxe');assert.deepEqual(ITEMS.stone_pickaxe.tool,{kind:'pickaxe',tier:'stone',speed:4,durability:131});
assert.equal(ITEMS.raw_iron.name,'粗铁');assert.equal(ITEMS.raw_iron.stack,64);assert.equal(ITEMS.raw_iron.assetKey,'item.raw_iron');
assert.equal(ITEMS.iron_ingot.name,'铁锭');assert.equal(ITEMS.iron_ingot.stack,64);assert.equal(ITEMS.iron_ingot.assetKey,'item.iron_ingot');

assert.equal(ITEMS.iron_pickaxe.name,'铁镐');assert.equal(ITEMS.iron_pickaxe.stack,1);assert.equal(ITEMS.iron_pickaxe.assetKey,'item.iron_pickaxe');assert.deepEqual(ITEMS.iron_pickaxe.tool,{kind:'pickaxe',tier:'iron',speed:6,durability:250});assert.equal(ITEMS.iron_pickaxe.attackDamage,4);
const ironPickaxeAsset=assetRecord('item.iron_pickaxe');
assert.equal(ironPickaxeAsset?.url,'./assets/items/iron_pickaxe.png');assert.equal(ironPickaxeAsset?.minecraftVersion,'1.20.1');assert.equal(ironPickaxeAsset?.sha256,'67305d8bd14e1d60633258f52055fce5aeaea7837c10e62d436fc16f163be627');
const canonicalIronPickaxe=readFileSync(new URL('../MC原版素材assets/minecraft/textures/item/iron_pickaxe.png',import.meta.url));
const runtimeIronPickaxe=readFileSync(new URL('../assets/items/iron_pickaxe.png',import.meta.url));
assert.equal(canonicalIronPickaxe.byteLength,187);assert.equal(runtimeIronPickaxe.byteLength,187);assert.equal(sha256(canonicalIronPickaxe),ironPickaxeAsset.sha256);assert.equal(sha256(runtimeIronPickaxe),ironPickaxeAsset.sha256);assert.deepEqual(runtimeIronPickaxe,canonicalIronPickaxe,'runtime iron pickaxe must remain byte-identical to the tracked Java 1.20.1 source texture');

const stoneGrid=Array(9).fill(null);for(const i of[0,1,2])stoneGrid[i]={id:'block:10',count:1};stoneGrid[4]={id:'stick',count:1};stoneGrid[7]={id:'stick',count:1};
const stoneRecipe=matchRecipe(stoneGrid,3);assert.equal(stoneRecipe?.recipe?.id,'stone_pickaxe');assert.deepEqual(stoneRecipe.recipe.result,{id:'stone_pickaxe',count:1});assert.deepEqual(stoneRecipe.used,[0,1,2,4,7]);assert.equal(matchRecipe(stoneGrid,2),null,'stone pickaxe remains a 3x3 workbench recipe');

const ironGrid=Array(9).fill(null);for(const i of[0,1,2])ironGrid[i]={id:'iron_ingot',count:1};ironGrid[4]={id:'stick',count:1};ironGrid[7]={id:'stick',count:1};
const ironRecipe=matchRecipe(ironGrid,3);assert.equal(ironRecipe?.recipe?.id,'iron_pickaxe');assert.deepEqual(ironRecipe.recipe.result,{id:'iron_pickaxe',count:1});assert.deepEqual(ironRecipe.used,[0,1,2,4,7]);assert.equal(matchRecipe(ironGrid,2),null,'iron pickaxe must remain a workbench-only 3x3 recipe');

assert.equal(canHarvestBlock(BLOCK.IRON_ORE,null),false);assert.equal(canHarvestBlock(BLOCK.IRON_ORE,'wooden_pickaxe'),false,'wooden pickaxe may break iron ore but must not harvest it');assert.equal(canHarvestBlock(BLOCK.IRON_ORE,'stone_pickaxe'),true);assert.equal(canHarvestBlock(BLOCK.IRON_ORE,'iron_pickaxe'),true);assert.ok(miningDurationMs(BLOCK.IRON_ORE,'stone_pickaxe')<miningDurationMs(BLOCK.IRON_ORE,'wooden_pickaxe'),'stone pickaxe must mine iron ore faster than wood');assert.ok(miningDurationMs(BLOCK.IRON_ORE,'iron_pickaxe')<miningDurationMs(BLOCK.IRON_ORE,'stone_pickaxe'),'iron pickaxe must mine iron ore faster than stone');

function authoritativeBreak(itemId){
  let block=BLOCK.IRON_ORE;const drops=[];const mutations=[];
  const world={getBlock(x,y,z){return x===0&&y===11&&z===-1?block:BLOCK.AIR;}};
  const setBlock=(x,y,z,id)=>{const previous=block,changed=x===0&&y===11&&z===-1&&previous!==id;if(changed)block=id;const result={changed,x,y,z,previous,id};mutations.push(result);return result;};
  const controller=new SurvivalBlockBreakController({world,setBlock,onDrop:drop=>drops.push(drop)}),session=`iron-${itemId}`,player={mode:'survival',position:{x:.5,y:10,z:.5},yaw:0,pitch:0};
  controller.observePrimary(session,true);let result=null,ticks=0;
  for(;ticks<80&&!result?.breakResult?.changed;ticks++)result=controller.step(session,player,{id:itemId,count:1},{dt:.05});
  assert.equal(result?.breakResult?.changed,true,`${itemId} must eventually break the target iron ore`);assert.equal(block,BLOCK.AIR);assert.equal(mutations.filter(entry=>entry.changed).length,1);return{result,drops,ticks};
}

const wood=authoritativeBreak('wooden_pickaxe');assert.equal(wood.result.drop,null);assert.deepEqual(wood.drops,[],'authoritative wooden-pickaxe mining must not emit raw iron');
const stone=authoritativeBreak('stone_pickaxe');assert.equal(stone.result.drop?.itemId,'raw_iron');assert.equal(stone.result.drop?.count,1);assert.equal(stone.result.drop?.blockId,BLOCK.IRON_ORE);assert.equal(stone.drops.length,1);assert.equal(stone.drops[0].itemId,'raw_iron');
const iron=authoritativeBreak('iron_pickaxe');assert.equal(iron.result.drop?.itemId,'raw_iron');assert.equal(iron.drops.length,1);assert.ok(iron.ticks<stone.ticks,'authoritative iron pickaxe must complete the same iron-ore break in fewer server ticks than stone');

assert.equal(TERRAIN_GENERATOR_VERSION,4);const terrain=createTerrainGenerator({seed:'iron-progression',prompt:'平原'});let ores=0;
for(let cx=-2;cx<=2;cx++)for(let cz=-2;cz<=2;cz++){const chunk=terrain.generateChunk(cx,cz);for(const id of chunk)if(id===BLOCK.IRON_ORE)ores++;}
assert.ok(ores>0,'shared current terrain v4 must retain reachable iron ore in a representative area');
const terrainV3=createTerrainGenerator({seed:'iron-progression',prompt:'平原',version:3});let v3Ores=0;for(let cx=-2;cx<=2;cx++)for(let cz=-2;cz<=2;cz++)for(const id of terrainV3.generateChunk(cx,cz))if(id===BLOCK.IRON_ORE)v3Ores++;
assert.equal(v3Ores,ores,'terrain v4 vegetation decoration may not change deterministic iron ore placement');

console.log('stone pickaxe -> iron harvest -> furnace iron ingot -> source-backed iron pickaxe progression contract across current terrain v4 / explicit v3: PASS');