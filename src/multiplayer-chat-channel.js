let activeSender=null;
const subscribers=new Set();

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}

export function hasMultiplayerChatSender(){return activeSender!==null;}

export function attachMultiplayerChatSender(sender){
  sender=callback(sender,'multiplayer chat sender');if(activeSender)throw new Error('multiplayer chat sender is already attached');activeSender=sender;let released=false;return()=>{if(released)return false;released=true;if(activeSender===sender)activeSender=null;return true;};
}

export function sendMultiplayerChat(text){return activeSender?activeSender(text):null;}

export function subscribeMultiplayerChatMessages(listener){listener=callback(listener,'multiplayer chat listener');subscribers.add(listener);let released=false;return()=>{if(released)return false;released=true;return subscribers.delete(listener);};}

export function publishMultiplayerChatMessage(message){
  for(const listener of [...subscribers]){try{listener(message);}catch{}}
  return message;
}
