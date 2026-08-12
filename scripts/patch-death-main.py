from pathlib import Path
import re

path = Path('src/main.js')
text = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    text = text.replace(old, new, 1)


def require_absent(value, label):
    if value in text:
        raise SystemExit(f'{label}: unexpected legacy reference remains')

replace_once("import {UI} from './ui.js';", "import {UI} from './ui.js';\nimport {DeathScreen} from './death-screen.js';", 'death screen import')
replace_once("const ui=new UI(),storage=new WorldStorage();", "const ui=new UI(),storage=new WorldStorage(),deathScreen=new DeathScreen();", 'death screen init')
replace_once("let oxygenState=createOxygenState(),headSubmerged=false;", "let oxygenState=createOxygenState(),headSubmerged=false;\nlet deathState=null;", 'death state')
replace_once(
    "function modeScreen(name){ui.showScreen(name==='main'?ui.main:name==='world'?ui.worldMenu:name==='pause'?ui.pause:null);}\nfunction pointer(){if(running&&!paused&&!ui.hasOpenPanel()&&!ui.isChatOpen())canvas.requestPointerLock().catch(()=>{});}\nfunction canControl(){return running&&!paused&&!ui.hasOpenPanel()&&!ui.isChatOpen()&&document.pointerLockElement===canvas;}",
    "function modeScreen(name){ui.showScreen(name==='main'?ui.main:name==='world'?ui.worldMenu:name==='pause'?ui.pause:name==='death'?deathScreen.root:null);}\nfunction pointer(){if(running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen())canvas.requestPointerLock().catch(()=>{});}\nfunction canControl(){return running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen()&&document.pointerLockElement===canvas;}",
    'mode/pointer guards',
)
replace_once(
    "  running=false;document.exitPointerLock?.();ui.closeChat();ui.inventory.classList.add('hidden');ui.workbench.classList.add('hidden');resetOxygen();",
    "  running=false;deathState=null;deathScreen.hide();document.exitPointerLock?.();ui.closeChat();ui.inventory.classList.add('hidden');ui.workbench.classList.add('hidden');resetOxygen();",
    'dispose death state',
)

old_respawn = """function respawnPlayer(reason='你死了'){
  if(!player)return;const deathPosition=player.position.clone(),previousXp=totalXp,plan=deathLossPlan({mode:player.mode,totalXp:previousXp,position:deathPosition}),stacks=plan.losesInventory?drainDeathStacks():[];let lossMessage='';
  if(plan.losesInventory){
    const itemCount=stacks.reduce((sum,stack)=>sum+stack.count,0);
    if(plan.recoverable){
      const origin=deathPosition.clone().add(new THREE.Vector3(0,.5,0));for(const stack of stacks)drops?.spawn(stack.id,stack.count,origin.clone());if(plan.droppedXp>0)experienceOrbs?.spawn(plan.droppedXp,origin.clone().add(new THREE.Vector3(0,.2,0)));
      const parts=[];if(itemCount>0)parts.push(`${itemCount} 个物品`);if(plan.droppedXp>0)parts.push(`${plan.droppedXp} 点经验`);if(parts.length)lossMessage=`；${parts.join('、')}已掉落在死亡点`;
    }else if(itemCount>0||previousXp>0)lossMessage='；虚空死亡使携带物品和经验无法回收';
    if(plan.clearsExperience)totalXp=0;
  }
  player.keys.clear();player.respawn(0,0);lastAttackAt=-Infinity;resetOxygen();renderPlayerStatus();ui.showToast(`${reason}，已在出生点重生${lossMessage}`);markSaveDirty();
}"""
new_respawn = """function beginPlayerDeath(reason='你死了'){
  if(!player||deathState)return;
  const deathPosition=player.position.clone(),previousXp=totalXp,plan=deathLossPlan({mode:player.mode,totalXp:previousXp,position:deathPosition}),stacks=plan.losesInventory?drainDeathStacks():[];
  let detail=plan.losesInventory?'':'当前模式不会损失携带物品或经验。';
  if(plan.losesInventory){
    const itemCount=stacks.reduce((sum,stack)=>sum+stack.count,0);
    if(plan.recoverable){
      const origin=deathPosition.clone().add(new THREE.Vector3(0,.5,0));for(const stack of stacks)drops?.spawn(stack.id,stack.count,origin.clone());if(plan.droppedXp>0)experienceOrbs?.spawn(plan.droppedXp,origin.clone().add(new THREE.Vector3(0,.2,0)));
      const parts=[];if(itemCount>0)parts.push(`${itemCount} 个物品`);if(plan.droppedXp>0)parts.push(`${plan.droppedXp} 点经验`);detail=parts.length?`${parts.join('、')}已掉落在死亡点。`:'没有可掉落的携带物品或经验。';
    }else detail=itemCount>0||previousXp>0?'虚空死亡使携带物品和经验无法回收。':'你掉出了世界边界。';
    if(plan.clearsExperience)totalXp=0;
  }
  player.keys.clear();player.velocity.set(0,0,0);lastAttackAt=-Infinity;resetOxygen();document.exitPointerLock?.();ui.closeChat();renderPlayerStatus();
  deathState={reason,detail,position:{x:deathPosition.x,y:deathPosition.y,z:deathPosition.z},recoverable:plan.recoverable};deathScreen.set(reason,detail);modeScreen('death');markSaveDirty();void persistWorld(true);
}

function completeRespawn(){
  if(!player||!deathState)return;player.respawn(0,0);lastAttackAt=-Infinity;resetOxygen();deathState=null;deathScreen.hide();modeScreen(null);renderPlayerStatus();markSaveDirty();ui.showToast('已重生');pointer();
}"""
replace_once(old_respawn, new_respawn, 'death settlement split')

replace_once(
    "function handlePlayerHit({amount,source}){\n  if(!player)return;const result=player.takeDamage(protectedDamage(amount),performance.now(),source);if(!result.applied)return;markSaveDirty();renderPlayerStatus();if(result.dead)respawnPlayer();\n}",
    "function handlePlayerHit({amount,source}){\n  if(!player||deathState)return;const result=player.takeDamage(protectedDamage(amount),performance.now(),source);if(!result.applied)return;markSaveDirty();renderPlayerStatus();if(result.dead)beginPlayerDeath();\n}",
    'hostile death',
)
replace_once(
    "function handlePlayerBlast({amount,source,knockback}){\n  if(!player)return;const result=player.takeDamage(protectedDamage(amount),performance.now(),null);if(!result.applied)return;\n  if(source&&Number.isFinite(knockback)&&knockback>0)player.knockbackFrom(source.x,source.z,Math.max(.25,knockback),Math.min(.55,.18+knockback*.3));markSaveDirty();renderPlayerStatus();if(result.dead)respawnPlayer('你被爆炸击倒了');\n}",
    "function handlePlayerBlast({amount,source,knockback}){\n  if(!player||deathState)return;const result=player.takeDamage(protectedDamage(amount),performance.now(),null);if(!result.applied)return;\n  if(source&&Number.isFinite(knockback)&&knockback>0)player.knockbackFrom(source.x,source.z,Math.max(.25,knockback),Math.min(.55,.18+knockback*.3));markSaveDirty();renderPlayerStatus();if(result.dead)beginPlayerDeath('你被爆炸击倒了');\n}",
    'blast death',
)
replace_once(
    "function pauseGame(){if(!running)return;paused=true;player?.keys.clear();document.exitPointerLock?.();modeScreen('pause');persistWorld();}\nfunction resume(){paused=false;modeScreen(null);pointer();}\nfunction toggleInventory(){if(!running||paused||ui.isChatOpen())return;if(ui.hasOpenPanel()){ui.closePanels();pointer();}else{player.keys.clear();document.exitPointerLock?.();ui.openInventory();}}\nfunction openWorkbench(){if(!running||paused)return;player.keys.clear();document.exitPointerLock?.();ui.openWorkbench();}",
    "function pauseGame(){if(!running||deathState)return;paused=true;player?.keys.clear();document.exitPointerLock?.();modeScreen('pause');persistWorld();}\nfunction resume(){if(deathState)return;paused=false;modeScreen(null);pointer();}\nfunction toggleInventory(){if(!running||paused||deathState||ui.isChatOpen())return;if(ui.hasOpenPanel()){ui.closePanels();pointer();}else{player.keys.clear();document.exitPointerLock?.();ui.openInventory();}}\nfunction openWorkbench(){if(!running||paused||deathState)return;player.keys.clear();document.exitPointerLock?.();ui.openWorkbench();}",
    'death UI control guards',
)
replace_once(
    "  if(action==='singleplayer')modeScreen('world');else if(action==='back-main')modeScreen('main');else if(action==='create-world')await startWorld();else if(action==='resume')resume();else if(action==='save-main'){ui.showLoading(true,'正在写入浏览器存档',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}else if(action==='options')ui.showToast('选项系统将在后续阶段接入');else if(action==='multiplayer'||action==='realms')ui.showToast('网络层将在后续阶段接入');else if(action==='quit')ui.showToast('浏览器页面不能由网页强制关闭');",
    "  if(action==='singleplayer')modeScreen('world');else if(action==='back-main')modeScreen('main');else if(action==='create-world')await startWorld();else if(action==='resume')resume();else if(action==='respawn')completeRespawn();else if(action==='death-main'){ui.showLoading(true,'正在保存死亡结算',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}else if(action==='save-main'){ui.showLoading(true,'正在写入浏览器存档',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}else if(action==='options')ui.showToast('选项系统将在后续阶段接入');else if(action==='multiplayer'||action==='realms')ui.showToast('网络层将在后续阶段接入');else if(action==='quit')ui.showToast('浏览器页面不能由网页强制关闭');",
    'death actions',
)
replace_once("window.addEventListener('keydown',e=>{if(ui.isChatOpen()||e.repeat)return;", "window.addEventListener('keydown',e=>{if(deathState){e.preventDefault();return;}if(ui.isChatOpen()||e.repeat)return;", 'death key guard')
replace_once("function updateOxygen(dt,now){\n  if(!player||!world)return;", "function updateOxygen(dt,now){\n  if(!player||!world||deathState)return;", 'oxygen death guard')
replace_once("if(hit.dead){respawnPlayer('你溺水了');break;}", "if(hit.dead){beginPlayerDeath('你溺水了');break;}", 'drowning death')

animate_pattern = re.compile(r"function animate\(now\)\{\n  requestAnimationFrame\(animate\);.*?\n\}\nrequestAnimationFrame\(animate\);", re.S)
new_animate = """function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;frames++;if(now-lastSecond>1000){fps=frames;frames=0;lastSecond=now;}
  if(running&&!paused&&player&&!deathState){
    if(!ui.hasOpenPanel()&&!ui.isChatOpen())player.update(dt);
    if(player.hp<=0)beginPlayerDeath(player.position.y<-10?'你掉入了虚空':'你死了');
    if(!deathState){
      world.ensureAround(player.position.x,player.position.z);interaction(now);updateSurvival(dt);updateOxygen(dt,now);
      if(!deathState){drops?.update(dt,player);experienceOrbs?.update(dt,player);passiveMobs?.update(dt,player);hostileMobs?.update(dt,player,gameTime);projectiles?.update(dt,player);explosions?.update(dt);weatherSystem?.update(dt,player);updateAutosave(now);gameTime=(gameTime+dt*20)%24000;applySky();}
      const p=player.position,xp=experienceState(totalXp),armor=equipment?.armorPoints()||0,air=oxygenState.air,weatherFx=weatherSystem?.activeCount||0;ui.debug.textContent=`Minecraft Web By AI v0.4-dev\nFPS ${fps} · WebGL ${renderer.capabilities.isWebGL2?'2':'1'}\nXYZ ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}\nChunks ${world.chunks.size} · Meshes ${world.meshes.size} · MeshQ ${world.meshQueue.size}\nPassive ${passiveMobs?.size||0} · Hostile ${hostileMobs?.size||0} · Projectiles ${projectiles?.size||0} · FX ${explosions?.size||0}\nWeatherFX ${weatherSystem?.type||weather}:${weatherFx}\nDrops ${drops?.drops.length||0} · XPOrbs ${experienceOrbs?.size||0} · XP ${xp.total} / Lv.${xp.level}\nHP ${player.hp.toFixed(1)} · Armor ${armor} · Air ${air.toFixed(1)} · ${headSubmerged?'Submerged':'Dry'}\nTime ${Math.floor(gameTime)} · ${weather}\n模式 ${player.mode} · Seed ${worldInfo?.seed}`;
    }
  }
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);"""
text, count = animate_pattern.subn(new_animate, text, count=1)
if count != 1:
    raise SystemExit(f'animate death freeze: expected 1 match, got {count}')

require_absent('respawnPlayer(', 'legacy respawnPlayer')
if text.count('beginPlayerDeath(') < 5:
    raise SystemExit('death lifecycle: expected beginPlayerDeath wiring')
if "import {DeathScreen} from './death-screen.js';" not in text or 'let deathState=null;' not in text:
    raise SystemExit('death lifecycle: missing required state/import')

path.write_text(text, encoding='utf-8')
print('death main recovery patch: PASS')
