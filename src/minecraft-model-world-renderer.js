import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {requireAssetUrl} from './asset-manifest.js';
import {loadMinecraftModelAtlasResolver} from './minecraft-model-texture-binding.js';
import {loadMinecraftModelRuntime} from './minecraft-model-runtime.js';
import {CHUNK_SIZE} from './blocks.js';

const LAYERS=Object.freeze(['opaque','cutout','translucent']);

function bufferPart(part,label){
  if(!part||part.empty)return null;
  for(const key of ['positions','normals','uvs','colors','indices']){
    if(!(part[key] instanceof ArrayBuffer))throw new TypeError(`${label}.${key} must be an ArrayBuffer`);
  }
  return part;
}

export class MinecraftModelWorldRenderer{
  constructor(scene){
    if(!scene||typeof scene.add!=='function'||typeof scene.remove!=='function')throw new TypeError('scene must expose add/remove');
    this.scene=scene;
    this.status='loading';
    this.error=null;
    this.blockIds=Object.freeze([]);
    this.textureCount=0;
    this.disposed=false;
    this.initializationPromise=null;
    this.atlasTexture=this.makeAtlasTexture();
    this.materials=this.makeMaterials();
  }

  makeAtlasTexture(){
    const texture=new THREE.TextureLoader().load(requireAssetUrl('block.model_atlas'));
    texture.magFilter=THREE.NearestFilter;
    texture.minFilter=THREE.NearestMipmapNearestFilter;
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.name='minecraft-model-atlas';
    texture.userData.assetKey='block.model_atlas';
    return texture;
  }

  makeMaterials(){
    return Object.freeze({
      opaque:new THREE.MeshLambertMaterial({map:this.atlasTexture,vertexColors:true,transparent:false}),
      cutout:new THREE.MeshLambertMaterial({map:this.atlasTexture,vertexColors:true,transparent:false,alphaTest:.1}),
      translucent:new THREE.MeshLambertMaterial({map:this.atlasTexture,vertexColors:true,transparent:true,opacity:1,depthWrite:false})
    });
  }

  initializeWorker(worker,{fetchImpl=globalThis.fetch}={}){
    if(!worker||typeof worker.postMessage!=='function')return Promise.reject(new TypeError('mesh worker must expose postMessage'));
    if(this.initializationPromise)return this.initializationPromise;
    this.initializationPromise=(async()=>{
      try{
        const [runtime,atlasResolver]=await Promise.all([
          loadMinecraftModelRuntime({fetchImpl}),
          loadMinecraftModelAtlasResolver({fetchImpl})
        ]);
        if(this.disposed)return'disposed';
        worker.postMessage({type:'minecraft-model-runtime-init',runtime,atlasManifest:atlasResolver.manifest});
        return'pending';
      }catch(error){
        if(this.disposed)return'disposed';
        this.status='fallback';
        this.error=String(error?.message||error);
        console.warn('Minecraft interpreted-model runtime disabled; using legacy block mesh fallback.',error);
        return'fallback';
      }
    })();
    return this.initializationPromise;
  }

  handleWorkerMessage(message){
    if(!message||typeof message!=='object')return null;
    if(message.type==='minecraft-model-runtime-ready'){
      this.status='ready';
      this.error=null;
      this.blockIds=Object.freeze(Array.isArray(message.blockIds)?message.blockIds.map(Number):[]);
      this.textureCount=Number(message.textureCount)||0;
      return Object.freeze({handled:true,ready:true,status:this.status});
    }
    if(message.type==='minecraft-model-runtime-error'){
      this.status='fallback';
      this.error=String(message.message||'unknown worker initialization error');
      console.warn(`Minecraft interpreted-model worker rejected runtime: ${this.error}`);
      return Object.freeze({handled:true,ready:true,status:this.status});
    }
    return null;
  }

  makeChunkMesh(part,layer,cx,cz){
    if(!LAYERS.includes(layer))throw new TypeError(`unsupported Minecraft model render layer: ${layer}`);
    const normalized=bufferPart(part,`interpreted.${layer}`);
    if(!normalized)return null;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(normalized.positions),3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(normalized.normals),3));
    geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(normalized.uvs),2));
    geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(normalized.colors),3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(normalized.indices),1));
    geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,this.materials[layer]);
    mesh.name=`chunk-model-${layer}:${cx},${cz}`;
    mesh.position.set(cx*CHUNK_SIZE,0,cz*CHUNK_SIZE);
    mesh.matrixAutoUpdate=false;
    mesh.updateMatrix();
    mesh.frustumCulled=true;
    mesh.renderOrder=layer==='translucent'?2:0;
    this.scene.add(mesh);
    return mesh;
  }

  makeChunkMeshes(interpreted,cx,cz){
    if(!interpreted||typeof interpreted!=='object')return null;
    const record={};
    for(const layer of LAYERS){
      const mesh=this.makeChunkMesh(interpreted[layer],layer,cx,cz);
      if(mesh)record[layer]=mesh;
    }
    return Object.keys(record).length?record:null;
  }

  disposeChunkMeshes(record){
    if(!record)return;
    for(const layer of LAYERS){
      const mesh=record[layer];
      if(!mesh)continue;
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
  }

  dispose(){
    if(this.disposed)return;
    this.disposed=true;
    for(const material of Object.values(this.materials))material.dispose();
    this.atlasTexture.dispose();
  }
}
