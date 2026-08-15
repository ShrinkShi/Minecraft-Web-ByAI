let activeSender=null;
const resultSubscribers=new Set();

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}

export function hasMultiplayerInventoryTransactionSender(){return activeSender!==null;}

export function attachMultiplayerInventoryTransactionSender(sender){sender=callback(sender,'multiplayer inventory transaction sender');if(activeSender)throw new Error('multiplayer inventory transaction sender is already attached');activeSender=sender;let released=false;return()=>{if(released)return false;released=true;if(activeSender===sender)activeSender=null;return true;};}

export function sendMultiplayerInventoryTransaction(action){return activeSender?activeSender(action):null;}

export function subscribeMultiplayerInventoryTransactionResults(listener){listener=callback(listener,'multiplayer inventory transaction result listener');resultSubscribers.add(listener);let released=false;return()=>{if(released)return false;released=true;return resultSubscribers.delete(listener);};}

export function publishMultiplayerInventoryTransactionResult(result){for(const listener of [...resultSubscribers]){try{listener(result);}catch{}}return result;}
