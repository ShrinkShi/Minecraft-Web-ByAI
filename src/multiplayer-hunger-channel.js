let current=null;const subscribers=new Set();
function clone(snapshot){if(!snapshot)return null;return Object.freeze({...snapshot,statusEffects:Object.freeze((snapshot.statusEffects||[]).map(effect=>Object.freeze({...effect}))),foodUse:snapshot.foodUse?Object.freeze({...snapshot.foodUse}):null});}
function publish(snapshot){current=clone(snapshot);for(const subscriber of [...subscribers])subscriber(current);return current;}
export function currentMultiplayerHungerSnapshot(){return current;}
export function publishMultiplayerHungerSnapshot(snapshot){return publish(snapshot);}
export function clearMultiplayerHungerSnapshot(){return publish(null);}
export function subscribeMultiplayerHungerSnapshots(handler){if(typeof handler!=='function')throw new TypeError('multiplayer hunger subscriber must be a function');subscribers.add(handler);let active=true;return()=>{if(!active)return false;active=false;return subscribers.delete(handler);};}
