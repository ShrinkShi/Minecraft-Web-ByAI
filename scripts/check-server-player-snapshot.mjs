import assert from 'node:assert/strict';
import {
  SERVER_PLAYER_SNAPSHOT_VERSION,
  SERVER_PLAYER_SNAPSHOT_KIND,
  SERVER_PLAYER_SNAPSHOT_MODES,
  encodeServerPlayerSnapshot,
  decodeServerPlayerSnapshot,
  isCompatibleServerPlayerSnapshot
} from '../src/server-player-snapshot.js';

assert.equal(SERVER_PLAYER_SNAPSHOT_VERSION,2);assert.equal(SERVER_PLAYER_SNAPSHOT_KIND,'player-snapshot');assert.deepEqual(SERVER_PLAYER_SNAPSHOT_MODES,['survival','adventure','creative','spectator']);

const state={session:'snapshot-session',tick:42,position:{x:1.25,y:64.001,z:-3.5},velocity:{x:.1,y:-1.2,z:4},yaw:Math.PI*3,pitch:-.4,mode:'survival',flying:false,grounded:true,swimCoverage:1/3,voided:false};
const wire=encodeServerPlayerSnapshot(state);
assert.deepEqual(wire,{v:SERVER_PLAYER_SNAPSHOT_VERSION,kind:'player-snapshot',session:'snapshot-session',tick:42,position:[1.25,64.001,-3.5],velocity:[.1,-1.2,4],yaw:-Math.PI,pitch:-.4,mode:'survival',flying:false,grounded:true,swimCoverage:1/3,voided:false},'encoder preserves authoritative flight state in the strict wire shape');
const decoded=decodeServerPlayerSnapshot(wire,{expectedSession:'snapshot-session'});assert.deepEqual(decoded,{version:SERVER_PLAYER_SNAPSHOT_VERSION,kind:'player-snapshot',session:'snapshot-session',tick:42,position:{x:1.25,y:64.001,z:-3.5},velocity:{x:.1,y:-1.2,z:4},yaw:-Math.PI,pitch:-.4,mode:'survival',flying:false,grounded:true,swimCoverage:1/3,voided:false});
assert.equal(isCompatibleServerPlayerSnapshot(wire,{expectedSession:'snapshot-session'}),true);assert.equal(isCompatibleServerPlayerSnapshot(wire,{expectedSession:'other'}),false);

const flying=encodeServerPlayerSnapshot({...state,tick:43,mode:'creative',flying:true,grounded:false});assert.equal(decodeServerPlayerSnapshot(flying).flying,true,'creative flight state survives encode/decode');
const wrap=encodeServerPlayerSnapshot({...state,tick:0xffffffff,yaw:0,mode:'spectator',flying:true,grounded:false,swimCoverage:0,voided:true});assert.equal(decodeServerPlayerSnapshot(wrap).tick,0xffffffff);assert.equal(decodeServerPlayerSnapshot(wrap).mode,'spectator');assert.equal(decodeServerPlayerSnapshot(wrap).flying,true);assert.equal(decodeServerPlayerSnapshot(wrap).voided,true);

assert.throws(()=>decodeServerPlayerSnapshot({...wire,extra:true}),/unexpected fields/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,v:1}),/unsupported server player snapshot version/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,kind:'entity-snapshot'}),/unsupported server realtime message kind/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,session:'other'},{expectedSession:'snapshot-session'}),/session mismatch/);
assert.throws(()=>decodeServerPlayerSnapshot({...wire,tick:-1}),/tick must be uint32/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,tick:0x100000000}),/tick must be uint32/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,position:[1,2]}),/three numbers/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,position:[1,NaN,3]}),/finite number/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,velocity:[0,Infinity,0]}),/finite number/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,yaw:Math.PI}),/yaw must be canonical/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,pitch:2}),/pitch is out of range/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,mode:'builder'}),/unsupported player snapshot mode/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,flying:1}),/flying must be boolean/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,grounded:1}),/grounded must be boolean/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,swimCoverage:1.01}),/between 0 and 1/);assert.throws(()=>decodeServerPlayerSnapshot({...wire,voided:0}),/voided must be boolean/);
assert.throws(()=>encodeServerPlayerSnapshot({...state,session:''}),/session/);assert.throws(()=>encodeServerPlayerSnapshot({...state,tick:1.2}),/tick must be uint32/);assert.throws(()=>encodeServerPlayerSnapshot({...state,position:{x:0,y:'64',z:0}}),/position.y/);assert.throws(()=>encodeServerPlayerSnapshot({...state,pitch:-2}),/pitch is out of range/);assert.throws(()=>encodeServerPlayerSnapshot({...state,mode:'builder'}),/unsupported player snapshot mode/);assert.throws(()=>encodeServerPlayerSnapshot({...state,flying:null}),/flying must be boolean/);

console.log('strict self-authoritative server player snapshot v2 + flight wire contracts: PASS');
