import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {MiningProgressReplicationHub} from '../server/mining-progress-replication-hub.mjs';

const sent=[],errors=[];let failReset=false;
const hub=new MiningProgressReplicationHub({send:(session,state)=>{if(failReset&&!state.active)return null;sent.push({session,state});return state;},onError:event=>errors.push(event)});
const outcome={attempted:true,reason:'mining',progress:.25,target:{x:2,y:70,z:-4,id:BLOCK.STONE},breakResult:null,drop:null};
let result=hub.update('s:hub',4,outcome);assert.equal(result.sent,true);assert.equal(result.active,true);assert.equal(hub.has('s:hub'),true);assert.equal(hub.activeCount,1);assert.deepEqual(sent[0].state,{session:'s:hub',tick:4,active:true,progress:.25,target:{x:2,y:70,z:-4,id:BLOCK.STONE}});
result=hub.update('s:hub',5,{...outcome,progress:.5});assert.equal(result.sent,true);assert.equal(sent.length,2);assert.equal(sent[1].state.progress,.5);
failReset=true;result=hub.update('s:hub',6,{attempted:false,reason:'primary-not-held',progress:0,target:null,breakResult:null,drop:null});assert.equal(result.sent,false);assert.equal(hub.has('s:hub'),true,'failed reset must remain pending so a later tick can retry');assert.equal(errors.length,1);assert.equal(errors[0].phase,'reset');
failReset=false;result=hub.update('s:hub',7,{attempted:false,reason:'primary-not-held',progress:0,target:null,breakResult:null,drop:null});assert.equal(result.sent,true);assert.equal(hub.has('s:hub'),false);assert.deepEqual(sent.at(-1).state,{session:'s:hub',tick:7,active:false,progress:0,target:null});
result=hub.update('s:hub',8,{attempted:false,reason:'primary-not-held',progress:0,target:null,breakResult:null,drop:null});assert.equal(result.sent,false,'inactive sessions must not spam reset frames');assert.equal(sent.length,3);
hub.update('s:hub',9,outcome);assert.equal(hub.remove('s:hub'),true);assert.equal(hub.remove('s:hub'),false);hub.update('s:other',10,outcome);hub.clear();assert.equal(hub.activeCount,0);
console.log('mining progress active/reset lifecycle + reset retry: PASS');
