import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

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
async function openPreparedWorkbench(page){
  await lockPointer(page);
  const table=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(9)||null);
  expect(table).not.toBeNull();
  await useTarget(page);
  const workbench=page.locator('#workbench');
  await expect(workbench).not.toHaveClass(/hidden/);
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null),{timeout:5_000}).toBe(true);
  return workbench;
}
async function placeFromInventory(workbench,title,indices){
  const item=workbench.locator(`[data-inv-index][title="${title}"]`).first();
  await expect(item).toBeVisible();
  await item.click();
  for(const index of indices)await workbench.locator(`[data-craft-size="3"][data-craft-index="${index}"]`).click({button:'right'});
}
async function takeResultToHotbar(page,workbench,title,hotbarInventoryIndex){
  const result=page.locator('#craft-result-3 [data-craft-result="3"]');
  await expect(result).toHaveAttribute('title',title);
  await expect(result.locator(`img[alt="${title}"]`)).toBeVisible();
  await result.click();
  await expect(page.locator(`#cursor-stack img[alt="${title}"]`)).toBeVisible();
  await workbench.locator(`[data-inv-index="${hotbarInventoryIndex}"]`).click();
  await expect(page.locator('#cursor-stack')).toHaveClass(/hidden/);
}
async function closeWorkbench(page,workbench){
  await page.keyboard.press('e');
  await expect(workbench).toHaveClass(/hidden/);
}
async function minePreparedTarget(page,blockId,hotbarIndex,toolTitle,expectedDropTitle){
  await lockPointer(page);
  const target=await page.evaluate(id=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(id)||null,blockId);
  expect(target).not.toBeNull();
  expect(target.id).toBe(blockId);
  if(hotbarIndex>0)await page.keyboard.press(`Digit${hotbarIndex+1}`);
  const selected=page.locator(`#hotbar [data-hotbar-index="${hotbarIndex}"]`);
  await expect(selected).toHaveAttribute('title',toolTitle);
  await page.mouse.down({button:'left'});
  await expect(selected).toHaveAttribute('data-durability-damage','1',{timeout:5_000});
  await page.mouse.up({button:'left'});
  await expect(selected).toHaveAttribute('data-durability-remaining','249');
  await expect(page.locator(`#hotbar [data-hotbar-index][title="${expectedDropTitle}"]`).first()).toBeVisible({timeout:5_000});
}

test('iron ingots craft source-backed iron axe and shovel with effective-tool mining and ordinary drops',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Iron Axe Shovel Progression',seed:'ci-iron-axe-shovel-2026',mode:'survival',prompt:'平原'});

  await runCommand(page,'/give iron_ingot 3');
  await runCommand(page,'/give stick 2');
  let workbench=await openPreparedWorkbench(page);
  await placeFromInventory(workbench,'铁锭',[0,1,3]);
  await placeFromInventory(workbench,'木棍',[4,7]);
  await takeResultToHotbar(page,workbench,'铁斧',27);
  await closeWorkbench(page,workbench);

  await runCommand(page,'/give iron_ingot 1');
  await runCommand(page,'/give stick 2');
  workbench=await openPreparedWorkbench(page);
  await placeFromInventory(workbench,'铁锭',[1]);
  await placeFromInventory(workbench,'木棍',[4,7]);
  await takeResultToHotbar(page,workbench,'铁锹',28);
  await closeWorkbench(page,workbench);

  const axe=page.locator('#hotbar [data-hotbar-index="0"]');
  const shovel=page.locator('#hotbar [data-hotbar-index="1"]');
  await expect(axe.locator('img[alt="铁斧"]')).toBeVisible();
  await expect(shovel.locator('img[alt="铁锹"]')).toBeVisible();
  expect(await axe.locator('img').getAttribute('src')).toContain('assets/items/iron_axe.png');
  expect(await shovel.locator('img').getAttribute('src')).toContain('assets/items/iron_shovel.png');

  await minePreparedTarget(page,6,0,'铁斧','橡木原木');
  await minePreparedTarget(page,2,1,'铁锹','泥土');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
