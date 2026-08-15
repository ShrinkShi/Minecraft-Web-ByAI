import assert from 'node:assert/strict';
import {ServerPlayerInventoryState} from '../server/player-inventory-state.mjs';
import {ServerPlayerCraftingState} from '../server/player-crafting-state.mjs';

const session='s:craft-state',inventory=new ServerPlayerInventoryState(session,{mode:'survival'}),crafting=new ServerPlayerCraftingState(session);
assert.deepEqual(crafting.snapshot(),{session,revision:0,size:2,slots:[null,null,null,null],result:null});

assert.equal(inventory.add('block:6',3),0);assert.equal(inventory.revision,1);assert.deepEqual(inventory.slots[0],{id:'block:6',count:3});
let pick=inventory.click(0,0,false);assert.equal(pick.changed,true);assert.equal(inventory.revision,2);assert.deepEqual(inventory.cursor,{id:'block:6',count:3});
let input=crafting.clickInput(inventory,0,2,false);assert.equal(input.changed,true);assert.equal(input.reason,'placed-one');assert.equal(inventory.revision,3);assert.equal(crafting.revision,1);assert.deepEqual(inventory.cursor,{id:'block:6',count:2});assert.deepEqual(crafting.slots[0],{id:'block:6',count:1});assert.deepEqual(crafting.result(),{id:'block:5',count:4});

let take=crafting.takeResult(inventory,{shift:false});assert.equal(take.changed,false);assert.equal(take.reason,'result-blocked');assert.equal(inventory.revision,3);assert.equal(crafting.revision,1);
let close=crafting.close(inventory);assert.equal(close.changed,true);assert.equal(close.reason,'closed-returned');assert.equal(inventory.revision,4);assert.equal(crafting.revision,2);assert.equal(inventory.cursor,null);assert.equal(crafting.slots.every(slot=>slot===null),true);

pick=inventory.click(0,0,false);assert.equal(pick.changed,true);assert.equal(inventory.revision,5);assert.deepEqual(inventory.cursor,{id:'block:6',count:3});
input=crafting.clickInput(inventory,0,0,false);assert.equal(input.changed,true);assert.equal(inventory.revision,6);assert.equal(crafting.revision,3);assert.equal(inventory.cursor,null);assert.deepEqual(crafting.slots[0],{id:'block:6',count:3});
take=crafting.takeResult(inventory,{shift:true});assert.equal(take.changed,true);assert.equal(take.reason,'shift-crafted');assert.equal(take.crafted,12);assert.equal(inventory.revision,7);assert.equal(crafting.revision,4);assert.equal(crafting.slots[0],null);assert.equal(crafting.result(),null);assert.equal(inventory.slots.some(slot=>slot?.id==='block:5'&&slot.count===12),true);

inventory.setMode('spectator');const beforeInventory=inventory.snapshot(),beforeCrafting=crafting.snapshot();const denied=crafting.clickInput(inventory,0,0,false);assert.equal(denied.changed,false);assert.equal(denied.reason,'spectator-read-only');assert.deepEqual(inventory.snapshot(),beforeInventory);assert.deepEqual(crafting.snapshot(),beforeCrafting);

const fullInventory=new ServerPlayerInventoryState('s:craft-full',{mode:'survival'}),blockedCrafting=new ServerPlayerCraftingState('s:craft-full');assert.equal(fullInventory.add('block:6',1),0);fullInventory.click(0,0,false);blockedCrafting.clickInput(fullInventory,0,0,false);assert.equal(fullInventory.cursor,null);assert.equal(fullInventory.add('block:1',36*64),0);const fullInventoryRevision=fullInventory.revision,blockedCraftingRevision=blockedCrafting.revision,blockedClose=blockedCrafting.close(fullInventory);assert.equal(blockedClose.changed,false);assert.equal(blockedClose.reason,'closed-partial');assert.equal(fullInventory.revision,fullInventoryRevision);assert.equal(blockedCrafting.revision,blockedCraftingRevision);assert.deepEqual(blockedCrafting.slots[0],{id:'block:6',count:1});
console.log('authoritative player 2x2 crafting state + single-revision + blocked-close transactions: PASS');
