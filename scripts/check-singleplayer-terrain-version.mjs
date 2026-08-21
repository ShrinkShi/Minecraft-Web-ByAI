import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {TERRAIN_GENERATOR_VERSION,createTerrainGenerator} from '../src/terrain-generator.js';
import {LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION,SINGLEPLAYER_SAVE_VERSION,resolveSingleplayerTerrainVersion,supportedSingleplayerTerrainVersions} from '../src/world-save-compatibility.js';

function fnv1a(bytes){let hash=2166136261>>>0;for(const byte of bytes){hash^=byte;hash=Math.imul(hash,16777619);}return hash>>>0;}
function normalizeCoal(bytes){const copy=bytes.slice();for(let i=0;i<copy.length;i++)if(copy[i]===BLOCK.COAL_ORE)copy[i]=BLOCK.STONE;return copy;}

assert.equal(TERRAIN_GENERATOR_VERSION,3);
assert.equal(LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION,2);
assert.equal(SINGLEPLAYER_SAVE_VERSION,8);
assert.deepEqual(supportedSingleplayerTerrainVersions(),[2,3]);
assert.equal(resolveSingleplayerTerrainVersion(null),3,'new worlds use the current terrain generator');
assert.equal(resolveSingleplayerTerrainVersion({version:7}),2,'pre-v3 unversioned saves stay on terrain v2');
assert.equal(resolveSingleplayerTerrainVersion({version:7,terrainVersion:2}),2);
assert.equal(resolveSingleplayerTerrainVersion({version:8,terrainVersion:2}),2);
assert.equal(resolveSingleplayerTerrainVersion({version:8,terrainVersion:3}),3);
assert.throws(()=>resolveSingleplayerTerrainVersion({version:8}),/missing terrainVersion/);
assert.throws(()=>resolveSingleplayerTerrainVersion({version:7,terrainVersion:1}),/unsupported terrain generator version/);
assert.throws(()=>resolveSingleplayerTerrainVersion({version:8,terrainVersion:4}),/unsupported terrain generator version/);
assert.throws(()=>resolveSingleplayerTerrainVersion('corrupt'),/world record must be an object/);

const seed='golden-seed',prompt='mountain forest',v2=createTerrainGenerator({seed,prompt,version:2}),v3=createTerrainGenerator({seed,prompt,version:3}),oldChunk=v2.generateChunk(2,-1),newChunk=v3.generateChunk(2,-1);
assert.equal(v2.version,2);assert.equal(v3.version,3);
assert.equal(fnv1a(oldChunk),213789514,'legacy local world must retain the exact pre-coal v2 terrain bytes');
assert.equal(oldChunk.includes(BLOCK.COAL_ORE),false,'v2 local worlds may not gain coal in previously implicit stone');
assert.equal(newChunk.includes(BLOCK.COAL_ORE),true,'new v3 worlds must generate coal');
assert.deepEqual(normalizeCoal(newChunk),oldChunk,'v3 differs from v2 only by deterministic coal injection');
console.log('singleplayer save terrain-version pinning: legacy unversioned=v2, new=v3, schema v8: PASS');
