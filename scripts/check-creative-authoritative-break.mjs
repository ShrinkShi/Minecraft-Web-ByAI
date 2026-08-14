import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {CreativeBlockBreakController} from '../server/creative-block-break-controller.mjs';

const key=(x,y,z)=>`${x},${y},${z}`;
const cells=new Map([[key(0,2,-2),BLOCK.STONE]]);let revision=0,mutations=[];
const world={getBlock(x,y,z){return cells.get(key(x,y,z))??BLOCK.AIR;}};
const setBlock=(x,y,z,id)=>{
  const cell=key(x,y,z),previous=world.getBlock(x,y,z);if(previous===id)return Object.freeze({changed:false,x,y,z,previous,id,revision});
  if(id===BLOCK.AIR)cells.delete(cell);else cells.set(cell,id);revision=(revision+1)>>>0;const change=Object.freeze({changed:true,x,y,z,previous,id,revision});mutations.push(change);return change;
};
const controller=new CreativeBlockBreakController({world,setBlock});
const session='s:creative-break';
const player={position:{x:.5,y:1,z:.5},yaw:0,pitch:0,mode:'creative'};

let result=controller.step(session,player);
assert.equal(result.attempted,false);assert.equal(result.reason,'no-pending-primary');assert.equal(mutations.length,0);

let observed=controller.observePrimary(session,true);
assert.equal(observed.queued,true);assert.equal(observed.reason,'primary-queued');assert.equal(controller.pendingCount(session),1);
result=controller.step(session,player);
assert.equal(result.attempted,true);assert.equal(result.reason,'broken');assert.deepEqual({x:result.target.x,y:result.target.y,z:result.target.z,id:result.target.id},{x:0,y:2,z:-2,id:BLOCK.STONE});assert.equal(result.breakResult.changed,true);assert.equal(world.getBlock(0,2,-2),BLOCK.AIR);assert.equal(mutations.length,1);assert.equal(controller.pendingCount(session),0);

observed=controller.observePrimary(session,true);assert.equal(observed.queued,false);assert.equal(observed.reason,'primary-held');
result=controller.step(session,player);assert.equal(result.reason,'no-pending-primary');assert.equal(mutations.length,1,'holding primary must not delete one block per 20 Hz server tick');

cells.set(key(0,2,-3),BLOCK.STONE);
controller.observePrimary(session,false);controller.observePrimary(session,true);controller.observePrimary(session,false);
assert.equal(controller.pendingCount(session),1,'a press+release entirely between server ticks must remain latched');
result=controller.step(session,player);assert.equal(result.reason,'broken');assert.equal(result.target.z,-3);assert.equal(mutations.length,2);

cells.set(key(0,2,-4),BLOCK.STONE);player.mode='survival';controller.observePrimary(session,true);
result=controller.step(session,player);assert.equal(result.attempted,false);assert.equal(result.reason,'mode-not-creative');assert.equal(mutations.length,2);
player.mode='creative';observed=controller.observePrimary(session,true);assert.equal(observed.reason,'primary-held');result=controller.step(session,player);assert.equal(result.reason,'no-pending-primary');assert.equal(mutations.length,2,'mode changes while held must not synthesize a fresh click');
controller.observePrimary(session,false);controller.observePrimary(session,true);result=controller.step(session,player);assert.equal(result.reason,'broken');assert.equal(result.target.z,-4);assert.equal(mutations.length,3);

controller.observePrimary(session,false);controller.observePrimary(session,true);assert.equal(controller.pendingCount(session),1);assert.equal(controller.remove(session),true);assert.equal(controller.pendingCount(session),0);cells.set(key(0,2,-5),BLOCK.STONE);result=controller.step(session,player);assert.equal(result.reason,'no-pending-primary');controller.observePrimary(session,true);result=controller.step(session,player);assert.equal(result.reason,'broken');assert.equal(result.target.z,-5);assert.equal(mutations.length,4,'removing a session must clear its latch and queued press');
controller.clear();

const bounded=new CreativeBlockBreakController({world,setBlock,pendingPrimaryPressLimit:2});
for(let i=0;i<2;i++){bounded.observePrimary('s:bounded',true);bounded.observePrimary('s:bounded',false);}assert.equal(bounded.pendingCount('s:bounded'),2);bounded.observePrimary('s:bounded',true);assert.equal(bounded.pendingCount('s:bounded'),2,'pending edge queue must stay bounded');

assert.throws(()=>controller.observePrimary(session,1),/must be a boolean/);
assert.throws(()=>new CreativeBlockBreakController({world,setBlock,maxDistance:0}),/maxDistance/);
assert.throws(()=>new CreativeBlockBreakController({world,setBlock,pendingPrimaryPressLimit:0}),/pendingPrimaryPressLimit/);

console.log('creative authoritative primary break edge latch: PASS');
