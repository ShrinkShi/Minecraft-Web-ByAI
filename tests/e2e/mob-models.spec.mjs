import {test,expect} from '@playwright/test';

const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

test('implemented mobs stay source-textured, articulated, and keep converted quadruped parts contiguous',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async threeUrl=>{
    const [renderer,mobs,THREE]=await Promise.all([import('/src/mob-model-renderer.js'),import('/src/mobs.js'),import(threeUrl)]);
    const resources={geometries:new Set(),materials:new Set(),textures:new Set(),textureCache:new Map(),materialCache:new Map()},definitions={...mobs.PASSIVE_MOBS,...mobs.HOSTILE_MOBS},models={};
    for(const type of ['cow','sheep','pig','chicken','zombie','skeleton','creeper','spider']){
      const visual=renderer.bindMobVisual(renderer.createMobModelTemplate(type,definitions[type],resources).clone(true));visual.updateMatrixWorld(true);
      let modelMeshes=0,modelMapped=0,equipmentMeshes=0,equipmentMapped=0,parts=0,uvMin=Infinity,uvMax=-Infinity,firePlanes=0;const bounds={};
      visual.traverse(object=>{
        if(object.name?.startsWith(`mob:${type}:`))parts++;
        if(!object.isMesh)return;
        const isModel=object.name?.startsWith('mob-box:'),isEquipment=object.name?.startsWith('mob-equipment:');
        if(isModel){modelMeshes++;if(object.material?.map)modelMapped++;}
        if(isEquipment){equipmentMeshes++;if(object.material?.map)equipmentMapped++;}
        if(object.parent?.name==='mob-fire-overlay')firePlanes++;
        if(isModel||isEquipment)for(const value of object.geometry.getAttribute('uv').array){uvMin=Math.min(uvMin,value);uvMax=Math.max(uvMax,value);}
        const keepCow=type==='cow'&&(object.name==='mob-box:body'||object.name==='mob-box:udder');
        const keepPig=type==='pig'&&['mob-box:body','mob-box:head','mob-box:frontLeftLeg'].includes(object.name);
        if(keepCow||keepPig){const box=new THREE.Box3().setFromObject(object);bounds[object.name]={min:[box.min.x,box.min.y,box.min.z],max:[box.max.x,box.max.y,box.max.z]};}
      });
      const animated=visual.userData.mobAnimatedParts?.find(part=>part.userData.mobWalk),before=animated?[animated.rotation.x,animated.rotation.y,animated.rotation.z]:null;renderer.animateMobVisual(visual,.1,1);const after=animated?[animated.rotation.x,animated.rotation.y,animated.rotation.z]:null;
      models[type]={modelMeshes,modelMapped,equipmentMeshes,equipmentMapped,parts,uvMin,uvMax,bounds,animated:!!before&&before.some((value,index)=>Math.abs(value-after[index])>1e-6),firePlanes,fireVisible:visual.userData.mobFireGroup?.visible??null};
      renderer.disposeMobVisualInstance(visual);
    }
    const textureKeys=[...resources.textureCache.keys()].sort();renderer.disposeMobModelResources(resources);return{models,textureKeys,disposed:[resources.geometries.size,resources.materials.size,resources.textures.size]};
  },THREE_URL);
  expect(Object.keys(result.models).sort()).toEqual(['chicken','cow','creeper','pig','sheep','skeleton','spider','zombie']);
  for(const [type,model] of Object.entries(result.models)){
    expect(model.modelMeshes,`${type} source model cuboids`).toBeGreaterThanOrEqual(5);
    expect(model.modelMapped,`${type} source model texture maps`).toBe(model.modelMeshes);
    expect(model.parts,`${type} articulated parts`).toBeGreaterThanOrEqual(3);
    expect(model.uvMin).toBeGreaterThanOrEqual(0);expect(model.uvMax).toBeLessThanOrEqual(1);
    expect(model.animated,`${type} animation`).toBeTruthy();
    expect(model.firePlanes,`${type} independent fire-effect planes`).toBe(2);
    expect(model.fireVisible,`${type} fire overlay default visibility`).toBe(false);
  }
  expect(result.models.skeleton.equipmentMeshes).toBe(1);expect(result.models.skeleton.equipmentMapped).toBe(1);
  for(const [type,model] of Object.entries(result.models))if(type!=='skeleton'){expect(model.equipmentMeshes,`${type} equipment`).toBe(0);expect(model.equipmentMapped,`${type} equipment maps`).toBe(0);}
  const cowBody=result.models.cow.bounds['mob-box:body'],udder=result.models.cow.bounds['mob-box:udder'];expect(cowBody).toBeTruthy();expect(udder).toBeTruthy();expect(udder.max[1]).toBeLessThanOrEqual(cowBody.min[1]+1e-6);expect(udder.max[2]).toBeGreaterThan(cowBody.min[2]);expect(udder.min[2]).toBeLessThan(cowBody.max[2]);
  const pigBody=result.models.pig.bounds['mob-box:body'],pigHead=result.models.pig.bounds['mob-box:head'],pigLeg=result.models.pig.bounds['mob-box:frontLeftLeg'];expect(pigBody).toBeTruthy();expect(pigHead).toBeTruthy();expect(pigLeg).toBeTruthy();
  expect(Math.abs(pigLeg.max[1]-pigBody.min[1])).toBeLessThan(1e-6);expect(pigHead.min[1]).toBeLessThan(pigBody.max[1]);expect(pigHead.max[1]).toBeGreaterThan(pigBody.min[1]);expect(pigBody.max[1]-pigBody.min[1]).toBeLessThan(1);
  expect(result.textureKeys).toEqual(['entity.chicken','entity.cow','entity.creeper','entity.pig','entity.sheep','entity.sheep_fur','entity.skeleton','entity.spider','entity.zombie','item.bow']);expect(result.disposed).toEqual([0,0,0]);
});
