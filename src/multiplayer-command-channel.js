let activeSender=null;
const subscribers=new Set();

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}

export function hasMultiplayerCommandSender(){return activeSender!==null;}

export function attachMultiplayerCommandSender(sender){
  sender=callback(sender,'multiplayer command sender');if(activeSender)throw new Error('multiplayer command sender is already attached');activeSender=sender;let released=false;return()=>{if(released)return false;released=true;if(activeSender===sender)activeSender=null;return true;};
}

export function sendMultiplayerCommand(text){return activeSender?activeSender(text):null;}

export function subscribeMultiplayerCommandResults(listener){listener=callback(listener,'multiplayer command result listener');subscribers.add(listener);let released=false;return()=>{if(released)return false;released=true;return subscribers.delete(listener);};}

export function publishMultiplayerCommandResult(result){
  for(const listener of [...subscribers]){try{listener(result);}catch{}}
  return result;
}
