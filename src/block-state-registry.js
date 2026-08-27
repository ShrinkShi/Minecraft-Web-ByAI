import {BLOCK} from './blocks.js';
import {
  FURNACE_BLOCK_STATE_SCHEMA,
  LOG_BLOCK_STATE_SCHEMA,
  canonicalBlockStateKey,
  normalizeBlockStateProperties,
  parseCanonicalBlockStateKey
} from './block-state-schema.js';

const REGISTRY=new Map([
  [BLOCK.LOG,LOG_BLOCK_STATE_SCHEMA],
  [BLOCK.STRIPPED_OAK_LOG,LOG_BLOCK_STATE_SCHEMA],
  [BLOCK.FURNACE,FURNACE_BLOCK_STATE_SCHEMA]
]);

export const BLOCK_STATE_SCHEMA_REGISTRY=Object.freeze(Object.fromEntries([...REGISTRY.entries()]));

export function blockStateSchemaForId(blockId){
  const id=Number(blockId);
  return Number.isInteger(id)?REGISTRY.get(id)||null:null;
}

export function blockDefaultStateKey(blockId){
  const schema=blockStateSchemaForId(blockId);
  return schema?canonicalBlockStateKey(schema):null;
}

export function normalizeBlockStateForId(blockId,state={}){
  const schema=blockStateSchemaForId(blockId);
  if(!schema){
    if(state&&typeof state==='object'&&!Array.isArray(state)&&Object.keys(state).length===0)return Object.freeze({});
    throw new TypeError(`block ${Number(blockId)} does not define mutable block-state properties`);
  }
  return normalizeBlockStateProperties(schema,state);
}

export function canonicalBlockStateKeyForId(blockId,state={}){
  const schema=blockStateSchemaForId(blockId);
  if(!schema){
    normalizeBlockStateForId(blockId,state);
    return null;
  }
  return canonicalBlockStateKey(schema,state);
}

export function parseCanonicalBlockStateKeyForId(blockId,stateKey){
  const schema=blockStateSchemaForId(blockId);
  if(!schema){
    if(stateKey===null||stateKey===undefined||stateKey==='')return Object.freeze({});
    throw new TypeError(`block ${Number(blockId)} does not define mutable block-state properties`);
  }
  return parseCanonicalBlockStateKey(schema,stateKey);
}
