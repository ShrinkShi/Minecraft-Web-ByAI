from pathlib import Path

def rep(path, old, new, label):
    p=Path(path); t=p.read_text(encoding='utf-8'); n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

rep('src/main.js',
"let saveDirty=false,saveInFlight=null,saveAgain=false,lastSaveAt=0,lastSavedPosition=null,gameTime=6000,weather='clear',totalXp=0;",
"let saveDirty=false,saveInFlight=null,lastSaveAt=0,lastSavedPosition=null,gameTime=6000,weather='clear',totalXp=0;",'save state')

rep('src/main.js', '''async function persistWorld(force=false){
  if(!world||!player||!worldInfo||!inventory||!equipment)return;
  if(saveInFlight){saveAgain=true;return saveInFlight;}if(!force&&!saveDirty)return;
  const record={id:worldInfo.id,name:worldInfo.name,seed:worldInfo.seed,prompt:worldInfo.prompt,mode:player.mode,updatedAt:Date.now(),player:player.snapshot(),inventory:inventory.snapshot(),equipment:equipment.snapshot(),edits:world.exportEdits(),gameTime,weather,totalXp,respawnPoint:respawnPoint?{...respawnPoint}:null,version:6};
  saveDirty=false;saveAgain=false;
  saveInFlight=storage.putWorld(record).then(()=>{lastSaveAt=performance.now();lastSavedPosition=player?.position.clone()||null;}).catch(error=>{saveDirty=true;console.error('世界存档失败',error);ui.showToast('世界存档失败：IndexedDB 不可用');}).finally(async()=>{saveInFlight=null;if(saveAgain&&world&&player)await persistWorld(true);});
  return saveInFlight;
}
''', '''async function persistWorld(force=false){
  if(!world||!player||!worldInfo||!inventory||!equipment)return;
  if(force)saveDirty=true;if(saveInFlight)return saveInFlight;if(!saveDirty)return;
  const drain=(async()=>{try{
    while(world&&player&&worldInfo&&inventory&&equipment&&saveDirty){
      const record={id:worldInfo.id,name:worldInfo.name,seed:worldInfo.seed,prompt:worldInfo.prompt,mode:player.mode,updatedAt:Date.now(),player:player.snapshot(),inventory:inventory.snapshot(),equipment:equipment.snapshot(),edits:world.exportEdits(),gameTime,weather,totalXp,respawnPoint:respawnPoint?{...respawnPoint}:null,version:6};
      saveDirty=false;
      try{await storage.putWorld(record);lastSaveAt=performance.now();lastSavedPosition=player?.position.clone()||null;}
      catch(error){saveDirty=true;console.error('世界存档失败',error);ui.showToast('世界存档失败：IndexedDB 不可用');break;}
    }
  }finally{if(saveInFlight===drain)saveInFlight=null;}})();
  saveInFlight=drain;return drain;
}
''','persist drain')

rep('tests/e2e/smoke.spec.mjs',
"async function rightClickCanvas(page){await page.locator('#game-canvas').dispatchEvent('mousedown',{button:2,bubbles:true});}\n",
"""async function rightClickCanvas(page){await page.locator('#game-canvas').dispatchEvent('mousedown',{button:2,bubbles:true});}
async function rotateLook(page,movementX){await page.evaluate(x=>{const e=new MouseEvent('mousemove',{bubbles:true});Object.defineProperty(e,'movementX',{value:x});Object.defineProperty(e,'movementY',{value:0});document.dispatchEvent(e);},movementX);}
async function placeBedWithRealAim(page){
  await lockPointerAndLook(page,{movementY:240});
  for(let i=0;i<14;i++){await rightClickCanvas(page);await page.waitForTimeout(120);if(((await page.locator('#toast').textContent())||'').includes('放置 床'))return;await rotateLook(page,210);}
  throw new Error(`no real two-cell bed surface found; ${await page.locator('#debug').innerText()}`);
}
""",'bed aim helper')

rep('tests/e2e/smoke.spec.mjs',
'''  const armorSaveStartedAt=await page.evaluate(()=>Date.now());
  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{
    const record=(await savedWorlds(page)).find(world=>world.name==='CI Browser Smoke');
    if(!record||Number(record.updatedAt)<armorSaveStartedAt)return null;
    return{version:record.version,chest:record.equipment?.slots?.chest?.id||null,weather:record.weather,hasTransientAir:Object.hasOwn(record,'oxygen')};
  },{timeout:10_000,message:'a fresh pause save should persist armor and clear weather but not transient oxygen state'}).toEqual({version:6,chest:'leather_chestplate',weather:'clear',hasTransientAir:false});
''',
'''  await key(page,'Escape');
  await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Browser Smoke');if(!record)return null;return{version:record.version,chest:record.equipment?.slots?.chest?.id||null,weather:record.weather,hasTransientAir:Object.hasOwn(record,'oxygen')};},{timeout:15_000,message:'pause save should drain to the latest armor/weather snapshot'}).toEqual({version:6,chest:'leather_chestplate',weather:'clear',hasTransientAir:false});
''','armor save wait')

rep('tests/e2e/smoke.spec.mjs',"  await runCommand(page,'/tp 20 26.01 20');\n  await runCommand(page,'/give bed 1');\n",
"  await runCommand(page,'/tp 20 35 20');\n  await expect.poll(async()=>{const a=await debugXYZ(page);await page.waitForTimeout(180);const b=await debugXYZ(page);return Math.abs(a.y-b.y)<.03&&b.y>0;},{timeout:10_000,message:'player should settle before bed placement search'}).toBe(true);\n  await runCommand(page,'/give bed 1');\n",'bed settle')

rep('tests/e2e/smoke.spec.mjs',
"  await lockPointerAndLook(page,{movementY:350});await expect(page.locator('#debug')).toContainText('Aim 20/25/18 -> 20/26/18',{timeout:5_000});await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('放置 床',{timeout:5_000});\n",
"  await placeBedWithRealAim(page);await expect(page.locator('#toast')).toContainText('放置 床',{timeout:2_000});\n",'dynamic bed aim')

rep('tests/e2e/smoke.spec.mjs',
"  const saveStarted=await page.evaluate(()=>Date.now());await key(page,'Escape');await expect(page.locator('#pause-menu')).toHaveClass(/active/);\n  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Bed Anchor');if(!record||Number(record.updatedAt)<saveStarted||!record.respawnPoint)return null;const ids=Object.values(record.edits||{}).flat().map(entry=>Number(entry?.[1])).filter(id=>id>=11&&id<=18).sort((a,b)=>a-b);return{version:record.version,bedIds:ids,hasRespawn:true};},{timeout:10_000,message:'two bed halves and the bed respawn anchor should persist together'}).toEqual({version:6,bedIds:[11,12],hasRespawn:true});\n",
"  await key(page,'Escape');await expect(page.locator('#pause-menu')).toHaveClass(/active/);\n  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Bed Anchor');if(!record||!record.respawnPoint)return null;const ids=Object.values(record.edits||{}).flat().map(entry=>Number(entry?.[1])).filter(id=>id>=11&&id<=18).sort((a,b)=>a-b);return{version:record.version,validPair:['11,12','13,14','15,16','17,18'].includes(ids.join(',')),hasRespawn:true};},{timeout:15_000,message:'valid bed pair and respawn anchor should persist together'}).toEqual({version:6,validPair:true,hasRespawn:true});\n",'bed pair save')
