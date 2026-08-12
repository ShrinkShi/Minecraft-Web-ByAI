import assert from 'node:assert/strict';
import {WEATHER_MAX_SEGMENTS,WEATHER_TYPES,WEATHER_PROFILES,precipitationProfile} from '../src/weather-rules.js';

assert.equal(WEATHER_MAX_SEGMENTS,720);assert.deepEqual([...WEATHER_TYPES],['clear','rain','thunder']);
const clear=precipitationProfile('clear');const rain=precipitationProfile('rain');const thunder=precipitationProfile('thunder');
assert.equal(clear.count,0);assert.equal(clear.opacity,0);assert.equal(clear.fallSpeed,0);
assert.equal(rain.count,Math.floor(720*.62));assert.ok(rain.count>0);assert.ok(rain.fallSpeed>0);assert.ok(rain.length>0);assert.ok(rain.opacity>0&&rain.opacity<1);
assert.equal(thunder.count,720);assert.ok(thunder.count>rain.count);assert.ok(thunder.fallSpeed>rain.fallSpeed);assert.ok(thunder.length>rain.length);assert.ok(thunder.opacity>rain.opacity);
assert.ok(Math.hypot(thunder.windX,thunder.windZ)>Math.hypot(rain.windX,rain.windZ));
assert.deepEqual(precipitationProfile('rain',10),{type:'rain',...WEATHER_PROFILES.rain,count:6,maxSegments:10});
assert.deepEqual(precipitationProfile('thunder',1),{type:'thunder',...WEATHER_PROFILES.thunder,count:1,maxSegments:1});
assert.throws(()=>precipitationProfile('snow'),RangeError);assert.throws(()=>precipitationProfile('rain',0),RangeError);assert.throws(()=>precipitationProfile('rain',1.5),RangeError);

console.log('weather precipitation checks: PASS');
