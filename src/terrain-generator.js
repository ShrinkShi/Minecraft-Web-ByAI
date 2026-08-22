import {BLOCK,CHUNK_SIZE,WORLD_HEIGHT} from './blocks.js';

export const TERRAIN_GENERATOR_VERSION=4;
export const SUPPORTED_TERRAIN_GENERATOR_VERSIONS=Object.freeze([2,3,4]);
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
const SHORT_GRASS_SURFACE_CHANCE=.18;
const SHORT_GRASS_SALT=0x61a55;

export function hashTerrainSeed(value=DEFAULT_SEED){
  const text=String(value||DEFAULT_SEED);let hash=FNV_OFFSET;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,FNV_PRIME);}
  return hash>>>0;
}

export function terrainParameters(value=DEFAULT_PROMPT){
  const prompt=String(value??DEFAULT_PROMPT).toLowerCase();
  return{
    amp:/山|mountain|峭壁/.test(prompt)?18:/平原|plain/.test(prompt)?5:10,
    sea:/海|ocean|湖|lake|河|river/.test(prompt)?24:20,
    forest:/森林|forest|丛林|jungle/.test(prompt)?.11:.055,
    sand:/沙漠|desert|沙地/.test(prompt)?.36:.14
  };
}

export function terrainChunkIndex(x,y,z){return x+CHUNK_SIZE*(z+CHUNK_SIZE*y);}

export function normalizeTerrainGeneratorVersion(value=TERRAIN_GENERATOR_VERSION){
  if(!Number.isInteger(value)||!SUPPORTED_TERRAIN_GENERATOR_VERSIONS.includes(value))throw new RangeError(`unsupported terrain generator version: ${value}`);
  return value;
}

export function createTerrainGenerator({seed=DEFAULT_SEED,prompt=DEFAULT_PROMPT,version=TERRAIN_GENERATOR_VERSION}={}){
  version=normalizeTerrainGeneratorVersion(version);
  const seedHash=hashTerrainSeed(seed),parameters=terrainParameters(prompt);

  const hash2=(x,z)=>{
    let hash=Math.imul(x,374761393)^Math.imul(z,668265263)^seedHash;
    hash=(hash^(hash>>>13))*1274126177;
    return((hash^(hash>>>16))>>>0)/4294967295;
  };
  const hash3=(x,y,z,salt=0)=>{
    let hash=seedHash^Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1274126177)^Math.imul(salt,1597334677);
    hash=Math.imul(hash^(hash>>>13),1274126177);
    return((hash^(hash>>>16))>>>0)/4294967295;
  };
  const smooth=t=>t*t*(3-2*t);
  const valueNoise=(x,z)=>{
    const x0=Math.floor(x),z0=Math.floor(z),tx=smooth(x-x0),tz=smooth(z-z0),a=hash2(x0,z0),b=hash2(x0+1,z0),c=hash2(x0,z0+1),d=hash2(x0+1,z0+1),ab=a+(b-a)*tx,cd=c+(d-c)*tx;
    return ab+(cd-ab)*tz;
  };
  const fbm=(x,z)=>{
    let value=0,amplitude=.55,frequency=.035,normalizer=0;
    for(let i=0;i<4;i++){value+=valueNoise(x*frequency,z*frequency)*amplitude;normalizer+=amplitude;amplitude*=.5;frequency*=2;}
    return value/normalizer;
  };
  const heightAt=(x,z)=>{
    const continental=(fbm(x*.55,z*.55)-.5)*parameters.amp,detail=(fbm(x+731,z-271)-.5)*4;
    return Math.max(6,Math.min(WORLD_HEIGHT-10,Math.floor(25+continental+detail)));
  };
  const isIronOre=(x,y,z,top=IRON_MAX_Y+4)=>{
    if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||!Number.isInteger(top))throw new TypeError('iron ore coordinates and surface height must be integers');
    const maxY=Math.min(IRON_MAX_Y,top-4);
    if(y<IRON_MIN_Y||y>maxY)return false;
    const vein=hash3(Math.floor(x/IRON_VEIN_CELL),Math.floor(y/IRON_VEIN_CELL),Math.floor(z/IRON_VEIN_CELL),IRON_VEIN_SALT);
    if(vein>=IRON_VEIN_CHANCE)return false;
    return hash3(x,y,z,IRON_FILL_SALT)<IRON_FILL_CHANCE;
  };
  const isCoalOre=(x,y,z,top=COAL_MAX_Y+4)=>{
    if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||!Number.isInteger(top))throw new TypeError('coal ore coordinates and surface height must be integers');
    if(version<3)return false;
    const maxY=Math.min(COAL_MAX_Y,top-4);
    if(y<COAL_MIN_Y||y>maxY)return false;
    const vein=hash3(Math.floor(x/COAL_VEIN_CELL),Math.floor(y/COAL_VEIN_CELL),Math.floor(z/COAL_VEIN_CELL),COAL_VEIN_SALT);
    if(vein>=COAL_VEIN_CHANCE)return false;
    return hash3(x,y,z,COAL_FILL_SALT)<COAL_FILL_CHANCE;
  };
  const isShortGrassDecoration=(x,y,z)=>version>=4&&hash3(x,y,z,SHORT_GRASS_SALT)<SHORT_GRASS_SURFACE_CHANCE;
  const set=(chunk,x,y,z,id)=>{if(x>=0&&x<CHUNK_SIZE&&z>=0&&z<CHUNK_SIZE&&y>=0&&y<WORLD_HEIGHT)chunk[terrainChunkIndex(x,y,z)]=id;};
  const tree=(chunk,lx,base,lz)=>{
    for(let y=0;y<4;y++)set(chunk,lx,base+y,lz,BLOCK.LOG);
    for(let y=base+2;y<=base+5;y++)for(let x=lx-2;x<=lx+2;x++)for(let z=lz-2;z<=lz+2;z++){
      const distance=Math.abs(x-lx)+Math.abs(z-lz)+(y===base+5?1:0);
      if(distance<=4&&!(x===lx&&z===lz&&y<base+4))set(chunk,x,y,z,BLOCK.LEAVES);
    }
  };

  const generateChunk=(cx,cz)=>{
    if(!Number.isInteger(cx)||!Number.isInteger(cz))throw new TypeError('chunk coordinates must be integers');
    const chunk=new Uint8Array(CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT);
    for(let lx=0;lx<CHUNK_SIZE;lx++)for(let lz=0;lz<CHUNK_SIZE;lz++){
      const wx=cx*CHUNK_SIZE+lx,wz=cz*CHUNK_SIZE+lz,top=heightAt(wx,wz),moisture=fbm(wx+2000,wz-900);
      for(let y=0;y<=top;y++){
        let id=BLOCK.STONE;
        if(y===top)id=top<=parameters.sea+1||moisture<parameters.sand?BLOCK.SAND:BLOCK.GRASS;
        else if(y>=top-3)id=top<=parameters.sea+1||moisture<parameters.sand?BLOCK.SAND:BLOCK.DIRT;
        else if(isIronOre(wx,y,wz,top))id=BLOCK.IRON_ORE;
        else if(isCoalOre(wx,y,wz,top))id=BLOCK.COAL_ORE;
        set(chunk,lx,y,lz,id);
      }
      for(let y=top+1;y<=parameters.sea;y++)set(chunk,lx,y,lz,BLOCK.WATER);
      if(top>parameters.sea+1&&chunk[terrainChunkIndex(lx,top,lz)]===BLOCK.GRASS&&hash2(wx*7,wz*7)<parameters.forest&&lx>2&&lx<13&&lz>2&&lz<13)tree(chunk,lx,top+1,lz);
      if(version>=4&&top>parameters.sea+1&&top+1<WORLD_HEIGHT&&chunk[terrainChunkIndex(lx,top,lz)]===BLOCK.GRASS&&chunk[terrainChunkIndex(lx,top+1,lz)]===BLOCK.AIR&&isShortGrassDecoration(wx,top+1,wz))set(chunk,lx,top+1,lz,BLOCK.SHORT_GRASS);
    }
    return chunk;
  };

  return Object.freeze({version,seedHash,parameters:Object.freeze({...parameters}),hash2,hash3,valueNoise,fbm,heightAt,isIronOre,isCoalOre,isShortGrassDecoration,generateChunk});
}
