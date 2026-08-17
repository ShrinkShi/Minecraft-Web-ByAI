import assert from 'node:assert/strict';
import {BLOCK,CHUNK_SIZE,WORLD_HEIGHT} from '../src/blocks.js';
import {TERRAIN_GENERATOR_VERSION,hashTerrainSeed,terrainParameters,terrainChunkIndex,createTerrainGenerator} from '../src/terrain-generator.js';

function fnv1a(bytes){let hash=2166136261>>>0;for(const byte of bytes){hash^=byte;hash=Math.imul(hash,16777619);}return hash>>>0;}
function normalizeV1(bytes){const copy=bytes.slice();for(let i=0;i<copy.length;i++)if(copy[i]===BLOCK.IRON_ORE)copy[i]=BLOCK.STONE;return copy;}
function blockCounts(bytes){const counts={};for(const id of bytes)counts[id]=(counts[id]||0)+1;return counts;}
function assertGolden({seed,prompt,cx,cz,seedHash,params,checksum,counts,sum}){
  const generator=createTerrainGenerator({seed,prompt}),chunk=generator.generateChunk(cx,cz),legacy=normalizeV1(chunk);
  assert.equal(generator.seedHash,seedHash);assert.deepEqual(generator.parameters,params);assert.equal(chunk.length,CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT);assert.equal(fnv1a(legacy),checksum,`v2 iron injection changed legacy terrain bytes for ${seed} / ${prompt} / ${cx},${cz}`);assert.deepEqual(blockCounts(legacy),counts);assert.equal(legacy.reduce((total,id)=>total+id,0),sum);
  return{generator,chunk};
}

assert.equal(TERRAIN_GENERATOR_VERSION,2);
assert.equal(hashTerrainSeed('ShrinkCraft-2026'),2382936635);assert.equal(hashTerrainSeed('golden-seed'),1950149494);assert.equal(hashTerrainSeed(''),hashTerrainSeed('1'),'legacy empty seed falls back to "1"');
assert.deepEqual(terrainParameters('温带森林，起伏丘陵，河谷与少量沙地'),{amp:10,sea:24,forest:.11,sand:.36});
assert.deepEqual(terrainParameters('mountain forest'),{amp:18,sea:20,forest:.11,sand:.14});
assert.deepEqual(terrainParameters('plain desert'),{amp:5,sea:20,forest:.055,sand:.36});
assert.deepEqual(terrainParameters(''),{amp:10,sea:20,forest:.055,sand:.14});
assert.equal(terrainChunkIndex(0,0,0),0);assert.equal(terrainChunkIndex(15,63,15),CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT-1);

const defaultResult=assertGolden({
  seed:'ShrinkCraft-2026',prompt:'温带森林，起伏丘陵，河谷与少量沙地',cx:0,cz:0,seedHash:2382936635,
  params:{amp:10,sea:24,forest:.11,sand:.36},checksum:1899136063,counts:{[BLOCK.AIR]:9984,[BLOCK.STONE]:5116,[BLOCK.SAND]:1024,[BLOCK.WATER]:260},sum:21524
});
const seaResult=assertGolden({
  seed:'ShrinkCraft-2026',prompt:'海',cx:-2,cz:3,seedHash:2382936635,
  params:{amp:10,sea:24,forest:.055,sand:.14},checksum:1269498938,counts:{[BLOCK.AIR]:9763,[BLOCK.STONE]:5597,[BLOCK.SAND]:1024},sum:20887
});
const forestResult=assertGolden({
  seed:'golden-seed',prompt:'mountain forest',cx:2,cz:-1,seedHash:1950149494,
  params:{amp:18,sea:20,forest:.11,sand:.14},checksum:3280513530,counts:{[BLOCK.AIR]:10072,[BLOCK.GRASS]:178,[BLOCK.DIRT]:534,[BLOCK.STONE]:4846,[BLOCK.SAND]:312,[BLOCK.LOG]:27,[BLOCK.LEAVES]:415},sum:20099
});
const desertResult=assertGolden({
  seed:'golden-seed',prompt:'plain desert',cx:1,cz:1,seedHash:1950149494,
  params:{amp:5,sea:20,forest:.055,sand:.36},checksum:1337700579,counts:{[BLOCK.AIR]:10215,[BLOCK.GRASS]:97,[BLOCK.DIRT]:291,[BLOCK.STONE]:5145,[BLOCK.SAND]:636},sum:18658
});

const goldenResults=[defaultResult,seaResult,forestResult,desertResult];
let oreCount=0;
for(const {generator,chunk} of goldenResults){
  for(let y=0;y<WORLD_HEIGHT;y++)for(let z=0;z<CHUNK_SIZE;z++)for(let x=0;x<CHUNK_SIZE;x++){
    if(chunk[terrainChunkIndex(x,y,z)]!==BLOCK.IRON_ORE)continue;
    oreCount++;
  }
}
assert.ok(oreCount>0,'terrain generator v2 golden set must contain deterministic iron ore');

const sample=createTerrainGenerator({seed:'golden-seed',prompt:'mountain forest'}),sampleChunk=sample.generateChunk(2,-1);let checkedOre=0;
for(let y=0;y<WORLD_HEIGHT;y++)for(let lz=0;lz<CHUNK_SIZE;lz++)for(let lx=0;lx<CHUNK_SIZE;lx++){
  if(sampleChunk[terrainChunkIndex(lx,y,lz)]!==BLOCK.IRON_ORE)continue;
  const wx=2*CHUNK_SIZE+lx,wz=-CHUNK_SIZE+lz,top=sample.heightAt(wx,wz);assert.ok(y>=4&&y<=Math.min(48,top-4),`iron ore must stay underground: ${wx},${y},${wz}, top=${top}`);assert.equal(sample.isIronOre(wx,y,wz,top),true);checkedOre++;
}
assert.ok(checkedOre>0,'representative mountain chunk must exercise iron ore generation');
assert.deepEqual(sample.generateChunk(2,-1),sampleChunk,'same seed/prompt/chunk must regenerate byte-identical v2 terrain');

const a=createTerrainGenerator({seed:'A',prompt:'海'}),b=createTerrainGenerator({seed:'B',prompt:'mountain forest'}),aBefore=fnv1a(a.generateChunk(0,0));b.generateChunk(3,-4);assert.equal(fnv1a(a.generateChunk(0,0)),aBefore,'generator instances must not leak seed/prompt state through worker-style globals');
const copy=defaultResult.chunk.slice();copy[0]=255;assert.notEqual(copy[0],defaultResult.chunk[0],'generateChunk result is caller-owned');assert.equal(fnv1a(normalizeV1(createTerrainGenerator({seed:'ShrinkCraft-2026',prompt:'温带森林，起伏丘陵，河谷与少量沙地'}).generateChunk(0,0))),1899136063);
assert.notEqual(fnv1a(defaultResult.chunk),fnv1a(seaResult.chunk),'different world chunk coordinates/prompt cases are independently locked');assert.ok(forestResult.chunk.includes(BLOCK.LOG)&&forestResult.chunk.includes(BLOCK.LEAVES),'forest golden must exercise deterministic tree generation');

assert.throws(()=>createTerrainGenerator().generateChunk(.5,0),/chunk coordinates must be integers/);assert.throws(()=>createTerrainGenerator().generateChunk(0,NaN),/chunk coordinates must be integers/);assert.throws(()=>createTerrainGenerator().isIronOre(.5,10,0,20),/coordinates/);
console.log('shared deterministic terrain generator v2 + legacy surface/tree bytes + iron ore: PASS');