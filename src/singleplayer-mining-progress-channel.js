const listeners=new Set();

function listener(value){if(typeof value!=='function')throw new TypeError('singleplayer mining progress listener must be a function');return value;}
function cloneTarget(value){return value?Object.freeze({x:value.x,y:value.y,z:value.z,id:value.id}):null;}
function normalizeState(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('singleplayer mining progress state must be an object');
  if(typeof value.active!=='boolean')throw new TypeError('singleplayer mining progress active must be boolean');
  if(typeof value.progress!=='number'||!Number.isFinite(value.progress)||value.progress<0||value.progress>1)throw new RangeError('singleplayer mining progress must be from 0 to 1');
  if(value.active){if(value.progress<=0||value.progress>=1)throw new RangeError('active singleplayer mining progress must be greater than 0 and less than 1');if(!value.target||typeof value.target!=='object')throw new TypeError('active singleplayer mining progress requires a target');}
  else if(value.progress!==0||value.target!==null)throw new RangeError('inactive singleplayer mining progress must be exactly zero with no target');
  return Object.freeze({...value,target:cloneTarget(value.target)});
}

export function publishSingleplayerMiningProgress(state){
  const next=normalizeState(state);for(const callback of [...listeners]){try{callback(next);}catch{}}return next;
}
export function subscribeSingleplayerMiningProgress(callback){callback=listener(callback);listeners.add(callback);let active=true;return()=>{if(!active)return false;active=false;return listeners.delete(callback);};}
