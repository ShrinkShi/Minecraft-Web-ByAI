const ACTIONS=new Set(['attack','use']);
const listeners=new Set();

export function publishFirstPersonAction(kind){
  if(!ACTIONS.has(kind))return false;
  for(const listener of [...listeners])listener(kind);
  return true;
}

export function subscribeFirstPersonActions(listener){
  if(typeof listener!=='function')throw new TypeError('first-person action listener must be a function');
  listeners.add(listener);return()=>listeners.delete(listener);
}

export function firstPersonActionSubscriberCount(){return listeners.size;}
