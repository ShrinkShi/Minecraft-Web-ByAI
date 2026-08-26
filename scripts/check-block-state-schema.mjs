import assert from 'node:assert/strict';
import {
  BLOCK_STATE_SCHEMAS,
  DOOR_BLOCK_STATE_SCHEMA,
  FARMLAND_BLOCK_STATE_SCHEMA,
  FENCE_BLOCK_STATE_SCHEMA,
  FURNACE_BLOCK_STATE_SCHEMA,
  LOG_BLOCK_STATE_SCHEMA,
  SLAB_BLOCK_STATE_SCHEMA,
  STAIR_BLOCK_STATE_SCHEMA,
  WHEAT_BLOCK_STATE_SCHEMA,
  booleanStateProperty,
  canonicalBlockStateKey,
  defineBlockStateSchema,
  enumStateProperty,
  integerStateProperty,
  normalizeBlockStateProperties,
  parseCanonicalBlockStateKey
} from '../src/block-state-schema.js';
import {resolveMinecraftBlockstate} from '../src/minecraft-blockstate-resolver.js';
import {minecraftModelBlockDescriptor} from '../src/minecraft-model-registry.js';
import {FARMLAND_BLOCK_IDS,WHEAT_BLOCK_IDS} from '../src/farming-rules.js';
import {BLOCK} from '../src/blocks.js';

assert.deepEqual(Object.keys(BLOCK_STATE_SCHEMAS),['log','furnace','farmland','wheat','slab','stair','fence','door']);

assert.deepEqual(normalizeBlockStateProperties(LOG_BLOCK_STATE_SCHEMA),{axis:'y'});
assert.equal(canonicalBlockStateKey(LOG_BLOCK_STATE_SCHEMA,{axis:'x'}),'axis=x');
assert.deepEqual(parseCanonicalBlockStateKey(LOG_BLOCK_STATE_SCHEMA,'axis=z'),{axis:'z'});
assert.throws(()=>normalizeBlockStateProperties(LOG_BLOCK_STATE_SCHEMA,{axis:'north'}),/log\.axis must be one of/);
assert.throws(()=>normalizeBlockStateProperties(LOG_BLOCK_STATE_SCHEMA,{axis:'y',facing:'north'}),/unknown property: facing/);

assert.deepEqual(normalizeBlockStateProperties(FURNACE_BLOCK_STATE_SCHEMA),{facing:'north',lit:'false'});
assert.deepEqual(normalizeBlockStateProperties(FURNACE_BLOCK_STATE_SCHEMA,{lit:true,facing:'west'}),{facing:'west',lit:'true'});
assert.equal(canonicalBlockStateKey(FURNACE_BLOCK_STATE_SCHEMA,{lit:false,facing:'east'}),'facing=east,lit=false');
assert.throws(()=>normalizeBlockStateProperties(FURNACE_BLOCK_STATE_SCHEMA,{lit:1}),/furnace\.lit must be true or false/);

assert.deepEqual(normalizeBlockStateProperties(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:7}),{moisture:'7'});
assert.deepEqual(normalizeBlockStateProperties(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:'3'}),{moisture:'3'});
assert.throws(()=>normalizeBlockStateProperties(FARMLAND_BLOCK_STATE_SCHEMA,{moisture:8}),/0\.\.7/);
assert.deepEqual(normalizeBlockStateProperties(WHEAT_BLOCK_STATE_SCHEMA,{age:'7'}),{age:'7'});
assert.throws(()=>normalizeBlockStateProperties(WHEAT_BLOCK_STATE_SCHEMA,{age:1.5}),/0\.\.7/);

assert.equal(canonicalBlockStateKey(SLAB_BLOCK_STATE_SCHEMA,{waterlogged:true,type:'top'}),'type=top,waterlogged=true');
assert.equal(canonicalBlockStateKey(STAIR_BLOCK_STATE_SCHEMA,{shape:'inner_left',waterlogged:true,half:'top',facing:'south'}),'facing=south,half=top,shape=inner_left,waterlogged=true');
assert.equal(canonicalBlockStateKey(FENCE_BLOCK_STATE_SCHEMA,{west:true,north:true}),'east=false,north=true,south=false,waterlogged=false,west=true');
assert.equal(canonicalBlockStateKey(DOOR_BLOCK_STATE_SCHEMA,{open:true,hinge:'right',facing:'east'}),'facing=east,half=lower,hinge=right,open=true,powered=false');

const stairKey='facing=east,half=top,shape=outer_right,waterlogged=false';
assert.deepEqual(parseCanonicalBlockStateKey(STAIR_BLOCK_STATE_SCHEMA,stairKey),{
  facing:'east',half:'top',shape:'outer_right',waterlogged:'false'
});
assert.throws(()=>parseCanonicalBlockStateKey(STAIR_BLOCK_STATE_SCHEMA,'half=top,facing=east,shape=outer_right,waterlogged=false'),/not canonical/);
assert.throws(()=>parseCanonicalBlockStateKey(STAIR_BLOCK_STATE_SCHEMA,'facing=east,facing=west,half=top,shape=straight,waterlogged=false'),/duplicate/);

const requiredSchema=defineBlockStateSchema('required_probe',{
  enabled:booleanStateProperty(),
  mode:enumStateProperty(['a','b']),
  count:integerStateProperty({min:1,max:3})
});
assert.throws(()=>normalizeBlockStateProperties(requiredSchema,{enabled:true,mode:'a'}),/count is required/);
assert.deepEqual(normalizeBlockStateProperties(requiredSchema,{mode:'b',count:'2',enabled:false}),{count:'2',enabled:'false',mode:'b'});
assert.equal(canonicalBlockStateKey(requiredSchema,{enabled:false,count:2,mode:'b'}),'count=2,enabled=false,mode=b');

const stairState=normalizeBlockStateProperties(STAIR_BLOCK_STATE_SCHEMA,{facing:'east'});
const resolved=resolveMinecraftBlockstate({variants:{
  'facing=east,half=bottom,shape=straight,waterlogged=false':{model:'minecraft:block/oak_stairs'},
  'facing=north,half=bottom,shape=straight,waterlogged=false':{model:'minecraft:block/oak_stairs'}
}},stairState);
assert.equal(resolved.variant.key,'facing=east,half=bottom,shape=straight,waterlogged=false');
assert.deepEqual(resolved.state,stairState,'schema output must feed the existing Minecraft blockstate resolver without translation');

assert.deepEqual(minecraftModelBlockDescriptor(BLOCK.FURNACE).state,normalizeBlockStateProperties(FURNACE_BLOCK_STATE_SCHEMA));
FARMLAND_BLOCK_IDS.forEach((blockId,moisture)=>{
  assert.deepEqual(minecraftModelBlockDescriptor(blockId).state,normalizeBlockStateProperties(FARMLAND_BLOCK_STATE_SCHEMA,{moisture}));
});
WHEAT_BLOCK_IDS.forEach((blockId,age)=>{
  assert.deepEqual(minecraftModelBlockDescriptor(blockId).state,normalizeBlockStateProperties(WHEAT_BLOCK_STATE_SCHEMA,{age}));
});

for(const schema of Object.values(BLOCK_STATE_SCHEMAS)){
  const normalized=normalizeBlockStateProperties(schema);
  assert.ok(Object.isFrozen(normalized),`${schema.name} normalized state must be immutable`);
  assert.deepEqual(parseCanonicalBlockStateKey(schema,canonicalBlockStateKey(schema)),normalized,`${schema.name} canonical key must round-trip`);
}

console.log('block state schema checks passed');
