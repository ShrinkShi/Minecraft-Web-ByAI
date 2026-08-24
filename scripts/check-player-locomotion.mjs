import assert from 'node:assert/strict';
import {RUN_ARM_SWING_RADIANS,RUN_BODY_LEAN_RADIANS,RUN_LEG_SWING_RADIANS,WALK_ARM_SWING_RADIANS,WALK_LEG_SWING_RADIANS,playerLocomotionPose} from '../src/player-locomotion-rules.js';

assert.equal(WALK_LEG_SWING_RADIANS,.62);assert.equal(WALK_ARM_SWING_RADIANS,.52);assert.equal(RUN_LEG_SWING_RADIANS,1.05);assert.equal(RUN_ARM_SWING_RADIANS,.92);assert.equal(RUN_BODY_LEAN_RADIANS,.20);
const idle=playerLocomotionPose({phase:0,speed:0,sprint:false});assert.deepEqual(idle,{moving:0,running:false,phaseSpeed:0,leftArmPitch:0,rightArmPitch:0,leftLegPitch:0,rightLegPitch:0,bodyPitch:0,bodyYaw:0,bobY:0,swayX:0});
const walk=playerLocomotionPose({phase:Math.PI/2,speed:4.3,sprint:false});assert.equal(walk.running,false);assert(Math.abs(walk.leftLegPitch-.62)<1e-9);assert(Math.abs(walk.rightLegPitch+.62)<1e-9);assert(Math.abs(walk.leftArmPitch+.52)<1e-9);assert(Math.abs(walk.rightArmPitch-.52)<1e-9);assert.equal(walk.bodyPitch,0);assert(walk.phaseSpeed>10&&walk.phaseSpeed<=10.5);
const run=playerLocomotionPose({phase:Math.PI/2,speed:5.6,sprint:true});assert.equal(run.running,true);assert(Math.abs(run.leftLegPitch-1.05)<1e-9);assert(Math.abs(run.rightLegPitch+1.05)<1e-9);assert(Math.abs(run.leftArmPitch+.92)<1e-9);assert(Math.abs(run.rightArmPitch-.92)<1e-9);assert(Math.abs(run.bodyPitch+.20)<1e-9);assert.equal(run.phaseSpeed,13.5);assert(run.bobY>=0&&run.bobY<=.045);assert(Math.abs(run.leftLegPitch)>Math.abs(walk.leftLegPitch),'run must have a visibly larger stride than walk');
const half=playerLocomotionPose({phase:Math.PI/2,speed:2.15,sprint:false});assert(half.moving>.49&&half.moving<.51);assert(Math.abs(half.leftLegPitch-.31)<1e-9);
assert.throws(()=>playerLocomotionPose({phase:Number.NaN,speed:1}),/phase/);assert.throws(()=>playerLocomotionPose({phase:0,speed:Number.POSITIVE_INFINITY}),/speed/);
console.log('third-person walk + custom sprint gait rules: PASS');
