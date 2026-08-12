from pathlib import Path

def rep(path, old, new, label):
    p=Path(path); t=p.read_text(encoding='utf-8'); n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

rep('src/player.js',
"  lookDirection(target=new THREE.Vector3()){const cp=Math.cos(this.pitch);return target.set(Math.sin(this.yaw)*cp,Math.sin(this.pitch),-Math.cos(this.yaw)*cp).normalize();}\n",
"  lookDirection(target=new THREE.Vector3()){const cp=Math.cos(this.pitch);return target.set(Math.sin(this.yaw)*cp,Math.sin(this.pitch),-Math.cos(this.yaw)*cp).normalize();}\n  setLook(yaw,pitch){if(Number.isFinite(yaw))this.yaw=yaw;if(Number.isFinite(pitch))this.pitch=Math.max(-1.553,Math.min(1.553,pitch));this.syncCamera();}\n",'player setLook')

rep('src/main.js',
"const ui=new UI(),storage=new WorldStorage(),deathScreen=new DeathScreen();\n",
"const ui=new UI(),storage=new WorldStorage(),deathScreen=new DeathScreen();\nconst e2eEnabled=new URLSearchParams(location.search).get('e2e')==='1';\n",'e2e flag')

rep('src/main.js',
"function markSaveDirty(){saveDirty=true;}\n",
"function markSaveDirty(){saveDirty=true;}\nif(e2eEnabled)Object.defineProperty(globalThis,'__minecraftE2E',{value:{setLook:(yaw,pitch)=>{player?.setLook(yaw,pitch);return !!player;}},configurable:true});\n",'e2e bridge')

rep('tests/e2e/smoke.spec.mjs',
'''async function rotateLook(page,movementX){await page.evaluate(x=>{const e=new MouseEvent('mousemove',{bubbles:true});Object.defineProperty(e,'movementX',{value:x});Object.defineProperty(e,'movementY',{value:0});document.dispatchEvent(e);},movementX);}
async function placeBedWithRealAim(page){
  await lockPointerAndLook(page,{movementY:240});
  for(let i=0;i<14;i++){await rightClickCanvas(page);await page.waitForTimeout(120);if(((await page.locator('#toast').textContent())||'').includes('放置 床'))return;await rotateLook(page,210);}
  throw new Error(`no real two-cell bed surface found; ${await page.locator('#debug').innerText()}`);
}
''',
'''async function placeBedWithRealAim(page){
  const candidates=[];for(const pitch of [-.45,-.65,-.85])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])candidates.push([yaw,pitch]);
  for(const [yaw,pitch] of candidates){await page.evaluate(({yaw,pitch})=>globalThis.__minecraftE2E?.setLook(yaw,pitch),{yaw,pitch});await page.waitForTimeout(80);await rightClickCanvas(page);await page.waitForTimeout(120);if(((await page.locator('#toast').textContent())||'').includes('放置 床'))return;}
  throw new Error(`no real two-cell bed surface found; ${await page.locator('#debug').innerText()}`);
}
''','deterministic bed look')

rep('tests/e2e/smoke.spec.mjs',
"  await page.goto('/');await page.getByRole('button',{name:'单人游戏'}).click();await page.locator('#world-name').fill('CI Bed Anchor');",
"  await page.goto('/?e2e=1');await page.getByRole('button',{name:'单人游戏'}).click();await page.locator('#world-name').fill('CI Bed Anchor');",'bed e2e url')
