#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def p(rel): return ROOT/rel

def replace_once(rel,old,new):
    path=p(rel);text=path.read_text(encoding='utf-8');count=text.count(old)
    if count!=1: raise RuntimeError(f'{rel}: expected one match, found {count}: {old[:120]!r}')
    path.write_text(text.replace(old,new,1),encoding='utf-8')

def write(rel,content):
    path=p(rel);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(content,encoding='utf-8')

# Versioned deterministic terrain: preserve v2 for existing local worlds while v3 remains current.
replace_once('src/terrain-generator.js',
"export const TERRAIN_GENERATOR_VERSION=3;\nconst DEFAULT_SEED='1';",
"export const TERRAIN_GENERATOR_VERSION=3;\nexport const SUPPORTED_TERRAIN_GENERATOR_VERSIONS=Object.freeze([2,3]);\nconst DEFAULT_SEED='1';")
replace_once('src/terrain-generator.js',
"export function terrainChunkIndex(x,y,z){return x+CHUNK_SIZE*(z+CHUNK_SIZE*y);}\n\nexport function createTerrainGenerator({seed=DEFAULT_SEED,prompt=DEFAULT_PROMPT}={}){\n  const seedHash=hashTerrainSeed(seed),parameters=terrainParameters(prompt);",
"export function terrainChunkIndex(x,y,z){return x+CHUNK_SIZE*(z+CHUNK_SIZE*y);}\n\nexport function normalizeTerrainGeneratorVersion(value=TERRAIN_GENERATOR_VERSION){\n  if(!Number.isInteger(value)||!SUPPORTED_TERRAIN_GENERATOR_VERSIONS.includes(value))throw new RangeError(`unsupported terrain generator version: ${value}`);\n  return value;\n}\n\nexport function createTerrainGenerator({seed=DEFAULT_SEED,prompt=DEFAULT_PROMPT,version=TERRAIN_GENERATOR_VERSION}={}){\n  version=normalizeTerrainGeneratorVersion(version);\n  const seedHash=hashTerrainSeed(seed),parameters=terrainParameters(prompt);")
replace_once('src/terrain-generator.js',
"  const isCoalOre=(x,y,z,top=COAL_MAX_Y+4)=>{\n    if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||!Number.isInteger(top))throw new TypeError('coal ore coordinates and surface height must be integers');\n    const maxY=Math.min(COAL_MAX_Y,top-4);",
"  const isCoalOre=(x,y,z,top=COAL_MAX_Y+4)=>{\n    if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||!Number.isInteger(top))throw new TypeError('coal ore coordinates and surface height must be integers');\n    if(version<3)return false;\n    const maxY=Math.min(COAL_MAX_Y,top-4);")
replace_once('src/terrain-generator.js',
"  return Object.freeze({seedHash,parameters:Object.freeze({...parameters}),hash2,hash3,valueNoise,fbm,heightAt,isIronOre,isCoalOre,generateChunk});",
"  return Object.freeze({version,seedHash,parameters:Object.freeze({...parameters}),hash2,hash3,valueNoise,fbm,heightAt,isIronOre,isCoalOre,generateChunk});")

write('src/world-save-compatibility.js',"""import {SUPPORTED_TERRAIN_GENERATOR_VERSIONS,TERRAIN_GENERATOR_VERSION,normalizeTerrainGeneratorVersion} from './terrain-generator.js';

export const LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION=2;
export const SINGLEPLAYER_SAVE_VERSION=8;

export function resolveSingleplayerTerrainVersion(record=null){
  if(record===null||record===undefined)return TERRAIN_GENERATOR_VERSION;
  if(typeof record!=='object'||Array.isArray(record))throw new TypeError('singleplayer world record must be an object or null');
  if(!Object.prototype.hasOwnProperty.call(record,'terrainVersion')||record.terrainVersion===null||record.terrainVersion===undefined){
    if(Number.isInteger(record.version)&&record.version>=SINGLEPLAYER_SAVE_VERSION)throw new RangeError(`save version ${record.version} is missing terrainVersion`);
    return LEGACY_UNVERSIONED_TERRAIN_GENERATOR_VERSION;
  }
  return normalizeTerrainGeneratorVersion(record.terrainVersion);
}

export function supportedSingleplayerTerrainVersions(){return [...SUPPORTED_TERRAIN_GENERATOR_VERSIONS];}
""")

replace_once('src/client-gameplay-runtime.js',
"import {VoxelWorld} from './world.js';",
"import {VoxelWorld} from './world.js';\nimport {TERRAIN_GENERATOR_VERSION,normalizeTerrainGeneratorVersion} from './terrain-generator.js';")
replace_once('src/client-gameplay-runtime.js',
"  scene,camera,canvas,seed='1',prompt='',renderDistance=3,savedEdits={},centerX=0,centerZ=0,mode='survival',inventoryState=null,equipmentState=null,controlState=null,weather='clear',",
"  scene,camera,canvas,seed='1',prompt='',terrainVersion=TERRAIN_GENERATOR_VERSION,renderDistance=3,savedEdits={},centerX=0,centerZ=0,mode='survival',inventoryState=null,equipmentState=null,controlState=null,weather='clear',")
replace_once('src/client-gameplay-runtime.js',
"  centerX=finite(centerX,'centerX');centerZ=finite(centerZ,'centerZ');renderDistance=positiveInteger(renderDistance,'renderDistance');savedEdits=objectOrNull(savedEdits,'savedEdits')||{};inventoryState=objectOrNull(inventoryState,'inventoryState');equipmentState=objectOrNull(equipmentState,'equipmentState');",
"  centerX=finite(centerX,'centerX');centerZ=finite(centerZ,'centerZ');terrainVersion=normalizeTerrainGeneratorVersion(terrainVersion);renderDistance=positiveInteger(renderDistance,'renderDistance');savedEdits=objectOrNull(savedEdits,'savedEdits')||{};inventoryState=objectOrNull(inventoryState,'inventoryState');equipmentState=objectOrNull(equipmentState,'equipmentState');")
replace_once('src/client-gameplay-runtime.js',
"    world=new VoxelWorld(scene,{seed:String(seed??'1'),prompt:String(prompt??''),renderDistance,savedEdits,onEdit:onWorldEdit,onProgress:onWorldProgress});await world.generateArea(centerX,centerZ);",
"    world=new VoxelWorld(scene,{seed:String(seed??'1'),prompt:String(prompt??''),terrainVersion,renderDistance,savedEdits,onEdit:onWorldEdit,onProgress:onWorldProgress});await world.generateArea(centerX,centerZ);")

replace_once('src/world.js',
"  constructor(scene,{seed,prompt,renderDistance=3,onProgress=()=>{},savedEdits={},onEdit=()=>{}}={}){",
"  constructor(scene,{seed,prompt,terrainVersion,renderDistance=3,onProgress=()=>{},savedEdits={},onEdit=()=>{}}={}){")
replace_once('src/world.js',"    this.prompt=prompt;\n    this.renderDistance=renderDistance;","    this.prompt=prompt;\n    this.terrainVersion=terrainVersion;\n    this.renderDistance=renderDistance;")
replace_once('src/world.js',"    this.terrainWorker.postMessage({type:'init',seed,prompt});","    this.terrainWorker.postMessage({type:'init',seed,prompt,terrainVersion});")
replace_once('src/world-worker.js',
"    generator=createTerrainGenerator({seed:message.seed||'1',prompt:message.prompt||''});",
"    generator=createTerrainGenerator({seed:message.seed||'1',prompt:message.prompt||'',version:message.terrainVersion});")

replace_once('src/main.js',
"import {WorldStorage,worldIdFor} from './storage.js';",
"import {WorldStorage,worldIdFor} from './storage.js';\nimport {SINGLEPLAYER_SAVE_VERSION,resolveSingleplayerTerrainVersion} from './world-save-compatibility.js';")
replace_once('src/main.js',
"respawnPoint:respawnPoint?{...respawnPoint}:null,version:7};",
"respawnPoint:respawnPoint?{...respawnPoint}:null,terrainVersion:worldInfo.terrainVersion,version:SINGLEPLAYER_SAVE_VERSION};")
replace_once('src/main.js',
"  const mode=saved?.mode||selectedMode;worldInfo={id,seed:saved?.seed||seed,prompt:saved?.prompt||prompt,mode,name:saved?.name||name};gameTime=Number.isFinite(saved?.gameTime)?saved.gameTime:6000;",
"  let terrainVersion;try{terrainVersion=resolveSingleplayerTerrainVersion(saved);}catch(error){console.error('世界地形版本不兼容',error);sessionKind=null;ui.showToast(`无法打开世界：${error?.message||error}`);modeScreen('world');return;}\n  const mode=saved?.mode||selectedMode;worldInfo={id,seed:saved?.seed||seed,prompt:saved?.prompt||prompt,mode,name:saved?.name||name,terrainVersion};gameTime=Number.isFinite(saved?.gameTime)?saved.gameTime:6000;")
replace_once('src/main.js',
"gameplayRuntime=await createClientGameplayRuntime({scene,camera,canvas,seed:worldInfo.seed,prompt:worldInfo.prompt,renderDistance:3,",
"gameplayRuntime=await createClientGameplayRuntime({scene,camera,canvas,seed:worldInfo.seed,prompt:worldInfo.prompt,terrainVersion:worldInfo.terrainVersion,renderDistance:3,")
replace_once('src/main.js',
"  ui.bindInventory(inventory,{equipment,onChanged:()=>{markSaveDirty();renderPlayerStatus();},onOverflow:spawnOverflow});running=true;paused=false;saveDirty=!saved||furnaceRestore.discarded>0;lastSavedPosition=player.position.clone();",
"  const needsTerrainMetadataMigration=!!saved&&(saved.terrainVersion!==worldInfo.terrainVersion||saved.version!==SINGLEPLAYER_SAVE_VERSION);\n  ui.bindInventory(inventory,{equipment,onChanged:()=>{markSaveDirty();renderPlayerStatus();},onOverflow:spawnOverflow});running=true;paused=false;saveDirty=!saved||needsTerrainMetadataMigration||furnaceRestore.discarded>0;lastSavedPosition=player.position.clone();")

# Strengthen golden checks to compare v3-normalized bytes against an actual v2 generator path.
replace_once('scripts/check-terrain-generator.mjs',
"import {TERRAIN_GENERATOR_VERSION,hashTerrainSeed,terrainParameters,terrainChunkIndex,createTerrainGenerator} from '../src/terrain-generator.js';",
"import {SUPPORTED_TERRAIN_GENERATOR_VERSIONS,TERRAIN_GENERATOR_VERSION,normalizeTerrainGeneratorVersion,hashTerrainSeed,terrainParameters,terrainChunkIndex,createTerrainGenerator} from '../src/terrain-generator.js';")
replace_once('scripts/check-terrain-generator.mjs',
"  const generator=createTerrainGenerator({seed,prompt}),chunk=generator.generateChunk(cx,cz),legacy=normalizeV1(chunk),v2=normalizeV2(chunk);",
"  const generator=createTerrainGenerator({seed,prompt}),chunk=generator.generateChunk(cx,cz),legacy=normalizeV1(chunk),v2=normalizeV2(chunk),previous=createTerrainGenerator({seed,prompt,version:2}).generateChunk(cx,cz);")
replace_once('scripts/check-terrain-generator.mjs',
"  assert.equal(fnv1a(v2),v2Checksum,`v3 coal injection changed v2 terrain bytes for ${seed} / ${prompt} / ${cx},${cz}`);",
"  assert.equal(fnv1a(v2),v2Checksum,`v3 coal injection changed v2 terrain bytes for ${seed} / ${prompt} / ${cx},${cz}`);\n  assert.equal(fnv1a(previous),v2Checksum,`explicit v2 generator drifted for ${seed} / ${prompt} / ${cx},${cz}`);\n  assert.deepEqual(v2,previous,`normalizing v3 coal must reproduce the exact v2 chunk for ${seed} / ${prompt} / ${cx},${cz}`);")
replace_once('scripts/check-terrain-generator.mjs',
"assert.equal(TERRAIN_GENERATOR_VERSION,3);",
"assert.equal(TERRAIN_GENERATOR_VERSION,3);\nassert.deepEqual(SUPPORTED_TERRAIN_GENERATOR_VERSIONS,[2,3]);\nassert.equal(normalizeTerrainGeneratorVersion(),3);\nassert.equal(normalizeTerrainGeneratorVersion(2),2);\nassert.throws(()=>normalizeTerrainGeneratorVersion(1),/unsupported terrain generator version/);\nassert.throws(()=>normalizeTerrainGeneratorVersion(4),/unsupported terrain generator version/);")

write('scripts/check-singleplayer-terrain-version.mjs',"""import assert from 'node:assert/strict';
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
""")

print('singleplayer terrain compatibility patch applied')
