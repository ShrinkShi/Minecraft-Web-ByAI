import assert from 'node:assert/strict';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {ServerPlayerInventoryState} from '../server/player-inventory-state.mjs';

const state=new ServerPlayerInventoryState('s:inventory-clicks',{mode:'survival'});assert.equal(state.addPickup('stick',9),0);assert.equal(state.snapshot().revision,1);assert.deepEqual(state.snapshot().slots[HOTBAR_START],{id:'stick',count:9});assert.equal(state.snapshot().cursor,null);

let result=state.click(HOTBAR_START,2,false);assert.equal(result.changed,true);assert.equal(result.reason,'split-picked-up');assert.equal(result.snapshot.revision,2);assert.deepEqual(result.snapshot.cursor,{id:'stick',count:5});assert.deepEqual(result.snapshot.slots[HOTBAR_START],{id:'stick',count:4});
result=state.click(0,2,false);assert.equal(result.changed,true);assert.equal(result.reason,'placed-one');assert.equal(result.snapshot.revision,3);assert.deepEqual(result.snapshot.cursor,{id:'stick',count:4});assert.deepEqual(result.snapshot.slots[0],{id:'stick',count:1});
result=state.click(0,0,false);assert.equal(result.changed,true);assert.equal(result.reason,'merged');assert.equal(result.snapshot.revision,4);assert.equal(result.snapshot.cursor,null);assert.deepEqual(result.snapshot.slots[0],{id:'stick',count:5});
result=state.click(0,0,true);assert.equal(result.changed,true);assert.equal(result.reason,'shift-moved');assert.equal(result.snapshot.revision,5);assert.equal(result.snapshot.slots[0],null);assert.deepEqual(result.snapshot.slots[HOTBAR_START],{id:'stick',count:9});

result=state.click(HOTBAR_START,0,false);assert.equal(result.changed,true);assert.deepEqual(result.snapshot.cursor,{id:'stick',count:9});assert.equal(result.snapshot.slots[HOTBAR_START],null);assert.equal(result.snapshot.revision,6);
result=state.returnCursor();assert.equal(result.changed,true);assert.equal(result.reason,'cursor-returned');assert.equal(result.snapshot.cursor,null);assert.deepEqual(result.snapshot.slots[0],{id:'stick',count:9});assert.equal(result.snapshot.revision,7);
const emptyReturn=state.returnCursor();assert.equal(emptyReturn.changed,false);assert.equal(emptyReturn.snapshot.revision,7);

const spectator=new ServerPlayerInventoryState('s:spectator-inventory',{mode:'survival'});spectator.addPickup('stick',1);spectator.setMode('spectator');const before=spectator.snapshot();const denied=spectator.click(HOTBAR_START,0,false);assert.equal(denied.changed,false);assert.equal(denied.reason,'spectator-read-only');assert.equal(denied.snapshot.revision,before.revision);assert.deepEqual(denied.snapshot.slots,before.slots);assert.equal(denied.snapshot.cursor,null);

console.log('authoritative inventory cursor + click/shift/return state machine: PASS');
