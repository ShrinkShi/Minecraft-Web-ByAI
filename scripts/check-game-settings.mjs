import assert from 'node:assert/strict';
import {DIFFICULTIES,UI_SCALES,DEFAULT_GAME_SETTINGS,difficultyDamageMultiplier,hostileSpawningAllowed,normalizeGameSettings,scaleDifficultyDamage} from '../src/game-settings.js';

assert.deepEqual(DIFFICULTIES,['peaceful','easy','normal','hard']);
assert.deepEqual(UI_SCALES,[.75,1,1.25,1.5,2]);
assert.deepEqual(normalizeGameSettings({uiScale:1.47,difficulty:'hard'}),{uiScale:1.5,difficulty:'hard'});
assert.deepEqual(normalizeGameSettings({uiScale:'bad',difficulty:'unknown'}),DEFAULT_GAME_SETTINGS);
assert.equal(difficultyDamageMultiplier('peaceful'),0);
assert.equal(difficultyDamageMultiplier('easy'),.5);
assert.equal(difficultyDamageMultiplier('normal'),1);
assert.equal(difficultyDamageMultiplier('hard'),1.5);
assert.equal(hostileSpawningAllowed('peaceful'),false);
assert.equal(hostileSpawningAllowed('hard'),true);
assert.equal(scaleDifficultyDamage(4,'easy'),2);
assert.equal(scaleDifficultyDamage(4,'hard'),6);
assert.throws(()=>scaleDifficultyDamage(-1,'normal'),/non-negative/);
console.log('game settings checks passed');
