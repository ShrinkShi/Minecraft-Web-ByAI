import {test,expect} from '@playwright/test';
import {BLOCK} from '../../src/blocks.js';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

async function runCommand(page,text){
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));
  await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);
  await page.locator('#chat-input').fill(text);
  await page.locator('#chat-input').press('Enter');
  await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);
}
async function key(page,code){await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true})),code);}
async function moveInventoryItemToHotbar(page,alt){
  await key(page,'KeyE');
  const item=page.locator('#inventory-grid [data-inv-index]').filter({has:page.locator(`img[alt="${alt}"]`)}).first();
  await expect(item).toBeVisible();
  await item.click({modifiers:['Shift']});
  await key(page,'Escape');
}
async function lockPointer(page){
  const canvas=page.locator('#game-canvas');
  await canvas.click({position:{x:8,y:8}});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');
  // pointerlockchange is followed by the frame-driven control-adapter sync. Wait
  // for two animation frames so the first real use/mining input is not emitted
  // into the deliberate gameplayEnabled=false transition window.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  return canvas;
}
async function rightClick(canvas){
  await canvas.dispatchEvent('mousedown',{button:2,bubbles:true});
  await canvas.dispatchEvent('mouseup',{button:2,bubbles:true});
}

function collectBrowserErrors(page){
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  return{pageErrors,consoleErrors};
}

test('short grass can naturally bootstrap wheat seeds through real mining and pickup',async({page})=>{
  const errors=collectBrowserErrors(page);
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Short Grass Seeds',seed:'ci-short-grass-seeds-2026',mode:'survival',prompt:'平原'});
  expect(await page.evaluate(()=>globalThis.__minecraftE2E.setVegetationRandom(0))).toBe(true);

  const target=await page.evaluate(blockId=>globalThis.__minecraftE2E.prepareSingleplayerMiningTarget(blockId),BLOCK.SHORT_GRASS);
  expect(target).toBeTruthy();
  const canvas=await lockPointer(page);
  await canvas.dispatchEvent('mousedown',{button:0,bubbles:true});
  await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E.worldBlock(x,y,z),target),{timeout:3_000}).toBe(BLOCK.AIR);
  await canvas.dispatchEvent('mouseup',{button:0,bubbles:true});

  await page.waitForTimeout(1_200);
  await key(page,'KeyE');
  await expect(page.locator('#inventory [data-inv-index]').filter({has:page.locator('img[alt="小麦种子"]')}).first()).toBeVisible({timeout:4_000});
  await key(page,'Escape');

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test('bone meal advances wheat and spreads short grass through the real secondary-action path',async({page})=>{
  const errors=collectBrowserErrors(page);
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Bone Meal Vegetation',seed:'ci-bone-meal-vegetation-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/give bone_meal 2');
  await moveInventoryItemToHotbar(page,'骨粉');

  const selected=page.locator('#hotbar [data-hotbar-index="0"]');
  await expect(selected).toHaveAttribute('title','骨粉');
  await expect(selected.locator('.slot-count')).toHaveText('2');

  expect(await page.evaluate(()=>globalThis.__minecraftE2E.setVegetationRandom(0))).toBe(true);
  const wheat=await page.evaluate(blockId=>globalThis.__minecraftE2E.prepareSingleplayerMiningTarget(blockId),BLOCK.WHEAT_AGE_0);
  expect(wheat).toBeTruthy();
  const canvas=await lockPointer(page);
  await rightClick(canvas);
  await expect(page.locator('#toast')).toContainText('催熟 小麦 0→2');
  await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E.worldBlock(x,y,z),wheat)).toBe(BLOCK.WHEAT_AGE_2);
  await expect(selected.locator('.slot-count')).toHaveText('');

  expect(await page.evaluate(()=>globalThis.__minecraftE2E.setVegetationRandom(.5))).toBe(true);
  const grass=await page.evaluate(blockId=>globalThis.__minecraftE2E.prepareSingleplayerMiningTarget(blockId),BLOCK.GRASS);
  expect(grass).toBeTruthy();
  await rightClick(canvas);
  await expect(page.locator('#toast')).toContainText('催生 矮草');
  await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E.worldBlock(x,y+1,z),grass),{timeout:2_000}).toBe(BLOCK.SHORT_GRASS);
  await expect(selected.locator('img[alt="骨粉"]')).toHaveCount(0);

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});

test('failed bone meal use keeps the survival stack intact',async({page})=>{
  const errors=collectBrowserErrors(page);
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Bone Meal No Consume',seed:'ci-bone-meal-no-consume-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/give bone_meal 1');
  await moveInventoryItemToHotbar(page,'骨粉');

  const selected=page.locator('#hotbar [data-hotbar-index="0"]');
  await expect(selected).toHaveAttribute('title','骨粉');
  await expect(selected.locator('img[alt="骨粉"]')).toHaveCount(1);

  const stone=await page.evaluate(blockId=>globalThis.__minecraftE2E.prepareSingleplayerMiningTarget(blockId),BLOCK.STONE);
  expect(stone).toBeTruthy();
  const canvas=await lockPointer(page);
  await rightClick(canvas);
  await expect(page.locator('#toast')).toContainText('这里无法使用骨粉');
  await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E.worldBlock(x,y,z),stone)).toBe(BLOCK.STONE);
  await expect(selected.locator('img[alt="骨粉"]')).toHaveCount(1);
  await expect(selected.locator('.slot-count')).toHaveText('');

  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});
