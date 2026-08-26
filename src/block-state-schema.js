const SAFE_NAME_RE=/^[a-z0-9_.-]+$/;
const RESERVED_NAMES=new Set(['__proto__','prototype','constructor']);
const PROPERTY_SPEC_BRAND=new WeakSet();
const SCHEMA_BRAND=new WeakSet();

function plainObject(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  return value;
}
function safeName(value,label){
  if(typeof value!=='string'||!SAFE_NAME_RE.test(value)||RESERVED_NAMES.has(value))throw new TypeError(`${label} must be a safe lowercase state name`);
  return value;
}
function propertySpec(kind,options={}){
  const spec=Object.freeze({kind,...options});PROPERTY_SPEC_BRAND.add(spec);return spec;
}
function hasOwn(object,key){return Object.hasOwn(object,key);}

export function enumStateProperty(values,{defaultValue}={}){
  if(!Array.isArray(values)||values.length===0)throw new TypeError('enum state property values must be a non-empty array');
  const normalized=values.map((value,index)=>safeName(value,`enum state property value[${index}]`));
  if(new Set(normalized).size!==normalized.length)throw new TypeError('enum state property values must be unique');
  const hasDefault=defaultValue!==undefined;
  if(hasDefault&&!normalized.includes(defaultValue))throw new RangeError(`enum state property default must be one of: ${normalized.join(', ')}`);
  return propertySpec('enum',{values:Object.freeze(normalized),hasDefault,defaultValue:hasDefault?defaultValue:null});
}

export function booleanStateProperty({defaultValue}={}){
  const hasDefault=defaultValue!==undefined;
  if(hasDefault&&typeof defaultValue!=='boolean')throw new TypeError('boolean state property default must be boolean');
  return propertySpec('boolean',{hasDefault,defaultValue:hasDefault?defaultValue:null});
}

export function integerStateProperty({min=Number.MIN_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER,defaultValue}={}){
  if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||min>max)throw new RangeError('integer state property bounds must be safe integers with min <= max');
  const hasDefault=defaultValue!==undefined;
  if(hasDefault&&(!Number.isSafeInteger(defaultValue)||defaultValue<min||defaultValue>max))throw new RangeError(`integer state property default must be in ${min}..${max}`);
  return propertySpec('integer',{min,max,hasDefault,defaultValue:hasDefault?defaultValue:null});
}

export function defineBlockStateSchema(name,properties){
  safeName(name,'block state schema name');plainObject(properties,'block state schema properties');
  const entries=Object.entries(properties).sort(([a],[b])=>a.localeCompare(b));
  if(entries.length===0)throw new TypeError('block state schema must define at least one property');
  for(const [property,spec] of entries){safeName(property,'block state property name');if(!PROPERTY_SPEC_BRAND.has(spec))throw new TypeError(`block state property ${property} must use a state property definition`);}
  const schema=Object.freeze({name,properties:Object.freeze(Object.fromEntries(entries))});SCHEMA_BRAND.add(schema);return schema;
}

function assertSchema(schema){if(!SCHEMA_BRAND.has(schema))throw new TypeError('block state schema must be created by defineBlockStateSchema');return schema;}
function normalizeBoolean(value,label){
  if(value===true||value==='true')return 'true';
  if(value===false||value==='false')return 'false';
  throw new TypeError(`${label} must be true or false`);
}
function normalizeInteger(value,spec,label){
  const number=typeof value==='number'?value:typeof value==='string'&&/^-?(?:0|[1-9]\d*)$/.test(value)?Number(value):Number.NaN;
  if(!Number.isSafeInteger(number)||number<spec.min||number>spec.max)throw new RangeError(`${label} must be an integer in ${spec.min}..${spec.max}`);
  return String(number);
}
function normalizeProperty(value,spec,label){
  if(spec.kind==='enum'){
    if(typeof value!=='string'||!spec.values.includes(value))throw new RangeError(`${label} must be one of: ${spec.values.join(', ')}`);
    return value;
  }
  if(spec.kind==='boolean')return normalizeBoolean(value,label);
  if(spec.kind==='integer')return normalizeInteger(value,spec,label);
  throw new TypeError(`${label} has unsupported schema kind: ${spec.kind}`);
}

export function normalizeBlockStateProperties(schema,value={}){
  assertSchema(schema);plainObject(value,`${schema.name} block state`);
  for(const key of Object.keys(value))if(!hasOwn(schema.properties,key))throw new TypeError(`${schema.name} block state contains unknown property: ${key}`);
  const output={};
  for(const [name,spec] of Object.entries(schema.properties)){
    let raw=hasOwn(value,name)?value[name]:undefined;
    if(raw===undefined){if(!spec.hasDefault)throw new TypeError(`${schema.name} block state property ${name} is required`);raw=spec.defaultValue;}
    output[name]=normalizeProperty(raw,spec,`${schema.name}.${name}`);
  }
  return Object.freeze(output);
}

export function canonicalBlockStateKey(schema,value={}){
  const state=normalizeBlockStateProperties(schema,value);
  return Object.entries(state).map(([name,property])=>`${name}=${property}`).join(',');
}

export function parseCanonicalBlockStateKey(schema,key){
  assertSchema(schema);if(typeof key!=='string')throw new TypeError('canonical block state key must be a string');
  const properties={};
  if(key!=='')for(const term of key.split(',')){
    const separator=term.indexOf('=');
    if(separator<=0||separator!==term.lastIndexOf('=')||separator===term.length-1)throw new TypeError(`invalid canonical block state term: ${term}`);
    const name=term.slice(0,separator),value=term.slice(separator+1);
    if(hasOwn(properties,name))throw new TypeError(`duplicate canonical block state property: ${name}`);
    properties[name]=value;
  }
  const normalized=normalizeBlockStateProperties(schema,properties);
  const canonical=Object.entries(normalized).map(([name,property])=>`${name}=${property}`).join(',');
  if(key!==canonical)throw new TypeError(`block state key is not canonical; expected ${canonical}`);
  return normalized;
}

const HORIZONTAL_FACING=Object.freeze(['north','east','south','west']);
const STAIR_SHAPES=Object.freeze(['straight','inner_left','inner_right','outer_left','outer_right']);

export const LOG_BLOCK_STATE_SCHEMA=defineBlockStateSchema('log',{axis:enumStateProperty(['x','y','z'],{defaultValue:'y'})});
export const FURNACE_BLOCK_STATE_SCHEMA=defineBlockStateSchema('furnace',{
  facing:enumStateProperty(HORIZONTAL_FACING,{defaultValue:'north'}),
  lit:booleanStateProperty({defaultValue:false})
});
export const FARMLAND_BLOCK_STATE_SCHEMA=defineBlockStateSchema('farmland',{moisture:integerStateProperty({min:0,max:7,defaultValue:0})});
export const WHEAT_BLOCK_STATE_SCHEMA=defineBlockStateSchema('wheat',{age:integerStateProperty({min:0,max:7,defaultValue:0})});
export const SLAB_BLOCK_STATE_SCHEMA=defineBlockStateSchema('slab',{
  type:enumStateProperty(['bottom','top','double'],{defaultValue:'bottom'}),
  waterlogged:booleanStateProperty({defaultValue:false})
});
export const STAIR_BLOCK_STATE_SCHEMA=defineBlockStateSchema('stair',{
  facing:enumStateProperty(HORIZONTAL_FACING,{defaultValue:'north'}),
  half:enumStateProperty(['bottom','top'],{defaultValue:'bottom'}),
  shape:enumStateProperty(STAIR_SHAPES,{defaultValue:'straight'}),
  waterlogged:booleanStateProperty({defaultValue:false})
});
export const FENCE_BLOCK_STATE_SCHEMA=defineBlockStateSchema('fence',{
  east:booleanStateProperty({defaultValue:false}),
  north:booleanStateProperty({defaultValue:false}),
  south:booleanStateProperty({defaultValue:false}),
  waterlogged:booleanStateProperty({defaultValue:false}),
  west:booleanStateProperty({defaultValue:false})
});
export const DOOR_BLOCK_STATE_SCHEMA=defineBlockStateSchema('door',{
  facing:enumStateProperty(HORIZONTAL_FACING,{defaultValue:'north'}),
  half:enumStateProperty(['lower','upper'],{defaultValue:'lower'}),
  hinge:enumStateProperty(['left','right'],{defaultValue:'left'}),
  open:booleanStateProperty({defaultValue:false}),
  powered:booleanStateProperty({defaultValue:false})
});

export const BLOCK_STATE_SCHEMAS=Object.freeze({
  log:LOG_BLOCK_STATE_SCHEMA,
  furnace:FURNACE_BLOCK_STATE_SCHEMA,
  farmland:FARMLAND_BLOCK_STATE_SCHEMA,
  wheat:WHEAT_BLOCK_STATE_SCHEMA,
  slab:SLAB_BLOCK_STATE_SCHEMA,
  stair:STAIR_BLOCK_STATE_SCHEMA,
  fence:FENCE_BLOCK_STATE_SCHEMA,
  door:DOOR_BLOCK_STATE_SCHEMA
});
