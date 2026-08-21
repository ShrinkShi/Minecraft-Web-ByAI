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

export function isEditableGameplayTarget(target){return editableTarget(target);}
