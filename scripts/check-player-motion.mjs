import assert from 'node:assert/strict';
import {
  PLAYER_MAX_STEP_DT,
  PLAYER_WALK_SPEED,
  PLAYER_SPRINT_SPEED,
  PLAYER_SNEAK_SPEED_FACTOR,
  PLAYER_FLIGHT_VERTICAL_SPEED,
  PLAYER_GRAVITY,
  PLAYER_JUMP_SPEED,
  PLAYER_GROUND_HORIZONTAL_DRAG,
  PLAYER_SWIM_HORIZONTAL_DRAG,
  planPlayerMotionStep,
  playerSprintActive
} from '../src/player-motion-rules.js';

const close=(actual,expected,epsilonOrLabel=1e-12,label='value')=>{
  const epsilon=typeof epsilonOrLabel==='number'?epsilonOrLabel:1e-12;if(typeof epsilonOrLabel==='string')label=epsilonOrLabel;
  assert.ok(Math.abs(actual-expected)<=epsilon,`${label}: expected ${expected}, got ${actual}`);
};
const base={yaw:0,control:{side:0,forward:1,jump:false,sneak:false,sprint:false,primary:false},velocity:{x:0,y:0,z:0},flying:false,swimCoverage:0,grounded:false};

assert.equal(PLAYER_MAX_STEP_DT,.05);assert.equal(PLAYER_WALK_SPEED,4.3);assert.equal(PLAYER_SPRINT_SPEED,5.6);assert.equal(PLAYER_SNEAK_SPEED_FACTOR,.35);assert.equal(PLAYER_FLIGHT_VERTICAL_SPEED,7);assert.equal(PLAYER_GRAVITY,24);assert.equal(PLAYER_JUMP_SPEED,8.2);assert.equal(PLAYER_GROUND_HORIZONTAL_DRAG,8);assert.equal(PLAYER_SWIM_HORIZONTAL_DRAG,5);

const dry=planPlayerMotionStep({...base,dt:.1});assert.equal(dry.dt,.05,'long frames are clamped to the existing 50ms physics step');close(dry.displacement.x,0);close(dry.displacement.z,-PLAYER_WALK_SPEED*.05);close(dry.velocity.y,-PLAYER_GRAVITY*.05);close(dry.displacement.y,-PLAYER_GRAVITY*.05*.05);close(dry.horizontalDrag,Math.exp(-PLAYER_GROUND_HORIZONTAL_DRAG*.05));assert.equal(dry.swimActive,false);assert.equal(dry.sprinting,false);

const turned=planPlayerMotionStep({...base,dt:.05,yaw:Math.PI/2});close(turned.displacement.x,-PLAYER_WALK_SPEED*.05,1e-12,'camera-relative +90deg W x');close(turned.displacement.z,0,1e-12,'camera-relative +90deg W z');
const strafe=planPlayerMotionStep({...base,dt:.05,yaw:Math.PI/2,control:{...base.control,forward:0,side:1}});close(strafe.displacement.x,0,1e-12,'camera-relative +90deg D x');close(strafe.displacement.z,-PLAYER_WALK_SPEED*.05,1e-12,'camera-relative +90deg D z');

const sprintControl={...base.control,sprint:true};const sprint=planPlayerMotionStep({...base,dt:.05,control:sprintControl});close(Math.hypot(sprint.displacement.x,sprint.displacement.z),PLAYER_SPRINT_SPEED*.05);assert.equal(sprint.sprinting,true);assert.equal(playerSprintActive(sprintControl),true);
const strafeSprintControl={...base.control,forward:0,side:1,sprint:true};const strafeSprint=planPlayerMotionStep({...base,dt:.05,control:strafeSprintControl});close(Math.hypot(strafeSprint.displacement.x,strafeSprint.displacement.z),PLAYER_WALK_SPEED*.05);assert.equal(strafeSprint.sprinting,false);assert.equal(playerSprintActive(strafeSprintControl),false,'Ctrl+A/D must remain walking motion');
const backwardSprintControl={...base.control,forward:-1,sprint:true};const backwardSprint=planPlayerMotionStep({...base,dt:.05,control:backwardSprintControl});close(Math.hypot(backwardSprint.displacement.x,backwardSprint.displacement.z),PLAYER_WALK_SPEED*.05);assert.equal(backwardSprint.sprinting,false);assert.equal(playerSprintActive(backwardSprintControl),false,'Ctrl+S must remain walking motion');
const sneakSprintControl={...base.control,sneak:true,sprint:true};assert.equal(playerSprintActive(sneakSprintControl),false,'sneaking must suppress sprint state');
const sneak=planPlayerMotionStep({...base,dt:.05,control:{...base.control,sneak:true}});close(Math.hypot(sneak.displacement.x,sneak.displacement.z),PLAYER_WALK_SPEED*PLAYER_SNEAK_SPEED_FACTOR*.05);
const diagonal=planPlayerMotionStep({...base,dt:.05,control:{...base.control,side:Math.SQRT1_2,forward:Math.SQRT1_2}});close(Math.hypot(diagonal.displacement.x,diagonal.displacement.z),PLAYER_WALK_SPEED*.05,1e-12,'normalized diagonal speed');

const jump=planPlayerMotionStep({...base,dt:.05,grounded:true,control:{...base.control,jump:true}});close(jump.velocity.y,PLAYER_JUMP_SPEED);close(jump.displacement.y,PLAYER_JUMP_SPEED*.05);
const airborneJump=planPlayerMotionStep({...base,dt:.05,grounded:false,control:{...base.control,jump:true}});close(airborneJump.velocity.y,-PLAYER_GRAVITY*.05,'airborne jump does not reset velocity');

const flight=planPlayerMotionStep({...base,dt:.05,flying:true,swimCoverage:0,control:{...base.control,jump:true,sprint:true}});assert.equal(flight.swimActive,false);assert.equal(flight.sprinting,true);close(flight.displacement.z,-PLAYER_SPRINT_SPEED*.05);close(flight.displacement.y,PLAYER_FLIGHT_VERTICAL_SPEED*.05);assert.deepEqual(flight.velocity,{x:0,y:0,z:0});assert.equal(flight.horizontalDrag,1);
const flightCancel=planPlayerMotionStep({...base,dt:.05,flying:true,control:{...base.control,jump:true,sneak:true}});close(flightCancel.displacement.y,0);

const swim=planPlayerMotionStep({...base,dt:.05,swimCoverage:1});assert.equal(swim.swimActive,true);assert.equal(swim.sprinting,false);close(Math.hypot(swim.displacement.x,swim.displacement.z),PLAYER_WALK_SPEED*.5*.05);close(swim.horizontalDrag,Math.exp(-PLAYER_SWIM_HORIZONTAL_DRAG*.05));assert.ok(swim.velocity.y>0,'full water coverage applies buoyancy');assert.equal(playerSprintActive({...base.control,sprint:true},{swimActive:true}),false);
const swimDown=planPlayerMotionStep({...base,dt:.05,swimCoverage:1,control:{...base.control,sneak:true}});assert.ok(swimDown.velocity.y<swim.velocity.y,'sneak becomes downward swim input rather than land sneak speed');close(Math.hypot(swimDown.displacement.x,swimDown.displacement.z),PLAYER_WALK_SPEED*.5*.05);

const knockback=planPlayerMotionStep({...base,dt:.05,velocity:{x:3,y:2,z:-1},control:{...base.control,forward:0}});close(knockback.displacement.x,3*.05);close(knockback.displacement.z,-1*.05);close(knockback.velocity.x,3);close(knockback.velocity.z,-1);close(knockback.velocity.y,2-PLAYER_GRAVITY*.05);

const zero=planPlayerMotionStep({...base,dt:0});assert.deepEqual(zero.displacement,{x:0,y:0,z:0});assert.deepEqual(zero.velocity,{x:0,y:0,z:0});
assert.throws(()=>planPlayerMotionStep({...base,dt:-.01}),/dt must be >= 0/);assert.throws(()=>planPlayerMotionStep({...base,dt:NaN}),/dt must be a finite number/);assert.throws(()=>planPlayerMotionStep({...base,dt:.05,yaw:Infinity}),/yaw must be a finite number/);assert.throws(()=>planPlayerMotionStep({...base,dt:.05,velocity:{x:0,y:'bad',z:0}}),/velocity.y/);assert.throws(()=>planPlayerMotionStep({...base,dt:.05,swimCoverage:1.1}),/between 0 and 1/);assert.throws(()=>planPlayerMotionStep({...base,dt:.05,flying:'yes'}),/flying must be boolean/);assert.throws(()=>playerSprintActive(base.control,{swimActive:'yes'}),/swimActive must be boolean/);

console.log('shared camera-relative player motion planning rules: PASS');
