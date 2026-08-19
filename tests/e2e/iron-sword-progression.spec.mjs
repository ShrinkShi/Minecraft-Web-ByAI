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
async function useTarget(page){await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});}
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

test('iron ingots craft a source-backed iron sword whose real mob hit costs one durability',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Iron Sword Progression',seed:'ci-iron-sword-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/give iron_ingot 2');
  await runCommand(page,'/give stick 1');

  const workbench=await openPreparedWorkbench(page);
  await placeFromInventory(workbench,'铁锭',[1,4]);
  await placeFromInventory(workbench,'木棍',[7]);
  const result=page.locator('#craft-result-3 [data-craft-result="3"]');
  await expect(result).toHaveAttribute('title','铁剑');
  await expect(result.locator('img[alt="铁剑"]')).toBeVisible();
  await result.click();
  await expect(page.locator('#cursor-stack img[alt="铁剑"]')).toBeVisible();
  await workbench.locator('[data-inv-index="27"]').click();
  await expect(page.locator('#cursor-stack')).toHaveClass(/hidden/);
  await page.keyboard.press('e');
  await expect(workbench).toHaveClass(/hidden/);

  const sword=page.locator('#hotbar [data-hotbar-index="0"]');
  await expect(sword.locator('img[alt="铁剑"]')).toBeVisible();
  expect(await sword.locator('img').getAttribute('src')).toContain('assets/items/iron_sword.png');
  await expect(sword).not.toHaveAttribute('data-durability-damage');

  // Move both player and target well above terrain. If entity targeting fails,
  // there is no nearby block for mining to create a false-positive durability hit.
  await runCommand(page,'/tp 0 55 0');
  await runCommand(page,'/summon zombie 0 55 -2');
  await expect(page.locator('#chat-log')).toContainText('已召唤 zombie');
  await lockPointer(page);
  await page.evaluate(()=>globalThis.__minecraftE2E?.setLook?.(0,0));
  await page.mouse.down({button:'left'});
  await page.mouse.up({button:'left'});

  await expect(sword).toHaveAttribute('data-durability-damage','1',{timeout:5_000});
  await expect(sword).toHaveAttribute('data-durability-remaining','249');
  await expect(sword).toHaveAttribute('title',/耐久：249 \/ 250/);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
