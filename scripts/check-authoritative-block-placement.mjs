import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {applyAuthoritativeBlockPlacement} from '../server/block-placement-rules.mjs';
import {CreativeBlockUseController} from '../server/creative-block-use-controller.mjs';

const key=(x,y,z)=>`${x},${y},${z}`;
const cells=new Map([[key(0,2,-2),BLOCK.STONE]]);let revision=0,mutations=[];
const world={getBlock(x,y,z){return cells.get(key(x,y,z))??BLOCK.AIR;}};
const setBlock=(x,y,z,id)=>{const cell=key(x,y,z),previous=world.getBlock(x,y,z);if(previous===id)return Object.freeze({changed:false,x,y,z,previous,id,revision});if(id===BLOCK.AIR)cells.delete(cell);else cells.set(cell,id);revision=(revision+1)>>>0;const change=Object.freeze({changed:true,x,y,z,previous,id,revision});mutations.push(change);return change;};
const player={position:{x:.5,y:1,z:.5},yaw:0,pitch:0,mode:'creative'};
const target={x:0,y:2,z:-2,id:BLOCK.STONE,previous:{x:0,y:2,z:-1},distance:2};

let result=applyAuthoritativeBlockPlacement(world,target,{blockId:BLOCK.DIRT,player,setBlock});
assert.equal(result.changed,true);assert.equal(result.reason,'placed');assert.equal(world.getBlock(0,2,-1),BLOCK.DIRT);assert.equal(mutations.length,1);
result=applyAuthoritativeBlockPlacement(world,target,{blockId:BLOCK.DIRT,player,setBlock});assert.equal(result.changed,false);assert.equal(result.reason,'placement-cell-occupied');
result=applyAuthoritativeBlockPlacement(world,{...target,id:BLOCK.DIRT},{blockId:BLOCK.GRASS,player,setBlock});assert.equal(result.reason,'stale-target');
result=applyAuthoritativeBlockPlacement(world,{x:0,y:0,z:0,id:BLOCK.STONE,previous:{x:0,y:1,z:0}},{blockId:BLOCK.GRASS,player,setBlock});assert.equal(result.reason,'stale-target');
cells.set(key(0,0,0),BLOCK.STONE);result=applyAuthoritativeBlockPlacement(world,{x:0,y:0,z:0,id:BLOCK.STONE,previous:{x:0,y:1,z:0}},{blockId:BLOCK.GRASS,player,setBlock});assert.equal(result.reason,'player-collision');
assert.throws(()=>applyAuthoritativeBlockPlacement(world,target,{blockId:BLOCK.AIR,player,setBlock:null}),/setBlock/);

cells.delete(key(0,2,-1));const inventories={selectedStack(session,slot){assert.equal(session,'s:creative-use');return slot===1?{id:'block:3',count:64}:slot===8?{id:'wooden_pickaxe',count:1}:null;}};
const controller=new CreativeBlockUseController({world,setBlock,inventories});
let outcomes=controller.step('s:creative-use',player,[{kind:'use',selectedSlot:1,view:{yaw:0,pitch:0}}]);assert.equal(outcomes.length,1);assert.equal(outcomes[0].reason,'placed');assert.equal(outcomes[0].itemId,'block:3');assert.equal(world.getBlock(0,2,-1),BLOCK.STONE);
cells.delete(key(0,2,-1));outcomes=controller.step('s:creative-use',player,[{kind:'use',selectedSlot:8,view:{yaw:0,pitch:0}}]);assert.equal(outcomes[0].reason,'item-not-placeable');assert.equal(world.getBlock(0,2,-1),BLOCK.AIR);
player.mode='survival';outcomes=controller.step('s:creative-use',player,[{kind:'use',selectedSlot:1,view:{yaw:0,pitch:0}}]);assert.equal(outcomes[0].reason,'mode-not-creative');assert.equal(world.getBlock(0,2,-1),BLOCK.AIR);player.mode='creative';
outcomes=controller.step('s:creative-use',player,[{kind:'drop',selectedSlot:1,view:{yaw:0,pitch:0}}]);assert.equal(outcomes[0].reason,'unsupported-action');
console.log('authoritative creative block placement rules/controller: PASS');
