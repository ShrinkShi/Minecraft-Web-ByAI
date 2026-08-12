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
async function holdKey(page,code,durationMs){
  await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true})),code);
  await page.waitForTimeout(durationMs);
  await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true})),code);
}
async function debugXYZ(page){
  const text=await page.locator('#debug').innerText(),match=text.match(/XYZ\s+([-\d.]+)\s*\/\s*([-\d.]+)\s*\/\s*([-\d.]+)/);
  if(!match)throw new Error(`cannot parse player XYZ from debug HUD: ${text}`);return{x:Number(match[1]),y:Number(match[2]),z:Number(match[3])};
}
async function debugY(page){return (await debugXYZ(page)).y;}

test('boots, swims, switches precipitation, persists armor, then clears equipment on survival void death',async({page})=>{
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
  await page.locator('#terrain-prompt').fill('海');
  await page.getByRole('button',{name:'创建 / 进入'}).click();

  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
  const canvas=await page.locator('#game-canvas').evaluate(element=>({width:element.width,height:element.height,clientWidth:element.clientWidth,clientHeight:element.clientHeight}));
  expect(canvas.width).toBeGreaterThan(0);expect(canvas.height).toBeGreaterThan(0);expect(canvas.clientWidth).toBeGreaterThan(0);expect(canvas.clientHeight).toBeGreaterThan(0);

  const oxygen=page.locator('#oxygen');
  await expect(oxygen).not.toHaveClass(/hidden/,{timeout:5_000});
  const firstAir=Number(await oxygen.getAttribute('data-air'));expect(firstAir).toBeGreaterThan(13);expect(firstAir).toBeLessThanOrEqual(15);
  await page.waitForTimeout(500);
  const secondAir=Number(await oxygen.getAttribute('data-air'));expect(secondAir).toBeLessThan(firstAir-.2);

  const swimStartY=await debugY(page);
  await holdKey(page,'Space',350);
  await page.waitForTimeout(80);
  const swimUpY=await debugY(page);expect(swimUpY).toBeGreaterThan(swimStartY+.08);
  await holdKey(page,'ShiftLeft',650);
  await page.waitForTimeout(80);
  const swimDownY=await debugY(page);expect(swimDownY).toBeLessThan(swimUpY-.03);

  await runCommand(page,'/tp 0 35 0');
  await expect(oxygen).toHaveClass(/hidden/,{timeout:5_000});

  await runCommand(page,'/weather rain');
  await expect(page.locator('#debug')).toContainText('WeatherFX rain:446',{timeout:5_000});
  await runCommand(page,'/weather thunder');
  await expect(page.locator('#debug')).toContainText('WeatherFX thunder:720',{timeout:5_000});
  await runCommand(page,'/weather clear');
  await expect(page.locator('#debug')).toContainText('WeatherFX clear:0',{timeout:5_000});

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
    return{version:record.version,chest:record.equipment?.slots?.chest?.id||null,weather:record.weather,hasTransientAir:Object.hasOwn(record,'oxygen')};
  },{timeout:10_000,message:'a fresh pause save should persist armor and clear weather but not transient oxygen state'}).toEqual({version:6,chest:'leather_chestplate',weather:'clear',hasTransientAir:false});
  await page.getByRole('button',{name:'返回游戏'}).click();
  await expect(page.locator('#pause-menu')).not.toHaveClass(/active/);

  const deathPhaseStartedAt=await page.evaluate(()=>Date.now());
  await runCommand(page,'/give oak_log 3');
  await runCommand(page,'/tp 0 -20 0');
  await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});
  await expect(page.locator('#death-reason')).toContainText('虚空');
  await expect(page.locator('#death-detail')).toContainText('无法回收');

  await page.waitForTimeout(450);
  await expect(page.locator('#death-menu')).toHaveClass(/active/);
  await key(page,'Escape');
  await expect(page.locator('#death-menu')).toHaveClass(/active/);
  await expect(page.locator('#pause-menu')).not.toHaveClass(/active/);

  await page.getByRole('button',{name:'重生'}).click();
  await expect(page.locator('#death-menu')).not.toHaveClass(/active/);
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);

  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{
    const record=(await savedWorlds(page)).find(world=>world.name==='CI Browser Smoke');
    if(!record||Number(record.updatedAt)<deathPhaseStartedAt)return null;
    const occupied=record.inventory?.slots?.filter(Boolean).length??-1;
    const equipped=record.equipment?.slots?Object.values(record.equipment.slots).filter(Boolean).length:-1;
    return{occupied,equipped,totalXp:record.totalXp,hp:record.player?.hp,respawned:Number(record.player?.position?.y)>-10,fresh:true};
  },{timeout:10_000,message:'explicit respawn should persist cleared death losses and a living spawn state'}).toEqual({occupied:0,equipped:0,totalXp:0,hp:20,respawned:true,fresh:true});

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('recoverable death drops and re-picks items after explicit respawn',async({page})=>{
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('/');
  await page.getByRole('button',{name:'单人游戏'}).click();
  await page.locator('#world-name').fill('CI Recoverable Death');
  await page.locator('#world-seed').fill('ci-recoverable-death-2026');
  await page.locator('#game-mode').selectOption('survival');
  await page.locator('#terrain-prompt').fill('平原');
  await page.getByRole('button',{name:'创建 / 进入'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);

  await runCommand(page,'/tp 0 35 0');
  await runCommand(page,'/give oak_log 3');
  await runCommand(page,'/xp add 16');
  await runCommand(page,'/kill');
  await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});
  await expect(page.locator('#death-reason')).toContainText('被杀死');
  await expect(page.locator('#death-detail')).toContainText('3 个物品');
  await expect(page.locator('#death-detail')).toContainText('14 点经验');
  await expect(page.locator('#death-detail')).toContainText('死亡点');
  await page.waitForTimeout(350);
  await expect(page.locator('#death-menu')).toHaveClass(/active/);

  await page.getByRole('button',{name:'重生'}).click();
  await expect(page.locator('#death-menu')).not.toHaveClass(/active/);
  const pickupPhaseStartedAt=await page.evaluate(()=>Date.now());
  await runCommand(page,'/tp 0 35 0');
  await expect(page.locator('#debug')).toContainText('Drops 0 · XPOrbs 0 · XP 14 / Lv.1',{timeout:10_000});

  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{
    const record=(await savedWorlds(page)).find(world=>world.name==='CI Recoverable Death');
    if(!record||Number(record.updatedAt)<pickupPhaseStartedAt)return null;
    const logs=(record.inventory?.slots||[]).reduce((sum,stack)=>sum+(stack?.id==='block:6'?stack.count:0),0);
    return{logs,totalXp:record.totalXp,hp:record.player?.hp,alive:Number(record.player?.position?.y)>-10};
  },{timeout:10_000,message:'returning to the recoverable death point should pick the dropped logs and death XP back up'}).toEqual({logs:3,totalXp:14,hp:20,alive:true});

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('custom spawnpoint persists and explicit respawn returns to it',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/');await page.getByRole('button',{name:'单人游戏'}).click();await page.locator('#world-name').fill('CI Custom Respawn');await page.locator('#world-seed').fill('ci-custom-respawn-2026');await page.locator('#game-mode').selectOption('survival');await page.locator('#terrain-prompt').fill('平原');await page.getByRole('button',{name:'创建 / 进入'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
  await runCommand(page,'/tp 7 35 7');
  await expect.poll(async()=>{const a=await debugXYZ(page);await page.waitForTimeout(250);const b=await debugXYZ(page);return Math.abs(a.y-b.y)<.03&&b.y>0;},{timeout:10_000,message:'player should settle on terrain before setting spawnpoint'}).toBe(true);
  const custom=await debugXYZ(page);await runCommand(page,'/spawnpoint');const saveStarted=await page.evaluate(()=>Date.now());await key(page,'Escape');await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Custom Respawn');if(!record||Number(record.updatedAt)<saveStarted||!record.respawnPoint)return null;return{version:record.version,x:Number(record.respawnPoint.x.toFixed(1)),y:Number(record.respawnPoint.y.toFixed(1)),z:Number(record.respawnPoint.z.toFixed(1))};},{timeout:10_000,message:'spawnpoint should persist in a fresh v6 world snapshot'}).toEqual({version:6,x:custom.x,y:custom.y,z:custom.z});
  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/tp -7 35 -7');await runCommand(page,'/kill');await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});await page.getByRole('button',{name:'重生'}).click();await expect(page.locator('#death-menu')).not.toHaveClass(/active/);
  await expect.poll(async()=>{const p=await debugXYZ(page);return Math.abs(p.x-custom.x)<.15&&Math.abs(p.y-custom.y)<.15&&Math.abs(p.z-custom.z)<.15;},{timeout:5_000,message:'explicit respawn should return to the persisted custom spawnpoint'}).toBe(true);
  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
