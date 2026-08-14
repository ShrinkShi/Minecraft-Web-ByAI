import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {CreativeBlockUseController} from '../server/creative-block-use-controller.mjs';

const key=(x,y,z)=>`${x},${y},${z}`;
const cells=new Map();let mutations=0;
const world={getBlock(x,y,z){return cells.get(key(x,y,z))??BLOCK.AIR;}};
const setBlock=(x,y,z,id)=>{const cell=key(x,y,z),previous=world.getBlock(x,y,z);if(previous===id)return{changed:false,x,y,z,previous,id};if(id===BLOCK.AIR)cells.delete(cell);else cells.set(cell,id);mutations++;return{changed:true,x,y,z,previous,id};};
const inventories={selectedStack(){return{id:'block:2',count:64};}};
const controller=new CreativeBlockUseController({world,setBlock,inventories});
const player={position:{x:.5,y:1,z:.5},yaw:0,pitch:0,mode:'creative'};
const use=[{kind:'use',selectedSlot:1,view:{yaw:0,pitch:0}}];

cells.set(key(0,2,-2),BLOCK.CRAFTING_TABLE);let result=controller.step('s:interactive',player,use)[0];assert.equal(result.reason,'interactive-target-unsupported');assert.equal(result.attempted,false);assert.equal(world.getBlock(0,2,-1),BLOCK.AIR);assert.equal(mutations,0,'right-clicking a workbench must not silently degrade into adjacent placement while workbench use is unsupported');

cells.set(key(0,2,-2),BLOCK.BED_NORTH_FOOT);result=controller.step('s:interactive',player,use)[0];assert.equal(result.reason,'interactive-target-unsupported');assert.equal(world.getBlock(0,2,-1),BLOCK.AIR);assert.equal(mutations,0,'right-clicking a bed must not place a block until bed use semantics are authoritative');

cells.set(key(0,2,-2),BLOCK.STONE);result=controller.step('s:interactive',player,use)[0];assert.equal(result.reason,'placed');assert.equal(world.getBlock(0,2,-1),BLOCK.DIRT);assert.equal(mutations,1,'ordinary anchors remain placeable');
console.log('unsupported interactive target use guard: PASS');
