import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {raycastAuthoritativeBlock} from '../server/block-targeting.mjs';

const blocks=new Map(),key=(x,y,z)=>`${x},${y},${z}`,world={getBlock:(x,y,z)=>blocks.get(key(x,y,z))??BLOCK.AIR};
const player={position:{x:.5,y:10,z:.5},yaw:0,pitch:0};
blocks.set(key(0,11,-1),BLOCK.WATER);blocks.set(key(0,11,-3),BLOCK.STONE);
let hit=raycastAuthoritativeBlock(world,player);assert.deepEqual({x:hit.x,y:hit.y,z:hit.z,id:hit.id,previous:hit.previous},{x:0,y:11,z:-3,id:BLOCK.STONE,previous:{x:0,y:11,z:-2}});assert.ok(Math.abs(hit.distance-2.5)<1e-9);

blocks.clear();blocks.set(key(-2,11,0),BLOCK.DIRT);hit=raycastAuthoritativeBlock(world,{...player,yaw:Math.PI/2});assert.equal(hit.x,-2);assert.equal(hit.z,0);assert.deepEqual(hit.previous,{x:-1,y:11,z:0});
blocks.clear();blocks.set(key(0,11,-7),BLOCK.STONE);assert.equal(raycastAuthoritativeBlock(world,player),null,'targets beyond reach are rejected');
assert.equal(raycastAuthoritativeBlock(world,{position:{x:.5,y:63,z:.5},yaw:0,pitch:0}),null,'eye outside editable world height cannot target virtual blocks');
assert.throws(()=>raycastAuthoritativeBlock(world,player,{maxDistance:0}),/greater than 0/);
console.log('authoritative voxel targeting: PASS');
