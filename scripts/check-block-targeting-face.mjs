import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {raycastAuthoritativeBlock} from '../server/block-targeting.mjs';
const world={getBlock:(x,y,z)=>x===-1&&y===11&&z===-1?BLOCK.STONE:BLOCK.AIR};
const hit=raycastAuthoritativeBlock(world,{position:{x:.5,y:10,z:.5},yaw:Math.PI/4,pitch:0});
assert.deepEqual(hit.previous,{x:0,y:11,z:-1});
assert.equal(Math.abs(hit.x-hit.previous.x)+Math.abs(hit.y-hit.previous.y)+Math.abs(hit.z-hit.previous.z),1);
console.log('authoritative block target face adjacency: PASS');
