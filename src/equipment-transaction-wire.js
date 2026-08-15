import {assertClientSessionId} from './client-input-envelope.js';
import {EQUIPMENT_SLOTS} from './equipment.js';
import {assertNetworkSequence} from './network-sequence.js';

export const EQUIPMENT_TRANSACTION_PROTOCOL_VERSION=1;
export const EQUIPMENT_TRANSACTION_REQUEST_KIND='equipment-transaction-request';
export const EQUIPMENT_TRANSACTION_RESULT_KIND='equipment-transaction-result';

const SLOT_SET=new Set(EQUIPMENT_SLOTS);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,keys,label){const actual=Object.keys(value).sort(),expected=[...keys].sort();if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} fields are invalid`);}
function version(value){if(value!==EQUIPMENT_TRANSACTION_PROTOCOL_VERSION)throw new RangeError(`equipment transaction version must be ${EQUIPMENT_TRANSACTION_PROTOCOL_VERSION}`);return value;}
function slot(value){if(!SLOT_SET.has(value))throw new RangeError(`unsupported equipment slot: ${value}`);return value;}
function button(value){if(value!==0&&value!==2)throw new RangeError('equipment transaction button must be 0 or 2');return value;}
function code(value){if(typeof value!=='string'||!/^[a-z0-9-]{1,64}$/u.test(value))throw new RangeError('equipment transaction result code must be 1 to 64 lowercase ASCII characters, digits, or hyphens');return value;}

export function encodeEquipmentTransactionRequest({session,requestId,expectedInventoryRevision,expectedEquipmentRevision,slot:targetSlot,button:mouseButton}={}){return Object.freeze({v:EQUIPMENT_TRANSACTION_PROTOCOL_VERSION,kind:EQUIPMENT_TRANSACTION_REQUEST_KIND,session:assertClientSessionId(session),requestId:assertNetworkSequence(requestId,'equipment transaction requestId'),expectedInventoryRevision:assertNetworkSequence(expectedInventoryRevision,'equipment transaction expectedInventoryRevision'),expectedEquipmentRevision:assertNetworkSequence(expectedEquipmentRevision,'equipment transaction expectedEquipmentRevision'),slot:slot(targetSlot),button:button(mouseButton)});}

export function decodeEquipmentTransactionRequest(raw,{expectedSession=null}={}){raw=object(raw,'equipment transaction request');exactKeys(raw,['v','kind','session','requestId','expectedInventoryRevision','expectedEquipmentRevision','slot','button'],'equipment transaction request');version(raw.v);if(raw.kind!==EQUIPMENT_TRANSACTION_REQUEST_KIND)throw new RangeError(`equipment transaction request kind must be ${EQUIPMENT_TRANSACTION_REQUEST_KIND}`);const session=assertClientSessionId(raw.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('equipment transaction request session mismatch');return encodeEquipmentTransactionRequest({session,requestId:raw.requestId,expectedInventoryRevision:raw.expectedInventoryRevision,expectedEquipmentRevision:raw.expectedEquipmentRevision,slot:raw.slot,button:raw.button});}

export function encodeEquipmentTransactionResult({session,requestId,ok,code:resultCode,inventoryRevision,equipmentRevision}={}){if(typeof ok!=='boolean')throw new TypeError('equipment transaction result ok must be a boolean');return Object.freeze({v:EQUIPMENT_TRANSACTION_PROTOCOL_VERSION,kind:EQUIPMENT_TRANSACTION_RESULT_KIND,session:assertClientSessionId(session),requestId:assertNetworkSequence(requestId,'equipment transaction result requestId'),ok,code:code(resultCode),inventoryRevision:assertNetworkSequence(inventoryRevision,'equipment transaction result inventoryRevision'),equipmentRevision:assertNetworkSequence(equipmentRevision,'equipment transaction result equipmentRevision')});}

export function decodeEquipmentTransactionResult(raw,{expectedSession=null}={}){raw=object(raw,'equipment transaction result');exactKeys(raw,['v','kind','session','requestId','ok','code','inventoryRevision','equipmentRevision'],'equipment transaction result');version(raw.v);if(raw.kind!==EQUIPMENT_TRANSACTION_RESULT_KIND)throw new RangeError(`equipment transaction result kind must be ${EQUIPMENT_TRANSACTION_RESULT_KIND}`);const session=assertClientSessionId(raw.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('equipment transaction result session mismatch');return encodeEquipmentTransactionResult({session,requestId:raw.requestId,ok:raw.ok,code:raw.code,inventoryRevision:raw.inventoryRevision,equipmentRevision:raw.equipmentRevision});}
