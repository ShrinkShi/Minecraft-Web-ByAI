import assert from 'node:assert/strict';
import {horizontalMoveFromYaw,lookDirectionFromYawPitch} from '../src/player-orientation-rules.js';

const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-12,`${label}: expected ${expected}, got ${actual}`);
const expectHorizontal=(yaw,input,expected,label)=>{const value=horizontalMoveFromYaw(yaw,input);near(value.x,expected.x,`${label} x`);near(value.z,expected.z,`${label} z`);};

expectHorizontal(0,{forward:1,side:0},{x:0,z:-1},'yaw 0 W follows camera -Z');
expectHorizontal(0,{forward:-1,side:0},{x:0,z:1},'yaw 0 S opposes camera');
expectHorizontal(0,{forward:0,side:1},{x:1,z:0},'yaw 0 D is camera-right +X');
expectHorizontal(0,{forward:0,side:-1},{x:-1,z:0},'yaw 0 A is camera-left -X');

expectHorizontal(Math.PI/2,{forward:1,side:0},{x:-1,z:0},'positive quarter-turn W follows Three camera -X');
expectHorizontal(Math.PI/2,{forward:0,side:1},{x:0,z:-1},'positive quarter-turn D follows Three camera right -Z');
expectHorizontal(-Math.PI/2,{forward:1,side:0},{x:1,z:0},'negative quarter-turn W follows Three camera +X');
expectHorizontal(-Math.PI/2,{forward:0,side:1},{x:0,z:1},'negative quarter-turn D follows Three camera right +Z');
expectHorizontal(Math.PI,{forward:1,side:0},{x:0,z:1},'half-turn W follows camera +Z');

for(const yaw of [0,.31,-1.17,Math.PI/2,-Math.PI/2,Math.PI]){
  const move=horizontalMoveFromYaw(yaw,{forward:1,side:0}),look=lookDirectionFromYawPitch(yaw,0);
  near(move.x,look.x,`W and raycast horizontal X align at yaw ${yaw}`);
  near(move.z,look.z,`W and raycast horizontal Z align at yaw ${yaw}`);
  near(Math.hypot(move.x,move.z),1,`W horizontal length at yaw ${yaw}`);
  near(Math.hypot(look.x,look.y,look.z),1,`look vector length at yaw ${yaw}`);
}

const up=lookDirectionFromYawPitch(Math.PI/2,.4);assert.ok(up.y>0,'positive pitch looks upward');assert.ok(up.x<0,'positive yaw still points toward Three camera -X');
assert.throws(()=>horizontalMoveFromYaw(NaN,{forward:1}),/yaw must be a finite number/);
assert.throws(()=>horizontalMoveFromYaw(0,{forward:'1'}),/forward must be a finite number/);
assert.throws(()=>lookDirectionFromYawPitch(0,Infinity),/pitch must be a finite number/);

console.log('camera-relative WASD + raycast orientation rules: PASS');
