import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

test('desktop gameplay hides debug by default and keeps F3/F5 presentation in sync',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/');
  await createSingleplayerWorld(page,{name:'CI Immersive Desktop',seed:'ci-immersive-desktop-2026',mode:'creative',prompt:'平原'});

  const debug=page.locator('#debug'),canvas=page.locator('#game-canvas'),held=page.locator('#first-person-held-overlay');
  await expect(debug).toHaveClass(/hidden/);
  await expect(canvas).toHaveAttribute('data-view-mode','0');
  await expect(held).not.toHaveClass(/hidden/);
  await expect(held.locator('.fp-arm')).toHaveCount(1);
  await expect(held.locator('.fp-item .item-icon,.fp-item .slot-swatch,.fp-item .block-item-icon')).toHaveCount(1);

  await page.keyboard.press('F3');await expect(debug).not.toHaveClass(/hidden/);await expect(debug).toContainText('Minecraft Web By AI');
  await page.keyboard.press('F3');await expect(debug).toHaveClass(/hidden/);

  await page.keyboard.press('F5');await expect(canvas).toHaveAttribute('data-view-mode','1');await expect(held).toHaveClass(/hidden/);await expect(page.locator('#toast')).toContainText('第三人称背面');
  await page.keyboard.press('F5');await expect(canvas).toHaveAttribute('data-view-mode','2');await expect(page.locator('#toast')).toContainText('第三人称正面');
  await page.keyboard.press('F5');await expect(canvas).toHaveAttribute('data-view-mode','0');await expect(held).not.toHaveClass(/hidden/);await expect(page.locator('#toast')).toContainText('第一人称');

  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
