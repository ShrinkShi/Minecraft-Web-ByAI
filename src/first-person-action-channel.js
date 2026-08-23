const ACTIONS=new Set(['attack','use']);
const listeners=new Set(),useStateListeners=new Set();
let useState=Object.freeze({active:false,kind:null,itemId:null,progress:0});

function normalizeUseState(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('first-person use state must be an object');
  if(!value.active)return Object.freeze({active:false,kind:null,itemId:null,progress:0});
  if(value.kind!=='food')throw new RangeError(`unsupported first-person use kind: ${value.kind}`);
  if(typeof value.itemId!=='string'||!value.itemId)throw new TypeError('active first-person use item id must be a non-empty string');
  const progress=Number(value.progress);if(!Number.isFinite(progress))throw new TypeError('first-person use progress must be finite');
  return Object.freeze({active:true,kind:value.kind,itemId:value.itemId,progress:Math.max(0,Math.min(1,progress))});
}

export function publishFirstPersonAction(kind){
  if(!ACTIONS.has(kind))return false;
  for(const listener of [...listeners])listener(kind);
  return true;
}

export function subscribeFirstPersonActions(listener){
  if(typeof listener!=='function')throw new TypeError('first-person action listener must be a function');
  listeners.add(listener);return()=>listeners.delete(listener);
}

export function publishFirstPersonUseState(value){useState=normalizeUseState(value);for(const listener of [...useStateListeners])listener(useState);return useState;}
export function subscribeFirstPersonUseState(listener){if(typeof listener!=='function')throw new TypeError('first-person use-state listener must be a function');useStateListeners.add(listener);listener(useState);return()=>useStateListeners.delete(listener);}
export function firstPersonUseStateSnapshot(){return useState;}
export function firstPersonActionSubscriberCount(){return listeners.size;}
export function firstPersonUseStateSubscriberCount(){return useStateListeners.size;}
