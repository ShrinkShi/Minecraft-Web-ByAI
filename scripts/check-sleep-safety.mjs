import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SLEEP_MONSTER_HORIZONTAL,SLEEP_MONSTER_VERTICAL,isSleepBlockingPosition,firstSleepBlocker} from '../src/sleep-safety-rules.js';

assert.equal(SLEEP_MONSTER_HORIZONTAL,8);assert.equal(SLEEP_MONSTER_VERTICAL,5);
const bed={x:10.5,y:65,z:-4.5};
assert.equal(isSleepBlockingPosition(bed,{x:18.5,y:70,z:3.5}),true,'inclusive +8/+5/+8 boundary blocks sleep');
assert.equal(isSleepBlockingPosition(bed,{x:18.5001,y:65,z:-4.5}),false);assert.equal(isSleepBlockingPosition(bed,{x:10.5,y:70.0001,z:-4.5}),false);assert.equal(isSleepBlockingPosition(bed,{x:10.5,y:65,z:-12.5001}),false);
assert.equal(isSleepBlockingPosition(bed,{x:2.5,y:60,z:-12.5}),true,'inclusive negative boundary blocks sleep');
assert.equal(isSleepBlockingPosition(bed,{x:18.4,y:69.9,z:-12.4}),true,'sleep check is an axis-aligned X/Z/Y box, not a radial sphere');
assert.equal(isSleepBlockingPosition(bed,{x:19,y:65,z:-4.5},{horizontal:9,vertical:5}),true);
assert.throws(()=>isSleepBlockingPosition(bed,{x:0,y:NaN,z:0}),/finite/);assert.throws(()=>isSleepBlockingPosition(bed,{x:0,y:0,z:0},{horizontal:-1}),/>= 0/);
const monsters=[{id:1,type:'zombie',position:{x:30,y:65,z:-4.5}},{id:2,type:'spider',position:{x:17,y:64,z:-5}}];
assert.equal(firstSleepBlocker(bed,monsters)?.id,2);assert.equal(firstSleepBlocker(bed,[monsters[0]]),null);assert.throws(()=>firstSleepBlocker(bed,null),/iterable/);

const hostile=readFileSync(new URL('../src/hostile-mobs.js',import.meta.url),'utf8'),main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),commands=readFileSync(new URL('../src/commands.js',import.meta.url),'utf8');
for(const token of ['sleepBlockerNear','firstSleepBlocker','SLEEP_MONSTER_HORIZONTAL'])assert.ok(hostile.includes(token),`hostile sleep query missing ${token}`);
for(const token of ['hostileMobs?.sleepBlockerNear','附近有怪物，无法睡觉'])assert.ok(main.includes(token),`main sleep guard missing ${token}`);
assert.ok(commands.includes("name==='summon'"),'commands must expose a deterministic user-facing summon path for current hostile mobs');
console.log('bed hostile-monster sleep safety contracts: PASS');
