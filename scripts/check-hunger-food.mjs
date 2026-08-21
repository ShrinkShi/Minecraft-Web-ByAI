import assert from 'node:assert/strict';
import {ITEMS} from '../src/items.js';
import {addHungerExhaustion,attackExhaustion,consumeFood,createHungerState,damageExhaustion,jumpExhaustion,movementExhaustion,stepHunger} from '../src/hunger-rules.js';
import {furnaceFuelTicks,smeltingRecipeFor,tickFurnace} from '../src/smelting.js';

const close=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);
for(const [id,nutrition,saturationModifier] of [['apple',4,.3],['bread',5,.6],['raw_beef',3,.3],['cooked_beef',8,.8],['raw_mutton',2,.3],['cooked_mutton',6,.8],['raw_porkchop',3,.3],['cooked_porkchop',8,.8],['raw_chicken',2,.3],['cooked_chicken',6,.6],['rotten_flesh',4,.1]])assert.deepEqual(ITEMS[id].food,{nutrition,saturationModifier});
let eaten=consumeFood(createHungerState({food:10,saturation:0}),ITEMS.bread.food);assert.equal(eaten.consumed,true);assert.equal(eaten.state.food,15);assert.equal(eaten.state.saturation,6);
assert.equal(consumeFood(createHungerState({food:20,saturation:5}),ITEMS.apple.food).consumed,false);
eaten=consumeFood(createHungerState({food:18,saturation:1}),ITEMS.apple.food);assert.equal(eaten.state.food,20);close(eaten.state.saturation,3.4);
let state=addHungerExhaustion(createHungerState({food:20,saturation:2}),4.1),step=stepHunger(state,{dt:.05,hp:20});assert.equal(step.state.food,20);assert.equal(step.state.saturation,1);close(step.state.exhaustion,.1);
assert.equal(movementExhaustion(10,{sprinting:true}),1);assert.equal(movementExhaustion(10,{swimming:true}),.1);assert.equal(jumpExhaustion(),.05);assert.equal(jumpExhaustion({sprinting:true}),.2);assert.equal(attackExhaustion(),.1);assert.equal(damageExhaustion(),.1);
step=stepHunger(createHungerState({food:20,saturation:5}),{dt:.5,hp:18});close(step.heal,5/6);assert.equal(step.damage,0);assert.equal(step.state.saturation,4);close(step.state.exhaustion,1);
step=stepHunger(createHungerState({food:18,saturation:0}),{dt:4,hp:18});assert.equal(step.heal,1);assert.equal(step.state.food,17);close(step.state.exhaustion,2);
step=stepHunger(createHungerState({food:0,saturation:0}),{dt:4,hp:2});assert.equal(step.damage,1);step=stepHunger(createHungerState({food:0,saturation:0}),{dt:8,hp:1});assert.equal(step.damage,0,'normal starvation floor must not kill the player');
for(const [input,output] of [['raw_beef','cooked_beef'],['raw_mutton','cooked_mutton'],['raw_porkchop','cooked_porkchop'],['raw_chicken','cooked_chicken']]){const recipe=smeltingRecipeFor(input);assert.equal(recipe.output,output);assert.equal(recipe.cookTicks,200);assert.equal(recipe.experience,.35);const result=tickFurnace({slots:[{id:input,count:1},{id:'coal',count:1},null]},200);assert.equal(result.state.slots[2].id,output);assert.equal(result.smelted,1);}
assert.equal(furnaceFuelTicks('coal'),1600);
console.log('hunger/food rules + canonical food registry + Furnace meat cooking: PASS');
