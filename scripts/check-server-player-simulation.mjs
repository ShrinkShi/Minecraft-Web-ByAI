import assert from 'node:assert/strict';
import {SERVER_PLAYER_TICK_RATE,SERVER_PLAYER_TICK_DT,SERVER_PLAYER_MODES,ServerPlayerSimulation} from '../server/player-simulation.mjs';

const close=(actual,expected,epsilon=1e-10,label='value')=>assert.ok(Math.abs(actual-expected)<=epsilon,`${label}: expected ${expected}, got ${actual}`);
const floorEnvironment={isSolidBlock:(_x,y)=>y<=0,isLiquidBlock:()=>false};
const control=(overrides={})=>({version:1,side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false,sequence:1,...overrides});
const view=(yaw=0,pitch=0)=>({yaw,pitch,sequence:1});
const input=(session,controlState=null,viewState=null,extras={})=>({session,control:controlState,view:viewState,selectedSlot:0,pendingActionCount:0,retainedViewCount:viewState?1:0,...extras});

assert.equal(SERVER_PLAYER_TICK_RATE,20);assert.equal(SERVER_PLAYER_TICK_DT,.05);assert.deepEqual(SERVER_PLAYER_MODES,['survival','adventure','creative','spectator']);

const sim=new ServerPlayerSimulation(floorEnvironment);assert.equal(sim.sessionCount,0);
let state=sim.addSession('player-1',{position:{x:.5,y:1.001,z:.5}});assert.equal(sim.sessionCount,1);assert.deepEqual(state,{session:'player-1',tick:0,position:{x:.5,y:1.001,z:.5},velocity:{x:0,y:0,z:0},yaw:0,pitch:0,mode:'survival',flying:false,grounded:false,swimCoverage:0,voided:false});
assert.throws(()=>sim.addSession('player-1',{position:{x:0,y:1,z:0}}),/already exists/);

state=sim.step('player-1');assert.equal(state.tick,1);close(state.position.y,1.001);assert.equal(state.grounded,true,'gravity step collides with flat floor and marks grounded');assert.equal(state.velocity.y,0);

for(let i=0;i<20;i++)state=sim.step('player-1',input('player-1',control({forward:1}),view(0,0)));
close(state.position.x,.5);close(state.position.z,.5-4.3,1e-9,'20 fixed ticks walk exactly one second at 4.3 blocks/s');assert.equal(state.tick,21);

const turned=sim.addSession('turned',{position:{x:.5,y:1.001,z:.5}});assert.equal(turned.yaw,0);
let turnedState=sim.step('turned',input('turned',control({forward:1}),view(Math.PI/2,0)));close(turnedState.position.x,.5-4.3*.05,1e-10,'yaw +90 W moves -X');close(turnedState.position.z,.5);close(turnedState.yaw,Math.PI/2);

const jumper=sim.addSession('jumper',{position:{x:.5,y:1.001,z:.5}});let jumped=sim.step('jumper',input('jumper',control({jump:true}),view()));close(jumped.velocity.y,8.2);close(jumped.position.y,1.001+8.2*.05);assert.equal(jumped.grounded,false);const jumpedAgain=sim.step('jumper',input('jumper',control({jump:true}),view()));assert.ok(jumpedAgain.velocity.y<8.2,'holding jump in air does not reapply grounded jump velocity');

const wallEnvironment={isSolidBlock:(x,y)=>y<=0||(x===1&&y>=1&&y<=2),isLiquidBlock:()=>false};const wallSim=new ServerPlayerSimulation(wallEnvironment);wallSim.addSession('wall',{position:{x:.5,y:1.001,z:.5}});const wall=wallSim.step('wall',input('wall',control({side:1}),view()));close(wall.position.x,.5,1e-12,'wall collision blocks D before player AABB penetrates x=1');assert.equal(wall.velocity.x,0);assert.equal(wall.grounded,true);

const waterEnvironment={isSolidBlock:()=>false,isLiquidBlock:()=>true};const waterSim=new ServerPlayerSimulation(waterEnvironment);waterSim.addSession('swimmer',{position:{x:.5,y:5,z:.5}});const swimmer=waterSim.step('swimmer',input('swimmer',control({forward:1}),view()));assert.equal(swimmer.swimCoverage,1);close(swimmer.position.z,.5-(4.3*.5*.05),1e-10,'full water coverage halves horizontal walking speed');assert.ok(swimmer.velocity.y>0,'full water applies buoyancy through shared swim rules');assert.ok(swimmer.position.y>5);

const creativeSim=new ServerPlayerSimulation(wallEnvironment);const creativeInitial=creativeSim.addSession('creative',{position:{x:.5,y:1.001,z:.5},mode:'creative'});assert.equal(creativeInitial.flying,false,'creative starts grounded until an explicit flight toggle');const creative=creativeSim.step('creative',input('creative',control({side:1,jump:true}),view(),{flightToggleSequence:1}));assert.equal(creative.flying,true);close(creative.position.x,.5,1e-12,'creative flight still respects solid collision');close(creative.position.y,1.001+7*.05);assert.deepEqual(creative.velocity,{x:0,y:0,z:0});
const spectatorSim=new ServerPlayerSimulation(wallEnvironment);spectatorSim.addSession('spectator',{position:{x:.5,y:1.001,z:.5},mode:'spectator'});const spectator=spectatorSim.step('spectator',input('spectator',control({side:1,jump:true}),view()));assert.equal(spectator.flying,true);assert.ok(spectator.position.x>.5,'spectator bypasses solid collision');close(spectator.position.y,1.001+7*.05);

const modeSim=new ServerPlayerSimulation(floorEnvironment);modeSim.addSession('mode',{position:{x:.5,y:1.001,z:.5}});assert.equal(modeSim.setMode('mode','creative').flying,false);assert.equal(modeSim.setFlying('mode',true).flying,true);assert.equal(modeSim.setMode('mode','survival').flying,false);assert.throws(()=>modeSim.setMode('mode','builder'),/unsupported server player mode/);

const voidSim=new ServerPlayerSimulation({isSolidBlock:()=>false,isLiquidBlock:()=>false});voidSim.addSession('void',{position:{x:0,y:-10.01,z:0}});assert.equal(voidSim.step('void').voided,true,'simulation reports void boundary but does not invent health/death authority');

const clone=sim.snapshot('player-1');clone.position.x=999;clone.velocity.y=999;assert.notEqual(sim.snapshot('player-1').position.x,999);assert.notEqual(sim.snapshot('player-1').velocity.y,999);
assert.equal(sim.hasSession('player-1'),true);assert.equal(sim.removeSession('player-1'),true);assert.equal(sim.hasSession('player-1'),false);assert.equal(sim.snapshot('player-1'),null);assert.equal(sim.removeSession('player-1'),false);

const all=new ServerPlayerSimulation(floorEnvironment);all.addSession('a',{position:{x:.5,y:1.001,z:.5}});all.addSession('b',{position:{x:2.5,y:1.001,z:.5}});const providerCalls=[];const stepped=all.stepAll(session=>(providerCalls.push(session),input(session,control({forward:1}),view())));assert.deepEqual(providerCalls,['a','b']);assert.equal(stepped.length,2);assert.equal(stepped.every(player=>player.tick===1),true);

assert.throws(()=>new ServerPlayerSimulation(null),/environment must be an object/);assert.throws(()=>new ServerPlayerSimulation({isSolidBlock:()=>false}),/environment.isLiquidBlock must be a function/);assert.throws(()=>sim.addSession('bad',{position:{x:0,y:NaN,z:0}}),/position.y/);assert.throws(()=>sim.addSession('bad',{position:{x:0,y:1,z:0},mode:'builder'}),/unsupported server player mode/);assert.throws(()=>sim.step('missing'),/unknown server player session/);assert.throws(()=>all.step('a',input('wrong',control(),view())),/does not match simulation session/);assert.throws(()=>all.step('a',input('a',control(),view(0,2))),/pitch is out of range/);assert.throws(()=>all.stepAll(null),/inputProvider must be a function/);

console.log('fixed-step authoritative server player simulation foundation: PASS');
