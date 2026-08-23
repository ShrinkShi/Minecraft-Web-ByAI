import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {FirstPersonViewModel} from './first-person-player-presentation.js';
import {ITEMS} from './items.js';
import {gameAudioSnapshot,playGameSound,unlockGameAudio} from './audio-system.js';
import {subscribeFirstPersonActions,subscribeFirstPersonUseState} from './first-person-action-channel.js';
import {GAMEPLAY_KEY_LOCK_CODES,isEditableGameplayTarget,shouldSuppressBrowserShortcut} from './immersive-shell-rules.js';

export {GAMEPLAY_KEY_LOCK_CODES,shouldSuppressBrowserShortcut};

let installed=null;
function hasBrowserDom(){return typeof document!=='undefined'&&typeof window!=='undefined'&&typeof document.querySelector==='function';}
function itemIdFromHotbar(hotbar){const selected=hotbar?.querySelector?.('.hotbar-slot.selected');if(!selected)return null;const name=String(selected.title||'').split('\n')[0];if(!name)return null;for(const[id,def]of Object.entries(ITEMS))if(def?.name===name)return id;return null;}
export function triggerFirstPersonAttack(){if(!installed)return false;installed.viewModel.triggerAttack();playGameSound('swing',{minIntervalMs:35});return true;}
export function triggerFirstPersonUse(){if(!installed)return false;installed.viewModel.triggerUse();playGameSound('use',{minIntervalMs:45});return true;}

export function installImmersiveGameShell(canvas){
  if(!canvas||!hasBrowserDom())return()=>{};if(installed){installed.refs++;return()=>installed.release();}
  const hud=document.querySelector('#hud'),debug=document.querySelector('#debug'),hotbar=document.querySelector('#hotbar');if(!hud||!debug||!hotbar)return()=>{};debug.classList.add('hidden');let debugVisible=false;
  const gameFocused=()=>!hud.classList.contains('hidden')&&!document.querySelector('.screen.active')&&!document.querySelector('.inventory:not(.hidden)')&&document.querySelector('#chat-input-wrap')?.classList.contains('hidden')!==false;
  const desktopPointer=()=>typeof matchMedia!=='function'||!matchMedia('(pointer: coarse)').matches;

  const viewCanvas=document.createElement('canvas');viewCanvas.id='first-person-viewmodel-canvas';viewCanvas.setAttribute('aria-hidden','true');Object.assign(viewCanvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'3'});hud.prepend(viewCanvas);
  const viewRenderer=new THREE.WebGLRenderer({canvas:viewCanvas,alpha:true,antialias:false,powerPreference:'high-performance'});viewRenderer.setClearColor(0x000000,0);viewRenderer.outputColorSpace=THREE.SRGBColorSpace;const viewModel=new FirstPersonViewModel();let frame=0,lastFrame=performance.now();
  const releaseActions=subscribeFirstPersonActions(kind=>{if(kind==='attack')triggerFirstPersonAttack();else if(kind==='use')triggerFirstPersonUse();});
  const releaseUseState=subscribeFirstPersonUseState(state=>viewModel.setFoodUseState(state));
  function resizeViewModel(){const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);viewRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));viewRenderer.setSize(width,height,false);viewModel.resize(width,height);}
  function renderViewModel(now){const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;const visible=gameFocused()&&(canvas.dataset.viewMode??'0')==='0';viewModel.update(dt,{visible,itemId:itemIdFromHotbar(hotbar)});viewRenderer.clear(true,true,true);if(visible)viewModel.render(viewRenderer);viewCanvas.style.display=visible?'block':'none';frame=requestAnimationFrame(renderViewModel);}
  resizeViewModel();frame=requestAnimationFrame(renderViewModel);

  async function lockKeyboard(){if(!gameFocused()||!desktopPointer())return false;const keyboard=globalThis.navigator?.keyboard;if(!keyboard||typeof keyboard.lock!=='function')return false;try{await keyboard.lock([...GAMEPLAY_KEY_LOCK_CODES]);return true;}catch{return false;}}
  function unlockKeyboard(){try{globalThis.navigator?.keyboard?.unlock?.();}catch{}}
  async function enterImmersiveControl(event){if(!gameFocused()||!desktopPointer()||document.pointerLockElement===canvas)return;event.preventDefault();event.stopImmediatePropagation();unlockGameAudio();try{if(!document.fullscreenElement&&document.documentElement?.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch{}await lockKeyboard();try{await canvas.requestPointerLock?.();}catch{}}
  function onKeyDown(event){const active=gameFocused();if(!shouldSuppressBrowserShortcut(event,{gameplayActive:active}))return;event.preventDefault();if(event.code==='F3'&&!isEditableGameplayTarget(event.target)){event.stopImmediatePropagation();debugVisible=!debugVisible;debug.classList.toggle('hidden',!debugVisible);}}
  function onPointerLockChange(){if(document.pointerLockElement===canvas){unlockGameAudio();void lockKeyboard();}else unlockKeyboard();}
  function onFullscreenChange(){if(!document.fullscreenElement)unlockKeyboard();else if(document.pointerLockElement===canvas)void lockKeyboard();}
  function onResize(){resizeViewModel();}

  window.addEventListener('keydown',onKeyDown,true);window.addEventListener('resize',onResize);canvas.addEventListener('click',enterImmersiveControl,true);document.addEventListener('pointerlockchange',onPointerLockChange);document.addEventListener('fullscreenchange',onFullscreenChange);
  const state={refs:1,viewModel,release(){state.refs--;if(state.refs>0)return;releaseActions();releaseUseState();cancelAnimationFrame(frame);unlockKeyboard();window.removeEventListener('keydown',onKeyDown,true);window.removeEventListener('resize',onResize);canvas.removeEventListener('click',enterImmersiveControl,true);document.removeEventListener('pointerlockchange',onPointerLockChange);document.removeEventListener('fullscreenchange',onFullscreenChange);viewModel.dispose();viewRenderer.dispose();viewCanvas.remove();debugVisible=false;debug.classList.add('hidden');if(globalThis.__minecraftE2E){delete globalThis.__minecraftE2E.firstPersonViewModel;delete globalThis.__minecraftE2E.audio;}installed=null;}};
  installed=state;if(globalThis.__minecraftE2E){globalThis.__minecraftE2E.firstPersonViewModel=()=>viewModel.snapshot();globalThis.__minecraftE2E.audio=()=>gameAudioSnapshot();}return()=>state.release();
}
