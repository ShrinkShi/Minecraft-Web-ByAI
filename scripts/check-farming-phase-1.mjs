import assert from 'node:assert/strict';
import {BLOCK,BLOCKS} from '../src/blocks.js';
import {ITEMS} from '../src/items.js';
import {matchRecipe} from '../src/recipes.js';
import {minecraftModelBlockDescriptor} from '../src/minecraft-model-registry.js';
import {SingleplayerFarmingRuntime} from '../src/singleplayer-farming-runtime.js';
import {FARMLAND_BLOCK_IDS,WHEAT_BLOCK_IDS,canPlantWheat,farmlandBlockForMoisture,farmlandHasNearbyWater,farmlandMoisture,isFarmlandBlock,isWheatCropBlock,nextFarmlandBlock,nextWheatBlock,wheatAge,wheatBlockForAge,wheatHarvestDrops} from '../src/farming-rules.js';

assert.deepEqual(FARMLAND_BLOCK_IDS,[24,28,29,30,31,32,33,34]);
assert.deepEqual(WHEAT_BLOCK_IDS,[35,36,37,38,39,40,41,42]);
for(let moisture=0;moisture<=7;moisture++){const id=farmlandBlockForMoisture(moisture);assert.equal(farmlandMoisture(id),moisture);assert.equal(isFarmlandBlock(id),true);assert.equal(BLOCKS[id]?.fullCube,false);const model=minecraftModelBlockDescriptor(id);assert.equal(model?.blockstate,'minecraft:farmland');assert.equal(model?.state?.moisture,String(moisture));}
for(let age=0;age<=7;age++){const id=wheatBlockForAge(age);assert.equal(wheatAge(id),age);assert.equal(isWheatCropBlock(id),true);assert.equal(BLOCKS[id]?.solid,false);assert.equal(BLOCKS[id]?.fullCube,false);const model=minecraftModelBlockDescriptor(id);assert.equal(model?.blockstate,'minecraft:wheat');assert.equal(model?.state?.age,String(age));assert.equal(model?.renderLayer,'cutout');}
assert.equal(canPlantWheat(BLOCK.FARMLAND,BLOCK.AIR),true);assert.equal(canPlantWheat(BLOCK.FARMLAND_MOISTURE_7,BLOCK.AIR),true);assert.equal(canPlantWheat(BLOCK.DIRT,BLOCK.AIR),false);assert.equal(canPlantWheat(BLOCK.FARMLAND,BLOCK.STONE),false);
assert.equal(nextFarmlandBlock(BLOCK.FARMLAND,{hydrated:true,hasCrop:false}),BLOCK.FARMLAND_MOISTURE_7);assert.equal(nextFarmlandBlock(BLOCK.FARMLAND_MOISTURE_7,{hydrated:false,hasCrop:false}),BLOCK.FARMLAND_MOISTURE_6);assert.equal(nextFarmlandBlock(BLOCK.FARMLAND,{hydrated:false,hasCrop:true}),BLOCK.FARMLAND);assert.equal(nextFarmlandBlock(BLOCK.FARMLAND,{hydrated:false,hasCrop:false}),BLOCK.DIRT);
assert.equal(nextWheatBlock(BLOCK.WHEAT_AGE_0,BLOCK.FARMLAND_MOISTURE_7,()=>0),BLOCK.WHEAT_AGE_1);assert.equal(nextWheatBlock(BLOCK.WHEAT_AGE_0,BLOCK.FARMLAND,()=>.99),BLOCK.WHEAT_AGE_0);assert.equal(nextWheatBlock(BLOCK.WHEAT_AGE_7,BLOCK.FARMLAND_MOISTURE_7,()=>0),BLOCK.WHEAT_AGE_7);
assert.deepEqual(wheatHarvestDrops(BLOCK.WHEAT_AGE_2,()=>0),[{id:'wheat_seeds',count:1}]);assert.deepEqual(wheatHarvestDrops(BLOCK.WHEAT_AGE_7,()=>0),[{id:'wheat',count:1}]);assert.deepEqual(wheatHarvestDrops(BLOCK.WHEAT_AGE_7,()=>.999),[{id:'wheat',count:1},{id:'wheat_seeds',count:3}]);
const water=new Set(['4,20,0']);assert.equal(farmlandHasNearbyWater((x,y,z)=>water.has(`${x},${y},${z}`)?BLOCK.WATER:BLOCK.AIR,0,20,0),true);assert.equal(farmlandHasNearbyWater((x,y,z)=>water.has(`${x},${y},${z}`)?BLOCK.WATER:BLOCK.AIR,-1,20,0),false);
assert.equal(ITEMS.wheat_seeds?.plantKind,'wheat');assert.equal(ITEMS.wheat?.stack,64);assert.equal(ITEMS.bread?.food?.nutrition,5);
const bread=matchRecipe([{id:'wheat',count:1},{id:'wheat',count:1},{id:'wheat',count:1},null,null,null,null,null,null],3);assert.equal(bread?.recipe?.id,'bread');assert.deepEqual(bread?.recipe?.result,{id:'bread',count:1});

const cells=new Map();const cellKey=(x,y,z)=>`${x},${y},${z}`;
const world={getBlock:(x,y,z)=>cells.get(cellKey(x,y,z))??BLOCK.AIR,setBlock:(x,y,z,id)=>{const k=cellKey(x,y,z),before=cells.get(k)??BLOCK.AIR;if(before===id)return false;cells.set(k,id);return true;},exportEdits:()=>({})};
let mode='survival';const emitted=[];
const farming=new SingleplayerFarmingRuntime({world,getMode:()=>mode,onDrop:(stack,target)=>emitted.push({stack:{...stack},target:{...target}}),random:()=>.999});
cells.set(cellKey(0,0,0),BLOCK.DIRT);cells.set(cellKey(0,1,0),BLOCK.WHEAT_AGE_7);
assert.equal(farming.observeEdit({cx:0,cz:0,index:0,id:BLOCK.DIRT}),true);assert.equal(world.getBlock(0,1,0),BLOCK.AIR);assert.deepEqual(emitted.map(entry=>entry.stack),[{id:'wheat',count:1},{id:'wheat_seeds',count:3}]);
mode='creative';cells.set(cellKey(0,1,0),BLOCK.WHEAT_AGE_7);const beforeCreativeDrops=emitted.length;
assert.equal(farming.observeEdit({cx:0,cz:0,index:0,id:BLOCK.DIRT}),true);assert.equal(world.getBlock(0,1,0),BLOCK.AIR);assert.equal(emitted.length,beforeCreativeDrops,'creative support removal must not spawn crop drops');
farming.dispose();

console.log('farming phase 1 rules, canonical model states, support-break drops, seed/wheat items and bread recipe: PASS');
