import {assertClientSessionId} from './client-input-envelope.js';
import {assertNetworkSequence} from './network-sequence.js';

export const MULTIPLAYER_CHAT_PROTOCOL_VERSION=1;
export const MULTIPLAYER_CHAT_SEND_KIND='chat-send';
export const MULTIPLAYER_CHAT_MESSAGE_KIND='chat-message';
export const MAX_MULTIPLAYER_CHAT_LENGTH=256;

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,keys,label){const actual=Object.keys(value).sort(),expected=[...keys].sort();if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} fields are invalid`);}
function version(value){if(value!==MULTIPLAYER_CHAT_PROTOCOL_VERSION)throw new RangeError(`multiplayer chat version must be ${MULTIPLAYER_CHAT_PROTOCOL_VERSION}`);return value;}
function sequence(value,label){return assertNetworkSequence(value,label);}
function chatText(value){if(typeof value!=='string')throw new TypeError('multiplayer chat text must be a string');const text=value.trim();if(!text||text.length>MAX_MULTIPLAYER_CHAT_LENGTH)throw new RangeError(`multiplayer chat text must contain 1 to ${MAX_MULTIPLAYER_CHAT_LENGTH} characters`);if(text.startsWith('/'))throw new RangeError('multiplayer chat text must not use the command prefix');if(/[\0\r\n]/u.test(text))throw new RangeError('multiplayer chat text must not contain control line breaks');return text;}

export function encodeMultiplayerChatSend({session,clientSeq,text}={}){
  return Object.freeze({v:MULTIPLAYER_CHAT_PROTOCOL_VERSION,kind:MULTIPLAYER_CHAT_SEND_KIND,session:assertClientSessionId(session),clientSeq:sequence(clientSeq,'multiplayer chat clientSeq'),text:chatText(text)});
}

export function decodeMultiplayerChatSend(raw,{expectedSession=null}={}){
  raw=object(raw,'multiplayer chat send');exactKeys(raw,['v','kind','session','clientSeq','text'],'multiplayer chat send');version(raw.v);if(raw.kind!==MULTIPLAYER_CHAT_SEND_KIND)throw new RangeError(`multiplayer chat send kind must be ${MULTIPLAYER_CHAT_SEND_KIND}`);const session=assertClientSessionId(raw.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('multiplayer chat send session mismatch');return encodeMultiplayerChatSend({session,clientSeq:raw.clientSeq,text:raw.text});
}

export function encodeMultiplayerChatMessage({messageSeq,sender,text}={}){
  return Object.freeze({v:MULTIPLAYER_CHAT_PROTOCOL_VERSION,kind:MULTIPLAYER_CHAT_MESSAGE_KIND,messageSeq:sequence(messageSeq,'multiplayer chat messageSeq'),sender:assertClientSessionId(sender),text:chatText(text)});
}

export function decodeMultiplayerChatMessage(raw){
  raw=object(raw,'multiplayer chat message');exactKeys(raw,['v','kind','messageSeq','sender','text'],'multiplayer chat message');version(raw.v);if(raw.kind!==MULTIPLAYER_CHAT_MESSAGE_KIND)throw new RangeError(`multiplayer chat message kind must be ${MULTIPLAYER_CHAT_MESSAGE_KIND}`);return encodeMultiplayerChatMessage({messageSeq:raw.messageSeq,sender:raw.sender,text:raw.text});
}
