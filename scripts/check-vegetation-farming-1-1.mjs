import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
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

console.log('vegetation farming 1.1 pure seed + bone meal rules: PASS');
