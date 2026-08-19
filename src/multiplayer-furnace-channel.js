let activeSender=null,activeSnapshot=null;
const snapshotSubscribers=new Set(),resultSubscribers=new Set(),closeSubscribers=new Set();
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function cloneStack(value){return value?Object.freeze({...value}):null;}
function cloneSnapshot(value){return value?Object.freeze({...value,target:Object.freeze({...value.target}),slots:Object.freeze(value.slots.map(cloneStack))}):null;}
function notify(set,value,clone=value=>value){for(const listener of [...set]){try{listener(clone(value));}catch{}}}
export function hasMultiplayerFurnaceSender(){return activeSender!==null;}
export function currentMultiplayerFurnaceSnapshot(){return cloneSnapshot(activeSnapshot);}
export function attachMultiplayerFurnaceSender(sender){sender=callback(sender,'multiplayer furnace sender');if(activeSender)throw new Error('multiplayer furnace sender is already attached');activeSender=sender;if(activeSnapshot)notify(snapshotSubscribers,activeSnapshot,cloneSnapshot);let released=false;return()=>{if(released)return false;released=true;if(activeSender===sender){activeSender=null;activeSnapshot=null;notify(snapshotSubscribers,null,cloneSnapshot);}return true;};}
export function sendMultiplayerFurnaceTransaction(action){return activeSender?activeSender(action):null;}
export function subscribeMultiplayerFurnaceSnapshots(listener){listener=callback(listener,'multiplayer furnace snapshot listener');snapshotSubscribers.add(listener);if(activeSender&&activeSnapshot)try{listener(cloneSnapshot(activeSnapshot));}catch{}let released=false;return()=>{if(released)return false;released=true;return snapshotSubscribers.delete(listener);};}
export function subscribeMultiplayerFurnaceResults(listener){listener=callback(listener,'multiplayer furnace result listener');resultSubscribers.add(listener);let released=false;return()=>{if(released)return false;released=true;return resultSubscribers.delete(listener);};}
export function subscribeMultiplayerFurnaceCloses(listener){listener=callback(listener,'multiplayer furnace close listener');closeSubscribers.add(listener);let released=false;return()=>{if(released)return false;released=true;return closeSubscribers.delete(listener);};}
export function publishMultiplayerFurnaceSnapshot(snapshot){activeSnapshot=cloneSnapshot(snapshot);if(activeSender)notify(snapshotSubscribers,activeSnapshot,cloneSnapshot);return cloneSnapshot(activeSnapshot);}
export function publishMultiplayerFurnaceResult(result){notify(resultSubscribers,result);return result;}
export function publishMultiplayerFurnaceClose(message){activeSnapshot=null;if(activeSender)notify(snapshotSubscribers,null,cloneSnapshot);notify(closeSubscribers,message);return message;}
