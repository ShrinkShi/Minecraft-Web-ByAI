import {test,expect} from '@playwright/test';

test('bed blocks leave cube mesh, preserve neighbor faces, and build texture-backed halves',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const [{BED_IDS},{BedModelRenderer},{bedVisualDescriptor}]=await Promise.all([
      import('/src/bed-rules.js'),import('/src/bed-model-renderer.js'),import('/src/bed-model-specs.js')
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
    return{specials:workerResult.specials,opaqueEmpty:workerResult.opaque.empty,opaqueIndexBytes:workerResult.opaque.empty?0:workerResult.opaque.indices.byteLength,models,disposed:{geometries:renderer.geometries.size,templates:renderer.templates.size}};
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
});
