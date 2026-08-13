import assert from 'node:assert/strict';
import {BLOCK,CHUNK_SIZE,WORLD_HEIGHT} from '../src/blocks.js';
import {hashTerrainSeed,terrainParameters,terrainChunkIndex,createTerrainGenerator} from '../src/terrain-generator.js';

function fnv1a(bytes){let hash=2166136261>>>0;for(const byte of bytes){hash^=byte;hash=Math.imul(hash,16777619);}return hash>>>0;}
function blockCounts(bytes){const counts={};for(const id of bytes)counts[id]=(counts[id]||0)+1;return counts;}
function assertGolden({seed,prompt,cx,cz,seedHash,params,checksum,counts,sum}){
  const generator=createTerrainGenerator({seed,prompt}),chunk=generator.generateChunk(cx,cz);
  assert.equal(generator.seedHash,seedHash);assert.deepEqual(generator.parameters,params);assert.equal(chunk.length,CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT);assert.equal(fnv1a(chunk),checksum,`legacy byte checksum changed for ${seed} / ${prompt} / ${cx},${cz}`);assert.deepEqual(blockCounts(chunk),counts);assert.equal(chunk.reduce((total,id)=>total+id,0),sum);
  return chunk;
}

assert.equal(hashTerrainSeed('ShrinkCraft-2026'),2382936635);assert.equal(hashTerrainSeed('golden-seed'),1950149494);assert.equal(hashTerrainSeed(''),hashTerrainSeed('1'),'legacy empty seed falls back to "1"');
assert.deepEqual(terrainParameters('温带森林，起伏丘陵，河谷与少量沙地'),{amp:10,sea:24,forest:.11,sand:.36});
assert.deepEqual(terrainParameters('mountain forest'),{amp:18,sea:20,forest:.11,sand:.14});
assert.deepEqual(terrainParameters('plain desert'),{amp:5,sea:20,forest:.055,sand:.36});
assert.deepEqual(terrainParameters(''),{amp:10,sea:20,forest:.055,sand:.14});
assert.equal(terrainChunkIndex(0,0,0),0);assert.equal(terrainChunkIndex(15,63,15),CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT-1);

const defaultChunk=assertGolden({
  seed:'ShrinkCraft-2026',prompt:'温带森林，起伏丘陵，河谷与少量沙地',cx:0,cz:0,seedHash:2382936635,
  params:{amp:10,sea:24,forest:.11,sand:.36},checksum:1899136063,counts:{[BLOCK.AIR]:9984,[BLOCK.STONE]:5116,[BLOCK.SAND]:1024,[BLOCK.WATER]:260},sum:21524
});
const seaChunk=assertGolden({
  seed:'ShrinkCraft-2026',prompt:'海',cx:-2,cz:3,seedHash:2382936635,
  params:{amp:10,sea:24,forest:.055,sand:.14},checksum:1269498938,counts:{[BLOCK.AIR]:9763,[BLOCK.STONE]:5597,[BLOCK.SAND]:1024},sum:20887
});
const forestChunk=assertGolden({
  seed:'golden-seed',prompt:'mountain forest',cx:2,cz:-1,seedHash:1950149494,
  params:{amp:18,sea:20,forest:.11,sand:.14},checksum:3280513530,counts:{[BLOCK.AIR]:10072,[BLOCK.GRASS]:178,[BLOCK.DIRT]:534,[BLOCK.STONE]:4846,[BLOCK.SAND]:312,[BLOCK.LOG]:27,[BLOCK.LEAVES]:415},sum:20099
});
assertGolden({
  seed:'golden-seed',prompt:'plain desert',cx:1,cz:1,seedHash:1950149494,
  params:{amp:5,sea:20,forest:.055,sand:.36},checksum:1337700579,counts:{[BLOCK.AIR]:10215,[BLOCK.GRASS]:97,[BLOCK.DIRT]:291,[BLOCK.STONE]:5145,[BLOCK.SAND]:636},sum:18658
});

const a=createTerrainGenerator({seed:'A',prompt:'海'}),b=createTerrainGenerator({seed:'B',prompt:'mountain forest'}),aBefore=fnv1a(a.generateChunk(0,0));b.generateChunk(3,-4);assert.equal(fnv1a(a.generateChunk(0,0)),aBefore,'generator instances must not leak seed/prompt state through worker-style globals');
const copy=defaultChunk.slice();copy[0]=255;assert.notEqual(copy[0],defaultChunk[0],'generateChunk result is caller-owned');assert.equal(fnv1a(createTerrainGenerator({seed:'ShrinkCraft-2026',prompt:'温带森林，起伏丘陵，河谷与少量沙地'}).generateChunk(0,0)),1899136063);
assert.notEqual(fnv1a(defaultChunk),fnv1a(seaChunk),'different world chunk coordinates/prompt cases are independently locked');assert.ok(forestChunk.includes(BLOCK.LOG)&&forestChunk.includes(BLOCK.LEAVES),'forest golden must exercise deterministic tree generation');

assert.throws(()=>createTerrainGenerator().generateChunk(.5,0),/chunk coordinates must be integers/);assert.throws(()=>createTerrainGenerator().generateChunk(0,NaN),/chunk coordinates must be integers/);
console.log('shared deterministic terrain generator legacy byte compatibility: PASS');
