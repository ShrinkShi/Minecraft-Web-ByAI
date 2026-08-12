from pathlib import Path

def rep(path,old,new,label):
    p=Path(path);t=p.read_text(encoding='utf-8');n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

rep('src/hostile-mobs.js',
"import {resolveSpiderClimb} from './spider-rules.js';",
"import {resolveSpiderClimb} from './spider-rules.js';\nimport {SLEEP_MONSTER_HORIZONTAL,firstSleepBlocker} from './sleep-safety-rules.js';",
'hostile sleep import')
rep('src/hostile-mobs.js',
"  dispose(){for(const id of[...this.visuals.keys()])this.despawn(id);this.store.clear();for(const geometry of this.resources.geometries)geometry.dispose();for(const material of this.resources.materials)material.dispose();this.resources.geometries.clear();this.resources.materials.clear();this.templates.clear();}\n  get size(){return this.store.size;}",
"  sleepBlockerNear(position){\n    if(!position||![position.x,position.y,position.z].every(Number.isFinite))return null;\n    const radius=Math.SQRT2*SLEEP_MONSTER_HORIZONTAL,candidates=this.store.nearby(position.x,position.z,radius),monsters=[];\n    for(const record of candidates){const at=this.store.getPosition(record.id);if(at)monsters.push({id:record.id,type:record.type,position:at,entity:record});}\n    return firstSleepBlocker(position,monsters);\n  }\n\n  dispose(){for(const id of[...this.visuals.keys()])this.despawn(id);this.store.clear();for(const geometry of this.resources.geometries)geometry.dispose();for(const material of this.resources.materials)material.dispose();this.resources.geometries.clear();this.resources.materials.clear();this.templates.clear();}\n  get size(){return this.store.size;}",
'hostile sleep query')

rep('src/commands.js',
"  if(name==='time'){",
"  if(name==='summon'){\n    const type=(parts.shift()||'').toLowerCase().replace(/^minecraft:/,'');if(!type)return fail('用法：/summon <实体> [x y z]');\n    if(parts.length!==0&&parts.length!==3)return fail('用法：/summon <实体> [x y z]');const p=ctx.player?.position;if(!p)return fail('当前环境没有玩家位置');\n    const x=parts.length?num(parts[0],p.x):p.x,y=parts.length?num(parts[1],p.y):p.y,z=parts.length?num(parts[2],p.z):p.z;if(![x,y,z].every(Number.isFinite))return fail('召唤坐标无效');\n    if(typeof ctx.summon!=='function')return fail('当前环境不支持 /summon');const spawned=ctx.summon(type,x,y,z);if(!spawned)return fail(`未知或无法召唤实体：${type}`);return ok(`已召唤 ${type}`);\n  }\n  if(name==='time'){",
'commands summon')
rep('src/commands.js',
"  if(name==='help')return ok('可用：/gamemode /give /tp /spawnpoint /kill /xp /time set /weather /help');",
"  if(name==='help')return ok('可用：/gamemode /give /tp /spawnpoint /summon /kill /xp /time set /weather /help');",
'commands help')

rep('src/main.js',
"  if(!sleep.ready){ui.showToast(`重生点已设置 · 已有 ${sleep.sleepingPlayers}/${sleep.required} 名玩家睡觉`);return true;}\n  gameTime=sleep.nextTime;",
"  if(!sleep.ready){ui.showToast(`重生点已设置 · 已有 ${sleep.sleepingPlayers}/${sleep.required} 名玩家睡觉`);return true;}\n  const blocker=hostileMobs?.sleepBlockerNear(anchor);if(blocker){ui.showToast('重生点已设置 · 附近有怪物，无法睡觉');return true;}\n  gameTime=sleep.nextTime;",
'main monster sleep guard')
rep('src/main.js',
"setSpawnpoint:(x,y,z)=>setRespawnPoint({x,y,z}),addXp:value=>addExperience(value),kill:()=>",
"setSpawnpoint:(x,y,z)=>setRespawnPoint({x,y,z}),summon:(type,x,y,z)=>!!hostileMobs?.spawn(type,{x,y,z}),addXp:value=>addExperience(value),kill:()=>",
'main summon context')

rep('tests/e2e/smoke.spec.mjs',
"  await expect.poll(async()=>{const text=await page.locator('#debug').innerText(),match=text.match(/Time\\s+(\\d+)/),time=Number(match?.[1]);return Number.isFinite(time)&&time>=1000&&time<1200;},{timeout:5_000,message:'using the same bed at night should advance the shared world clock to morning'}).toBe(true);\n  await key(page,'Escape');",
"  await expect.poll(async()=>{const text=await page.locator('#debug').innerText(),match=text.match(/Time\\s+(\\d+)/),time=Number(match?.[1]);return Number.isFinite(time)&&time>=1000&&time<1200;},{timeout:5_000,message:'using the same bed at night should advance the shared world clock to morning'}).toBe(true);\n  await runCommand(page,'/time set night');await runCommand(page,'/summon zombie ~2 ~ ~');await expect(page.locator('#debug')).toContainText('Hostile 1',{timeout:5_000});\n  await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('附近有怪物，无法睡觉',{timeout:5_000});\n  await expect.poll(async()=>{const text=await page.locator('#debug').innerText(),match=text.match(/Time\\s+(\\d+)/);return Number(match?.[1])>=12990;},{timeout:2_000,message:'nearby hostile monster must prevent the bed from skipping to morning'}).toBe(true);\n  await key(page,'Escape');",
'bed e2e monster blocker')
rep('tests/e2e/smoke.spec.mjs',
"  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/tp -24 35 -24');await runCommand(page,'/kill');",
"  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/tp -64 35 -64');await expect(page.locator('#debug')).toContainText('Hostile 0',{timeout:5_000});await runCommand(page,'/kill');",
'bed e2e despawn blocker')
