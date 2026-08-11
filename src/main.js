import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {VoxelWorld} from './world.js';
import {PlayerController} from './player.js';
import {UI} from './ui.js';
import {BLOCKS} from './blocks.js';
import {WorldStorage,worldIdFor} from './storage.js';

const canvas=document.querySelector('#game-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x86bff2);scene.fog=new THREE.Fog(0x86bff2,48,110);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,180);
const hemi=new THREE.HemisphereLight(0xbfe4ff,0x6a5a42,2.4);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1c2,2.1);sun.position.set(80,120,60);scene.add(sun);
const ui=new UI();
const storage=new WorldStorage();
let world=null,player=null,running=false,paused=false,last=performance.now(),selectedTarget=null,breakStart=0,lastSecond=0,frames=0,fps=0,worldInfo=null;
let saveDirty=false,saveInFlight=null,saveAgain=false,lastSaveAt=0,lastSavedPosition=null;

function modeScreen(name){ui.showScreen(name==='main'?ui.main:name==='world'?ui.worldMenu:name==='pause'?ui.pause:null);}
function pointer(){if(running&&!paused&&ui.inventory.classList.contains('hidden'))canvas.requestPointerLock().catch(()=>{});}

function disposeWorld(){
  running=false;document.exitPointerLock?.();player?.dispose();world?.dispose();
  player=null;world=null;worldInfo=null;saveDirty=false;lastSavedPosition=null;
}

function markSaveDirty(){saveDirty=true;}

async function persistWorld(force=false){
  if(!world||!player||!worldInfo)return;
  if(saveInFlight){saveAgain=true;return saveInFlight;}
  if(!force&&!saveDirty)return;
  const record={
    id:worldInfo.id,name:worldInfo.name,seed:worldInfo.seed,prompt:worldInfo.prompt,mode:player.mode,
    updatedAt:Date.now(),player:player.snapshot(),edits:world.exportEdits(),version:2
  };
  saveDirty=false;saveAgain=false;
  saveInFlight=storage.putWorld(record)
    .then(()=>{lastSaveAt=performance.now();lastSavedPosition=player?.position.clone()||null;})
    .catch(error=>{saveDirty=true;console.error('世界存档失败',error);ui.showToast('世界存档失败：IndexedDB 不可用');})
    .finally(async()=>{
      saveInFlight=null;
      if(saveAgain&&world&&player)await persistWorld(true);
    });
  return saveInFlight;
}

async function startWorld(){
  disposeWorld();
  const seed=document.querySelector('#world-seed').value||String(Date.now());
  const prompt=document.querySelector('#terrain-prompt').value;
  const selectedMode=document.querySelector('#game-mode').value;
  const name=document.querySelector('#world-name').value||'新的世界';
  const id=worldIdFor(name,seed);
  let saved=null;
  try{saved=await storage.getWorld(id);}catch(error){console.warn('无法读取 IndexedDB 存档，将启动无持久化会话',error);}
  const mode=saved?.mode||selectedMode;
  worldInfo={id,seed:saved?.seed||seed,prompt:saved?.prompt||prompt,mode,name:saved?.name||name};
  const startPosition=saved?.player?.position;
  const centerX=Number.isFinite(startPosition?.x)?startPosition.x:0;
  const centerZ=Number.isFinite(startPosition?.z)?startPosition.z:0;
  modeScreen(null);ui.showLoading(true,saved?'读取世界存档':'启动地形 Worker',2);
  world=new VoxelWorld(scene,{
    seed:worldInfo.seed,prompt:worldInfo.prompt,renderDistance:3,savedEdits:saved?.edits||{},
    onEdit:markSaveDirty,
    onProgress:(done,total)=>ui.showLoading(true,`生成区块 ${done}/${total}`,total?Math.round(done/total*100):100)
  });
  await world.generateArea(centerX,centerZ);
  player=new PlayerController(camera,canvas,world);player.setMode(mode);
  const restored=saved?.player?player.restore(saved.player):false;
  if(!restored)player.spawn(centerX,centerZ);
  running=true;paused=false;saveDirty=!saved;lastSavedPosition=player.position.clone();
  ui.hud.classList.remove('hidden');ui.showLoading(false);ui.renderStatus(player.hp,player.hunger,0,0);
  ui.showToast(saved?'已从浏览器存档恢复世界':mode==='creative'?'创造模式':'生存模式');
  pointer();
}

function pauseGame(){if(!running)return;paused=true;document.exitPointerLock?.();modeScreen('pause');persistWorld();}
function resume(){paused=false;modeScreen(null);pointer();}
function toggleInventory(){if(!running||paused)return;const opening=ui.inventory.classList.contains('hidden');ui.inventory.classList.toggle('hidden',!opening);if(opening)document.exitPointerLock?.();else pointer();}

async function handleAction(action){
  if(action==='singleplayer')modeScreen('world');
  else if(action==='back-main')modeScreen('main');
  else if(action==='create-world')await startWorld();
  else if(action==='resume')resume();
  else if(action==='save-main'){
    ui.showLoading(true,'正在写入浏览器存档',85);
    await persistWorld(true);disposeWorld();ui.hud.classList.add('hidden');ui.showLoading(false);modeScreen('main');
  }else if(action==='options')ui.showToast('选项系统将在后续阶段接入');
  else if(action==='multiplayer'||action==='realms')ui.showToast('网络层将在后续阶段接入');
  else if(action==='quit')ui.showToast('浏览器页面不能由网页强制关闭');
}

document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button)handleAction(button.dataset.action);});
canvas.addEventListener('click',pointer);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});
window.addEventListener('keydown',e=>{
  if(e.repeat)return;
  if(e.code==='Escape'){
    if(!ui.inventory.classList.contains('hidden')){ui.inventory.classList.add('hidden');pointer();return;}
    if(running)pauseGame();
  }
  if(e.code==='KeyE')toggleInventory();
  if(/^Digit[1-9]$/.test(e.code))ui.select(Number(e.code.slice(-1))-1);
});
canvas.addEventListener('wheel',e=>{if(running)ui.select(ui.selected+(e.deltaY>0?1:-1));},{passive:true});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{
  if(!running||paused||document.pointerLockElement!==canvas)return;
  if(e.button===0)breakStart=performance.now();
  if(e.button===2){
    const hit=aim();if(!hit)return;
    const block=ui.selectedBlock();if(!block||block===8)return;
    const p=hit.previous;if(playerOccupies(p.x,p.y,p.z))return;
    if(world.setBlock(p.x,p.y,p.z,block))ui.showToast(`放置 ${BLOCKS[block].name}`);
  }
});
window.addEventListener('mouseup',e=>{if(e.button===0){breakStart=0;ui.setBreak(0);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistWorld();});
window.addEventListener('beforeunload',()=>{persistWorld();});

function playerOccupies(x,y,z){
  if(!player)return false;
  const minX=player.position.x-player.radius,maxX=player.position.x+player.radius,minY=player.position.y,maxY=player.position.y+player.height,minZ=player.position.z-player.radius,maxZ=player.position.z+player.radius;
  return x+1>minX&&x<maxX&&y+1>minY&&y<maxY&&z+1>minZ&&z<maxZ;
}

function aim(){const dir=new THREE.Vector3();camera.getWorldDirection(dir);return world?.raycast(camera.position,dir,6);}

function interaction(now){
  if(!running||paused||!player)return;
  selectedTarget=aim();
  if(!breakStart||!selectedTarget){ui.setBreak(0);return;}
  const hardness=BLOCKS[selectedTarget.id]?.hardness||1,creative=player.mode==='creative';
  const duration=creative?80:Math.max(160,hardness*420),progress=(now-breakStart)/duration;
  ui.setBreak(Math.min(1,progress));
  if(progress>=1){
    if(world.setBlock(selectedTarget.x,selectedTarget.y,selectedTarget.z,0))ui.showToast(`破坏 ${BLOCKS[selectedTarget.id].name}`);
    breakStart=now+70;
  }
}

function updateSurvival(dt){
  if(player.mode!=='survival')return;
  player.saturation=Math.max(0,player.saturation-dt*.012);
  if(player.saturation===0)player.hunger=Math.max(0,player.hunger-dt*.007);
  if(player.hunger>=18&&player.hp<20)player.hp=Math.min(20,player.hp+dt*.08);
  ui.renderStatus(player.hp,player.hunger,0,0);
}

function updateAutosave(now){
  if(!player||!world)return;
  if(!lastSavedPosition||player.position.distanceToSquared(lastSavedPosition)>.5)saveDirty=true;
  if(saveDirty&&now-lastSaveAt>5000)persistWorld();
}

function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min((now-last)/1000,.05);last=now;frames++;
  if(now-lastSecond>1000){fps=frames;frames=0;lastSecond=now;}
  if(running&&!paused&&player){
    player.update(dt);world.ensureAround(player.position.x,player.position.z);interaction(now);updateSurvival(dt);updateAutosave(now);
    const p=player.position;
    ui.debug.textContent=`Minecraft Web By AI v0.2.0\nFPS ${fps} · WebGL ${renderer.capabilities.isWebGL2?'2':'1'}\nXYZ ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}\nChunks ${world.chunks.size} · Meshes ${world.meshes.size} · MeshQ ${world.meshQueue.size}\n模式 ${player.mode==='creative'?'创造':'生存'} · Seed ${worldInfo?.seed}`;
  }
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);
