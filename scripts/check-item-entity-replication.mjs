import assert from 'node:assert/strict';
import {ITEM_ENTITY_SPAWN_KIND,ITEM_ENTITY_SNAPSHOT_KIND,ITEM_ENTITY_DESPAWN_KIND,encodeItemEntitySpawn,encodeItemEntitySnapshot,encodeItemEntityDespawn,decodeItemEntityReplication,isCompatibleItemEntityReplication} from '../src/item-entity-replication.js';

const state={entityId:'i:test_drop',revision:0,itemId:'stick',count:2,position:{x:1.25,y:24.5,z:-3},velocity:{x:.5,y:2,z:0},age:.25,pickupDelay:.2};
const spawn=encodeItemEntitySpawn(state);assert.equal(spawn.kind,ITEM_ENTITY_SPAWN_KIND);assert.deepEqual(spawn.position,[1.25,24.5,-3]);assert.deepEqual(decodeItemEntityReplication(spawn),{version:1,kind:ITEM_ENTITY_SPAWN_KIND,...state});
const snapshot=encodeItemEntitySnapshot({...state,revision:1,count:1,position:{x:1.3,y:24.7,z:-3}});assert.equal(snapshot.kind,ITEM_ENTITY_SNAPSHOT_KIND);assert.equal(decodeItemEntityReplication(snapshot).revision,1);
const despawn=encodeItemEntityDespawn('i:test_drop',2,'picked');assert.deepEqual(decodeItemEntityReplication(despawn),{version:1,kind:ITEM_ENTITY_DESPAWN_KIND,entityId:'i:test_drop',revision:2,reason:'picked'});
assert.equal(isCompatibleItemEntityReplication(spawn),true);assert.equal(isCompatibleItemEntityReplication({...spawn,itemId:'missing'}),false);assert.throws(()=>encodeItemEntitySpawn({...state,count:999}),/count/);assert.throws(()=>decodeItemEntityReplication({...spawn,extra:true}),/unexpected fields/);assert.throws(()=>encodeItemEntityDespawn('bad',1,'picked'),/safe i:/);assert.throws(()=>encodeItemEntityDespawn('i:test',1,'unknown'),/despawn reason/);
console.log('authoritative item entity wire protocol: PASS');
