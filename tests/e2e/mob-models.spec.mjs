import {test,expect} from '@playwright/test';

test('all implemented mobs construct as articulated texture-backed models in Chromium',async({page})=>{
  await page.goto('/');

  const result=await page.evaluate(async()=>{
    const [renderer,mobs,THREE]=await Promise.all([
      import('/src/mob-model-renderer.js'),
      import('/src/mobs.js'),
      import('three')
    ]);
    const resources={geometries:new Set(),materials:new Set(),textures:new Set(),textureCache:new Map(),materialCache:new Map()};
    const definitions={...mobs.PASSIVE_MOBS,...mobs.HOSTILE_MOBS};
    const models={};

    for(const type of ['cow','sheep','pig','chicken','zombie','skeleton','creeper','spider']){
      const template=renderer.createMobModelTemplate(type,definitions[type],resources);
      const visual=renderer.bindMobVisual(template.clone(true));
      visual.updateMatrixWorld(true);
      let meshes=0,parts=0,mappedMeshes=0,uvMin=Infinity,uvMax=-Infinity;
      const namedBounds={};
      visual.traverse(object=>{
        if(object.name?.startsWith(`mob:${type}:`))parts++;
        if(!object.isMesh)return;
        meshes++;
        if(object.material?.map)mappedMeshes++;
        const uv=object.geometry?.getAttribute?.('uv');
        if(uv){for(let index=0;index<uv.array.length;index++){uvMin=Math.min(uvMin,uv.array[index]);uvMax=Math.max(uvMax,uv.array[index]);}}
        if(type==='cow'&&(object.name==='mob-box:body'||object.name==='mob-box:udder')){
          const bounds=new THREE.Box3().setFromObject(object);namedBounds[object.name]={min:[bounds.min.x,bounds.min.y,bounds.min.z],max:[bounds.max.x,bounds.max.y,bounds.max.z]};
        }
      });
      const animatedPart=visual.userData.mobAnimatedParts?.find(part=>part.userData.mobWalk);
      const before=animatedPart?[animatedPart.rotation.x,animatedPart.rotation.y,animatedPart.rotation.z]:null;
      renderer.animateMobVisual(visual,.1,1);
      const after=animatedPart?[animatedPart.rotation.x,animatedPart.rotation.y,animatedPart.rotation.z]:null;
      models[type]={
        rootType:visual.userData.mobModelType,
        meshes,parts,mappedMeshes,uvMin,uvMax,
        animated:before&&after?before.some((value,index)=>Math.abs(value-after[index])>1e-6):false,
        modelScale:visual.children[0]?.scale?.x||0,
        namedBounds
      };
    }

    const textureKeys=[...resources.textureCache.keys()].sort();
    const materialKeys=[...resources.materialCache.keys()].sort();
    renderer.disposeMobModelResources(resources);
    return{models,textureKeys,materialKeys,disposed:{geometries:resources.geometries.size,materials:resources.materials.size,textures:resources.textures.size}};
  });

  expect(Object.keys(result.models).sort()).toEqual(['chicken','cow','creeper','pig','sheep','skeleton','spider','zombie']);
  for(const [type,model] of Object.entries(result.models)){
    expect(model.rootType,`${type} root must retain its model identity`).toBe(type);
    expect(model.meshes,`${type} must contain explicit cuboids`).toBeGreaterThanOrEqual(5);
    expect(model.parts,`${type} must contain articulated part groups`).toBeGreaterThanOrEqual(3);
    expect(model.mappedMeshes,`${type} may not fall back to color-only prototype materials`).toBe(model.meshes);
    expect(model.uvMin,`${type} UVs must stay normalized`).toBeGreaterThanOrEqual(0);
    expect(model.uvMax,`${type} UVs must stay normalized`).toBeLessThanOrEqual(1);
    expect(model.animated,`${type} must retain at least one articulated movement channel`).toBeTruthy();
    expect(model.modelScale,`${type} model fit scale must live below the hurt/fuse root scale`).toBeGreaterThan(0);
  }
  expect(result.models.cow.meshes).toBeGreaterThanOrEqual(10);
  const cowBody=result.models.cow.namedBounds['mob-box:body'],udder=result.models.cow.namedBounds['mob-box:udder'];
  expect(cowBody).toBeTruthy();expect(udder).toBeTruthy();
  expect(udder.max[1],`cow udder must end at the torso underside instead of appearing on its back`).toBeLessThanOrEqual(cowBody.min[1]+1e-6);
  expect(udder.max[2]).toBeGreaterThan(cowBody.min[2]);expect(udder.min[2]).toBeLessThan(cowBody.max[2]);
  expect(result.models.creeper.meshes).toBeGreaterThanOrEqual(6);
  expect(result.models.spider.parts).toBeGreaterThanOrEqual(11);
  expect(result.textureKeys).toEqual([
    'entity.chicken','entity.cow','entity.creeper','entity.pig','entity.sheep','entity.sheep_fur','entity.skeleton','entity.spider','entity.zombie'
  ]);
  expect(result.materialKeys).toEqual(result.textureKeys);
  expect(result.disposed).toEqual({geometries:0,materials:0,textures:0});
});
