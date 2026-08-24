import assert from 'node:assert/strict';
import {CREATIVE_FLIGHT_DOUBLE_PRESS_MS,CreativeFlightToggleDetector,canToggleCreativeFlight,normalizeFlyingForMode,toggleCreativeFlightState} from '../src/creative-flight-rules.js';

assert.equal(CREATIVE_FLIGHT_DOUBLE_PRESS_MS,300);
assert.equal(normalizeFlyingForMode('survival',true),false);
assert.equal(normalizeFlyingForMode('adventure',true),false);
assert.equal(normalizeFlyingForMode('creative',false),false);
assert.equal(normalizeFlyingForMode('creative',true),true);
assert.equal(normalizeFlyingForMode('spectator',false),true);
assert.equal(canToggleCreativeFlight('creative'),true);
assert.equal(canToggleCreativeFlight('survival'),false);
assert.deepEqual(toggleCreativeFlightState('creative',false),{changed:true,flying:true,reason:'flight-enabled'});
assert.deepEqual(toggleCreativeFlightState('creative',true),{changed:true,flying:false,reason:'flight-disabled'});
assert.deepEqual(toggleCreativeFlightState('survival',true),{changed:false,flying:false,reason:'mode-not-creative'});
assert.deepEqual(toggleCreativeFlightState('spectator',false),{changed:false,flying:true,reason:'mode-not-creative'});

const detector=new CreativeFlightToggleDetector();
assert.deepEqual(detector.press(1000,'creative'),{toggle:false,reason:'armed'});
assert.deepEqual(detector.press(1000+CREATIVE_FLIGHT_DOUBLE_PRESS_MS,'creative'),{toggle:true,reason:'double-press'});
assert.deepEqual(detector.press(2000,'creative'),{toggle:false,reason:'armed'});
assert.deepEqual(detector.press(2000+CREATIVE_FLIGHT_DOUBLE_PRESS_MS+1,'creative'),{toggle:false,reason:'armed'});
assert.deepEqual(detector.press(3000,'survival'),{toggle:false,reason:'mode-not-creative'});
assert.deepEqual(detector.press(3010,'creative'),{toggle:false,reason:'armed'},'non-creative presses must not arm creative flight');
assert.deepEqual(detector.press(3000,'creative'),{toggle:false,reason:'clock-reset'});
assert.throws(()=>normalizeFlyingForMode('invalid',false),/unsupported player mode/);
assert.throws(()=>detector.press(-1,'creative'),/timestamp/);

console.log('creative flight mode and double-jump rules: PASS');
