import assert from 'node:assert/strict';
import {POINTER_LOOK_MAX_EVENT_DELTA,POINTER_LOOK_SENSITIVITY,pointerLookIntent} from '../src/pointer-look-rules.js';

const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-12,`${label}: expected ${expected}, got ${actual}`);

assert.equal(POINTER_LOOK_SENSITIVITY,.0022);
assert.equal(POINTER_LOOK_MAX_EVENT_DELTA,180);
const ordinary=pointerLookIntent(10,-5);close(ordinary.yawDelta,-.022,'ordinary yaw');close(ordinary.pitchDelta,.011,'ordinary pitch');assert.equal(ordinary.clamped,false);
const spike=pointerLookIntent(10000,-10000);close(spike.yawDelta,-POINTER_LOOK_MAX_EVENT_DELTA*POINTER_LOOK_SENSITIVITY,'clamped yaw');close(spike.pitchDelta,POINTER_LOOK_MAX_EVENT_DELTA*POINTER_LOOK_SENSITIVITY,'clamped pitch');assert.equal(spike.clamped,true);
assert.deepEqual(pointerLookIntent(0,0),{yawDelta:0,pitchDelta:0,clamped:false});
assert.throws(()=>pointerLookIntent(NaN,0),/movementX must be a finite number/);
assert.throws(()=>pointerLookIntent(0,0,{sensitivity:0}),/sensitivity must be > 0/);
assert.throws(()=>pointerLookIntent(0,0,{maxEventDelta:0}),/maxEventDelta must be > 0/);

console.log('pointer-lock look delta filtering + spike clamp: PASS');
