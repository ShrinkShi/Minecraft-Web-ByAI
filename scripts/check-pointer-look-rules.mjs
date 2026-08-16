import assert from 'node:assert/strict';
import {POINTER_LOOK_MAX_EVENT_DELTA,POINTER_LOOK_SENSITIVITY,pointerLookIntent} from '../src/pointer-look-rules.js';

assert.equal(POINTER_LOOK_SENSITIVITY,.0022);
assert.equal(POINTER_LOOK_MAX_EVENT_DELTA,180);
assert.deepEqual(pointerLookIntent(10,-5),{yawDelta:-.022,pitchDelta:.011,clamped:false});
assert.deepEqual(pointerLookIntent(10000,-10000),{
  yawDelta:-POINTER_LOOK_MAX_EVENT_DELTA*POINTER_LOOK_SENSITIVITY,
  pitchDelta:POINTER_LOOK_MAX_EVENT_DELTA*POINTER_LOOK_SENSITIVITY,
  clamped:true
});
assert.deepEqual(pointerLookIntent(0,0),{yawDelta:0,pitchDelta:0,clamped:false});
assert.throws(()=>pointerLookIntent(NaN,0),/movementX must be a finite number/);
assert.throws(()=>pointerLookIntent(0,0,{sensitivity:0}),/sensitivity must be > 0/);
assert.throws(()=>pointerLookIntent(0,0,{maxEventDelta:0}),/maxEventDelta must be > 0/);

console.log('pointer-lock look delta filtering + spike clamp: PASS');
