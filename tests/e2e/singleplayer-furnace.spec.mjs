import {test,expect} from '@playwright/test';
import {createSingleplayerWorld,enterExistingWorld} from './helpers/world-flow.mjs';

async function runCommand(page,text){
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));
  await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);
  await page.locator('#chat-input').fill(text);
  await page.locator('#chat-input').press('Enter');
  await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);
}
async function lockPointer(page){
  const canvas=page.locator('#game-canvas');
  await canvas.click({position:{x:8,y:8}});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');
}
async function useTarget(page){
  await page.mouse.down({button:'right'});
  await page.mouse.up({button:'right'});
}
async function saveToTitle(page){
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await page.locator('#return-main-button').click();
  await expect(page.locator('#main-menu')).toHaveClass(/active/,{timeout:10_000});
  await expect(page.locator('#hud')).toHaveClass(/hidden/);
}

const snapshot=page=>page.evaluate(()=>globalThis.__minecraftE2E?.singleplayerFurnace?.()||null);

test('singleplayer furnace right-clicks through gameplay, persists across reload, smelts, settles cursor and awards XP',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  const name='CI Singleplayer Furnace',seed='ci-singleplayer-furnace-2026';
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name,seed,mode:'survival',prompt:'平原'});
  await runCommand(page,'/give raw_iron 2');
  await runCommand(page,'/give planks 2');

  await lockPointer(page);
  const target=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(21)||null);
  expect(target).not.toBeNull();
  expect(target.id).toBe(21);
  await useTarget(page);

  const furnace=page.locator('#furnace');
  await expect(furnace).not.toHaveClass(/hidden/);
  await expect.poll(()=>snapshot(page)).toMatchObject({target:{x:target.x,y:target.y,z:target.z},slots:[null,null,null]});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null)).toBe(true);

  const rawIron=furnace.locator('[data-inv-index][title="粗铁"]').first();
  await expect(rawIron).toBeVisible();
  await rawIron.click();
  await furnace.locator('[data-furnace-slot="0"]').click();
  await expect.poll(()=>snapshot(page)).toMatchObject({slots:[{id:'raw_iron',count:2},null,null]});

  const planks=furnace.locator('[data-inv-index][title="橡木木板"]').first();
  await expect(planks).toBeVisible();
  await planks.click();
  await furnace.locator('[data-furnace-slot="1"]').click();
  await expect.poll(()=>snapshot(page)).toMatchObject({slots:[{id:'raw_iron',count:2},{id:'block:5',count:2},null],lit:true});
  await expect.poll(async()=>Math.floor((await snapshot(page))?.cookProgress||0),{timeout:8_000}).toBeGreaterThan(20);
  const beforeSave=await snapshot(page);

  // Local Furnace authority responds synchronously. Closing and immediately
  // reopening the same target must not leave a stale "closing" target key in
  // the shared UI and suppress the fresh snapshot.
  await page.keyboard.press('Escape');
  await expect(furnace).toHaveClass(/hidden/);
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');
  await useTarget(page);
  await expect(furnace).not.toHaveClass(/hidden/);
  await expect.poll(()=>snapshot(page)).toMatchObject({target:{x:target.x,y:target.y,z:target.z}});
  await page.keyboard.press('Escape');
  await expect(furnace).toHaveClass(/hidden/);
  await saveToTitle(page);

  await enterExistingWorld(page,name);
  const restoredRecords=await page.evaluate(()=>globalThis.__minecraftE2E?.singleplayerFurnaceRecords?.()||[]);
  expect(restoredRecords).toHaveLength(1);
  expect(restoredRecords[0].target).toEqual({x:target.x,y:target.y,z:target.z});
  expect(restoredRecords[0].state.cookProgress).toBeGreaterThanOrEqual(beforeSave.cookProgress);
  expect(restoredRecords[0].state.slots[0]).toEqual({id:'raw_iron',count:2});

  await lockPointer(page);
  await page.evaluate(()=>globalThis.__minecraftE2E?.setLook?.(0,0));
  await useTarget(page);
  await expect(furnace).not.toHaveClass(/hidden/);
  await expect.poll(()=>snapshot(page)).toMatchObject({target:{x:target.x,y:target.y,z:target.z}});
  await expect.poll(async()=>((await snapshot(page))?.slots?.[2]?.count||0),{timeout:25_000}).toBe(2);

  const beforeXp=await page.evaluate(()=>globalThis.__minecraftE2E?.experienceTotal?.()??-1);
  expect(beforeXp).toBe(0);
  await furnace.locator('[data-furnace-output]').click();
  await expect.poll(()=>page.evaluate(()=>globalThis.__minecraftE2E?.experienceTotal?.()??-1)).toBeGreaterThanOrEqual(1);
  await expect.poll(()=>snapshot(page)).toMatchObject({slots:[null,null,null],storedExperience:0});
  await expect(page.locator('#cursor-stack')).toContainText('2');
  await expect(page.locator('#cursor-stack img[alt="铁锭"]')).toBeVisible();

  // Closing a Furnace must settle its transient cursor before the world record
  // is serialized. Otherwise output can look correct in-session yet disappear
  // after save/reload because local Inventory snapshots intentionally omit cursor.
  await page.keyboard.press('Escape');
  await expect(furnace).toHaveClass(/hidden/);
  await expect(page.locator('#cursor-stack')).toHaveClass(/hidden/);
  await saveToTitle(page);
  await enterExistingWorld(page,name);
  expect(await page.evaluate(()=>globalThis.__minecraftE2E?.experienceTotal?.()??-1)).toBeGreaterThanOrEqual(1);
  await lockPointer(page);
  await page.keyboard.press('e');
  await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);
  const ingot=page.locator('#inventory [data-inv-index][title="铁锭"]').first();
  await expect(ingot).toBeVisible();
  await expect(ingot.locator('.slot-count')).toHaveText('2');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
