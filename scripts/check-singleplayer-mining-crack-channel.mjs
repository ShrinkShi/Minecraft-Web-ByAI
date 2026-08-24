import assert from 'node:assert/strict';
import {SingleplayerMiningController} from '../src/singleplayer-mining-controller.js';
import {publishSingleplayerMiningProgress,subscribeSingleplayerMiningProgress} from '../src/singleplayer-mining-progress-channel.js';

const published=[];const release=subscribeSingleplayerMiningProgress(state=>published.push(state));
const manual=publishSingleplayerMiningProgress({active:true,progress:.25,target:{x:1,y:2,z:3,id:2}});assert.equal(manual.active,true);assert.equal(manual.progress,.25);assert.deepEqual(manual.target,{x:1,y:2,z:3,id:2});assert.equal(Object.isFrozen(manual),true);assert.equal(Object.isFrozen(manual.target),true);
publishSingleplayerMiningProgress({active:false,progress:0,target:null});

const controller=new SingleplayerMiningController({
  aim:()=>({x:4,y:5,z:6,id:2}),getMode:()=> 'survival',getSelectedStack:()=>null,breakTarget:()=>false,spawnDrop:()=>{},damageSelected:()=>{},onProgress:()=>{}
});
controller.start(1000);controller.step(1050);
const active=published.findLast(state=>state.active);assert(active,'singleplayer controller must publish an active mining presentation state');assert(active.progress>0&&active.progress<1);assert.deepEqual(active.target,{x:4,y:5,z:6,id:2});
controller.cancel();assert.deepEqual(published.at(-1),{active:false,progress:0,target:null});
release();const before=published.length;publishSingleplayerMiningProgress({active:false,progress:0,target:null});assert.equal(published.length,before,'released listeners must not receive later states');
assert.throws(()=>publishSingleplayerMiningProgress({active:true,progress:0,target:{x:0,y:0,z:0,id:2}}),/greater than 0/);
console.log('singleplayer mining progress -> shared crack presentation channel: PASS');
