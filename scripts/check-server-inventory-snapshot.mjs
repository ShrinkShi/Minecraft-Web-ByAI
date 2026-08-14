import assert from 'node:assert/strict';
import {INVENTORY_SLOT_COUNT} from '../src/inventory-layout.js';
import {decodeServerInventorySnapshot,encodeServerInventorySnapshot,isCompatibleServerInventorySnapshot,SERVER_INVENTORY_SNAPSHOT_KIND} from '../src/server-inventory-snapshot.js';

const slots=Array(INVENTORY_SLOT_COUNT).fill(null);slots[0]={id:'stick',count:12};slots[27]={id:'block:2',count:64};
const wire=encodeServerInventorySnapshot({session:'s:inventory-wire',revision:9,mode:'creative',slots});
assert.deepEqual(Object.keys(wire).sort(),['kind','mode','revision','session','slots','v']);assert.equal(wire.kind,SERVER_INVENTORY_SNAPSHOT_KIND);assert.deepEqual(wire.slots[0],['stick',12]);assert.deepEqual(wire.slots[27],['block:2',64]);
const decoded=decodeServerInventorySnapshot(wire,{expectedSession:'s:inventory-wire'});assert.equal(decoded.revision,9);assert.equal(decoded.mode,'creative');assert.deepEqual(decoded.slots[0],{id:'stick',count:12});assert.equal(decoded.slots.length,INVENTORY_SLOT_COUNT);assert.equal(isCompatibleServerInventorySnapshot(wire,{expectedSession:'s:inventory-wire'}),true);

assert.throws(()=>encodeServerInventorySnapshot({session:'s:x',revision:0,mode:'creative',slots:Array(35).fill(null)}),/exactly 36/);
const unknown={...wire,slots:[...wire.slots]};unknown.slots[0]=['not-a-real-item',1];assert.throws(()=>decodeServerInventorySnapshot(unknown),/known item/);
const overstack={...wire,slots:[...wire.slots]};overstack.slots[0]=['wooden_pickaxe',2];assert.throws(()=>decodeServerInventorySnapshot(overstack),/1 to 1/);
assert.throws(()=>decodeServerInventorySnapshot({...wire,session:'s:other'},{expectedSession:'s:inventory-wire'}),/session mismatch/);
assert.throws(()=>decodeServerInventorySnapshot({...wire,mode:'builder'}),/unsupported inventory snapshot mode/);
assert.throws(()=>decodeServerInventorySnapshot({...wire,revision:-1}),/uint32/);
assert.throws(()=>decodeServerInventorySnapshot({...wire,extra:true}),/unexpected fields/);
assert.equal(isCompatibleServerInventorySnapshot({...wire,extra:true}),false);
console.log('strict server inventory snapshot wire contract: PASS');
