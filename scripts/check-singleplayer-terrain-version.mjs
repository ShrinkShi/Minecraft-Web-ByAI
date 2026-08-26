import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {TERRAIN_GENERATOR_VERSION,createTerrainGenerator} from '../src/terrain-generator.js';
import {LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION,SINGLEPLAYER_SAVE_VERSION,TERRAIN_VERSIONED_SAVE_MIN_VERSION,resolveSingleplayerTerrainVersion,supportedSingleplayerTerrainVersions} from '../src/world-save-compatibility.js';

function fnv1a(bytes){let hash=2166136261>>>0;for(const byte of bytes){hash^=byte;hash=Math.imul(hash,16777619);}return hash>>>0;}
function normalizeCoal(bytes){const copy=bytes.slice();for(let i=0;i<copy.length;i++)if(copy[i]===BLOCK.COAL_ORE)copy[i]=BLOCK.STONE;return copy;}
function normalizeShortGrass(bytes){const copy=bytes.slice();for(let i=0;i<copy.length;i++)if(copy[i]===BLOCK.SHORT_GRASS)copy[i]=BLOCK.AIR;return copy;}

assert.equal(TERRAIN_GENERATOR_VERSION,4);
assert.equal(LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION,2);
assert.equal(TERRAIN_VERSIONED_SAVE_MIN_VERSION,8);
assert.equal(SINGLEPLAYER_SAVE_VERSION,10);
assert.deepEqual(supportedSingleplayerTerrainVersions(),[2,3,4]);
assert.equal(resolveSingleplayerTerrainVersion(null),4,'new worlds use the current terrain generator');
assert.equal(resolveSingleplayerTerrainVersion({version:7}),2,'pre-v3 unversioned saves stay on terrain v2');
assert.equal(resolveSingleplayerTerrainVersion({version:7,terrainVersion:2}),2);
assert.equal(resolveSingleplayerTerrainVersion({version:8,terrainVersion:2}),2);
assert.equal(resolveSingleplayerTerrainVersion({version:8,terrainVersion:3}),3);
assert.equal(resolveSingleplayerTerrainVersion({version:9,terrainVersion:3}),3,'existing terrain-v3 worlds stay pinned after save schema v10 ships');
assert.equal(resolveSingleplayerTerrainVersion({version:9,terrainVersion:4}),4,'existing save-v9 terrain-v4 worlds stay pinned');
assert.equal(resolveSingleplayerTerrainVersion({version:10,terrainVersion:4}),4,'new save-v10 worlds use explicit terrain v4');
assert.throws(()=>resolveSingleplayerTerrainVersion({version:8}),/missing terrainVersion/);
assert.throws(()=>resolveSingleplayerTerrainVersion({version:9}),/missing terrainVersion/);
assert.throws(()=>resolveSingleplayerTerrainVersion({version:10}),/missing terrainVersion/);
assert.throws(()=>resolveSingleplayerTerrainVersion({version:7,terrainVersion:1}),/unsupported terrain generator version/);
assert.throws(()=>resolveSingleplayerTerrainVersion({version:10,terrainVersion:5}),/unsupported terrain generator version/);
assert.throws(()=>resolveSingleplayerTerrainVersion('corrupt'),/world record must be an object/);

const seed='golden-seed',prompt='mountain forest',v2=createTerrainGenerator({seed,prompt,version:2}),v3=createTerrainGenerator({seed,prompt,version:3}),v4=createTerrainGenerator({seed,prompt,version:4}),v2Chunk=v2.generateChunk(2,-1),v3Chunk=v3.generateChunk(2,-1),v4Chunk=v4.generateChunk(2,-1);
assert.equal(v2.version,2);assert.equal(v3.version,3);assert.equal(v4.version,4);
assert.equal(fnv1a(v2Chunk),213789514,'legacy local world must retain the exact pre-coal v2 terrain bytes');
assert.equal(v2Chunk.includes(BLOCK.COAL_ORE),false,'v2 local worlds may not gain coal in previously implicit stone');
assert.equal(v3Chunk.includes(BLOCK.COAL_ORE),true,'terrain-v3 worlds retain coal');
assert.equal(v3Chunk.includes(BLOCK.SHORT_GRASS),false,'terrain-v3 worlds may not gain v4 vegetation');
assert.equal(v4Chunk.includes(BLOCK.SHORT_GRASS),true,'new terrain-v4 worlds generate short grass');
assert.deepEqual(normalizeCoal(v3Chunk),v2Chunk,'v3 differs from v2 only by deterministic coal injection');
assert.deepEqual(normalizeShortGrass(v4Chunk),v3Chunk,'v4 differs from v3 only by deterministic short-grass decoration');
console.log('singleplayer terrain pinning: legacy=v2, existing v3 preserved, new worlds=v4, save schema v10: PASS');
