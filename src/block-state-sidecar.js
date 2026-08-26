import {
  blockDefaultStateKey,
  blockStateSchemaForId,
  canonicalBlockStateKeyForId,
  parseCanonicalBlockStateKeyForId
} from './block-state-registry.js';

const lexicalCompare=(a,b)=>a<b?-1:a>b?1:0;

function blockId(value){
  const id=Number(value);
  if(!Number.isInteger(id)||id<0||id>255)throw new RangeError('block id must be an integer in 0..255');
  return id;
}
function cellIndex(value){
  const index=Number(value);
  if(!Number.isSafeInteger(index)||index<0)throw new RangeError('block-state sidecar index must be a non-negative safe integer');
  return index;
}
function chunkKey(value){
  if(typeof value!=='string'||value.length===0)throw new TypeError('block-state sidecar chunk key must be a non-empty string');
  return value;
}
function identity(id,stateKey){return Object.freeze({id,stateKey});}

export function blockIdentity(blockIdValue,state={}){
  const id=blockId(blockIdValue);
  return identity(id,canonicalBlockStateKeyForId(id,state));
}

export function blockIdentityFromKey(blockIdValue,stateKey=null){
  const id=blockId(blockIdValue),schema=blockStateSchemaForId(id);
  if(!schema){
    parseCanonicalBlockStateKeyForId(id,stateKey);
    return identity(id,null);
  }
  const key=stateKey===null||stateKey===undefined?blockDefaultStateKey(id):stateKey;
  parseCanonicalBlockStateKeyForId(id,key);
  return identity(id,key);
}

export function blockIdentityEqual(a,b){
  return !!a&&!!b&&Number(a.id)===Number(b.id)&&(a.stateKey??null)===(b.stateKey??null);
}

export class BlockStateSidecar{
  constructor(serialized={}){
    this.entries=new Map();
    this.import(serialized);
  }

  import(serialized={}){
    if(!serialized||typeof serialized!=='object'||Array.isArray(serialized))throw new TypeError('block-state sidecar snapshot must be an object');
    for(const [rawChunkKey,rows] of Object.entries(serialized)){
      const key=chunkKey(rawChunkKey);
      if(!Array.isArray(rows))throw new TypeError(`block-state sidecar ${key} entries must be an array`);
      for(const row of rows){
        if(!Array.isArray(row)||row.length!==3)throw new TypeError(`block-state sidecar ${key} entry must be [index,id,stateKey]`);
        const [rawIndex,rawId,rawStateKey]=row,index=cellIndex(rawIndex),id=blockId(rawId);
        const value=blockIdentityFromKey(id,rawStateKey);
        const defaultKey=blockDefaultStateKey(id);
        if(value.stateKey===defaultKey)continue;
        this.chunkEntries(key,true).set(index,value);
      }
    }
    this.pruneEmptyChunks();
    return this;
  }

  chunkEntries(rawChunkKey,create=false){
    const key=chunkKey(rawChunkKey);
    let entries=this.entries.get(key);
    if(!entries&&create){entries=new Map();this.entries.set(key,entries);}
    return entries||null;
  }

  get(rawChunkKey,rawIndex,blockIdValue){
    const key=chunkKey(rawChunkKey),index=cellIndex(rawIndex),id=blockId(blockIdValue);
    const stored=this.entries.get(key)?.get(index);
    if(stored&&stored.id===id)return stored;
    return blockIdentity(id);
  }

  set(rawChunkKey,rawIndex,blockIdValue,state={}){
    const key=chunkKey(rawChunkKey),index=cellIndex(rawIndex),value=blockIdentity(blockIdValue,state),defaultKey=blockDefaultStateKey(value.id);
    if(value.stateKey===defaultKey){
      this.delete(key,index);
      return value;
    }
    this.chunkEntries(key,true).set(index,value);
    return value;
  }

  setFromKey(rawChunkKey,rawIndex,blockIdValue,stateKey=null){
    const key=chunkKey(rawChunkKey),index=cellIndex(rawIndex),value=blockIdentityFromKey(blockIdValue,stateKey),defaultKey=blockDefaultStateKey(value.id);
    if(value.stateKey===defaultKey){
      this.delete(key,index);
      return value;
    }
    this.chunkEntries(key,true).set(index,value);
    return value;
  }

  delete(rawChunkKey,rawIndex){
    const key=chunkKey(rawChunkKey),index=cellIndex(rawIndex),entries=this.entries.get(key);
    if(!entries)return false;
    const changed=entries.delete(index);
    if(entries.size===0)this.entries.delete(key);
    return changed;
  }

  clear(){this.entries.clear();}
  get size(){let total=0;for(const entries of this.entries.values())total+=entries.size;return total;}

  pruneEmptyChunks(){for(const [key,entries] of this.entries)if(entries.size===0)this.entries.delete(key);}

  export(){
    const output={};
    for(const key of [...this.entries.keys()].sort(lexicalCompare)){
      const rows=[...this.entries.get(key).entries()]
        .sort(([a],[b])=>a-b)
        .map(([index,value])=>[index,value.id,value.stateKey]);
      if(rows.length)output[key]=rows;
    }
    return output;
  }
}
