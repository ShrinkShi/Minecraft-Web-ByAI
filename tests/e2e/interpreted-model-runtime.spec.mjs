import {test,expect} from '@playwright/test';

const FARMING_MODEL_BLOCK_IDS=[9,19,20,21,24,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42];

test('tracked Java 1.20.1 model runtime reaches mesh Worker and VoxelWorld with shared model-atlas materials',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/?e2e=1');

  const result=await page.evaluate(async()=>{
    const [runtimeModule,atlasModule,blocksModule,rendererModule,worldModule]=await Promise.all([
      import('/src/minecraft-model-runtime.js'),import('/src/minecraft-model-texture-binding.js'),import('/src/blocks.js'),import('/src/minecraft-model-world-renderer.js'),import('/src/world.js')
    ]);
    const {loadMinecraftModelRuntime}=runtimeModule,{loadMinecraftModelAtlasResolver}=atlasModule,{BLOCK,CHUNK_SIZE,WORLD_HEIGHT}=blocksModule,{MinecraftModelWorldRenderer}=rendererModule,{VoxelWorld}=worldModule;
    const waitFor=async(predicate,{timeout=10_000,label='condition'}={})=>{const started=performance.now();while(performance.now()-started<timeout){const value=predicate();if(value)return value;await new Promise(resolve=>setTimeout(resolve,20));}throw new Error(`timed out waiting for ${label}`);};
    const nextMessage=(worker,expected,timeout=10_000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(new Error(`worker timeout waiting for ${expected}`));},timeout);const onMessage=event=>{const message=event.data;if(message?.type==='minecraft-model-runtime-error'){cleanup();reject(new Error(message.message));return;}if(message?.type!==expected)return;cleanup();resolve(message);};const onError=event=>{cleanup();reject(new Error(event.message||'mesh worker error'));};const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('message',onMessage);worker.removeEventListener('error',onError);};worker.addEventListener('message',onMessage);worker.addEventListener('error',onError);});

    const [runtime,atlasResolver]=await Promise.all([loadMinecraftModelRuntime(),loadMinecraftModelAtlasResolver()]);
    const worker=new Worker('/src/mesh-worker.js',{type:'module'});
    const readyPromise=nextMessage(worker,'minecraft-model-runtime-ready');worker.postMessage({type:'minecraft-model-runtime-init',runtime,atlasManifest:atlasResolver.manifest});const ready=await readyPromise;
    const index=(x,y,z)=>x+CHUNK_SIZE*(z+CHUNK_SIZE*y),data=new Uint8Array(CHUNK_SIZE*CHUNK_SIZE*WORLD_HEIGHT);data[index(3,20,4)]=BLOCK.CRAFTING_TABLE;
    const meshPromise=nextMessage(worker,'mesh');worker.postMessage({type:'mesh',key:'0,0',cx:0,cz:0,version:1,data:data.buffer,px:null,nx:null,pz:null,nz:null},[data.buffer]);const message=await meshPromise;worker.terminate();
    const directWorker={readyBlockIds:ready.blockIds,textureCount:ready.textureCount,legacyOpaqueEmpty:message.opaque.empty,waterEmpty:message.water.empty,specials:message.specials.length,opaqueFaces:message.interpreted.opaque.faceCount,opaqueVertices:message.interpreted.opaque.vertexCount,opaqueIndexBytes:message.interpreted.opaque.indices?.byteLength??0,cutoutEmpty:message.interpreted.cutout.empty,translucentEmpty:message.interpreted.translucent.empty};

    const rendererScene={children:[],add(object){this.children.push(object);},remove(object){this.children=this.children.filter(entry=>entry!==object);}},renderer=new MinecraftModelWorldRenderer(rendererScene),signal=renderer.handleWorkerMessage(ready),rendered=renderer.makeChunkMeshes(message.interpreted,0,0);
    let geometryDisposeCount=0,textureDisposeCount=0,materialDisposeCount=0;rendered.opaque.geometry.addEventListener('dispose',()=>geometryDisposeCount++);renderer.atlasTexture.addEventListener('dispose',()=>textureDisposeCount++);renderer.materials.opaque.addEventListener('dispose',()=>materialDisposeCount++);
    const rendererState={signal,status:renderer.status,children:rendererScene.children.length,name:rendered.opaque.name,indexCount:rendered.opaque.geometry.index.count,normalType:rendered.opaque.geometry.getAttribute('normal').array.constructor.name,colorType:rendered.opaque.geometry.getAttribute('color').array.constructor.name,sharedMaterial:rendered.opaque.material===renderer.materials.opaque,assetKey:rendered.opaque.material.map?.userData?.assetKey||null};
    renderer.disposeChunkMeshes(rendered);const childrenAfterChunkDispose=rendererScene.children.length;renderer.dispose();const rendererDisposed={geometryDisposeCount,textureDisposeCount,materialDisposeCount};

    const worldScene={children:[],add(object){this.children.push(object);},remove(object){this.children=this.children.filter(entry=>entry!==object);}},world=new VoxelWorld(worldScene,{seed:'interpreted-model-runtime',prompt:'平原',renderDistance:0});
    await world.generateArea(0,0);await waitFor(()=>world.minecraftModelRenderer.status!=='loading'&&world.meshWorkerReady,{label:'VoxelWorld model-runtime initialization'});if(world.minecraftModelRenderer.status!=='ready')throw new Error(`VoxelWorld fell back from interpreted models: ${world.minecraftModelRenderer.error}`);
    const chunk=await waitFor(()=>world.chunks.get('0,0'),{label:'center chunk'}),target={x:2,y:60,z:2};
    chunk.fill(BLOCK.AIR);chunk[world.index(target.x,target.y,target.z)]=BLOCK.CRAFTING_TABLE;world.requestMesh(0,0);
    const worldRecord=await waitFor(()=>{const record=world.meshes.get('0,0');return record?.interpreted?.opaque?.geometry?.index?.count===36?record:null;},{timeout:15_000,label:'VoxelWorld isolated interpreted crafting-table mesh'});
    let worldModelGeometryDisposed=0,worldModelTextureDisposed=0;worldRecord.interpreted.opaque.geometry.addEventListener('dispose',()=>worldModelGeometryDisposed++);world.minecraftModelRenderer.atlasTexture.addEventListener('dispose',()=>worldModelTextureDisposed++);
    const worldState={status:world.minecraftModelRenderer.status,blockIds:[...world.minecraftModelRenderer.blockIds],textureCount:world.minecraftModelRenderer.textureCount,modelName:worldRecord.interpreted.opaque.name,indexCount:worldRecord.interpreted.opaque.geometry.index.count,sharedMaterial:worldRecord.interpreted.opaque.material===world.minecraftModelRenderer.materials.opaque,assetKey:worldRecord.interpreted.opaque.material.map?.userData?.assetKey||null,hasLegacyTerrain:!!worldRecord.opaque};
    world.dispose();const worldDisposed={children:worldScene.children.length,worldModelGeometryDisposed,worldModelTextureDisposed};return{directWorker,rendererState,childrenAfterChunkDispose,rendererDisposed,worldState,worldDisposed};
  });

  expect(result.directWorker.readyBlockIds).toEqual(FARMING_MODEL_BLOCK_IDS);
  expect(result.directWorker.textureCount).toBeGreaterThan(0);
  expect(result.directWorker.legacyOpaqueEmpty).toBe(true);
  expect(result.directWorker.waterEmpty).toBe(true);
  expect(result.directWorker.specials).toBe(0);
  expect(result.directWorker.opaqueFaces).toBe(6);
  expect(result.directWorker.opaqueVertices).toBe(24);
  expect(result.directWorker.opaqueIndexBytes).toBe(36*4);
  expect(result.directWorker.cutoutEmpty).toBe(true);
  expect(result.directWorker.translucentEmpty).toBe(true);

  expect(result.rendererState.signal).toEqual({handled:true,ready:true,status:'ready'});
  expect(result.rendererState.status).toBe('ready');
  expect(result.rendererState.children).toBe(1);
  expect(result.rendererState.name).toBe('chunk-model-opaque:0,0');
  expect(result.rendererState.indexCount).toBe(36);
  expect(result.rendererState.normalType).toBe('Float32Array');
  expect(result.rendererState.colorType).toBe('Float32Array');
  expect(result.rendererState.sharedMaterial).toBe(true);
  expect(result.rendererState.assetKey).toBe('block.model_atlas');
  expect(result.childrenAfterChunkDispose).toBe(0);
  expect(result.rendererDisposed).toEqual({geometryDisposeCount:1,textureDisposeCount:1,materialDisposeCount:1});

  expect(result.worldState.status).toBe('ready');
  expect(result.worldState.blockIds).toEqual(FARMING_MODEL_BLOCK_IDS);
  expect(result.worldState.textureCount).toBeGreaterThan(0);
  expect(result.worldState.modelName).toBe('chunk-model-opaque:0,0');
  expect(result.worldState.indexCount).toBe(36);
  expect(result.worldState.sharedMaterial).toBe(true);
  expect(result.worldState.assetKey).toBe('block.model_atlas');
  expect(result.worldState.hasLegacyTerrain).toBe(false);
  expect(result.worldDisposed).toEqual({children:0,worldModelGeometryDisposed:1,worldModelTextureDisposed:1});
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
