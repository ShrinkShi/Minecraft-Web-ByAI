import {test,expect} from '@playwright/test';

async function savedWorldCount(page){
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('minecraft-web-by-ai',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains('worlds')){db.close();resolve(0);return;}
      const tx=db.transaction('worlds','readonly');
      const count=tx.objectStore('worlds').count();
      count.onerror=()=>reject(count.error);
      count.onsuccess=()=>{const value=count.result;db.close();resolve(value);};
    };
  }));
}

test('boots a voxel world and persists a browser save',async({page})=>{
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

  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true})));
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(()=>savedWorldCount(page),{timeout:10_000,message:'pause should persist at least one world record'}).toBeGreaterThan(0);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
