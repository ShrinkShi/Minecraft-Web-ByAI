import assert from 'node:assert/strict';
import {createHungerState,starvationFloorHpForDifficulty,stepHunger} from '../src/hunger-rules.js';

assert.equal(starvationFloorHpForDifficulty('peaceful'),20);
assert.equal(starvationFloorHpForDifficulty('easy'),10);
assert.equal(starvationFloorHpForDifficulty('normal'),1);
assert.equal(starvationFloorHpForDifficulty('hard'),0);
assert.equal(starvationFloorHpForDifficulty('easy',8),8);
assert.throws(()=>starvationFloorHpForDifficulty('nightmare'),/unsupported hunger difficulty/);

let step=stepHunger(createHungerState({food:0,saturation:0}),{dt:4,hp:11,difficulty:'easy'});
assert.equal(step.damage,1);
step=stepHunger(step.state,{dt:4,hp:10,difficulty:'easy'});
assert.equal(step.damage,0,'easy starvation must stop at 10 HP');

step=stepHunger(createHungerState({food:0,saturation:0}),{dt:4,hp:2,difficulty:'normal'});
assert.equal(step.damage,1);
step=stepHunger(step.state,{dt:4,hp:1,difficulty:'normal'});
assert.equal(step.damage,0,'normal starvation must stop at 1 HP');

step=stepHunger(createHungerState({food:0,saturation:0}),{dt:4,hp:1,difficulty:'hard'});
assert.equal(step.damage,1,'hard starvation may kill the player');

step=stepHunger(createHungerState({food:20,saturation:5}),{dt:8,hp:10,difficulty:'normal',naturalRegeneration:false});
assert.equal(step.heal,0,'naturalRegeneration=false must disable hunger healing');

step=stepHunger(createHungerState({food:10,saturation:2,exhaustion:4.1}),{dt:.01,hp:20,difficulty:'peaceful',naturalRegeneration:false});
assert.equal(step.state.food,10,'Java 1.20.1 peaceful exhaustion must not drain food');
assert.equal(step.state.saturation,1,'Java 1.20.1 peaceful exhaustion may still drain saturation');
assert.ok(Math.abs(step.state.exhaustion-.1)<1e-9);

step=stepHunger(createHungerState({food:18,saturation:0}),{dt:.5,hp:18,difficulty:'peaceful',naturalRegeneration:true});
assert.equal(step.state.food,19,'peaceful restores one food every 0.5 seconds');
assert.equal(step.state.saturation,0,'Java 1.20.1 peaceful does not yet auto-restore saturation');
assert.equal(step.heal,0);
step=stepHunger(step.state,{dt:.5,hp:18,difficulty:'peaceful',naturalRegeneration:true});
assert.equal(step.state.food,20);
assert.equal(step.state.saturation,0);
assert.equal(step.heal,1,'peaceful natural regeneration restores 1 HP every second');

step=stepHunger(createHungerState({food:18,saturation:0}),{dt:2,hp:18,difficulty:'peaceful',naturalRegeneration:false});
assert.equal(step.state.food,18,'peaceful food auto-refill obeys naturalRegeneration in Java 1.20.1');
assert.equal(step.heal,0);

assert.throws(()=>stepHunger(createHungerState(),{dt:1,hp:20,difficulty:'normal',naturalRegeneration:1}),/must be a boolean/);
console.log('Java 1.20.1 hunger difficulty + naturalRegeneration boundaries: PASS');
