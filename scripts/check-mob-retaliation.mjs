import assert from 'node:assert/strict';
import {retaliationTargetId,shouldRetaliateAgainstProjectile} from '../src/mob-retaliation-rules.js';

assert.equal(shouldRetaliateAgainstProjectile('zombie','skeleton'),true);
assert.equal(shouldRetaliateAgainstProjectile('spider','skeleton'),true);
assert.equal(shouldRetaliateAgainstProjectile('creeper','skeleton'),false);
assert.equal(shouldRetaliateAgainstProjectile('zombie','zombie'),false);
assert.equal(retaliationTargetId({victimType:'zombie',attackerType:'skeleton',attackerId:7}),7);
assert.equal(retaliationTargetId({victimType:'spider',attackerType:'skeleton',attackerId:2}),2);
assert.equal(retaliationTargetId({victimType:'creeper',attackerType:'skeleton',attackerId:7}),null);
assert.equal(retaliationTargetId({victimType:'zombie',attackerType:'skeleton',attackerId:null}),null);
console.log('mob retaliation checks passed');
