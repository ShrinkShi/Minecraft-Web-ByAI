import {test,expect} from '@playwright/test';
import {createSingleplayerWorld} from './helpers/world-flow.mjs';

async function key(page,code){await page.evaluate(code=>window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true})),code);}
async function runCommand(page,text){await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Slash',bubbles:true})));await expect(page.locator('#chat-input-wrap')).not.toHaveClass(/hidden/);await page.locator('#chat-input').fill(text);await page.locator('#chat-input').press('Enter');await expect(page.locator('#chat-input-wrap')).toHaveClass(/hidden/);}

test('Creative inventory uses vanilla-style category and survival inventory tabs with 3D block icons',async({page})=>{
  await page.goto('/?e2e=1');
  await createSingleplayerWorld(page,{name:'CI Creative Inventory',seed:'ci-creative-inventory-2026',mode:'creative',prompt:'平原'});
  await key(page,'KeyE');
  const inventory=page.locator('#inventory'),panel=inventory.locator('.inventory-panel'),catalog=page.locator('[data-creative-catalog]'),body=page.locator('.creative-catalog-body'),search=page.locator('.creative-catalog-search'),grid=page.locator('.creative-catalog-grid'),survivalTab=page.locator('button[data-creative-view="survival"]');
  await expect(inventory).not.toHaveClass(/hidden/);await expect(inventory).toHaveClass(/creative-mode/);await expect(inventory).toHaveAttribute('data-creative-view','catalog');await expect(catalog).toBeVisible();await expect(panel).toHaveCSS('width','390px');await expect(panel).toHaveCSS('height','272px');
  await expect(page.locator('[data-creative-category]')).toHaveCount(8);await expect(survivalTab).toHaveCount(1);await expect(page.locator('[data-creative-category="building"]')).toHaveClass(/active/);await expect(page.locator('.creative-catalog-section-title')).toHaveText('建筑方块');
  await expect(page.locator('#inventory .inventory-top')).toHaveClass(/hidden/);await expect(page.locator('#inventory-grid')).toHaveClass(/hidden/);await expect(page.locator('#inventory-hotbar')).toBeVisible();

  for(const [itemId,title] of [['block:44','花岗岩'],['block:53','樱花木板'],['white_wool','白色羊毛']]){
    const slot=grid.locator(`[data-creative-item="${itemId}"]`);await expect(slot).toBeVisible();await expect(slot).toHaveAttribute('title',title);const canvas=slot.locator('.block-item-canvas');await expect(canvas).toHaveCount(1);await expect(canvas).toHaveAttribute('data-render-state','ready');
  }

  await page.locator('[data-creative-category="all"]').click();await expect(page.locator('[data-creative-category="all"]')).toHaveClass(/active/);await expect(search).toBeVisible();await search.fill('wooden pickaxe');await expect(grid.locator('[data-creative-item]')).toHaveCount(1);await expect(grid.locator('[data-creative-item="wooden_pickaxe"]')).toHaveAttribute('title','木镐');await grid.locator('[data-creative-item="wooden_pickaxe"]').click();await expect(page.locator('#cursor-stack')).not.toHaveClass(/hidden/);await expect(page.locator('#cursor-stack .inv-slot')).toHaveAttribute('title','木镐');
  const firstHotbar=page.locator('#inventory-hotbar [data-inv-index="27"]');await expect(firstHotbar).toHaveAttribute('title','草方块');await firstHotbar.click();await expect(firstHotbar).toHaveAttribute('title','木镐');await expect(page.locator('#cursor-stack .inv-slot')).toHaveAttribute('title','草方块');

  await page.locator('[data-creative-category="combat"]').click();await expect(page.locator('[data-creative-category="combat"]')).toHaveClass(/active/);await expect(grid.locator('[data-creative-item="iron_sword"]')).toBeVisible();await expect(grid.locator('[data-creative-item="block:1"]')).toHaveCount(0);

  await survivalTab.click();await expect(inventory).toHaveAttribute('data-creative-view','survival');await expect(survivalTab).toHaveClass(/active/);await expect(body).toBeHidden();await expect(panel).toHaveCSS('height','350px');await expect(page.locator('#inventory .inventory-top')).toBeVisible();await expect(page.locator('#inventory .player-preview')).toBeVisible();await expect(page.locator('#equipment-slots')).toBeVisible();await expect(page.locator('#inventory-grid')).toBeVisible();await expect(page.locator('#inventory-hotbar')).toBeVisible();await expect(page.locator('#inventory .crafting-area')).toBeHidden();

  await page.locator('[data-creative-category="building"]').click();await expect(inventory).toHaveAttribute('data-creative-view','catalog');await expect(body).toBeVisible();await expect(page.locator('#inventory .inventory-top')).toHaveClass(/hidden/);await expect(page.locator('#inventory-grid')).toHaveClass(/hidden/);await expect(page.locator('.creative-catalog-section-title')).toHaveText('建筑方块');

  await key(page,'Escape');await expect(inventory).toHaveClass(/hidden/);await runCommand(page,'/gamemode survival');await key(page,'KeyE');await expect(inventory).not.toHaveClass(/hidden/);await expect(inventory).not.toHaveClass(/creative-mode/);await expect(catalog).toHaveClass(/hidden/);await expect(page.locator('#inventory .inventory-top')).not.toHaveClass(/hidden/);await expect(page.locator('#inventory-grid')).not.toHaveClass(/hidden/);await expect(page.locator('#inventory-hotbar [data-inv-index="27"]')).toHaveAttribute('title','木镐');
});
