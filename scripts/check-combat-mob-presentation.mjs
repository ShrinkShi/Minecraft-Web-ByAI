import assert from 'node:assert/strict';
import {
  DAYLIGHT_BURN_DAMAGE,DAYLIGHT_BURN_INTERVAL_SECONDS,DAYLIGHT_IGNITION_SECONDS,MOB_HURT_FLASH_SECONDS,
  creeperFuseVisual,isDaylightBurnTime,mobHitVisual,normalizedDayTime,stepDaylightBurn,undeadExposedToDaylight
} from '../src/combat-mob-presentation-rules.js';

assert.equal(DAYLIGHT_BURN_DAMAGE,1);assert.equal(DAYLIGHT_BURN_INTERVAL_SECONDS,1);assert.equal(DAYLIGHT_IGNITION_SECONDS,4);assert.equal(MOB_HURT_FLASH_SECONDS,.18);
assert.equal(normalizedDayTime(25000),1000);assert.equal(normalizedDayTime(-1),23999);assert.equal(isDaylightBurnTime(1000),true);assert.equal(isDaylightBurnTime(11999),true);assert.equal(isDaylightBurnTime(12000),false);assert.equal(isDaylightBurnTime(18000),false);

const exposed={type:'zombie',gameTime:6000,weather:'clear',headSubmerged:false,headY:12,highestSolidY:10};
assert.equal(undeadExposedToDaylight(exposed),true);
assert.equal(undeadExposedToDaylight({...exposed,type:'skeleton'}),true);
assert.equal(undeadExposedToDaylight({...exposed,type:'creeper'}),false);
assert.equal(undeadExposedToDaylight({...exposed,weather:'rain'}),false);
assert.equal(undeadExposedToDaylight({...exposed,weather:'thunder'}),false);
assert.equal(undeadExposedToDaylight({...exposed,headSubmerged:true}),false);
assert.equal(undeadExposedToDaylight({...exposed,highestSolidY:12}),false);

let burn=stepDaylightBurn({remaining:0,untilDamage:0},{dt:.1,exposed:true});
assert.equal(burn.burning,true);assert.equal(burn.remaining,4);assert.equal(burn.damageEvents,0,'sunlight ignition must not deal damage on the first simulation tick');assert.ok(Math.abs(burn.untilDamage-.9)<1e-9);
burn=stepDaylightBurn(burn,{dt:.89,exposed:true});assert.equal(burn.damageEvents,0);burn=stepDaylightBurn(burn,{dt:.02,exposed:true});assert.equal(burn.damageEvents,1,'burning must deal damage on the one-second cadence');
burn=stepDaylightBurn(burn,{dt:.1,exposed:false,wet:true});assert.deepEqual(burn,{remaining:0,untilDamage:0,burning:false,damageEvents:0},'rain/water must extinguish daylight fire immediately');

const hit=mobHitVisual(MOB_HURT_FLASH_SECONDS);assert.equal(hit.strength,1);assert.equal(hit.red,1);assert.ok(hit.scale>1.08);assert.deepEqual(mobHitVisual(0),{strength:0,scale:1,red:0});
const idleFuse=creeperFuseVisual(0,0),lateFuse=creeperFuseVisual(1,.1);assert.equal(idleFuse.scale,1);assert.equal(idleFuse.white,0);assert.ok(lateFuse.scale>=1.2,'primed creeper must visibly enlarge');assert.ok(lateFuse.white>0,'late fuse must visibly flash white');

console.log('daylight undead burn + hit flash + creeper fuse presentation rules: PASS');
