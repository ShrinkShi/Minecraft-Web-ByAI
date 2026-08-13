import assert from 'node:assert/strict';
import {
  PLAYER_COLLISION_RADIUS,
  PLAYER_COLLISION_HEIGHT,
  PLAYER_EYE_HEIGHT,
  PLAYER_COLLISION_EPSILON,
  PLAYER_GROUND_PROBE_DISTANCE,
  PLAYER_WATER_SAMPLE_OFFSETS,
  PLAYER_MOVE_AXES,
  playerBlockBounds,
  playerCollidesBlocks,
  resolvePlayerAxisMove,
  probePlayerGrounded,
  samplePlayerWaterCoverage
} from '../src/player-environment-rules.js';

assert.equal(PLAYER_COLLISION_RADIUS,.3);assert.equal(PLAYER_COLLISION_HEIGHT,1.8);assert.equal(PLAYER_EYE_HEIGHT,1.62);assert.equal(PLAYER_COLLISION_EPSILON,.001);assert.equal(PLAYER_GROUND_PROBE_DISTANCE,.06);assert.deepEqual(PLAYER_WATER_SAMPLE_OFFSETS,[.2,.9,1.62]);assert.deepEqual(PLAYER_MOVE_AXES,['x','y','z']);

const standing={x:.5,y:1.001,z:.5};
assert.deepEqual(playerBlockBounds(standing),{minX:0,maxX:0,minY:1,maxY:2,minZ:0,maxZ:0},'default player AABB spans one horizontal column and two vertical blocks');
assert.deepEqual(playerBlockBounds({x:1.01,y:2.25,z:-.2},{radius:.4,height:1.5,epsilon:.01}),{minX:0,maxX:1,minY:2,maxY:3,minZ:-1,maxZ:0});

const solids=new Set(['0,1,0','1,2,0']);const solid=(x,y,z)=>solids.has(`${x},${y},${z}`);
assert.equal(playerCollidesBlocks(standing,solid),true,'body intersects a solid block in its AABB');
assert.equal(playerCollidesBlocks({x:2.5,y:1.001,z:2.5},solid),false);
const visited=[];playerCollidesBlocks(standing,(x,y,z)=>(visited.push([x,y,z]),false));assert.deepEqual(visited,[[0,1,0],[0,2,0]],'collision scan preserves the existing integer block range');

const initial={position:{x:.5,y:1,z:.5},velocity:{x:2,y:-3,z:4},grounded:false};
const freeX=resolvePlayerAxisMove({...initial,axis:'x',amount:.1,collides:()=>false});assert.deepEqual(freeX,{position:{x:.6,y:1,z:.5},velocity:{x:2,y:-3,z:4},grounded:false,moved:true,blocked:false});
const blockedX=resolvePlayerAxisMove({...initial,axis:'x',amount:.4,collides:position=>position.x>.7});assert.deepEqual(blockedX,{position:{x:.5,y:1,z:.5},velocity:{x:0,y:-3,z:4},grounded:false,moved:false,blocked:true},'horizontal collision keeps position and clears only that velocity axis');
const blockedDown=resolvePlayerAxisMove({...initial,axis:'y',amount:-.2,collides:()=>true});assert.deepEqual(blockedDown,{position:{x:.5,y:1,z:.5},velocity:{x:2,y:0,z:4},grounded:true,moved:false,blocked:true},'downward Y collision sets grounded and clears vertical velocity');
const blockedUp=resolvePlayerAxisMove({...initial,axis:'y',amount:.2,collides:()=>true});assert.equal(blockedUp.grounded,false,'ceiling collision does not mark grounded');assert.equal(blockedUp.velocity.y,0);
const zero=resolvePlayerAxisMove({...initial,axis:'z',amount:0,collides:()=>{throw new Error('zero move must not query collision');}});assert.deepEqual(zero,{position:initial.position,velocity:initial.velocity,grounded:false,moved:false,blocked:false});
initial.position.x=99;initial.velocity.x=99;assert.equal(freeX.position.x,.6,'axis result owns cloned position state');assert.equal(freeX.velocity.x,2,'axis result owns cloned velocity state');

assert.equal(probePlayerGrounded({x:.5,y:1.001,z:.5},position=>position.y<1),true);assert.equal(probePlayerGrounded({x:.5,y:1.2,z:.5},position=>position.y<1),false);
let probed=null;probePlayerGrounded({x:2,y:3,z:4},position=>(probed=position,false));assert.deepEqual(probed,{x:2,y:3-PLAYER_GROUND_PROBE_DISTANCE,z:4});

const waterCalls=[];const oneThird=samplePlayerWaterCoverage({x:5.8,y:10.2,z:-2.2},(x,y,z)=>(waterCalls.push([x,y,z]),y===10));assert.equal(oneThird,1/3);assert.deepEqual(waterCalls,[[5,10,-3],[5,11,-3],[5,11,-3]],'water sampling uses the current column and legacy foot/body/eye heights');
const twoThirds=samplePlayerWaterCoverage({x:5.8,y:10.2,z:-2.2},(_x,y)=>y===11);assert.equal(twoThirds,2/3);assert.equal(samplePlayerWaterCoverage({x:0,y:0,z:0},()=>true),1);assert.equal(samplePlayerWaterCoverage({x:0,y:0,z:0},()=>false),0);

assert.throws(()=>playerBlockBounds({x:0,y:0,z:0},{radius:0}),/radius must be > 0/);assert.throws(()=>playerBlockBounds({x:0,y:0,z:0},{epsilon:.3}),/epsilon must be smaller/);assert.throws(()=>playerCollidesBlocks({x:0,y:0,z:0},null),/isSolidBlock must be a function/);assert.throws(()=>resolvePlayerAxisMove({...initial,axis:'q',amount:1,collides:()=>false}),/axis must be x, y or z/);assert.throws(()=>resolvePlayerAxisMove({...initial,axis:'x',amount:NaN,collides:()=>false}),/amount must be a finite number/);assert.throws(()=>probePlayerGrounded({x:0,y:0,z:0},()=>false,0),/distance must be > 0/);assert.throws(()=>samplePlayerWaterCoverage({x:0,y:0,z:0},()=>false,{eyeHeight:0}),/eyeHeight must be > 0/);

console.log('shared player AABB collision + grounded + water environment rules: PASS');
