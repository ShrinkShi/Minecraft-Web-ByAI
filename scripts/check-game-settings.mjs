import assert from 'node:assert/strict';
import {DEFAULT_DIFFICULTY,DEFAULT_INTERFACE_SCALE,DIFFICULTIES,INTERFACE_SCALE_OPTIONS,gameOptionsStorageKey,hostileDamageForDifficulty,hostileSpawningAllowed,normalizeDifficulty,normalizeGameOptions,normalizeInterfaceScale,readGameOptions,writeGameOptions} from '../src/game-settings-rules.js';

assert.deepEqual(INTERFACE_SCALE_OPTIONS,[.75,1,1.25,1.5]);
assert.deepEqual(DIFFICULTIES,['peaceful','easy','normal','hard']);
assert.equal(normalizeInterfaceScale('1.25'),1.25);
assert.equal(normalizeInterfaceScale(1.4),1.5);
assert.equal(normalizeInterfaceScale('bad'),DEFAULT_INTERFACE_SCALE);
assert.equal(normalizeDifficulty('hard'),'hard');
assert.equal(normalizeDifficulty('nightmare'),DEFAULT_DIFFICULTY);
assert.deepEqual(normalizeGameOptions({interfaceScale:.75,difficulty:'easy'}),{interfaceScale:.75,difficulty:'easy'});
assert.equal(hostileSpawningAllowed('peaceful'),false);
assert.equal(hostileSpawningAllowed('easy'),true);
assert.equal(hostileDamageForDifficulty(4,'peaceful'),0);
assert.equal(hostileDamageForDifficulty(4,'easy'),2);
assert.equal(hostileDamageForDifficulty(4,'normal'),4);
assert.equal(hostileDamageForDifficulty(4,'hard'),6);

const memory=new Map();const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
assert.deepEqual(readGameOptions(storage),{interfaceScale:1,difficulty:'normal'});
const written=writeGameOptions({interfaceScale:1.25,difficulty:'hard'},storage);assert.deepEqual(written,{interfaceScale:1.25,difficulty:'hard'});
assert.equal(memory.has(gameOptionsStorageKey()),true);
assert.deepEqual(readGameOptions(storage),written);
memory.set(gameOptionsStorageKey(),'{broken');assert.deepEqual(readGameOptions(storage),{interfaceScale:1,difficulty:'normal'});
console.log('game settings rules ok');
