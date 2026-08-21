#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def path(rel: str) -> Path:
    return ROOT / rel


def replace_once(rel: str, old: str, new: str) -> None:
    p = path(rel)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{rel}: expected exactly one match, found {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def replace_all(rel: str, old: str, new: str, *, minimum: int = 1) -> int:
    p = path(rel)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count < minimum:
        raise RuntimeError(f'{rel}: expected at least {minimum} matches, found {count}: {old!r}')
    p.write_text(text.replace(old, new), encoding='utf-8')
    return count


def write(rel: str, content: str) -> None:
    p = path(rel)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')


# ---- Runtime block/item/asset registrations ----
replace_once(
    'src/blocks.js',
    "  FARMLAND:24,DIRT_PATH:25,STRIPPED_OAK_LOG:26\n});",
    "  FARMLAND:24,DIRT_PATH:25,STRIPPED_OAK_LOG:26,\n  COAL_ORE:27\n});",
)
replace_once(
    'src/blocks.js',
    "  26:{name:'去皮橡木原木',solid:true,hardness:2,tiles:[7,7,6],drops:'block:26',effectiveTool:'axe'}\n};",
    "  26:{name:'去皮橡木原木',solid:true,hardness:2,tiles:[7,7,6],drops:'block:26',effectiveTool:'axe'},\n  // Coal keeps the legacy terrain-atlas fast path. Tile 15 is now the canonical\n  // Java 1.20.1 coal_ore texture; white wool item presentation moved to a\n  // direct canonical texture so the 4x4 terrain atlas does not need resizing.\n  27:{name:'煤矿石',solid:true,hardness:3,tiles:[15,15,15],drops:'coal',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'wood'}\n};",
)
replace_once(
    'src/items.js',
    "  'block:26':{name:'去皮橡木原木',stack:64,blockId:26,blockPreview:'source-faces',blockPreviewFaces:sourceFaces('block.stripped_oak_log_top','block.stripped_oak_log','block.stripped_oak_log')},\n  stick:textured('木棍',64,'item.stick'),",
    "  'block:26':{name:'去皮橡木原木',stack:64,blockId:26,blockPreview:'source-faces',blockPreviewFaces:sourceFaces('block.stripped_oak_log_top','block.stripped_oak_log','block.stripped_oak_log')},\n  'block:27':{name:'煤矿石',stack:64,blockId:27,tile:15,assetKey:'block.coal_ore'},\n  stick:textured('木棍',64,'item.stick'),",
)
replace_once('src/items.js',"  iron_ingot:textured('铁锭',64,'item.iron_ingot'),\n  bed:","  iron_ingot:textured('铁锭',64,'item.iron_ingot'),\n  coal:textured('煤炭',64,'item.coal'),\n  bed:")
replace_once('src/items.js',"  white_wool:{name:'白色羊毛',stack:64,color:0xf0eee7,tile:15,assetKey:'block.white_wool'},","  white_wool:textured('白色羊毛',64,'block.white_wool',{color:0xf0eee7}),")
replace_once(
    'src/asset-manifest.js',
    "  'block.iron_ore':supplied('atlas-tile','./assets/textures/atlas.png',{tile:14}),\n  'block.white_wool':supplied('atlas-tile','./assets/textures/atlas.png',{tile:15}),",
    "  'block.iron_ore':supplied('atlas-tile','./assets/textures/atlas.png',{tile:14}),\n  'block.coal_ore':supplied('atlas-tile','./assets/textures/atlas.png',{tile:15}),\n  'block.white_wool':supplied('block-texture',`${CANONICAL_BLOCK_ROOT}/white_wool.png`,{minecraftVersion:'1.20.1',directCanonical:true}),",
)
replace_once('src/asset-manifest.js',"  'item.iron_ingot':supplied('item-texture','./assets/items/iron_ingot.png'),\n  'item.leather_helmet':","  'item.iron_ingot':supplied('item-texture','./assets/items/iron_ingot.png'),\n  'item.coal':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/coal.png`,{minecraftVersion:'1.20.1',directCanonical:true}),\n  'item.leather_helmet':")
replace_once('src/smelting.js',"  'block:6':300,\n  stick:100,","  'block:6':300,\n  coal:1600,\n  stick:100,")

# ---- Deterministic terrain v3 ----
write('src/terrain-generator.js', """import {BLOCK,CHUNK_SIZE,WORLD_HEIGHT} from './blocks.js';

export const TERRAIN_GENERATOR_VERSION=3;
const DEFAULT_SEED='1';
const DEFAULT_PROMPT='';
const FNV_OFFSET=2166136261>>>0;
const FNV_PRIME=16777619;
const IRON_MIN_Y=4;
const IRON_MAX_Y=48;
const IRON_VEIN_CELL=3;
const IRON_VEIN_CHANCE=.045;
const IRON_FILL_CHANCE=.22;
const IRON_VEIN_SALT=0x49a2;
const IRON_FILL_SALT=0x1f2e;
const COAL_MIN_Y=4;
const COAL_MAX_Y=56;
const COAL_VEIN_CELL=4;
const COAL_VEIN_CHANCE=.07;
const COAL_FILL_CHANCE=.28;
const COAL_VEIN_SALT=0x0c0a1;
const COAL_FILL_SALT=0x51ad;

export function hashTerrainSeed(value=DEFAULT_SEED){
  const text=String(value||DEFAULT_SEED);let hash=FNV_OFFSET;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,FNV_PRIME);}
  return hash>>>0;
}
export function terrainParameters(value=DEFAULT_PROMPT){
  const prompt=String(value??DEFAULT_PROMPT).toLowerCase();
  return{amp:/山|mountain|峭壁/.test(prompt)?18:/平原|plain/.test(prompt)?5:10,sea:/海|ocean|湖|lake|河|river/.test(prompt)?24:20,forest:/森林|forest|丛林|jungle/.test(prompt)?.11:.055,sand:/沙漠|desert|沙地/.test(prompt)?.36:.14};
}
export function terrainChunkIndex(x,y,z){return x+CHUNK_SIZE*(z+CHUNK_SIZE*y);}
export function createTerrainGenerator({seed=DEFAULT_SEED,prompt=DEFAULT_PROMPT}={}){
  const seedHash=hashTerrainSeed(seed),parameters=terrainParameters(prompt);
  const hash2=(x,z)=>{let hash=Math.imul(x,374761393)^Math.imul(z,668265263)^seedHash;hash=(hash^(hash>>>13))*1274126177;return((hash^(hash>>>16))>>>0)/4294967295;};
  const hash3=(x,y,z,salt=0)=>{let hash=seedHash^Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1274126177)^Math.imul(salt,1597334677);hash=Math.imul(hash^(hash>>>13),1274126177);return((hash^(hash>>>16))>>>0)/4294967295;};
  const smooth=t=>t*t*(3-2*t);
  const valueNoise=(x,z)=>{const x0=Math.floor(x),z0=Math.floor(z),tx=smooth(x-x0),tz=smooth(z-z0),a=hash2(x0,z0),b=hash2(x0+1,z0),c=hash2(x0,z0+1),d=hash2(x0+1,z0+1),ab=a+(b-a)*tx,cd=c+(d-c)*tx;return ab+(cd-ab)*tz;};
  const fbm=(x,z)=>{let value=0,amplitude=.55,frequency=.035,normalizer=0;for(let i=0;i<4;i++){value+=valueNoise(x*frequency,z*frequency)*amplitude;normalizer+=amplitude;amplitude*=.5;frequency*=2;}return value/normalizer;};
  const heightAt=(x,z)=>{const continental=(fbm(x*.55,z*.55)-.5)*parameters.amp,detail=(fbm(x+731,z-271)-.5)*4;return Math.max(6,Math.min(WORLD_HEIGHT-10,Math.floor(25+continental+detail)));};
  const isIronOre=(x,y,z,top=IRON_MAX_Y+4)=>{if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||!Number.isInteger(top))throw new TypeError('iron ore coordinates and surface height must be integers');const maxY=Math.min(IRON_MAX_Y,top-4);if(y<IRON_MIN_Y||y>maxY)return false;const vein=hash3(Math.floor(x/IRON_VEIN_CELL),Math.floor(y/IRON_VEIN_CELL),Math.floor(z/IRON_VEIN_CELL),IRON_VEIN_SALT);if(vein>=IRON_VEIN_CHANCE)return false;return hash3(x,y,z,IRON_FILL_SALT)<IRON_FILL_CHANCE;};
  const isCoalOre=(x,y,z,top=COAL_MAX_Y+4)=>{if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||!Number.isInteger(top))throw new TypeError('coal ore coordinates and surface height must be integers');const maxY=Math.min(COAL_MAX_Y,top-4);if(y<COAL_MIN_Y||y>maxY)return false;const vein=hash3(Math.floor(x/COAL_VEIN_CELL),Math.floor(y/COAL_VEIN_CELL),Math.floor(z/COAL_VEIN_CELL),COAL_VEIN_SALT);if(vein>=COAL_VEIN_CHANCE)return false;return hash3(x,y,z,COAL_FILL_SALT)<COAL_FILL_CHANCE;};
  const set=(chunk,x,y,z,id)=>{if(x>=0&&x<CHUNK_SIZE&&z>=0&&z<CHUNK_SIZE&&y>=0&&y<WORLD_HEIGHT)chunk[terrainChunkIndex(x,y,z)]=id;};
  const tree=(chunk,lx,base,lz)=>{for(let y=0;y<4;y++)set(chunk,lx,base+y,lz,BLOCK.LOG);for(let y=base+2;y<=base+5;y++)for(let x=lx-2;x<=lx+2;x++)for(let z=lz-2;z<=lz+2;z++){const distance=Math.abs(x-lx)+Math.abs(z-lz)+(y===base+5?1:0);if(distance<=4&&!(x===lx&&z===lz&&y<base+4))set(chunk,x,y,z,BLOCK.LEAVES);}};
  const generateChunk=(cx,cz)=>{if(!Number.isInteger(cx)||!Number.isInteger(cz))throw new TypeError('chunk coordinates must be integers');const chunk=new Uint8Array(CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT);for(let lx=0;lx<CHUNK_SIZE;lx++)for(let lz=0;lz<CHUNK_SIZE;lz++){const wx=cx*CHUNK_SIZE+lx,wz=cz*CHUNK_SIZE+lz,top=heightAt(wx,wz),moisture=fbm(wx+2000,wz-900);for(let y=0;y<=top;y++){let id=BLOCK.STONE;if(y===top)id=top<=parameters.sea+1||moisture<parameters.sand?BLOCK.SAND:BLOCK.GRASS;else if(y>=top-3)id=top<=parameters.sea+1||moisture<parameters.sand?BLOCK.SAND:BLOCK.DIRT;else if(isIronOre(wx,y,wz,top))id=BLOCK.IRON_ORE;else if(isCoalOre(wx,y,wz,top))id=BLOCK.COAL_ORE;set(chunk,lx,y,lz,id);}for(let y=top+1;y<=parameters.sea;y++)set(chunk,lx,y,lz,BLOCK.WATER);if(top>parameters.sea+1&&chunk[terrainChunkIndex(lx,top,lz)]===BLOCK.GRASS&&hash2(wx*7,wz*7)<parameters.forest&&lx>2&&lx<13&&lz>2&&lz<13)tree(chunk,lx,top+1,lz);}return chunk;};
  return Object.freeze({seedHash,parameters:Object.freeze({...parameters}),hash2,hash3,valueNoise,fbm,heightAt,isIronOre,isCoalOre,generateChunk});
}
""")

# ---- Asset builders ----
replace_once('tools/import-minecraft-assets.py','    "textures/block/iron_ore.png": "assets/minecraft/textures/block/iron_ore.png",\n    "textures/block/white_wool.png":','    "textures/block/iron_ore.png": "assets/minecraft/textures/block/iron_ore.png",\n    "textures/block/coal_ore.png": "assets/minecraft/textures/block/coal_ore.png",\n    "textures/block/white_wool.png":')
replace_once('tools/build-minecraft-runtime-assets.py','    15: ("white_wool.png", None),','    15: ("coal_ore.png", None),')

# ---- Terrain compatibility regression ----
write('scripts/check-terrain-generator.mjs', """import assert from 'node:assert/strict';
import {BLOCK,CHUNK_SIZE,WORLD_HEIGHT} from '../src/blocks.js';
import {TERRAIN_GENERATOR_VERSION,hashTerrainSeed,terrainParameters,terrainChunkIndex,createTerrainGenerator} from '../src/terrain-generator.js';
function fnv1a(bytes){let hash=2166136261>>>0;for(const byte of bytes){hash^=byte;hash=Math.imul(hash,16777619);}return hash>>>0;}
function normalizeV1(bytes){const copy=bytes.slice();for(let i=0;i<copy.length;i++)if(copy[i]===BLOCK.IRON_ORE||copy[i]===BLOCK.COAL_ORE)copy[i]=BLOCK.STONE;return copy;}
function normalizeV2(bytes){const copy=bytes.slice();for(let i=0;i<copy.length;i++)if(copy[i]===BLOCK.COAL_ORE)copy[i]=BLOCK.STONE;return copy;}
function blockCounts(bytes){const counts={};for(const id of bytes)counts[id]=(counts[id]||0)+1;return counts;}
function assertGolden({seed,prompt,cx,cz,seedHash,params,checksum,v2Checksum,counts,sum}){const generator=createTerrainGenerator({seed,prompt}),chunk=generator.generateChunk(cx,cz),legacy=normalizeV1(chunk),v2=normalizeV2(chunk);assert.equal(generator.seedHash,seedHash);assert.deepEqual(generator.parameters,params);assert.equal(chunk.length,CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT);assert.equal(fnv1a(legacy),checksum,`v3 ore injection changed legacy terrain bytes for ${seed} / ${prompt} / ${cx},${cz}`);assert.equal(fnv1a(v2),v2Checksum,`v3 coal injection changed v2 terrain bytes for ${seed} / ${prompt} / ${cx},${cz}`);assert.deepEqual(blockCounts(legacy),counts);assert.equal(legacy.reduce((total,id)=>total+id,0),sum);return{generator,chunk};}
assert.equal(TERRAIN_GENERATOR_VERSION,3);assert.equal(hashTerrainSeed('ShrinkCraft-2026'),2382936635);assert.equal(hashTerrainSeed('golden-seed'),1950149494);assert.equal(hashTerrainSeed(''),hashTerrainSeed('1'),'legacy empty seed falls back to "1"');
assert.deepEqual(terrainParameters('温带森林，起伏丘陵，河谷与少量沙地'),{amp:10,sea:24,forest:.11,sand:.36});assert.deepEqual(terrainParameters('mountain forest'),{amp:18,sea:20,forest:.11,sand:.14});assert.deepEqual(terrainParameters('plain desert'),{amp:5,sea:20,forest:.055,sand:.36});assert.deepEqual(terrainParameters(''),{amp:10,sea:20,forest:.055,sand:.14});assert.equal(terrainChunkIndex(0,0,0),0);assert.equal(terrainChunkIndex(15,63,15),CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT-1);
const defaultResult=assertGolden({seed:'ShrinkCraft-2026',prompt:'温带森林，起伏丘陵，河谷与少量沙地',cx:0,cz:0,seedHash:2382936635,params:{amp:10,sea:24,forest:.11,sand:.36},checksum:1899136063,v2Checksum:2268288239,counts:{[BLOCK.AIR]:9984,[BLOCK.STONE]:5116,[BLOCK.SAND]:1024,[BLOCK.WATER]:260},sum:21524});
const seaResult=assertGolden({seed:'ShrinkCraft-2026',prompt:'海',cx:-2,cz:3,seedHash:2382936635,params:{amp:10,sea:24,forest:.055,sand:.14},checksum:1269498938,v2Checksum:2899951754,counts:{[BLOCK.AIR]:9763,[BLOCK.STONE]:5597,[BLOCK.SAND]:1024},sum:20887});
const forestResult=assertGolden({seed:'golden-seed',prompt:'mountain forest',cx:2,cz:-1,seedHash:1950149494,params:{amp:18,sea:20,forest:.11,sand:.14},checksum:3280513530,v2Checksum:213789514,counts:{[BLOCK.AIR]:10072,[BLOCK.GRASS]:178,[BLOCK.DIRT]:534,[BLOCK.STONE]:4846,[BLOCK.SAND]:312,[BLOCK.LOG]:27,[BLOCK.LEAVES]:415},sum:20099});
const desertResult=assertGolden({seed:'golden-seed',prompt:'plain desert',cx:1,cz:1,seedHash:1950149494,params:{amp:5,sea:20,forest:.055,sand:.36},checksum:1337700579,v2Checksum:2345558259,counts:{[BLOCK.AIR]:10215,[BLOCK.GRASS]:97,[BLOCK.DIRT]:291,[BLOCK.STONE]:5145,[BLOCK.SAND]:636},sum:18658});
const goldenResults=[defaultResult,seaResult,forestResult,desertResult];let ironCount=0,coalCount=0;for(const {chunk} of goldenResults)for(const id of chunk){if(id===BLOCK.IRON_ORE)ironCount++;else if(id===BLOCK.COAL_ORE)coalCount++;}assert.ok(ironCount>0,'terrain generator v3 golden set must retain deterministic iron ore');assert.ok(coalCount>0,'terrain generator v3 golden set must contain deterministic coal ore');
const sample=createTerrainGenerator({seed:'golden-seed',prompt:'mountain forest'}),sampleChunk=sample.generateChunk(2,-1);let checkedIron=0,checkedCoal=0;for(let y=0;y<WORLD_HEIGHT;y++)for(let lz=0;lz<CHUNK_SIZE;lz++)for(let lx=0;lx<CHUNK_SIZE;lx++){const id=sampleChunk[terrainChunkIndex(lx,y,lz)],wx=2*CHUNK_SIZE+lx,wz=-CHUNK_SIZE+lz,top=sample.heightAt(wx,wz);if(id===BLOCK.IRON_ORE){assert.ok(y>=4&&y<=Math.min(48,top-4),`iron ore must stay underground: ${wx},${y},${wz}, top=${top}`);assert.equal(sample.isIronOre(wx,y,wz,top),true);checkedIron++;}if(id===BLOCK.COAL_ORE){assert.ok(y>=4&&y<=Math.min(56,top-4),`coal ore must stay underground: ${wx},${y},${wz}, top=${top}`);assert.equal(sample.isIronOre(wx,y,wz,top),false,'coal may not overwrite deterministic v2 iron positions');assert.equal(sample.isCoalOre(wx,y,wz,top),true);checkedCoal++;}}assert.ok(checkedIron>0);assert.ok(checkedCoal>0);assert.deepEqual(sample.generateChunk(2,-1),sampleChunk,'same seed/prompt/chunk must regenerate byte-identical v3 terrain');
const a=createTerrainGenerator({seed:'A',prompt:'海'}),b=createTerrainGenerator({seed:'B',prompt:'mountain forest'}),aBefore=fnv1a(a.generateChunk(0,0));b.generateChunk(3,-4);assert.equal(fnv1a(a.generateChunk(0,0)),aBefore);const copy=defaultResult.chunk.slice();copy[0]=255;assert.notEqual(copy[0],defaultResult.chunk[0]);assert.equal(fnv1a(normalizeV1(createTerrainGenerator({seed:'ShrinkCraft-2026',prompt:'温带森林，起伏丘陵，河谷与少量沙地'}).generateChunk(0,0))),1899136063);assert.notEqual(fnv1a(defaultResult.chunk),fnv1a(seaResult.chunk));assert.ok(forestResult.chunk.includes(BLOCK.LOG)&&forestResult.chunk.includes(BLOCK.LEAVES));
assert.throws(()=>createTerrainGenerator().generateChunk(.5,0),/chunk coordinates must be integers/);assert.throws(()=>createTerrainGenerator().generateChunk(0,NaN),/chunk coordinates must be integers/);assert.throws(()=>createTerrainGenerator().isIronOre(.5,10,0,20),/coordinates/);assert.throws(()=>createTerrainGenerator().isCoalOre(0,10,NaN,20),/coordinates/);
console.log('shared deterministic terrain generator v3 + v2 byte compatibility + iron/coal ore: PASS');
""")
replace_once('scripts/check-server-terrain-world.mjs',"function normalizeV1(bytes){const copy=bytes.slice();for(let i=0;i<copy.length;i++)if(copy[i]===BLOCK.IRON_ORE)copy[i]=BLOCK.STONE;return copy;}","function normalizeV1(bytes){const copy=bytes.slice();for(let i=0;i<copy.length;i++)if(copy[i]===BLOCK.IRON_ORE||copy[i]===BLOCK.COAL_ORE)copy[i]=BLOCK.STONE;return copy;}\nfunction normalizeV2(bytes){const copy=bytes.slice();for(let i=0;i<copy.length;i++)if(copy[i]===BLOCK.COAL_ORE)copy[i]=BLOCK.STONE;return copy;}")
replace_once('scripts/check-server-terrain-world.mjs',"const snapshot=world.getChunkSnapshot(2,-1),legacyChecksum=fnv1a(normalizeV1(snapshot));assert.equal(legacyChecksum,3280513530,'server v2 chunk keeps the shared legacy terrain bytes after iron->stone normalization');assert.ok(snapshot.includes(BLOCK.IRON_ORE),'authoritative terrain snapshot must expose generated iron ore');const original=snapshot[0];snapshot[0]=255;assert.equal(fnv1a(normalizeV1(world.getChunkSnapshot(2,-1))),legacyChecksum,'caller mutation of chunk snapshot cannot mutate authoritative cache');assert.notEqual(snapshot[0],original);","const snapshot=world.getChunkSnapshot(2,-1),legacyChecksum=fnv1a(normalizeV1(snapshot));assert.equal(legacyChecksum,3280513530,'server v3 chunk keeps shared legacy terrain bytes after ore normalization');assert.equal(fnv1a(normalizeV2(snapshot)),213789514,'server v3 coal injection must preserve the previous v2 chunk byte-for-byte when coal is normalized to stone');assert.ok(snapshot.includes(BLOCK.IRON_ORE),'authoritative terrain snapshot must expose generated iron ore');assert.ok(snapshot.includes(BLOCK.COAL_ORE),'authoritative terrain snapshot must expose generated coal ore');const original=snapshot[0];snapshot[0]=255;assert.equal(fnv1a(normalizeV1(world.getChunkSnapshot(2,-1))),legacyChecksum,'caller mutation of chunk snapshot cannot mutate authoritative cache');assert.notEqual(snapshot[0],original);")
replace_once('scripts/check-server-world-info.mjs','assert.equal(TERRAIN_GENERATOR_VERSION,2);','assert.equal(TERRAIN_GENERATOR_VERSION,3);')
replace_all('scripts/check-server-world-info.mjs','terrainVersion:2','terrainVersion:3',minimum=3)
replace_once('scripts/check-server-world-info.mjs',"assert.throws(()=>decodeServerWorldInfo({...wire,terrainVersion:1}),/unsupported terrain generator version/);","assert.throws(()=>decodeServerWorldInfo({...wire,terrainVersion:TERRAIN_GENERATOR_VERSION-1}),/unsupported terrain generator version/);")
replace_once('scripts/check-iron-progression.mjs','assert.equal(TERRAIN_GENERATOR_VERSION,2);','assert.equal(TERRAIN_GENERATOR_VERSION,3);')
replace_once('scripts/check-iron-progression.mjs','shared terrain v2 must generate reachable iron ore','shared terrain v3 must generate reachable iron ore')
for p in (ROOT/'scripts').glob('check-*.mjs'):
    text=p.read_text(encoding='utf-8').replace('terrain-v2','terrain-v3').replace('terrain v2','terrain v3')
    p.write_text(text,encoding='utf-8')

# ---- Runtime asset provenance checks ----
replace_once('scripts/check-minecraft-runtime-assets.mjs',"assert.equal(runtime.atlas.tiles['15'].source,'textures/block/white_wool.png');","assert.equal(runtime.atlas.tiles['15'].source,'textures/block/coal_ore.png');")
replace_once('scripts/check-minecraft-runtime-assets.mjs',"  'textures/block/crafting_table_front.png','textures/block/iron_ore.png','textures/block/white_wool.png',","  'textures/block/crafting_table_front.png','textures/block/iron_ore.png','textures/block/coal_ore.png','textures/block/white_wool.png',")
replace_once('scripts/check-minecraft-runtime-assets.mjs',"console.log('Minecraft 1.20.1 directory-backed runtime assets + furnace/ingot/iron-pickaxe provenance + entity dimensions/checksums: PASS');","console.log('Minecraft 1.20.1 directory-backed runtime assets + coal atlas/furnace provenance + entity dimensions/checksums: PASS');")
replace_once('scripts/check-asset-manifest.mjs',"'terrain.block_atlas','block.model_atlas','block.iron_ore','block.white_wool','block.glass'","'terrain.block_atlas','block.model_atlas','block.iron_ore','block.coal_ore','block.white_wool','block.glass'")
replace_once('scripts/check-asset-manifest.mjs',"'item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots',","'item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots','item.coal',")
replace_once('scripts/check-asset-manifest.mjs',"const DIRECT_CANONICAL_KEYS=new Set(['item.wooden_sword','item.stone_sword','item.bow','item.iron_hoe','item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots','block.stripped_oak_log','block.stripped_oak_log_top','gui.crafting_table_panel']);","const DIRECT_CANONICAL_KEYS=new Set(['item.wooden_sword','item.stone_sword','item.bow','item.iron_hoe','item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots','item.coal','block.white_wool','block.stripped_oak_log','block.stripped_oak_log_top','gui.crafting_table_panel']);")
replace_once('scripts/check-asset-manifest.mjs',"(?:wooden_sword|stone_sword|bow|iron_hoe|iron_helmet|iron_chestplate|iron_leggings|iron_boots)","(?:wooden_sword|stone_sword|bow|iron_hoe|iron_helmet|iron_chestplate|iron_leggings|iron_boots|coal)")
replace_once('scripts/check-asset-manifest.mjs',"else if(key.startsWith('block.'))assert.match(record.url,/^\\.\\/MC原版素材assets\\/minecraft\\/textures\\/block\\/stripped_oak_log(?:_top)?\\.png$/,`${key} must stay on the audited canonical block path`);","else if(key.startsWith('block.'))assert.match(record.url,/^\\.\\/MC原版素材assets\\/minecraft\\/textures\\/block\\/(?:stripped_oak_log(?:_top)?|white_wool)\\.png$/,`${key} must stay on the audited canonical block path`);")
replace_once('scripts/check-asset-manifest.mjs',"assert.equal(assetRecord('block.iron_ore').tile,14);\nassert.equal(assetRecord('block.white_wool').tile,15);","assert.equal(assetRecord('block.iron_ore').tile,14);\nassert.equal(assetRecord('block.coal_ore').tile,15);\nassert.equal(assetUrl('block.white_wool'),'./MC原版素材assets/minecraft/textures/block/white_wool.png');\nassert.equal(assetRecord('block.white_wool').directCanonical,true);\nassert.equal(assetUrl('item.coal'),'./MC原版素材assets/minecraft/textures/item/coal.png');\nassert.equal(assetRecord('item.coal').directCanonical,true);")
replace_once('scripts/check-asset-manifest.mjs',"'iron_boots','leather_helmet'","'iron_boots','coal','leather_helmet'")
replace_once('scripts/check-asset-manifest.mjs',"assert.equal(ITEMS.white_wool.assetKey,'block.white_wool');\nassert.equal(ITEMS.white_wool.tile,15);","assert.equal(ITEMS.white_wool.assetKey,'block.white_wool');\nassert.equal(ITEMS.white_wool.texture,requireAssetUrl('block.white_wool'));\nassert.equal(ITEMS.white_wool.tile,undefined);\nassert.equal(ITEMS.coal.assetKey,'item.coal');\nassert.equal(ITEMS.coal.texture,requireAssetUrl('item.coal'));")
replace_once('scripts/check-asset-manifest.mjs',"for(const key of ['item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots'])assert.equal(snapshot[key].directCanonical,true);","for(const key of ['item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots','item.coal'])assert.equal(snapshot[key].directCanonical,true);\nassert.equal(snapshot['block.white_wool'].directCanonical,true);")

# ---- Coal progression logic contract ----
write('scripts/check-coal-progression.mjs', """import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {assetRecord,requireAssetUrl} from '../src/asset-manifest.js';
import {BLOCK,BLOCKS,CHUNK_SIZE,WORLD_HEIGHT} from '../src/blocks.js';
import {ITEMS} from '../src/items.js';
import {canHarvestBlock,miningDurationMs} from '../src/mining-rules.js';
import {FURNACE_FUELS,furnaceFuelTicks,isFurnaceFuel,createFurnaceState,tickFurnace} from '../src/smelting.js';
import {TERRAIN_GENERATOR_VERSION,createTerrainGenerator,terrainChunkIndex} from '../src/terrain-generator.js';
import {SurvivalBlockBreakController} from '../server/survival-block-break-controller.mjs';
assert.equal(BLOCK.COAL_ORE,27);assert.deepEqual(BLOCKS[BLOCK.COAL_ORE],{name:'煤矿石',solid:true,hardness:3,tiles:[15,15,15],drops:'coal',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'wood'});assert.deepEqual(ITEMS['block:27'],{name:'煤矿石',stack:64,blockId:27,tile:15,assetKey:'block.coal_ore'});assert.equal(ITEMS.coal.name,'煤炭');assert.equal(ITEMS.coal.stack,64);assert.equal(ITEMS.coal.assetKey,'item.coal');assert.equal(ITEMS.coal.texture,requireAssetUrl('item.coal'));assert.equal(assetRecord('block.coal_ore').tile,15);assert.equal(assetRecord('item.coal').directCanonical,true);assert.equal(assetRecord('item.coal').minecraftVersion,'1.20.1');assert.equal(existsSync(resolve(process.cwd(),assetRecord('item.coal').url)),true);
assert.equal(canHarvestBlock(BLOCK.COAL_ORE,null),false);assert.equal(canHarvestBlock(BLOCK.COAL_ORE,'wooden_pickaxe'),true);assert.equal(canHarvestBlock(BLOCK.COAL_ORE,'stone_pickaxe'),true);assert.equal(canHarvestBlock(BLOCK.COAL_ORE,'iron_pickaxe'),true);assert.ok(miningDurationMs(BLOCK.COAL_ORE,'wooden_pickaxe')<miningDurationMs(BLOCK.COAL_ORE,null));assert.ok(miningDurationMs(BLOCK.COAL_ORE,'stone_pickaxe')<miningDurationMs(BLOCK.COAL_ORE,'wooden_pickaxe'));
function authoritativeBreak(itemId){let block=BLOCK.COAL_ORE;const drops=[];const world={getBlock(x,y,z){return x===0&&y===11&&z===-1?block:BLOCK.AIR;}};const setBlock=(x,y,z,id)=>{const previous=block,changed=x===0&&y===11&&z===-1&&previous!==id;if(changed)block=id;return{changed,x,y,z,previous,id};};const controller=new SurvivalBlockBreakController({world,setBlock,onDrop:drop=>drops.push(drop)}),session=`coal-${itemId}`,player={mode:'survival',position:{x:.5,y:10,z:.5},yaw:0,pitch:0};controller.observePrimary(session,true);let result=null;for(let ticks=0;ticks<100&&!result?.breakResult?.changed;ticks++)result=controller.step(session,player,{id:itemId,count:1},{dt:.05});assert.equal(result?.breakResult?.changed,true);assert.equal(block,BLOCK.AIR);return{result,drops};}const wood=authoritativeBreak('wooden_pickaxe');assert.equal(wood.result.drop?.itemId,'coal');assert.equal(wood.result.drop?.count,1);assert.equal(wood.result.drop?.blockId,BLOCK.COAL_ORE);assert.deepEqual(wood.drops.map(drop=>drop.itemId),['coal']);
assert.equal(FURNACE_FUELS.coal,1600);assert.equal(furnaceFuelTicks('coal'),1600);assert.equal(isFurnaceFuel('coal'),true);const furnace=createFurnaceState({slots:[{id:'raw_iron',count:1},{id:'coal',count:1},null]});const cooked=tickFurnace(furnace,200);assert.equal(cooked.consumedFuel,1);assert.equal(cooked.smelted,1);assert.equal(cooked.state.slots[0],null);assert.equal(cooked.state.slots[1],null);assert.deepEqual(cooked.state.slots[2],{id:'iron_ingot',count:1});assert.equal(cooked.state.burnRemaining,1400);
assert.equal(TERRAIN_GENERATOR_VERSION,3);const terrain=createTerrainGenerator({seed:'coal-progression',prompt:'平原'});let coal=0,iron=0,coalChunks=0;for(let cx=-2;cx<=2;cx++)for(let cz=-2;cz<=2;cz++){const chunk=terrain.generateChunk(cx,cz),repeat=terrain.generateChunk(cx,cz);assert.deepEqual(repeat,chunk);let localCoal=0;for(let y=0;y<WORLD_HEIGHT;y++)for(let z=0;z<CHUNK_SIZE;z++)for(let x=0;x<CHUNK_SIZE;x++){const id=chunk[terrainChunkIndex(x,y,z)];if(id===BLOCK.COAL_ORE){const wx=cx*CHUNK_SIZE+x,wz=cz*CHUNK_SIZE+z,top=terrain.heightAt(wx,wz);assert.ok(y>=4&&y<=Math.min(56,top-4));assert.equal(terrain.isIronOre(wx,y,wz,top),false);assert.equal(terrain.isCoalOre(wx,y,wz,top),true);coal++;localCoal++;}else if(id===BLOCK.IRON_ORE)iron++;}if(localCoal)coalChunks++;}assert.equal(coal,1996);assert.equal(iron,1055);assert.equal(coalChunks,24);assert.ok(coal>iron);
console.log('wood pickaxe -> coal ore -> canonical coal item -> 1600-tick furnace fuel + deterministic terrain v3: PASS');
""")

# ---- Browser contract ----
write('tests/e2e/coal-progression.spec.mjs', """import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';
async function runCommand(page,text){await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);await page.locator('#chat-input').fill(text);await page.locator('#chat-input').press('Enter');await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);}
async function key(page,code){await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true})),code);}async function lockPointer(page){const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');}
test('singleplayer wooden pickaxe harvests coal ore into canonical coal',async({page})=>{const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});await page.goto('/?e2e=1');await createSingleplayerWorld(page,{name:'CI Coal Progression',seed:'ci-coal-progression-2026',mode:'survival',prompt:'平原'});await runCommand(page,'/tp 0 35 0');await runCommand(page,'/give wooden_pickaxe 1');await key(page,'KeyE');await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);const pickaxe=page.locator('#inventory-grid [data-inv-index]').filter({has:page.locator('img[alt="木镐"]')}).first();await expect(pickaxe).toBeVisible();await pickaxe.click({modifiers:['Shift']});await key(page,'Escape');const selected=page.locator('#hotbar [data-hotbar-index="0"]');await expect(selected).toHaveAttribute('title','木镐');await lockPointer(page);const target=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(27)||null);expect(target).not.toBeNull();expect(target.id).toBe(27);await expect(page.locator('#jade-hud')).not.toHaveClass(/hidden/,{timeout:5_000});await expect(page.locator('#jade-hud .jade-name')).toHaveText('煤矿石');await expect(page.locator('#jade-hud .jade-details')).toContainText('最低木质');await page.mouse.down({button:'left'});await expect(selected).toHaveAttribute('data-durability-damage','1',{timeout:5_000});await page.mouse.up({button:'left'});await expect(selected).toHaveAttribute('data-durability-remaining','58');const coal=page.locator('#hotbar [data-hotbar-index="1"]');await expect(coal).toHaveAttribute('title','煤炭',{timeout:5_000});await expect(coal.locator('img[alt="煤炭"]')).toBeVisible();await expect(page.locator('#debug')).toContainText('Drops 0',{timeout:5_000});expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);});
""")

# ---- Progress/changelog; PROJECT_BASELINE stays merged-main only ----
progress=path('docs/PROGRESS.md').read_text(encoding='utf-8').replace('当前 merged `main`：\n\n`6159b9f47a54bf7e3610897c55f1ee1fdbf6ed7d`','当前 merged `main`：\n\n`2bb4f98474198d68a9b6fc676422d2f4e850866f`').replace('main 已合并到 PR #124。#124 已完成：','main 已合并到 PR #125。#125 已完成：')
start=progress.index('## 当前进行中：PR #125 Iron Armor Progression');end=progress.index('## 工程规则')
coal_section="""## 当前进行中：Coal Progression

分支：`feature/coal-progression`

基线：`main 2bb4f98474198d68a9b6fc676422d2f4e850866f`

### 本切片

- `BLOCK.COAL_ORE = 27`，不重编号历史方块 ID；
- canonical Java 1.20.1 `coal_ore.png` 进入 4×4 terrain atlas 的 tile 15；
- white wool item 改为直接引用 canonical `white_wool.png`，无需扩大 atlas 或改变旧 UV；
- canonical `coal.png` 直接作为煤炭物品纹理；
- 木镐及以上可采集煤矿并掉落 `coal`；
- coal Furnace fuel = **1600 ticks**；
- terrain generator **v3** 新增独立 deterministic coal field；
- 生成顺序保持 `iron -> coal`，煤矿不能覆盖已有 v2 铁矿位置；
- v3 golden regression 同时锁定“coal→stone 后 == v2 raw bytes”和“iron+coal→stone 后 == v1 legacy bytes”。

### 兼容性边界

terrain v3 是有意的生成版本升级。server world-info 仍使用 wire schema v1，但只接受当前 `TERRAIN_GENERATOR_VERSION`；旧 terrain-v2 world-info 会被明确拒绝，避免客户端与服务端用不同 base terrain 解释同一组 edit deltas。

`CREATIVE_START` 不插入 coal/coal ore，继续保持既有 starter-slot 和 authoritative bootstrap 合同。

## 当前验证目标

1. 自动发现的全部 logic/server/Worker checks；
2. terrain v3 四组 golden + v2/v1 normalization compatibility；
3. focused coal singleplayer Chromium：木镐挖煤矿、Jade、耐久、canonical coal pickup；
4. asset-source audit 重建 4×4 terrain atlas，并要求 tracked atlas 与 builder byte-identical；
5. 两个 Chromium shard 全绿；
6. branch 对最新 main `behind=0` 且无 review blocker。

## 本切片明确不做

- charcoal；
- torch recipe / dynamic light；
- coal block；
- Fortune / Silk Touch 与煤矿挖掘 XP；
- caves / biome-dependent ore distribution；
- hunger / food / farming。

## 后续连续开发顺序

1. **Hunger + food core**：hunger、saturation、exhaustion、regen/starvation，至少 bread/apple/cooked meats；
2. **Farming phase 1**：seeds/wheat、farmland moisture/irrigation、growth/harvest、bread chain；
3. **Registry breadth**：stone variants、wood species、slab/stair/fence/door 等通用 block families；
4. **Worldgen**：biomes → caves/aquifers → ores/features → structures；
5. server-authoritative PvE/XP 与 durable persistence。

"""
path('docs/PROGRESS.md').write_text(progress[:start]+coal_section+progress[end:],encoding='utf-8')
changelog=path('CHANGELOG.md').read_text(encoding='utf-8');entry="""
## 2026-08-22 - Coal progression / terrain v3

- 新增煤矿石（block 27）与煤炭物品，木镐及以上可采集；煤炭作为熔炉燃料燃烧 1600 ticks。
- terrain generator 升级到 v3：独立 deterministic coal field，铁矿优先级保持不变；回归测试锁定 coal→stone 后与 v2 字节一致。
- 4×4 terrain atlas 的 tile 15 从 white wool 调整为 canonical Java 1.20.1 coal ore；white wool 与 coal item 改为直接引用仓库中已审计 canonical PNG。
- 增加 coal progression logic + Chromium 回归，并同步 server world-info / authoritative terrain 的版本兼容断言。
"""
if '## 2026-08-22 - Coal progression / terrain v3' not in changelog:
    marker=changelog.find('\n## ');changelog=changelog+entry if marker==-1 else changelog[:marker]+entry+changelog[marker:]
path('CHANGELOG.md').write_text(changelog,encoding='utf-8')

stale=[]
for p in (ROOT/'scripts').glob('check-*.mjs'):
    text=p.read_text(encoding='utf-8')
    for token in ('TERRAIN_GENERATOR_VERSION,2','terrainVersion:2','terrain-v2'):
        if token in text: stale.append(f'{p.relative_to(ROOT)}: {token}')
if stale: raise RuntimeError('stale terrain-v2 executable contracts remain:\n'+'\n'.join(stale))
print('coal progression source patch applied')
