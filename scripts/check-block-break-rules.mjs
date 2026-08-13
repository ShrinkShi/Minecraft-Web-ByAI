import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {applyAuthoritativeBlockBreak} from '../server/block-break-rules.mjs';

const key=(x,y,z)=>`${x},${y},${z}`;
function fixture(entries=[]){
  const blocks=new Map(entries.map(([x,y,z,id])=>[key(x,y,z),id])),calls=[];let revision=0;
  const world={getBlock:(x,y,z)=>blocks.get(key(x,y,z))??BLOCK.AIR};
  const setBlock=(x,y,z,id)=>{const previous=world.getBlock(x,y,z);if(previous===id)return{changed:false,revision,x,y,z,previous,id};blocks.set(key(x,y,z),id);revision++;const change={changed:true,revision,x,y,z,previous,id};calls.push(change);return change;};
  return{world,setBlock,calls};
}

let f=fixture([[1,10,1,BLOCK.STONE]]),result=applyAuthoritativeBlockBreak(f.world,{x:1,y:10,z:1,id:BLOCK.STONE},{setBlock:f.setBlock});assert.equal(result.changed,true);assert.equal(result.reason,'broken');assert.equal(result.changes.length,1);assert.equal(f.world.getBlock(1,10,1),BLOCK.AIR);
f=fixture([[0,10,0,BLOCK.BED_NORTH_FOOT],[0,10,-1,BLOCK.BED_NORTH_HEAD]]);result=applyAuthoritativeBlockBreak(f.world,{x:0,y:10,z:0,id:BLOCK.BED_NORTH_FOOT},{setBlock:f.setBlock});assert.equal(result.changes.length,2);assert.equal(f.world.getBlock(0,10,0),BLOCK.AIR);assert.equal(f.world.getBlock(0,10,-1),BLOCK.AIR);
f=fixture([[0,10,0,BLOCK.BED_NORTH_FOOT],[0,10,-1,BLOCK.STONE]]);result=applyAuthoritativeBlockBreak(f.world,{x:0,y:10,z:0,id:BLOCK.BED_NORTH_FOOT},{setBlock:f.setBlock});assert.equal(result.changes.length,1);assert.equal(f.world.getBlock(0,10,-1),BLOCK.STONE);
f=fixture([[0,10,0,BLOCK.BED_NORTH_FOOT],[0,10,-1,BLOCK.BED_NORTH_HEAD]]);result=applyAuthoritativeBlockBreak(f.world,{x:0,y:10,z:0,id:BLOCK.BED_NORTH_FOOT},{setBlock:()=>({changed:false})});assert.equal(result.reason,'mutation-declined');assert.equal(result.changes.length,0);assert.equal(f.world.getBlock(0,10,0),BLOCK.BED_NORTH_FOOT);assert.equal(f.world.getBlock(0,10,-1),BLOCK.BED_NORTH_HEAD);
f=fixture([[2,10,2,BLOCK.STONE]]);result=applyAuthoritativeBlockBreak(f.world,{x:2,y:10,z:2,id:BLOCK.DIRT},{setBlock:f.setBlock});assert.equal(result.reason,'stale-target');assert.equal(f.calls.length,0);
f=fixture([[3,10,3,BLOCK.WATER]]);result=applyAuthoritativeBlockBreak(f.world,{x:3,y:10,z:3,id:BLOCK.WATER},{setBlock:f.setBlock});assert.equal(result.reason,'not-breakable');assert.equal(f.calls.length,0);
assert.throws(()=>applyAuthoritativeBlockBreak(f.world,{x:3,y:10,z:3,id:BLOCK.WATER}),/explicit setBlock mutation boundary/);assert.throws(()=>applyAuthoritativeBlockBreak(f.world,{x:0,y:10,z:0,id:999},{setBlock:f.setBlock}),/known block/);assert.throws(()=>applyAuthoritativeBlockBreak(f.world,{x:0,y:-1,z:0,id:BLOCK.STONE},{setBlock:f.setBlock}),/target.y must be from 0 to 63/);assert.throws(()=>applyAuthoritativeBlockBreak(f.world,{x:0,y:64,z:0,id:BLOCK.STONE},{setBlock:f.setBlock}),/target.y must be from 0 to 63/);
console.log('authoritative block break mutation rules: PASS');
