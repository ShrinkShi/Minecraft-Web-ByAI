import {test,expect} from '@playwright/test';

async function runCommand(page,text){
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));
  await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);
  await page.locator('#chat-input').fill(text);await page.locator('#chat-input').press('Enter');await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);
}
async function key(page,code){await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true})),code);}
async function setSavedPickaxeDamage(page,worldName,damage){
  await page.evaluate(({worldName,damage})=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('minecraft-web-by-ai',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('worlds','readwrite'),store=tx.objectStore('worlds'),all=store.getAll();all.onerror=()=>reject(all.error);all.onsuccess=()=>{const record=all.result.find(world=>world.name===worldName);if(!record){reject(new Error(`missing saved world ${worldName}`));return;}const stack=record.inventory?.slots?.find(item=>item?.id==='wooden_pickaxe');if(!stack){reject(new Error('saved world is missing wooden pickaxe'));return;}stack.damage=damage;const put=store.put(record);put.onerror=()=>reject(put.error);put.onsuccess=()=>{};};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
  }),{worldName,damage});
}
async function lockPointer(page){const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');}
async function prepareStone(page){const target=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(3)||null);expect(target).not.toBeNull();expect(target.id).toBe(3);return target;}
async function enterWorld(page,{name,seed}){await page.getByRole('button',{name:'单人游戏'}).click();await page.locator('#world-name').fill(name);await page.locator('#world-seed').fill(seed);await page.locator('#game-mode').selectOption('survival');await page.locator('#terrain-prompt').fill('平原');await page.getByRole('button',{name:'创建 / 进入'}).click();await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);}

test('singleplayer successful mining consumes persisted wooden-pickaxe durability and final use breaks it',async({page})=>{
  const world={name:'CI Singleplayer Durability',seed:'ci-singleplayer-durability-2026'};await page.goto('/?e2e=1');await enterWorld(page,world);await runCommand(page,'/tp 0 35 0');await runCommand(page,'/give wooden_pickaxe 1');await key(page,'KeyE');await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);const pickaxe=page.locator('#inventory-grid [data-inv-index]').filter({has:page.locator('img[alt="木镐"]')}).first();await expect(pickaxe).toBeVisible();await pickaxe.click({modifiers:['Shift']});await key(page,'Escape');
  await key(page,'Escape');await expect(page.locator('#pause-menu')).toHaveClass(/active/);await expect.poll(async()=>page.evaluate(name=>new Promise((resolve,reject)=>{const request=indexedDB.open('minecraft-web-by-ai',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('worlds','readonly'),all=tx.objectStore('worlds').getAll();all.onerror=()=>reject(all.error);all.onsuccess=()=>{const record=all.result.find(world=>world.name===name);db.close();resolve(record?.inventory?.slots?.some(item=>item?.id==='wooden_pickaxe')||false);};};}),world.name),{timeout:10_000}).toBe(true);await setSavedPickaxeDamage(page,world.name,57);
  await page.reload();await expect(page.locator('#main-menu')).toHaveClass(/active/);await enterWorld(page,world);const slot0=page.locator('#hotbar [data-hotbar-index="0"]');await expect(slot0).toHaveAttribute('data-durability-damage','57',{timeout:5_000});await expect(slot0).toHaveAttribute('data-durability-remaining','2');
  await lockPointer(page);await prepareStone(page);await page.mouse.down({button:'left'});await expect(slot0).toHaveAttribute('data-durability-damage','58',{timeout:5_000});await page.mouse.up({button:'left'});await expect(slot0).toHaveAttribute('data-durability-remaining','1');
  await prepareStone(page);await page.mouse.down({button:'left'});await expect(slot0).not.toHaveAttribute('data-durability-damage',/./,{timeout:5_000});await page.mouse.up({button:'left'});await expect(slot0.locator('.slot-durability')).toHaveCount(0);await expect(slot0.locator('img[alt="木镐"]')).toHaveCount(0);
});
