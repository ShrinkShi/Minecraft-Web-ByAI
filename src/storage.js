const DB_NAME = 'minecraft-web-by-ai';
const DB_VERSION = 1;
const WORLD_STORE = 'worlds';

function openDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onerror=()=>reject(request.error);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(WORLD_STORE)){
        const store=db.createObjectStore(WORLD_STORE,{keyPath:'id'});
        store.createIndex('updatedAt','updatedAt');
      }
    };
    request.onsuccess=()=>resolve(request.result);
  });
}

function requestResult(request){
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

export function worldIdFor(name,seed){
  const source=`${name || '新的世界'}\u0000${seed || '0'}`;
  let hash=2166136261>>>0;
  for(let i=0;i<source.length;i++){
    hash^=source.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return `world-${(hash>>>0).toString(16).padStart(8,'0')}`;
}

export class WorldStorage{
  constructor(){this.dbPromise=null}
  db(){
    if(!('indexedDB' in globalThis))return Promise.reject(new Error('当前浏览器不支持 IndexedDB'));
    this.dbPromise ||= openDatabase();
    return this.dbPromise;
  }
  async getWorld(id){
    const db=await this.db();
    const tx=db.transaction(WORLD_STORE,'readonly');
    return requestResult(tx.objectStore(WORLD_STORE).get(id));
  }
  async putWorld(record){
    const db=await this.db();
    const tx=db.transaction(WORLD_STORE,'readwrite');
    const done=new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
    tx.objectStore(WORLD_STORE).put(record);
    await done;
  }
  async listWorlds(){
    const db=await this.db();
    const tx=db.transaction(WORLD_STORE,'readonly');
    const all=await requestResult(tx.objectStore(WORLD_STORE).getAll());
    return all.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  }
}
