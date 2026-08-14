import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {publishMultiplayerMiningProgress,clearMultiplayerMiningProgress,multiplayerMiningProgressState,subscribeMultiplayerMiningProgress} from '../src/multiplayer-mining-progress-channel.js';

const ownerA={},ownerB={},events=[];const release=subscribeMultiplayerMiningProgress(state=>events.push(state));assert.deepEqual(events,[null]);
const stateA={session:'s:a',tick:1,active:true,progress:.2,target:{x:1,y:2,z:3,id:BLOCK.STONE}};const published=publishMultiplayerMiningProgress(ownerA,stateA);assert.notEqual(published,stateA);assert.notEqual(published.target,stateA.target);assert.equal(Object.isFrozen(published),true);assert.deepEqual(multiplayerMiningProgressState(),published);assert.equal(events.length,2);assert.deepEqual(events[1],published);
stateA.target.x=99;assert.equal(multiplayerMiningProgressState().target.x,1,'published state must not retain caller-owned nested references');
publishMultiplayerMiningProgress(ownerB,{session:'s:b',tick:2,active:true,progress:.6,target:{x:4,y:5,z:6,id:BLOCK.STONE}});assert.equal(clearMultiplayerMiningProgress(ownerA),false,'stale session cleanup must not clear the newer owner');assert.equal(multiplayerMiningProgressState().session,'s:b');assert.equal(clearMultiplayerMiningProgress(ownerB),true);assert.equal(multiplayerMiningProgressState(),null);assert.equal(events.at(-1),null);
assert.equal(release(),true);assert.equal(release(),false);publishMultiplayerMiningProgress(ownerA,{session:'s:a',tick:3,active:false,progress:0,target:null});assert.equal(events.at(-1),null,'released subscriber must receive no further events');assert.equal(clearMultiplayerMiningProgress(ownerA),true);
assert.throws(()=>publishMultiplayerMiningProgress(ownerA,{active:true,progress:0,target:{x:0,y:0,z:0,id:BLOCK.STONE}}),/greater than 0/);assert.throws(()=>subscribeMultiplayerMiningProgress(null),/listener/);
console.log('owner-scoped multiplayer mining progress presentation channel: PASS');
