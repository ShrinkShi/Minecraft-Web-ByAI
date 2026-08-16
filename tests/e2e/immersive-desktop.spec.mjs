import {test,expect} from '@playwright/test';

test('desktop gameplay hides debug by default and keeps F3/F5 presentation in sync',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/');
  await page.getByRole('button',{name:'单人游戏'}).click();
  await page.locator('#world-name').fill('CI Immersive Desktop');
  await page.locator('#world-seed').fill('ci-immersive-desktop-2026');
  await page.locator('#game-mode').selectOption('creative');
  await page.locator('#terrain-prompt').fill('平原');
  await page.getByRole('button',{name:'创建 / 进入'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);

  const debug=page.locator('#debug'),canvas=page.locator('#game-canvas'),held=page.locator('#first-person-held-overlay');
  await expect(debug).toHaveClass(/hidden/);
  await expect(canvas).toHaveAttribute('data-view-mode','0');
  await expect(held).not.toHaveClass(/hidden/);
  await expect(held.locator('.fp-arm')).toHaveCount(1);
  await expect(held.locator('.fp-item .item-icon,.fp-item .slot-swatch')).toHaveCount(1);

  await page.keyboard.press('F3');await expect(debug).not.toHaveClass(/hidden/);await expect(debug).toContainText('Minecraft Web By AI');
  await page.keyboard.press('F3');await expect(debug).toHaveClass(/hidden/);

  await page.keyboard.press('F5');await expect(canvas).toHaveAttribute('data-view-mode','1');await expect(held).toHaveClass(/hidden/);await expect(page.locator('#toast')).toContainText('第三人称背面');
  await page.keyboard.press('F5');await expect(canvas).toHaveAttribute('data-view-mode','2');await expect(page.locator('#toast')).toContainText('第三人称正面');
  await page.keyboard.press('F5');await expect(canvas).toHaveAttribute('data-view-mode','0');await expect(held).not.toHaveClass(/hidden/);await expect(page.locator('#toast')).toContainText('第一人称');

  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
