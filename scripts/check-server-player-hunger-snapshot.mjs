import assert from 'node:assert/strict';
import {decodeServerPlayerHungerSnapshot,encodeServerPlayerHungerSnapshot,isCompatibleServerPlayerHungerSnapshot,SERVER_PLAYER_HUNGER_SNAPSHOT_KIND,SERVER_PLAYER_HUNGER_SNAPSHOT_VERSION} from '../src/server-player-hunger-snapshot.js';

const session='session-hunger-wire';
const encoded=encodeServerPlayerHungerSnapshot({session,revision:7,mode:'survival',difficulty:'normal',naturalRegeneration:true,food:17,saturation:2.5,exhaustion:.75,timer:1.25,statusEffects:[{id:'hunger',amplifier:0,remainingSeconds:12}],foodUse:{active:true,itemId:'rotten_flesh',elapsed:.8,duration:1.6}});
assert.deepEqual(Object.keys(encoded).sort(),['difficulty','exhaustion','food','foodUse','kind','mode','naturalRegeneration','revision','saturation','session','statusEffects','timer','v']);
assert.equal(encoded.v,SERVER_PLAYER_HUNGER_SNAPSHOT_VERSION);assert.equal(encoded.kind,SERVER_PLAYER_HUNGER_SNAPSHOT_KIND);assert.equal(encoded.foodUse.progress,.5);
const decoded=decodeServerPlayerHungerSnapshot(encoded,{expectedSession:session});
assert.equal(decoded.version,1);assert.equal(decoded.food,17);assert.equal(decoded.saturation,2.5);assert.deepEqual(decoded.statusEffects,[{id:'hunger',amplifier:0,remainingSeconds:12}]);assert.equal(decoded.foodUse.itemId,'rotten_flesh');assert.equal(decoded.foodUse.progress,.5);
assert.equal(isCompatibleServerPlayerHungerSnapshot(encoded,{expectedSession:session}),true);
assert.equal(isCompatibleServerPlayerHungerSnapshot({...encoded,debug:true}),false,'wire must reject unexpected top-level fields');
assert.equal(isCompatibleServerPlayerHungerSnapshot({...encoded,foodUse:{...encoded.foodUse,debug:true}}),false,'wire must reject unexpected nested food-use fields');
assert.equal(isCompatibleServerPlayerHungerSnapshot({...encoded,statusEffects:[{...encoded.statusEffects[0],debug:true}]}),false,'wire must reject unexpected effect fields');
assert.throws(()=>decodeServerPlayerHungerSnapshot({...encoded,v:2}),/unsupported server player hunger snapshot version/);
assert.throws(()=>decodeServerPlayerHungerSnapshot(encoded,{expectedSession:'session-other'}),/session mismatch/);
assert.throws(()=>encodeServerPlayerHungerSnapshot({...encoded,difficulty:'nightmare'}),/difficulty/);
assert.throws(()=>encodeServerPlayerHungerSnapshot({...encoded,naturalRegeneration:1}),/must be boolean/);
console.log('strict authoritative player hunger snapshot + food-use/effect wire: PASS');
