import assert from 'node:assert/strict';
import {SURVIVAL_STATUS_HUD_MODES,showsSurvivalStatusHud} from '../src/hud-presentation-rules.js';

assert.deepEqual(SURVIVAL_STATUS_HUD_MODES,['survival','adventure']);
assert.equal(showsSurvivalStatusHud('survival'),true);
assert.equal(showsSurvivalStatusHud('adventure'),true);
for(const mode of ['creative','spectator','unknown','',null,undefined])assert.equal(showsSurvivalStatusHud(mode),false,`${String(mode)} should not show survival status HUD`);

console.log('HUD presentation rules OK');
