import {test,expect} from '@playwright/test';

test('live browser keeps Steve right-side limbs, corrected first-person arm direction, and canonical workbench geometry',async({page})=>{
  await page.goto('/?e2e=1');
  await expect(page.locator('style[data-minecraft-vanilla-workbench="1"]')).toHaveCount(1);

  const presentation=await page.evaluate(async()=>{
    const [{PlayerModelFactory},{FirstPersonViewModel}]=await Promise.all([
      import('/src/player-model-renderer.js'),
      import('/src/first-person-player-presentation.js')
    ]);
    const factory=new PlayerModelFactory();await factory.ready;const visual=factory.create();
    const thirdPerson={
      rightArmX:visual.parts.rightArm.position.x,leftArmX:visual.parts.leftArm.position.x,
      rightLegX:visual.parts.rightLeg.position.x,leftLegX:visual.parts.leftLeg.position.x
    };
    factory.triggerPrimary(visual);factory.animate(visual,.08,{speed:0});thirdPerson.attackRightArmX=visual.parts.rightArm.position.x;thirdPerson.attackRightArmRotation=visual.parts.rightArm.rotation.x;thirdPerson.attackLeftArmRotation=visual.parts.leftArm.rotation.x;
    const first=new FirstPersonViewModel(),base=first.armPivot.getObjectByName('first-person-arm-base'),sleeve=first.armPivot.getObjectByName('first-person-arm-sleeve');
    const firstPerson={baseY:base.position.y,sleeveY:sleeve.position.y,itemY:first.itemAnchor.position.y,baseRotationZ:base.rotation.z,sleeveRotationZ:sleeve.rotation.z};
    first.dispose();factory.dispose();return{thirdPerson,firstPerson};
  });
  expect(presentation.thirdPerson.rightArmX).toBeGreaterThan(0);expect(presentation.thirdPerson.leftArmX).toBeLessThan(0);
  expect(presentation.thirdPerson.rightLegX).toBeGreaterThan(0);expect(presentation.thirdPerson.leftLegX).toBeLessThan(0);
  expect(presentation.thirdPerson.attackRightArmX).toBeGreaterThan(0);expect(Math.abs(presentation.thirdPerson.attackRightArmRotation)).toBeGreaterThan(.4);expect(Math.abs(presentation.thirdPerson.attackLeftArmRotation)).toBeLessThan(.05);
  expect(presentation.firstPerson.baseY).toBeGreaterThan(0);expect(presentation.firstPerson.sleeveY).toBeGreaterThan(0);expect(presentation.firstPerson.itemY).toBeGreaterThan(presentation.firstPerson.baseY);
  expect(Math.abs(presentation.firstPerson.baseRotationZ-Math.PI)).toBeLessThan(1e-9);expect(Math.abs(presentation.firstPerson.sleeveRotationZ-Math.PI)).toBeLessThan(1e-9);

  const workbench=page.locator('#workbench'),panel=workbench.locator('.workbench-panel');
  await workbench.evaluate(element=>element.classList.remove('hidden'));
  await expect(panel).toBeVisible();
  const panelStyle=await panel.evaluate(element=>({backgroundImage:getComputedStyle(element).backgroundImage,width:getComputedStyle(element).width,height:getComputedStyle(element).height}));
  expect(panelStyle.backgroundImage).toContain('crafting_table.png');expect(panelStyle.width).toBe('352px');expect(panelStyle.height).toBe('332px');
  const panelRect=await panel.boundingBox(),craftRect=await page.locator('#craft-grid-3').boundingBox(),resultRect=await page.locator('#craft-result-3').boundingBox(),inventoryRect=await page.locator('#workbench-grid').boundingBox(),hotbarRect=await page.locator('#workbench-hotbar').boundingBox();
  expect((craftRect?.x??0)-(panelRect?.x??0)).toBeCloseTo(60,0);expect((craftRect?.y??0)-(panelRect?.y??0)).toBeCloseTo(34,0);
  expect((resultRect?.x??0)-(panelRect?.x??0)).toBeCloseTo(248,0);expect((resultRect?.y??0)-(panelRect?.y??0)).toBeCloseTo(70,0);
  expect((inventoryRect?.y??0)-(panelRect?.y??0)).toBeCloseTo(168,0);expect((hotbarRect?.y??0)-(panelRect?.y??0)).toBeCloseTo(284,0);
});

test('mining-hit bridge emits source-backed block audio and begins OGG prefetch in the live browser',async({page})=>{
  await page.goto('/?e2e=1');
  const soundPromise=page.evaluate(()=>new Promise(resolve=>{
    const timeout=setTimeout(()=>resolve(null),10_000);
    addEventListener('minecraft:sound',event=>{clearTimeout(timeout);resolve(event.detail);},{once:true});
    dispatchEvent(new CustomEvent('minecraft:mining-hit',{detail:{blockId:3,x:0,y:64,z:0}}));
  }));
  const responsePromise=page.waitForResponse(response=>{
    try{return decodeURIComponent(new URL(response.url()).pathname).includes('/原版Minecraft音频文件/')&&response.status()===200;}catch{return false;}
  },{timeout:15_000});
  const [sound,response]=await Promise.all([soundPromise,responsePromise]);
  expect(sound).not.toBeNull();expect(sound.eventName).toBe('block.stone.step');expect(sound.sha1).toMatch(/^[0-9a-f]{40}$/);expect(sound.logicalPath).toMatch(/^minecraft\/sounds\/step\/stone\d\.ogg$/);
  expect(response.status()).toBe(200);
});
