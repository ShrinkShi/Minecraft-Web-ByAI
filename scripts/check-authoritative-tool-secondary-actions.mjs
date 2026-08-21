import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';
import {SurvivalBlockUseController} from '../server/survival-block-use-controller.mjs';

const key=(x,y,z)=>`${x},${y},${z}`,cells=new Map(),world={getBlock(x,y,z){return cells.get(key(x,y,z))??BLOCK.AIR;}};const changes=[];const setBlock=(x,y,z,id)=>{const previous=world.getBlock(x,y,z);if(previous===id)return{changed:false,x,y,z,previous,id};cells.set(key(x,y,z),id);const change={changed:true,x,y,z,previous,id};changes.push(change);return change;};
const session='s:tool-use',inventories=new ServerPlayerInventoryHub();inventories.join(session,{mode:'survival'});for(const id of ['iron_hoe','iron_axe','iron_shovel'])assert.equal(inventories.addPickup(session,id,1),0);const events=[],controller=new SurvivalBlockUseController({world,setBlock,inventories,onInventoryChanged:(s,snapshot)=>events.push({s,snapshot})}),player={mode:'survival',position:{x:.5,y:1,z:.5}},use=slot=>({kind:'use',selectedSlot:slot,view:{yaw:0,pitch:0}});
const slotFor=id=>inventories.snapshot(session).slots.findIndex(stack=>stack?.id===id)-HOTBAR_START,stackFor=id=>inventories.snapshot(session).slots.find(stack=>stack?.id===id);

cells.set(key(0,2,-2),BLOCK.GRASS);let [result]=controller.step(session,player,[use(slotFor('iron_hoe'))]);assert.equal(result.reason,'till');assert.equal(world.getBlock(0,2,-2),BLOCK.FARMLAND);assert.equal(stackFor('iron_hoe').damage,1);assert.equal(result.wear.changed,true);const afterTillRevision=inventories.snapshot(session).revision;

cells.set(key(0,2,-2),BLOCK.DIRT);cells.set(key(0,3,-2),BLOCK.STONE);[result]=controller.step(session,player,[use(slotFor('iron_hoe'))]);assert.equal(result.reason,'item-not-placeable');assert.equal(world.getBlock(0,2,-2),BLOCK.DIRT);assert.equal(stackFor('iron_hoe').damage,1);assert.equal(inventories.snapshot(session).revision,afterTillRevision,'blocked tilling must not wear the hoe');cells.delete(key(0,3,-2));

cells.set(key(0,2,-2),BLOCK.LOG);[result]=controller.step(session,player,[use(slotFor('iron_axe'))]);assert.equal(result.reason,'strip');assert.equal(world.getBlock(0,2,-2),BLOCK.STRIPPED_OAK_LOG);assert.equal(stackFor('iron_axe').damage,1);

cells.set(key(0,2,-2),BLOCK.DIRT);[result]=controller.step(session,player,[use(slotFor('iron_shovel'))]);assert.equal(result.reason,'flatten');assert.equal(world.getBlock(0,2,-2),BLOCK.DIRT_PATH);assert.equal(stackFor('iron_shovel').damage,1);
assert.equal(changes.filter(change=>[BLOCK.FARMLAND,BLOCK.STRIPPED_OAK_LOG,BLOCK.DIRT_PATH].includes(change.id)).length,3);assert.equal(events.length,3,'only successful tool mutations publish inventory revisions');
console.log('authoritative hoe till + axe strip + shovel flatten mutations and success-only durability: PASS');
