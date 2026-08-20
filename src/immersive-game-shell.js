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

let installed=null;
function hasBrowserDom(){return typeof document!=='undefined'&&typeof window!=='undefined'&&typeof document.querySelector==='function';}

export function installImmersiveGameShell(canvas){
  if(!canvas||!hasBrowserDom())return()=>{};
  if(installed){installed.refs++;return()=>installed.release();}
  const hud=document.querySelector('#hud'),debug=document.querySelector('#debug');if(!hud||!debug)return()=>{};
  debug.classList.add('hidden');let debugVisible=false;
  const gameFocused=()=>!hud.classList.contains('hidden')&&!document.querySelector('.screen.active')&&!document.querySelector('.inventory:not(.hidden)')&&document.querySelector('#chat-input-wrap')?.classList.contains('hidden')!==false;
  const desktopPointer=()=>typeof matchMedia!=='function'||!matchMedia('(pointer: coarse)').matches;

  async function lockKeyboard(){
    if(!gameFocused()||!desktopPointer())return false;const keyboard=globalThis.navigator?.keyboard;if(!keyboard||typeof keyboard.lock!=='function')return false;
    try{await keyboard.lock([...GAMEPLAY_KEY_LOCK_CODES]);return true;}catch{return false;}
  }
  function unlockKeyboard(){try{globalThis.navigator?.keyboard?.unlock?.();}catch{}}
  async function enterImmersiveControl(event){
    if(!gameFocused()||!desktopPointer()||document.pointerLockElement===canvas)return;event.preventDefault();event.stopImmediatePropagation();
    try{if(!document.fullscreenElement&&document.documentElement?.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch{}
    await lockKeyboard();try{await canvas.requestPointerLock?.();}catch{}
  }
  function onKeyDown(event){
    const active=gameFocused();if(!shouldSuppressBrowserShortcut(event,{gameplayActive:active}))return;event.preventDefault();
    if(event.code==='F3'&&!editableTarget(event.target)){event.stopImmediatePropagation();debugVisible=!debugVisible;debug.classList.toggle('hidden',!debugVisible);}
  }
  function onPointerLockChange(){if(document.pointerLockElement===canvas)void lockKeyboard();else unlockKeyboard();}
  function onFullscreenChange(){if(!document.fullscreenElement)unlockKeyboard();else if(document.pointerLockElement===canvas)void lockKeyboard();}

  window.addEventListener('keydown',onKeyDown,true);canvas.addEventListener('click',enterImmersiveControl,true);document.addEventListener('pointerlockchange',onPointerLockChange);document.addEventListener('fullscreenchange',onFullscreenChange);
  const state={refs:1,release(){state.refs--;if(state.refs>0)return;unlockKeyboard();window.removeEventListener('keydown',onKeyDown,true);canvas.removeEventListener('click',enterImmersiveControl,true);document.removeEventListener('pointerlockchange',onPointerLockChange);document.removeEventListener('fullscreenchange',onFullscreenChange);debugVisible=false;debug.classList.add('hidden');installed=null;}};
  installed=state;return()=>state.release();
}
