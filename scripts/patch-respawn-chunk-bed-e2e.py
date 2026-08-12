from pathlib import Path


def patch(path, old, new, label):
    p=Path(path); text=p.read_text(encoding='utf-8'); count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected 1 match, got {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# World: load the target candidate chunks before any respawn safety query.
patch('src/world.js',
"""  ensureAround(worldX,worldZ){
    const cx=floorDiv(worldX,CHUNK_SIZE),cz=floorDiv(worldZ,CHUNK_SIZE);
    if(cx===this.centerChunk.cx&&cz===this.centerChunk.cz)return;
    this.centerChunk={cx,cz};
    const desired=this.desiredKeys(cx,cz);
    this.wanted=new Set(desired.map(([x,z])=>key(x,z)));
    for(const [x,z] of desired)this.requestChunk(x,z);
    this.unloadFarChunks(cx,cz);
  }
""",
"""  ensureAround(worldX,worldZ){
    const cx=floorDiv(worldX,CHUNK_SIZE),cz=floorDiv(worldZ,CHUNK_SIZE);
    if(cx===this.centerChunk.cx&&cz===this.centerChunk.cz)return;
    this.centerChunk={cx,cz};
    const desired=this.desiredKeys(cx,cz);
    this.wanted=new Set(desired.map(([x,z])=>key(x,z)));
    for(const [x,z] of desired)this.requestChunk(x,z);
    this.unloadFarChunks(cx,cz);
  }

  async ensureReadyAround(worldX,worldZ,cellRadius=1,timeoutMs=5000){
    if(!Number.isFinite(worldX)||!Number.isFinite(worldZ))return false;
    this.ensureAround(worldX,worldZ);
    const radius=Math.max(0,Math.floor(Number(cellRadius)||0)),baseX=Math.floor(worldX),baseZ=Math.floor(worldZ),needed=new Set();
    for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
      const cx=floorDiv(baseX+dx,CHUNK_SIZE),cz=floorDiv(baseZ+dz,CHUNK_SIZE),chunkKey=key(cx,cz);needed.add(chunkKey);this.wanted.add(chunkKey);this.requestChunk(cx,cz);
    }
    const ready=()=>[...needed].every(chunkKey=>this.chunks.has(chunkKey));if(ready())return true;
    return await new Promise(resolve=>{const started=performance.now(),timer=setInterval(()=>{if(ready()){clearInterval(timer);resolve(true);return;}if(performance.now()-started>=timeoutMs){clearInterval(timer);resolve(false);}},20);});
  }
""",
'world respawn chunk readiness')

# Main: async respawn preparation + dead-save fallback center + observable aim target.
patch('src/main.js',
"function preferredRespawn(){return respawnPoint?resolveRespawnPosition(respawnPoint,isSafeRespawnPosition):null;}\nfunction respawnAtPreferredPoint(){const custom=preferredRespawn();if(custom&&player?.respawnAt(custom))return{custom:true,position:custom};player?.respawn(0,0);return{custom:false,position:player?{x:player.position.x,y:player.position.y,z:player.position.z}:null};}",
"function preferredRespawn(){return respawnPoint?resolveRespawnPosition(respawnPoint,isSafeRespawnPosition):null;}\nasync function respawnAtPreferredPoint(){\n  if(respawnPoint&&world){await world.ensureReadyAround(respawnPoint.x,respawnPoint.z,1);const custom=preferredRespawn();if(custom&&player?.respawnAt(custom))return{custom:true,position:custom};}\n  if(world)await world.ensureReadyAround(0,0,0);player?.respawn(0,0);return{custom:false,position:player?{x:player.position.x,y:player.position.y,z:player.position.z}:null};\n}",
'async preferred respawn')
patch('src/main.js',
"function completeRespawn(){\n  if(!player||!deathState)return;const result=respawnAtPreferredPoint();lastAttackAt=-Infinity;resetOxygen();deathState=null;deathScreen.hide();modeScreen(null);renderPlayerStatus();markSaveDirty();ui.showToast(result.custom?'已在自定义重生点重生':'已在世界出生点重生');pointer();\n}",
"async function completeRespawn(){\n  if(!player||!deathState||deathState.respawning)return;const activeDeath=deathState;activeDeath.respawning=true;ui.showToast('正在加载重生区域');const result=await respawnAtPreferredPoint();if(!player||deathState!==activeDeath)return;lastAttackAt=-Infinity;resetOxygen();deathState=null;deathScreen.hide();modeScreen(null);renderPlayerStatus();markSaveDirty();ui.showToast(result.custom?'已在自定义重生点重生':'已在世界出生点重生');pointer();\n}",
'async explicit respawn')
patch('src/main.js',
"const savedDead=Number.isFinite(saved?.player?.hp)&&saved.player.hp<=0,startPosition=savedDead&&respawnPoint?respawnPoint:saved?.player?.position,centerX=Number.isFinite(startPosition?.x)?startPosition.x:0,centerZ=Number.isFinite(startPosition?.z)?startPosition.z:0;",
"const savedDead=Number.isFinite(saved?.player?.hp)&&saved.player.hp<=0,startPosition=savedDead?(respawnPoint||{x:0,z:0}):saved?.player?.position,centerX=Number.isFinite(startPosition?.x)?startPosition.x:0,centerZ=Number.isFinite(startPosition?.z)?startPosition.z:0;",
'dead save initial center')
patch('src/main.js',
"if(savedDead)respawnAtPreferredPoint();resetOxygen();",
"if(savedDead)await respawnAtPreferredPoint();resetOxygen();",
'dead save awaits respawn')
patch('src/main.js',
"else if(action==='respawn')completeRespawn();",
"else if(action==='respawn')await completeRespawn();",
'action awaits respawn')
patch('src/main.js',
"const p=player.position,xp=experienceState(totalXp),armor=equipment?.armorPoints()||0,air=oxygenState.air,weatherFx=weatherSystem?.activeCount||0;ui.debug.textContent=`Minecraft Web By AI v0.4-dev",
"const p=player.position,xp=experienceState(totalXp),armor=equipment?.armorPoints()||0,air=oxygenState.air,weatherFx=weatherSystem?.activeCount||0,aimText=selectedTarget?`Aim ${selectedTarget.x}/${selectedTarget.y}/${selectedTarget.z} -> ${selectedTarget.previous.x}/${selectedTarget.previous.y}/${selectedTarget.previous.z}`:'Aim -';ui.debug.textContent=`Minecraft Web By AI v0.4-dev",
'debug aim state')
patch('src/main.js',
"WeatherFX ${weatherSystem?.type||weather}:${weatherFx}\nDrops ${drops?.drops.length||0}",
"WeatherFX ${weatherSystem?.type||weather}:${weatherFx}\n${aimText}\nDrops ${drops?.drops.length||0}",
'debug aim line')

# Respawn suite: lock the browser-runtime readiness contract in static CI too.
p=Path('scripts/check-respawn.mjs'); text=p.read_text(encoding='utf-8')
text=text.replace("import assert from 'node:assert/strict';\n", "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\n",1)
old="assert.throws(()=>resolveRespawnPosition({x:0,y:0,z:0},null),/isSafe/);\n\nconsole.log('custom respawn rules: PASS');"
new="""assert.throws(()=>resolveRespawnPosition({x:0,y:0,z:0},null),/isSafe/);

const worldSource=fs.readFileSync('src/world.js','utf8'),mainSource=fs.readFileSync('src/main.js','utf8');
assert.match(worldSource,/async ensureReadyAround\(worldX,worldZ,cellRadius=1,timeoutMs=5000\)/,'VoxelWorld must expose async respawn-area readiness');
assert.match(mainSource,/await world\.ensureReadyAround\(respawnPoint\.x,respawnPoint\.z,1\)/,'custom respawn must await its candidate chunks');
assert.match(mainSource,/if\(world\)await world\.ensureReadyAround\(0,0,0\)/,'world-spawn fallback must await the origin chunk');
assert.match(mainSource,/async function completeRespawn\(/,'explicit respawn must stay on the death screen while chunks load');
assert.match(mainSource,/action==='respawn'\)await completeRespawn\(\)/,'UI action must await explicit respawn');

console.log('custom respawn rules: PASS');"""
if text.count(old)!=1: raise SystemExit('respawn source contract: expected one insertion point')
p.write_text(text.replace(old,new,1),encoding='utf-8')

# Browser: deterministic explicit safe spawnpoint + far-away death to unload its chunk.
p=Path('tests/e2e/smoke.spec.mjs'); text=p.read_text(encoding='utf-8')
old="""  await runCommand(page,'/tp 7 35 7');
  await expect.poll(async()=>{const a=await debugXYZ(page);await page.waitForTimeout(250);const b=await debugXYZ(page);return Math.abs(a.y-b.y)<.03&&b.y>0;},{timeout:10_000,message:'player should settle on terrain before setting spawnpoint'}).toBe(true);
  const custom=await debugXYZ(page);await runCommand(page,'/spawnpoint');const saveStarted=await page.evaluate(()=>Date.now());await key(page,'Escape');await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Custom Respawn');if(!record||Number(record.updatedAt)<saveStarted||!record.respawnPoint)return null;return{version:record.version,x:Number(record.respawnPoint.x.toFixed(1)),y:Number(record.respawnPoint.y.toFixed(1)),z:Number(record.respawnPoint.z.toFixed(1))};},{timeout:10_000,message:'spawnpoint should persist in a fresh v6 world snapshot'}).toEqual({version:6,x:custom.x,y:custom.y,z:custom.z});
  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/tp -7 35 -7');await runCommand(page,'/kill');await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});await page.getByRole('button',{name:'重生'}).click();await expect(page.locator('#death-menu')).not.toHaveClass(/active/);
  await expect.poll(async()=>{const p=await debugXYZ(page);return Math.abs(p.x-custom.x)<.15&&Math.abs(p.y-custom.y)<.15&&Math.abs(p.z-custom.z)<.15;},{timeout:5_000,message:'explicit respawn should return to the persisted custom spawnpoint'}).toBe(true);"""
new="""  const custom={x:7.5,y:25.01,z:7.5};await runCommand(page,`/spawnpoint ${custom.x} ${custom.y} ${custom.z}`);const saveStarted=await page.evaluate(()=>Date.now());await key(page,'Escape');await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Custom Respawn');if(!record||Number(record.updatedAt)<saveStarted||!record.respawnPoint)return null;return{version:record.version,x:Number(record.respawnPoint.x.toFixed(2)),y:Number(record.respawnPoint.y.toFixed(2)),z:Number(record.respawnPoint.z.toFixed(2))};},{timeout:10_000,message:'spawnpoint should persist in a fresh v6 world snapshot'}).toEqual({version:6,...custom});
  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/tp -96 40 -96');await runCommand(page,'/kill');await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});await page.getByRole('button',{name:'重生'}).click();await expect(page.locator('#death-menu')).not.toHaveClass(/active/,{timeout:15_000});
  await expect.poll(async()=>{const p=await debugXYZ(page);return Math.abs(p.x-custom.x)<.15&&Math.abs(p.y-custom.y)<.15&&Math.abs(p.z-custom.z)<.15;},{timeout:5_000,message:'explicit respawn should reload the unloaded custom-spawn chunk and return to the persisted point'}).toBe(true);"""
if text.count(old)!=1: raise SystemExit('custom spawnpoint E2E: expected one old block')
text=text.replace(old,new,1)
old_bed="""  await runCommand(page,'/tp 24 35 24');
  await expect.poll(async()=>{const a=await debugXYZ(page);await page.waitForTimeout(250);const b=await debugXYZ(page);return Math.abs(a.y-b.y)<.03&&b.y>0;},{timeout:10_000,message:'player should settle before placing a bed'}).toBe(true);"""
new_bed="""  await runCommand(page,'/tp 20 26.01 20');"""
if text.count(old_bed)!=1: raise SystemExit('bed deterministic position: expected one old block')
text=text.replace(old_bed,new_bed,1)
old_aim="await lockPointerAndLook(page,{movementY:450});await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('放置 床',{timeout:5_000});"
new_aim="await lockPointerAndLook(page,{movementY:350});await expect(page.locator('#debug')).toContainText('Aim 20/25/18 -> 20/26/18',{timeout:5_000});await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('放置 床',{timeout:5_000});"
if text.count(old_aim)!=1: raise SystemExit('bed deterministic aim: expected one old expression')
text=text.replace(old_aim,new_aim,1)
p.write_text(text,encoding='utf-8')

print('respawn chunk + deterministic bed E2E patch: PASS')
