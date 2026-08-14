import assert from 'node:assert/strict';
import {DoubleTapForwardSprint} from '../src/sprint-gesture.js';

const gesture=new DoubleTapForwardSprint({windowMs:300});assert.equal(gesture.active,false);assert.equal(gesture.press(100),false);assert.equal(gesture.active,false);gesture.release();assert.equal(gesture.press(360),true);assert.equal(gesture.active,true,'second W press inside 300 ms should latch sprint');assert.equal(gesture.press(370,{repeat:true}),false);assert.equal(gesture.active,true,'keydown repeat must not cancel a latched sprint');assert.equal(gesture.release(),true);assert.equal(gesture.active,false,'releasing W stops double-tap sprint');
gesture.reset();gesture.press(1000);gesture.release();assert.equal(gesture.press(1401),false,'press outside the window should not sprint');assert.equal(gesture.active,false);assert.throws(()=>gesture.press(-1),/timestamp/);assert.throws(()=>new DoubleTapForwardSprint({windowMs:50}),/100 to 1000/);
console.log('double-W sprint gesture: PASS');
