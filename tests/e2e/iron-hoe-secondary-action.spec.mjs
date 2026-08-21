import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

const TILL_SOUND_HASHES=['0e6696ec35c5f4982cad6a6731edcffb11728aa9','46dd1e5e0f90bb72261e2986d530e80e8fc50560','cb95637a9d5e9b0cb36a2516f0dfac30fed9d720'];

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
async function soundCount(page,eventName){return page.evaluate(name=>(globalThis.__minecraftE2ESounds||[]).filter(event=>event.eventName===name).length,eventName);}

test('iron ingots craft an iron hoe whose real till action costs durability and plays the original sound only on success',async({page})=>{
  const pageErrors=[],consoleErrors=[],audioWarnings=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{
    if(message.type()==='error')consoleErrors.push(message.text());
    if(message.type()==='warning'&&message.text().includes('无法播放 Minecraft 原版音效'))audioWarnings.push(message.text());
  });

  await page.goto('/?e2e=1');
  await page.evaluate(()=>{
    globalThis.__minecraftE2ESounds=[];
    window.addEventListener('minecraft:sound',event=>globalThis.__minecraftE2ESounds.push(event.detail));
  });
  await createSingleplayerWorld(page,{name:'CI Iron Hoe Secondary Action',seed:'ci-iron-hoe-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/give iron_ingot 2');
  await runCommand(page,'/give stick 2');

  const workbench=await openPreparedWorkbench(page);
  await placeFromInventory(workbench,'铁锭',[0,1]);
  await placeFromInventory(workbench,'木棍',[4,7]);
  const result=page.locator('#craft-result-3 [data-craft-result="3"]');
  await expect(result).toHaveAttribute('title','铁锄');
  await expect(result.locator('img[alt="铁锄"]')).toBeVisible();
  await result.click();
  await expect(page.locator('#cursor-stack img[alt="铁锄"]')).toBeVisible();
  await workbench.locator('[data-inv-index="27"]').click();
  await expect(page.locator('#cursor-stack')).toHaveClass(/hidden/);
  await page.keyboard.press('e');
  await expect(workbench).toHaveClass(/hidden/);

  const hoe=page.locator('#hotbar [data-hotbar-index="0"]');
  await expect(hoe.locator('img[alt="铁锄"]')).toBeVisible();
  await expect(hoe).not.toHaveAttribute('data-durability-damage');

  await lockPointer(page);
  const grass=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(1)||null);
  expect(grass).not.toBeNull();
  await page.evaluate(()=>globalThis.__minecraftE2E?.setLook?.(0,0));
  const originalSoundResponse=page.waitForResponse(response=>response.status()===200&&TILL_SOUND_HASHES.some(hash=>response.url().includes(hash)),{timeout:5_000});
  await useTarget(page);
  const response=await originalSoundResponse;
  expect((await response.body()).byteLength).toBeGreaterThan(4_000);

  await expect(hoe).toHaveAttribute('data-durability-damage','1',{timeout:5_000});
  await expect(hoe).toHaveAttribute('data-durability-remaining','249');
  await expect(hoe).toHaveAttribute('title',/耐久 249 \/ 250/);
  await expect(page.locator('#toast')).toContainText('耕作 草方块');
  await expect.poll(()=>soundCount(page,'item.hoe.till'),{timeout:5_000}).toBe(1);
  const tillSound=await page.evaluate(()=>(globalThis.__minecraftE2ESounds||[]).find(event=>event.eventName==='item.hoe.till')||null);
  expect(tillSound?.logicalPath).toMatch(/^minecraft\/sounds\/item\/hoe\/till[124]\.ogg$/);
  expect(tillSound?.sha1).toMatch(/^[0-9a-f]{40}$/);

  // The target is now farmland, which is not a valid second till target. A second
  // real right click must therefore leave the same tool instance at exactly 249
  // and must not emit another successful-use sound event.
  await useTarget(page);
  await page.waitForTimeout(500);
  await expect(hoe).toHaveAttribute('data-durability-damage','1');
  await expect(hoe).toHaveAttribute('data-durability-remaining','249');
  expect(await soundCount(page,'item.hoe.till')).toBe(1);
  expect(audioWarnings).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
