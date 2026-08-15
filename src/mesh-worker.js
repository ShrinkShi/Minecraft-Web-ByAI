import {BLOCKS,CHUNK_SIZE,WORLD_HEIGHT,ATLAS_COLS,ATLAS_ROWS,tileForFace} from './blocks.js';

const FACES=[
  {n:[1,0,0],name:'east',v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]},
  {n:[-1,0,0],name:'west',v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]},
  {n:[0,1,0],name:'top',v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},
  {n:[0,-1,0],name:'bottom',v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},
  {n:[0,0,1],name:'south',v:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]},
  {n:[0,0,-1],name:'north',v:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]}
];
const TRI=[0,1,2,0,2,3];
const UV_ORDER=[[0,0],[0,1],[1,1],[1,0]];
const index=(x,y,z)=>x+CHUNK_SIZE*(z+CHUNK_SIZE*y);

function faceVisible(id,neighbor){
  if(neighbor===0)return true;
  const a=BLOCKS[id],b=BLOCKS[neighbor]||BLOCKS[0];
  if(a.liquid)return neighbor!==id&&!b.solid;
  if(a.transparent)return neighbor!==id&&!b.solid;
  return !!b.transparent;
}

function buildMesh(data,blockAt,accept){
  let faceCount=0;
  for(let y=0;y<WORLD_HEIGHT;y++)for(let z=0;z<CHUNK_SIZE;z++)for(let x=0;x<CHUNK_SIZE;x++){
    const id=data[index(x,y,z)];
    if(!id||!accept(id))continue;
    for(const f of FACES)if(faceVisible(id,blockAt(x+f.n[0],y+f.n[1],z+f.n[2])))faceCount++;
  }

  if(faceCount===0)return{empty:true};

  const positions=new Float32Array(faceCount*12);
  const normals=new Int8Array(faceCount*12);
  const uvs=new Float32Array(faceCount*8);
  const colors=new Uint8Array(faceCount*12);
  const indices=new Uint32Array(faceCount*6);
  let faceIndex=0;

  for(let y=0;y<WORLD_HEIGHT;y++)for(let z=0;z<CHUNK_SIZE;z++)for(let x=0;x<CHUNK_SIZE;x++){
    const id=data[index(x,y,z)];
    if(!id||!accept(id))continue;
    for(const f of FACES){
      if(!faceVisible(id,blockAt(x+f.n[0],y+f.n[1],z+f.n[2])))continue;
      const tile=tileForFace(id,f.name),tx=tile%ATLAS_COLS,ty=Math.floor(tile/ATLAS_COLS),eps=.001;
      const u0=tx/ATLAS_COLS+eps,u1=(tx+1)/ATLAS_COLS-eps,v1=1-ty/ATLAS_ROWS-eps,v0=1-(ty+1)/ATLAS_ROWS+eps;
      const shade=f.n[1]>0?255:f.n[1]<0?158:f.n[0]!==0?212:184,tint=BLOCKS[id]?.tint||[255,255,255];
      const vertexBase=faceIndex*4,positionBase=faceIndex*12,uvBase=faceIndex*8,indexBase=faceIndex*6;
      for(let i=0;i<4;i++){
        const p=f.v[i],po=positionBase+i*3,uo=uvBase+i*2;
        positions[po]=x+p[0];positions[po+1]=y+p[1];positions[po+2]=z+p[2];
        normals[po]=f.n[0]*127;normals[po+1]=f.n[1]*127;normals[po+2]=f.n[2]*127;
        colors[po]=Math.round(shade*(Number(tint[0])||0)/255);colors[po+1]=Math.round(shade*(Number(tint[1])||0)/255);colors[po+2]=Math.round(shade*(Number(tint[2])||0)/255);
        const uvOrder=UV_ORDER[i];uvs[uo]=uvOrder[0]?u1:u0;uvs[uo+1]=uvOrder[1]?v1:v0;
      }
      for(let i=0;i<6;i++)indices[indexBase+i]=vertexBase+TRI[i];
      faceIndex++;
    }
  }

  return{
    empty:false,
    positions:positions.buffer,normals:normals.buffer,uvs:uvs.buffer,colors:colors.buffer,indices:indices.buffer
  };
}

function transferables(mesh){return mesh.empty?[]:[mesh.positions,mesh.normals,mesh.uvs,mesh.colors,mesh.indices];}

self.onmessage=e=>{
  const m=e.data;
  if(m.type!=='mesh')return;
  const data=new Uint8Array(m.data);
  const px=m.px?new Uint8Array(m.px):null;
  const nx=m.nx?new Uint8Array(m.nx):null;
  const pz=m.pz?new Uint8Array(m.pz):null;
  const nz=m.nz?new Uint8Array(m.nz):null;

  function blockAt(x,y,z){
    if(y<0)return 3;
    if(y>=WORLD_HEIGHT)return 0;
    if(x<0)return nx?nx[index(CHUNK_SIZE-1,y,z)]:0;
    if(x>=CHUNK_SIZE)return px?px[index(0,y,z)]:0;
    if(z<0)return nz?nz[index(x,y,CHUNK_SIZE-1)]:0;
    if(z>=CHUNK_SIZE)return pz?pz[index(x,y,0)]:0;
    return data[index(x,y,z)];
  }

  const opaque=buildMesh(data,blockAt,id=>!BLOCKS[id]?.liquid);
  const water=buildMesh(data,blockAt,id=>!!BLOCKS[id]?.liquid);
  const legacyOpaque=opaque.empty?{empty:true}:{
    empty:false,positions:opaque.positions,normals:opaque.normals,uvs:opaque.uvs,colors:opaque.colors,indices:opaque.indices
  };
  self.postMessage(
    {type:'mesh',key:m.key,cx:m.cx,cz:m.cz,version:m.version,opaque,water,...legacyOpaque},
    [...transferables(opaque),...transferables(water)]
  );
};
