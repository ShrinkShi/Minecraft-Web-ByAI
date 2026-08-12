import assert from 'node:assert/strict';
import {DAY_TICKS,SLEEP_START,SLEEP_END,RAIN_SLEEP_START,RAIN_SLEEP_END,MORNING_TIME,MAX_SLEEP_PERCENTAGE,normalizeDayTime,isSleepTime,requiredSleepers,resolveSleep} from '../src/sleep-rules.js';

assert.equal(DAY_TICKS,24000);assert.equal(MORNING_TIME,1000);assert.equal(MAX_SLEEP_PERCENTAGE,0x7fffffff);
assert.equal(normalizeDayTime(24000),0);assert.equal(normalizeDayTime(-1),23999);assert.equal(normalizeDayTime(48042.9),42);assert.throws(()=>normalizeDayTime(NaN),/finite/);
assert.equal(isSleepTime(SLEEP_START-1,'clear'),false);assert.equal(isSleepTime(SLEEP_START,'clear'),true);assert.equal(isSleepTime(SLEEP_END-1,'clear'),true);assert.equal(isSleepTime(SLEEP_END,'clear'),false);
assert.equal(isSleepTime(RAIN_SLEEP_START-1,'rain'),false);assert.equal(isSleepTime(RAIN_SLEEP_START,'rain'),true);assert.equal(isSleepTime(RAIN_SLEEP_END-1,'rain'),true);assert.equal(isSleepTime(RAIN_SLEEP_END,'rain'),false);assert.equal(isSleepTime(6000,'rain'),false);
assert.equal(isSleepTime(6000,'thunder'),true,'thunder permits sleeping outside normal night window');assert.throws(()=>isSleepTime(13000,'hail'),/unknown sleep weather/);
assert.equal(requiredSleepers(1),1);assert.equal(requiredSleepers(4,100),4);assert.equal(requiredSleepers(4,50),2);assert.equal(requiredSleepers(3,34),2);assert.equal(requiredSleepers(20,0),1);assert.equal(requiredSleepers(4,101),5,'over-100 gamerule values make the quorum impossible rather than invalid');assert.equal(requiredSleepers(1,MAX_SLEEP_PERCENTAGE),21474837);assert.throws(()=>requiredSleepers(0),/positive integer/);assert.throws(()=>requiredSleepers(2,1.5),/32-bit integer/);assert.throws(()=>requiredSleepers(2,MAX_SLEEP_PERCENTAGE+1),/32-bit integer/);
const day=resolveSleep({gameTime:6000,weather:'clear'});assert.equal(day.allowed,false);assert.equal(day.ready,false);assert.equal(day.reason,'daytime');
const rainyEdge=resolveSleep({gameTime:RAIN_SLEEP_START,weather:'rain'});assert.equal(rainyEdge.allowed,true);assert.equal(rainyEdge.ready,true);
const solo=resolveSleep({gameTime:13000,weather:'clear'});assert.equal(solo.allowed,true);assert.equal(solo.ready,true);assert.equal(solo.nextTime,1000);assert.equal(solo.required,1);
const waiting=resolveSleep({gameTime:18000,sleepingPlayers:1,totalPlayers:4,percentage:50});assert.equal(waiting.allowed,true);assert.equal(waiting.ready,false);assert.equal(waiting.required,2);assert.equal(waiting.reason,'waiting');
const quorum=resolveSleep({gameTime:18000,sleepingPlayers:2,totalPlayers:4,percentage:50});assert.equal(quorum.ready,true);assert.equal(quorum.nextTime,MORNING_TIME);
const impossible=resolveSleep({gameTime:18000,sleepingPlayers:4,totalPlayers:4,percentage:101});assert.equal(impossible.allowed,true);assert.equal(impossible.ready,false);assert.equal(impossible.required,5);
const thunder=resolveSleep({gameTime:6000,weather:'thunder',sleepingPlayers:1,totalPlayers:3,percentage:33});assert.equal(thunder.ready,true);assert.equal(thunder.required,1);
assert.throws(()=>resolveSleep({gameTime:13000,sleepingPlayers:3,totalPlayers:2}),/within the player count/);
console.log('sleep time + multiplayer-ready quorum rules: PASS');
