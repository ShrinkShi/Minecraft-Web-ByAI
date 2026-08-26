const listeners=new Set();

function normalizedEvent(value={}){
  const damage=Number(value.damage);if(!Number.isFinite(damage)||damage<=0)throw new RangeError('player damage event requires positive finite damage');
  const hp=Number(value.hp);return Object.freeze({damage,hp:Number.isFinite(hp)?Math.max(0,hp):null,dead:!!value.dead,source:value.source&&typeof value.source==='object'?Object.freeze({...value.source}):null,cause:typeof value.cause==='string'?value.cause:'damage'});
}
export function publishPlayerDamage(value){const event=normalizedEvent(value);for(const listener of [...listeners]){try{listener(event);}catch(error){queueMicrotask(()=>{throw error;});}}return event;}
export function subscribePlayerDamage(listener){if(typeof listener!=='function')throw new TypeError('player damage listener must be a function');listeners.add(listener);return()=>listeners.delete(listener);}
export function playerDamageSubscriberCount(){return listeners.size;}
