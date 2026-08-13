import {BLOCK,BLOCKS,CHUNK_SIZE,WORLD_HEIGHT} from '../src/blocks.js';
import {createTerrainGenerator,terrainChunkIndex} from '../src/terrain-generator.js';

export const DEFAULT_SERVER_TERRAIN_CACHE_CHUNKS=256;
export const MAX_SERVER_TERRAIN_CACHE_CHUNKS=4096;

const key=(cx,cz)=>`${cx},${cz}`;
const floorDiv=(value,divisor)=>Math.floor(value/divisor);
const mod=(value,divisor)=>((value%divisor)+divisor)%divisor;
function integer(value,label){if(!Number.isInteger(value))throw new TypeError(`${label} must be an integer`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function cacheLimit(value){if(!Number.isInteger(value)||value<1||value>MAX_SERVER_TERRAIN_CACHE_CHUNKS)throw new RangeError(`maxCacheChunks must be an integer from 1 to ${MAX_SERVER_TERRAIN_CACHE_CHUNKS}`);return value;}

export class ServerTerrainWorld{
  constructor({seed='1',prompt='',maxCacheChunks=DEFAULT_SERVER_TERRAIN_CACHE_CHUNKS}={}){
    this.seed=String(seed||'1');this.prompt=String(prompt||'');this.maxCacheChunks=cacheLimit(maxCacheChunks);this.generator=createTerrainGenerator({seed:this.seed,prompt:this.prompt});this.cache=new Map();
    this.environment=Object.freeze({isSolidBlock:(x,y,z)=>this.isSolidBlock(x,y,z),isLiquidBlock:(x,y,z)=>this.isLiquidBlock(x,y,z)});
  }

  get cacheSize(){return this.cache.size;}
  clearCache(){this.cache.clear();}
  hasCachedChunk(cx,cz){return this.cache.has(key(integer(cx,'cx'),integer(cz,'cz')));}

  getChunk(cx,cz){
    cx=integer(cx,'cx');cz=integer(cz,'cz');const chunkKey=key(cx,cz),cached=this.cache.get(chunkKey);
    if(cached){this.cache.delete(chunkKey);this.cache.set(chunkKey,cached);return cached;}
    const chunk=this.generator.generateChunk(cx,cz);this.cache.set(chunkKey,chunk);
    while(this.cache.size>this.maxCacheChunks)this.cache.delete(this.cache.keys().next().value);
    return chunk;
  }

  prefetchAround(worldX,worldZ,chunkRadius=1){
    worldX=finite(worldX,'worldX');worldZ=finite(worldZ,'worldZ');chunkRadius=integer(chunkRadius,'chunkRadius');if(chunkRadius<0||chunkRadius>16)throw new RangeError('chunkRadius must be an integer from 0 to 16');
    const centerX=floorDiv(Math.floor(worldX),CHUNK_SIZE),centerZ=floorDiv(Math.floor(worldZ),CHUNK_SIZE),keys=[];
    for(let radius=0;radius<=chunkRadius;radius++)for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
      if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;const cx=centerX+dx,cz=centerZ+dz;this.getChunk(cx,cz);keys.push(key(cx,cz));
    }
    return keys;
  }

  getBlock(wx,wy,wz){
    wx=integer(wx,'wx');wy=integer(wy,'wy');wz=integer(wz,'wz');if(wy<0)return BLOCK.STONE;if(wy>=WORLD_HEIGHT)return BLOCK.AIR;
    const cx=floorDiv(wx,CHUNK_SIZE),cz=floorDiv(wz,CHUNK_SIZE),chunk=this.getChunk(cx,cz),lx=mod(wx,CHUNK_SIZE),lz=mod(wz,CHUNK_SIZE);
    return chunk[terrainChunkIndex(lx,wy,lz)];
  }

  isSolidBlock(x,y,z){return !!BLOCKS[this.getBlock(x,y,z)]?.solid;}
  isLiquidBlock(x,y,z){return !!BLOCKS[this.getBlock(x,y,z)]?.liquid;}

  highestSolid(x,z){
    const wx=Math.floor(finite(x,'x')),wz=Math.floor(finite(z,'z'));
    for(let y=WORLD_HEIGHT-1;y>=0;y--)if(this.isSolidBlock(wx,y,wz))return y;
    return 0;
  }
}
