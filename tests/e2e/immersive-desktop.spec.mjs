import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

test('desktop gameplay renders a real 3D first-person viewmodel with attack/use animation',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Immersive Desktop',seed:'ci-immersive-desktop-2026',mode:'creative',prompt:'平原'});

  const debug=page.locator('#debug'),canvas=page.locator('#game-canvas'),viewCanvas=page.locator('#first-person-viewmodel-canvas');
  await expect(debug).toHaveClass(/hidden/);await expect(canvas).toHaveAttribute('data-view-mode','0');
  await expect(page.locator('#first-person-held-overlay')).toHaveCount(0);
  await expect(viewCanvas).toHaveCount(1);await expect(viewCanvas).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.firstPersonViewModel?.())).toMatchObject({visible:true,itemId:'block:1',armGeometry:'BoxGeometry',sleeveGeometry:'BoxGeometry',itemGeometry:'3d'});

  await page.keyboard.press('F3');await expect(debug).not.toHaveClass(/hidden/);await expect(debug).toContainText('Minecraft Web By AI');await page.keyboard.press('F3');await expect(debug).toHaveClass(/hidden/);

  await page.keyboard.press('F5');await expect(canvas).toHaveAttribute('data-view-mode','1');await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.firstPersonViewModel().visible)).toBe(false);await expect(viewCanvas).toBeHidden();await expect(page.locator('#toast')).toContainText('第三人称背面');
  await page.keyboard.press('F5');await expect(canvas).toHaveAttribute('data-view-mode','2');await expect(page.locator('#toast')).toContainText('第三人称正面');
  await page.keyboard.press('F5');await expect(canvas).toHaveAttribute('data-view-mode','0');await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.firstPersonViewModel().visible)).toBe(true);await expect(viewCanvas).toBeVisible();await expect(page.locator('#toast')).toContainText('第一人称');

  const box=await canvas.boundingBox();expect(box).not.toBeNull();const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down({button:'left'});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.firstPersonViewModel().attackRemaining)).toBeGreaterThan(0);await page.mouse.up({button:'left'});
  await page.mouse.down({button:'right'});await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.firstPersonViewModel().useRemaining)).toBeGreaterThan(0);await page.mouse.up({button:'right'});

  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
