import assert from 'node:assert/strict';
import {Inventory} from '../src/inventory.js';

const inventory=new Inventory('survival');inventory.slots[0]={id:'stick',count:12};inventory.cursor={id:'stick',count:2};const events=[];const unsubscribe=inventory.subscribe(event=>events.push(event.source));
const slots=Array(36).fill(null);slots[27]={id:'block:1',count:64};assert.equal(inventory.replaceSnapshot({slots}),true);assert.equal(inventory.slots[0],null,'authoritative replacement must clear slots absent from the snapshot');assert.deepEqual(inventory.slots[27],{id:'block:1',count:64});assert.equal(inventory.cursor,null,'authoritative replacement clears stale local cursor state');assert.deepEqual(events,['authoritative-snapshot']);
slots[27].count=1;assert.equal(inventory.slots[27].count,64,'replacement must clone incoming slot stacks');assert.equal(unsubscribe(),true);assert.equal(unsubscribe(),false);inventory.replaceSnapshot({slots:Array(36).fill(null)});assert.deepEqual(events,['authoritative-snapshot'],'unsubscribed listeners must not fire');
assert.equal(inventory.replaceSnapshot({slots:null}),false);assert.throws(()=>inventory.subscribe(null),/listener/);

const legacySlots=Array(36).fill(null);legacySlots[4]={id:'legacy:removed-item',count:2};const legacy=new Inventory('survival',{slots:legacySlots});assert.deepEqual(legacy.slots[4],{id:'legacy:removed-item',count:2},'ordinary browser-save restore must preserve the previous unknown-item-id behavior; network snapshots are validated before reaching Inventory');
console.log('authoritative inventory replacement + notification + legacy restore compatibility: PASS');
