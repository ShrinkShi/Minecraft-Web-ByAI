import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {UI} from './ui.js';
import {DeathScreen} from './death-screen.js';
import {BLOCK,BLOCKS,WORLD_HEIGHT} from './blocks.js';
import {normalizeRespawnPoint,resolveRespawnPosition} from './respawn-rules.js';
import {bedPlacement,bedPartner,bedRespawnAnchor,isBedBlock} from './bed-rules.js';
import {resolveSleep} from './sleep-rules.js';
import {ITEMS} from './items.js';
import {mitigateArmorDamage} from './armor-rules.js';
import {createOxygenState,stepOxygen,usesOxygen,MAX_AIR_SECONDS,DROWN_DAMAGE} from './oxygen-rules.js';
import {WorldStorage,worldIdFor} from './storage.js';
import {SINGLEPLAYER_SAVE_VERSION,resolveSingleplayerTerrainVersion} from './world-save-compatibility.js';
import {executeCommand} from './commands.js';
import {canAttack} from './combat.js';
import {meleeProfile} from './melee-rules.js';
import {resolveToolSecondaryAction,toolActionFaceY} from './tool-secondary-actions.js';
import {playToolSecondaryActionSound} from './vanilla-sounds.js';
import {experienceState} from './experience.js';
import {rollMobLoot,rollMobXp} from './mobs.js';
import {deathLossPlan} from './death-rules.js';
import {MobileControls} from './mobile-controls.js';
import {DesktopControls} from './desktop-controls.js';
import {ControlIntentBus} from './control-intents.js';
import {detectDeviceProfile} from './device-profile.js';
import {createClientGameplayRuntime} from './client-gameplay-runtime.js';
import {MultiplayerMovementSession} from './multiplayer-movement-session.js';
import {createAuthoritativeMultiplayerGameplay,applyAuthoritativePlayerState} from './multiplayer-gameplay-adapter.js';
import {HOTBAR_START} from './inventory-layout.js';
import {SingleplayerMiningController} from './singleplayer-mining-controller.js';
import {SingleplayerFurnaceRuntime} from './singleplayer-furnace-runtime.js';

const canvas=document.querySelector('#game-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x86bff2);
scene.fog=new THREE.Fog(0x86bff2,48,110);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,180);
const hemi=new THREE.HemisphereLight(0xbfe4ff,0x6a5a42,2.4);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1c2,2.1);sun.position.set(80,120,60);scene.add(sun);

const ui=new UI(),storage=new WorldStorage(),deathScreen=new DeathScreen();
const e2eEnabled=new URLSearchParams(location.search).get('e2e')==='1';
let deviceProfile=detectDeviceProfile(),desktopControls=null,mobileControls=null,gameplayRuntime=null,singleplayerFurnace=null;
let world=null,player=null,inventory=null,equipment=null,drops=null,experienceOrbs=null,projectiles=null,explosions=null,passiveMobs=null,hostileMobs=null,weatherSystem=null;
let running=false,paused=false,last=performance.now(),selectedTarget=null,lastSecond=0,frames=0,fps=0,worldInfo=null,lastAttackAt=-Infinity;
let saveDirty=false,saveInFlight=null,lastSaveAt=0,lastSavedPosition=null,gameTime=6000,weather='clear',totalXp=0;
let oxygenState=createOxygenState(),headSubmerged=false;
let deathState=null,respawnPoint=null,sessionKind=null,multiplayerMovement=null,multiplayerStarting=false;
const controlBus=new ControlIntentBus({
  onState:state=>{player?.setControlState(state);if(sessionKind==='multiplayer')multiplayerMovement?.setControl(state);},
  onLook:({yawDelta,pitchDelta})=>{if(canControl()&&player){player.applyLookIntent(yawDelta,pitchDelta);syncMultiplayerView();}},
  onPrimary:pressed=>{if(sessionKind==='multiplayer'){if(pressed&&canControl())ui.showToast('联机方块/战斗权威尚未接入，当前禁止本地攻击或破坏');return;}if(pressed)primaryActionStart();else primaryActionEnd();},
  onAction:intent=>handleControlIntent(intent)
});
const singleplayerMining=new SingleplayerMiningController({
  aim:()=>aim(),
  getMode:()=>player?.mode||'spectator',
  getSelectedStack:()=>ui.selectedItem(),
  breakTarget:broken=>breakSingleplayerBlock(broken),
  spawnDrop:(stack,broken)=>drops?.spawnStack(stack,new THREE.Vector3(broken.x+.5,broken.y+.6,broken.z+.5)),
  damageSelected:(expectedId,amount)=>{const result=inventory?.damageAt(HOTBAR_START+ui.selected,expectedId,amount)||{changed:false,broken:false,reason:'inventory-unavailable'};if(result.changed){markSaveDirty();if(result.broken)ui.showToast(`${ITEMS[expectedId]?.name||expectedId} 已损坏`);}return result;},
  onProgress:value=>ui.setBreak(value),
  onBreak:({block})=>{ui.showToast(`破坏 ${block.name}`);markSaveDirty();}
});

function modeScreen(name){ui.showScreen(name==='main'?ui.main:name==='world'?ui.worldMenu:name==='multiplayer'?ui.multiplayerMenu:name==='pause'?ui.pause:name==='death'?deathScreen.root:null);}
function controlActive(){return running&&!paused&&!deathState&&!ui.hasOpenPanel()&&!ui.isChatOpen();}
function pointer(){if(controlActive()&&!deviceProfile.mobile)canvas.requestPointerLock().catch(()=>{});}
function canControl(){const active=controlActive();return active&&(deviceProfile.mobile?deviceProfile.orientation==='landscape':document.pointerLockElement===canvas);}
function markSaveDirty(){if(sessionKind==='singleplayer')saveDirty=true;}
function syncMultiplayerView(){if(sessionKind==='multiplayer'&&player)multiplayerMovement?.setView({yaw:player.yaw,pitch:player.pitch});}
function setPlayerLook(yaw,pitch){if(!player)return false;player.setLook(yaw,pitch);syncMultiplayerView();return true;}
function clearPlayerInput(){controlBus.resetAll();player?.clearControlState?.();if(sessionKind==='multiplayer'){multiplayerMovement?.setControl(controlBus.snapshot());multiplayerMovement?.flush();}}
function syncControlAdapters(){const active=controlActive();desktopControls?.setGameplayEnabled(active&&!deviceProfile.mobile&&document.pointerLockElement===canvas);mobileControls?.setGameplayEnabled(active&&deviceProfile.mobile);}
function prepareSingleplayerMiningTarget(blockId=3){if(!e2eEnabled||sessionKind!=='singleplayer'||!world||!player||!BLOCKS[blockId])return null;player.spawn(Math.floor(player.position.x),Math.floor(player.position.z));player.setLook(0,0);const origin=player.eyePosition(new THREE.Vector3()),x=Math.floor(origin.x),y=Math.floor(origin.y),baseZ=Math.floor(origin.z);for(let offset=1;offset<=6;offset++)world.setBlock(x,y,baseZ-offset,0);const z=baseZ-1;if(!world.setBlock(x,y,z,blockId))return null;selectedTarget=null;singleplayerMining.cancel();return{x,y,z,id:blockId};}
if(e2eEnabled)Object.defineProperty(globalThis,'__minecraftE2E',{value:{setLook:setPlayerLook,prepareSingleplayerMiningTarget,multiplayer:()=>({sessionKind,state:multiplayerMovement?.state||null,ready:multiplayerMovement?.ready||false,worldId:worldInfo?.id||null,tick:multiplayerMovement?.current()?.tick??null}),singleplayerFurnace:()=>{const snapshot=singleplayerFurnace?.snapshot();return snapshot?{target:{...snapshot.target},revision:snapshot.revision,slots:snapshot.slots.map(stack=>stack?{...stack}:null),burnRemaining:snapshot.burnRemaining,burnTotal:snapshot.burnTotal,cookProgress:snapshot.cookProgress,cookTotal:snapshot.cookTotal,storedExperience:snapshot.storedExperience,lit:snapshot.lit}:null;},singleplayerFurnaceRecords:()=>singleplayerFurnace?.serialize().map(record=>structuredClone(record))||[],experienceTotal:()=>totalXp},configurable:true});
function setRespawnPoint(value){const point=normalizeRespawnPoint(value);if(!point)return false;respawnPoint=point;markSaveDirty();return true;}
function renderPlayerStatus(){if(!player)return;const xp=experienceState(totalXp);ui.renderStatus(player.hp,player.hunger,xp.progress*100,xp.level,equipment?.armorPoints()||0);}
function resetOxygen(){oxygenState=createOxygenState();headSubmerged=false;ui.renderOxygen(MAX_AIR_SECONDS,MAX_AIR_SECONDS,false);}
function isSafeRespawnPosition(value){
  const point=normalizeRespawnPoint(value);if(!point||!world||!player||point.y<0||point.y>WORLD_HEIGHT+2)return false;const x=Math.floor(point.x),z=Math.floor(point.z),below=BLOCKS[world.getBlock(x,Math.floor(point.y-.05),z)],feet=BLOCKS[world.getBlock(x,Math.floor(point.y+.05),z)],eye=BLOCKS[world.getBlock(x,Math.floor(point.y+player.eye),z)];if(!below?.solid||feet?.solid||feet?.liquid||eye?.solid||eye?.liquid)return false;return !player.collides(new THREE.Vector3(point.x,point.y,point.z));
}
function preferredRespawn(){return respawnPoint?resolveRespawnPosition(respawnPoint,isSafeRespawnPosition):null;}
async function respawnAtPreferredPoint(){
  if(respawnPoint&&world){await world.ensureReadyAround(respawnPoint.x,respawnPoint.z,1);const custom=preferredRespawn();if(custom&&player?.respawnAt(custom))return{custom:true,position:custom};}
  if(world)await world.ensureReadyAround(0,0,0);player?.respawn(0,0);return{custom:false,position:player?{x:player.position.x,y:player.position.y,z:player.position.z}:null};
}

function disposeWorld(){
  running=false;clearPlayerInput();const movement=multiplayerMovement;multiplayerMovement=null;multiplayerStarting=false;singleplayerFurnace?.dispose();singleplayerFurnace=null;sessionKind=null;try{movement?.close(1000,'leaving multiplayer world');}catch(error){console.warn('关闭多人连接失败',error);}deathState=null;deathScreen.hide();document.exitPointerLock?.();ui.closeChat();ui.inventory.classList.add('hidden');ui.workbench.classList.add('hidden');resetOxygen();ui.setBreak(0);
  gameplayRuntime?.dispose();gameplayRuntime=null;
  weatherSystem=null;explosions=null;projectiles=null;hostileMobs=null;passiveMobs=null;experienceOrbs=null;drops=null;player=null;world=null;inventory=null;equipment=null;worldInfo=null;respawnPoint=null;saveDirty=false;lastSavedPosition=null;lastAttackAt=-Infinity;totalXp=0;ui.setReturnMainLabel(false);
}

async function persistWorld(force=false){
  if(sessionKind!=='singleplayer'||!world||!player||!worldInfo||!inventory||!equipment)return;
  if(force)saveDirty=true;if(saveInFlight)return saveInFlight;if(!saveDirty)return;
  const drain=(async()=>{try{
    while(sessionKind==='singleplayer'&&world&&player&&worldInfo&&inventory&&equipment&&saveDirty){
      const record={id:worldInfo.id,name:worldInfo.name,seed:worldInfo.seed,prompt:worldInfo.prompt,mode:player.mode,updatedAt:Date.now(),player:player.snapshot(),inventory:inventory.snapshot(),equipment:equipment.snapshot(),edits:world.exportEdits(),furnaces:singleplayerFurnace?.serialize()||[],gameTime,weather,totalXp,respawnPoint:respawnPoint?{...respawnPoint}:null,terrainVersion:worldInfo.terrainVersion,version:SINGLEPLAYER_SAVE_VERSION};
      saveDirty=false;
      try{await storage.putWorld(record);lastSaveAt=performance.now();lastSavedPosition=player?.position.clone()||null;}
      catch(error){saveDirty=true;console.error('世界存档失败',error);ui.showToast('世界存档失败：IndexedDB 不可用');break;}
    }
  }finally{if(saveInFlight===drain)saveInFlight=null;}})();
  saveInFlight=drain;return drain;
}

function spawnOverflow(stacks){if(!drops||!player)return;const origin=player.position.clone().add(new THREE.Vector3(0,1,0));for(const stack of stacks)drops.spawnStack(stack,origin.clone());}

function drainDeathStacks(){
  if(!inventory)return[];singleplayerFurnace?.close('player-dead');const stacks=[...ui.craft2.drain(),...ui.craft3.drain(),...(equipment?.drain()||[]),...inventory.drain()];ui.inventory.classList.add('hidden');ui.workbench.classList.add('hidden');ui.closeChat();ui.refreshInventory();return stacks;
}

function beginPlayerDeath(reason='你死了'){
  if(sessionKind!=='singleplayer'||!player||deathState)return;
  const deathPosition=player.position.clone(),previousXp=totalXp,plan=deathLossPlan({mode:player.mode,totalXp:previousXp,position:deathPosition}),stacks=plan.losesInventory?drainDeathStacks():[];
  let detail=plan.losesInventory?'':'当前模式不会损失携带物品或经验。';
  if(plan.losesInventory){
    const itemCount=stacks.reduce((sum,stack)=>sum+stack.count,0);
    if(plan.recoverable){
      const origin=deathPosition.clone().add(new THREE.Vector3(0,.5,0));for(const stack of stacks)drops?.spawnStack(stack,origin.clone());if(plan.droppedXp>0)experienceOrbs?.spawn(plan.droppedXp,origin.clone().add(new THREE.Vector3(0,.2,0)));
      const parts=[];if(itemCount>0)parts.push(`${itemCount} 个物品`);if(plan.droppedXp>0)parts.push(`${plan.droppedXp} 点经验`);detail=parts.length?`${parts.join('、')}已掉落在死亡点。`:'没有可掉落的携带物品或经验。';
    }else detail=itemCount>0||previousXp>0?'虚空死亡使携带物品和经验无法回收。':'你掉出了世界边界。';
    if(plan.clearsExperience)totalXp=0;
  }
  clearPlayerInput();player.velocity.set(0,0,0);lastAttackAt=-Infinity;resetOxygen();document.exitPointerLock?.();ui.closeChat();renderPlayerStatus();
  deathState={reason,detail,position:{x:deathPosition.x,y:deathPosition.y,z:deathPosition.z},recoverable:plan.recoverable};deathScreen.set(reason,detail);modeScreen('death');markSaveDirty();void persistWorld(true);
}

async function completeRespawn(){
  if(sessionKind!=='singleplayer'||!player||!deathState||deathState.respawning)return;const activeDeath=deathState;activeDeath.respawning=true;ui.showToast('正在加载重生区域');const result=await respawnAtPreferredPoint();if(!player||deathState!==activeDeath)return;lastAttackAt=-Infinity;resetOxygen();deathState=null;deathScreen.hide();modeScreen(null);renderPlayerStatus();markSaveDirty();ui.showToast(result.custom?'已在自定义重生点重生':'已在世界出生点重生');pointer();
}

function protectedDamage(amount){return mitigateArmorDamage(amount,equipment?.armorPoints()||0);}

function handlePlayerHit({amount,source}){
  if(sessionKind!=='singleplayer'||!player||deathState)return;const result=player.takeDamage(protectedDamage(amount),performance.now(),source);if(!result.applied)return;markSaveDirty();renderPlayerStatus();if(result.dead)beginPlayerDeath();
}

function handlePlayerBlast({amount,source,knockback}){
  if(sessionKind!=='singleplayer'||!player||deathState)return;const result=player.takeDamage(protectedDamage(amount),performance.now(),null);if(!result.applied)return;
  if(source&&Number.isFinite(knockback)&&knockback>0)player.knockbackFrom(source.x,source.z,Math.max(.25,knockback),Math.min(.55,.18+knockback*.3));markSaveDirty();renderPlayerStatus();if(result.dead)beginPlayerDeath('你被爆炸击倒了');
}

function handleHostileProjectile({kind,damage,speed,source,target}){
  if(sessionKind!=='singleplayer'||kind!=='arrow'||!projectiles||!source||!target)return;projectiles.spawnArrow(new THREE.Vector3(source.x,source.y,source.z),new THREE.Vector3(target.x,target.y,target.z),{damage,speed,source});
}

function handleHostileExplosion({position,radius,damageRadius,maxDamage}){
  if(sessionKind!=='singleplayer'||!explosions||!position)return;explosions.explode(new THREE.Vector3(position.x,position.y,position.z),{radius,damageRadius,maxDamage,player});markSaveDirty();
}

function addExperience(value){
  if(sessionKind!=='singleplayer'||!Number.isFinite(value)||value<=0)return;const before=experienceState(totalXp);totalXp+=Math.floor(value);const after=experienceState(totalXp);renderPlayerStatus();markSaveDirty();if(after.level>before.level)ui.showToast(`经验等级提升至 ${after.level}`);
}

function handleMobDeath({type,position}){
  if(sessionKind!=='singleplayer'||!drops||!experienceOrbs||!position)return;const origin=new THREE.Vector3(position.x,position.y+.45,position.z);for(const stack of rollMobLoot(type))drops.spawn(stack.id,stack.count,origin.clone());const xp=rollMobXp(type);if(xp>0)experienceOrbs.spawn(xp,origin.clone().add(new THREE.Vector3(0,.18,0)));
}

async function startWorld(){
  disposeWorld();sessionKind='singleplayer';ui.setReturnMainLabel(false);const seed=document.querySelector('#world-seed').value||String(Date.now()),prompt=document.querySelector('#terrain-prompt').value,selectedMode=document.querySelector('#game-mode').value,name=document.querySelector('#world-name').value||'新的世界',id=worldIdFor(name,seed);let saved=null;
  try{saved=await storage.getWorld(id);}catch(error){console.warn('无法读取 IndexedDB 存档，将启动无持久化会话',error);}
  let terrainVersion;try{terrainVersion=resolveSingleplayerTerrainVersion(saved);}catch(error){console.error('世界地形版本不兼容',error);sessionKind=null;ui.showToast(`无法打开世界：${error?.message||error}`);modeScreen('world');return;}
  const mode=saved?.mode||selectedMode;worldInfo={id,seed:saved?.seed||seed,prompt:saved?.prompt||prompt,mode,name:saved?.name||name,terrainVersion};gameTime=Number.isFinite(saved?.gameTime)?saved.gameTime:6000;weather=saved?.weather||'clear';totalXp=Number.isFinite(saved?.totalXp)?Math.max(0,Math.floor(saved.totalXp)):0;respawnPoint=normalizeRespawnPoint(saved?.respawnPoint);
  const savedDead=Number.isFinite(saved?.player?.hp)&&saved.player.hp<=0,startPosition=savedDead?(respawnPoint||{x:0,z:0}):saved?.player?.position,centerX=Number.isFinite(startPosition?.x)?startPosition.x:0,centerZ=Number.isFinite(startPosition?.z)?startPosition.z:0;modeScreen(null);ui.showLoading(true,saved?'读取世界存档':'启动地形 Worker',2);
  gameplayRuntime=await createClientGameplayRuntime({scene,camera,canvas,seed:worldInfo.seed,prompt:worldInfo.prompt,terrainVersion:worldInfo.terrainVersion,renderDistance:3,savedEdits:saved?.edits||{},centerX,centerZ,mode,inventoryState:saved?.inventory||null,equipmentState:saved?.equipment||null,controlState:controlBus.snapshot(),weather,onWorldEdit:markSaveDirty,onWorldProgress:(done,total)=>ui.showLoading(true,`生成区块 ${done}/${total}`,total?Math.round(done/total*100):100),onInventoryPickup:()=>{ui.refreshInventory();markSaveDirty();},onExperience:addExperience,onPlayerHit:handlePlayerHit,onPlayerBlast:handlePlayerBlast,onMobDeath:handleMobDeath,onHostileProjectile:handleHostileProjectile,onHostileExplosion:handleHostileExplosion});
  ({world,player,inventory,equipment,drops,experienceOrbs,projectiles,explosions,passiveMobs,hostileMobs,weatherSystem}=gameplayRuntime);
  const restored=!savedDead&&saved?.player?player.restore(saved.player):false;if(!restored)player.spawn(centerX,centerZ);if(savedDead)await respawnAtPreferredPoint();resetOxygen();
  singleplayerFurnace=new SingleplayerFurnaceRuntime({world,inventory,getMode:()=>player?.mode||'spectator',onChanged:markSaveDirty,onExperience:addExperience,onDrop:(stack,target)=>drops?.spawnStack(stack,new THREE.Vector3(target.x+.5,target.y+.6,target.z+.5))});const furnaceRestore=singleplayerFurnace.restore(saved?.furnaces);
  const needsTerrainMetadataMigration=!!saved&&(saved.terrainVersion!==worldInfo.terrainVersion||saved.version!==SINGLEPLAYER_SAVE_VERSION);
  ui.bindInventory(inventory,{equipment,onChanged:()=>{markSaveDirty();renderPlayerStatus();},onOverflow:spawnOverflow});running=true;paused=false;saveDirty=!saved||needsTerrainMetadataMigration||furnaceRestore.discarded>0;lastSavedPosition=player.position.clone();lastAttackAt=-Infinity;ui.hud.classList.remove('hidden');ui.showLoading(false);renderPlayerStatus();applySky();ui.chatMessage('夜间敌对池包括僵尸、骷髅、苦力怕和蜘蛛；水下会消耗氧气；天气指令会切换降雨粒子。');ui.showToast(saved?'已从浏览器存档恢复世界':mode==='creative'?'创造模式':'生存模式');pointer();
}

function multiplayerStateText(state,detail){
  if(state==='connecting')return'正在建立 WebSocket 连接...';if(state==='handshaking')return'正在进行 minecraft-web-v1 协议握手...';if(state==='synchronizing')return'正在同步服务器世界信息与权威出生状态...';if(state==='ready')return'协议同步完成，正在生成服务器世界...';if(state==='failed')return`连接失败：${detail||'未知错误'}`;if(state==='closed')return`连接已关闭${detail?.reason?`：${detail.reason}`:''}`;return'未连接';
}
function handleMultiplayerState(movement,{state,detail}={}){
  if(movement!==multiplayerMovement)return;const failed=state==='failed'||state==='closed';ui.setMultiplayerStatus(multiplayerStateText(state,detail),{error:failed});if(failed){multiplayerStarting=false;if(sessionKind==='multiplayer'&&running)queueMicrotask(()=>disconnectMultiplayerToMenu(movement,state==='failed'?'服务器连接发生协议/网络错误':'服务器已断开连接'));}
}
function disconnectMultiplayerToMenu(movement,message){if(movement!==multiplayerMovement||sessionKind!=='multiplayer')return;disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);ui.setMultiplayerStatus(message,{error:true});modeScreen('multiplayer');}
async function startMultiplayerWorld(readyData,movement){
  if(movement!==multiplayerMovement||movement.state!=='ready')return;multiplayerStarting=true;modeScreen(null);ui.showLoading(true,'读取服务器世界信息',3);
  let created=null;
  try{created=await createAuthoritativeMultiplayerGameplay({readyData,movement,scene,camera,canvas,controlState:controlBus.snapshot(),onProgress:(done,total)=>ui.showLoading(true,`生成服务器区块 ${done}/${total}`,total?Math.round(done/total*100):100)});}catch(error){console.error('创建多人世界失败',error);if(movement===multiplayerMovement){multiplayerMovement=null;multiplayerStarting=false;try{movement.close(1011,'client world setup failed');}catch{}ui.showLoading(false);ui.setMultiplayerStatus(`无法创建服务器世界：${error.message||error}`,{error:true});modeScreen('multiplayer');}return;}
  if(movement!==multiplayerMovement||movement.state!=='ready'){created.runtime.dispose();return;}
  gameplayRuntime=created.runtime;({world,player,inventory,equipment,drops,experienceOrbs,projectiles,explosions,passiveMobs,hostileMobs,weatherSystem}=gameplayRuntime);worldInfo=created.worldInfo;sessionKind='multiplayer';gameTime=6000;weather='clear';totalXp=0;respawnPoint=null;saveDirty=false;lastSavedPosition=null;lastAttackAt=-Infinity;resetOxygen();
  ui.bindInventory(inventory,{equipment,onChanged:()=>{},onOverflow:()=>{}});multiplayerMovement.setControl(controlBus.snapshot());multiplayerMovement.setView({yaw:player.yaw,pitch:player.pitch});multiplayerMovement.flush();running=true;paused=false;multiplayerStarting=false;ui.setReturnMainLabel(true);ui.hud.classList.remove('hidden');ui.showLoading(false);ui.setMultiplayerStatus(`已连接世界 ${worldInfo.id} · ${worldInfo.tickRate} Hz`);renderPlayerStatus();applySky();ui.chatMessage('多人服务器已接管移动、普通方块交互、掉落物与背包状态；装备、合成、战斗和本地存档仍未接入。');ui.showToast('已进入服务器权威移动模式');pointer();
}
function connectMultiplayer(){
  if(multiplayerStarting)return;disposeWorld();ui.hud.classList.add('hidden');ui.setReturnMainLabel(false);modeScreen('multiplayer');const url=ui.multiplayerUrl?.value?.trim()||'';if(!url){ui.setMultiplayerStatus('请输入 WebSocket 服务器地址',{error:true});return;}
  let movement=null;movement=new MultiplayerMovementSession({allowInsecure:!!ui.multiplayerInsecure?.checked,onStateChange:event=>handleMultiplayerState(movement,event),onReady:data=>{void startMultiplayerWorld(data,movement);},onError:error=>{if(movement===multiplayerMovement)ui.setMultiplayerStatus(`连接错误：${error.message||error}`,{error:true});}});multiplayerMovement=movement;multiplayerStarting=true;ui.setMultiplayerStatus('准备连接...');
  try{movement.connect(url);}catch(error){if(movement===multiplayerMovement){multiplayerStarting=false;multiplayerMovement=null;try{movement.close(1000,'connection setup failed');}catch{}ui.setMultiplayerStatus(`无法连接：${error.message||error}`,{error:true});}}
}

function pauseGame(){if(!running||deathState)return;paused=true;clearPlayerInput();document.exitPointerLock?.();modeScreen('pause');persistWorld();}
function resume(){if(deathState)return;paused=false;modeScreen(null);pointer();}
function toggleInventory(){if(!running||paused||deathState||ui.isChatOpen())return;if(ui.hasOpenPanel()){ui.closePanels();pointer();}else{clearPlayerInput();document.exitPointerLock?.();ui.openInventory();}}
function openWorkbench(){if(sessionKind==='multiplayer'){ui.showToast('联机工作台权威尚未接入');return;}if(!running||paused||deathState)return;clearPlayerInput();document.exitPointerLock?.();ui.openWorkbench();}
function openFurnace(target){if(sessionKind!=='singleplayer'||!running||paused||deathState||!singleplayerFurnace)return false;clearPlayerInput();document.exitPointerLock?.();const result=singleplayerFurnace.open(target);if(!result.opened){ui.showToast(result.reason==='mode-invalid'?'当前模式无法使用熔炉':'熔炉已失效');pointer();return false;}return true;}
function cycleViewMode(){if(!running||!player)return;const view=player.cycleView();ui.showToast(['第一人称','第三人称背面','第三人称正面'][view]);markSaveDirty();}
function openChatInput(prefix=''){if(!running||paused||deathState||ui.hasOpenPanel())return;clearPlayerInput();document.exitPointerLock?.();ui.openChat(prefix);}

async function handleAction(action){
  if(action==='singleplayer')modeScreen('world');
  else if(action==='multiplayer'){ui.setMultiplayerStatus(multiplayerMovement?'连接处理中...':'未连接');modeScreen('multiplayer');}
  else if(action==='back-main'){if(multiplayerMovement&&!running)disposeWorld();modeScreen('main');}
  else if(action==='create-world')await startWorld();
  else if(action==='connect-multiplayer')connectMultiplayer();
  else if(action==='resume')resume();
  else if(action==='respawn')await completeRespawn();
  else if(action==='mobile-close-panel'){ui.closePanels();pointer();}
  else if(action==='mobile-close-chat'){ui.closeChat();pointer();}
  else if(action==='death-main'){ui.showLoading(true,'正在保存死亡结算',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}
  else if(action==='save-main'){if(sessionKind==='multiplayer'){ui.showLoading(true,'正在断开服务器',85);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}else{ui.showLoading(true,'正在写入浏览器存档',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}}
  else if(action==='options')ui.showToast('选项系统将在后续阶段接入');
  else if(action==='realms')ui.showToast('Realms 服务将在后续阶段接入');
  else if(action==='quit')ui.showToast('浏览器页面不能由网页强制关闭');
}
document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button)handleAction(button.dataset.action);});window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});document.addEventListener('pointerlockchange',syncControlAdapters);
function multiplayerUnsupported(message){ui.showToast(message);return false;}
function sendMultiplayerHotbar(){if(sessionKind==='multiplayer'&&multiplayerMovement?.ready)multiplayerMovement.sendHotbarSelect(ui.selected);}
function handleControlIntent({name,payload}={}){
  if(name==='focus'){pointer();return true;}if(deathState)return false;
  if(name==='escape'){if(ui.isChatOpen()){ui.closeChat();pointer();return true;}if(ui.hasOpenPanel()){ui.closePanels();pointer();return true;}if(running&&!paused){pauseGame();return true;}return false;}
  if(name==='pause'){if(running&&!paused){pauseGame();return true;}return false;}
  if(name==='inventory'){const allowed=running&&!paused&&!deathState&&!ui.isChatOpen();if(allowed)toggleInventory();return allowed;}
  if(name==='view'){if(!running)return false;cycleViewMode();return true;}
  if(name==='chat'){const allowed=running&&!paused&&!ui.hasOpenPanel();if(allowed)openChatInput(payload?.prefix||'');return allowed;}
  if(name==='drop'){if(sessionKind==='multiplayer')return multiplayerUnsupported('联机丢弃/物品权威尚未接入');if(!canControl())return false;dropSelected();return true;}
  if(name==='hotbar-select'){if(!running||!Number.isInteger(payload?.index)||payload.index<0||payload.index>8)return false;ui.select(payload.index);sendMultiplayerHotbar();return true;}
  if(name==='hotbar-step'){if(!running||ui.hasOpenPanel()||!Number.isFinite(payload?.step))return false;ui.select(ui.selected+(payload.step>0?1:-1));sendMultiplayerHotbar();return true;}
  if(name==='secondary'){if(sessionKind==='multiplayer')return multiplayerUnsupported('联机放置/使用权威尚未接入');if(!canControl())return false;secondaryAction();return true;}return false;
}
ui.chatInput.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();ui.closeChat();pointer();return;}if(e.key==='Enter'){e.preventDefault();const text=ui.chatInput.value;ui.closeChat();if(text.trim())runCommand(text);pointer();}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function primaryActionStart(){
  if(sessionKind==='multiplayer'){ui.showToast('联机方块/战斗权威尚未接入');return;}if(!canControl()||!player||player.mode==='spectator')return;const entityHit=aimEntity(),blockHit=aim();
  if(entityHit&&(!blockHit||entityHit.distance<=blockHit.distance)){const now=performance.now(),selected=ui.selectedItem(),profile=meleeProfile(selected?.id||null);singleplayerMining.cancel();selectedTarget=null;if(player.mode!=='creative'&&!canAttack(lastAttackAt,now,profile.attackIntervalMs))return;lastAttackAt=now;const damage=player.mode==='creative'?100:profile.damage,result=entityHit.system.hurt(entityHit.entity,damage,player.position,now);if(result?.applied&&player.mode!=='creative'&&selected&&profile.durabilityCost>0){const wear=inventory?.damageAt(HOTBAR_START+ui.selected,selected.id,profile.durabilityCost);if(wear?.changed){markSaveDirty();if(wear.broken)ui.showToast(`${ITEMS[selected.id]?.name||selected.id} 已损坏`);}}return;}
  if(player.mode!=='adventure')singleplayerMining.start(performance.now());
}
function primaryActionEnd(){singleplayerMining.cancel();selectedTarget=null;}
function secondaryAction(){
  if(sessionKind==='multiplayer'){ui.showToast('联机放置/使用权威尚未接入');return;}if(!canControl()||!player)return;const hit=aim();if(hit&&isBedBlock(hit.id)){if(player.mode!=='spectator')activateBed(hit);return;}if(hit?.id===9){openWorkbench();return;}if(hit?.id===BLOCK.FURNACE){openFurnace(hit);return;}if(player.mode==='spectator'||player.mode==='adventure'||!hit)return;const selected=ui.selectedItem(),def=ITEMS[selected?.id];
  const toolAction=resolveToolSecondaryAction({itemId:selected?.id,targetBlockId:hit.id,aboveBlockId:hit.y+1<WORLD_HEIGHT?world.getBlock(hit.x,hit.y+1,hit.z):BLOCK.AIR,faceY:toolActionFaceY(hit)});
  if(toolAction){if(world.setBlock(hit.x,hit.y,hit.z,toolAction.resultBlockId)){if(player.mode!=='creative'){const wear=inventory?.damageAt(HOTBAR_START+ui.selected,selected.id,toolAction.durabilityCost);if(wear?.changed&&wear.broken)ui.showToast(`${ITEMS[selected.id]?.name||selected.id} 已损坏`);}void playToolSecondaryActionSound(toolAction.kind,{volume:.8});const verb=toolAction.kind==='till'?'耕作':toolAction.kind==='strip'?'剥皮':'铲平';ui.showToast(`${verb} ${BLOCKS[hit.id]?.name||'方块'}`);markSaveDirty();}return;}
  if(def?.placeKind==='bed'){const plan=placeBed(hit.previous);if(!plan){ui.showToast('这里无法放置床');return;}if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();return;}if(!def?.blockId||def.blockId===8)return;const p=hit.previous;if(playerOccupies(p.x,p.y,p.z))return;if(world.setBlock(p.x,p.y,p.z,def.blockId)){if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearPlayerInput();persistWorld();}});window.addEventListener('beforeunload',()=>{try{multiplayerMovement?.close(1000,'page unload');}catch{}persistWorld();});

function playerOccupies(x,y,z){if(!player)return false;const minX=player.position.x-player.radius,maxX=player.position.x+player.radius,minY=player.position.y,maxY=player.position.y+player.height,minZ=player.position.z-player.radius,maxZ=player.position.z+player.radius;return x+1>minX&&x<maxX&&y+1>minY&&y<maxY&&z+1>minZ&&z<maxZ;}
function placeBed(cell){
  const plan=bedPlacement(cell,player?.lookDirection(new THREE.Vector3()));if(!plan)return null;
  for(const part of [plan.foot,plan.head])if(world.getBlock(part.x,part.y,part.z)!==0||playerOccupies(part.x,part.y,part.z))return null;
  if(!world.setBlock(plan.foot.x,plan.foot.y,plan.foot.z,plan.foot.id))return null;
  if(!world.setBlock(plan.head.x,plan.head.y,plan.head.z,plan.head.id)){world.setBlock(plan.foot.x,plan.foot.y,plan.foot.z,0);return null;}
  return plan;
}
function activateBed(hit){
  const anchor=bedRespawnAnchor(hit,hit?.id);if(!anchor||!setRespawnPoint(anchor))return false;
  const sleep=resolveSleep({gameTime,weather,sleepingPlayers:1,totalPlayers:1,percentage:100});
  if(!sleep.allowed){ui.showToast('重生点已设置 · 只能在夜晚或雷暴中睡觉');return true;}
  if(!sleep.ready){ui.showToast(`重生点已设置 · 已有 ${sleep.sleepingPlayers}/${sleep.required} 名玩家睡觉`);return true;}
  const blocker=hostileMobs?.sleepBlockerNear(anchor);if(blocker){ui.showToast('重生点已设置 · 附近有怪物，无法睡觉');return true;}
  gameTime=sleep.nextTime;if(weather!=='clear'){weather='clear';weatherSystem?.setWeather(weather);}applySky();markSaveDirty();ui.showToast('已睡到清晨 · 重生点已设置');return true;
}
function breakBed(broken){
  const partner=bedPartner(broken,broken?.id);if(!world.setBlock(broken.x,broken.y,broken.z,0))return false;
  if(partner&&world.getBlock(partner.x,partner.y,partner.z)===partner.id)world.setBlock(partner.x,partner.y,partner.z,0);return true;
}
function breakFurnace(broken){if(!world?.setBlock(broken.x,broken.y,broken.z,0))return false;singleplayerFurnace?.break(broken);return true;}
function breakSingleplayerBlock(broken){if(isBedBlock(broken?.id))return breakBed(broken);if(broken?.id===BLOCK.FURNACE)return breakFurnace(broken);return !!world?.setBlock(broken.x,broken.y,broken.z,0);}
function aim(){if(!player)return null;const dir=player.lookDirection(new THREE.Vector3()),origin=player.eyePosition(new THREE.Vector3());return world?.raycast(origin,dir,6);}
function aimEntity(){if(!player)return null;const dir=player.lookDirection(new THREE.Vector3()),origin=player.eyePosition(new THREE.Vector3()),hits=[];if(passiveMobs){const hit=passiveMobs.raycast(origin,dir,4.5);if(hit)hits.push({...hit,system:passiveMobs});}if(hostileMobs){const hit=hostileMobs.raycast(origin,dir,4.5);if(hit)hits.push({...hit,system:hostileMobs});}hits.sort((a,b)=>a.distance-b.distance);return hits[0]||null;}

function interaction(now){if(sessionKind!=='singleplayer'||!canControl()||!player){singleplayerMining.cancel();selectedTarget=null;return;}const state=singleplayerMining.step(now);selectedTarget=state.target;}
function dropSelected(){if(sessionKind==='multiplayer'){ui.showToast('联机丢弃/物品权威尚未接入');return;}const selected=ui.selectedItem();if(!selected||!drops||!player)return;const stack=player.mode==='creative'?{...selected,count:1}:ui.consumeSelected(1);if(!stack)return;const dir=player.lookDirection(new THREE.Vector3()),origin=player.eyePosition(new THREE.Vector3()).addScaledVector(dir,.55),velocity=dir.clone().multiplyScalar(4).add(new THREE.Vector3(0,1.5,0));drops.spawnStack(stack,origin,velocity);markSaveDirty();}
function updateSurvival(dt){if(player.mode!=='survival')return;player.saturation=Math.max(0,player.saturation-dt*.012);if(player.saturation===0)player.hunger=Math.max(0,player.hunger-dt*.007);if(player.hunger>=18&&player.hp<20)player.hp=Math.min(20,player.hp+dt*.08);renderPlayerStatus();}
function updateOxygen(dt,now){
  if(!player||!world||deathState)return;const eye=player.eyePosition(new THREE.Vector3()),id=world.getBlock(Math.floor(eye.x),Math.floor(eye.y),Math.floor(eye.z));headSubmerged=!!BLOCKS[id]?.liquid;
  const result=stepOxygen(oxygenState,{dt,submerged:headSubmerged,mode:player.mode});oxygenState=result.state;
  ui.renderOxygen(oxygenState.air,MAX_AIR_SECONDS,usesOxygen(player.mode)&&(headSubmerged||oxygenState.air<MAX_AIR_SECONDS));
  for(let i=0;i<result.damageEvents;i++){
    const hit=player.takeDamage(DROWN_DAMAGE,now,null);if(!hit.applied)continue;markSaveDirty();renderPlayerStatus();if(hit.dead){beginPlayerDeath('你溺水了');break;}
  }
}
function updateAutosave(now){if(sessionKind!=='singleplayer'||!player||!world)return;if(!lastSavedPosition||player.position.distanceToSquared(lastSavedPosition)>.5)saveDirty=true;if(saveDirty&&now-lastSaveAt>5000)persistWorld();}
function runCommand(text){if(sessionKind==='multiplayer'){ui.chatMessage('联机命令尚未服务端化，客户端命令已禁用','error');return;}const result=executeCommand(text,{player,inventory,inventoryChanged:()=>{ui.refreshInventory();markSaveDirty();},setMode:mode=>{player.setMode(mode);worldInfo.mode=mode;if(!usesOxygen(mode))resetOxygen();markSaveDirty();},setSpawnpoint:(x,y,z)=>setRespawnPoint({x,y,z}),summon:(type,x,y,z)=>!!hostileMobs?.spawn(type,{x,y,z}),addXp:value=>addExperience(value),kill:()=>{if(deathState)return;player.hp=0;player.velocity.set(0,0,0);beginPlayerDeath('你被杀死了');},teleport:(x,y,z)=>{player.position.set(x,y,z);player.velocity.set(0,0,0);world.ensureAround(x,z);player.syncCamera();markSaveDirty();},setTime:value=>{gameTime=value;applySky();markSaveDirty();},setWeather:value=>{weather=value;weatherSystem?.setWeather(value);applySky();markSaveDirty();}});ui.chatMessage(result.message,result.ok?'system':'error');}
function applySky(){const angle=(gameTime-6000)/24000*Math.PI*2,sunHeight=Math.cos(angle),daylight=Math.max(.08,Math.min(1,(sunHeight+.25)/1.25)),storm=weather==='clear'?1:weather==='rain' ? .72 : .55,night=new THREE.Color(0x061126),day=new THREE.Color(0x86bff2),color=night.clone().lerp(day,daylight*storm);scene.background=color;scene.fog.color.copy(color);hemi.intensity=.35+2.05*daylight*storm;sun.intensity=Math.max(0,2.2*daylight*storm);sun.position.set(Math.cos(angle)*100,Math.sin(Math.PI/2-angle)*110,45);}
function updateMultiplayer(dt){
  const movement=multiplayerMovement;if(!movement?.ready||!world||!player)return;movement.flush();const authoritative=movement.step(dt);if(authoritative){applyAuthoritativePlayerState(player,authoritative);if(worldInfo)worldInfo.mode=authoritative.mode;}world.ensureAround(player.position.x,player.position.z);selectedTarget=null;ui.setBreak(0);ui.renderOxygen(MAX_AIR_SECONDS,MAX_AIR_SECONDS,false);
  const current=movement.current(),p=player.position;ui.debug.textContent=`Minecraft Web By AI v0.4-dev\nFPS ${fps} · WebGL ${renderer.capabilities.isWebGL2?'2':'1'}\nXYZ ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}\nChunks ${world.chunks.size} · Meshes ${world.meshes.size} · MeshQ ${world.meshQueue.size}\nNetwork server-authoritative · ${worldInfo?.tickRate||20} Hz · Tick ${current?.tick??'-'}\nWorld ${worldInfo?.id||'-'} · Session ${worldInfo?.session||'-'}\n模式 ${player.mode} · Seed ${worldInfo?.seed}`;
}

function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;frames++;if(now-lastSecond>1000){fps=frames;frames=0;lastSecond=now;}syncControlAdapters();
  if(running&&!paused&&player&&!deathState){
    if(sessionKind==='multiplayer')updateMultiplayer(dt);
    else{
      if(!ui.hasOpenPanel()&&!ui.isChatOpen())player.update(dt);
      if(player.hp<=0)beginPlayerDeath(player.position.y<-10?'你掉入了虚空':'你死了');
      if(!deathState){
        world.ensureAround(player.position.x,player.position.z);interaction(now);updateSurvival(dt);updateOxygen(dt,now);
        if(!deathState){singleplayerFurnace?.update(dt);drops?.update(dt,player);experienceOrbs?.update(dt,player);passiveMobs?.update(dt,player);hostileMobs?.update(dt,player,gameTime);projectiles?.update(dt,player);explosions?.update(dt);weatherSystem?.update(dt,player);updateAutosave(now);gameTime=(gameTime+dt*20)%24000;applySky();}
        const p=player.position,xp=experienceState(totalXp),armor=equipment?.armorPoints()||0,air=oxygenState.air,weatherFx=weatherSystem?.activeCount||0,aimText=selectedTarget?`Aim ${selectedTarget.x}/${selectedTarget.y}/${selectedTarget.z} -> ${selectedTarget.previous.x}/${selectedTarget.previous.y}/${selectedTarget.previous.z}`:'Aim -';ui.debug.textContent=`Minecraft Web By AI v0.4-dev\nFPS ${fps} · WebGL ${renderer.capabilities.isWebGL2?'2':'1'}\nXYZ ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}\nChunks ${world.chunks.size} · Meshes ${world.meshes.size} · MeshQ ${world.meshQueue.size}\nPassive ${passiveMobs?.size||0} · Hostile ${hostileMobs?.size||0} · Projectiles ${projectiles?.size||0} · FX ${explosions?.size||0}\nWeatherFX ${weatherSystem?.type||weather}:${weatherFx}\n${aimText}\nDrops ${drops?.drops.length||0} · XPOrbs ${experienceOrbs?.size||0} · XP ${xp.total} / Lv.${xp.level}\nHP ${player.hp.toFixed(1)} · Armor ${armor} · Air ${air.toFixed(1)} · ${headSubmerged?'Submerged':'Dry'}\nTime ${Math.floor(gameTime)} · ${weather}\n模式 ${player.mode} · Seed ${worldInfo?.seed}`;
      }
    }
  }
  renderer.render(scene,camera);
}
desktopControls=new DesktopControls(canvas,controlBus);
mobileControls=new MobileControls(controlBus,{onProfile:profile=>{deviceProfile=profile;if(!profile.mobile)controlBus.resetSource('touch');syncControlAdapters();}});
requestAnimationFrame(animate);