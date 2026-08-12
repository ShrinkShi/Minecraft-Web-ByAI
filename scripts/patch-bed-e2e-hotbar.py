from pathlib import Path
p=Path('tests/e2e/smoke.spec.mjs')
text=p.read_text(encoding='utf-8')
old="""  await runCommand(page,'/give bed 1');await lockPointerAndLook(page,{movementY:450});await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('放置 床',{timeout:5_000});
  await page.waitForTimeout(250);await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('重生点已设置',{timeout:5_000});"""
new="""  await runCommand(page,'/give bed 1');
  await key(page,'KeyE');await expect(page.locator('#inventory')).not.toHaveClass(/hidden/);
  await expect(page.locator('#inventory-grid [data-inv-index=\"0\"]')).toHaveAttribute('title','床');
  await page.locator('#inventory-grid [data-inv-index=\"0\"]').click();await page.locator('#inventory-hotbar [data-inv-index=\"27\"]').click();
  await key(page,'Escape');await expect(page.locator('#inventory')).toHaveClass(/hidden/);await expect(page.locator('#hotbar .hotbar-slot.selected')).toHaveAttribute('title','床');
  await lockPointerAndLook(page,{movementY:450});await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('放置 床',{timeout:5_000});
  await page.waitForTimeout(250);await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('重生点已设置',{timeout:5_000});"""
count=text.count(old)
if count!=1: raise SystemExit(f'bed hotbar flow: expected 1 match, got {count}')
p.write_text(text.replace(old,new,1),encoding='utf-8')
print('bed E2E hotbar flow patch: PASS')
