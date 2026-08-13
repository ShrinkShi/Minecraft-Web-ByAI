import assert from 'node:assert/strict';
import {BLOCK,CHUNK_SIZE} from '../src/blocks.js';
import {terrainChunkIndex} from '../src/terrain-generator.js';
import {ServerTerrainWorld} from '../server/terrain-world.mjs';

const mod=(value,divisor)=>((value%divisor)+divisor)%divisor;
const world=new ServerTerrainWorld({seed:'golden-seed',prompt:'mountain forest',maxCacheChunks:4});
assert.equal(world.revision,0);assert.equal(world.editCount,0);assert.throws(()=>{world.revision=99;},TypeError);
const baseGround=world.highestSolid(33,-17);assert.equal(baseGround,22);const editY=baseGround+1;assert.equal(world.getBaseBlock(33,editY,-17),BLOCK.AIR);assert.equal(world.getBlock(33,editY,-17),BLOCK.AIR);

let change=world.setBlock(33,editY,-17,BLOCK.STONE);assert.deepEqual(change,{changed:true,revision:1,x:33,y:23,z:-17,previous:BLOCK.AIR,id:BLOCK.STONE,base:BLOCK.AIR,storedEdit:true});assert.equal(Object.isFrozen(change),true);assert.equal(world.revision,1);assert.equal(world.editCount,1);assert.equal(world.getBaseBlock(33,editY,-17),BLOCK.AIR,'seed baseline must remain immutable');assert.equal(world.getBlock(33,editY,-17),BLOCK.STONE);assert.equal(world.isSolidBlock(33,editY,-17),true);assert.equal(world.isLiquidBlock(33,editY,-17),false);assert.equal(world.highestSolid(33,-17),23);
change=world.setBlock(33,editY,-17,BLOCK.STONE);assert.equal(change.changed,false);assert.equal(change.revision,1,'idempotent set must not advance revision');assert.equal(world.editCount,1);

const cx=Math.floor(33/CHUNK_SIZE),cz=Math.floor(-17/CHUNK_SIZE),lx=mod(33,CHUNK_SIZE),lz=mod(-17,CHUNK_SIZE);let chunk=world.getChunkSnapshot(cx,cz);assert.equal(chunk[terrainChunkIndex(lx,editY,lz)],BLOCK.STONE,'chunk snapshots must include authoritative edits');chunk[terrainChunkIndex(lx,editY,lz)]=BLOCK.WATER;assert.equal(world.getBlock(33,editY,-17),BLOCK.STONE,'chunk snapshot remains isolated from authoritative edits');world.clearCache();assert.equal(world.getBlock(33,editY,-17),BLOCK.STONE,'LRU cache clear must not lose edits');

change=world.setBlock(33,editY,-17,BLOCK.WATER);assert.equal(change.revision,2);assert.equal(change.previous,BLOCK.STONE);assert.equal(change.storedEdit,true);assert.equal(world.isSolidBlock(33,editY,-17),false);assert.equal(world.isLiquidBlock(33,editY,-17),true);assert.equal(world.highestSolid(33,-17),22,'non-solid edited water must not become ground');
change=world.setBlock(33,editY,-17,BLOCK.AIR);assert.equal(change.revision,3);assert.equal(change.storedEdit,false,'returning to baseline must compact the sparse edit');assert.equal(world.editCount,0);assert.equal(world.getBlock(33,editY,-17),BLOCK.AIR);assert.deepEqual(world.exportEdits(),{});

const nx=-1,nz=-1,ny=10,negativeBase=world.getBaseBlock(nx,ny,nz),negativeEdit=negativeBase===BLOCK.AIR?BLOCK.STONE:BLOCK.AIR;change=world.setBlock(nx,ny,nz,negativeEdit);assert.equal(change.revision,4);assert.equal(world.getBlock(nx,ny,nz),negativeEdit);assert.equal(world.editCount,1);assert.deepEqual(world.editEntries(),[{x:-1,y:10,z:-1,id:negativeEdit}]);assert.equal(Object.isFrozen(world.editEntries()[0]),true);assert.deepEqual(world.exportEdits(),{'-1,10,-1':negativeEdit});const negativeChunk=world.getChunkSnapshot(-1,-1);assert.equal(negativeChunk[terrainChunkIndex(15,ny,15)],negativeEdit,'negative world coordinates must overlay the correct local chunk cell');

const secondBase=world.getBaseBlock(1,24,2),secondEdit=secondBase===BLOCK.STONE?BLOCK.AIR:BLOCK.STONE;world.setBlock(1,24,2,secondEdit);assert.equal(world.revision,5);assert.deepEqual(world.editEntries(),[{x:-1,y:10,z:-1,id:negativeEdit},{x:1,y:24,z:2,id:secondEdit}],'edit export order must be deterministic');const exported=world.exportEdits();exported['1,24,2']=BLOCK.WATER;assert.equal(world.getBlock(1,24,2),secondEdit,'exported edits must not expose mutable server state');

assert.throws(()=>world.setBlock(0,-1,0,BLOCK.AIR),/wy must be from/);assert.throws(()=>world.setBlock(0,64,0,BLOCK.STONE),/wy must be from/);assert.throws(()=>world.setBlock(0,10,0,999),/known block/);assert.throws(()=>world.setBlock(.5,10,0,BLOCK.AIR),/wx must be an integer/);

world.setBlock(nx,ny,nz,negativeBase);world.setBlock(1,24,2,secondBase);assert.equal(world.editCount,0);assert.equal(world.revision,7);assert.deepEqual(world.exportEdits(),{});
console.log('mutable sparse server terrain edits + revision/chunk/environment contracts: PASS');
