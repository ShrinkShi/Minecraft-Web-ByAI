import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {VoxelWorld} from './world.js';
import {PlayerController} from './player.js';
import {UI} from './ui.js';
import {BLOCKS} from './blocks.js';

const canvas=document.querySelector('#game-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x86bff2);scene.fog=new THREE.Fog(0x86bff2,38,85);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,160);
const hemi=new THREE.HemisphereLight(0xbfe4ff,0x6a5a42,2.4);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff1c2,2.1);sun.position.set(80,120,60);scene.add(sun);
const ui=new UI();let world=null,player=null,running=false,paused=false,last=performance.now(),selectedTarget=null,breakStart=0,lastSecond=0,frames=0,fps=0,worldInfo=null;

function modeScreen(name){ui.showScreen(name==='main'?ui.main:name==='world'?ui.worldMenu:name==='pause'?ui.pause:null)}
function pointer(){if(running&&!paused&&ui.inventory.classList.contains('hidden'))canvas.requestPointerLock().catch(()=>{})}
function clearWorld(){running=false;document.exitPointerLock?.();player?.dispose();world?.dispose();player=null;world=null;for(const o of [...scene.children])if(o.userData.transient){scene.remove(o);o.geometry?.dispose();o.material?.dispose()}}
async function startWorld(){clearWorld();const seed=document.querySelector('#world-seed').value||String(Date.now()),prompt=document.querySelector('#terrain-prompt').value,mode=document.querySelector('#game-mode').value;worldInfo={seed,prompt,mode,name:document.querySelector('#world-name').value};modeScreen(null);ui.showLoading(true,'启动 Worker',2);world=new VoxelWorld(scene,{seed,prompt,renderDistance:2,onProgress:(done,total)=>ui.showLoading(true,`生成区块 ${done}/${total}`,Math.round(done/total*100))});await world.generateArea(0,0);player=new PlayerController(camera,canvas,world);player.setMode(mode);player.spawn(0,0);running=true;paused=false;ui.hud.classList.remove('hidden');ui.showLoading(false);ui.renderStatus(player.hp,player.hunger,0,0);ui.showToast(mode==='creative'?'创造模式':'生存模式');pointer()}

function pauseGame(){if(!running)return;paused=true;document.exitPointerLock?.();modeScreen('pause')}
function resume(){paused=false;modeScreen(null);pointer()}
function toggleInventory(){if(!running||paused)return;const opening=ui.inventory.classList.contains('hidden');ui.inventory.classList.toggle('hidden',!opening);if(opening)document.exitPointerLock?.();else pointer()}
function handleAction(action){if(action==='singleplayer')modeScreen('world');else if(action==='back-main')modeScreen('main');else if(action==='create-world')startWorld();else if(action==='resume')resume();else if(action==='save-main'){clearWorld();ui.hud.classList.add('hidden');modeScreen('main')}else if(action==='options')ui.showToast('选项系统将在下一阶段接入');else if(action==='multiplayer'||action==='realms')ui.showToast('网络层将在后续阶段接入');else if(action==='quit')ui.showToast('浏览器页面不能由网页强制关闭')}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)handleAction(b.dataset.action)});canvas.addEventListener('click',pointer);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)});
window.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Escape'){if(!ui.inventory.classList.contains('hidden')){ui.inventory.classList.add('hidden');pointer();return}if(running)pauseGame()}if(e.code==='KeyE')toggleInventory();if(/^Digit[1-9]$/.test(e.code))ui.select(Number(e.code.slice(-1))-1)});
canvas.addEventListener('wheel',e=>{if(running)ui.select(ui.selected+(e.deltaY>0?1:-1))},{passive:true});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{if(!running||paused||document.pointerLockElement!==canvas)return;if(e.button===0){breakStart=performance.now()}if(e.button===2){const hit=aim();if(!hit)return;const b=ui.selectedBlock();if(!b||b===8)return;const p=hit.previous;if(playerOccupies(p.x,p.y,p.z))return;world.setBlock(p.x,p.y,p.z,b);ui.showToast(`放置 ${BLOCKS[b].name}`)}});
window.addEventListener('mouseup',e=>{if(e.button===0){breakStart=0;ui.setBreak(0)}});
function playerOccupies(x,y,z){if(!player)return false;const minX=player.position.x-player.radius,maxX=player.position.x+player.radius,minY=player.position.y,maxY=player.position.y+player.height,minZ=player.position.z-player.radius,maxZ=player.position.z+player.radius;return x+1>minX&&x<maxX&&y+1>minY&&y<maxY&&z+1>minZ&&z<maxZ}
function aim(){const dir=new THREE.Vector3();camera.getWorldDirection(dir);return world?.raycast(camera.position,dir,6)}
function interaction(now){if(!running||paused||!player)return;selectedTarget=aim();if(!breakStart||!selectedTarget){ui.setBreak(0);return}const hardness=BLOCKS[selectedTarget.id]?.hardness||1,creative=player.mode==='creative',duration=creative?80:Math.max(160,hardness*420),p=(now-breakStart)/duration;ui.setBreak(Math.min(1,p));if(p>=1){world.setBlock(selectedTarget.x,selectedTarget.y,selectedTarget.z,0);ui.showToast(`破坏 ${BLOCKS[selectedTarget.id].name}`);breakStart=now+70}}
function updateSurvival(dt){if(player.mode!=='survival')return;player.saturation=Math.max(0,player.saturation-dt*.012);if(player.saturation===0)player.hunger=Math.max(0,player.hunger-dt*.007);if(player.hunger>=18&&player.hp<20)player.hp=Math.min(20,player.hp+dt*.08);ui.renderStatus(player.hp,player.hunger,0,0)}
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;frames++;if(now-lastSecond>1000){fps=frames;frames=0;lastSecond=now}if(running&&!paused&&player){player.update(dt);interaction(now);updateSurvival(dt);const p=player.position;ui.debug.textContent=`Minecraft Web By AI v0.1.0\nFPS ${fps} · WebGL ${renderer.capabilities.isWebGL2?'2':'1'}\nXYZ ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}\nChunks ${world.chunks.size} · Meshes ${world.meshes.size}\n模式 ${player.mode==='creative'?'创造':'生存'} · Seed ${worldInfo?.seed}`}
  renderer.render(scene,camera)}
requestAnimationFrame(animate);
