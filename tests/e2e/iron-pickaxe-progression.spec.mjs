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

test('iron ingots craft a source-backed iron pickaxe that mines iron ore with 250 durability',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Iron Pickaxe Progression',seed:'ci-iron-pickaxe-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/give iron_ingot 3');
  await runCommand(page,'/give stick 2');

  await lockPointer(page);
  const table=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(9)||null);
  expect(table).not.toBeNull();
  await useTarget(page);
  const workbench=page.locator('#workbench');
  await expect(workbench).not.toHaveClass(/hidden/);
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null),{timeout:5_000}).toBe(true);

  const ingots=workbench.locator('[data-inv-index][title="铁锭"]').first();
  await expect(ingots).toBeVisible();
  await ingots.click();
  for(const index of [0,1,2])await workbench.locator(`[data-craft-size="3"][data-craft-index="${index}"]`).click({button:'right'});

  const sticks=workbench.locator('[data-inv-index][title="木棍"]').first();
  await expect(sticks).toBeVisible();
  await sticks.click();
  for(const index of [4,7])await workbench.locator(`[data-craft-size="3"][data-craft-index="${index}"]`).click({button:'right'});

  const result=page.locator('#craft-result-3 [data-craft-result="3"]');
  await expect(result).toHaveAttribute('title','铁镐');
  await expect(result.locator('img[alt="铁镐"]')).toBeVisible();
  await result.click();
  await expect(page.locator('#cursor-stack img[alt="铁镐"]')).toBeVisible();

  const firstHotbarSlot=workbench.locator('[data-inv-index="27"]');
  await firstHotbarSlot.click();
  await expect(page.locator('#cursor-stack')).toHaveClass(/hidden/);
  await page.keyboard.press('e');
  await expect(workbench).toHaveClass(/hidden/);

  const selected=page.locator('#hotbar [data-hotbar-index="0"]');
  await expect(selected).toHaveAttribute('title','铁镐');
  const image=selected.locator('img[alt="铁镐"]');
  await expect(image).toBeVisible();
  expect(await image.getAttribute('src')).toContain('assets/items/iron_pickaxe.png');
  await expect(selected).not.toHaveAttribute('data-durability-damage',/./);

  await lockPointer(page);
  const ore=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(19)||null);
  expect(ore).not.toBeNull();
  expect(ore.id).toBe(19);
  await expect(page.locator('#jade-hud .jade-name')).toHaveText('铁矿石');

  await page.mouse.down({button:'left'});
  await expect(selected).toHaveAttribute('data-durability-damage','1',{timeout:5_000});
  await page.mouse.up({button:'left'});
  await expect(selected).toHaveAttribute('data-durability-remaining','249');
  const rawIron=page.locator('#hotbar [data-hotbar-index="1"]');
  await expect(rawIron).toHaveAttribute('title','粗铁',{timeout:5_000});
  await expect(rawIron.locator('img[alt="粗铁"]')).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});