import assert from 'node:assert/strict';
import {MAX_AIR_SECONDS,AIR_RECOVERY_PER_SECOND,DROWN_INTERVAL_SECONDS,DROWN_DAMAGE,usesOxygen,createOxygenState,stepOxygen} from '../src/oxygen-rules.js';

assert.equal(MAX_AIR_SECONDS,15);assert.equal(AIR_RECOVERY_PER_SECOND,4);assert.equal(DROWN_INTERVAL_SECONDS,1);assert.equal(DROWN_DAMAGE,2);
assert.equal(usesOxygen('survival'),true);assert.equal(usesOxygen('adventure'),true);assert.equal(usesOxygen('creative'),false);assert.equal(usesOxygen('spectator'),false);
assert.deepEqual(createOxygenState(),{air:15,drownTimer:0});

let state=createOxygenState(),out=stepOxygen(state,{dt:5,submerged:true,mode:'survival'});state=out.state;assert.deepEqual(state,{air:10,drownTimer:0});assert.equal(out.damageEvents,0);
out=stepOxygen(state,{dt:10,submerged:true,mode:'survival'});state=out.state;assert.deepEqual(state,{air:0,drownTimer:0});assert.equal(out.damageEvents,0);
out=stepOxygen(state,{dt:.75,submerged:true,mode:'survival'});state=out.state;assert.equal(out.damageEvents,0);assert.equal(state.air,0);assert.equal(state.drownTimer,.75);
out=stepOxygen(state,{dt:.25,submerged:true,mode:'survival'});state=out.state;assert.equal(out.damageEvents,1);assert.equal(state.drownTimer,0);
out=stepOxygen(state,{dt:2.4,submerged:true,mode:'survival'});state=out.state;assert.equal(out.damageEvents,2);assert.ok(Math.abs(state.drownTimer-.4)<1e-9);
out=stepOxygen(state,{dt:.5,submerged:false,mode:'survival'});state=out.state;assert.equal(state.air,2);assert.equal(state.drownTimer,0);assert.equal(out.damageEvents,0);
out=stepOxygen(state,{dt:10,submerged:false,mode:'survival'});assert.deepEqual(out.state,{air:15,drownTimer:0});

out=stepOxygen({air:.25,drownTimer:0},{dt:1.25,submerged:true,mode:'adventure'});assert.equal(out.state.air,0);assert.equal(out.damageEvents,1);assert.equal(out.state.drownTimer,0);
out=stepOxygen({air:3,drownTimer:.8},{dt:1,submerged:true,mode:'creative'});assert.deepEqual(out,{state:{air:15,drownTimer:0},damageEvents:0});

assert.throws(()=>stepOxygen(null,{dt:1,submerged:true,mode:'survival'}),TypeError);
assert.throws(()=>stepOxygen({air:-1,drownTimer:0},{dt:1,submerged:true,mode:'survival'}),TypeError);
assert.throws(()=>stepOxygen(createOxygenState(),{dt:-1,submerged:true,mode:'survival'}),RangeError);
assert.throws(()=>stepOxygen(createOxygenState(),{dt:1,submerged:'yes',mode:'survival'}),TypeError);

console.log('oxygen + drowning checks: PASS');
