import {assertClientSessionId} from './client-input-envelope.js';
import {EQUIPMENT_SLOTS} from './equipment.js';
import {decodeItemStackTuple,encodeItemStackTuple} from './item-stack.js';
import {ITEMS} from './items.js';
import {assertNetworkSequence} from './network-sequence.js';

export const SERVER_EQUIPMENT_SNAPSHOT_VERSION=1;
export const SERVER_EQUIPMENT_SNAPSHOT_KIND='equipment-snapshot';

const SLOT_SET=new Set(EQUIPMENT_SLOTS);
const SNAPSHOT_KEYS=Object.freeze(['kind','revision','session','slots','v']);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,keys,label){const actual=Object.keys(value).sort(),expected=[...keys].sort();if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);}
function equipmentSlot(slot){if(!SLOT_SET.has(slot))throw new RangeError(`unsupported equipment slot: ${slot}`);return slot;}
function validateArmorStack(stack,slot,label){if(stack===null)return null;const decoded=decodeItemStackTuple(stack,{label}),def=ITEMS[decoded.id];if(!def||equipmentSlot(def.armorSlot)!==slot||Number(def.stack||1)!==1||decoded.count!==1)throw new RangeError(`${label} must contain one armor item valid for ${slot}`);return decoded;}
function encodeArmorStack(stack,slot,label){if(stack===null||stack===undefined)return null;const def=ITEMS[stack.id];if(!def||def.armorSlot!==slot||Number(def.stack||1)!==1||stack.count!==1)throw new RangeError(`${label} must contain one armor item valid for ${slot}`);return encodeItemStackTuple(stack,{label});}
function normalizeSlots(value,{decode=false}={}){value=object(value,'equipment slots');exactKeys(value,EQUIPMENT_SLOTS,'equipment slots');return Object.freeze(Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot,decode?validateArmorStack(value[slot],slot,`equipment ${slot}`):encodeArmorStack(value[slot],slot,`equipment ${slot}`)])));}

export function encodeServerEquipmentSnapshot(snapshot){snapshot=object(snapshot,'server equipment snapshot state');return Object.freeze({v:SERVER_EQUIPMENT_SNAPSHOT_VERSION,kind:SERVER_EQUIPMENT_SNAPSHOT_KIND,session:assertClientSessionId(snapshot.session),revision:assertNetworkSequence(snapshot.revision,'equipment revision'),slots:normalizeSlots(snapshot.slots)});}

export function decodeServerEquipmentSnapshot(snapshot,{expectedSession=null}={}){snapshot=object(snapshot,'server equipment snapshot');exactKeys(snapshot,SNAPSHOT_KEYS,'server equipment snapshot');if(snapshot.v!==SERVER_EQUIPMENT_SNAPSHOT_VERSION)throw new RangeError(`unsupported server equipment snapshot version: ${snapshot.v}`);if(snapshot.kind!==SERVER_EQUIPMENT_SNAPSHOT_KIND)throw new RangeError(`unsupported server equipment snapshot kind: ${snapshot.kind}`);const session=assertClientSessionId(snapshot.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('server equipment snapshot session mismatch');return Object.freeze({version:SERVER_EQUIPMENT_SNAPSHOT_VERSION,kind:SERVER_EQUIPMENT_SNAPSHOT_KIND,session,revision:assertNetworkSequence(snapshot.revision,'equipment revision'),slots:normalizeSlots(snapshot.slots,{decode:true})});}

export function isCompatibleServerEquipmentSnapshot(snapshot,options){try{decodeServerEquipmentSnapshot(snapshot,options);return true;}catch{return false;}}
