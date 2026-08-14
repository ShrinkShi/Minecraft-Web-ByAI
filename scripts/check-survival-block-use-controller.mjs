import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';
import {SurvivalBlockUseController} from '../server/survival-block-use-controller.mjs';

const cells=new Map(),key=(x,y,z)=>`${x},${y},${z}`;cells.set(key(0,2,-2),BLOCK.STONE);
const world={getBlock(x,y,z){return cells.get(key(x,y,z))??BLOCK.AIR;}};const changes=[];
const setBlock=(x,y,z,id)=>{const k=key(x,y,z),previous=world.getBlock(x,y,z);if(previous===id)return{changed:false,x,y,z,previous,id};cells.set(k,id);const result={changed:true,x,y,z,previous,id};changes.push(result);return result;};
const inventories=new ServerPlayerInventoryHub();inventories.join('s:survival-use',{mode:'survival'});assert.equal(inventories.addPickup('s:survival-use','block:2',2),0);assert.equal(inventories.snapshot('s:survival-use').revision,1);const inventoryEvents=[];
const controller=new SurvivalBlockUseController({world,setBlock,inventories,onInventoryChanged:(session,snapshot)=>inventoryEvents.push({session,snapshot})});const player={mode:'survival',position:{x:.5,y:1,z:.5}};const use={kind:'use',selectedSlot:0,view:{yaw:0,pitch:0}};
const [placed]=controller.step('s:survival-use',player,[use]);assert.equal(placed.reason,'placed');assert.equal(placed.placement.changed,true);assert.deepEqual(placed.consumed,{id:'block:2',count:1});assert.equal(world.getBlock(0,2,-1),BLOCK.DIRT);assert.equal(inventories.snapshot('s:survival-use').revision,2);assert.deepEqual(inventories.snapshot('s:survival-use').slots[HOTBAR_START],{id:'block:2',count:1});assert.equal(inventoryEvents.length,1);assert.equal(inventoryEvents[0].snapshot.revision,2);
const [blocked]=controller.step('s:survival-use',player,[use]);assert.equal(blocked.reason,'player-collision');assert.equal(blocked.consumed,null);assert.equal(inventories.snapshot('s:survival-use').revision,2,'failed placement must not advance Inventory revision');assert.deepEqual(inventories.snapshot('s:survival-use').slots[HOTBAR_START],{id:'block:2',count:1});assert.equal(inventoryEvents.length,1,'failed placement must not publish an Inventory mutation');
const [wrongMode]=controller.step('s:survival-use',{...player,mode:'creative'},[use]);assert.equal(wrongMode.reason,'mode-not-survival');assert.equal(inventories.snapshot('s:survival-use').revision,2);
inventories.addPickup('s:survival-use','stick',1);const stickSlot=inventories.snapshot('s:survival-use').slots.findIndex(stack=>stack?.id==='stick');assert.ok(stickSlot>=HOTBAR_START);const [notPlaceable]=controller.step('s:survival-use',player,[{...use,selectedSlot:stickSlot-HOTBAR_START}]);assert.equal(notPlaceable.reason,'item-not-placeable');
assert.equal(changes.length,1,'only the successful authoritative placement mutates world state');
console.log('survival use controller: successful placement consumes exactly one, failures consume nothing: PASS');
