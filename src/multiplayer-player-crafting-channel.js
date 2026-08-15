let activeSender=null,activeSnapshot=null;
const resultSubscribers=new Set(),snapshotSubscribers=new Set();

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function cloneStack(value){return value?Object.freeze({...value}):null;}
function cloneSnapshot(value){return value?Object.freeze({...value,slots:Object.freeze(value.slots.map(cloneStack)),result:cloneStack(value.result)}):null;}

export function hasMultiplayerPlayerCraftingSender(){return activeSender!==null;}
export function currentMultiplayerPlayerCraftingSnapshot(){return cloneSnapshot(activeSnapshot);}

export function attachMultiplayerPlayerCraftingSender(sender){sender=callback(sender,'multiplayer player crafting sender');if(activeSender)throw new Error('multiplayer player crafting sender is already attached');activeSender=sender;let released=false;return()=>{if(released)return false;released=true;if(activeSender===sender){activeSender=null;activeSnapshot=null;}return true;};}

export function sendMultiplayerPlayerCraftingTransaction(action){return activeSender?activeSender(action):null;}

export function subscribeMultiplayerPlayerCraftingResults(listener){listener=callback(listener,'multiplayer player crafting result listener');resultSubscribers.add(listener);let released=false;return()=>{if(released)return false;released=true;return resultSubscribers.delete(listener);};}
export function publishMultiplayerPlayerCraftingResult(result){for(const listener of [...resultSubscribers]){try{listener(result);}catch{}}return result;}

export function subscribeMultiplayerPlayerCraftingSnapshots(listener){listener=callback(listener,'multiplayer player crafting snapshot listener');snapshotSubscribers.add(listener);if(activeSnapshot)try{listener(cloneSnapshot(activeSnapshot));}catch{}let released=false;return()=>{if(released)return false;released=true;return snapshotSubscribers.delete(listener);};}
export function publishMultiplayerPlayerCraftingSnapshot(snapshot){activeSnapshot=cloneSnapshot(snapshot);for(const listener of [...snapshotSubscribers]){try{listener(cloneSnapshot(activeSnapshot));}catch{}}return activeSnapshot;}
