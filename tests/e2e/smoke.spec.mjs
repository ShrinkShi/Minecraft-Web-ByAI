import {test,expect} from '@playwright/test';

async function savedWorlds(page){
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('minecraft-web-by-ai',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains('worlds')){db.close();resolve([]);return;}
      const tx=db.transaction('worlds','readonly'),getAll=tx.objectStore('worlds').getAll();
      getAll.onerror=()=>reject(getAll.error);
      getAll.onsuccess=()=>{const value=getAll.result;db.close();resolve(value);};
    };
  }));
}

async function runCommand(page,text){
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));
  await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);
  await page.locator('#chat-input').fill(text);
  await page.locator('#chat-input').press('Enter');
  await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);
}

async function key(page,code){await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true})),code);}

test('boots, equips armor, persists it, then clears equipment on survival void death',async({page})=>{
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('/');
  await expect(page.locator('#main-menu')).toHaveClass(/active/);
  await expect(page.getByRole('button',{name:'单人游戏'})).toBeVisible();

  await page.getByRole('button',{name:'单人游戏'}).click();
  await expect(page.locator('#world-menu')).toHaveClass(/active/);
  await page.locator('#world-name').fill('CI Browser Smoke');
  await page.locator('#world-seed').fill('ci-browser-smoke-2026');
  await page.locator('#game-mode').selectOption('survival');
  await page.getByRole('button',{name:'创建 / 进入'}).click();

  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
  const canvas=await page.locator('#game-canvas').evaluate(element=>({width:element.width,height:element.height,clientWidth:element.clientWidth,clientHeight:element.clientHeight}));
  expect(canvas.width).toBeGreaterThan(0);expect(canvas.height).toBeGreaterThan(0);expect(canvas.clientWidth).toBeGreaterThan(0);expect(canvas.clientHeight).toBeGreaterThan(0);

  await runCommand(page,'/give minecraft:leather_chestplate 1');
  await key(page,'KeyE');
  await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);
  await page.locator('#inventory-grid [data-inv-index="0"]').click();
  await page.locator('#equipment-slots [data-equipment-slot="chest"]').click();
  await expect(page.locator('#equipment-slots [data-equipment-slot="chest"]')).toHaveAttribute('title','皮革外套');
  await expect(page.locator('#armor-row .armor-icon.full')).toHaveCount(1);
  await expect(page.locator('#armor-row .armor-icon.half')).toHaveCount(1);
  await key(page,'Escape');
  await expect(page.locator('#inventory')).toHaveClass(/hidden/);

  const armorSaveStartedAt=await page.evaluate(()=>Date.now());
  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{
    const record=(await savedWorlds(page)).find(world=>world.name==='CI Browser Smoke');
    if(!record||Number(record.updatedAt)<armorSaveStartedAt)return null;
    return{version:record.version,chest:record.equipment?.slots?.chest?.id||null};
  },{timeout:10_000,message:'a fresh pause save should persist the equipped leather chestplate'}).toEqual({version:5,chest:'leather_chestplate'});
  await page.getByRole('button',{name:'返回游戏'}).click();
  await expect(page.locator('#pause-menu')).not.toHaveClass(/active/);

  const deathPhaseStartedAt=await page.evaluate(()=>Date.now());
  await runCommand(page,'/give oak_log 3');
  await runCommand(page,'/tp 0 -20 0');
  await expect(page.locator('#toast')).toContainText('虚空死亡',{timeout:10_000});

  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{
    const record=(await savedWorlds(page)).find(world=>world.name==='CI Browser Smoke');
    if(!record||Number(record.updatedAt)<deathPhaseStartedAt)return null;
    const occupied=record.inventory?.slots?.filter(Boolean).length??-1;
    const equipped=record.equipment?.slots?Object.values(record.equipment.slots).filter(Boolean).length:-1;
    return{occupied,equipped,totalXp:record.totalXp,respawned:Number(record.player?.position?.y)>-10,fresh:true};
  },{timeout:10_000,message:'a fresh post-death save should clear inventory, armor and XP at a valid respawn position'}).toEqual({occupied:0,equipped:0,totalXp:0,respawned:true,fresh:true});

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});