import assert from 'node:assert/strict';
import {ServerPlayerSimulation} from '../server/player-simulation.mjs';

const simulation=new ServerPlayerSimulation({
  isSolidBlock:(x,y,z)=>x===1&&y===0&&z===0,
  isLiquidBlock:(x,y,z)=>x===0&&y===0&&z===0
});
const session='water-exit-session';
simulation.addSession(session,{position:{x:.69,y:.4,z:.5},mode:'survival'});
const before=simulation.snapshot(session);
const after=simulation.step(session,{session,control:{side:1,forward:0,jump:true,sneak:false,sprint:false,primary:false}});
assert.equal(before.position.x,.69);
assert.ok(after.swimCoverage>0,'test player must begin the authoritative tick in water');
assert.ok(after.position.x>.7,'jumping toward shore must advance past the blocking bank face');
assert.ok(after.position.y>=1,'water-edge assist must raise the authoritative player onto the shoreline');
assert.equal(after.tick,1);

console.log('authoritative server movement preserves water-edge step-out parity: PASS');
