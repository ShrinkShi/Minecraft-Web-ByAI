import assert from 'node:assert/strict';
import {SingleplayerFoodUseRuntime} from '../src/singleplayer-food-use-runtime.js';

let now=0,selected={id:'raw_chicken',count:1},commits=0,allowCompletion=true;
const runtime=new SingleplayerFoodUseRuntime({
  getMode:()=> 'survival',
  getSelectedStack:()=>selected,
  canStart:()=>true,
  complete:()=>allowCompletion?{consumed:true,commitStatusEffects:()=>{commits++;return{applied:true};}}:{consumed:false,reason:'item-changed',commitStatusEffects:()=>{commits++;}},
  now:()=>now
});

assert.equal(runtime.start('raw_chicken',{nutrition:2,saturationModifier:.3,effects:[{id:'hunger',durationSeconds:30,chance:.3}]}).started,true);
now=2;let result=runtime.update(2);assert.equal(result.completed,true);assert.equal(commits,1,'successful committed food transaction must finalize status effects exactly once');
runtime.update(2);assert.equal(commits,1,'idle updates must not replay the status-effect commit');

allowCompletion=false;now=3;assert.equal(runtime.start('raw_chicken',{nutrition:2,saturationModifier:.3,effects:[{id:'hunger',durationSeconds:30,chance:.3}]}).started,true);now=5;result=runtime.update(2);assert.equal(result.completed,false);assert.equal(result.reason,'item-changed');assert.equal(commits,1,'rejected completion must not finalize status effects');

allowCompletion=true;now=6;assert.equal(runtime.start('raw_chicken',{nutrition:2,saturationModifier:.3,effects:[{id:'hunger',durationSeconds:30,chance:.3}]}).started,true);runtime.cancel('released');now=8;runtime.update(2);assert.equal(commits,1,'cancelled food use must never finalize status effects');
runtime.dispose();

console.log('singleplayer food-use status-effect transaction: PASS');
