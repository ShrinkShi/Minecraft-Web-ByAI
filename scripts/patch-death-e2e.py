from pathlib import Path

path=Path('tests/e2e/smoke.spec.mjs')
text=path.read_text(encoding='utf-8')
old="""  const deathPhaseStartedAt=await page.evaluate(()=>Date.now());
  await runCommand(page,'/give oak_log 3');
  await runCommand(page,'/tp 0 -20 0');
  await expect(page.locator('#toast')).toContainText('虚空死亡',{timeout:10_000});

  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{
    const record=(await savedWorlds(page)).find(world=>world.name==='CI Browser Smoke');
    if(!record||Number(record.updatedAt)<deathPhaseStartedAt)return null;
    const occupied=record.inventory?.slots?.filter(Boolean).length??-1;
    const equipped=record.equipment?.slots?Object.values(record.equipment.slots).filter(Boolean).length:-1;
    return{occupied,equipped,totalXp:record.totalXp,respawned:Number(record.player?.position?.y)>-10,fresh:true};
  },{timeout:10_000,message:'a fresh post-death save should clear inventory, armor and XP at a valid respawn position'}).toEqual({occupied:0,equipped:0,totalXp:0,respawned:true,fresh:true});
"""
new="""  const deathPhaseStartedAt=await page.evaluate(()=>Date.now());
  await runCommand(page,'/give oak_log 3');
  await runCommand(page,'/tp 0 -20 0');
  await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});
  await expect(page.locator('#death-reason')).toContainText('虚空');
  await expect(page.locator('#death-detail')).toContainText('无法回收');

  await page.waitForTimeout(450);
  await expect(page.locator('#death-menu')).toHaveClass(/active/);
  await key(page,'Escape');
  await expect(page.locator('#death-menu')).toHaveClass(/active/);
  await expect(page.locator('#pause-menu')).not.toHaveClass(/active/);

  await page.getByRole('button',{name:'重生'}).click();
  await expect(page.locator('#death-menu')).not.toHaveClass(/active/);
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);

  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{
    const record=(await savedWorlds(page)).find(world=>world.name==='CI Browser Smoke');
    if(!record||Number(record.updatedAt)<deathPhaseStartedAt)return null;
    const occupied=record.inventory?.slots?.filter(Boolean).length??-1;
    const equipped=record.equipment?.slots?Object.values(record.equipment.slots).filter(Boolean).length:-1;
    return{occupied,equipped,totalXp:record.totalXp,hp:record.player?.hp,respawned:Number(record.player?.position?.y)>-10,fresh:true};
  },{timeout:10_000,message:'explicit respawn should persist cleared death losses and a living spawn state'}).toEqual({occupied:0,equipped:0,totalXp:0,hp:20,respawned:true,fresh:true});
"""
count=text.count(old)
if count!=1:
    raise SystemExit(f'death E2E block: expected 1 match, got {count}')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('death E2E patch: PASS')
