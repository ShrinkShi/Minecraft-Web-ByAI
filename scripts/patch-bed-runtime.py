from pathlib import Path


def patch(path,old,new,label):
    p=Path(path);text=p.read_text(encoding='utf-8');count=text.count(old)
    if count!=1:raise SystemExit(f'{label}: expected 1 match, got {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

patch('src/main.js',
"import {normalizeRespawnPoint,resolveRespawnPosition} from './respawn-rules.js';",
"import {normalizeRespawnPoint,resolveRespawnPosition} from './respawn-rules.js';\nimport {bedPlacement,bedPartner,bedRespawnAnchor,isBedBlock} from './bed-rules.js';",
'bed imports')
patch('src/main.js',
"function markSaveDirty(){saveDirty=true;}\nfunction renderPlayerStatus()",
"function markSaveDirty(){saveDirty=true;}\nfunction setRespawnPoint(value){const point=normalizeRespawnPoint(value);if(!point)return false;respawnPoint=point;markSaveDirty();return true;}\nfunction renderPlayerStatus()",
'respawn setter')
patch('src/main.js',
"function playerOccupies(x,y,z){if(!player)return false;const minX=player.position.x-player.radius,maxX=player.position.x+player.radius,minY=player.position.y,maxY=player.position.y+player.height,minZ=player.position.z-player.radius,maxZ=player.position.z+player.radius;return x+1>minX&&x<maxX&&y+1>minY&&y<maxY&&z+1>minZ&&z<maxZ;}\nfunction aim()",
"function playerOccupies(x,y,z){if(!player)return false;const minX=player.position.x-player.radius,maxX=player.position.x+player.radius,minY=player.position.y,maxY=player.position.y+player.height,minZ=player.position.z-player.radius,maxZ=player.position.z+player.radius;return x+1>minX&&x<maxX&&y+1>minY&&y<maxY&&z+1>minZ&&z<maxZ;}\nfunction placeBed(cell){\n  const plan=bedPlacement(cell,player?.lookDirection(new THREE.Vector3()));if(!plan)return null;\n  for(const part of [plan.foot,plan.head])if(world.getBlock(part.x,part.y,part.z)!==0||playerOccupies(part.x,part.y,part.z))return null;\n  if(!world.setBlock(plan.foot.x,plan.foot.y,plan.foot.z,plan.foot.id))return null;\n  if(!world.setBlock(plan.head.x,plan.head.y,plan.head.z,plan.head.id)){world.setBlock(plan.foot.x,plan.foot.y,plan.foot.z,0);return null;}\n  return plan;\n}\nfunction activateBed(hit){const anchor=bedRespawnAnchor(hit,hit?.id);if(!anchor||!setRespawnPoint(anchor))return false;ui.showToast('重生点已设置');return true;}\nfunction breakBed(broken){\n  const partner=bedPartner(broken,broken?.id);if(!world.setBlock(broken.x,broken.y,broken.z,0))return false;\n  if(partner&&world.getBlock(partner.x,partner.y,partner.z)===partner.id)world.setBlock(partner.x,partner.y,partner.z,0);return true;\n}\nfunction aim()",
'bed runtime helpers')
old_right="if(e.button===2){const hit=aim();if(hit?.id===9){openWorkbench();return;}if(player.mode==='spectator'||player.mode==='adventure'||!hit)return;const selected=ui.selectedItem(),def=ITEMS[selected?.id];if(!def?.blockId||def.blockId===8)return;const p=hit.previous;if(playerOccupies(p.x,p.y,p.z))return;if(world.setBlock(p.x,p.y,p.z,def.blockId)){if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();}}});"
new_right="if(e.button===2){const hit=aim();if(hit&&isBedBlock(hit.id)){if(player.mode!=='spectator')activateBed(hit);return;}if(hit?.id===9){openWorkbench();return;}if(player.mode==='spectator'||player.mode==='adventure'||!hit)return;const selected=ui.selectedItem(),def=ITEMS[selected?.id];if(def?.placeKind==='bed'){const plan=placeBed(hit.previous);if(!plan){ui.showToast('这里无法放置床');return;}if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();return;}if(!def?.blockId||def.blockId===8)return;const p=hit.previous;if(playerOccupies(p.x,p.y,p.z))return;if(world.setBlock(p.x,p.y,p.z,def.blockId)){if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();}}});"
patch('src/main.js',old_right,new_right,'right click bed interaction')
old_break="if(progress>=1){const broken={...selectedTarget};if(world.setBlock(broken.x,broken.y,broken.z,0)){if(player.mode!=='creative'&&canHarvest(broken.id)&&block?.drops)drops.spawn(block.drops,1,new THREE.Vector3(broken.x+.5,broken.y+.6,broken.z+.5));ui.showToast(`破坏 ${block.name}`);markSaveDirty();}breakStart=now+70;}"
new_break="if(progress>=1){const broken={...selectedTarget},removed=isBedBlock(broken.id)?breakBed(broken):world.setBlock(broken.x,broken.y,broken.z,0);if(removed){if(player.mode!=='creative'&&canHarvest(broken.id)&&block?.drops)drops.spawn(block.drops,1,new THREE.Vector3(broken.x+.5,broken.y+.6,broken.z+.5));ui.showToast(`破坏 ${block.name}`);markSaveDirty();}breakStart=now+70;}"
patch('src/main.js',old_break,new_break,'linked bed breaking')
patch('src/main.js',
"setSpawnpoint:(x,y,z)=>{const point=normalizeRespawnPoint({x,y,z});if(!point)return false;respawnPoint=point;markSaveDirty();return true;},addXp:",
"setSpawnpoint:(x,y,z)=>setRespawnPoint({x,y,z}),addXp:",
'command respawn setter reuse')

# Browser helpers for real pointer-lock aiming/right click.
patch('tests/e2e/smoke.spec.mjs',
"async function debugY(page){return (await debugXYZ(page)).y;}\n",
"async function debugY(page){return (await debugXYZ(page)).y;}\nasync function lockPointerAndLook(page,{movementX=0,movementY=0}={}){\n  const canvas=page.locator('#game-canvas');await canvas.click({position:{x:8,y:8}});\n  await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id||null),{timeout:5_000,message:'canvas should own pointer lock before mouse interaction'}).toBe('game-canvas');\n  await page.evaluate(({movementX,movementY})=>{const event=new MouseEvent('mousemove',{bubbles:true});Object.defineProperty(event,'movementX',{value:movementX});Object.defineProperty(event,'movementY',{value:movementY});document.dispatchEvent(event);},{movementX,movementY});\n}\nasync function rightClickCanvas(page){await page.locator('#game-canvas').dispatchEvent('mousedown',{button:2,bubbles:true});}\n",
'bed e2e mouse helpers')

p=Path('tests/e2e/smoke.spec.mjs');text=p.read_text(encoding='utf-8')
if "bed placement sets the persistent respawn anchor" in text:raise SystemExit('bed e2e already present')
append="""

test('bed placement sets the persistent respawn anchor',async({page})=>{
  const pageErrors=[],consoleErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto('/');await page.getByRole('button',{name:'单人游戏'}).click();await page.locator('#world-name').fill('CI Bed Anchor');await page.locator('#world-seed').fill('ci-bed-anchor-2026');await page.locator('#game-mode').selectOption('survival');await page.locator('#terrain-prompt').fill('平原');await page.getByRole('button',{name:'创建 / 进入'}).click();
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:60_000});await expect(page.locator('#hud')).not.toHaveClass(/hidden/);
  await runCommand(page,'/tp 24 35 24');
  await expect.poll(async()=>{const a=await debugXYZ(page);await page.waitForTimeout(250);const b=await debugXYZ(page);return Math.abs(a.y-b.y)<.03&&b.y>0;},{timeout:10_000,message:'player should settle before placing a bed'}).toBe(true);
  await runCommand(page,'/give bed 1');await lockPointerAndLook(page,{movementY:450});await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('放置 床',{timeout:5_000});
  await page.waitForTimeout(250);await rightClickCanvas(page);await expect(page.locator('#toast')).toContainText('重生点已设置',{timeout:5_000});
  const saveStarted=await page.evaluate(()=>Date.now());await key(page,'Escape');await expect(page.locator('#pause-menu')).toHaveClass(/active/);
  await expect.poll(async()=>{const record=(await savedWorlds(page)).find(world=>world.name==='CI Bed Anchor');if(!record||Number(record.updatedAt)<saveStarted||!record.respawnPoint)return null;const ids=Object.values(record.edits||{}).flat().map(entry=>Number(entry?.[1])).filter(id=>id>=11&&id<=18).sort((a,b)=>a-b);return{version:record.version,bedIds:ids,hasRespawn:true};},{timeout:10_000,message:'two bed halves and the bed respawn anchor should persist together'}).toEqual({version:6,bedIds:[11,12],hasRespawn:true});
  const bedRecord=(await savedWorlds(page)).find(world=>world.name==='CI Bed Anchor'),anchor=bedRecord.respawnPoint;expect(anchor).toBeTruthy();
  await page.getByRole('button',{name:'返回游戏'}).click();await runCommand(page,'/tp -24 35 -24');await runCommand(page,'/kill');await expect(page.locator('#death-menu')).toHaveClass(/active/,{timeout:10_000});await page.getByRole('button',{name:'重生'}).click();
  await expect.poll(async()=>{const pos=await debugXYZ(page);return Math.abs(pos.x-anchor.x)<.15&&Math.abs(pos.y-anchor.y)<.15&&Math.abs(pos.z-anchor.z)<.15;},{timeout:5_000,message:'explicit respawn should return to the bed anchor'}).toBe(true);
  expect(pageErrors).toEqual([]);expect(consoleErrors).toEqual([]);
});
"""
p.write_text(text.rstrip()+append,encoding='utf-8')
print('bed runtime and E2E patch: PASS')
