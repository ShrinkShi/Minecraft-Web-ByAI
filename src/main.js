import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {VoxelWorld} from './world.js';
import {PlayerController} from './player.js';
import {UI} from './ui.js';
import {BLOCKS} from './blocks.js';
import {ITEMS} from './items.js';
import {Inventory} from './inventory.js';
import {Equipment} from './equipment.js';
import {mitigateArmorDamage} from './armor-rules.js';
import {createOxygenState,stepOxygen,usesOxygen,MAX_AIR_SECONDS,DROWN_DAMAGE} from './oxygen-rules.js';
import {DropSystem} from './drops.js';
import {WorldStorage,worldIdFor} from './storage.js';
import {executeCommand} from './commands.js';
import {PassiveMobSystem} from './passive-mobs.js';
import {HostileMobSystem} from './hostile-mobs.js';
import {canAttack} from './combat.js';
import {ExperienceOrbSystem} from './experience-orbs.js';
import {experienceState} from './experience.js';
import {rollMobLoot,rollMobXp} from './mobs.js';
import {ProjectileSystem} from './projectiles.js';
import {ExplosionSystem} from './explosions.js';
import {WeatherSystem} from './weather-system.js';
import {deathLossPlan} from './death-rules.js';

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

const ui=new UI(),storage=new WorldStorage();
let world=null,player=null,inventory=null,equipment=null,drops=null,experienceOrbs=null,projectiles=null,explosions=null,passiveMobs=null,hostileMobs=null,weatherSystem=null;
let running=false,paused=false,last=performance.now(),selectedTarget=null,breakStart=0,lastSecond=0,frames=0,fps=0,worldInfo=null,lastAttackAt=-Infinity;
let saveDirty=false,saveInFlight=null,saveAgain=false,lastSaveAt=0,lastSavedPosition=null,gameTime=6000,weather='clear',totalXp=0;
let oxygenState=createOxygenState(),headSubmerged=false;

function modeScreen(name){ui.showScreen(name==='main'?ui.main:name==='world'?ui.worldMenu:name==='pause'?ui.pause:null);}
function pointer(){if(running&&!paused&&!ui.hasOpenPanel()&&!ui.isChatOpen())canvas.requestPointerLock().catch(()=>{});}
function canControl(){return running&&!paused&&!ui.hasOpenPanel()&&!ui.isChatOpen()&&document.pointerLockElement===canvas;}
function markSaveDirty(){saveDirty=true;}
function renderPlayerStatus(){if(!player)return;const xp=experienceState(totalXp);ui.renderStatus(player.hp,player.hunger,xp.progress*100,xp.level,equipment?.armorPoints()||0);}
function resetOxygen(){oxygenState=createOxygenState();headSubmerged=false;ui.renderOxygen(MAX_AIR_SECONDS,MAX_AIR_SECONDS,false);}

function disposeWorld(){
  running=false;document.exitPointerLock?.();ui.closeChat();ui.inventory.classList.add('hidden');ui.workbench.classList.add('hidden');resetOxygen();
  weatherSystem?.dispose();explosions?.dispose();projectiles?.dispose();hostileMobs?.dispose();passiveMobs?.dispose();experienceOrbs?.dispose();drops?.dispose();player?.dispose();world?.dispose();
  weatherSystem=null;explosions=null;projectiles=null;hostileMobs=null;passiveMobs=null;experienceOrbs=null;drops=null;player=null;world=null;inventory=null;equipment=null;worldInfo=null;saveDirty=false;lastSavedPosition=null;lastAttackAt=-Infinity;totalXp=0;
}

async function persistWorld(force=false){
  if(!world||!player||!worldInfo||!inventory||!equipment)return;
  if(saveInFlight){saveAgain=true;return saveInFlight;}if(!force&&!saveDirty)return;
  const record={id:worldInfo.id,name:worldInfo.name,seed:worldInfo.seed,prompt:worldInfo.prompt,mode:player.mode,updatedAt:Date.now(),player:player.snapshot(),inventory:inventory.snapshot(),equipment:equipment.snapshot(),edits:world.exportEdits(),gameTime,weather,totalXp,version:5};
  saveDirty=false;saveAgain=false;
  saveInFlight=storage.putWorld(record).then(()=>{lastSaveAt=performance.now();lastSavedPosition=player?.position.clone()||null;}).catch(error=>{saveDirty=true;console.error('世界存档失败',error);ui.showToast('世界存档失败：IndexedDB 不可用');}).finally(async()=>{saveInFlight=null;if(saveAgain&&world&&player)await persistWorld(true);});
  return saveInFlight;
}

function spawnOverflow(stacks){if(!drops||!player)return;const origin=player.position.clone().add(new THREE.Vector3(0,1,0));for(const stack of stacks)drops.spawn(stack.id,stack.count,origin.clone());}

function drainDeathStacks(){
  if(!inventory)return[];const stacks=[...ui.craft2.drain(),...ui.craft3.drain(),...(equipment?.drain()||[]),...inventory.drain()];ui.inventory.classList.add('hidden');ui.workbench.classList.add('hidden');ui.closeChat();ui.refreshInventory();return stacks;
}

function respawnPlayer(reason='你死了'){
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
}

function protectedDamage(amount){return mitigateArmorDamage(amount,equipment?.armorPoints()||0);}

function handlePlayerHit({amount,source}){
  if(!player)return;const result=player.takeDamage(protectedDamage(amount),performance.now(),source);if(!result.applied)return;markSaveDirty();renderPlayerStatus();if(result.dead)respawnPlayer();
}

function handlePlayerBlast({amount,source,knockback}){
  if(!player)return;const result=player.takeDamage(protectedDamage(amount),performance.now(),null);if(!result.applied)return;
  if(source&&Number.isFinite(knockback)&&knockback>0)player.knockbackFrom(source.x,source.z,Math.max(.25,knockback),Math.min(.55,.18+knockback*.3));markSaveDirty();renderPlayerStatus();if(result.dead)respawnPlayer('你被爆炸击倒了');
}

function handleHostileProjectile({kind,damage,speed,source,target}){
  if(kind!=='arrow'||!projectiles||!source||!target)return;projectiles.spawnArrow(new THREE.Vector3(source.x,source.y,source.z),new THREE.Vector3(target.x,target.y,target.z),{damage,speed,source});
}

function handleHostileExplosion({position,radius,damageRadius,maxDamage}){
  if(!explosions||!position)return;explosions.explode(new THREE.Vector3(position.x,position.y,position.z),{radius,damageRadius,maxDamage,player});markSaveDirty();
}

function addExperience(value){
  if(!Number.isFinite(value)||value<=0)return;const before=experienceState(totalXp);totalXp+=Math.floor(value);const after=experienceState(totalXp);renderPlayerStatus();markSaveDirty();if(after.level>before.level)ui.showToast(`经验等级提升至 ${after.level}`);
}

function handleMobDeath({type,position}){
  if(!drops||!experienceOrbs||!position)return;const origin=new THREE.Vector3(position.x,position.y+.45,position.z);for(const stack of rollMobLoot(type))drops.spawn(stack.id,stack.count,origin.clone());const xp=rollMobXp(type);if(xp>0)experienceOrbs.spawn(xp,origin.clone().add(new THREE.Vector3(0,.18,0)));
}

async function startWorld(){
  disposeWorld();const seed=document.querySelector('#world-seed').value||String(Date.now()),prompt=document.querySelector('#terrain-prompt').value,selectedMode=document.querySelector('#game-mode').value,name=document.querySelector('#world-name').value||'新的世界',id=worldIdFor(name,seed);let saved=null;
  try{saved=await storage.getWorld(id);}catch(error){console.warn('无法读取 IndexedDB 存档，将启动无持久化会话',error);}
  const mode=saved?.mode||selectedMode;worldInfo={id,seed:saved?.seed||seed,prompt:saved?.prompt||prompt,mode,name:saved?.name||name};gameTime=Number.isFinite(saved?.gameTime)?saved.gameTime:6000;weather=saved?.weather||'clear';totalXp=Number.isFinite(saved?.totalXp)?Math.max(0,Math.floor(saved.totalXp)):0;
  const startPosition=saved?.player?.position,centerX=Number.isFinite(startPosition?.x)?startPosition.x:0,centerZ=Number.isFinite(startPosition?.z)?startPosition.z:0;modeScreen(null);ui.showLoading(true,saved?'读取世界存档':'启动地形 Worker',2);
  world=new VoxelWorld(scene,{seed:worldInfo.seed,prompt:worldInfo.prompt,renderDistance:3,savedEdits:saved?.edits||{},onEdit:markSaveDirty,onProgress:(done,total)=>ui.showLoading(true,`生成区块 ${done}/${total}`,total?Math.round(done/total*100):100)});await world.generateArea(centerX,centerZ);
  inventory=new Inventory(mode,saved?.inventory||null);equipment=new Equipment(saved?.equipment||null);player=new PlayerController(camera,canvas,world,scene);player.setMode(mode);const restored=saved?.player?player.restore(saved.player):false;if(!restored)player.spawn(centerX,centerZ);if(player.hp<=0)player.respawn(0,0);resetOxygen();
  drops=new DropSystem(scene,world,inventory,()=>{ui.refreshInventory();markSaveDirty();});experienceOrbs=new ExperienceOrbSystem(scene,world,addExperience);projectiles=new ProjectileSystem(scene,world,{onPlayerHit:handlePlayerHit});explosions=new ExplosionSystem(scene,world,{onPlayerBlast:handlePlayerBlast});passiveMobs=new PassiveMobSystem(scene,world,{onDeath:handleMobDeath});hostileMobs=new HostileMobSystem(scene,world,{onPlayerHit:handlePlayerHit,onProjectile:handleHostileProjectile,onExplosion:handleHostileExplosion,onDeath:handleMobDeath});weatherSystem=new WeatherSystem(scene);weatherSystem.setWeather(weather);
  ui.bindInventory(inventory,{equipment,onChanged:()=>{markSaveDirty();renderPlayerStatus();},onOverflow:spawnOverflow});running=true;paused=false;saveDirty=!saved;lastSavedPosition=player.position.clone();lastAttackAt=-Infinity;ui.hud.classList.remove('hidden');ui.showLoading(false);renderPlayerStatus();applySky();ui.chatMessage('夜间敌对池包括僵尸、骷髅、苦力怕和蜘蛛；水下会消耗氧气；天气指令会切换降雨粒子。');ui.showToast(saved?'已从浏览器存档恢复世界':mode==='creative'?'创造模式':'生存模式');pointer();
}

function pauseGame(){if(!running)return;paused=true;player?.keys.clear();document.exitPointerLock?.();modeScreen('pause');persistWorld();}
function resume(){paused=false;modeScreen(null);pointer();}
function toggleInventory(){if(!running||paused||ui.isChatOpen())return;if(ui.hasOpenPanel()){ui.closePanels();pointer();}else{player.keys.clear();document.exitPointerLock?.();ui.openInventory();}}
function openWorkbench(){if(!running||paused)return;player.keys.clear();document.exitPointerLock?.();ui.openWorkbench();}

async function handleAction(action){
  if(action==='singleplayer')modeScreen('world');else if(action==='back-main')modeScreen('main');else if(action==='create-world')await startWorld();else if(action==='resume')resume();else if(action==='save-main'){ui.showLoading(true,'正在写入浏览器存档',85);await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');}else if(action==='options')ui.showToast('选项系统将在后续阶段接入');else if(action==='multiplayer'||action==='realms')ui.showToast('网络层将在后续阶段接入');else if(action==='quit')ui.showToast('浏览器页面不能由网页强制关闭');
}

document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button)handleAction(button.dataset.action);});canvas.addEventListener('click',pointer);window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});
window.addEventListener('keydown',e=>{if(ui.isChatOpen()||e.repeat)return;if(e.code==='Escape'){if(ui.hasOpenPanel()){ui.closePanels();pointer();return;}if(running)pauseGame();}if(e.code==='KeyE')toggleInventory();if(e.code==='F5'&&running){e.preventDefault();const view=player.cycleView();ui.showToast(['第一人称','第三人称背面','第三人称正面'][view]);markSaveDirty();}if((e.code==='KeyT'||e.code==='Slash')&&running&&!paused&&!ui.hasOpenPanel()){e.preventDefault();player.keys.clear();document.exitPointerLock?.();ui.openChat(e.code==='Slash'?'/':'');}if(e.code==='KeyQ'&&canControl())dropSelected();if(/^Digit[1-9]$/.test(e.code)&&running)ui.select(Number(e.code.slice(-1))-1);});
ui.chatInput.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();ui.closeChat();pointer();return;}if(e.key==='Enter'){e.preventDefault();const text=ui.chatInput.value;ui.closeChat();if(text.trim())runCommand(text);pointer();}});
canvas.addEventListener('wheel',e=>{if(running&&!ui.hasOpenPanel())ui.select(ui.selected+(e.deltaY>0?1:-1));},{passive:true});canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{if(!canControl())return;if(e.button===0&&player.mode!=='spectator'){const entityHit=aimEntity(),blockHit=aim();if(entityHit&&(!blockHit||entityHit.distance<=blockHit.distance)){const now=performance.now();breakStart=0;ui.setBreak(0);if(player.mode!=='creative'&&!canAttack(lastAttackAt,now))return;lastAttackAt=now;const selected=ui.selectedItem(),damage=player.mode==='creative'?100:(ITEMS[selected?.id]?.attackDamage||1);entityHit.system.hurt(entityHit.entity,damage,player.position,now);return;}if(player.mode!=='adventure')breakStart=performance.now();}if(e.button===2){const hit=aim();if(hit?.id===9){openWorkbench();return;}if(player.mode==='spectator'||player.mode==='adventure'||!hit)return;const selected=ui.selectedItem(),def=ITEMS[selected?.id];if(!def?.blockId||def.blockId===8)return;const p=hit.previous;if(playerOccupies(p.x,p.y,p.z))return;if(world.setBlock(p.x,p.y,p.z,def.blockId)){if(player.mode!=='creative')ui.consumeSelected(1);ui.showToast(`放置 ${def.name}`);markSaveDirty();}}});
window.addEventListener('mouseup',e=>{if(e.button===0){breakStart=0;ui.setBreak(0);}});document.addEventListener('visibilitychange',()=>{if(document.hidden)persistWorld();});window.addEventListener('beforeunload',()=>{persistWorld();});

function playerOccupies(x,y,z){if(!player)return false;const minX=player.position.x-player.radius,maxX=player.position.x+player.radius,minY=player.position.y,maxY=player.position.y+player.height,minZ=player.position.z-player.radius,maxZ=player.position.z+player.radius;return x+1>minX&&x<maxX&&y+1>minY&&y<maxY&&z+1>minZ&&z<maxZ;}
function aim(){if(!player)return null;const dir=player.lookDirection(new THREE.Vector3()),origin=player.eyePosition(new THREE.Vector3());return world?.raycast(origin,dir,6);}
function aimEntity(){if(!player)return null;const dir=player.lookDirection(new THREE.Vector3()),origin=player.eyePosition(new THREE.Vector3()),hits=[];if(passiveMobs){const hit=passiveMobs.raycast(origin,dir,4.5);if(hit)hits.push({...hit,system:passiveMobs});}if(hostileMobs){const hit=hostileMobs.raycast(origin,dir,4.5);if(hit)hits.push({...hit,system:hostileMobs});}hits.sort((a,b)=>a.distance-b.distance);return hits[0]||null;}

function toolMultiplier(blockId){const block=BLOCKS[blockId],selected=ui.selectedItem(),tool=ITEMS[selected?.id]?.tool;if(!tool)return 1;if(block?.requires===tool.kind)return 2.5*tool.speed;return 1.2;}
function canHarvest(blockId){const block=BLOCKS[blockId];if(!block?.requires)return true;return ITEMS[ui.selectedItem()?.id]?.tool?.kind===block.requires;}
function interaction(now){if(!canControl()||!player||player.mode==='spectator'||player.mode==='adventure'){ui.setBreak(0);return;}selectedTarget=aim();if(!breakStart||!selectedTarget){ui.setBreak(0);return;}const block=BLOCKS[selectedTarget.id],hardness=block?.hardness||1,creative=player.mode==='creative',duration=creative?70:Math.max(120,hardness*900/toolMultiplier(selectedTarget.id)),progress=(now-breakStart)/duration;ui.setBreak(Math.min(1,progress));if(progress>=1){const broken={...selectedTarget};if(world.setBlock(broken.x,broken.y,broken.z,0)){if(player.mode!=='creative'&&canHarvest(broken.id)&&block?.drops)drops.spawn(block.drops,1,new THREE.Vector3(broken.x+.5,broken.y+.6,broken.z+.5));ui.showToast(`破坏 ${block.name}`);markSaveDirty();}breakStart=now+70;}}
function dropSelected(){const selected=ui.selectedItem();if(!selected||!drops||!player)return;const stack=player.mode==='creative'?{id:selected.id,count:1}:ui.consumeSelected(1);if(!stack)return;const dir=player.lookDirection(new THREE.Vector3()),origin=player.eyePosition(new THREE.Vector3()).addScaledVector(dir,.55),velocity=dir.clone().multiplyScalar(4).add(new THREE.Vector3(0,1.5,0));drops.spawn(stack.id,stack.count,origin,velocity);markSaveDirty();}
function updateSurvival(dt){if(player.mode!=='survival')return;player.saturation=Math.max(0,player.saturation-dt*.012);if(player.saturation===0)player.hunger=Math.max(0,player.hunger-dt*.007);if(player.hunger>=18&&player.hp<20)player.hp=Math.min(20,player.hp+dt*.08);renderPlayerStatus();}
function updateOxygen(dt,now){
  if(!player||!world)return;const eye=player.eyePosition(new THREE.Vector3()),id=world.getBlock(Math.floor(eye.x),Math.floor(eye.y),Math.floor(eye.z));headSubmerged=!!BLOCKS[id]?.liquid;
  const result=stepOxygen(oxygenState,{dt,submerged:headSubmerged,mode:player.mode});oxygenState=result.state;
  ui.renderOxygen(oxygenState.air,MAX_AIR_SECONDS,usesOxygen(player.mode)&&(headSubmerged||oxygenState.air<MAX_AIR_SECONDS));
  for(let i=0;i<result.damageEvents;i++){
    const hit=player.takeDamage(DROWN_DAMAGE,now,null);if(!hit.applied)continue;markSaveDirty();renderPlayerStatus();if(hit.dead){respawnPlayer('你溺水了');break;}
  }
}
function updateAutosave(now){if(!player||!world)return;if(!lastSavedPosition||player.position.distanceToSquared(lastSavedPosition)>.5)saveDirty=true;if(saveDirty&&now-lastSaveAt>5000)persistWorld();}
function runCommand(text){const result=executeCommand(text,{player,inventory,inventoryChanged:()=>{ui.refreshInventory();markSaveDirty();},setMode:mode=>{player.setMode(mode);worldInfo.mode=mode;if(!usesOxygen(mode))resetOxygen();markSaveDirty();},teleport:(x,y,z)=>{player.position.set(x,y,z);player.velocity.set(0,0,0);world.ensureAround(x,z);player.syncCamera();markSaveDirty();},setTime:value=>{gameTime=value;applySky();markSaveDirty();},setWeather:value=>{weather=value;weatherSystem?.setWeather(value);applySky();markSaveDirty();}});ui.chatMessage(result.message,result.ok?'system':'error');}
function applySky(){const angle=(gameTime-6000)/24000*Math.PI*2,sunHeight=Math.cos(angle),daylight=Math.max(.08,Math.min(1,(sunHeight+.25)/1.25)),storm=weather==='clear'?1:weather==='rain' ? .72 : .55,night=new THREE.Color(0x061126),day=new THREE.Color(0x86bff2),color=night.clone().lerp(day,daylight*storm);scene.background=color;scene.fog.color.copy(color);hemi.intensity=.35+2.05*daylight*storm;sun.intensity=Math.max(0,2.2*daylight*storm);sun.position.set(Math.cos(angle)*100,Math.sin(Math.PI/2-angle)*110,45);}

function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;frames++;if(now-lastSecond>1000){fps=frames;frames=0;lastSecond=now;}
  if(running&&!paused&&player){if(!ui.hasOpenPanel()&&!ui.isChatOpen())player.update(dt);if(player.hp<=0)respawnPlayer('你死了');world.ensureAround(player.position.x,player.position.z);interaction(now);updateSurvival(dt);updateOxygen(dt,now);drops?.update(dt,player);experienceOrbs?.update(dt,player);passiveMobs?.update(dt,player);hostileMobs?.update(dt,player,gameTime);projectiles?.update(dt,player);explosions?.update(dt);weatherSystem?.update(dt,player);updateAutosave(now);gameTime=(gameTime+dt*20)%24000;applySky();const p=player.position,xp=experienceState(totalXp),armor=equipment?.armorPoints()||0,air=oxygenState.air,weatherFx=weatherSystem?.activeCount||0;ui.debug.textContent=`Minecraft Web By AI v0.4-dev\nFPS ${fps} · WebGL ${renderer.capabilities.isWebGL2?'2':'1'}\nXYZ ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}\nChunks ${world.chunks.size} · Meshes ${world.meshes.size} · MeshQ ${world.meshQueue.size}\nPassive ${passiveMobs?.size||0} · Hostile ${hostileMobs?.size||0} · Projectiles ${projectiles?.size||0} · FX ${explosions?.size||0}\nWeatherFX ${weatherSystem?.type||weather}:${weatherFx}\nDrops ${drops?.drops.length||0} · XPOrbs ${experienceOrbs?.size||0} · XP ${xp.total} / Lv.${xp.level}\nHP ${player.hp.toFixed(1)} · Armor ${armor} · Air ${air.toFixed(1)} · ${headSubmerged?'Submerged':'Dry'}\nTime ${Math.floor(gameTime)} · ${weather}\n模式 ${player.mode} · Seed ${worldInfo?.seed}`;}
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);
