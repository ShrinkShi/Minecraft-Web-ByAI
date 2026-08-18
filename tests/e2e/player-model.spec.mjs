import {test,expect} from '@playwright/test';

test('source-backed wide Steve builds textured articulated geometry and all requested animation channels',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const {PlayerModelFactory}=await import('/src/player-model-renderer.js');
    const factory=new PlayerModelFactory();await factory.ready;const visual=factory.create();
    let meshes=0,mapped=0,base=0,overlay=0,uvMin=Infinity,uvMax=-Infinity;
    visual.root.traverse(object=>{if(!object.isMesh)return;meshes++;if(object.material?.map)mapped++;if(object.userData.playerLayer==='base')base++;if(object.userData.playerLayer==='overlay')overlay++;const uv=object.geometry.getAttribute('uv');for(const value of uv.array){uvMin=Math.min(uvMin,value);uvMax=Math.max(uvMax,value);}});
    const idle={leftArm:visual.parts.leftArm.rotation.x,rightArm:visual.parts.rightArm.rotation.x,leftLeg:visual.parts.leftLeg.rotation.x,rightLeg:visual.parts.rightLeg.rotation.x};
    factory.animate(visual,.12,{speed:4.3});const walk={leftArm:visual.parts.leftArm.rotation.x,rightArm:visual.parts.rightArm.rotation.x,leftLeg:visual.parts.leftLeg.rotation.x,rightLeg:visual.parts.rightLeg.rotation.x};
    factory.animate(visual,.12,{speed:5.6,sprint:true});const sprint={lean:visual.modelRoot.rotation.x,leftArm:visual.parts.leftArm.rotation.x,rightLeg:visual.parts.rightLeg.rotation.x};
    factory.triggerPrimary(visual);factory.animate(visual,.08,{speed:0});const attack={armX:visual.parts.rightArm.rotation.x,active:visual.root.userData.animation.primary};
    factory.triggerUse(visual);factory.animate(visual,.08,{speed:0});const use={armX:visual.parts.rightArm.rotation.x,armY:visual.parts.rightArm.rotation.y,active:visual.root.userData.animation.use};
    factory.animate(visual,.12,{headYaw:.7,headPitch:-.4});const head={yaw:visual.parts.head.rotation.y,pitch:visual.parts.head.rotation.x};
    factory.animate(visual,.4,{dead:true});const death={rotationZ:visual.poseRoot.rotation.z,progress:visual.root.userData.animation.deathProgress};
    const textureKey=factory.texture.userData.assetKey||factory.texture.name;factory.dispose();
    return{meshes,mapped,base,overlay,uvMin,uvMax,idle,walk,sprint,attack,use,head,death,textureKey,disposed:{geometries:factory.geometries.size,disposed:factory.disposed}};
  });

  expect(result.meshes).toBe(12);expect(result.mapped).toBe(12);expect(result.base).toBe(6);expect(result.overlay).toBe(6);
  expect(result.uvMin).toBeGreaterThanOrEqual(0);expect(result.uvMax).toBeLessThanOrEqual(1);expect(result.textureKey).toBe('entity.player.steve');
  expect(Math.abs(result.walk.leftArm-result.idle.leftArm)).toBeGreaterThan(.05);expect(Math.abs(result.walk.leftLeg-result.idle.leftLeg)).toBeGreaterThan(.05);
  expect(Math.sign(result.walk.leftArm)).toBe(-Math.sign(result.walk.rightArm));expect(Math.sign(result.walk.leftLeg)).toBe(-Math.sign(result.walk.rightLeg));
  expect(result.sprint.lean).toBeLessThan(-.05);expect(Math.abs(result.sprint.leftArm)).toBeGreaterThan(.1);
  expect(result.attack.active).toBeTruthy();expect(result.attack.armX).toBeGreaterThan(.6);
  expect(result.use.active).toBeTruthy();expect(result.use.armX).toBeGreaterThan(1);expect(result.use.armY).toBeLessThan(-.1);
  expect(result.head.yaw).toBeCloseTo(.7,5);expect(result.head.pitch).toBeCloseTo(-.4,5);
  expect(result.death.progress).toBeGreaterThan(.9);expect(result.death.rotationZ).toBeLessThan(-1);
  expect(result.disposed).toEqual({geometries:0,disposed:true});
});
