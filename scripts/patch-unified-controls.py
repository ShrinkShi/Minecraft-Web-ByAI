from pathlib import Path


def rep(path, old, new, label):
    p=Path(path); t=p.read_text(encoding='utf-8'); n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    p.write_text(t.replace(old,new,1),encoding='utf-8')

rep('src/main.js',
"import {MobileControls} from './mobile-controls.js';\nimport {detectDeviceProfile} from './device-profile.js';\n",
"import {MobileControls} from './mobile-controls.js';\nimport {DesktopControls} from './desktop-controls.js';\nimport {ControlIntentBus} from './control-intents.js';\nimport {detectDeviceProfile} from './device-profile.js';\n",
'import controls')

rep('src/main.js',
"let deviceProfile=detectDeviceProfile(),mobileControls=null;\n",
"let deviceProfile=detectDeviceProfile(),desktopControls=null,mobileControls=null;\n",
'control adapters')

rep('src/main.js',
"let deathState=null,respawnPoint=null;\n\nfunction modeScreen(name){ui.showScreen(name==='main'?ui.main:name==='world'?ui.worldMenu:name==='pause'?ui.pause:name==='death'?deathScreen.root:null);}\nfunction pointer(){if(running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen()&&!deviceProfile.mobile)canvas.requestPointerLock().catch(()=>{});}\nfunction canControl(){const active=running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen();return active&&(deviceProfile.mobile||document.pointerLockElement===canvas);}\nfunction markSaveDirty(){saveDirty=true;}\nfunction clearPlayerInput(){player?.keys.clear();player?.clearVirtualInput?.();}\nfunction syncMobileControls(){mobileControls?.setGameplayEnabled(running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen());}\n",
"let deathState=null,respawnPoint=null;\nconst controlBus=new ControlIntentBus({\n  onState:state=>player?.setControlState(state),\n  onLook:({yawDelta,pitchDelta})=>{if(canControl())player?.applyLookIntent(yawDelta,pitchDelta);},\n  onPrimary:pressed=>{if(pressed)primaryActionStart();else primaryActionEnd();},\n  onAction:intent=>handleControlIntent(intent)\n});\n\nfunction modeScreen(name){ui.showScreen(name==='main'?ui.main:name==='world'?ui.worldMenu:name==='pause'?ui.pause:name==='death'?deathScreen.root:null);}\nfunction controlActive(){return running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen();}\nfunction pointer(){if(controlActive()&&!deviceProfile.mobile)canvas.requestPointerLock().catch(()=>{});}\nfunction canControl(){const active=controlActive();return active&&(deviceProfile.mobile?deviceProfile.orientation==='landscape':document.pointerLockElement===canvas);}\nfunction markSaveDirty(){saveDirty=true;}\nfunction clearPlayerInput(){controlBus.resetAll();player?.clearControlState?.();}\nfunction syncControlAdapters(){const active=controlActive();desktopControls?.setGameplayEnabled(active&&!deviceProfile.mobile&&document.pointerLockElement===canvas);mobileControls?.setGameplayEnabled(active&&deviceProfile.mobile);}\n",
'control bus wiring')

rep('src/main.js',
"inventory=new Inventory(mode,saved?.inventory||null);equipment=new Equipment(saved?.equipment||null);player=new PlayerController(camera,canvas,world,scene);player.setMode(mode);const restored=!savedDead&&saved?.player?player.restore(saved.player):false;",
"inventory=new Inventory(mode,saved?.inventory||null);equipment=new Equipment(saved?.equipment||null);player=new PlayerController(camera,canvas,world,scene);player.setControlState(controlBus.snapshot());player.setMode(mode);const restored=!savedDead&&saved?.player?player.restore(saved.player):false;",
'player control state')

old_events="""document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button)handleAction(button.dataset.action);});canvas.addEventListener('click',pointer);window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});
window.addEventListener('keydown',e=>{if(deathState){e.preventDefault();return;}if(ui.isChatOpen()||e.repeat)return;if(e.code==='Escape'){if(ui.hasOpenPanel()){ui.closePanels();pointer();return;}if(running)pauseGame();}if(e.code==='KeyE')toggleInventory();if(e.code==='F5'&&running){e.preventDefault();cycleViewMode();}if((e.code==='KeyT'||e.code==='Slash')&&running&&!paused&&!ui.hasOpenPanel()){e.preventDefault();openChatInput(e.code==='Slash'?'/':'');}if(e.code==='KeyQ'&&canControl())dropSelected();if(/^Digit[1-9]$/.test(e.code)&&running)ui.select(Number(e.code.slice(-1))-1);});
ui.chatInput.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();ui.closeChat();pointer();return;}if(e.key==='Enter'){e.preventDefault();const text=ui.chatInput.value;ui.closeChat();if(text.trim())runCommand(text);pointer();}});
canvas.addEventListener('wheel',e=>{if(running&&!ui.hasOpenPanel())ui.select(ui.selected+(e.deltaY>0?1:-1));},{passive:true});canvas.addEventListener('contextmenu',e=>e.preventDefault());
"""
new_events="""document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button)handleAction(button.dataset.action);});window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});document.addEventListener('pointerlockchange',syncControlAdapters);
function handleControlIntent({name,payload}={}){
  if(name==='focus'){pointer();return true;}if(deathState)return false;
  if(name==='escape'){if(ui.isChatOpen()){ui.closeChat();pointer();return true;}if(ui.hasOpenPanel()){ui.closePanels();pointer();return true;}if(running&&!paused){pauseGame();return true;}return false;}
  if(name==='pause'){if(running&&!paused){pauseGame();return true;}return false;}
  if(name==='inventory'){const allowed=running&&!paused&&!deathState&&!ui.isChatOpen();if(allowed)toggleInventory();return allowed;}
  if(name==='view'){if(!running)return false;cycleViewMode();return true;}
  if(name==='chat'){const allowed=running&&!paused&&!ui.hasOpenPanel();if(allowed)openChatInput(payload?.prefix||'');return allowed;}
  if(name==='drop'){if(!canControl())return false;dropSelected();return true;}
  if(name==='hotbar-select'){if(!running||!Number.isInteger(payload?.index)||payload.index<0||payload.index>8)return false;ui.select(payload.index);return true;}
  if(name==='hotbar-step'){if(!running||ui.hasOpenPanel()||!Number.isFinite(payload?.step))return false;ui.select(ui.selected+(payload.step>0?1:-1));return true;}
  if(name==='secondary'){if(!canControl())return false;secondaryAction();return true;}return false;
}
ui.chatInput.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();ui.closeChat();pointer();return;}if(e.key==='Enter'){e.preventDefault();const text=ui.chatInput.value;ui.closeChat();if(text.trim())runCommand(text);pointer();}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
"""
rep('src/main.js',old_events,new_events,'desktop events to intents')

rep('src/main.js',
"canvas.addEventListener('mousedown',e=>{if(e.button===0)primaryActionStart();else if(e.button===2)secondaryAction();});\nwindow.addEventListener('mouseup',e=>{if(e.button===0)primaryActionEnd();});document.addEventListener('visibilitychange',()=>{if(document.hidden)persistWorld();});window.addEventListener('beforeunload',()=>{persistWorld();});\n",
"document.addEventListener('visibilitychange',()=>{if(document.hidden){clearPlayerInput();persistWorld();}});window.addEventListener('beforeunload',()=>{persistWorld();});\n",
'mouse gameplay events')

rep('src/main.js',
"  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;frames++;if(now-lastSecond>1000){fps=frames;frames=0;lastSecond=now;}syncMobileControls();\n",
"  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;frames++;if(now-lastSecond>1000){fps=frames;frames=0;lastSecond=now;}syncControlAdapters();\n",
'animate adapter sync')

old_mobile="""mobileControls=new MobileControls({
  onProfile:profile=>{deviceProfile=profile;if(!profile.mobile)player?.clearVirtualInput?.();},
  onMove:(side,forward)=>player?.setVirtualMove(side,forward),
  onLook:(dx,dy)=>{if(canControl())player?.applyLookDelta(dx,dy,.0026);},
  onHold:(name,pressed)=>{if(name==='jump')player?.setVirtualButton('jump',pressed);else if(name==='attack'){if(pressed)primaryActionStart();else primaryActionEnd();}},
  onToggle:(name,pressed)=>player?.setVirtualButton(name,pressed),
  onAction:action=>{if(action==='use')secondaryAction();else if(action==='inventory')toggleInventory();else if(action==='pause')pauseGame();else if(action==='chat')openChatInput('');else if(action==='view')cycleViewMode();else if(action==='drop'&&canControl())dropSelected();}
});
requestAnimationFrame(animate);"""
new_mobile="""desktopControls=new DesktopControls(canvas,controlBus);
mobileControls=new MobileControls(controlBus,{onProfile:profile=>{deviceProfile=profile;if(!profile.mobile)controlBus.resetSource('touch');syncControlAdapters();}});
requestAnimationFrame(animate);"""
rep('src/main.js',old_mobile,new_mobile,'mobile adapter wiring')
