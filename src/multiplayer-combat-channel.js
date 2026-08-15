let current=null;const subscribers=new Set();
function clone(value){return value?Object.freeze({...value}):null;}
function publish(snapshot){current=clone(snapshot);for(const subscriber of [...subscribers])subscriber(current);return current;}
export function currentMultiplayerCombatSnapshot(){return current;}
export function publishMultiplayerCombatSnapshot(snapshot){return publish(snapshot);}
export function clearMultiplayerCombatSnapshot(){return publish(null);}
export function subscribeMultiplayerCombatSnapshots(handler){if(typeof handler!=='function')throw new TypeError('multiplayer combat subscriber must be a function');subscribers.add(handler);let active=true;return()=>{if(!active)return false;active=false;return subscribers.delete(handler);};}
