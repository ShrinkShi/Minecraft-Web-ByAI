import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeRespawnPoint,respawnCandidates,resolveRespawnPosition,RESPAWN_CANDIDATE_COUNT} from '../src/respawn-rules.js';

assert.deepEqual(normalizeRespawnPoint({x:1,y:2,z:3}),{x:1,y:2,z:3});
assert.deepEqual(normalizeRespawnPoint({x:'1.5',y:'2',z:'-3.25'}),{x:1.5,y:2,z:-3.25});
for(const invalid of [null,undefined,{}, {x:1,y:2}, {x:NaN,y:2,z:3}, {x:1,y:Infinity,z:3}])assert.equal(normalizeRespawnPoint(invalid),null);

const candidates=respawnCandidates({x:10.5,y:20,z:-4.5});
assert.equal(candidates.length,RESPAWN_CANDIDATE_COUNT);
assert.deepEqual(candidates[0],{x:10.5,y:20,z:-4.5});
assert.deepEqual(candidates.slice(1,5),[
  {x:11.5,y:20,z:-4.5},{x:9.5,y:20,z:-4.5},{x:10.5,y:20,z:-3.5},{x:10.5,y:20,z:-5.5}
]);
assert.equal(respawnCandidates(null).length,0);

const exact=resolveRespawnPosition({x:2,y:3,z:4},p=>p.x===2&&p.y===3&&p.z===4);
assert.deepEqual(exact,{x:2,y:3,z:4});
const neighbor=resolveRespawnPosition({x:2,y:3,z:4},p=>p.x===3&&p.y===3&&p.z===4);
assert.deepEqual(neighbor,{x:3,y:3,z:4});
const elevated=resolveRespawnPosition({x:2,y:3,z:4},p=>p.x===2&&p.y===4&&p.z===4);
assert.deepEqual(elevated,{x:2,y:4,z:4});
assert.equal(resolveRespawnPosition({x:2,y:3,z:4},()=>false),null);
assert.equal(resolveRespawnPosition(null,()=>true),null);
assert.throws(()=>resolveRespawnPosition({x:0,y:0,z:0},null),/isSafe/);

const worldSource=fs.readFileSync('src/world.js','utf8'),mainSource=fs.readFileSync('src/main.js','utf8');
assert.match(worldSource,/async ensureReadyAround\(worldX,worldZ,cellRadius=1,timeoutMs=5000\)/,'VoxelWorld must expose async respawn-area readiness');
assert.match(mainSource,/await world\.ensureReadyAround\(respawnPoint\.x,respawnPoint\.z,1\)/,'custom respawn must await its candidate chunks');
assert.match(mainSource,/if\(world\)await world\.ensureReadyAround\(0,0,0\)/,'world-spawn fallback must await the origin chunk');
assert.match(mainSource,/async function completeRespawn\(/,'explicit respawn must stay on the death screen while chunks load');
assert.match(mainSource,/action==='respawn'\)await completeRespawn\(\)/,'UI action must await explicit respawn');

console.log('custom respawn rules: PASS');
