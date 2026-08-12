from pathlib import Path

def rep(path, old, new, label):
    p=Path(path); t=p.read_text(encoding='utf-8'); n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

# index.html
rep('index.html','  <link rel="stylesheet" href="./death.css" />\n','  <link rel="stylesheet" href="./death.css" />\n  <link rel="stylesheet" href="./mobile.css" />\n','mobile css link')
rep('index.html','      <div class="inventory-panel">\n        <div class="inventory-title">物品栏</div>','      <div class="inventory-panel">\n        <button class="mobile-panel-close" data-action="mobile-close-panel" aria-label="关闭物品栏">×</button>\n        <div class="inventory-title">物品栏</div>','inventory close')
rep('index.html','      <div class="inventory-panel workbench-panel">\n        <div class="inventory-title">工作台</div>','      <div class="inventory-panel workbench-panel">\n        <button class="mobile-panel-close" data-action="mobile-close-panel" aria-label="关闭工作台">×</button>\n        <div class="inventory-title">工作台</div>','workbench close')
rep('index.html','''    <div id="cursor-stack" class="cursor-stack hidden"></div>
    <div id="chat-input-wrap" class="chat-input-wrap hidden"><input id="chat-input" autocomplete="off" spellcheck="false" maxlength="256" /></div>
''','''    <div id="rotate-device" class="rotate-device" role="status" aria-live="polite"><div class="rotate-device-card"><strong>请将手机横屏</strong><span>横屏后会自动切换到触控游戏布局。</span></div></div>
    <div id="mobile-controls" class="mobile-controls hidden" aria-label="手机触控操作" aria-hidden="true">
      <div id="mobile-look-zone" class="mobile-look-zone" aria-label="拖动调整视角"></div>
      <div id="mobile-joystick" class="mobile-joystick" aria-label="移动摇杆"><span id="mobile-joystick-knob" class="mobile-joystick-knob"></span></div>
      <div class="mobile-top-actions">
        <button class="mobile-control-button" data-mobile-action="pause">暂停</button><button class="mobile-control-button" data-mobile-action="inventory">背包</button><button class="mobile-control-button" data-mobile-action="chat">聊天</button><button class="mobile-control-button" data-mobile-action="view">视角</button>
      </div>
      <div class="mobile-action-cluster">
        <button class="mobile-control-button" data-mobile-hold="attack">攻击</button><button class="mobile-control-button" data-mobile-action="use">使用</button><button class="mobile-control-button" data-mobile-hold="jump">跳</button><button class="mobile-control-button" data-mobile-toggle="sprint" aria-pressed="false">跑</button><button class="mobile-control-button" data-mobile-toggle="sneak" aria-pressed="false">潜</button><button class="mobile-control-button" data-mobile-action="drop">丢</button>
      </div>
    </div>
    <div id="cursor-stack" class="cursor-stack hidden"></div>
    <div id="chat-input-wrap" class="chat-input-wrap hidden"><input id="chat-input" autocomplete="off" spellcheck="false" maxlength="256" /><button class="mobile-chat-close" data-action="mobile-close-chat" aria-label="关闭聊天">×</button></div>
''','mobile controls markup')

# player.js virtual input + touch look
rep('src/player.js',"    this.yaw=0;this.pitch=0;this.keys=new Set();this.grounded=false;this.flying=false;this.viewMode=0;this.swimCoverage=0;\n","    this.yaw=0;this.pitch=0;this.keys=new Set();this.virtualInput={side:0,forward:0,jump:false,sneak:false,sprint:false};this.grounded=false;this.flying=false;this.viewMode=0;this.swimCoverage=0;\n",'player virtual state')
rep('src/player.js',"    this.onMove=e=>{if(document.pointerLockElement!==this.canvas)return;this.yaw-=e.movementX*.0022;this.pitch-=e.movementY*.0022;this.pitch=Math.max(-1.553,Math.min(1.553,this.pitch));};\n","    this.onMove=e=>{if(document.pointerLockElement!==this.canvas)return;this.applyLookDelta(e.movementX,e.movementY);};\n",'desktop look reuse')
rep('src/player.js',"  setMode(mode){this.mode=mode;this.flying=mode==='creative'||mode==='spectator';if(this.flying)this.swimCoverage=0;}\n","""  applyLookDelta(dx,dy,sensitivity=.0022){if(!Number.isFinite(dx)||!Number.isFinite(dy))return;this.setLook(this.yaw-dx*sensitivity,this.pitch-dy*sensitivity);}
  setVirtualMove(side,forward){this.virtualInput.side=Math.max(-1,Math.min(1,Number(side)||0));this.virtualInput.forward=Math.max(-1,Math.min(1,Number(forward)||0));}
  setVirtualButton(name,pressed){if(name in this.virtualInput)this.virtualInput[name]=!!pressed;}
  clearVirtualInput(){this.virtualInput.side=0;this.virtualInput.forward=0;this.virtualInput.jump=false;this.virtualInput.sneak=false;this.virtualInput.sprint=false;}
  setMode(mode){this.mode=mode;this.flying=mode==='creative'||mode==='spectator';if(this.flying)this.swimCoverage=0;}
""",'player virtual methods')
rep('src/player.js',"""    const forward=(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0),side=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0),sprint=this.keys.has('ControlLeft')||this.keys.has('ControlRight'),sneak=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'),up=this.keys.has('Space');
    this.swimCoverage=this.flying?0:this.waterCoverage();
    const swim=stepSwimming({velocityY:this.velocity.y,coverage:this.swimCoverage,dt,up,down:sneak});
    const baseSpeed=swim.active?this.walk:(sprint?this.sprint:this.walk),sneakFactor=swim.active?1:(sneak?.35:1),speed=baseSpeed*sneakFactor*swim.speedMultiplier,dir=new THREE.Vector3();
    if(forward||side)dir.set(Math.sin(this.yaw)*forward+Math.cos(this.yaw)*side,0,-Math.cos(this.yaw)*forward+Math.sin(this.yaw)*side).normalize().multiplyScalar(speed*dt);
""","""    const keyForward=(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0),keySide=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0),forward=Math.max(-1,Math.min(1,keyForward+this.virtualInput.forward)),side=Math.max(-1,Math.min(1,keySide+this.virtualInput.side)),sprint=this.keys.has('ControlLeft')||this.keys.has('ControlRight')||this.virtualInput.sprint,sneak=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')||this.virtualInput.sneak,up=this.keys.has('Space')||this.virtualInput.jump;
    this.swimCoverage=this.flying?0:this.waterCoverage();
    const swim=stepSwimming({velocityY:this.velocity.y,coverage:this.swimCoverage,dt,up,down:sneak});
    const baseSpeed=swim.active?this.walk:(sprint?this.sprint:this.walk),sneakFactor=swim.active?1:(sneak?.35:1),speed=baseSpeed*sneakFactor*swim.speedMultiplier,dir=new THREE.Vector3(),moveAmount=Math.min(1,Math.hypot(forward,side));
    if(moveAmount)dir.set(Math.sin(this.yaw)*forward+Math.cos(this.yaw)*side,0,-Math.cos(this.yaw)*forward+Math.sin(this.yaw)*side).normalize().multiplyScalar(speed*dt*moveAmount);
""",'player virtual movement')

# ui.js touch-selectable HUD hotbar
rep('src/ui.js',"      const slot=e.target.closest('[data-inv-index],[data-equipment-slot],[data-craft-index],[data-craft-result]');\n      if(!slot||!this.inventoryModel)return;\n      if(e.button!==0&&e.button!==2)return;\n      e.preventDefault();\n","""      const slot=e.target.closest('[data-hotbar-index],[data-inv-index],[data-equipment-slot],[data-craft-index],[data-craft-result]');
      if(!slot)return;
      if(slot.dataset.hotbarIndex!==undefined){if(e.button!==0)return;e.preventDefault();this.select(Number(slot.dataset.hotbarIndex));return;}
      if(!this.inventoryModel)return;if(e.button!==0&&e.button!==2)return;e.preventDefault();
""",'ui hotbar pointer selector')
rep('src/ui.js',"      const stack=this.inventoryModel?.hotbar(i)||null,s=this.makeSlot(stack,{key:String(i+1),hud:true});if(i===this.selected)s.classList.add('selected');this.hotbar.append(s);\n","      const stack=this.inventoryModel?.hotbar(i)||null,s=this.makeSlot(stack,{key:String(i+1),hud:true});s.dataset.hotbarIndex=i;if(i===this.selected)s.classList.add('selected');this.hotbar.append(s);\n",'ui hotbar indexes')

# main.js device/profile and shared controls
rep('src/main.js',"import {deathLossPlan} from './death-rules.js';\n","import {deathLossPlan} from './death-rules.js';\nimport {MobileControls} from './mobile-controls.js';\nimport {detectDeviceProfile} from './device-profile.js';\n",'main mobile imports')
rep('src/main.js',"const e2eEnabled=new URLSearchParams(location.search).get('e2e')==='1';\nlet world=null,player=null,inventory=null,equipment=null,drops=null,experienceOrbs=null,projectiles=null,explosions=null,passiveMobs=null,hostileMobs=null,weatherSystem=null;\n","const e2eEnabled=new URLSearchParams(location.search).get('e2e')==='1';\nlet deviceProfile=detectDeviceProfile(),mobileControls=null;\nlet world=null,player=null,inventory=null,equipment=null,drops=null,experienceOrbs=null,projectiles=null,explosions=null,passiveMobs=null,hostileMobs=null,weatherSystem=null;\n",'main device state')
rep('src/main.js',"function pointer(){if(running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen())canvas.requestPointerLock().catch(()=>{});}\nfunction canControl(){return running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen()&&document.pointerLockElement===canvas;}\nfunction markSaveDirty(){saveDirty=true;}\n","""function pointer(){if(running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen()&&!deviceProfile.mobile)canvas.requestPointerLock().catch(()=>{});}
function canControl(){const active=running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen();return active&&(deviceProfile.mobile||document.pointerLockElement===canvas);}
function markSaveDirty(){saveDirty=true;}
function clearPlayerInput(){player?.keys.clear();player?.clearVirtualInput?.();}
function syncMobileControls(){mobileControls?.setGameplayEnabled(running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen());}
""",'main mobile control gate')
rep('src/main.js',"  player.keys.clear();player.velocity.set(0,0,0);lastAttackAt=-Infinity;resetOxygen();document.exitPointerLock?.();ui.closeChat();renderPlayerStatus();\n","  clearPlayerInput();player.velocity.set(0,0,0);lastAttackAt=-Infinity;resetOxygen();document.exitPointerLock?.();ui.closeChat();renderPlayerStatus();\n",'death clear virtual input')
rep('src/main.js',"""function pauseGame(){if(!running||deathState)return;paused=true;player?.keys.clear();document.exitPointerLock?.();modeScreen('pause');persistWorld();}
function resume(){if(deathState)return;paused=false;modeScreen(null);pointer();}
function toggleInventory(){if(!running||paused||deathState||ui.isChatOpen())return;if(ui.hasOpenPanel()){ui.closePanels();pointer();}else{player.keys.clear();document.exitPointerLock?.();ui.openInventory();}}
function openWorkbench(){if(!running||paused||deathState)return;player.keys.clear();document.exitPointerLock?.();ui.openWorkbench();}
""","""function pauseGame(){if(!running||deathState)return;paused=true;clearPlayerInput();document.exitPointerLock?.();modeScreen('pause');persistWorld();}
function resume(){if(deathState)return;paused=false;modeScreen(null);pointer();}
function toggleInventory(){if(!running||paused||deathState||ui.isChatOpen())return;if(ui.hasOpenPanel()){ui.closePanels();pointer();}else{clearPlayerInput();document.exitPointerLock?.();ui.openInventory();}}
function openWorkbench(){if(!running||paused||deathState)return;clearPlayerInput();document.exitPointerLock?.();ui.openWorkbench();}
function cycleViewMode(){if(!running||!player)return;const view=player.cycleView();ui.showToast(['第一人称','第三人称背面','第三人称正面'][view]);markSaveDirty();}
function openChatInput(prefix=''){if(!running||paused||deathState||ui.hasOpenPanel())return;clearPlayerInput();document.exitPointerLock?.();ui.openChat(prefix);}
""",'main mobile menu helpers')
rep('src/main.js',"  if(action==='singleplayer')modeScreen('world');else if(action==='back-main')modeScreen('main');else if(action==='create-world')await startWorld();else if(action==='resume')resume();else if(action==='respawn')await completeRespawn();else if(action==='death-main'){ui.showLoading(true,'正在保存死亡结算',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}else if(action==='save-main'){ui.showLoading(true,'正在写入浏览器存档',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}else if(action==='options')ui.showToast('选项系统将在后续阶段接入');else if(action==='multiplayer'||action==='realms')ui.showToast('网络层将在后续阶段接入');else if(action==='quit')ui.showToast('浏览器页面不能由网页强制关闭');\n","  if(action==='singleplayer')modeScreen('world');else if(action==='back-main')modeScreen('main');else if(action==='create-world')await startWorld();else if(action==='resume')resume();else if(action==='respawn')await completeRespawn();else if(action==='mobile-close-panel'){ui.closePanels();pointer();}else if(action==='mobile-close-chat'){ui.closeChat();pointer();}else if(action==='death-main'){ui.showLoading(true,'正在保存死亡结算',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}else if(action==='save-main'){ui.showLoading(true,'正在写入浏览器存档',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}else if(action==='options')ui.showToast('选项系统将在后续阶段接入');else if(action==='multiplayer'||action==='realms')ui.showToast('网络层将在后续阶段接入');else if(action==='quit')ui.showToast('浏览器页面不能由网页强制关闭');\n",'main mobile close actions')
rep('src/main.js',"window.addEventListener('keydown',e=>{if(deathState){e.preventDefault();return;}if(ui.isChatOpen()||e.repeat)return;if(e.code==='Escape'){if(ui.hasOpenPanel()){ui.closePanels();pointer();return;}if(running)pauseGame();}if(e.code==='KeyE')toggleInventory();if(e.code==='F5'&&running){e.preventDefault();const view=player.cycleView();ui.showToast(['第一人称','第三人称背面','第三人称正面'][view]);markSaveDirty();}if((e.code==='KeyT'||e.code==='Slash')&&running&&!paused&&!ui.hasOpenPanel()){e.preventDefault();player.keys.clear();document.exitPointerLock?.();ui.openChat(e.code==='Slash'?'/':'');}if(e.code==='KeyQ'&&canControl())dropSelected();if(/^Digit[1-9]$/.test(e.code)&&running)ui.select(Number(e.code.slice(-1))-1);});\n","window.addEventListener('keydown',e=>{if(deathState){e.preventDefault();return;}if(ui.isChatOpen()||e.repeat)return;if(e.code==='Escape'){if(ui.hasOpenPanel()){ui.closePanels();pointer();return;}if(running)pauseGame();}if(e.code==='KeyE')toggleInventory();if(e.code==='F5'&&running){e.preventDefault();cycleViewMode();}if((e.code==='KeyT'||e.code==='Slash')&&running&&!paused&&!ui.hasOpenPanel()){e.preventDefault();openChatInput(e.code==='Slash'?'/':'');}if(e.code==='KeyQ'&&canControl())dropSelected();if(/^Digit[1-9]$/.test(e.code)&&running)ui.select(Number(e.code.slice(-1))-1);});\n",'main shared key actions')
old_mouse="canvas.addEventListener('mousedown',e=>{if(!canControl())return;if(e.button===0&&player.mode!=='spectator'){const entityHit=aimEntity(),blockHit=aim();if(entityHit&&(!blockHit||entityHit.distance<=blockHit.distance)){const now=performance.now();breakStart=0;ui.setBreak(0);if(player.mode!=='creative'&&!canAttack(lastAttackAt,now))return;lastAttackAt=now;const selected=ui.selectedItem(),damage=player.mode==='creative'?100:(ITEMS[selected?.id]?.attackDamage||1);entityHit.system.hurt(entityHit.entity,damage,player.position,now);return;}if(player.mode!=='adventure')breakStart=performance.now();}if(e.button===2){const hit=aim();if(hit&&isBedBlock(hit.id)){if(player.mode!=='spectator')activateBed(hit);return;}if(hit?.id===9){openWorkbench();return;}if(player.mode==='spectator'||player.mode==='adventure'||!hit)return;const selected=ui.selectedItem(),def=ITEMS[selected?.id];if(def?.placeKind==='bed'){const plan=placeBed(hit.previous);if(!plan){ui.showToast('这里无法放置床');return;}if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();return;}if(!def?.blockId||def.blockId===8)return;const p=hit.previous;if(playerOccupies(p.x,p.y,p.z))return;if(world.setBlock(p.x,p.y,p.z,def.blockId)){if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();}}});\nwindow.addEventListener('mouseup',e=>{if(e.button===0){breakStart=0;ui.setBreak(0);}});"
new_mouse="""function primaryActionStart(){
  if(!canControl()||!player||player.mode==='spectator')return;const entityHit=aimEntity(),blockHit=aim();
  if(entityHit&&(!blockHit||entityHit.distance<=blockHit.distance)){const now=performance.now();breakStart=0;ui.setBreak(0);if(player.mode!=='creative'&&!canAttack(lastAttackAt,now))return;lastAttackAt=now;const selected=ui.selectedItem(),damage=player.mode==='creative'?100:(ITEMS[selected?.id]?.attackDamage||1);entityHit.system.hurt(entityHit.entity,damage,player.position,now);return;}
  if(player.mode!=='adventure')breakStart=performance.now();
}
function primaryActionEnd(){breakStart=0;ui.setBreak(0);}
function secondaryAction(){
  if(!canControl()||!player)return;const hit=aim();if(hit&&isBedBlock(hit.id)){if(player.mode!=='spectator')activateBed(hit);return;}if(hit?.id===9){openWorkbench();return;}if(player.mode==='spectator'||player.mode==='adventure'||!hit)return;const selected=ui.selectedItem(),def=ITEMS[selected?.id];if(def?.placeKind==='bed'){const plan=placeBed(hit.previous);if(!plan){ui.showToast('这里无法放置床');return;}if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();return;}if(!def?.blockId||def.blockId===8)return;const p=hit.previous;if(playerOccupies(p.x,p.y,p.z))return;if(world.setBlock(p.x,p.y,p.z,def.blockId)){if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();}
}
canvas.addEventListener('mousedown',e=>{if(e.button===0)primaryActionStart();else if(e.button===2)secondaryAction();});
window.addEventListener('mouseup',e=>{if(e.button===0)primaryActionEnd();});"""
rep('src/main.js',old_mouse,new_mouse,'main shared pointer actions')
rep('src/main.js',"function animate(now){\n  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;frames++;if(now-lastSecond>1000){fps=frames;frames=0;lastSecond=now;}\n","function animate(now){\n  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;frames++;if(now-lastSecond>1000){fps=frames;frames=0;lastSecond=now;}syncMobileControls();\n",'mobile sync in animation')
rep('src/main.js',"requestAnimationFrame(animate);\n","""mobileControls=new MobileControls({
  onProfile:profile=>{deviceProfile=profile;if(!profile.mobile)player?.clearVirtualInput?.();},
  onMove:(side,forward)=>player?.setVirtualMove(side,forward),
  onLook:(dx,dy)=>{if(canControl())player?.applyLookDelta(dx,dy,.0026);},
  onHold:(name,pressed)=>{if(name==='jump')player?.setVirtualButton('jump',pressed);else if(name==='attack'){if(pressed)primaryActionStart();else primaryActionEnd();}},
  onToggle:(name,pressed)=>player?.setVirtualButton(name,pressed),
  onAction:action=>{if(action==='use')secondaryAction();else if(action==='inventory')toggleInventory();else if(action==='pause')pauseGame();else if(action==='chat')openChatInput('');else if(action==='view')cycleViewMode();else if(action==='drop'&&canControl())dropSelected();}
});
requestAnimationFrame(animate);
""",'mobile controller instantiate')

# package test gate
rep('package.json','node scripts/check-respawn.mjs && node scripts/check-bed.mjs','node scripts/check-respawn.mjs && node scripts/check-bed.mjs && node scripts/check-mobile.mjs','mobile logic suite')
