import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {raycastAuthoritativeBlock} from '../server/block-targeting.mjs';

let world={getBlock:(x,y,z)=>x===-1&&y===11&&z===-1?BLOCK.STONE:BLOCK.AIR};let hit=raycastAuthoritativeBlock(world,{position:{x:.5,y:10,z:.5},yaw:Math.PI/4,pitch:0});assert.deepEqual(hit.previous,{x:0,y:11,z:-1});assert.equal(Math.abs(hit.x-hit.previous.x)+Math.abs(hit.y-hit.previous.y)+Math.abs(hit.z-hit.previous.z),1);
world={getBlock:(x,y,z)=>y===11&&z===0?(x===-1?BLOCK.STONE:x===0?BLOCK.DIRT:BLOCK.AIR):BLOCK.AIR};hit=raycastAuthoritativeBlock(world,{position:{x:0,y:10,z:.5},yaw:Math.PI/2,pitch:0});assert.equal(hit.x,-1);hit=raycastAuthoritativeBlock(world,{position:{x:1e-12,y:10,z:.5},yaw:Math.PI/2,pitch:0});assert.equal(hit.x,0);
world={getBlock:(x,y,z)=>{assert.ok(y>=0&&y<64);return x===0&&y===63&&z===0?BLOCK.STONE:BLOCK.AIR;}};hit=raycastAuthoritativeBlock(world,{position:{x:.5,y:63.5,z:.5},yaw:0,pitch:-1.553});assert.equal(hit?.y,63);
console.log('authoritative block targeting boundaries: PASS');
