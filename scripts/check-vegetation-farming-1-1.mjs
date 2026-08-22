import assert from 'node:assert/strict';
import {BLOCK,CHUNK_SIZE} from '../src/blocks.js';
import {SingleplayerVegetationRuntime} from '../src/singleplayer-vegetation-runtime.js';
import {
  BONE_MEAL_GRASS_ATTEMPTS,
  BONE_MEAL_GRASS_MAX_RADIUS,
  BONE_MEAL_WHEAT_MAX_GROWTH,
  BONE_MEAL_WHEAT_MIN_GROWTH,
  SHORT_GRASS_SEED_CHANCE,
  boneMealGrassCandidateOffsets,
  boneMealWheatResult,
  rollShortGrassDrops
} from '../src/vegetation-rules.js';

assert.equal(SHORT_GRASS_SEED_CHANCE,1/8);
assert.deepEqual(rollShortGrassDrops(()=>0),[{id:'wheat_seeds',count:1}]);
assert.deepEqual(rollShortGrassDrops(()=>SHORT_GRASS_SEED_CHANCE-.000001),[{id:'wheat_seeds',count:1}]);
assert.deepEqual(rollShortGrassDrops(()=>SHORT_GRASS_SEED_CHANCE),[]);
assert.deepEqual(rollShortGrassDrops(()=>.999999),[]);

assert.equal(BONE_MEAL_WHEAT_MIN_GROWTH,2);
assert.equal(BONE_MEAL_WHEAT_MAX_GROWTH,5);
assert.deepEqual(boneMealWheatResult(BLOCK.WHEAT_AGE_0,()=>0),{fromAge:0,toAge:2,blockId:BLOCK.WHEAT_AGE_2,growth:2});
assert.deepEqual(boneMealWheatResult(BLOCK.WHEAT_AGE_1,()=>.999999),{fromAge:1,toAge:6,blockId:BLOCK.WHEAT_AGE_6,growth:5});
assert.deepEqual(boneMealWheatResult(BLOCK.WHEAT_AGE_5,()=>.999999),{fromAge:5,toAge:7,blockId:BLOCK.WHEAT_AGE_7,growth:2});
assert.equal(boneMealWheatResult(BLOCK.WHEAT_AGE_7,()=>0),null);
assert.equal(boneMealWheatResult(BLOCK.GRASS,()=>0),null);

assert.equal(BONE_MEAL_GRASS_ATTEMPTS,128);
assert.equal(BONE_MEAL_GRASS_MAX_RADIUS,4);
const zeroOffsets=boneMealGrassCandidateOffsets(()=>0);
assert.equal(zeroOffsets.length,128);
assert.deepEqual(zeroOffsets[0],{dx:0,dz:0});
assert.deepEqual(zeroOffsets[1],{dx:-1,dz:-1});
assert.deepEqual(zeroOffsets[31],{dx:-1,dz:-1});
assert.deepEqual(zeroOffsets[32],{dx:-2,dz:-2});
assert.deepEqual(zeroOffsets[64],{dx:-3,dz:-3});
assert.deepEqual(zeroOffsets[96],{dx:-4,dz:-4});
assert(zeroOffsets.every(({dx,dz})=>Math.abs(dx)<=4&&Math.abs(dz)<=4));
assert.deepEqual(boneMealGrassCandidateOffsets(()=>.999999,{attempts:1,maxRadius:4}),[{dx:0,dz:0}]);
assert.deepEqual(boneMealGrassCandidateOffsets(()=>.5,{attempts:0,maxRadius:4}),[]);
assert.throws(()=>rollShortGrassDrops(()=>1),/\[0, 1\)/);
assert.throws(()=>boneMealGrassCandidateOffsets(()=>NaN,{attempts:2}),/\[0, 1\)/);
assert.throws(()=>boneMealGrassCandidateOffsets(Math.random,{attempts:-1}),/attempts/);

const posKey=(x,y,z)=>`${x},${y},${z}`;
class FakeWorld{
  constructor(){this.blocks=new Map();}
  getBlock(x,y,z){return this.blocks.get(posKey(x,y,z))??BLOCK.AIR;}
  setBlock(x,y,z,id){const key=posKey(x,y,z);if(this.getBlock(x,y,z)===id)return false;this.blocks.set(key,id);return true;}
}
const editIndex=(x,y,z)=>x+CHUNK_SIZE*(z+CHUNK_SIZE*y);

{
  const world=new FakeWorld(),drops=[];let changed=0;
  world.setBlock(0,10,0,BLOCK.WHEAT_AGE_1);
  const runtime=new SingleplayerVegetationRuntime({world,random:()=>0,onChanged:()=>changed++,onDrop:stack=>drops.push(stack)});
  const result=runtime.applyBoneMeal({x:0,y:10,z:0},()=>0);
  assert.deepEqual(result,{changed:true,kind:'wheat',fromAge:1,toAge:3,growth:2,placements:0});
  assert.equal(world.getBlock(0,10,0),BLOCK.WHEAT_AGE_3);
  assert.equal(changed,1);
  world.setBlock(0,10,0,BLOCK.WHEAT_AGE_7);
  assert.deepEqual(runtime.applyBoneMeal({x:0,y:10,z:0},()=>0),{changed:false,reason:'invalid-target'});
  assert.equal(changed,1,'mature wheat bonemeal must be a no-op');
  assert.equal(runtime.dropsForBlock(BLOCK.GRASS),null);
  assert.deepEqual(runtime.dropsForBlock(BLOCK.SHORT_GRASS,()=>0),[{id:'wheat_seeds',count:1}]);
  assert.deepEqual(runtime.dropsForBlock(BLOCK.SHORT_GRASS,()=>.5),[]);
  runtime.dispose();
}

{
  const world=new FakeWorld();let changed=0;
  world.setBlock(4,10,4,BLOCK.GRASS);
  const runtime=new SingleplayerVegetationRuntime({world,getMode:()=> 'survival',onChanged:()=>changed++,random:()=>0});
  const result=runtime.applyBoneMeal({x:4,y:10,z:4},()=>0);
  assert.deepEqual(result,{changed:true,kind:'grass',placements:1});
  assert.equal(world.getBlock(4,11,4),BLOCK.SHORT_GRASS,'origin-first candidate should make an unobstructed grass block succeed');
  assert.equal(changed,1);
  assert.deepEqual(runtime.applyBoneMeal({x:4,y:11,z:4},()=>0),{changed:false,reason:'invalid-target'});
  runtime.dispose();
}

{
  const world=new FakeWorld(),drops=[];let changed=0;
  world.setBlock(8,10,8,BLOCK.GRASS);world.setBlock(8,11,8,BLOCK.SHORT_GRASS);world.setBlock(8,10,8,BLOCK.AIR);
  const runtime=new SingleplayerVegetationRuntime({world,getMode:()=> 'survival',onChanged:()=>changed++,onDrop:stack=>drops.push({...stack}),random:()=>0});
  runtime.observeEdit({cx:0,cz:0,index:editIndex(8,10,8),id:BLOCK.AIR});
  assert.equal(world.getBlock(8,11,8),BLOCK.AIR);
  assert.deepEqual(drops,[{id:'wheat_seeds',count:1}]);
  assert.equal(changed,1);
  runtime.dispose();
}

{
  const world=new FakeWorld(),drops=[];
  world.setBlock(2,5,2,BLOCK.SHORT_GRASS);
  const runtime=new SingleplayerVegetationRuntime({world,getMode:()=> 'creative',onDrop:stack=>drops.push(stack),random:()=>0});
  assert.equal(runtime.emitShortGrassDrops({x:2,y:5,z:2}),0);
  assert.deepEqual(drops,[],'creative short grass removal must not create seed drops');
  assert.deepEqual(runtime.applyBoneMeal({x:2,y:5,z:2},()=>0),{changed:false,reason:'invalid-target'});
  runtime.dispose();
}

console.log('vegetation farming 1.1 pure seed + bone meal + singleplayer runtime: PASS');
