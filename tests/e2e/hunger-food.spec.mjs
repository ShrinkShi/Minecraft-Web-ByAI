import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

async function runCommand(page,text){
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));
  await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);
  await page.locator('#chat-input').fill(text);
  await page.locator('#chat-input').press('Enter');
  await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);
}

async function key(page,code){await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true})),code);}
async function rightDown(canvas){await canvas.dispatchEvent('mousedown',{button:2,bubbles:true});}
async function rightUp(canvas){await canvas.dispatchEvent('mouseup',{button:2,bubbles:true});}
async function savedWorlds(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('minecraft-web-by-ai',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('worlds','readonly'),getAll=tx.objectStore('worlds').getAll();getAll.onerror=()=>reject(getAll.error);getAll.onsuccess=()=>{const value=getAll.result;db.close();resolve(value);};};}));}

test('singleplayer food requires an interruptible 1.6 second use and persists schema v10',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Hunger Food',seed:'ci-hunger-food-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/give bread 2');
  await key(page,'KeyE');
  const bread=page.locator('#inventory-grid [data-inv-index]').filter({has:page.locator('img[alt="面包"]')}).first();
  await expect(bread).toBeVisible();
  await bread.click({modifiers:['Shift']});
  await key(page,'Escape');

  const selected=page.locator('#hotbar [data-hotbar-index="0"]');
  await expect(selected).toHaveAttribute('title','面包');
  await expect(selected.locator('.slot-count')).toHaveText('2');
  await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.selectedStack())).toMatchObject({id:'bread',count:2});
  await page.evaluate(()=>globalThis.__minecraftE2E.setPlayerVitals({hp:20,food:10,saturation:0,exhaustion:0,timer:0}));
  const canvas=page.locator('#game-canvas');
  await canvas.click({position:{x:8,y:8}});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');

  // First hold: observe any real intermediate render frame, then release before
  // completion. Do not key this to a fixed Playwright delay: under a saturated CI
  // runner the browser main thread may legitimately resume after the 1.6 s wall-clock
  // deadline, in which case completing on that frame is correct product behaviour.
  await rightDown(canvas);
  await expect.poll(()=>page.evaluate(()=>{const use=globalThis.__minecraftE2E.foodUse();return !!use?.active&&use.progress>0&&use.progress<1;}),{timeout:2_000,intervals:[16,32,50,80]}).toBe(true);
  const midUse=await page.evaluate(()=>({use:globalThis.__minecraftE2E.foodUse(),stack:globalThis.__minecraftE2E.selectedStack(),vitals:globalThis.__minecraftE2E.playerVitals(),view:globalThis.__minecraftE2E.firstPersonViewModel()}));
  expect(midUse.use.active).toBeTruthy();
  expect(midUse.use.progress).toBeGreaterThan(0);
  expect(midUse.use.progress).toBeLessThan(1);
  expect(midUse.stack).toMatchObject({id:'bread',count:2});
  expect(midUse.vitals).toMatchObject({food:10,saturation:0});
  expect(midUse.view).toMatchObject({itemId:'bread',itemKind:'food',foodUseActive:true,foodUseItemId:'bread'});
  expect(midUse.view.foodUseProgress).toBeGreaterThan(0);
  expect(midUse.view.foodUseProgress).toBeLessThan(1);
  await rightUp(canvas);
  await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.foodUse())).toMatchObject({active:false,reason:'released'});
  await page.waitForTimeout(1_700);
  expect(await page.evaluate(()=>globalThis.__minecraftE2E.selectedStack())).toMatchObject({id:'bread',count:2});
  expect(await page.evaluate(()=>globalThis.__minecraftE2E.playerVitals())).toMatchObject({food:10,saturation:0});

  // Second hold: only a full uninterrupted use commits hunger + inventory together.
  await rightDown(canvas);
  await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.foodUse()),{timeout:2_000}).toMatchObject({active:true,itemId:'bread'});
  await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.selectedStack()),{timeout:3_000,intervals:[100,200,400]}).toMatchObject({id:'bread',count:1});
  await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.playerVitals()),{timeout:2_000}).toMatchObject({food:15,saturation:6});
  await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E.foodUse())).toMatchObject({active:false,reason:'completed'});
  await rightUp(canvas);
  await expect(selected).toHaveAttribute('title','面包');
  await expect(selected.locator('.slot-count')).toHaveText('');

  // Full hunger rejects use immediately and leaves the final bread untouched.
  await page.evaluate(()=>globalThis.__minecraftE2E.setPlayerVitals({hp:20,food:20,saturation:5,exhaustion:0,timer:0}));
  await rightDown(canvas);
  await expect(page.locator('#toast')).toContainText('饥饿值已满');
  await rightUp(canvas);
  expect(await page.evaluate(()=>globalThis.__minecraftE2E.selectedStack())).toMatchObject({id:'bread',count:1});
  expect(await page.evaluate(()=>globalThis.__minecraftE2E.foodUse())).toMatchObject({active:false});

  await page.evaluate(()=>globalThis.__minecraftE2E.setPlayerVitals({hp:18,food:20,saturation:5,exhaustion:0,timer:.49}));
  await expect.poll(async()=>Number((await page.evaluate(()=>globalThis.__minecraftE2E.playerVitals())).hp),{timeout:2_000}).toBeGreaterThan(18);
  await page.evaluate(()=>globalThis.__minecraftE2E.setPlayerVitals({hp:2,food:0,saturation:0,exhaustion:0,timer:3.95}));
  await expect.poll(async()=>Number((await page.evaluate(()=>globalThis.__minecraftE2E.playerVitals())).hp),{timeout:2_000}).toBe(1);
  await page.waitForTimeout(250);
  expect((await page.evaluate(()=>globalThis.__minecraftE2E.playerVitals())).hp).toBe(1);

  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Hunger Food');if(!record)return null;return{version:record.version,terrainVersion:record.terrainVersion,hunger:record.player?.hunger,saturation:record.player?.saturation,hasExhaustion:Number.isFinite(record.player?.exhaustion),hasTimer:Number.isFinite(record.player?.foodTickTimer),hasEffects:Array.isArray(record.player?.statusEffects)};},{timeout:10_000}).toEqual({version:10,terrainVersion:4,hunger:0,saturation:0,hasExhaustion:true,hasTimer:true,hasEffects:true});
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
