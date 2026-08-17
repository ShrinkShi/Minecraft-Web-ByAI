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
async function lockPointer(page){
  const canvas=page.locator('#game-canvas');
  await canvas.click({position:{x:8,y:8}});
  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');
}

test('singleplayer stone pickaxe harvests interpreted iron ore into source-backed raw iron',async({page})=>{
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Iron Progression',seed:'ci-iron-progression-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/tp 0 35 0');
  await runCommand(page,'/give stone_pickaxe 1');

  await key(page,'KeyE');
  await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);
  const inventoryPickaxe=page.locator('#inventory-grid [data-inv-index]').filter({has:page.locator('img[alt="石镐"]')}).first();
  await expect(inventoryPickaxe).toBeVisible();
  await inventoryPickaxe.click({modifiers:['Shift']});
  await key(page,'Escape');
  await expect(page.locator('#inventory')).toHaveClass(/hidden/);

  const selected=page.locator('#hotbar [data-hotbar-index="0"]');
  await expect(selected).toHaveAttribute('title','石镐');
  await expect(selected.locator('img[alt="石镐"]')).toBeVisible();
  await expect(selected).not.toHaveAttribute('data-durability-damage',/./);

  await lockPointer(page);
  const target=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(19)||null);
  expect(target).not.toBeNull();
  expect(target.id).toBe(19);
  await expect(page.locator('#jade-hud')).not.toHaveClass(/hidden/,{timeout:5_000});
  await expect(page.locator('#jade-hud .jade-name')).toHaveText('铁矿石');
  await expect(page.locator('#jade-hud .jade-details')).toContainText('最低石质');

  await page.mouse.down({button:'left'});
  await expect(selected).toHaveAttribute('data-durability-damage','1',{timeout:5_000});
  await page.mouse.up({button:'left'});
  await expect(selected).toHaveAttribute('data-durability-remaining','130');

  const rawIron=page.locator('#hotbar [data-hotbar-index="1"]');
  await expect(rawIron).toHaveAttribute('title','粗铁',{timeout:5_000});
  await expect(rawIron.locator('img[alt="粗铁"]')).toBeVisible();
  await expect(page.locator('#debug')).toContainText('Drops 0',{timeout:5_000});

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
