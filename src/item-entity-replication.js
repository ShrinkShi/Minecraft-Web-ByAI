import {ITEMS,maxStack} from './items.js';
import {itemDamage} from './item-stack.js';
import {assertNetworkSequence} from './network-sequence.js';

export const ITEM_ENTITY_REPLICATION_VERSION=2;
export const ITEM_ENTITY_SPAWN_KIND='item-entity-spawn';
export const ITEM_ENTITY_SNAPSHOT_KIND='item-entity-snapshot';
export const ITEM_ENTITY_DESPAWN_KIND='item-entity-despawn';
export const ITEM_ENTITY_DESPAWN_REASONS=Object.freeze(['picked','expired','removed']);
export const ITEM_ENTITY_ID_MAX_LENGTH=96;
const ID_PATTERN=/^i:[A-Za-z0-9][A-Za-z0-9_-]*$/;
const DESPAWN_REASON_SET=new Set(ITEM_ENTITY_DESPAWN_REASONS);
const STATE_KEYS=Object.freeze(['age','count','damage','entityId','itemId','kind','pickupDelay','position','revision','v','velocity']);
const DESPAWN_KEYS=Object.freeze(['entityId','kind','reason','revision','v']);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,expected,label){const keys=Object.keys(value).sort();if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function nonNegative(value,label,max=Number.MAX_SAFE_INTEGER){value=finite(value,label);if(value<0||value>max)throw new RangeError(`${label} is out of range`);return value;}
function itemId(value){if(typeof value!=='string'||!ITEMS[value])throw new RangeError('item entity itemId must reference a known item');return value;}
function count(value,id){if(!Number.isInteger(value)||value<1||value>maxStack(id))throw new RangeError(`item entity count must be an integer from 1 to ${maxStack(id)}`);return value;}
function vectorObject(value,label){value=object(value,label);return{x:finite(value.x,`${label}.x`),y:finite(value.y,`${label}.y`),z:finite(value.z,`${label}.z`)};}
function vectorWire(value,label){if(!Array.isArray(value)||value.length!==3)throw new TypeError(`${label} must contain three numbers`);return{x:finite(value[0],`${label}[0]`),y:finite(value[1],`${label}[1]`),z:finite(value[2],`${label}[2]`)};}
function despawnReason(value){if(!DESPAWN_REASON_SET.has(value))throw new RangeError(`unsupported item entity despawn reason: ${value}`);return value;}

export function assertItemEntityId(value){if(typeof value!=='string'||value.length<3||value.length>ITEM_ENTITY_ID_MAX_LENGTH||!ID_PATTERN.test(value))throw new RangeError('item entity id must be a safe i: identifier');return value;}

function encodeState(kind,state){
  state=object(state,'item entity state');const id=itemId(state.itemId),position=vectorObject(state.position,'item entity position'),velocity=vectorObject(state.velocity,'item entity velocity');
  return{v:ITEM_ENTITY_REPLICATION_VERSION,kind,entityId:assertItemEntityId(state.entityId),revision:assertNetworkSequence(state.revision,'item entity revision'),itemId:id,count:count(state.count,id),damage:itemDamage(state.damage,id,'item entity damage'),position:[position.x,position.y,position.z],velocity:[velocity.x,velocity.y,velocity.z],age:nonNegative(state.age,'item entity age',300),pickupDelay:nonNegative(state.pickupDelay,'item entity pickupDelay',60)};
}
function decodeState(value){
  exactKeys(value,STATE_KEYS,'item entity state');if(value.v!==ITEM_ENTITY_REPLICATION_VERSION)throw new RangeError(`unsupported item entity replication version: ${value.v}`);if(value.kind!==ITEM_ENTITY_SPAWN_KIND&&value.kind!==ITEM_ENTITY_SNAPSHOT_KIND)throw new RangeError(`unsupported item entity replication kind: ${value.kind}`);const id=itemId(value.itemId),damage=itemDamage(value.damage,id,'item entity damage');
  return{version:ITEM_ENTITY_REPLICATION_VERSION,kind:value.kind,entityId:assertItemEntityId(value.entityId),revision:assertNetworkSequence(value.revision,'item entity revision'),itemId:id,count:count(value.count,id),damage,position:vectorWire(value.position,'item entity position'),velocity:vectorWire(value.velocity,'item entity velocity'),age:nonNegative(value.age,'item entity age',300),pickupDelay:nonNegative(value.pickupDelay,'item entity pickupDelay',60)};
}

export function encodeItemEntitySpawn(state){return encodeState(ITEM_ENTITY_SPAWN_KIND,state);}
export function encodeItemEntitySnapshot(state){return encodeState(ITEM_ENTITY_SNAPSHOT_KIND,state);}
export function encodeItemEntityDespawn(entityId,revision,reason='removed'){return{v:ITEM_ENTITY_REPLICATION_VERSION,kind:ITEM_ENTITY_DESPAWN_KIND,entityId:assertItemEntityId(entityId),revision:assertNetworkSequence(revision,'item entity revision'),reason:despawnReason(reason)};}
export function decodeItemEntityReplication(value){value=object(value,'item entity replication');if(value.kind===ITEM_ENTITY_DESPAWN_KIND){exactKeys(value,DESPAWN_KEYS,'item entity despawn');if(value.v!==ITEM_ENTITY_REPLICATION_VERSION)throw new RangeError(`unsupported item entity replication version: ${value.v}`);return{version:ITEM_ENTITY_REPLICATION_VERSION,kind:value.kind,entityId:assertItemEntityId(value.entityId),revision:assertNetworkSequence(value.revision,'item entity revision'),reason:despawnReason(value.reason)};}return decodeState(value);}
export function isCompatibleItemEntityReplication(value){try{decodeItemEntityReplication(value);return true;}catch{return false;}}
