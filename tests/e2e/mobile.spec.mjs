import {test,expect} from '@playwright/test';

const MOBILE_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0 Mobile Safari/537.36';
test.use({viewport:{width:844,height:390},hasTouch:true,userAgent:MOBILE_UA});

async function xyz(page){
  const text=await page.locator('#debug').innerText(),match=text.match(/XYZ\s+([-\d.]+)\s*\/\s*([-\d.]+)\s*\/\s*([-\d.]+)/);
  if(!match)throw new Error(`cannot parse XYZ: ${text}`);return{x:Number(match[1]),y:Number(match[2]),z:Number(match[3])};
}

async function pushJoystickForward(page,duration=700){
  const box=await page.locator('#mobile-joystick').boundingBox();if(!box)throw new Error('mobile joystick has no layout box');
  const x=box.x+box.width/2,y=box.y+box.height/2,id=41;
  await page.evaluate(({x,y,id})=>document.querySelector('#mobile-joystick').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:id,clientX:x,clientY:y,pointerType:'touch',isPrimary:true})),{x,y,id});
  await page.evaluate(({x,y,id})=>window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:id,clientX:x,clientY:y-44,pointerType:'touch',isPrimary:true})),{x,y,id});
  await page.waitForTimeout(duration);
  await page.evaluate(({x,y,id})=>window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:id,clientX:x,clientY:y-44,pointerType:'touch',isPrimary:true})),{x,y,id});
}

test('mobile browser auto-detects, requests landscape, and exposes playable touch controls',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-device','mobile');
  await expect(page.locator('body')).toHaveAttribute('data-orientation','landscape');
  await expect(page.locator('#rotate-device')).not.toBeVisible();
  await expect(page.locator('#mobile-controls')).not.toBeVisible();

  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('body')).toHaveAttribute('data-orientation','portrait');
  await expect(page.locator('#rotate-device')).toBeVisible();
  await page.setViewportSize({width:844,height:390});
  await expect(page.locator('body')).toHaveAttribute('data-orientation','landscape');
  await expect(page.locator('#rotate-device')).not.toBeVisible();

  await page.getByRole('button',{name:'单人游戏'}).click();
  await page.locator('#world-name').fill('CI Mobile Landscape');await page.locator('#world-seed').fill('ci-mobile-landscape-2026');await page.locator('#game-mode').selectOption('creative');await page.locator('#terrain-prompt').fill('平原');await page.getByRole('button',{name:'创建 / 进入'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);await expect(page.locator('#mobile-controls')).toBeVisible({timeout:5_000});
  expect(await page.evaluate(()=>document.pointerLockElement)).toBeNull();

  await page.locator('[data-mobile-action="inventory"]').click();await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);await expect(page.locator('#mobile-controls')).not.toBeVisible();
  await page.locator('#inventory [data-action="mobile-close-panel"]').click();await expect(page.locator('#inventory')).toHaveClass(/hidden/);await expect(page.locator('#mobile-controls')).toBeVisible();

  await page.locator('[data-mobile-action="view"]').click();await expect(page.locator('#toast')).toContainText('第三人称背面',{timeout:3_000});
  await page.locator('[data-mobile-action="pause"]').click();await expect(page.locator('#pause-menu')).toHaveClass(/active/);await expect(page.locator('#mobile-controls')).not.toBeVisible();
  await page.getByRole('button',{name:'返回游戏'}).click();await expect(page.locator('#pause-menu')).not.toHaveClass(/active/);await expect(page.locator('#mobile-controls')).toBeVisible();

  const before=await xyz(page);await pushJoystickForward(page);await page.waitForTimeout(120);const after=await xyz(page);expect(Math.hypot(after.x-before.x,after.z-before.z)).toBeGreaterThan(.3);
  expect(await page.locator('#hotbar [data-hotbar-index]').count()).toBe(9);
  await page.locator('#hotbar [data-hotbar-index="3"]').dispatchEvent('pointerdown',{button:0,bubbles:true,pointerType:'touch'});await expect(page.locator('#hotbar .hotbar-slot.selected')).toHaveAttribute('data-hotbar-index','3');

  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
