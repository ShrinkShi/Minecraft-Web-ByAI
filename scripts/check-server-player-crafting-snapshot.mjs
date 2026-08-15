import assert from 'node:assert/strict';
import {decodeServerPlayerCraftingSnapshot,encodeServerPlayerCraftingSnapshot,isCompatibleServerPlayerCraftingSnapshot,SERVER_PLAYER_CRAFTING_SNAPSHOT_KIND} from '../src/server-player-crafting-snapshot.js';

const session='s:craft-snapshot';
const wire=encodeServerPlayerCraftingSnapshot({session,revision:3,size:2,slots:[{id:'block:6',count:2},null,null,null]});
assert.deepEqual(wire,{v:1,kind:SERVER_PLAYER_CRAFTING_SNAPSHOT_KIND,session,revision:3,size:2,slots:[['block:6',2],null,null,null],result:['block:5',4]});
const decoded=decodeServerPlayerCraftingSnapshot(wire,{expectedSession:session});assert.equal(decoded.revision,3);assert.deepEqual(decoded.slots,[{id:'block:6',count:2},null,null,null]);assert.deepEqual(decoded.result,{id:'block:5',count:4});assert.equal(isCompatibleServerPlayerCraftingSnapshot(wire,{expectedSession:session}),true);
assert.throws(()=>decodeServerPlayerCraftingSnapshot({...wire,result:['stick',4]},{expectedSession:session}),/result does not match server recipe state/);
assert.throws(()=>decodeServerPlayerCraftingSnapshot({...wire,extra:true},{expectedSession:session}),/unexpected fields/);
assert.throws(()=>decodeServerPlayerCraftingSnapshot({...wire,size:3},{expectedSession:session}),/size must be 2/);
assert.throws(()=>decodeServerPlayerCraftingSnapshot({...wire,session:'s:other'},{expectedSession:session}),/session mismatch/);
assert.throws(()=>decodeServerPlayerCraftingSnapshot({...wire,slots:[['block:6',65],null,null,null]},{expectedSession:session}),/count/);
console.log('strict player crafting snapshot + server-derived result validation: PASS');
