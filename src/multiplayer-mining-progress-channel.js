const listeners=new Set();
let currentOwner=null,currentState=null;

function owner(value){if((typeof value!=='object'||value===null)&&typeof value!=='function'&&typeof value!=='symbol')throw new TypeError('mining progress owner token is required');return value;}
function listener(value){if(typeof value!=='function')throw new TypeError('mining progress listener must be a function');return value;}
function cloneTarget(value){return value?Object.freeze({x:value.x,y:value.y,z:value.z,id:value.id}):null;}
function cloneState(value){return value?Object.freeze({...value,target:cloneTarget(value.target)}):null;}
function normalizeState(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('multiplayer mining progress state must be an object');
  if(typeof value.active!=='boolean')throw new TypeError('multiplayer mining progress active must be boolean');
  if(typeof value.progress!=='number'||!Number.isFinite(value.progress)||value.progress<0||value.progress>1)throw new RangeError('multiplayer mining progress must be from 0 to 1');
  if(value.active){if(value.progress<=0||value.progress>=1)throw new RangeError('active multiplayer mining progress must be greater than 0 and less than 1');if(!value.target||typeof value.target!=='object')throw new TypeError('active multiplayer mining progress requires a target');}
  else if(value.progress!==0||value.target!==null)throw new RangeError('inactive multiplayer mining progress must be exactly zero with no target');
  return cloneState(value);
}
function notify(state){for(const fn of [...listeners]){try{fn(cloneState(state));}catch{}}}

export function publishMultiplayerMiningProgress(source,state){source=owner(source);const next=normalizeState(state);currentOwner=source;currentState=next;notify(next);return cloneState(next);}
export function clearMultiplayerMiningProgress(source){source=owner(source);if(currentOwner!==source)return false;currentOwner=null;currentState=null;notify(null);return true;}
export function multiplayerMiningProgressState(){return cloneState(currentState);}
export function subscribeMultiplayerMiningProgress(callback,{emitCurrent=true}={}){callback=listener(callback);listeners.add(callback);if(emitCurrent)callback(cloneState(currentState));let active=true;return()=>{if(!active)return false;active=false;listeners.delete(callback);return true;};}
