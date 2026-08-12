from pathlib import Path
import re


def replace_once(path, old, new, label):
    p=Path(path); text=p.read_text(encoding='utf-8'); count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path} / {label}: expected 1 match, got {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# commands.js: add standard self /kill command and expose it in /help.
replace_once('src/commands.js',
"  if(name==='time'){",
"  if(name==='kill'){\n    if(parts.length)return fail('用法：/kill');\n    if(typeof ctx.kill!=='function')return fail('当前环境不支持 /kill');\n    ctx.kill();return ok('已杀死玩家');\n  }\n  if(name==='time'){",
'kill command')
replace_once('src/commands.js',
"  if(name==='help')return ok('可用：/gamemode /give /tp /time set /weather /help');",
"  if(name==='help')return ok('可用：/gamemode /give /tp /kill /time set /weather /help');",
'help kill')

# main.js: route /kill into the existing explicit death lifecycle, not a test hook.
needle="setMode:mode=>{player.setMode(mode);worldInfo.mode=mode;if(!usesOxygen(mode))resetOxygen();markSaveDirty();},teleport:"
replacement="setMode:mode=>{player.setMode(mode);worldInfo.mode=mode;if(!usesOxygen(mode))resetOxygen();markSaveDirty();},kill:()=>{if(deathState)return;player.hp=0;player.velocity.set(0,0,0);beginPlayerDeath('你被杀死了');},teleport:"
replace_once('src/main.js',needle,replacement,'main kill context')

# scripts/check.mjs: make the existing command suite assert /kill context routing.
p=Path('scripts/check.mjs'); text=p.read_text(encoding='utf-8')
old="let mode='survival',time=0,weather='clear';const p={position:{x:1,y:2,z:3}},inventory=new Inventory('survival');"
new="let mode='survival',time=0,weather='clear',killed=false;const p={position:{x:1,y:2,z:3}},inventory=new Inventory('survival');"
if text.count(old)!=1: raise SystemExit('check.mjs command locals mismatch')
text=text.replace(old,new,1)
old="const ctx={player:p,inventory,inventoryChanged(){},setMode:v=>mode=v,teleport:(x,y,z)=>p.position={x,y,z},setTime:v=>time=v,setWeather:v=>weather=v};"
new="const ctx={player:p,inventory,inventoryChanged(){},setMode:v=>mode=v,kill:()=>killed=true,teleport:(x,y,z)=>p.position={x,y,z},setTime:v=>time=v,setWeather:v=>weather=v};"
if text.count(old)!=1: raise SystemExit('check.mjs command context mismatch')
text=text.replace(old,new,1)
old="executeCommand('/time set night',ctx);assert.equal(time,13000);executeCommand('/weather rain',ctx);assert.equal(weather,'rain');"
new="assert.equal(executeCommand('/kill',ctx).ok,true);assert.equal(killed,true);assert.equal(executeCommand('/kill extra',ctx).ok,false);executeCommand('/time set night',ctx);assert.equal(time,13000);executeCommand('/weather rain',ctx);assert.equal(weather,'rain');"
if text.count(old)!=1: raise SystemExit('check.mjs command assertions mismatch')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

# Append a second deterministic browser test for recoverable item death/pickup.
p=Path('tests/e2e/smoke.spec.mjs'); text=p.read_text(encoding='utf-8')
marker="test('recoverable death drops and re-picks items after explicit respawn'"
if marker in text: raise SystemExit('recoverable death test already exists')
addition=r'''

test('recoverable death drops and re-picks items after explicit respawn',async({page})=>{
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('/');
  await page.getByRole('button',{name:'单人游戏'}).click();
  await page.locator('#world-name').fill('CI Recoverable Death');
  await page.locator('#world-seed').fill('ci-recoverable-death-2026');
  await page.locator('#game-mode').selectOption('survival');
  await page.locator('#terrain-prompt').fill('平原');
  await page.getByRole('button',{name:'创建 / 进入'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});
  await expect(page.locator('#hud')).not.toHaveClass(/hidden/);

  await runCommand(page,'/tp 0 35 0');
  await runCommand(page,'/give oak_log 3');
  await runCommand(page,'/kill');
  await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});
  await expect(page.locator('#death-reason')).toContainText('被杀死');
  await expect(page.locator('#death-detail')).toContainText('3 个物品');
  await expect(page.locator('#death-detail')).toContainText('死亡点');
  await page.waitForTimeout(350);
  await expect(page.locator('#death-menu')).toHaveClass(/active/);

  await page.getByRole('button',{name:'重生'}).click();
  await expect(page.locator('#death-menu')).not.toHaveClass(/active/);
  const pickupPhaseStartedAt=await page.evaluate(()=>Date.now());
  await runCommand(page,'/tp 0 35 0');
  await page.waitForTimeout(900);

  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{
    const record=(await savedWorlds(page)).find(world=>world.name==='CI Recoverable Death');
    if(!record||Number(record.updatedAt)<pickupPhaseStartedAt)return null;
    const logs=(record.inventory?.slots||[]).reduce((sum,stack)=>sum+(stack?.id==='block:6'?stack.count:0),0);
    return{logs,hp:record.player?.hp,alive:Number(record.player?.position?.y)>-10};
  },{timeout:10_000,message:'returning to the recoverable death point should pick the dropped logs back into inventory'}).toEqual({logs:3,hp:20,alive:true});

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
'''
p.write_text(text+addition,encoding='utf-8')
print('recoverable death closure patch: PASS')
