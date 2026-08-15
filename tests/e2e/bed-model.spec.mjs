import {test,expect} from '@playwright/test';

test('bed blocks leave cube mesh, preserve neighbor faces, and build texture-backed halves',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const [{BED_IDS},{BedModelRenderer},{bedVisualDescriptor},{VoxelWorld}]=await Promise.all([
      import('/src/bed-rules.js'),import('/src/bed-model-renderer.js'),import('/src/bed-model-specs.js'),import('/src/world.js')
    ]);
    const runWorker=data=>new Promise((resolve,reject)=>{
      const worker=new Worker('/src/mesh-worker.js',{type:'module'}),timer=setTimeout(()=>{worker.terminate();reject(new Error('mesh worker timeout'));},4000);
      worker.onmessage=event=>{clearTimeout(timer);worker.terminate();resolve(event.data);};worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(new Error(event.message));};
      worker.postMessage({type:'mesh',key:'0,0',cx:0,cz:0,version:1,data:data.buffer,px:null,nx:null,pz:null,nz:null},[data.buffer]);
    });
    const index=(x,y,z)=>x+16*(z+16*y),data=new Uint8Array(16*16*64);
    data[index(5,4,5)]=3;
    data[index(6,4,5)]=BED_IDS.east.foot;
    const workerResult=await runWorker(data);

    const renderer=new BedModelRenderer(),models={};
    for(const [facing,entry] of Object.entries(BED_IDS)){
      for(const part of['foot','head']){
        const descriptor=bedVisualDescriptor(0,0,0,entry[part]),visual=renderer.create(descriptor);let meshes=0,mapped=0,uvMin=Infinity,uvMax=-Infinity,maxY=0,textureKey='';
        visual.traverse(object=>{if(!object.isMesh)return;meshes++;if(object.material?.map){mapped++;textureKey=object.material.map.userData?.assetKey||object.material.map.name||textureKey;}const uv=object.geometry.getAttribute('uv'),position=object.geometry.getAttribute('position');for(const value of uv.array){uvMin=Math.min(uvMin,value);uvMax=Math.max(uvMax,value);}for(let i=1;i<position.array.length;i+=3)maxY=Math.max(maxY,position.array[i]);});
        models[`${facing}:${part}`]={meshes,mapped,uvMin,uvMax,maxY,rotationY:visual.rotation.y,textureKey};
      }
    }
    renderer.dispose();

    const scene={children:[],add(object){this.children.push(object);},remove(object){this.children=this.children.filter(entry=>entry!==object);}};
    const world=new VoxelWorld(scene,{seed:'bed-lifecycle',prompt:'bed lifecycle test',renderDistance:0});
    const chunkKey='2,-1',descriptor=bedVisualDescriptor(1,2,3,BED_IDS.south.foot),empty={empty:true};
    world.chunks.set(chunkKey,new Uint8Array(16*16*64));world.meshVersions.set(chunkKey,7);
    world.onMeshWorker({type:'mesh',key:chunkKey,cx:2,cz:-1,version:7,opaque:empty,water:empty,specials:[descriptor]});
    const attached=scene.children[0],attachedState={sceneChildren:scene.children.length,name:attached?.name,groupPosition:attached?[attached.position.x,attached.position.y,attached.position.z]:null,visualPosition:attached?.children[0]?[attached.children[0].position.x,attached.children[0].position.y,attached.children[0].position.z]:null};
    world.disposeChunkMeshes(chunkKey);
    const afterChunkDispose=scene.children.length;
    world.onMeshWorker({type:'mesh',key:chunkKey,cx:2,cz:-1,version:7,opaque:empty,water:empty,specials:[descriptor]});
    const beforeWorldDispose=scene.children.length;
    world.dispose();
    const worldDisposed={sceneChildren:scene.children.length,geometries:world.bedRenderer.geometries.size,templates:world.bedRenderer.templates.size};

    return{specials:workerResult.specials,opaqueEmpty:workerResult.opaque.empty,opaqueIndexBytes:workerResult.opaque.empty?0:workerResult.opaque.indices.byteLength,models,disposed:{geometries:renderer.geometries.size,templates:renderer.templates.size},chunkLifecycle:{attachedState,afterChunkDispose,beforeWorldDispose,worldDisposed}};
  });

  expect(result.opaqueEmpty).toBeFalsy();
  expect(result.opaqueIndexBytes).toBe(36*4);
  expect(result.specials).toHaveLength(1);
  expect(result.specials[0]).toMatchObject({kind:'bed',x:6,y:4,z:5,id:17,part:'foot',facing:'east'});

  expect(Object.keys(result.models)).toHaveLength(8);
  for(const [key,model] of Object.entries(result.models)){
    expect(model.meshes,`${key} must contain mattress + two legs`).toBe(3);
    expect(model.mapped,`${key} must use the red-bed entity sheet on every cuboid`).toBe(3);
    expect(model.uvMin,`${key} UV must be normalized`).toBeGreaterThanOrEqual(0);
    expect(model.uvMax,`${key} UV must be normalized`).toBeLessThanOrEqual(1);
    expect(model.maxY,`${key} must be 9/16 block tall`).toBeCloseTo(9/16,6);
    expect(model.textureKey,`${key} must bind the logical red-bed asset`).toBe('entity.bed.red');
  }
  expect(result.models['south:foot'].rotationY).toBe(0);
  expect(result.models['north:foot'].rotationY).toBeCloseTo(Math.PI,8);
  expect(result.models['east:foot'].rotationY).toBeCloseTo(Math.PI/2,8);
  expect(result.models['west:foot'].rotationY).toBeCloseTo(-Math.PI/2,8);
  expect(result.disposed).toEqual({geometries:0,templates:0});

  expect(result.chunkLifecycle.attachedState).toEqual({sceneChildren:1,name:'chunk-specials:2,-1',groupPosition:[32,0,-16],visualPosition:[1,2,3]});
  expect(result.chunkLifecycle.afterChunkDispose).toBe(0);
  expect(result.chunkLifecycle.beforeWorldDispose).toBe(1);
  expect(result.chunkLifecycle.worldDisposed).toEqual({sceneChildren:0,geometries:0,templates:0});
});
