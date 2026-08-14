import {test,expect} from '@playwright/test';

test('Jade-style HUD shows inspected block metadata from the live runtime',async({page})=>{
  await page.goto('/?e2e=1');await page.getByRole('button',{name:'单人游戏'}).click();await page.locator('#world-name').fill('CI Jade HUD');await page.locator('#world-seed').fill('ci-jade-hud-2026');await page.locator('#game-mode').selectOption('creative');await page.locator('#terrain-prompt').fill('平原');await page.getByRole('button',{name:'创建 / 进入'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
  await page.evaluate(()=>globalThis.__minecraftE2E?.setLook(0,-1.45));
  const jade=page.locator('#jade-hud');await expect(jade).not.toHaveClass(/hidden/,{timeout:5_000});await expect(jade).toHaveAttribute('data-kind','block');await expect(jade.locator('.jade-name')).not.toHaveText('');await expect(jade.locator('.jade-source')).toContainText('Minecraft Web By AI');await expect(jade.locator('.jade-details')).toContainText('工具：');await expect(jade.locator('.jade-details')).toContainText('掉落：');
});

test('Jade block renderer exposes the minimum harvest tier text',async({page})=>{
  await page.goto('/?e2e=1');
  await page.evaluate(async()=>{
    const root=document.createElement('div');root.id='jade-tier-contract';root.innerHTML='<div class="jade-icon"></div><div class="jade-name"></div><div class="jade-source"></div><div class="jade-details"></div><div><div class="jade-health-fill"></div><span class="jade-health-text"></span></div>';document.body.append(root);
    const {JadeHud}=await import('/src/jade-hud.js');const hud=new JadeHud(root);hud.render({kind:'block',name:'石头',source:'Minecraft Web By AI',tile:3,hardness:1.5,requiredToolName:'镐',requiredToolTierName:'木质',toolCorrect:true,liquid:false,hasDrop:true,canDrop:true,dropName:'圆石'});
  });
  const contract=page.locator('#jade-tier-contract');await expect(contract.locator('.jade-details')).toContainText('工具：镐 · 最低木质 ✓');await expect(contract.locator('.jade-details')).toContainText('挖掘掉落：是 · 圆石');
});
