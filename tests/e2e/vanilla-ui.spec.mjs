import {test,expect} from '@playwright/test';

test('source-backed Java 1.20.1 HUD inventory and block item previews render in the live browser',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('/?e2e=1');
  await expect(page.locator('style[data-minecraft-vanilla-ui="1"]')).toHaveCount(1);
  await page.getByRole('button',{name:'单人游戏'}).click();
  await page.locator('#world-name').fill('CI Vanilla UI');
  await page.locator('#world-seed').fill('ci-vanilla-ui-2026');
  await page.locator('#game-mode').selectOption('creative');
  await page.locator('#terrain-prompt').fill('平原');
  await page.getByRole('button',{name:'创建 / 进入'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);

  const crosshair=page.locator('#crosshair');
  await expect(crosshair).toHaveCSS('width','30px');
  expect(await crosshair.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('crosshair.png');

  await expect(page.locator('#hearts .heart')).toHaveCount(10);
  await expect(page.locator('#hearts .heart.full')).toHaveCount(10);
  await expect(page.locator('#hunger .food')).toHaveCount(10);
  await expect(page.locator('#hunger .food.full')).toHaveCount(10);
  await expect(page.locator('#armor-row')).toHaveClass(/hidden/);
  expect(await page.locator('.xp-wrap').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('xp-background.png');
  expect(await page.locator('#xp-bar').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('xp-progress.png');

  const hotbar=page.locator('#hotbar');
  await expect(hotbar.locator(':scope > .hotbar-slot')).toHaveCount(9);
  await expect(hotbar.locator(':scope > .hotbar-slot.selected')).toHaveCount(1);
  const hotbarRect=await hotbar.boundingBox();
  expect(hotbarRect?.width).toBeCloseTo(364,0);
  const blockPreview=hotbar.locator('.block-item-icon').first();
  await expect(blockPreview).toBeVisible();
  await expect(blockPreview.locator('.block-face')).toHaveCount(3);
  expect(await hotbar.locator(':scope > .hotbar-slot').first().evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('hotbar-slot-0.png');

  await page.keyboard.press('e');
  const inventory=page.locator('#inventory'),panel=inventory.locator('.inventory-panel');
  await expect(inventory).not.toHaveClass(/hidden/);
  expect(await panel.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('inventory-panel.png');
  const panelRect=await panel.boundingBox();
  expect(panelRect?.width).toBeCloseTo(352,0);
  expect(panelRect?.height).toBeCloseTo(332,0);
  await expect(page.locator('#equipment-slots .inv-slot')).toHaveCount(4);
  await expect(page.locator('#craft-grid-2 .inv-slot')).toHaveCount(4);
  await expect(page.locator('#inventory-grid .inv-slot')).toHaveCount(27);
  await expect(page.locator('#inventory-hotbar .inv-slot')).toHaveCount(9);

  const firstInventorySlot=await page.locator('#inventory-grid .inv-slot').first().boundingBox();
  expect((firstInventorySlot?.x??0)-(panelRect?.x??0)).toBeCloseTo(16,0);
  expect((firstInventorySlot?.y??0)-(panelRect?.y??0)).toBeCloseTo(168,0);
  const inventoryBlock=inventory.locator('.block-item-icon').first();
  await expect(inventoryBlock).toBeVisible();
  await expect(inventoryBlock.locator('.block-face')).toHaveCount(3);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
