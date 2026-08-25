import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  HOSTILE_TARGETABLE_PLAYER_MODES,
  canHostileMobTargetPlayer,
  clearHostileMobTargetState
} from '../src/hostile-target-rules.js';

assert.equal(Object.isFrozen(HOSTILE_TARGETABLE_PLAYER_MODES),true);
assert.deepEqual(HOSTILE_TARGETABLE_PLAYER_MODES,['survival','adventure']);
assert.equal(canHostileMobTargetPlayer({mode:'survival'}),true);
assert.equal(canHostileMobTargetPlayer({mode:'adventure'}),true);
assert.equal(canHostileMobTargetPlayer({mode:'creative'}),false);
assert.equal(canHostileMobTargetPlayer({mode:'spectator'}),false);
assert.equal(canHostileMobTargetPlayer({mode:'CREATIVE'}),false,'unknown/corrupt mode values must fail closed');
assert.equal(canHostileMobTargetPlayer({}),false);
assert.equal(canHostileMobTargetPlayer(null),false);

const primed={fuse:1.25,fuseWasActive:true,pushX:3.5,pushZ:-2.25,attackTimer:.4,strafeDir:-1,strafeTimer:.8,hurtPulse:.12};
assert.equal(clearHostileMobTargetState(primed),true);
assert.deepEqual(primed,{fuse:0,fuseWasActive:false,pushX:3.5,pushZ:-2.25,attackTimer:.4,strafeDir:-1,strafeTimer:.8,hurtPulse:.12},'dropping a target must cancel creeper fuse without freezing unrelated simulation state');
assert.equal(clearHostileMobTargetState(primed),false,'clearing an already idle target state should be idempotent');
assert.equal(clearHostileMobTargetState(null),false);

const runtimeSource=readFileSync(new URL('../src/hostile-mobs.js',import.meta.url),'utf8');
assert.match(runtimeSource,/import \{canHostileMobTargetPlayer,clearHostileMobTargetState\} from '\.\/hostile-target-rules\.js';/);
const gateIndex=runtimeSource.indexOf('const targetable=canHostileMobTargetPlayer(player)');
const fuseIndex=runtimeSource.indexOf('this.updateFuse(record,def,state,position,planar,vertical,dt)',gateIndex);
const clearIndex=runtimeSource.indexOf('else clearHostileMobTargetState(state)',gateIndex);
const pushIndex=runtimeSource.indexOf('const pushDrag=Math.exp(-8*dt)',gateIndex);
const attackIndex=runtimeSource.indexOf('if(targetable)this.attack(record,def,state,position,player,planar,vertical)',gateIndex);
assert.ok(gateIndex>=0&&fuseIndex>gateIndex&&clearIndex>gateIndex&&pushIndex>clearIndex&&attackIndex>pushIndex,'hostile runtime must gate target-driven fuse/movement/attack while leaving push decay after target cancellation');
assert.match(runtimeSource,/if\(targetable&&\(def\.attackStyle==='ranged'\|\|def\.attackStyle==='fuse'\)&&planar>\.01\)/,'ranged/fuse mobs must not keep facing an ineligible player target');

console.log('hostile mob player target eligibility: PASS');
