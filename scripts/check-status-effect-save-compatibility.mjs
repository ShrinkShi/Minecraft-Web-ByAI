import assert from 'node:assert/strict';
import {TERRAIN_GENERATOR_VERSION} from '../src/terrain-generator.js';
import {SINGLEPLAYER_SAVE_VERSION,resolveSingleplayerTerrainVersion} from '../src/world-save-compatibility.js';
import {normalizeStatusEffects} from '../src/status-effect-rules.js';

assert.equal(SINGLEPLAYER_SAVE_VERSION,10,'persisted active status effects require save schema v10');
assert.equal(TERRAIN_GENERATOR_VERSION,4,'status-effect persistence must not bump terrain generation');
assert.equal(resolveSingleplayerTerrainVersion({version:9,terrainVersion:4}),4,'v9 worlds remain pinned to their recorded terrain version');
assert.equal(resolveSingleplayerTerrainVersion({version:10,terrainVersion:4}),4,'v10 worlds use the same terrain v4 contract');
assert.deepEqual(normalizeStatusEffects(undefined),[],'v9 player snapshots without statusEffects migrate to an empty active-effect list');
assert.deepEqual(normalizeStatusEffects([{id:'hunger',amplifier:0,remainingSeconds:17.5}]),[{id:'hunger',amplifier:0,remainingSeconds:17.5}]);
assert.throws(()=>resolveSingleplayerTerrainVersion({version:9}),/missing terrainVersion/);
assert.throws(()=>resolveSingleplayerTerrainVersion({version:10}),/missing terrainVersion/);

console.log('status-effect save v10 / terrain v4 compatibility: PASS');
