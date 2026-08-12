from pathlib import Path


def replace_once(path,old,new,label):
    p=Path(path);text=p.read_text(encoding='utf-8');count=text.count(old)
    if count!=1: raise SystemExit(f'{path} / {label}: expected 1 match, got {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# commands.js: add self-only positive XP points command.
replace_once('src/commands.js',
"  if(name==='kill'){",
"  if(name==='xp'||name==='experience'){\n    const action=(parts.shift()||'').toLowerCase();\n    const amount=Number(parts.shift());\n    const unit=(parts.shift()||'points').toLowerCase();\n    if(action!=='add'||parts.length||!Number.isInteger(amount)||amount<=0||amount>100000||!['point','points'].includes(unit))return fail('用法：/xp add <1..100000> [points]');\n    if(typeof ctx.addXp!=='function')return fail('当前环境不支持 /xp');\n    ctx.addXp(amount);return ok(`增加 ${amount} 点经验`);\n  }\n  if(name==='kill'){",
'xp command')
replace_once('src/commands.js',
"  if(name==='help')return ok('可用：/gamemode /give /tp /kill /time set /weather /help');",
"  if(name==='help')return ok('可用：/gamemode /give /tp /kill /xp /time set /weather /help');",
'help xp')

# main.js: expose existing addExperience through command context.
needle="setMode:mode=>{player.setMode(mode);worldInfo.mode=mode;if(!usesOxygen(mode))resetOxygen();markSaveDirty();},kill:()=>{if(deathState)return;player.hp=0;player.velocity.set(0,0,0);beginPlayerDeath('你被杀死了');},teleport:"
replacement="setMode:mode=>{player.setMode(mode);worldInfo.mode=mode;if(!usesOxygen(mode))resetOxygen();markSaveDirty();},addXp:value=>addExperience(value),kill:()=>{if(deathState)return;player.hp=0;player.velocity.set(0,0,0);beginPlayerDeath('你被杀死了');},teleport:"
replace_once('src/main.js',needle,replacement,'main xp context')

# Existing command regression.
p=Path('scripts/check.mjs');text=p.read_text(encoding='utf-8')
old="let mode='survival',time=0,weather='clear',killed=false;const p={position:{x:1,y:2,z:3}},inventory=new Inventory('survival');"
new="let mode='survival',time=0,weather='clear',killed=false,addedXp=0;const p={position:{x:1,y:2,z:3}},inventory=new Inventory('survival');"
if text.count(old)!=1: raise SystemExit('check.mjs locals mismatch')
text=text.replace(old,new,1)
old="const ctx={player:p,inventory,inventoryChanged(){},setMode:v=>mode=v,kill:()=>killed=true,teleport:(x,y,z)=>p.position={x,y,z},setTime:v=>time=v,setWeather:v=>weather=v};"
new="const ctx={player:p,inventory,inventoryChanged(){},setMode:v=>mode=v,addXp:v=>addedXp+=v,kill:()=>killed=true,teleport:(x,y,z)=>p.position={x,y,z},setTime:v=>time=v,setWeather:v=>weather=v};"
if text.count(old)!=1: raise SystemExit('check.mjs context mismatch')
text=text.replace(old,new,1)
old="assert.equal(executeCommand('/kill',ctx).ok,true);assert.equal(killed,true);assert.equal(executeCommand('/kill extra',ctx).ok,false);executeCommand('/time set night',ctx);"
new="assert.equal(executeCommand('/xp add 16',ctx).ok,true);assert.equal(addedXp,16);assert.equal(executeCommand('/experience add 4 points',ctx).ok,true);assert.equal(addedXp,20);assert.equal(executeCommand('/xp add 0',ctx).ok,false);assert.equal(executeCommand('/xp add 3 levels',ctx).ok,false);assert.equal(executeCommand('/kill',ctx).ok,true);assert.equal(killed,true);assert.equal(executeCommand('/kill extra',ctx).ok,false);executeCommand('/time set night',ctx);"
if text.count(old)!=1: raise SystemExit('check.mjs assertions mismatch')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

# Upgrade recoverable browser test to include deterministic XP loss/orb recovery.
p=Path('tests/e2e/smoke.spec.mjs');text=p.read_text(encoding='utf-8')
replace_pairs=[
("  await runCommand(page,'/give oak_log 3');\n  await runCommand(page,'/kill');",
 "  await runCommand(page,'/give oak_log 3');\n  await runCommand(page,'/xp add 16');\n  await runCommand(page,'/kill');"),
("  await expect(page.locator('#death-detail')).toContainText('3 个物品');\n  await expect(page.locator('#death-detail')).toContainText('死亡点');",
 "  await expect(page.locator('#death-detail')).toContainText('3 个物品');\n  await expect(page.locator('#death-detail')).toContainText('14 点经验');\n  await expect(page.locator('#death-detail')).toContainText('死亡点');"),
("  await page.waitForTimeout(900);",
 "  await page.waitForTimeout(1400);"),
("    return{logs,hp:record.player?.hp,alive:Number(record.player?.position?.y)>-10};\n  },{timeout:10_000,message:'returning to the recoverable death point should pick the dropped logs back into inventory'}).toEqual({logs:3,hp:20,alive:true});",
 "    return{logs,totalXp:record.totalXp,hp:record.player?.hp,alive:Number(record.player?.position?.y)>-10};\n  },{timeout:10_000,message:'returning to the recoverable death point should pick the dropped logs and death XP back up'}).toEqual({logs:3,totalXp:14,hp:20,alive:true});")
]
for i,(old,new) in enumerate(replace_pairs,1):
    if text.count(old)!=1: raise SystemExit(f'e2e replacement {i} mismatch')
    text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')
print('recoverable XP closure patch: PASS')
