from pathlib import Path
p=Path('tests/e2e/smoke.spec.mjs')
text=p.read_text(encoding='utf-8')
old="""  await runCommand(page,'/tp 0 35 0');
  await page.waitForTimeout(1400);

  await key(page,'Escape');"""
new="""  await runCommand(page,'/tp 0 35 0');
  await expect(page.locator('#debug')).toContainText('Drops 0 · XPOrbs 0 · XP 14 / Lv.2',{timeout:10_000});

  await key(page,'Escape');"""
count=text.count(old)
if count!=1: raise SystemExit(f'recoverable pickup wait: expected 1 match, got {count}')
p.write_text(text.replace(old,new,1),encoding='utf-8')
print('recoverable pickup wait patch: PASS')
