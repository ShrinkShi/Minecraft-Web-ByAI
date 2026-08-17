import assert from 'node:assert/strict';
import {BLOCK,BLOCKS} from '../src/blocks.js';
import {ITEMS} from '../src/items.js';
import {matchRecipe} from '../src/recipes.js';
import {canHarvestBlock,miningDurationMs} from '../src/mining-rules.js';
import {TERRAIN_GENERATOR_VERSION,createTerrainGenerator} from '../src/terrain-generator.js';
import {SurvivalBlockBreakController} from '../server/survival-block-break-controller.mjs';

assert.equal(BLOCK.IRON_ORE,19,'new block must use the free id after existing bed states');
assert.deepEqual({...BLOCKS[BLOCK.IRON_ORE],tiles:undefined},{name:'铁矿石',solid:true,hardness:3,tiles:undefined,drops:'raw_iron',requires:'pickaxe',minToolTier:'stone'});
assert.equal(ITEMS.stone_pickaxe.name,'石镐');assert.equal(ITEMS.stone_pickaxe.stack,1);assert.equal(ITEMS.stone_pickaxe.assetKey,'item.stone_pickaxe');assert.deepEqual(ITEMS.stone_pickaxe.tool,{kind:'pickaxe',tier:'stone',speed:4,durability:131});
assert.equal(ITEMS.raw_iron.name,'粗铁');assert.equal(ITEMS.raw_iron.stack,64);assert.equal(ITEMS.raw_iron.assetKey,'item.raw_iron');

const grid=Array(9).fill(null);for(const i of[0,1,2])grid[i]={id:'block:10',count:1};grid[4]={id:'stick',count:1};grid[7]={id:'stick',count:1};
const recipe=matchRecipe(grid,3);assert.equal(recipe?.recipe?.id,'stone_pickaxe');assert.deepEqual(recipe.recipe.result,{id:'stone_pickaxe',count:1});assert.deepEqual(recipe.used,[0,1,2,4,7]);assert.equal(matchRecipe(grid,2),null,'stone pickaxe remains a 3x3 workbench recipe');

assert.equal(canHarvestBlock(BLOCK.IRON_ORE,null),false);assert.equal(canHarvestBlock(BLOCK.IRON_ORE,'wooden_pickaxe'),false,'wooden pickaxe may break iron ore but must not harvest it');assert.equal(canHarvestBlock(BLOCK.IRON_ORE,'stone_pickaxe'),true);assert.ok(miningDurationMs(BLOCK.IRON_ORE,'stone_pickaxe')<miningDurationMs(BLOCK.IRON_ORE,'wooden_pickaxe'),'stone pickaxe must mine iron ore faster than wood');

function authoritativeBreak(itemId){
  let block=BLOCK.IRON_ORE;const drops=[];const mutations=[];
  const world={getBlock(x,y,z){return x===0&&y===11&&z===-1?block:BLOCK.AIR;}};
  const setBlock=(x,y,z,id)=>{const previous=block,changed=x===0&&y===11&&z===-1&&previous!==id;if(changed)block=id;const result={changed,x,y,z,previous,id};mutations.push(result);return result;};
  const controller=new SurvivalBlockBreakController({world,setBlock,onDrop:drop=>drops.push(drop)}),session=`iron-${itemId}`,player={mode:'survival',position:{x:.5,y:10,z:.5},yaw:0,pitch:0};
  controller.observePrimary(session,true);let result=null;
  for(let tick=0;tick<80&&!result?.breakResult?.changed;tick++)result=controller.step(session,player,{id:itemId,count:1},{dt:.05});
  assert.equal(result?.breakResult?.changed,true,`${itemId} must eventually break the target iron ore`);assert.equal(block,BLOCK.AIR);assert.equal(mutations.filter(entry=>entry.changed).length,1);return{result,drops};
}

const wood=authoritativeBreak('wooden_pickaxe');assert.equal(wood.result.drop,null);assert.deepEqual(wood.drops,[],'authoritative wooden-pickaxe mining must not emit raw iron');
const stone=authoritativeBreak('stone_pickaxe');assert.equal(stone.result.drop?.itemId,'raw_iron');assert.equal(stone.result.drop?.count,1);assert.equal(stone.result.drop?.blockId,BLOCK.IRON_ORE);assert.equal(stone.drops.length,1);assert.equal(stone.drops[0].itemId,'raw_iron');

assert.equal(TERRAIN_GENERATOR_VERSION,2);const terrain=createTerrainGenerator({seed:'iron-progression',prompt:'平原'});let ores=0;
for(let cx=-2;cx<=2;cx++)for(let cz=-2;cz<=2;cz++){const chunk=terrain.generateChunk(cx,cz);for(const id of chunk)if(id===BLOCK.IRON_ORE)ores++;}
assert.ok(ores>0,'shared terrain v2 must generate reachable iron ore in a representative area');

console.log('stone pickaxe -> stone-tier iron harvest -> raw iron shared progression contract: PASS');