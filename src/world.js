import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCKS, CHUNK_SIZE, WORLD_HEIGHT, ATLAS_COLS, ATLAS_ROWS, tileForFace} from './blocks.js';

const FACE_DEFS=[
  {n:[1,0,0],name:'side',v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]},
  {n:[-1,0,0],name:'side',v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]},
  {n:[0,1,0],name:'top',v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},
  {n:[0,-1,0],name:'bottom',v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},
  {n:[0,0,1],name:'side',v:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]},
  {n:[0,0,-1],name:'side',v:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]}
];
const IDX=[0,1,2,0,2,3];
function key(cx,cz){return `${cx},${cz}`}
function floorDiv(n,d){return Math.floor(n/d)}
function mod(n,d){return ((n%d)+d)%d}

export class VoxelWorld{
  constructor(scene,{seed,prompt,renderDistance=2,onProgress=()=>{}}={}){
    this.scene=scene;this.seed=seed;this.prompt=prompt;this.renderDistance=renderDistance;this.onProgress=onProgress;this.chunks=new Map();this.meshes=new Map();this.pending=new Set();this.generated=0;this.total=0;
    this.material=this.makeMaterial();
    this.worker=new Worker(new URL('./world-worker.js',import.meta.url),{type:'module'});
    this.worker.onmessage=e=>this.onWorker(e.data);
    this.worker.postMessage({type:'init',seed,prompt});
  }
  makeMaterial(){const tex=new THREE.TextureLoader().load('./assets/textures/atlas.png');tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestMipmapNearestFilter;tex.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshLambertMaterial({map:tex,vertexColors:true,alphaTest:.08,transparent:false})}
  async generateArea(centerX=0,centerZ=0){const cx=floorDiv(centerX,CHUNK_SIZE),cz=floorDiv(centerZ,CHUNK_SIZE);const list=[];for(let r=0;r<=this.renderDistance;r++)for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++){if(Math.max(Math.abs(x),Math.abs(z))!==r)continue;list.push([cx+x,cz+z])}this.total=list.length;this.generated=0;for(const [x,z] of list)this.requestChunk(x,z);await new Promise(resolve=>{const t=setInterval(()=>{if(this.generated>=this.total){clearInterval(t);resolve()}},20)})}
  requestChunk(cx,cz){const k=key(cx,cz);if(this.chunks.has(k)||this.pending.has(k))return;this.pending.add(k);this.worker.postMessage({type:'generate',cx,cz})}
  onWorker(m){if(m.type!=='chunk')return;const k=key(m.cx,m.cz);this.pending.delete(k);this.chunks.set(k,new Uint8Array(m.data));this.rebuildChunk(m.cx,m.cz);this.generated++;this.onProgress(this.generated,this.total)}
  index(x,y,z){return x+CHUNK_SIZE*(z+CHUNK_SIZE*y)}
  getBlock(wx,wy,wz){if(wy<0||wy>=WORLD_HEIGHT)return wy<0?3:0;const cx=floorDiv(wx,CHUNK_SIZE),cz=floorDiv(wz,CHUNK_SIZE),arr=this.chunks.get(key(cx,cz));if(!arr)return 0;return arr[this.index(mod(wx,CHUNK_SIZE),wy,mod(wz,CHUNK_SIZE))]}
  setBlock(wx,wy,wz,id){if(wy<0||wy>=WORLD_HEIGHT)return false;const cx=floorDiv(wx,CHUNK_SIZE),cz=floorDiv(wz,CHUNK_SIZE),arr=this.chunks.get(key(cx,cz));if(!arr)return false;arr[this.index(mod(wx,CHUNK_SIZE),wy,mod(wz,CHUNK_SIZE))]=id;this.rebuildChunk(cx,cz);const lx=mod(wx,CHUNK_SIZE),lz=mod(wz,CHUNK_SIZE);if(lx===0)this.rebuildChunk(cx-1,cz);if(lx===CHUNK_SIZE-1)this.rebuildChunk(cx+1,cz);if(lz===0)this.rebuildChunk(cx,cz-1);if(lz===CHUNK_SIZE-1)this.rebuildChunk(cx,cz+1);return true}
  isFaceVisible(id,neighbor){if(neighbor===0)return true;const a=BLOCKS[id],b=BLOCKS[neighbor];if(a.liquid)return neighbor!==id;if(a.transparent)return neighbor!==id&&!b.solid;return !!b.transparent}
  rebuildChunk(cx,cz){const k=key(cx,cz),arr=this.chunks.get(k);if(!arr)return;const old=this.meshes.get(k);if(old){this.scene.remove(old);old.geometry.dispose();this.meshes.delete(k)}const pos=[],norm=[],uv=[],col=[],ind=[];let vi=0;for(let y=0;y<WORLD_HEIGHT;y++)for(let z=0;z<CHUNK_SIZE;z++)for(let x=0;x<CHUNK_SIZE;x++){const id=arr[this.index(x,y,z)];if(!id)continue;const wx=cx*CHUNK_SIZE+x,wz=cz*CHUNK_SIZE+z;for(const f of FACE_DEFS){const nb=this.getBlock(wx+f.n[0],y+f.n[1],wz+f.n[2]);if(!this.isFaceVisible(id,nb))continue;const tile=tileForFace(id,f.name),tx=tile%ATLAS_COLS,ty=Math.floor(tile/ATLAS_COLS);const eps=.001,u0=tx/ATLAS_COLS+eps,u1=(tx+1)/ATLAS_COLS-eps,v1=1-ty/ATLAS_ROWS-eps,v0=1-(ty+1)/ATLAS_ROWS+eps;const uvs=[[u0,v0],[u0,v1],[u1,v1],[u1,v0]];const shade=f.n[1]>0?1:f.n[1]<0?.62:(f.n[0]!==0?.83:.72);for(let i=0;i<4;i++){const v=f.v[i];pos.push(x+v[0],y+v[1],z+v[2]);norm.push(...f.n);uv.push(...uvs[i]);col.push(shade,shade,shade)}for(const ii of IDX)ind.push(vi+ii);vi+=4}}
    if(!pos.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(ind);g.computeBoundingSphere();const mesh=new THREE.Mesh(g,this.material);mesh.position.set(cx*CHUNK_SIZE,0,cz*CHUNK_SIZE);mesh.matrixAutoUpdate=false;mesh.updateMatrix();mesh.frustumCulled=true;this.scene.add(mesh);this.meshes.set(k,mesh)}
  highestSolid(x,z){for(let y=WORLD_HEIGHT-1;y>=0;y--){const b=this.getBlock(Math.floor(x),y,Math.floor(z));if(BLOCKS[b]?.solid)return y}return 0}
  raycast(origin,dir,max=6){let last={x:Math.floor(origin.x),y:Math.floor(origin.y),z:Math.floor(origin.z)};for(let t=0;t<=max;t+=.04){const p=origin.clone().addScaledVector(dir,t),cur={x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)},id=this.getBlock(cur.x,cur.y,cur.z);if(id&&id!==8)return{...cur,id,previous:last,distance:t};last=cur}return null}
  dispose(){this.worker.terminate();for(const m of this.meshes.values()){this.scene.remove(m);m.geometry.dispose()}this.meshes.clear();this.chunks.clear();this.material.map?.dispose();this.material.dispose()}
}
