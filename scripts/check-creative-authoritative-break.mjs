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
const input=primary=>({session,control:{primary}});

let result=controller.step(session,player,input(false));
assert.equal(result.attempted,false);assert.equal(result.reason,'primary-idle');assert.equal(mutations.length,0);

result=controller.step(session,player,input(true));
assert.equal(result.attempted,true);assert.equal(result.reason,'broken');assert.deepEqual({x:result.target.x,y:result.target.y,z:result.target.z,id:result.target.id},{x:0,y:2,z:-2,id:BLOCK.STONE});assert.equal(result.breakResult.changed,true);assert.equal(world.getBlock(0,2,-2),BLOCK.AIR);assert.equal(mutations.length,1);

result=controller.step(session,player,input(true));
assert.equal(result.attempted,false);assert.equal(result.reason,'primary-held');assert.equal(mutations.length,1,'holding primary must not delete one block per 20 Hz server tick');

cells.set(key(0,2,-3),BLOCK.STONE);
result=controller.step(session,player,input(false));assert.equal(result.reason,'primary-released');
result=controller.step(session,player,input(true));assert.equal(result.reason,'broken');assert.equal(result.target.z,-3);assert.equal(mutations.length,2);

controller.step(session,player,input(false));cells.set(key(0,2,-4),BLOCK.STONE);player.mode='survival';
result=controller.step(session,player,input(true));assert.equal(result.attempted,false);assert.equal(result.reason,'mode-not-creative');assert.equal(mutations.length,2);
player.mode='creative';result=controller.step(session,player,input(true));assert.equal(result.reason,'primary-held');assert.equal(mutations.length,2,'mode changes while held must not synthesize a fresh click');
controller.step(session,player,input(false));result=controller.step(session,player,input(true));assert.equal(result.reason,'broken');assert.equal(result.target.z,-4);assert.equal(mutations.length,3);

controller.remove(session);cells.set(key(0,2,-5),BLOCK.STONE);result=controller.step(session,player,input(true));assert.equal(result.reason,'broken');assert.equal(result.target.z,-5);assert.equal(mutations.length,4,'removing a session must clear its primary latch');
controller.clear();

assert.throws(()=>controller.step(session,player,{session:'s:other',control:{primary:true}}),/does not match/);
assert.throws(()=>controller.step(session,player,{session,control:{primary:1}}),/must be a boolean/);
assert.throws(()=>new CreativeBlockBreakController({world,setBlock,maxDistance:0}),/maxDistance/);

console.log('creative authoritative primary break: PASS');
