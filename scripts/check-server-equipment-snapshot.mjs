import assert from 'node:assert/strict';
import {decodeServerEquipmentSnapshot,encodeServerEquipmentSnapshot,isCompatibleServerEquipmentSnapshot,SERVER_EQUIPMENT_SNAPSHOT_KIND,SERVER_EQUIPMENT_SNAPSHOT_VERSION} from '../src/server-equipment-snapshot.js';

const session='s:equipment-wire',slots={head:{id:'leather_helmet',count:1},chest:null,legs:{id:'leather_leggings',count:1},feet:null};
const wire=encodeServerEquipmentSnapshot({session,revision:4,slots});
assert.equal(SERVER_EQUIPMENT_SNAPSHOT_VERSION,1);assert.equal(wire.kind,SERVER_EQUIPMENT_SNAPSHOT_KIND);assert.deepEqual(Object.keys(wire).sort(),['kind','revision','session','slots','v']);assert.deepEqual(wire.slots.head,['leather_helmet',1]);assert.equal(wire.slots.chest,null);assert.deepEqual(wire.slots.legs,['leather_leggings',1]);
const decoded=decodeServerEquipmentSnapshot(wire,{expectedSession:session});assert.equal(decoded.revision,4);assert.deepEqual(decoded.slots.head,{id:'leather_helmet',count:1});assert.equal(decoded.slots.chest,null);assert.deepEqual(decoded.slots.legs,{id:'leather_leggings',count:1});assert.equal(isCompatibleServerEquipmentSnapshot(wire,{expectedSession:session}),true);

assert.throws(()=>encodeServerEquipmentSnapshot({session,revision:0,slots:{head:{id:'leather_chestplate',count:1},chest:null,legs:null,feet:null}}),/valid for head/);
assert.throws(()=>encodeServerEquipmentSnapshot({session,revision:0,slots:{head:{id:'stick',count:1},chest:null,legs:null,feet:null}}),/valid for head/);
assert.throws(()=>encodeServerEquipmentSnapshot({session,revision:0,slots:{head:null,chest:null,legs:null}}),/unexpected fields/);
assert.throws(()=>decodeServerEquipmentSnapshot({...wire,v:2}),/unsupported server equipment snapshot version/);
assert.throws(()=>decodeServerEquipmentSnapshot({...wire,session:'s:other'},{expectedSession:session}),/session mismatch/);
assert.throws(()=>decodeServerEquipmentSnapshot({...wire,revision:-1}),/uint32/);
const extra={...wire,extra:true};assert.throws(()=>decodeServerEquipmentSnapshot(extra),/unexpected fields/);assert.equal(isCompatibleServerEquipmentSnapshot(extra),false);
const invalidSlot={...wire,slots:{...wire.slots,head:['leather_chestplate',1]}};assert.throws(()=>decodeServerEquipmentSnapshot(invalidSlot));
const invalidCount={...wire,slots:{...wire.slots,head:['leather_helmet',2]}};assert.throws(()=>decodeServerEquipmentSnapshot(invalidCount));
console.log('strict server equipment snapshot contract: PASS');
