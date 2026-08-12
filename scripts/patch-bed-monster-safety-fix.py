from pathlib import Path

def rep(path,old,new,label):
    p=Path(path);t=p.read_text(encoding='utf-8');n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

rep('src/main.js',
"import {bedPlacement,bedPartner,bedRespawnAnchor,isBedBlock} from './bed-rules.js';",
"import {bedPlacement,bedPartner,bedRespawnAnchor,bedSleepCheckPoint,isBedBlock} from './bed-rules.js';",
'main bed sleep point import')
rep('src/main.js',
"  const blocker=hostileMobs?.sleepBlockerNear(anchor);if(blocker){ui.showToast('重生点已设置 · 附近有怪物，无法睡觉');return true;}",
"  const sleepCheckPoint=bedSleepCheckPoint(hit,hit?.id),blocker=sleepCheckPoint?hostileMobs?.sleepBlockerNear(sleepCheckPoint):null;if(blocker){ui.showToast('重生点已设置 · 附近有怪物，无法睡觉');return true;}",
'main canonical bed sleep point')
rep('tests/e2e/smoke.spec.mjs',
"  await runCommand(page,'/time set night');await runCommand(page,'/summon zombie ~2 ~ ~');await expect(page.locator('#debug')).toContainText('Hostile 1',{timeout:5_000});",
"  await runCommand(page,'/time set night');await runCommand(page,'/summon zombie ~2 ~ ~');await expect(page.locator('#chat-log')).toContainText('已召唤 zombie',{timeout:5_000});",
'bed e2e summon proof')
rep('tests/e2e/smoke.spec.mjs',
"  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/tp -64 35 -64');await expect(page.locator('#debug')).toContainText('Hostile 0',{timeout:5_000});await runCommand(page,'/kill');",
"  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/time set day');await runCommand(page,'/tp -64 35 -64');await expect(page.locator('#debug')).toContainText('Hostile 0',{timeout:8_000});await runCommand(page,'/kill');",
'bed e2e deterministic despawn')
