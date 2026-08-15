import {normalizeMinecraftResourceId} from './minecraft-resource-id.js';

const PROPERTY_NAME_RE=/^[a-z0-9_.-]+$/;
const PROPERTY_VALUE_RE=/^[a-z0-9_.-]+$/;
const RESERVED_PROPERTY_NAMES=new Set(['__proto__','prototype','constructor']);
const MODEL_ENTRY_KEYS=new Set(['model','x','y','uvlock','weight']);
const BLOCKSTATE_ROTATIONS=new Set([0,90,180,270]);
const UINT32_MAX=0xffffffff;

function object(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  return value;
}

function exactKeys(value,allowed,label){
  for(const key of Object.keys(value))if(!allowed.has(key))throw new TypeError(`${label} contains unsupported field: ${key}`);
}

function propertyName(value,label='blockstate property'){
  if(typeof value!=='string'||!PROPERTY_NAME_RE.test(value)||RESERVED_PROPERTY_NAMES.has(value))throw new TypeError(`${label} must be a safe name matching [a-z0-9_.-]+`);
  return value;
}

function propertyValue(value,label='blockstate property value'){
  if(typeof value!=='string'||!PROPERTY_VALUE_RE.test(value))throw new TypeError(`${label} must match [a-z0-9_.-]+`);
  return value;
}

function stateValue(value,label){
  if(typeof value==='string')return propertyValue(value,label);
  if(typeof value==='boolean')return value?'true':'false';
  if(typeof value==='number'&&Number.isInteger(value)&&Number.isFinite(value))return String(value);
  throw new TypeError(`${label} must be a string, boolean, or integer`);
}

export function normalizeMinecraftBlockStateProperties(value={}){
  object(value,'block state properties');
  const output={};
  for(const [name,raw] of Object.entries(value))output[propertyName(name)]=stateValue(raw,`block state property ${name}`);
  return Object.freeze(output);
}

function normalizeRotation(value,label){
  if(value===undefined)return 0;
  if(!Number.isInteger(value)||!BLOCKSTATE_ROTATIONS.has(value))throw new RangeError(`${label} must be 0, 90, 180, or 270`);
  return value;
}

function normalizeModelEntry(value,label){
  object(value,label);
  exactKeys(value,MODEL_ENTRY_KEYS,label);
  if(typeof value.model!=='string'||!value.model)throw new TypeError(`${label}.model must be a non-empty string`);
  const weight=value.weight===undefined?1:value.weight;
  if(!Number.isSafeInteger(weight)||weight<=0)throw new RangeError(`${label}.weight must be a positive safe integer`);
  if(value.uvlock!==undefined&&typeof value.uvlock!=='boolean')throw new TypeError(`${label}.uvlock must be a boolean`);
  return Object.freeze({
    model:normalizeMinecraftResourceId(value.model),
    x:normalizeRotation(value.x,`${label}.x`),
    y:normalizeRotation(value.y,`${label}.y`),
    uvlock:value.uvlock??false,
    weight
  });
}

function normalizeModelAlternatives(value,label){
  const entries=Array.isArray(value)?value:[value];
  if(!entries.length)throw new TypeError(`${label} must contain at least one model`);
  const normalized=entries.map((entry,index)=>normalizeModelEntry(entry,`${label}[${index}]`));
  let totalWeight=0;
  for(const entry of normalized){
    totalWeight+=entry.weight;
    if(!Number.isSafeInteger(totalWeight))throw new RangeError(`${label} total weight exceeds safe integer range`);
  }
  return Object.freeze({models:Object.freeze(normalized),totalWeight});
}

function parseVariantKey(key){
  if(typeof key!=='string')throw new TypeError('variant key must be a string');
  if(key==='')return Object.freeze([]);
  const conditions=[];
  const seen=new Set();
  for(const term of key.split(',')){
    if(!term||term.trim()!==term)throw new TypeError(`invalid Minecraft variant term: ${term}`);
    const separator=term.indexOf('=');
    if(separator<=0||separator!==term.lastIndexOf('=')||separator===term.length-1)throw new TypeError(`invalid Minecraft variant term: ${term}`);
    const name=propertyName(term.slice(0,separator),'variant property');
    const value=propertyValue(term.slice(separator+1),'variant value');
    if(seen.has(name))throw new TypeError(`duplicate Minecraft variant property: ${name}`);
    seen.add(name);
    conditions.push(Object.freeze({name,value}));
  }
  return Object.freeze(conditions);
}

function normalizeVariants(raw){
  if(raw===undefined)return Object.freeze([]);
  object(raw,'blockstate variants');
  const variants=[];
  for(const [key,value] of Object.entries(raw))variants.push(Object.freeze({
    key,
    conditions:parseVariantKey(key),
    alternatives:normalizeModelAlternatives(value,`blockstate variant ${JSON.stringify(key)}`)
  }));
  if(!variants.length)throw new TypeError('blockstate variants must not be empty');
  return Object.freeze(variants);
}

function normalizeTerminalConditionValue(value,label){
  if(typeof value!=='string'||!value)throw new TypeError(`${label} must be a non-empty string`);
  const options=value.split('|');
  if(options.some(option=>!option))throw new TypeError(`${label} contains an empty alternative`);
  return Object.freeze(options.map((option,index)=>propertyValue(option,`${label} alternative ${index}`)));
}

function normalizeMultipartCondition(raw,label='multipart condition'){
  object(raw,label);
  const entries=Object.entries(raw);
  if(!entries.length)throw new TypeError(`${label} must not be empty`);
  const clauses=[];
  for(const [key,value] of entries){
    if(key==='OR'||key==='AND'){
      if(!Array.isArray(value)||!value.length)throw new TypeError(`${label}.${key} must be a non-empty array`);
      clauses.push(Object.freeze({
        type:key.toLowerCase(),
        conditions:Object.freeze(value.map((entry,index)=>normalizeMultipartCondition(entry,`${label}.${key}[${index}]`)))
      }));
      continue;
    }
    const name=propertyName(key,`${label} property`);
    clauses.push(Object.freeze({
      type:'property',
      name,
      values:normalizeTerminalConditionValue(value,`${label}.${name}`)
    }));
  }
  return Object.freeze({type:'and',conditions:Object.freeze(clauses)});
}

function normalizeMultipart(raw){
  if(raw===undefined)return Object.freeze([]);
  if(!Array.isArray(raw)||!raw.length)throw new TypeError('blockstate multipart must be a non-empty array');
  return Object.freeze(raw.map((entry,index)=>{
    object(entry,`blockstate multipart[${index}]`);
    for(const key of Object.keys(entry))if(key!=='when'&&key!=='apply')throw new TypeError(`blockstate multipart[${index}] contains unsupported field: ${key}`);
    if(!Object.hasOwn(entry,'apply'))throw new TypeError(`blockstate multipart[${index}].apply is required`);
    return Object.freeze({
      when:entry.when===undefined?null:normalizeMultipartCondition(entry.when,`blockstate multipart[${index}].when`),
      alternatives:normalizeModelAlternatives(entry.apply,`blockstate multipart[${index}].apply`)
    });
  }));
}

export function normalizeMinecraftBlockstate(value){
  object(value,'Minecraft blockstate');
  const allowed=new Set(['variants','multipart']);
  exactKeys(value,allowed,'Minecraft blockstate');
  if(value.variants===undefined&&value.multipart===undefined)throw new TypeError('Minecraft blockstate must define variants or multipart');
  return Object.freeze({
    variants:normalizeVariants(value.variants),
    multipart:normalizeMultipart(value.multipart)
  });
}

function isNormalizedBlockstate(value){
  return !!value&&Object.isFrozen(value)&&Array.isArray(value.variants)&&Object.isFrozen(value.variants)&&Array.isArray(value.multipart)&&Object.isFrozen(value.multipart);
}

function variantMatches(variant,state){
  return variant.conditions.every(condition=>state[condition.name]===condition.value);
}

function conditionMatches(condition,state){
  if(condition.type==='property')return Object.hasOwn(state,condition.name)&&condition.values.includes(state[condition.name]);
  if(condition.type==='or')return condition.conditions.some(child=>conditionMatches(child,state));
  if(condition.type==='and')return condition.conditions.every(child=>conditionMatches(child,state));
  throw new TypeError(`unknown normalized multipart condition type: ${condition.type}`);
}

export function resolveMinecraftBlockstate(value,stateProperties={}){
  const blockstate=isNormalizedBlockstate(value)?value:normalizeMinecraftBlockstate(value);
  const state=normalizeMinecraftBlockStateProperties(stateProperties);
  const matchingVariants=blockstate.variants.filter(variant=>variantMatches(variant,state));
  if(matchingVariants.length>1)throw new Error(`ambiguous Minecraft blockstate variants: ${matchingVariants.map(variant=>JSON.stringify(variant.key)).join(', ')}`);
  if(blockstate.variants.length&&matchingVariants.length===0)throw new Error('no Minecraft blockstate variant matches the supplied state');
  const multipart=blockstate.multipart
    .map((entry,index)=>({entry,index}))
    .filter(({entry})=>entry.when===null||conditionMatches(entry.when,state))
    .map(({entry,index})=>Object.freeze({index,alternatives:entry.alternatives}));
  return Object.freeze({
    state,
    variant:matchingVariants.length?Object.freeze({key:matchingVariants[0].key,alternatives:matchingVariants[0].alternatives}):null,
    multipart:Object.freeze(multipart)
  });
}

export function selectMinecraftWeightedModel(alternatives,selection){
  if(!alternatives||!Array.isArray(alternatives.models)||!Number.isSafeInteger(alternatives.totalWeight)||alternatives.totalWeight<=0)throw new TypeError('alternatives must be a normalized Minecraft model alternative set');
  if(!Number.isInteger(selection)||selection<0||selection>UINT32_MAX)throw new RangeError('selection must be a uint32 integer');
  let target=selection%alternatives.totalWeight;
  for(const model of alternatives.models){
    if(target<model.weight)return model;
    target-=model.weight;
  }
  throw new Error('weighted Minecraft model selection fell outside normalized weights');
}
