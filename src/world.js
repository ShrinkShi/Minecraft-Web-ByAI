import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCKS,CHUNK_SIZE,WORLD_HEIGHT} from './blocks.js';

const key=(cx,cz)=>`${cx},${cz}`;
const floorDiv=(n,d)=>Math.floor(n/d);
const mod=(n,d)=>((n%d)+d)%d;

export class VoxelWorld{
  constructor(scene,{seed,prompt,renderDistance=3,onProgress=()=>{},savedEdits={},onEdit=()=>{}}={}){
    this.scene=scene;
    this.seed=seed;
    this.prompt=prompt;
    this.renderDistance=renderDistance;
    this.unloadDistance=renderDistance+1;
    this.onProgress=onProgress;
    this.onEdit=onEdit;
    this.chunks=new Map();
    this.meshes=new Map();
    this.pending=new Set();
    this.wanted=new Set();
    this.meshVersions=new Map();
    this.meshQueue=new Set();
    this.meshWorkerBusy=false;
    this.initialPending=new Set();
    this.initialTotal=0;
    this.centerChunk={cx:Number.NaN,cz:Number.NaN};
    this.edits=this.importEdits(savedEdits);
    this.material=this.makeMaterial();
    this.terrainWorker=new Worker(new URL('./world-worker.js',import.meta.url),{type:'module'});
    this.meshWorker=new Worker(new URL('./mesh-worker.js',import.meta.url),{type:'module'});
    this.terrainWorker.onmessage=e=>this.onTerrainWorker(e.data);
    this.meshWorker.onmessage=e=>this.onMeshWorker(e.data);
    this.terrainWorker.postMessage({type:'init',seed,prompt});
  }

  makeMaterial(){
    const tex=new THREE.TextureLoader().load('./assets/textures/atlas.png');
    tex.magFilter=THREE.NearestFilter;
    tex.minFilter=THREE.NearestMipmapNearestFilter;
    tex.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshLambertMaterial({map:tex,vertexColors:true,alphaTest:.08,transparent:false});
  }

  importEdits(saved){
    const result=new Map();
    for(const [chunkKey,entries] of Object.entries(saved||{})){
      if(!Array.isArray(entries)||entries.length===0)continue;
      result.set(chunkKey,new Map(entries.map(([i,id])=>[Number(i),Number(id)])));
    }
    return result;
  }

  exportEdits(){
    const output={};
    for(const [chunkKey,entries] of this.edits){
      if(entries.size)output[chunkKey]=[...entries.entries()];
    }
    return output;
  }

  desiredKeys(cx,cz,radius=this.renderDistance){
    const list=[];
    for(let r=0;r<=radius;r++){
      for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++){
        if(Math.max(Math.abs(x),Math.abs(z))!==r)continue;
        list.push([cx+x,cz+z]);
      }
    }
    return list;
  }

  async generateArea(centerX=0,centerZ=0){
    const cx=floorDiv(centerX,CHUNK_SIZE),cz=floorDiv(centerZ,CHUNK_SIZE);
    this.centerChunk={cx,cz};
    const list=this.desiredKeys(cx,cz);
    this.wanted=new Set(list.map(([x,z])=>key(x,z)));
    this.initialPending=new Set(this.wanted);
    this.initialTotal=this.initialPending.size;
    for(const [x,z] of list)this.requestChunk(x,z);
    this.reportInitialProgress();
    await new Promise(resolve=>{
      const timer=setInterval(()=>{
        if(this.initialPending.size===0){clearInterval(timer);resolve();}
      },20);
    });
  }

  ensureAround(worldX,worldZ){
    const cx=floorDiv(worldX,CHUNK_SIZE),cz=floorDiv(worldZ,CHUNK_SIZE);
    if(cx===this.centerChunk.cx&&cz===this.centerChunk.cz)return;
    this.centerChunk={cx,cz};
    const desired=this.desiredKeys(cx,cz);
    this.wanted=new Set(desired.map(([x,z])=>key(x,z)));
    for(const [x,z] of desired)this.requestChunk(x,z);
    this.unloadFarChunks(cx,cz);
  }

  unloadFarChunks(cx,cz){
    for(const chunkKey of [...this.chunks.keys()]){
      const [x,z]=chunkKey.split(',').map(Number);
      if(Math.max(Math.abs(x-cx),Math.abs(z-cz))<=this.unloadDistance)continue;
      this.unloadChunk(x,z);
    }
  }

  unloadChunk(cx,cz){
    const chunkKey=key(cx,cz);
    const mesh=this.meshes.get(chunkKey);
    if(mesh){this.scene.remove(mesh);mesh.geometry.dispose();this.meshes.delete(chunkKey);}
    this.chunks.delete(chunkKey);
    this.meshQueue.delete(chunkKey);
    this.meshVersions.set(chunkKey,(this.meshVersions.get(chunkKey)||0)+1);
    this.requestMesh(cx-1,cz);this.requestMesh(cx+1,cz);this.requestMesh(cx,cz-1);this.requestMesh(cx,cz+1);
  }

  requestChunk(cx,cz){
    const chunkKey=key(cx,cz);
    if(this.chunks.has(chunkKey)||this.pending.has(chunkKey))return;
    this.pending.add(chunkKey);
    this.terrainWorker.postMessage({type:'generate',cx,cz});
  }

  onTerrainWorker(m){
    if(m.type!=='chunk')return;
    const chunkKey=key(m.cx,m.cz);
    this.pending.delete(chunkKey);
    if(!this.wanted.has(chunkKey)&&!this.initialPending.has(chunkKey))return;
    const data=new Uint8Array(m.data);
    const saved=this.edits.get(chunkKey);
    if(saved)for(const [i,id] of saved)if(i>=0&&i<data.length)data[i]=id;
    this.chunks.set(chunkKey,data);
    this.requestMesh(m.cx,m.cz);
    this.requestMesh(m.cx-1,m.cz);this.requestMesh(m.cx+1,m.cz);this.requestMesh(m.cx,m.cz-1);this.requestMesh(m.cx,m.cz+1);
    if(this.initialPending.delete(chunkKey))this.reportInitialProgress();
  }

  reportInitialProgress(){
    const done=this.initialTotal-this.initialPending.size;
    this.onProgress(done,this.initialTotal);
  }

  requestMesh(cx,cz){
    const chunkKey=key(cx,cz);
    if(!this.chunks.has(chunkKey))return;
    this.meshQueue.add(chunkKey);
    this.pumpMeshQueue();
  }

  pumpMeshQueue(){
    if(this.meshWorkerBusy)return;
    while(this.meshQueue.size){
      const chunkKey=this.meshQueue.values().next().value;
      this.meshQueue.delete(chunkKey);
      const data=this.chunks.get(chunkKey);
      if(!data)continue;
      const [cx,cz]=chunkKey.split(',').map(Number);
      const version=(this.meshVersions.get(chunkKey)||0)+1;
      this.meshVersions.set(chunkKey,version);
      const copy=chunk=>chunk?chunk.slice().buffer:null;
      const payload={
        type:'mesh',key:chunkKey,cx,cz,version,
        data:data.slice().buffer,
        px:copy(this.chunks.get(key(cx+1,cz))),nx:copy(this.chunks.get(key(cx-1,cz))),
        pz:copy(this.chunks.get(key(cx,cz+1))),nz:copy(this.chunks.get(key(cx,cz-1)))
      };
      const transfers=[payload.data,payload.px,payload.nx,payload.pz,payload.nz].filter(Boolean);
      this.meshWorkerBusy=true;
      this.meshWorker.postMessage(payload,transfers);
      return;
    }
  }

  onMeshWorker(m){
    if(m.type!=='mesh')return;
    this.meshWorkerBusy=false;
    if(this.meshVersions.get(m.key)===m.version&&this.chunks.has(m.key)){
      const old=this.meshes.get(m.key);
      if(old){this.scene.remove(old);old.geometry.dispose();this.meshes.delete(m.key);}
      if(!m.empty){
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(m.positions),3));
        geometry.setAttribute('normal',new THREE.BufferAttribute(new Int8Array(m.normals),3,true));
        geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(m.uvs),2));
        geometry.setAttribute('color',new THREE.BufferAttribute(new Uint8Array(m.colors),3,true));
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(m.indices),1));
        geometry.computeBoundingSphere();
        const mesh=new THREE.Mesh(geometry,this.material);
        mesh.position.set(m.cx*CHUNK_SIZE,0,m.cz*CHUNK_SIZE);
        mesh.matrixAutoUpdate=false;mesh.updateMatrix();mesh.frustumCulled=true;
        this.scene.add(mesh);this.meshes.set(m.key,mesh);
      }
    }
    this.pumpMeshQueue();
  }

  index(x,y,z){return x+CHUNK_SIZE*(z+CHUNK_SIZE*y);}

  getBlock(wx,wy,wz){
    if(wy<0||wy>=WORLD_HEIGHT)return wy<0?3:0;
    const cx=floorDiv(wx,CHUNK_SIZE),cz=floorDiv(wz,CHUNK_SIZE),arr=this.chunks.get(key(cx,cz));
    if(!arr)return 0;
    return arr[this.index(mod(wx,CHUNK_SIZE),wy,mod(wz,CHUNK_SIZE))];
  }

  setBlock(wx,wy,wz,id){
    if(wy<0||wy>=WORLD_HEIGHT)return false;
    const cx=floorDiv(wx,CHUNK_SIZE),cz=floorDiv(wz,CHUNK_SIZE),chunkKey=key(cx,cz),arr=this.chunks.get(chunkKey);
    if(!arr)return false;
    const lx=mod(wx,CHUNK_SIZE),lz=mod(wz,CHUNK_SIZE),i=this.index(lx,wy,lz);
    if(arr[i]===id)return false;
    arr[i]=id;
    if(!this.edits.has(chunkKey))this.edits.set(chunkKey,new Map());
    this.edits.get(chunkKey).set(i,id);
    this.requestMesh(cx,cz);
    if(lx===0)this.requestMesh(cx-1,cz);if(lx===CHUNK_SIZE-1)this.requestMesh(cx+1,cz);
    if(lz===0)this.requestMesh(cx,cz-1);if(lz===CHUNK_SIZE-1)this.requestMesh(cx,cz+1);
    this.onEdit({cx,cz,index:i,id});
    return true;
  }

  highestSolid(x,z){
    for(let y=WORLD_HEIGHT-1;y>=0;y--){const b=this.getBlock(Math.floor(x),y,Math.floor(z));if(BLOCKS[b]?.solid)return y;}
    return 0;
  }

  raycast(origin,dir,max=6){
    let last={x:Math.floor(origin.x),y:Math.floor(origin.y),z:Math.floor(origin.z)};
    for(let t=0;t<=max;t+=.04){
      const px=origin.x+dir.x*t,py=origin.y+dir.y*t,pz=origin.z+dir.z*t;
      const cur={x:Math.floor(px),y:Math.floor(py),z:Math.floor(pz)},id=this.getBlock(cur.x,cur.y,cur.z);
      if(id&&id!==8)return{...cur,id,previous:last,distance:t};
      last=cur;
    }
    return null;
  }

  dispose(){
    this.terrainWorker.terminate();this.meshWorker.terminate();
    for(const mesh of this.meshes.values()){this.scene.remove(mesh);mesh.geometry.dispose();}
    this.meshes.clear();this.chunks.clear();this.pending.clear();this.meshQueue.clear();
    this.material.map?.dispose();this.material.dispose();
  }
}
