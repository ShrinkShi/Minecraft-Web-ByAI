import assert from 'node:assert/strict';
import {FOOD_USE_DURATION_SECONDS,beginFoodUse,createFoodUseState,stepFoodUse} from '../src/food-use-rules.js';
import {SingleplayerFoodUseRuntime} from '../src/singleplayer-food-use-runtime.js';

assert.equal(FOOD_USE_DURATION_SECONDS,1.6);
assert.deepEqual(createFoodUseState(),{active:false,itemId:null,elapsed:0,duration:1.6,progress:0});
assert.deepEqual(beginFoodUse('bread'),{active:true,itemId:'bread',elapsed:0,duration:1.6,progress:0});
let stepped=stepFoodUse(beginFoodUse('bread'),.8);assert.equal(stepped.completed,false);assert.equal(stepped.state.active,true);assert.equal(stepped.state.elapsed,.8);assert.equal(stepped.state.progress,.5);
stepped=stepFoodUse(stepped.state,.8);assert.equal(stepped.completed,true);assert.equal(stepped.state.active,false);assert.equal(stepped.state.progress,0);
assert.throws(()=>beginFoodUse(''),/non-empty string/);assert.throws(()=>stepFoodUse(beginFoodUse('bread'),-1),/0 to 60/);

const profile={nutrition:5,saturationModifier:.6};
{
  let selected={id:'bread',count:2},mode='survival',completeCalls=0;const states=[];
  const runtime=new SingleplayerFoodUseRuntime({getMode:()=>mode,getSelectedStack:()=>selected,canStart:()=>true,complete:(id,food)=>{completeCalls++;assert.equal(id,'bread');assert.equal(food.nutrition,5);selected={id:'bread',count:1};return{consumed:true};},onState:state=>states.push(state)});
  assert.equal(runtime.start('bread',profile).started,true);
  assert.equal(runtime.update(.7).completed,false);assert.equal(completeCalls,0);assert.equal(selected.count,2);assert(runtime.snapshot().progress>.4&&runtime.snapshot().progress<.5);
  assert.equal(runtime.cancel('released').cancelled,true);assert.equal(runtime.snapshot().active,false);runtime.update(5);assert.equal(completeCalls,0,'cancelled food use must never complete later');
  assert.equal(runtime.start('bread',profile).started,true);assert.equal(runtime.update(1.59).completed,false);assert.equal(completeCalls,0);const done=runtime.update(.01);assert.equal(done.completed,true);assert.equal(completeCalls,1);assert.equal(selected.count,1);runtime.update(5);assert.equal(completeCalls,1,'food completion must fire exactly once');
  assert(states.some(state=>state.active&&state.progress>0));assert.equal(states.at(-1).active,false);
}
{
  let selected={id:'bread',count:1},mode='survival',completeCalls=0;
  const runtime=new SingleplayerFoodUseRuntime({getMode:()=>mode,getSelectedStack:()=>selected,canStart:()=>true,complete:()=>{completeCalls++;return{consumed:true};}});
  runtime.start('bread',profile);selected={id:'apple',count:1};assert.equal(runtime.update(.1).reason,'item-changed');assert.equal(completeCalls,0);
  selected={id:'bread',count:1};runtime.start('bread',profile);mode='creative';assert.equal(runtime.update(.1).reason,'mode-changed');assert.equal(completeCalls,0);
}
{
  const runtime=new SingleplayerFoodUseRuntime({getMode:()=> 'survival',getSelectedStack:()=>({id:'bread',count:1}),canStart:()=>false,complete:()=>{throw new Error('must not complete');}});
  assert.deepEqual(runtime.start('bread',profile),{started:false,reason:'not-edible',state:{active:false,itemId:null,elapsed:0,duration:1.6,progress:0,reason:'idle'}});
}
console.log('interruptible 1.6s food use rules/runtime: PASS');
