import {assertClientSessionId} from './client-input-envelope.js';
import {ITEMS,maxStack} from './items.js';
import {INVENTORY_SLOT_COUNT} from './inventory-layout.js';
import {assertNetworkSequence} from './network-sequence.js';

export const SERVER_INVENTORY_SNAPSHOT_VERSION=1;
export const SERVER_INVENTORY_SNAPSHOT_KIND='inventory-snapshot';
export const SERVER_INVENTORY_MODES=Object.freeze(['survival','creative','adventure','spectator']);
const MODE_SET=new Set(SERVER_INVENTORY_MODES);
const SNAPSHOT_KEYS=Object.freeze(['kind','mode','revision','session','slots','v']);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function mode(value){if(!MODE_SET.has(value))throw new RangeError(`unsupported inventory snapshot mode: ${value}`);return value;}
function itemId(value,label){if(typeof value!=='string'||!ITEMS[value])throw new RangeError(`${label} must reference a known item`);return value;}
function count(value,id,label){if(!Number.isInteger(value)||value<1||value>maxStack(id))throw new RangeError(`${label} must be an integer from 1 to ${maxStack(id)}`);return value;}
function slots(value,label){if(!Array.isArray(value)||value.length!==INVENTORY_SLOT_COUNT)throw new RangeError(`${label} must contain exactly ${INVENTORY_SLOT_COUNT} slots`);return value;}
function assertExactKeys(value){const keys=Object.keys(value).sort();if(keys.length!==SNAPSHOT_KEYS.length||keys.some((key,index)=>key!==SNAPSHOT_KEYS[index]))throw new RangeError('server inventory snapshot contains unexpected fields');}
function encodeSlot(value,index){if(value===null||value===undefined)return null;value=object(value,`inventory slot ${index}`);const id=itemId(value.id,`inventory slot ${index} id`);return[id,count(value.count,id,`inventory slot ${index} count`)];}
function decodeSlot(value,index){if(value===null)return null;if(!Array.isArray(value)||value.length!==2)throw new TypeError(`inventory slot ${index} must be null or [itemId,count]`);const id=itemId(value[0],`inventory slot ${index} id`);return{id,count:count(value[1],id,`inventory slot ${index} count`)};}

export function encodeServerInventorySnapshot(snapshot){
  snapshot=object(snapshot,'server inventory snapshot state');
  return{v:SERVER_INVENTORY_SNAPSHOT_VERSION,kind:SERVER_INVENTORY_SNAPSHOT_KIND,session:assertClientSessionId(snapshot.session),revision:assertNetworkSequence(snapshot.revision,'inventory revision'),mode:mode(snapshot.mode),slots:slots(snapshot.slots,'inventory snapshot slots').map(encodeSlot)};
}

export function decodeServerInventorySnapshot(snapshot,{expectedSession=null}={}){
  snapshot=object(snapshot,'server inventory snapshot');assertExactKeys(snapshot);
  if(snapshot.v!==SERVER_INVENTORY_SNAPSHOT_VERSION)throw new RangeError(`unsupported server inventory snapshot version: ${snapshot.v}`);
  if(snapshot.kind!==SERVER_INVENTORY_SNAPSHOT_KIND)throw new RangeError(`unsupported server realtime message kind: ${snapshot.kind}`);
  const session=assertClientSessionId(snapshot.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('server inventory snapshot session mismatch');
  return{version:SERVER_INVENTORY_SNAPSHOT_VERSION,kind:SERVER_INVENTORY_SNAPSHOT_KIND,session,revision:assertNetworkSequence(snapshot.revision,'inventory revision'),mode:mode(snapshot.mode),slots:slots(snapshot.slots,'inventory snapshot slots').map(decodeSlot)};
}

export function isCompatibleServerInventorySnapshot(snapshot,options){try{decodeServerInventorySnapshot(snapshot,options);return true;}catch{return false;}}
