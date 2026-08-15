import {assertClientSessionId} from './client-input-envelope.js';
import {INVENTORY_SLOT_COUNT} from './inventory-layout.js';
import {assertNetworkSequence} from './network-sequence.js';

export const INVENTORY_TRANSACTION_PROTOCOL_VERSION=1;
export const INVENTORY_TRANSACTION_REQUEST_KIND='inventory-transaction-request';
export const INVENTORY_TRANSACTION_RESULT_KIND='inventory-transaction-result';
export const INVENTORY_TRANSACTION_ACTIONS=Object.freeze(['slot-click','return-cursor']);

const ACTION_SET=new Set(INVENTORY_TRANSACTION_ACTIONS);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,keys,label){const actual=Object.keys(value).sort(),expected=[...keys].sort();if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} fields are invalid`);}
function version(value){if(value!==INVENTORY_TRANSACTION_PROTOCOL_VERSION)throw new RangeError(`inventory transaction version must be ${INVENTORY_TRANSACTION_PROTOCOL_VERSION}`);return value;}
function slot(value){if(!Number.isInteger(value)||value<0||value>=INVENTORY_SLOT_COUNT)throw new RangeError(`inventory transaction slot must be an integer from 0 to ${INVENTORY_SLOT_COUNT-1}`);return value;}
function button(value){if(value!==0&&value!==2)throw new RangeError('inventory transaction button must be 0 or 2');return value;}
function code(value){if(typeof value!=='string'||!/^[a-z0-9-]{1,64}$/u.test(value))throw new RangeError('inventory transaction result code must be 1 to 64 lowercase ASCII characters, digits, or hyphens');return value;}

export function normalizeInventoryTransactionAction(value){
  value=object(value,'inventory transaction action');const type=value.type;if(!ACTION_SET.has(type))throw new RangeError(`unsupported inventory transaction action: ${type}`);
  if(type==='slot-click'){exactKeys(value,['type','slot','button','shift'],'inventory slot-click action');if(typeof value.shift!=='boolean')throw new TypeError('inventory slot-click shift must be a boolean');return Object.freeze({type,slot:slot(value.slot),button:button(value.button),shift:value.shift});}
  exactKeys(value,['type'],'inventory return-cursor action');return Object.freeze({type});
}

export function encodeInventoryTransactionRequest({session,requestId,expectedRevision,action}={}){
  return Object.freeze({v:INVENTORY_TRANSACTION_PROTOCOL_VERSION,kind:INVENTORY_TRANSACTION_REQUEST_KIND,session:assertClientSessionId(session),requestId:assertNetworkSequence(requestId,'inventory transaction requestId'),expectedRevision:assertNetworkSequence(expectedRevision,'inventory transaction expectedRevision'),action:normalizeInventoryTransactionAction(action)});
}

export function decodeInventoryTransactionRequest(raw,{expectedSession=null}={}){
  raw=object(raw,'inventory transaction request');exactKeys(raw,['v','kind','session','requestId','expectedRevision','action'],'inventory transaction request');version(raw.v);if(raw.kind!==INVENTORY_TRANSACTION_REQUEST_KIND)throw new RangeError(`inventory transaction request kind must be ${INVENTORY_TRANSACTION_REQUEST_KIND}`);const session=assertClientSessionId(raw.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('inventory transaction request session mismatch');return encodeInventoryTransactionRequest({session,requestId:raw.requestId,expectedRevision:raw.expectedRevision,action:raw.action});
}

export function encodeInventoryTransactionResult({session,requestId,ok,code:resultCode,revision}={}){
  if(typeof ok!=='boolean')throw new TypeError('inventory transaction result ok must be a boolean');return Object.freeze({v:INVENTORY_TRANSACTION_PROTOCOL_VERSION,kind:INVENTORY_TRANSACTION_RESULT_KIND,session:assertClientSessionId(session),requestId:assertNetworkSequence(requestId,'inventory transaction result requestId'),ok,code:code(resultCode),revision:assertNetworkSequence(revision,'inventory transaction result revision')});
}

export function decodeInventoryTransactionResult(raw,{expectedSession=null}={}){
  raw=object(raw,'inventory transaction result');exactKeys(raw,['v','kind','session','requestId','ok','code','revision'],'inventory transaction result');version(raw.v);if(raw.kind!==INVENTORY_TRANSACTION_RESULT_KIND)throw new RangeError(`inventory transaction result kind must be ${INVENTORY_TRANSACTION_RESULT_KIND}`);const session=assertClientSessionId(raw.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('inventory transaction result session mismatch');return encodeInventoryTransactionResult({session,requestId:raw.requestId,ok:raw.ok,code:raw.code,revision:raw.revision});
}
