import {BLOCK,BLOCKS,CHUNK_SIZE,WORLD_HEIGHT} from '../src/blocks.js';
import {createTerrainGenerator,terrainChunkIndex} from '../src/terrain-generator.js';

export const DEFAULT_SERVER_TERRAIN_CACHE_CHUNKS=256;
export const MAX_SERVER_TERRAIN_CACHE_CHUNKS=4096;

const chunkKey=(cx,cz)=>`${cx},${cz}`;
const editKey=(x,y,z)=>`${x},${y},${z}`;
const floorDiv=(value,divisor)=>Math.floor(value/divisor);
const mod=(value,divisor)=>((value%divisor)+divisor)%divisor;
function integer(value,label){if(!Number.isInteger(value))throw new TypeError(`${label} must be an integer`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function cacheLimit(value){if(!Number.isInteger(value)||value<1||value>MAX_SERVER_TERRAIN_CACHE_CHUNKS)throw new RangeError(`maxCacheChunks must be an integer from 1 to ${MAX_SERVER_TERRAIN_CACHE_CHUNKS}`);return value;}
function blockId(value){if(!Number.isInteger(value)||value<0||!BLOCKS[value])throw new RangeError('block id must reference a known block');return value;}
function editableY(value){value=integer(value,'wy');if(value<0||value>=WORLD_HEIGHT)throw new RangeError(`wy must be from 0 to ${WORLD_HEIGHT-1} for mutable terrain`);return value;}
function parseEditKey(value){const[x,y,z]=value.split(',').map(Number);return{x,y,z};}

export class ServerTerrainWorld{
  #generator;
  #cache;
  #edits;
  #revision;

  constructor({seed='1',prompt='',maxCacheChunks=DEFAULT_SERVER_TERRAIN_CACHE_CHUNKS}={}){
    this.seed=String(seed||'1');this.prompt=String(prompt||'');this.maxCacheChunks=cacheLimit(maxCacheChunks);this.#generator=createTerrainGenerator({seed:this.seed,prompt:this.prompt});this.#cache=new Map();this.#edits=new Map();this.#revision=0;
    this.environment=Object.freeze({isSolidBlock:(x,y,z)=>this.isSolidBlock(x,y,z),isLiquidBlock:(x,y,z)=>this.isLiquidBlock(x,y,z)});
  }

  get cacheSize(){return this.#cache.size;}
  get editCount(){return this.#edits.size;}
  get revision(){return this.#revision;}
  clearCache(){this.#cache.clear();}
  hasCachedChunk(cx,cz){return this.#cache.has(chunkKey(integer(cx,'cx'),integer(cz,'cz')));}

  #getChunk(cx,cz){
    cx=integer(cx,'cx');cz=integer(cz,'cz');const key=chunkKey(cx,cz),cached=this.#cache.get(key);
    if(cached){this.#cache.delete(key);this.#cache.set(key,cached);return cached;}
    const chunk=this.#generator.generateChunk(cx,cz);this.#cache.set(key,chunk);
    while(this.#cache.size>this.maxCacheChunks)this.#cache.delete(this.#cache.keys().next().value);
    return chunk;
  }

  getChunkSnapshot(cx,cz){
    cx=integer(cx,'cx');cz=integer(cz,'cz');const snapshot=this.#getChunk(cx,cz).slice();if(!this.#edits.size)return snapshot;
    for(const[key,id]of this.#edits){const{x,y,z}=parseEditKey(key);if(floorDiv(x,CHUNK_SIZE)!==cx||floorDiv(z,CHUNK_SIZE)!==cz)continue;snapshot[terrainChunkIndex(mod(x,CHUNK_SIZE),y,mod(z,CHUNK_SIZE))]=id;}return snapshot;
  }

  prefetchAround(worldX,worldZ,chunkRadius=1){
    worldX=finite(worldX,'worldX');worldZ=finite(worldZ,'worldZ');chunkRadius=integer(chunkRadius,'chunkRadius');if(chunkRadius<0||chunkRadius>16)throw new RangeError('chunkRadius must be an integer from 0 to 16');
    const centerX=floorDiv(Math.floor(worldX),CHUNK_SIZE),centerZ=floorDiv(Math.floor(worldZ),CHUNK_SIZE),keys=[];
    for(let radius=0;radius<=chunkRadius;radius++)for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
      if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;const cx=centerX+dx,cz=centerZ+dz;this.#getChunk(cx,cz);keys.push(chunkKey(cx,cz));
    }return keys;
  }

  getBaseBlock(wx,wy,wz){
    wx=integer(wx,'wx');wy=integer(wy,'wy');wz=integer(wz,'wz');if(wy<0)return BLOCK.STONE;if(wy>=WORLD_HEIGHT)return BLOCK.AIR;
    const cx=floorDiv(wx,CHUNK_SIZE),cz=floorDiv(wz,CHUNK_SIZE),chunk=this.#getChunk(cx,cz),lx=mod(wx,CHUNK_SIZE),lz=mod(wz,CHUNK_SIZE);return chunk[terrainChunkIndex(lx,wy,lz)];
  }

  getBlock(wx,wy,wz){wx=integer(wx,'wx');wy=integer(wy,'wy');wz=integer(wz,'wz');if(wy<0)return BLOCK.STONE;if(wy>=WORLD_HEIGHT)return BLOCK.AIR;const edited=this.#edits.get(editKey(wx,wy,wz));return edited===undefined?this.getBaseBlock(wx,wy,wz):edited;}

  setBlock(wx,wy,wz,id){
    wx=integer(wx,'wx');wy=editableY(wy);wz=integer(wz,'wz');id=blockId(id);const previous=this.getBlock(wx,wy,wz),base=this.getBaseBlock(wx,wy,wz),key=editKey(wx,wy,wz);if(previous===id)return Object.freeze({changed:false,revision:this.#revision,x:wx,y:wy,z:wz,previous,id,base,storedEdit:this.#edits.has(key)});
    if(id===base)this.#edits.delete(key);else this.#edits.set(key,id);this.#revision=(this.#revision+1)>>>0;return Object.freeze({changed:true,revision:this.#revision,x:wx,y:wy,z:wz,previous,id,base,storedEdit:this.#edits.has(key)});
  }

  editEntries(){const entries=[];for(const[key,id]of this.#edits){const{x,y,z}=parseEditKey(key);entries.push({x,y,z,id});}entries.sort((a,b)=>a.x-b.x||a.z-b.z||a.y-b.y||a.id-b.id);return entries.map(Object.freeze);}
  exportEdits(){const result={};for(const{x,y,z,id}of this.editEntries())result[editKey(x,y,z)]=id;return result;}
  isSolidBlock(x,y,z){return !!BLOCKS[this.getBlock(x,y,z)]?.solid;}
  isLiquidBlock(x,y,z){return !!BLOCKS[this.getBlock(x,y,z)]?.liquid;}
  highestSolid(x,z){const wx=Math.floor(finite(x,'x')),wz=Math.floor(finite(z,'z'));for(let y=WORLD_HEIGHT-1;y>=0;y--)if(this.isSolidBlock(wx,y,wz))return y;return 0;}
}
