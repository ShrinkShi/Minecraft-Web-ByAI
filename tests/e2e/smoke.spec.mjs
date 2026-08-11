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

test('boots, applies survival void death loss and persists the result',async({page})=>{
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
  const canvas=await page.locator('#game-canvas').evaluate(element=>({
    width:element.width,height:element.height,clientWidth:element.clientWidth,clientHeight:element.clientHeight
  }));
  expect(canvas.width).toBeGreaterThan(0);
  expect(canvas.height).toBeGreaterThan(0);
  expect(canvas.clientWidth).toBeGreaterThan(0);
  expect(canvas.clientHeight).toBeGreaterThan(0);

  await runCommand(page,'/give oak_log 3');
  await runCommand(page,'/tp 0 -20 0');
  await expect(page.locator('#toast')).toContainText('虚空死亡',{timeout:10_000});

  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true})));
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{
    const worlds=await savedWorlds(page),record=worlds.find(world=>world.name==='CI Browser Smoke');
    if(!record)return null;
    const occupied=record.inventory?.slots?.filter(Boolean).length??-1;
    return{occupied,totalXp:record.totalXp,respawned:Number(record.player?.position?.y)>-10};
  },{timeout:10_000,message:'void death should persist an empty survival inventory at a recoverable respawn position'}).toEqual({occupied:0,totalXp:0,respawned:true});

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});