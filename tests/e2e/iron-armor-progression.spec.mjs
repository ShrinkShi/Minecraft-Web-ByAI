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
async function lockPointer(page){const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000}).toBe('game-canvas');}
async function useTarget(page){await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});}
async function openPreparedWorkbench(page){await lockPointer(page);const table=await page.evaluate(()=>globalThis.__minecraftE2E?.prepareSingleplayerMiningTarget?.(9)||null);expect(table).not.toBeNull();await useTarget(page);const workbench=page.locator('#workbench');await expect(workbench).not.toHaveClass(/hidden/);await expect.poll(()=>page.evaluate(()=>document.pointerLockElement===null),{timeout:5_000}).toBe(true);return workbench;}
async function placeFromInventory(workbench,title,indices){const item=workbench.locator(`[data-inv-index][title="${title}"]`).first();await expect(item).toBeVisible();await item.click();for(const index of indices)await workbench.locator(`[data-craft-size="3"][data-craft-index="${index}"]`).click({button:'right'});}

test('eight iron ingots craft and equip a source-backed iron chestplate',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Iron Armor Progression',seed:'ci-iron-armor-2026',mode:'survival',prompt:'平原'});
  await runCommand(page,'/give minecraft:iron_ingot 8');
  const workbench=await openPreparedWorkbench(page);
  await placeFromInventory(workbench,'铁锭',[0,2,3,4,5,6,7,8]);
  const result=page.locator('#craft-result-3 [data-craft-result="3"]');await expect(result).toHaveAttribute('title','铁胸甲');const resultImage=result.locator('img[alt="铁胸甲"]');await expect(resultImage).toBeVisible();expect(await resultImage.evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight,src:img.getAttribute('src')}))).toEqual(expect.objectContaining({width:16,height:16,src:expect.stringMatching(/MC原版素材assets\/minecraft\/textures\/item\/iron_chestplate\.png$/)}));
  await result.click();await expect(page.locator('#cursor-stack img[alt="铁胸甲"]')).toBeVisible();await workbench.locator('[data-inv-index="0"]').click();await expect(page.locator('#cursor-stack')).toHaveClass(/hidden/);await key(page,'KeyE');await expect(workbench).toHaveClass(/hidden/);
  await key(page,'KeyE');const inventory=page.locator('#inventory');await expect(inventory).not.toHaveClass(/hidden/);await inventory.locator('#inventory-grid [data-inv-index="0"]').click();const chest=inventory.locator('#equipment-slots [data-equipment-slot="chest"]');await chest.click();await expect(chest).toHaveAttribute('title','铁胸甲');await expect(chest.locator('img[alt="铁胸甲"]')).toBeVisible();await expect(page.locator('#armor-row .armor-icon.full')).toHaveCount(3);
  const browserContract=await page.evaluate(async()=>{const [{ITEMS},{Equipment},{mitigateArmorDamage}]=await Promise.all([import('/src/items.js'),import('/src/equipment.js'),import('/src/armor-rules.js')]);const equipment=new Equipment({slots:{head:{id:'iron_helmet',count:1,damage:4},chest:{id:'iron_chestplate',count:1},legs:{id:'iron_leggings',count:1},feet:{id:'iron_boots',count:1}}});const before=equipment.snapshot(),wear=equipment.damageArmor(8),after=equipment.snapshot();return{durabilities:[ITEMS.iron_helmet.durability,ITEMS.iron_chestplate.durability,ITEMS.iron_leggings.durability,ITEMS.iron_boots.durability],points:equipment.armorPoints(),beforeHead:before.slots.head,wear:wear.wear,afterHead:after.slots.head,damage10:mitigateArmorDamage(10,15)};});
  expect(browserContract).toEqual({durabilities:[165,240,225,195],points:15,beforeHead:{id:'iron_helmet',count:1,damage:4},wear:2,afterHead:{id:'iron_helmet',count:1,damage:6},damage10:7});
  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
