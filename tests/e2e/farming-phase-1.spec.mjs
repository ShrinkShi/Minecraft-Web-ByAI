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
  return canvas;
}

test('singleplayer wheat can be planted, grown and harvested through the real browser action path',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Wheat Farming',seed:'ci-wheat-farming-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/give wheat_seeds 2');
  await moveInventoryItemToHotbar(page,'小麦种子');

  const selected=page.locator('#hotbar [data-hotbar-index="0"]');
  await expect(selected).toHaveAttribute('title','小麦种子');
  await expect(selected.locator('.slot-count')).toHaveText('2');

  const target=await page.evaluate(blockId=>globalThis.__minecraftE2E.prepareSingleplayerMiningTarget(blockId),BLOCK.FARMLAND);
  expect(target).toBeTruthy();
  const canvas=await lockPointer(page);
  await canvas.dispatchEvent('mousedown',{button:2,bubbles:true});
  await expect(page.locator('#toast')).toContainText('种植 小麦');
  await expect(selected).toHaveAttribute('title','小麦种子');
  await expect(selected.locator('.slot-count')).toHaveText('');
  await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E.worldBlock(x,y+1,z),target),{timeout:2_000}).toBe(BLOCK.WHEAT_AGE_0);

  for(let age=1;age<=7;age++){
    const changed=await page.evaluate(()=>globalThis.__minecraftE2E.farmingTick());
    expect(changed).toBe(true);
    await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E.worldBlock(x,y+1,z),target)).toBe(BLOCK[`WHEAT_AGE_${age}`]);
  }
  const farming=await page.evaluate(()=>globalThis.__minecraftE2E.farming());
  expect(farming.wheat).toBeGreaterThanOrEqual(1);

  const harvestTarget=await page.evaluate(blockId=>globalThis.__minecraftE2E.prepareSingleplayerMiningTarget(blockId),BLOCK.WHEAT_AGE_7);
  expect(harvestTarget).toBeTruthy();
  await canvas.dispatchEvent('mousedown',{button:0,bubbles:true});
  await page.waitForTimeout(450);
  await canvas.dispatchEvent('mouseup',{button:0,bubbles:true});
  await expect.poll(()=>page.evaluate(({x,y,z})=>globalThis.__minecraftE2E.worldBlock(x,y,z),harvestTarget),{timeout:3_000}).toBe(BLOCK.AIR);

  // Local pickup is deliberately hotbar-first. The failure artifact from the
  // first acceptance run showed wheat already present in the inventory-panel
  // hotbar while the old locator searched only the 27-slot main grid.
  await page.waitForTimeout(1_200);
  await key(page,'KeyE');
  await expect(page.locator('#inventory [data-inv-index]').filter({has:page.locator('img[alt="小麦"]')}).first()).toBeVisible({timeout:4_000});
  await key(page,'Escape');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
