import assert from 'node:assert/strict';
import {HOTBAR_START} from '../src/inventory-layout.js';
import {ServerPlayerInventoryState} from '../server/player-inventory-state.mjs';
import {ServerItemEntityHub} from '../server/item-entity-state.mjs';

const inventory=new ServerPlayerInventoryState('s:pickup',{mode:'survival'});assert.equal(inventory.add('stick',1),0);assert.deepEqual(inventory.snapshot().slots[0],{id:'stick',count:1});assert.equal(inventory.addPickup('stick',1),0);assert.deepEqual(inventory.snapshot().slots[0],{id:'stick',count:1},'pickup must not merge the main-inventory stack before using the hotbar');assert.deepEqual(inventory.snapshot().slots[HOTBAR_START],{id:'stick',count:1},'authoritative pickup must prioritize hotbar space');

const events=[],world={getBlock(){return 0;}};let nextId=0;const items=new ServerItemEntityHub({entityIdFactory:()=>`i:test_${++nextId}`,onSpawn:state=>events.push(['spawn',state]),onSnapshot:state=>events.push(['snapshot',state]),onDespawn:message=>events.push(['despawn',message])});
const spawned=items.spawn('stick',2,{x:0,y:2,z:0},{velocity:{x:0,y:0,z:0},pickupDelay:0});assert.equal(spawned.revision,0);assert.equal(items.size,1);assert.equal(events[0][0],'spawn');
let offered=0;const result=items.step(world,[{session:'s:pickup',mode:'survival',position:{x:0,y:1,z:0}}],{dt:.05,onPickup:(session,id,count)=>{assert.equal(session,'s:pickup');assert.equal(id,'stick');offered=count;return 0;}});assert.equal(offered,2);assert.equal(result.pickups,2);assert.equal(result.despawns,1);assert.equal(items.size,0);assert.equal(events.at(-1)[0],'despawn');assert.equal(events.at(-1)[1].reason,'picked');assert.equal(events.at(-1)[1].revision,1);
const expiring=items.spawn('stick',1,{x:4,y:2,z:4},{pickupDelay:0});const internal=items.entities.get(expiring.entityId);internal.age=299.99;items.step(world,[],{dt:.05});assert.equal(items.has(expiring.entityId),false);assert.equal(events.at(-1)[1].reason,'expired');
assert.throws(()=>items.spawn('missing',1,{x:0,y:0,z:0}),/known item/);assert.throws(()=>items.step(world,[],{dt:1}),/at most/);
console.log('authoritative item entity simulation + hotbar-first pickup: PASS');
