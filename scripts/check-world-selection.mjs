import assert from 'node:assert/strict';
import {suggestWorldName,worldModeLabel} from '../src/world-selection.js';

assert.equal(worldModeLabel('survival'),'生存模式');
assert.equal(worldModeLabel('creative'),'创造模式');
assert.equal(worldModeLabel('spectator'),'spectator');
assert.equal(suggestWorldName([]),'新的世界');
assert.equal(suggestWorldName([{name:'新的世界'}]),'新的世界 (2)');
assert.equal(suggestWorldName([{name:'新的世界'},{name:'新的世界 (2)'},{name:'新的世界 (4)'}]),'新的世界 (3)');

console.log('world selection labels + unique new-world naming: PASS');
