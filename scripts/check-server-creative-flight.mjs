import assert from 'node:assert/strict';
import {ServerPlayerSimulation} from '../server/player-simulation.mjs';

const environment={isSolidBlock:()=>false,isLiquidBlock:()=>false};
const input=(session,flightToggleSequence=null)=>({session,control:{side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false},view:null,flightToggleSequence});
const simulation=new ServerPlayerSimulation(environment);

const creative=simulation.addSession('creative-flight',{position:{x:0,y:10,z:0},mode:'creative'});
assert.equal(creative.flying,false,'creative must spawn grounded until an accepted toggle');
let state=simulation.step('creative-flight',input('creative-flight',1));
assert.equal(state.flying,true,'first accepted creative toggle enables flight');
state=simulation.step('creative-flight',input('creative-flight',1));
assert.equal(state.flying,true,'the same accepted toggle sequence must not flip flight again on the next server tick');
state=simulation.step('creative-flight',input('creative-flight',2));
assert.equal(state.flying,false,'a newer accepted creative toggle disables flight');
state=simulation.step('creative-flight',input('creative-flight',2));
assert.equal(state.flying,false,'repeated snapshot state remains idempotent after disabling flight');

simulation.setMode('creative-flight','survival');
state=simulation.step('creative-flight',input('creative-flight',3));
assert.equal(state.flying,false,'survival ignores flight toggle state and remains grounded');
simulation.setMode('creative-flight','adventure');
state=simulation.step('creative-flight',input('creative-flight',4));
assert.equal(state.flying,false,'adventure ignores flight toggle state and remains grounded');
simulation.setMode('creative-flight','spectator');
state=simulation.step('creative-flight',input('creative-flight',5));
assert.equal(state.flying,true,'spectator remains forced-flying even when a flight toggle sequence changes');
simulation.setMode('creative-flight','creative');
assert.equal(simulation.snapshot('creative-flight').flying,false,'entering creative from spectator must not inherit spectator flight');
state=simulation.step('creative-flight',input('creative-flight',6));
assert.equal(state.flying,true,'creative can enable flight again after returning from spectator');

assert.equal(simulation.toggleFlight('creative-flight').flying,false,'explicit server toggle helper follows the same creative state rule');
simulation.setMode('creative-flight','survival');
const ignored=simulation.toggleFlight('creative-flight');
assert.equal(ignored.changed,false);assert.equal(ignored.flying,false);assert.equal(ignored.reason,'mode-not-creative');

simulation.removeSession('creative-flight');
assert.equal(simulation.sessionCount,0);
console.log('server-owned creative flight state + toggle-sequence idempotence: PASS');
