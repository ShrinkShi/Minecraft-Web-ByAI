import {assertClientSessionId} from './client-input-envelope.js';
import {assertNetworkSequence} from './network-sequence.js';

export const MULTIPLAYER_COMMAND_PROTOCOL_VERSION=1;
export const MULTIPLAYER_COMMAND_REQUEST_KIND='command-request';
export const MULTIPLAYER_COMMAND_RESULT_KIND='command-result';
export const MAX_MULTIPLAYER_COMMAND_LENGTH=256;
export const MAX_MULTIPLAYER_COMMAND_RESULT_LENGTH=512;
export const MULTIPLAYER_COMMAND_RESULT_CODES=Object.freeze(['ok','denied','usage','unknown-command','inventory-full','internal-error']);
const RESULT_CODE_SET=new Set(MULTIPLAYER_COMMAND_RESULT_CODES);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,keys,label){const actual=Object.keys(value).sort(),expected=[...keys].sort();if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} fields are invalid`);}
function version(value){if(value!==MULTIPLAYER_COMMAND_PROTOCOL_VERSION)throw new RangeError(`multiplayer command version must be ${MULTIPLAYER_COMMAND_PROTOCOL_VERSION}`);return value;}
function requestId(value){return assertNetworkSequence(value,'multiplayer command requestId');}
function commandText(value){if(typeof value!=='string')throw new TypeError('multiplayer command text must be a string');const text=value.trim();if(!text||text.length>MAX_MULTIPLAYER_COMMAND_LENGTH)throw new RangeError(`multiplayer command text must contain 1 to ${MAX_MULTIPLAYER_COMMAND_LENGTH} characters`);if(!text.startsWith('/'))throw new RangeError('multiplayer command text must start with /');if(/[\0\r\n]/u.test(text))throw new RangeError('multiplayer command text must not contain control line breaks');return text;}
function resultCode(value){if(typeof value!=='string'||!RESULT_CODE_SET.has(value))throw new RangeError('multiplayer command result code is invalid');return value;}
function resultMessage(value){if(typeof value!=='string')throw new TypeError('multiplayer command result message must be a string');const message=value.trim();if(!message||message.length>MAX_MULTIPLAYER_COMMAND_RESULT_LENGTH)throw new RangeError(`multiplayer command result message must contain 1 to ${MAX_MULTIPLAYER_COMMAND_RESULT_LENGTH} characters`);if(/[\0\r\n]/u.test(message))throw new RangeError('multiplayer command result message must not contain control line breaks');return message;}

export function encodeMultiplayerCommandRequest({session,requestId:sequence,text}={}){
  return Object.freeze({v:MULTIPLAYER_COMMAND_PROTOCOL_VERSION,kind:MULTIPLAYER_COMMAND_REQUEST_KIND,session:assertClientSessionId(session),requestId:requestId(sequence),text:commandText(text)});
}

export function decodeMultiplayerCommandRequest(raw,{expectedSession=null}={}){
  raw=object(raw,'multiplayer command request');exactKeys(raw,['v','kind','session','requestId','text'],'multiplayer command request');version(raw.v);if(raw.kind!==MULTIPLAYER_COMMAND_REQUEST_KIND)throw new RangeError(`multiplayer command request kind must be ${MULTIPLAYER_COMMAND_REQUEST_KIND}`);const session=assertClientSessionId(raw.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('multiplayer command request session mismatch');return encodeMultiplayerCommandRequest({session,requestId:raw.requestId,text:raw.text});
}

export function encodeMultiplayerCommandResult({session,requestId:sequence,ok,code,message}={}){
  if(typeof ok!=='boolean')throw new TypeError('multiplayer command result ok must be boolean');const normalizedCode=resultCode(code);if(ok!==(normalizedCode==='ok'))throw new RangeError('multiplayer command result ok/code mismatch');return Object.freeze({v:MULTIPLAYER_COMMAND_PROTOCOL_VERSION,kind:MULTIPLAYER_COMMAND_RESULT_KIND,session:assertClientSessionId(session),requestId:requestId(sequence),ok,code:normalizedCode,message:resultMessage(message)});
}

export function decodeMultiplayerCommandResult(raw,{expectedSession=null}={}){
  raw=object(raw,'multiplayer command result');exactKeys(raw,['v','kind','session','requestId','ok','code','message'],'multiplayer command result');version(raw.v);if(raw.kind!==MULTIPLAYER_COMMAND_RESULT_KIND)throw new RangeError(`multiplayer command result kind must be ${MULTIPLAYER_COMMAND_RESULT_KIND}`);const session=assertClientSessionId(raw.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('multiplayer command result session mismatch');return encodeMultiplayerCommandResult({session,requestId:raw.requestId,ok:raw.ok,code:raw.code,message:raw.message});
}
