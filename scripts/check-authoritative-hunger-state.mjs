import assert from 'node:assert/strict';
import {ITEMS} from '../src/items.js';
import {ServerPlayerHungerHub,ServerPlayerHungerState} from '../server/player-hunger-state.mjs';

const close=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);
let state=new ServerPlayerHungerState('session-hunger',{hunger:{food:20,saturation:5}});
let use=state.beginFoodUse('bread',ITEMS.bread.food);assert.equal(use.changed,false);assert.equal(use.reason,'not-edible');assert.equal(state.snapshot().revision,0);
state=new ServerPlayerHungerState('session-hunger',{hunger:{food:10,saturation:0},random:()=>0});
use=state.beginFoodUse('rotten_flesh',ITEMS.rotten_flesh.food);assert.equal(use.changed,true);assert.equal(use.snapshot.foodUse.active,true);assert.equal(use.snapshot.foodUse.itemId,'rotten_flesh');assert.equal(use.snapshot.revision,1);
let stepped=state.step(.8,{hp:20});assert.equal(stepped.foodUseCompleted,false);assert.equal(stepped.snapshot.food,10,'holding use must not consume before 1.6 seconds');assert.equal(stepped.snapshot.foodUse.active,true);close(stepped.snapshot.foodUse.elapsed,.8);
stepped=state.step(.8,{hp:20});assert.equal(stepped.foodUseCompleted,true);assert.equal(stepped.completedUse.itemId,'rotten_flesh');assert.equal(stepped.snapshot.food,10,'completion edge still requires inventory transaction commit');assert.equal(stepped.snapshot.foodUse.active,false);
const consumed=state.consume(stepped.completedUse.profile);assert.equal(consumed.changed,true);assert.equal(consumed.reason,'consumed');assert.equal(consumed.snapshot.food,14);assert.deepEqual(consumed.rolled,[{id:'hunger',amplifier:0,remainingSeconds:30}]);assert.deepEqual(consumed.snapshot.statusEffects,[{id:'hunger',amplifier:0,remainingSeconds:30}]);
const beforeExhaustion=consumed.snapshot.exhaustion;stepped=state.step(10,{hp:20});close(stepped.snapshot.exhaustion,beforeExhaustion+1);assert.deepEqual(stepped.snapshot.statusEffects,[{id:'hunger',amplifier:0,remainingSeconds:20}]);
const cancelledStart=state.beginFoodUse('bread',ITEMS.bread.food);assert.equal(cancelledStart.changed,true);const cancelled=state.cancelFoodUse('released');assert.equal(cancelled.changed,true);assert.equal(cancelled.snapshot.foodUse.active,false);const revisionAfterCancel=cancelled.snapshot.revision;assert.equal(state.cancelFoodUse('released').snapshot.revision,revisionAfterCancel,'idempotent cancel must not advance revision');
state.setMode('creative');assert.equal(state.beginFoodUse('bread',ITEMS.bread.food).reason,'mode-invalid');
state.setMode('survival');state.beginFoodUse('bread',ITEMS.bread.food);state.setMode('adventure');assert.equal(state.snapshot().foodUse.active,false,'leaving Survival cancels active food use');

const easy=new ServerPlayerHungerState('session-easy',{difficulty:'easy',hunger:{food:0,saturation:0}});stepped=easy.step(4,{hp:11});assert.equal(stepped.damage,1);stepped=easy.step(4,{hp:10});assert.equal(stepped.damage,0);
const peaceful=new ServerPlayerHungerState('session-peaceful',{difficulty:'peaceful',hunger:{food:18,saturation:0}});stepped=peaceful.step(1,{hp:18});assert.equal(stepped.snapshot.food,20);assert.equal(stepped.heal,1);

const reset=new ServerPlayerHungerState('session-reset',{hunger:{food:8,saturation:0},statusEffects:[{id:'hunger',amplifier:0,remainingSeconds:5}]});const resetResult=reset.respawn();assert.equal(resetResult.changed,true);assert.equal(resetResult.snapshot.food,20);assert.equal(resetResult.snapshot.saturation,5);assert.deepEqual(resetResult.snapshot.statusEffects,[]);assert.equal(resetResult.snapshot.foodUse.active,false);

const hub=new ServerPlayerHungerHub({difficulty:'hard'});assert.equal(hub.join('session-hub').difficulty,'hard');assert.equal(hub.sessionCount,1);assert.equal(hub.setMode('session-hub','creative').mode,'creative');assert.equal(hub.leave('session-hub'),true);assert.equal(hub.sessionCount,0);
console.log('authoritative server hunger + food-use + status-effect state machine: PASS');
