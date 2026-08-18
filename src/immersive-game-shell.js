import {requireAssetUrl} from './asset-manifest.js';
import {STEVE_RIGHT_ARM_BASE_FRONT,STEVE_RIGHT_ARM_SLEEVE_FRONT,minecraftSkinCropCss} from './first-person-player-presentation.js';

export const GAMEPLAY_KEY_LOCK_CODES=Object.freeze([
  'KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ','KeyR','KeyT','Slash','Space','Tab','F3','F5',
  'ShiftLeft','ShiftRight','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9'
]);

function editableTarget(target){
  if(!target||typeof target!=='object')return false;
  const tag=String(target.tagName||'').toLowerCase();
  return tag==='input'||tag==='textarea'||tag==='select'||target.isContentEditable===true;
}

export function shouldSuppressBrowserShortcut(event,{gameplayActive=true}={}){
  if(!gameplayActive||!event||editableTarget(event.target))return false;
  if(event.code==='F3'||event.code==='F5'||event.code==='Tab')return true;
  return !!(event.ctrlKey||event.metaKey)&&event.code==='KeyW';
}

const STEVE_SKIN=requireAssetUrl('entity.player.steve');
const ARM_BASE=minecraftSkinCropCss(STEVE_RIGHT_ARM_BASE_FRONT);
const ARM_SLEEVE=minecraftSkinCropCss(STEVE_RIGHT_ARM_SLEEVE_FRONT);

function styleText(){return `
#first-person-held-overlay{position:absolute;right:7vw;bottom:-24px;width:300px;height:230px;pointer-events:none;z-index:4;transform-origin:100% 100%;filter:drop-shadow(0 7px 4px #0007)}
#first-person-held-overlay.hidden{display:none!important}
#first-person-held-overlay .fp-arm{position:absolute;right:18px;bottom:-38px;width:${ARM_BASE.width};height:${ARM_BASE.height};background-image:url("${STEVE_SKIN}");background-size:${ARM_BASE.backgroundSize};background-position:${ARM_BASE.backgroundPosition};background-repeat:no-repeat;transform:rotate(-25deg);transform-origin:50% 88%;image-rendering:pixelated;filter:drop-shadow(3px 4px 0 #0007)}
#first-person-held-overlay .fp-arm::after{content:"";position:absolute;inset:0;background-image:url("${STEVE_SKIN}");background-size:${ARM_SLEEVE.backgroundSize};background-position:${ARM_SLEEVE.backgroundPosition};background-repeat:no-repeat;transform:scale(1.045);transform-origin:50% 50%;image-rendering:pixelated;pointer-events:none}
#first-person-held-overlay .fp-item{position:absolute;right:94px;bottom:58px;width:96px;height:96px;display:grid;place-items:center;transform:rotate(-18deg) scale(1.08);transform-origin:50% 80%;filter:drop-shadow(4px 5px 1px #0009)}
#first-person-held-overlay .fp-item>.item-icon{width:32px;height:32px;transform:scale(2.6);image-rendering:pixelated}
#first-person-held-overlay .fp-item>.slot-swatch{width:30px;height:30px;transform:scale(2.65);image-rendering:pixelated}
#first-person-held-overlay .fp-item>.block-item-icon{width:32px!important;height:32px!important;transform:scale(2.6);transform-origin:50% 50%;image-rendering:pixelated}
@media(max-width:800px),(pointer:coarse){#first-person-held-overlay{right:2vw;bottom:-45px;transform:scale(.76)}}
`;}

let installed=null;

function hasBrowserDom(){
  return typeof document!=='undefined'&&typeof window!=='undefined'&&typeof document.querySelector==='function'&&typeof document.querySelectorAll==='function'&&typeof document.createElement==='function'&&!!document.head&&typeof MutationObserver!=='undefined';
}

export function installImmersiveGameShell(canvas){
  if(!canvas||!hasBrowserDom())return()=>{};
  if(installed){installed.refs++;return()=>installed.release();}
  const hud=document.querySelector('#hud'),debug=document.querySelector('#debug'),hotbar=document.querySelector('#hotbar');
  if(!hud||!debug||!hotbar)return()=>{};

  const style=document.createElement('style');style.dataset.minecraftImmersiveShell='1';style.textContent=styleText();document.head.append(style);
  debug.classList.add('hidden');
  let debugVisible=false,lastItemSignature='';

  const overlay=document.createElement('div');overlay.id='first-person-held-overlay';overlay.className='hidden';overlay.setAttribute('aria-hidden','true');
  const arm=document.createElement('div');arm.className='fp-arm';arm.dataset.assetKey='entity.player.steve';const item=document.createElement('div');item.className='fp-item';overlay.append(arm,item);hud.append(overlay);

  const panels=()=>[...document.querySelectorAll('.screen,.inventory,#chat-input-wrap')];
  const gameFocused=()=>!hud.classList.contains('hidden')&&!document.querySelector('.screen.active')&&!document.querySelector('.inventory:not(.hidden)')&&document.querySelector('#chat-input-wrap')?.classList.contains('hidden')!==false;
  const desktopPointer=()=>typeof matchMedia!=='function'||!matchMedia('(pointer: coarse)').matches;

  function syncOverlay(){
    const firstPerson=(canvas.dataset.viewMode??'0')==='0',active=gameFocused()&&firstPerson;
    overlay.classList.toggle('hidden',!active);
    if(!active)return;
    const selected=hotbar.querySelector('.hotbar-slot.selected'),source=selected?.querySelector('.item-icon,.slot-swatch,.block-item-icon');
    const signature=source?`${source.tagName}|${source.getAttribute('src')||''}|${source.getAttribute('style')||''}|${source.dataset?.itemId||''}`:'';
    if(signature===lastItemSignature)return;lastItemSignature=signature;item.textContent='';if(source)item.append(source.cloneNode(true));
  }

  async function lockKeyboard(){
    if(!gameFocused()||!desktopPointer())return false;
    const keyboard=globalThis.navigator?.keyboard;
    if(!keyboard||typeof keyboard.lock!=='function')return false;
    try{await keyboard.lock([...GAMEPLAY_KEY_LOCK_CODES]);return true;}catch{return false;}
  }
  function unlockKeyboard(){try{globalThis.navigator?.keyboard?.unlock?.();}catch{}}

  async function enterImmersiveControl(event){
    if(!gameFocused()||!desktopPointer()||document.pointerLockElement===canvas)return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      if(!document.fullscreenElement&&document.documentElement?.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});
    }catch{}
    await lockKeyboard();
    try{await canvas.requestPointerLock?.();}catch{}
  }

  function onKeyDown(event){
    const active=gameFocused();
    if(!shouldSuppressBrowserShortcut(event,{gameplayActive:active}))return;
    event.preventDefault();
    if(event.code==='F3'&&!editableTarget(event.target)){
      event.stopImmediatePropagation();debugVisible=!debugVisible;debug.classList.toggle('hidden',!debugVisible);
    }
  }
  function onPointerLockChange(){
    if(document.pointerLockElement===canvas)void lockKeyboard();
    else unlockKeyboard();
    syncOverlay();
  }
  function onFullscreenChange(){if(!document.fullscreenElement)unlockKeyboard();else if(document.pointerLockElement===canvas)void lockKeyboard();}

  const observer=new MutationObserver(syncOverlay);
  observer.observe(hotbar,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','src','data-item-id']});
  observer.observe(canvas,{attributes:true,attributeFilter:['data-view-mode']});
  observer.observe(hud,{attributes:true,attributeFilter:['class']});
  for(const panel of panels())observer.observe(panel,{attributes:true,attributeFilter:['class']});
  window.addEventListener('keydown',onKeyDown,true);canvas.addEventListener('click',enterImmersiveControl,true);document.addEventListener('pointerlockchange',onPointerLockChange);document.addEventListener('fullscreenchange',onFullscreenChange);syncOverlay();

  const state={refs:1,release(){state.refs--;if(state.refs>0)return;observer.disconnect();unlockKeyboard();window.removeEventListener('keydown',onKeyDown,true);canvas.removeEventListener('click',enterImmersiveControl,true);document.removeEventListener('pointerlockchange',onPointerLockChange);document.removeEventListener('fullscreenchange',onFullscreenChange);overlay.remove();style.remove();debugVisible=false;debug.classList.add('hidden');installed=null;}};
  installed=state;return()=>state.release();
}
