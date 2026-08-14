import assert from 'node:assert/strict';
import {INVENTORY_SLOT_COUNT} from '../src/inventory-layout.js';
import {decodeServerInventorySnapshot,encodeServerInventorySnapshot,isCompatibleServerInventorySnapshot,SERVER_INVENTORY_SNAPSHOT_KIND,SERVER_INVENTORY_SNAPSHOT_VERSION} from '../src/server-inventory-snapshot.js';

const slots=Array(INVENTORY_SLOT_COUNT).fill(null);slots[0]={id:'stick',count:12};slots[27]={id:'block:2',count:64};slots[28]={id:'wooden_pickaxe',count:1,damage:7};
const wire=encodeServerInventorySnapshot({session:'s:inventory-wire',revision:9,mode:'creative',slots});
assert.equal(SERVER_INVENTORY_SNAPSHOT_VERSION,2);assert.deepEqual(Object.keys(wire).sort(),['kind','mode','revision','session','slots','v']);assert.equal(wire.kind,SERVER_INVENTORY_SNAPSHOT_KIND);assert.equal(wire.v,2);assert.deepEqual(wire.slots[0],['stick',12]);assert.deepEqual(wire.slots[27],['block:2',64]);assert.deepEqual(wire.slots[28],['wooden_pickaxe',1,7]);
const decoded=decodeServerInventorySnapshot(wire,{expectedSession:'s:inventory-wire'});assert.equal(decoded.version,2);assert.equal(decoded.revision,9);assert.equal(decoded.mode,'creative');assert.deepEqual(decoded.slots[0],{id:'stick',count:12});assert.deepEqual(decoded.slots[28],{id:'wooden_pickaxe',count:1,damage:7});assert.equal(decoded.slots.length,INVENTORY_SLOT_COUNT);assert.equal(isCompatibleServerInventorySnapshot(wire,{expectedSession:'s:inventory-wire'}),true);

assert.throws(()=>encodeServerInventorySnapshot({session:'s:x',revision:0,mode:'creative',slots:Array(35).fill(null)}),/exactly 36/);
const unknown={...wire,slots:[...wire.slots]};unknown.slots[0]=['not-a-real-item',1];assert.throws(()=>decodeServerInventorySnapshot(unknown),/known item/);
const overstack={...wire,slots:[...wire.slots]};overstack.slots[0]=['wooden_pickaxe',2];assert.throws(()=>decodeServerInventorySnapshot(overstack),/1 to 1/);
const invalidDamage={...wire,slots:[...wire.slots]};invalidDamage.slots[28]=['wooden_pickaxe',1,59];assert.throws(()=>decodeServerInventorySnapshot(invalidDamage),/0 to 58/);
const normalItemDamage={...wire,slots:[...wire.slots]};normalItemDamage.slots[0]=['stick',1,1];assert.throws(()=>decodeServerInventorySnapshot(normalItemDamage),/not supported/);
assert.throws(()=>decodeServerInventorySnapshot({...wire,v:1}),/unsupported server inventory snapshot version/);
assert.throws(()=>decodeServerInventorySnapshot({...wire,session:'s:other'},{expectedSession:'s:inventory-wire'}),/session mismatch/);
assert.throws(()=>decodeServerInventorySnapshot({...wire,mode:'builder'}),/unsupported inventory snapshot mode/);
assert.throws(()=>decodeServerInventorySnapshot({...wire,revision:-1}),/uint32/);
assert.throws(()=>decodeServerInventorySnapshot({...wire,extra:true}),/unexpected fields/);
assert.equal(isCompatibleServerInventorySnapshot({...wire,extra:true}),false);
console.log('strict server inventory snapshot v2 item-instance contract: PASS');
