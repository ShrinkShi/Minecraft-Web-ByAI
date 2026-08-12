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
async function lockPointerAndLook(page,{movementX=0,movementY=0}={}){
  const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000,message:'canvas should own pointer lock before mouse interaction'}).toBe('game-canvas');
  await page.evaluate(({movementX,movementY})=>{const event=new MouseEvent('mousemove',{bubbles:true});Object.defineProperty(event,'movementX',{value:movementX});Object.defineProperty(event,'movementY',{value:movementY});document.dispatchEvent(event);},{movementX,movementY});
}
async function rightClickCanvas(page){await page.locator('#game-canvas').dispatchEvent('mousedown',{button:2,bubbles:true});}
async function placeBedWithRealAim(page){
  const candidates=[];for(const pitch of [-.45,-.65,-.85])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])candidates.push([yaw,pitch]);
  for(const [yaw,pitch] of candidates){await page.evaluate(({yaw,pitch})=>globalThis.__minecraftE2E?.setLook(yaw,pitch),{yaw,pitch});await page.waitForTimeout(80);await rightClickCanvas(page);await page.waitForTimeout(120);if(((await page.locator('#toast').textContent())||'').includes('放置 床'))return;}
  throw new Error(`no real two-cell bed surface found; ${await page.locator('#debug').innerText()}`);
}

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

  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Browser Smoke');if(!record)return null;return{version:record.version,chest:record.equipment?.slots?.chest?.id||null,weather:record.weather,hasTransientAir:Object.hasOwn(record,'oxygen')};},{timeout:15_000,message:'pause save should drain to the latest armor/weather snapshot'}).toEqual({version:6,chest:'leather_chestplate',weather:'clear',hasTransientAir:false});
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
  const custom={x:7.5,y:25.01,z:7.5};await runCommand(page,`/spawnpoint ${custom.x} ${custom.y} ${custom.z}`);const saveStarted=await page.evaluate(()=>Date.now());await key(page,'Escape');await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Custom Respawn');if(!record||Number(record.updatedAt)<saveStarted||!record.respawnPoint)return null;return{version:record.version,x:Number(record.respawnPoint.x.toFixed(2)),y:Number(record.respawnPoint.y.toFixed(2)),z:Number(record.respawnPoint.z.toFixed(2))};},{timeout:10_000,message:'spawnpoint should persist in a fresh v6 world snapshot'}).toEqual({version:6,...custom});
  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/tp -96 40 -96');await runCommand(page,'/kill');await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});await page.getByRole('button',{name:'重生'}).click();await expect(page.locator('#death-menu')).not.toHaveClass(/active/,{timeout:15_000});
  await expect.poll(async()=>{const p=await debugXYZ(page);return Math.abs(p.x-custom.x)<.15&&Math.abs(p.y-custom.y)<.15&&Math.abs(p.z-custom.z)<.15;},{timeout:5_000,message:'explicit respawn should reload the unloaded custom-spawn chunk and return to the persisted point'}).toBe(true);
  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});

test('bed placement sets the persistent respawn anchor',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/?e2e=1');await page.getByRole('button',{name:'单人游戏'}).click();await page.locator('#world-name').fill('CI Bed Anchor');await page.locator('#world-seed').fill('ci-bed-anchor-2026');await page.locator('#game-mode').selectOption('survival');await page.locator('#terrain-prompt').fill('平原');await page.getByRole('button',{name:'创建 / 进入'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
  await runCommand(page,'/tp 20 35 20');
  await expect.poll(async()=>{const a=await debugXYZ(page);await page.waitForTimeout(180);const b=await debugXYZ(page);return Math.abs(a.y-b.y)<.03&&b.y>0;},{timeout:10_000,message:'player should settle before bed placement search'}).toBe(true);
  await runCommand(page,'/give bed 1');
  await key(page,'KeyE');await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);
  await expect(page.locator('#inventory-grid [data-inv-index="0"]')).toHaveAttribute('title','床');
  await page.locator('#inventory-grid [data-inv-index="0"]').click();await page.locator('#inventory-hotbar [data-inv-index="27"]').click();
  await key(page,'Escape');await expect(page.locator('#inventory')).toHaveClass(/hidden/);await expect(page.locator('#hotbar .hotbar-slot.selected')).toHaveAttribute('title','床');
  await placeBedWithRealAim(page);await expect(page.locator('#toast')).toContainText('放置 床',{timeout:2_000});
  await page.waitForTimeout(250);await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('重生点已设置',{timeout:5_000});
  await runCommand(page,'/time set night');await expect.poll(async()=>{const text=await page.locator('#debug').innerText(),match=text.match(/Time\s+(\d+)/);return Number(match?.[1])>=12990;},{timeout:5_000,message:'night command should move the shared world clock into the sleep window'}).toBe(true);
  await page.waitForTimeout(120);await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('已睡到清晨',{timeout:5_000});
  await expect.poll(async()=>{const text=await page.locator('#debug').innerText(),match=text.match(/Time\s+(\d+)/),time=Number(match?.[1]);return Number.isFinite(time)&&time>=1000&&time<1200;},{timeout:5_000,message:'using the same bed at night should advance the shared world clock to morning'}).toBe(true);
  await runCommand(page,'/time set night');await runCommand(page,'/summon zombie ~2 ~ ~');await expect(page.locator('#debug')).toContainText('Hostile 1',{timeout:5_000});
  await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('附近有怪物，无法睡觉',{timeout:5_000});
  await expect.poll(async()=>{const text=await page.locator('#debug').innerText(),match=text.match(/Time\s+(\d+)/);return Number(match?.[1])>=12990;},{timeout:2_000,message:'nearby hostile monster must prevent the bed from skipping to morning'}).toBe(true);
  await key(page,'Escape');await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Bed Anchor');if(!record||!record.respawnPoint)return null;const ids=Object.values(record.edits||{}).flat().map(entry=>Number(entry?.[1])).filter(id=>id>=11&&id<=18).sort((a,b)=>a-b);return{version:record.version,validPair:['11,12','13,14','15,16','17,18'].includes(ids.join(',')),hasRespawn:true};},{timeout:15_000,message:'valid bed pair and respawn anchor should persist together'}).toEqual({version:6,validPair:true,hasRespawn:true});
  const bedRecord=(await savedWorlds(page)).find(world=>world.name==='CI Bed Anchor'),anchor=bedRecord.respawnPoint;expect(anchor).toBeTruthy();
  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/tp -64 35 -64');await expect(page.locator('#debug')).toContainText('Hostile 0',{timeout:5_000});await runCommand(page,'/kill');await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});await page.getByRole('button',{name:'重生'}).click();
  await expect.poll(async()=>{const pos=await debugXYZ(page);return Math.abs(pos.x-anchor.x)<.15&&Math.abs(pos.y-anchor.y)<.15&&Math.abs(pos.z-anchor.z)<.15;},{timeout:5_000,message:'explicit respawn should return to the bed anchor'}).toBe(true);
  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
