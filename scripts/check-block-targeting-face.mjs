import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {raycastAuthoritativeBlock} from '../server/block-targeting.mjs';

const diagonal={getBlock:(x,y,z)=>x===-1&&y===11&&z===-1?BLOCK.STONE:BLOCK.AIR};
let hit=raycastAuthoritativeBlock(diagonal,{position:{x:.5,y:10,z:.5},yaw:Math.PI/4,pitch:0});
assert.deepEqual(hit.previous,{x:0,y:11,z:-1});
assert.equal(Math.abs(hit.x-hit.previous.x)+Math.abs(hit.y-hit.previous.y)+Math.abs(hit.z-hit.previous.z),1);

const boundary={getBlock:(x,y,z)=>y===11&&z===0?(x===-1?BLOCK.STONE:x===0?BLOCK.DIRT:BLOCK.AIR):BLOCK.AIR};
hit=raycastAuthoritativeBlock(boundary,{position:{x:0,y:10,z:.5},yaw:Math.PI/2,pitch:0});
assert.deepEqual({x:hit.x,y:hit.y,z:hit.z,id:hit.id},{x:-1,y:11,z:0,id:BLOCK.STONE});
assert.equal(hit.distance,0);
console.log('authoritative block target face/boundary rules: PASS');
