import {test,expect} from '@playwright/test';

test('singleplayer shows local worlds, supports edit, and double-click enters the selected save',async({page})=>{
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('/?e2e=1');
  await expect(page.locator('link[data-world-selection-style="1"]')).toHaveCount(1);

  await page.evaluate(async()=>{
    const {WorldStorage,worldIdFor}=await import('./src/storage.js');
    const storage=new WorldStorage(),name='Existing CI World',seed='world-selection-seed',id=worldIdFor(name,seed);
    await storage.putWorld({id,name,seed,prompt:'平原',mode:'survival',updatedAt:Date.now(),player:null,inventory:null,equipment:null,edits:{},gameTime:6000,weather:'clear',totalXp:0,respawnPoint:null,version:6});
  });

  await page.getByRole('button',{name:'单人游戏'}).click();
  await expect(page.getByRole('heading',{name:'选择世界'})).toBeVisible();
  await expect(page.getByText('Existing CI World',{exact:true})).toBeVisible();
  const enter=page.getByRole('button',{name:'进入选中的世界'}),edit=page.getByRole('button',{name:'编辑'});
  await expect(enter).toBeDisabled();await expect(edit).toBeDisabled();

  const worldEntry=page.locator('.world-entry').filter({hasText:'Existing CI World'});
  await worldEntry.click();await expect(enter).toBeEnabled();await expect(edit).toBeEnabled();
  await edit.click();
  await expect(page.getByRole('heading',{name:'编辑世界'})).toBeVisible();
  await expect(page.locator('#world-seed')).toHaveAttribute('readonly','');
  await expect(page.locator('#terrain-prompt')).toHaveAttribute('readonly','');
  await page.locator('#world-name').fill('Renamed CI World');
  await page.locator('#game-mode').selectOption('creative');
  await page.getByRole('button',{name:'保存修改'}).click();

  await expect(page.getByRole('heading',{name:'选择世界'})).toBeVisible();
  const renamedEntry=page.locator('.world-entry').filter({hasText:'Renamed CI World'});
  await expect(renamedEntry).toBeVisible();
  await expect(renamedEntry).toContainText('创造模式');
  const records=await page.evaluate(async()=>{const {WorldStorage}=await import('./src/storage.js');return new WorldStorage().listWorlds();});
  expect(records).toHaveLength(1);expect(records[0].name).toBe('Renamed CI World');expect(records[0].mode).toBe('creative');

  await renamedEntry.dblclick();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
  expect(pageErrors).toEqual([]);
});
