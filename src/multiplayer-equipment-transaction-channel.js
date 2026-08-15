let activeSender=null;
const resultSubscribers=new Set();

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}

export function hasMultiplayerEquipmentTransactionSender(){return activeSender!==null;}

export function attachMultiplayerEquipmentTransactionSender(sender){sender=callback(sender,'multiplayer equipment transaction sender');if(activeSender)throw new Error('multiplayer equipment transaction sender is already attached');activeSender=sender;let released=false;return()=>{if(released)return false;released=true;if(activeSender===sender)activeSender=null;return true;};}

export function sendMultiplayerEquipmentTransaction(action){return activeSender?activeSender(action):null;}

export function subscribeMultiplayerEquipmentTransactionResults(listener){listener=callback(listener,'multiplayer equipment transaction result listener');resultSubscribers.add(listener);let released=false;return()=>{if(released)return false;released=true;return resultSubscribers.delete(listener);};}

export function publishMultiplayerEquipmentTransactionResult(result){for(const listener of [...resultSubscribers]){try{listener(result);}catch{}}return result;}
