import {expect} from '@playwright/test';

async function openWorldList(page){
  await page.getByRole('button',{name:'单人游戏'}).click();
  await expect(page.getByRole('heading',{name:'选择世界'})).toBeVisible();
  await expect(page.locator('#world-list-summary')).not.toContainText('正在读取',{timeout:10_000});
}

async function waitForWorldReady(page){
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
}

export async function createSingleplayerWorld(page,{name,seed,mode='survival',prompt='平原'}={}){
  await openWorldList(page);
  await page.getByRole('button',{name:'创建新的世界'}).click();
  await expect(page.getByRole('heading',{name:'创建新的世界'})).toBeVisible();
  await page.locator('#world-name').fill(name);
  await page.locator('#world-seed').fill(seed);
  await page.locator('#game-mode').selectOption(mode);
  await page.locator('#terrain-prompt').fill(prompt);
  await page.getByRole('button',{name:'创建世界'}).click();
  await waitForWorldReady(page);
}

export async function enterExistingWorld(page,name){
  await openWorldList(page);
  const entry=page.locator('.world-entry').filter({hasText:name}).first();
  await expect(entry).toBeVisible({timeout:10_000});
  await entry.click();
  await page.getByRole('button',{name:'进入选中的世界'}).click();
  await waitForWorldReady(page);
}

export async function createOrEnterSingleplayerWorld(page,{name,seed,mode='survival',prompt='平原'}={}){
  await openWorldList(page);
  const entry=page.locator('.world-entry').filter({hasText:name}).first();
  if(await entry.count()&&await entry.isVisible().catch(()=>false)){
    await entry.click();
    await page.getByRole('button',{name:'进入选中的世界'}).click();
    await waitForWorldReady(page);
    return 'entered';
  }
  await page.getByRole('button',{name:'创建新的世界'}).click();
  await page.locator('#world-name').fill(name);
  await page.locator('#world-seed').fill(seed);
  await page.locator('#game-mode').selectOption(mode);
  await page.locator('#terrain-prompt').fill(prompt);
  await page.getByRole('button',{name:'创建世界'}).click();
  await waitForWorldReady(page);
  return 'created';
}
