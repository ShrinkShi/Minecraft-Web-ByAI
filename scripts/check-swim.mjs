import assert from 'node:assert/strict';
import {SWIM_SPEED_MULTIPLIER,SWIM_MAX_UP_SPEED,SWIM_MAX_DOWN_SPEED,waterCoverageFromSamples,stepSwimming} from '../src/swim-rules.js';

assert.equal(SWIM_SPEED_MULTIPLIER,.5);
assert.equal(waterCoverageFromSamples([false,false,false]),0);
assert.equal(waterCoverageFromSamples([true,false,false]),1/3);
assert.equal(waterCoverageFromSamples([true,true,false]),2/3);
assert.equal(waterCoverageFromSamples([true,true,true]),1);

let out=stepSwimming({velocityY:-2,coverage:0,dt:.05});
assert.deepEqual(out,{active:false,speedMultiplier:1,velocityY:-2},'dry movement must not be altered by swim rules');

const passive=stepSwimming({velocityY:0,coverage:1,dt:.05});
assert.equal(passive.active,true);assert.equal(passive.speedMultiplier,.5);assert.ok(passive.velocityY>0,'full submersion should have slight positive buoyancy');
const upward=stepSwimming({velocityY:0,coverage:1,dt:.05,up:true});
assert.ok(upward.velocityY>passive.velocityY,'Space must accelerate upward in water');
const downward=stepSwimming({velocityY:0,coverage:1,dt:.05,down:true});
assert.ok(downward.velocityY<0,'Shift must accelerate downward in water');

const partial=stepSwimming({velocityY:0,coverage:1/3,dt:.05});
assert.ok(Math.abs(partial.speedMultiplier-(1-(1-SWIM_SPEED_MULTIPLIER)/3))<1e-12);assert.ok(partial.speedMultiplier>.5&&partial.speedMultiplier<1);
assert.ok(partial.velocityY<0,'shallow/partial immersion should not create full-body buoyancy');

out=stepSwimming({velocityY:10,coverage:1,dt:.05,up:true});assert.equal(out.velocityY,SWIM_MAX_UP_SPEED);
out=stepSwimming({velocityY:-10,coverage:1,dt:.05,down:true});assert.equal(out.velocityY,-SWIM_MAX_DOWN_SPEED);
out=stepSwimming({velocityY:.4,coverage:1,dt:.05,up:true,down:true});const neutral=stepSwimming({velocityY:.4,coverage:1,dt:.05});assert.ok(Math.abs(out.velocityY-neutral.velocityY)<1e-12,'opposing vertical inputs cancel');

assert.throws(()=>waterCoverageFromSamples([]),TypeError);
assert.throws(()=>waterCoverageFromSamples([true,1]),TypeError);
assert.throws(()=>stepSwimming({velocityY:0,coverage:-.1,dt:.05}),RangeError);
assert.throws(()=>stepSwimming({velocityY:0,coverage:1.1,dt:.05}),RangeError);
assert.throws(()=>stepSwimming({velocityY:0,coverage:1,dt:-.1}),RangeError);
assert.throws(()=>stepSwimming({velocityY:NaN,coverage:1,dt:.05}),TypeError);
assert.throws(()=>stepSwimming({velocityY:0,coverage:1,dt:.05,up:1}),TypeError);

console.log('swimming + buoyancy checks: PASS');
