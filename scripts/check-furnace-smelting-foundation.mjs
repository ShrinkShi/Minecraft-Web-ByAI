import assert from 'node:assert/strict';
import {FURNACE_FUELS,FURNACE_SLOT,SMELTING_RECIPES,createFurnaceState,furnaceCanInsert,furnaceFuelTicks,furnaceStackLimitFor,normalizeFurnaceStack,smeltingRecipeFor,tickFurnace} from '../src/smelting.js';
import {ServerFurnaceContainerHub,ServerFurnaceContainerState} from '../server/furnace-container-state.mjs';

assert.deepEqual(smeltingRecipeFor('raw_iron'),{input:'raw_iron',output:'iron_ingot',count:1,cookTicks:200,experience:.7});
assert.equal(smeltingRecipeFor('iron_ingot'),null);
assert.equal(furnaceFuelTicks('block:5'),300);
assert.equal(furnaceFuelTicks('block:6'),300);
assert.equal(furnaceFuelTicks('stick'),100);
assert.equal(furnaceFuelTicks('wooden_pickaxe'),200);
assert.equal(furnaceFuelTicks('stone_pickaxe'),0);
assert.equal(Object.isFrozen(SMELTING_RECIPES),true);
assert.equal(Object.isFrozen(FURNACE_FUELS),true);
assert.equal(furnaceStackLimitFor('wooden_pickaxe'),1);
assert.equal(furnaceStackLimitFor('iron_ingot'),64);
assert.equal(furnaceCanInsert(FURNACE_SLOT.INPUT,'raw_iron'),true);
assert.equal(furnaceCanInsert(FURNACE_SLOT.INPUT,'stone_pickaxe'),true,'manual furnace input accepts known non-smeltable items without cooking them');
assert.equal(furnaceCanInsert(FURNACE_SLOT.INPUT,'iron_ingot'),false,'declared furnace outputs cannot be reinserted into the input foundation');
assert.equal(furnaceCanInsert(FURNACE_SLOT.INPUT,'not-a-real-item'),false);
assert.equal(furnaceCanInsert(FURNACE_SLOT.FUEL,'block:5'),true);
assert.equal(furnaceCanInsert(FURNACE_SLOT.FUEL,'stone_pickaxe'),false);
assert.equal(furnaceCanInsert(FURNACE_SLOT.OUTPUT,'iron_ingot'),false);
assert.throws(()=>normalizeFurnaceStack({id:'not-a-real-item',count:1}),/known item or declared smelting output/);
assert.throws(()=>normalizeFurnaceStack({id:'wooden_pickaxe',count:2}),/integer from 1 to 1/);
assert.throws(()=>createFurnaceState({slots:[null,{id:'stone_pickaxe',count:1},null]}),/fuel slot/);
assert.throws(()=>createFurnaceState({slots:[null,null,{id:'raw_iron',count:1}]}),/output slot/);
assert.throws(()=>createFurnaceState({burnRemaining:2,burnTotal:1}),/cannot exceed/);
assert.throws(()=>createFurnaceState({cookProgress:2,cookTotal:1}),/cannot exceed/);

let result=tickFurnace(createFurnaceState({slots:[{id:'raw_iron',count:2},{id:'block:5',count:1},null]}),199);
assert.equal(result.smelted,0);assert.equal(result.consumedFuel,1);assert.equal(result.transactionMutations,1);assert.equal(result.state.burnRemaining,101);assert.equal(result.state.cookProgress,199);
result=tickFurnace(result.state,1);
assert.equal(result.smelted,1);assert.equal(result.transactionMutations,1);assert.equal(result.state.burnRemaining,100);assert.deepEqual(result.state.slots,[{id:'raw_iron',count:1},null,{id:'iron_ingot',count:1}]);assert.equal(result.state.storedExperience,.7);
result=tickFurnace(result.state,100);
assert.equal(result.smelted,0);assert.equal(result.transactionMutations,0);assert.equal(result.state.burnRemaining,0);assert.equal(result.state.cookProgress,100,'remaining fuel must contribute its full 300 processing ticks');
result=tickFurnace(result.state,50);
assert.equal(result.transactionMutations,0);assert.equal(result.state.cookProgress,0,'an unlit interrupted furnace cools by two progress ticks per server tick');

const blocked=tickFurnace(createFurnaceState({slots:[{id:'raw_iron',count:1},{id:'block:5',count:1},{id:'iron_ingot',count:64}]}),400);
assert.equal(blocked.consumedFuel,0);assert.equal(blocked.transactionMutations,0);assert.equal(blocked.smelted,0);assert.deepEqual(blocked.state.slots,[{id:'raw_iron',count:1},{id:'block:5',count:1},{id:'iron_ingot',count:64}]);

const cell={x:4,y:63,z:-7},hub=new ServerFurnaceContainerHub();
let snap=hub.open(cell);assert.equal(snap.revision,0);assert.equal(snap.lit,false);assert.equal(hub.furnaceCount,1);
let inserted=hub.state(cell).insert(FURNACE_SLOT.INPUT,{id:'raw_iron',count:2},{expectedRevision:0});assert.equal(inserted.changed,true);assert.equal(inserted.container.revision,1);
const conflict=hub.state(cell).insert(FURNACE_SLOT.FUEL,{id:'block:5',count:1},{expectedRevision:0});assert.equal(conflict.changed,false);assert.equal(conflict.reason,'revision-conflict');
inserted=hub.state(cell).insert(FURNACE_SLOT.FUEL,{id:'block:5',count:1},{expectedRevision:1});assert.equal(inserted.changed,true);assert.equal(inserted.container.revision,2);
const ignited=hub.state(cell).tick(1);assert.equal(ignited.transactionMutations,1);assert.equal(ignited.container.revision,3);assert.equal(ignited.container.cookProgress,1);
const progressOnly=hub.state(cell).tick(198);assert.equal(progressOnly.transactionMutations,0);assert.equal(progressOnly.container.revision,3,'timer-only progress must not invalidate a concurrent container transaction');assert.equal(progressOnly.container.cookProgress,199);
const cooked=hub.state(cell).tick(1);assert.equal(cooked.smelted,1);assert.equal(cooked.transactionMutations,1);assert.equal(cooked.container.revision,4);assert.equal(cooked.container.lit,true);assert.deepEqual(cooked.container.slots,[{id:'raw_iron',count:1},null,{id:'iron_ingot',count:1}]);
assert.deepEqual(hub.open(cell),cooked.container,'reopening the same world cell must preserve furnace contents and timers');
const taken=hub.state(cell).takeOutput(1,{expectedRevision:4});assert.equal(taken.changed,true);assert.deepEqual(taken.taken,{id:'iron_ingot',count:1});assert.equal(taken.experience,.7);assert.equal(taken.container.storedExperience,0);assert.equal(taken.container.revision,5);

const records=hub.serialize();assert.equal(records.length,1);const restored=new ServerFurnaceContainerHub();restored.restore(records[0]);assert.deepEqual(restored.snapshot(cell),hub.snapshot(cell));
const broken=restored.break(cell);assert.equal(broken.changed,true);assert.deepEqual(broken.contents,[{id:'raw_iron',count:1}]);assert.equal(restored.furnaceCount,0);

const fullOutput=new ServerFurnaceContainerState({x:0,y:64,z:0},{state:createFurnaceState({slots:[{id:'raw_iron',count:1},{id:'block:5',count:1},{id:'iron_ingot',count:64}]})});
const noBurn=fullOutput.tick(400);assert.equal(noBurn.consumedFuel,0);assert.equal(noBurn.transactionMutations,0);assert.equal(noBurn.container.revision,0);

const singleToolFuel=new ServerFurnaceContainerState({x:1,y:64,z:0});
assert.equal(singleToolFuel.insert(FURNACE_SLOT.FUEL,{id:'wooden_pickaxe',count:1}).changed,true);
assert.equal(singleToolFuel.insert(FURNACE_SLOT.FUEL,{id:'wooden_pickaxe',count:1},{expectedRevision:1}).reason,'slot-full','non-stackable fuel must never merge above its item stack limit');

const splitXp=new ServerFurnaceContainerState({x:2,y:64,z:0},{state:createFurnaceState({slots:[null,null,{id:'iron_ingot',count:2}],storedExperience:1.4})});
const firstIngot=splitXp.takeOutput(1,{expectedRevision:0});assert.equal(firstIngot.experience,.7);assert.equal(firstIngot.container.storedExperience,.7);assert.deepEqual(firstIngot.container.slots[FURNACE_SLOT.OUTPUT],{id:'iron_ingot',count:1});
const secondIngot=splitXp.takeOutput(1,{expectedRevision:1});assert.equal(secondIngot.experience,.7);assert.equal(secondIngot.container.storedExperience,0);

console.log('authoritative furnace smelting foundation + strict item stacks + stable transaction revision + world-cell persistence: PASS');
