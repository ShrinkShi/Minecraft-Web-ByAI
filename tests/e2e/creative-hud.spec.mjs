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

async function equipLeatherChestplate(page){
  await runCommand(page,'/give minecraft:leather_chestplate 1');
  await key(page,'KeyE');
  await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);
  await page.locator('#inventory-grid [data-inv-index="0"]').click();
  await page.locator('#equipment-slots [data-equipment-slot="chest"]').click();
  await expect(page.locator('#equipment-slots [data-equipment-slot="chest"]')).toHaveAttribute('title','皮革外套');
  await key(page,'Escape');
  await expect(page.locator('#inventory')).toHaveClass(/hidden/);
}

test('Creative hides survival HUD without falsifying player state and Survival restores it',async({page})=>{
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Creative HUD',seed:'ci-creative-hud-2026',mode:'survival',prompt:'平原'});

  const statusRow=page.locator('.status-row'),armor=page.locator('#armor-row'),xp=page.locator('.xp-wrap'),oxygen=page.locator('#oxygen'),hotbar=page.locator('#hotbar');
  await expect(statusRow).not.toHaveClass(/hidden/);await expect(armor).toHaveClass(/hidden/);await expect(xp).not.toHaveClass(/hidden/);await expect(hotbar).toBeVisible();
  await expect(oxygen).toHaveClass(/hidden/);

  await equipLeatherChestplate(page);
  await expect(armor).not.toHaveClass(/hidden/);await expect(page.locator('#armor-row .armor-icon.full')).toHaveCount(1);await expect(page.locator('#armor-row .armor-icon.half')).toHaveCount(1);

  expect(await page.evaluate(()=>globalThis.__minecraftE2E?.setPlayerVitals({hp:7,food:5,saturation:0,exhaustion:0,timer:0}))).toBe(true);
  expect(await page.evaluate(()=>globalThis.__minecraftE2E?.playerVitals())).toMatchObject({hp:7,food:5,saturation:0});
  expect(await page.locator('#hearts .heart:not(.empty)').count()).toBe(4);expect(await page.locator('#hunger .food:not(.empty)').count()).toBe(3);

  await runCommand(page,'/gamemode creative');
  await expect(statusRow).toHaveClass(/hidden/);await expect(armor).toHaveClass(/hidden/);await expect(xp).toHaveClass(/hidden/);await expect(oxygen).toHaveClass(/hidden/);await expect(hotbar).toBeVisible();
  expect(await page.evaluate(()=>{const node=document.querySelector('#oxygen');if(!node)return false;node.classList.remove('hidden');return !node.classList.contains('hidden');})).toBe(true);
  await page.waitForTimeout(350);
  await expect(armor).toHaveClass(/hidden/);await expect(oxygen).toHaveClass(/hidden/);
  expect(await page.evaluate(()=>globalThis.__minecraftE2E?.playerVitals())).toMatchObject({hp:7,food:5,saturation:0});

  await runCommand(page,'/gamemode survival');
  await expect(statusRow).not.toHaveClass(/hidden/);await expect(armor).not.toHaveClass(/hidden/);await expect(xp).not.toHaveClass(/hidden/);await expect(hotbar).toBeVisible();
  await expect(oxygen).toHaveClass(/hidden/);
  expect(await page.locator('#hearts .heart:not(.empty)').count()).toBe(4);expect(await page.locator('#hunger .food:not(.empty)').count()).toBe(3);
  await expect(page.locator('#armor-row .armor-icon.full')).toHaveCount(1);await expect(page.locator('#armor-row .armor-icon.half')).toHaveCount(1);
});
