import assert from 'node:assert/strict';
import {HUNGER_EXHAUSTION_PER_SECOND_PER_LEVEL,STATUS_EFFECT_HUNGER,applyStatusEffect,normalizeFoodStatusEffects,normalizeStatusEffects,rollFoodStatusEffects,stepStatusEffects} from '../src/status-effect-rules.js';

const close=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);
assert.equal(HUNGER_EXHAUSTION_PER_SECOND_PER_LEVEL,.1);
assert.deepEqual(normalizeStatusEffects(undefined),[]);
assert.deepEqual(normalizeFoodStatusEffects([{id:STATUS_EFFECT_HUNGER,durationSeconds:30,chance:.3}]),[{id:'hunger',amplifier:0,durationSeconds:30,chance:.3}]);

let rolls=[.299999,.3],index=0;
let rolled=rollFoodStatusEffects([{id:'hunger',durationSeconds:30,chance:.3},{id:'hunger',durationSeconds:30,chance:.3}],{random:()=>rolls[index++]});
assert.deepEqual(rolled,[{id:'hunger',amplifier:0,remainingSeconds:30}],'chance must use sample < chance');

let effects=applyStatusEffect([],{id:'hunger',amplifier:0,remainingSeconds:12});
effects=applyStatusEffect(effects,{id:'hunger',amplifier:0,remainingSeconds:30});assert.deepEqual(effects,[{id:'hunger',amplifier:0,remainingSeconds:30}]);
effects=applyStatusEffect(effects,{id:'hunger',amplifier:0,remainingSeconds:5});assert.deepEqual(effects,[{id:'hunger',amplifier:0,remainingSeconds:30}],'shorter same-amplifier application must not shorten the active effect');
effects=applyStatusEffect(effects,{id:'hunger',amplifier:1,remainingSeconds:10});assert.deepEqual(effects,[{id:'hunger',amplifier:1,remainingSeconds:10}],'stronger current-phase effect replaces weaker active effect');

let stepped=stepStatusEffects([{id:'hunger',amplifier:0,remainingSeconds:30}],{dt:10});assert.deepEqual(stepped.effects,[{id:'hunger',amplifier:0,remainingSeconds:20}]);close(stepped.hungerExhaustion,1);
stepped=stepStatusEffects(stepped.effects,{dt:20});assert.deepEqual(stepped.effects,[]);close(stepped.hungerExhaustion,2);
stepped=stepStatusEffects([{id:'hunger',amplifier:0,remainingSeconds:2}],{dt:5});assert.deepEqual(stepped.effects,[]);close(stepped.hungerExhaustion,.2,'expired effects must contribute only for their remaining active duration');
assert.throws(()=>normalizeStatusEffects([{id:'hunger',amplifier:0,remainingSeconds:10},{id:'hunger',amplifier:0,remainingSeconds:5}]),/duplicate status effect/);
assert.throws(()=>rollFoodStatusEffects([{id:'hunger',durationSeconds:30,chance:.3}],{random:()=>1}),/random sample/);

console.log('status effect rules: PASS');
