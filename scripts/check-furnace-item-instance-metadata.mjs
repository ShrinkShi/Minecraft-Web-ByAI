import assert from 'node:assert/strict';
import {FURNACE_SLOT} from '../src/smelting.js';
import {ServerFurnaceContainerHub,ServerFurnaceContainerState} from '../server/furnace-container-state.mjs';

const cell={x:8,y:64,z:-3};
const damaged={id:'wooden_pickaxe',count:1,damage:17};
const state=new ServerFurnaceContainerState(cell);

let result=state.insert(FURNACE_SLOT.FUEL,damaged,{expectedRevision:0});
assert.equal(result.changed,true);
assert.deepEqual(result.container.slots[FURNACE_SLOT.FUEL],damaged,'furnace insertion must retain durability metadata');

result=state.replaceSlot(FURNACE_SLOT.FUEL,{id:'wooden_pickaxe',count:1,damage:18},{expectedRevision:1});
assert.equal(result.changed,true,'changing only durability metadata is still a real furnace mutation');
assert.equal(result.container.revision,2);
assert.deepEqual(result.container.slots[FURNACE_SLOT.FUEL],{id:'wooden_pickaxe',count:1,damage:18});

const serialized=state.serialize();
const hub=new ServerFurnaceContainerHub();
hub.restore(serialized);
assert.deepEqual(hub.snapshot(cell).slots[FURNACE_SLOT.FUEL],{id:'wooden_pickaxe',count:1,damage:18},'serialize/restore must preserve furnace item-instance metadata');

const sameDamage=new ServerFurnaceContainerState({x:9,y:64,z:-3});
assert.equal(sameDamage.insert(FURNACE_SLOT.FUEL,{id:'wooden_pickaxe',count:1,damage:4}).changed,true);
assert.equal(sameDamage.insert(FURNACE_SLOT.FUEL,{id:'wooden_pickaxe',count:1,damage:5},{expectedRevision:1}).reason,'slot-occupied','different durability instances must not merge');
assert.equal(sameDamage.snapshot().slots[FURNACE_SLOT.FUEL].damage,4);

console.log('furnace item-instance durability metadata survives mutation + persistence and participates in stack identity: PASS');
