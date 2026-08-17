import {test,expect} from '@playwright/test';

const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

test('bed item presentation uses the original bed entity model in world drops',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async threeUrl=>{
    const [{DropSystem},{ITEMS},THREE]=await Promise.all([import('/src/drops.js'),import('/src/items.js'),import(threeUrl)]);
    const scene=new THREE.Scene(),worldMaterial=new THREE.MeshLambertMaterial(),world={material:worldMaterial,getBlock:()=>0},inventory={};
    const drops=new DropSystem(scene,world,inventory),visual=drops.createVisual('bed');let meshes=0,mapped=0;const textureKeys=new Set();
    visual?.traverse(object=>{if(!object.isMesh)return;meshes++;if(object.material?.map){mapped++;textureKeys.add(object.material.map.userData?.assetKey||object.material.map.name);}});
    const state={exists:!!visual,isSprite:!!visual?.isSprite,name:visual?.name,sourceBackedItem:visual?.userData?.sourceBackedItem,scale:visual?.scale?.x,item:{texture:ITEMS.bed.texture??null,itemPreview:ITEMS.bed.itemPreview,entityAssetKey:ITEMS.bed.entityAssetKey},meshes,mapped,textureKeys:[...textureKeys].sort()};
    drops.dispose();worldMaterial.dispose();return{...state,disposedBedRenderer:drops.bedRenderer===null};
  },THREE_URL);

  expect(result.exists).toBeTruthy();expect(result.isSprite).toBeFalsy();expect(result.name).toBe('drop-bed');expect(result.sourceBackedItem).toBe('bed');expect(result.scale).toBeCloseTo(.3,6);
  expect(result.item).toEqual({texture:null,itemPreview:'bed-model',entityAssetKey:'entity.bed.red'});
  expect(result.meshes).toBe(6);expect(result.mapped).toBe(6);expect(result.textureKeys).toEqual(['entity.bed.red']);expect(result.disposedBedRenderer).toBeTruthy();
});
