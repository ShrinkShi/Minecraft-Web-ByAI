import {test,expect} from '@playwright/test';

const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

test('implemented mobs stay source-textured, articulated, and keep the cow udder below the torso',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async threeUrl=>{
    const [renderer,mobs,THREE]=await Promise.all([import('/src/mob-model-renderer.js'),import('/src/mobs.js'),import(threeUrl)]);
    const resources={geometries:new Set(),materials:new Set(),textures:new Set(),textureCache:new Map(),materialCache:new Map()},definitions={...mobs.PASSIVE_MOBS,...mobs.HOSTILE_MOBS},models={};
    for(const type of ['cow','sheep','pig','chicken','zombie','skeleton','creeper','spider']){
      const visual=renderer.bindMobVisual(renderer.createMobModelTemplate(type,definitions[type],resources).clone(true));visual.updateMatrixWorld(true);
      let meshes=0,mapped=0,parts=0,uvMin=Infinity,uvMax=-Infinity;const bounds={};
      visual.traverse(object=>{if(object.name?.startsWith(`mob:${type}:`))parts++;if(!object.isMesh)return;meshes++;if(object.material?.map)mapped++;for(const value of object.geometry.getAttribute('uv').array){uvMin=Math.min(uvMin,value);uvMax=Math.max(uvMax,value);}if(type==='cow'&&(object.name==='mob-box:body'||object.name==='mob-box:udder')){const box=new THREE.Box3().setFromObject(object);bounds[object.name]={min:[box.min.x,box.min.y,box.min.z],max:[box.max.x,box.max.y,box.max.z]};}});
      const animated=visual.userData.mobAnimatedParts?.find(part=>part.userData.mobWalk),before=animated?[animated.rotation.x,animated.rotation.y,animated.rotation.z]:null;renderer.animateMobVisual(visual,.1,1);const after=animated?[animated.rotation.x,animated.rotation.y,animated.rotation.z]:null;
      models[type]={meshes,mapped,parts,uvMin,uvMax,bounds,animated:!!before&&before.some((value,index)=>Math.abs(value-after[index])>1e-6)};
    }
    const textureKeys=[...resources.textureCache.keys()].sort();renderer.disposeMobModelResources(resources);return{models,textureKeys,disposed:[resources.geometries.size,resources.materials.size,resources.textures.size]};
  },THREE_URL);
  expect(Object.keys(result.models).sort()).toEqual(['chicken','cow','creeper','pig','sheep','skeleton','spider','zombie']);
  for(const [type,model] of Object.entries(result.models)){expect(model.meshes,`${type} cuboids`).toBeGreaterThanOrEqual(5);expect(model.mapped,`${type} texture maps`).toBe(model.meshes);expect(model.parts,`${type} articulated parts`).toBeGreaterThanOrEqual(3);expect(model.uvMin).toBeGreaterThanOrEqual(0);expect(model.uvMax).toBeLessThanOrEqual(1);expect(model.animated,`${type} animation`).toBeTruthy();}
  const body=result.models.cow.bounds['mob-box:body'],udder=result.models.cow.bounds['mob-box:udder'];expect(body).toBeTruthy();expect(udder).toBeTruthy();expect(udder.max[1]).toBeLessThanOrEqual(body.min[1]+1e-6);expect(udder.max[2]).toBeGreaterThan(body.min[2]);expect(udder.min[2]).toBeLessThan(body.max[2]);
  expect(result.textureKeys).toEqual(['entity.chicken','entity.cow','entity.creeper','entity.pig','entity.sheep','entity.sheep_fur','entity.skeleton','entity.spider','entity.zombie']);expect(result.disposed).toEqual([0,0,0]);
});
