import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  normalizeMinecraftBlockStateProperties,
  normalizeMinecraftBlockstate,
  resolveMinecraftBlockstate,
  selectMinecraftWeightedModel
} from '../src/minecraft-blockstate-resolver.js';

assert.deepEqual(normalizeMinecraftBlockStateProperties({facing:'north',powered:false,level:7}),{
  facing:'north',powered:'false',level:'7'
});
assert.throws(()=>normalizeMinecraftBlockStateProperties({Facing:'north'}),/property/);
assert.throws(()=>normalizeMinecraftBlockStateProperties(JSON.parse('{"__proto__":"north"}')),/safe name/);
assert.throws(()=>normalizeMinecraftBlockStateProperties({level:1.5}),/string, boolean, or integer/);
assert.throws(()=>normalizeMinecraftBlockStateProperties({axis:null}),/string, boolean, or integer/);

const variants=normalizeMinecraftBlockstate({variants:{
  'facing=north,half=bottom':{model:'block/example',x:90,y:270,uvlock:true},
  'facing=south,half=bottom':[
    {model:'block/example',weight:1},
    {model:'example:block/alternate',y:90,weight:3}
  ],
  'half=top':{model:'block/example_top'}
}});
assert.equal(variants.variants.length,3);
assert.equal(variants.multipart.length,0);

const north=resolveMinecraftBlockstate(variants,{facing:'north',half:'bottom',waterlogged:false});
assert.equal(north.variant.key,'facing=north,half=bottom','variant predicates may match a subset of the complete block state');
assert.equal(north.variant.alternatives.totalWeight,1);
assert.deepEqual(north.variant.alternatives.models[0],{
  model:'minecraft:block/example',x:90,y:270,uvlock:true,weight:1
});

const south=resolveMinecraftBlockstate(variants,{facing:'south',half:'bottom'});
assert.equal(south.variant.alternatives.totalWeight,4);
assert.equal(selectMinecraftWeightedModel(south.variant.alternatives,0).model,'minecraft:block/example');
assert.equal(selectMinecraftWeightedModel(south.variant.alternatives,1).model,'example:block/alternate');
assert.equal(selectMinecraftWeightedModel(south.variant.alternatives,3).model,'example:block/alternate');
assert.equal(selectMinecraftWeightedModel(south.variant.alternatives,4).model,'minecraft:block/example','selection wraps deterministically by total weight');
assert.equal(selectMinecraftWeightedModel(south.variant.alternatives,0xffffffff).model,'example:block/alternate');
assert.throws(()=>selectMinecraftWeightedModel(south.variant.alternatives,-1),/uint32/);
assert.throws(()=>selectMinecraftWeightedModel(south.variant.alternatives,0x100000000),/uint32/);

const top=resolveMinecraftBlockstate(variants,{half:'top',facing:'west'});
assert.equal(top.variant.alternatives.models[0].model,'minecraft:block/example_top');
assert.throws(()=>resolveMinecraftBlockstate(variants,{facing:'west',half:'bottom'}),/no Minecraft blockstate variant matches/);

const ambiguous=normalizeMinecraftBlockstate({variants:{
  '':{model:'block/default'},
  'powered=true':{model:'block/powered'}
}});
assert.throws(()=>resolveMinecraftBlockstate(ambiguous,{powered:true}),/ambiguous Minecraft blockstate variants/);

assert.throws(()=>normalizeMinecraftBlockstate({}),/must define variants or multipart/);
assert.throws(()=>normalizeMinecraftBlockstate({variants:{},extra:true}),/unsupported field: extra/);
assert.throws(()=>normalizeMinecraftBlockstate({variants:{'facing =north':{model:'block/x'}}}),/variant property/);
assert.throws(()=>normalizeMinecraftBlockstate({variants:{'facing=north,facing=south':{model:'block/x'}}}),/duplicate Minecraft variant property/);
assert.throws(()=>normalizeMinecraftBlockstate({variants:{'':{model:'block/x',x:45}}}),/must be 0, 90, 180, or 270/);
assert.throws(()=>normalizeMinecraftBlockstate({variants:{'':{model:'block/x',weight:0}}}),/positive safe integer/);
assert.throws(()=>normalizeMinecraftBlockstate({variants:{'':{model:'block/x',uvlock:1}}}),/must be a boolean/);
assert.throws(()=>normalizeMinecraftBlockstate({variants:{'':{model:'block/x',unknown:true}}}),/unsupported field: unknown/);

const multipart=normalizeMinecraftBlockstate({multipart:[
  {apply:{model:'block/always'}},
  {when:{north:'true',east:'false'},apply:{model:'block/north_only'}},
  {when:{facing:'north|south'},apply:[
    {model:'block/cardinal_a',weight:2},
    {model:'block/cardinal_b',weight:1}
  ]},
  {when:{OR:[{powered:'true'},{lit:'true'}]},apply:{model:'block/active'}},
  {when:{AND:[{axis:'x|z'},{extended:'true'}]},apply:{model:'block/extended'}},
  {when:{OR:[{powered:'true'},{lit:'true'}],waterlogged:'false'},apply:{model:'block/active_dry'}}
]});

const multiA=resolveMinecraftBlockstate(multipart,{
  north:true,east:false,facing:'south',powered:false,lit:true,axis:'z',extended:true,waterlogged:false
});
assert.equal(multiA.variant,null);
assert.deepEqual(multiA.multipart.map(entry=>entry.index),[0,1,2,3,4,5]);
assert.equal(multiA.multipart[2].alternatives.totalWeight,3);
assert.equal(selectMinecraftWeightedModel(multiA.multipart[2].alternatives,0).model,'minecraft:block/cardinal_a');
assert.equal(selectMinecraftWeightedModel(multiA.multipart[2].alternatives,1).model,'minecraft:block/cardinal_a');
assert.equal(selectMinecraftWeightedModel(multiA.multipart[2].alternatives,2).model,'minecraft:block/cardinal_b');

const multiB=resolveMinecraftBlockstate(multipart,{
  north:false,east:false,facing:'west',powered:false,lit:false,axis:'y',extended:true,waterlogged:false
});
assert.deepEqual(multiB.multipart.map(entry=>entry.index),[0]);

assert.throws(()=>normalizeMinecraftBlockstate({multipart:[]}),/non-empty array/);
assert.throws(()=>normalizeMinecraftBlockstate({multipart:[{when:{north:'true'}}]}),/apply is required/);
assert.throws(()=>normalizeMinecraftBlockstate({multipart:[{apply:{model:'block/x'},extra:true}]}),/unsupported field: extra/);
assert.throws(()=>normalizeMinecraftBlockstate({multipart:[{when:{OR:[]},apply:{model:'block/x'}}]}),/non-empty array/);
assert.throws(()=>normalizeMinecraftBlockstate({multipart:[{when:{facing:'north||south'},apply:{model:'block/x'}}]}),/empty alternative/);

const grassRaw=JSON.parse(await readFile(new URL('../assets/minecraft/blockstates/grass_block.json',import.meta.url),'utf8'));
const grass=normalizeMinecraftBlockstate(grassRaw);
const grassNormal=resolveMinecraftBlockstate(grass,{snowy:false});
assert.equal(grassNormal.variant.key,'snowy=false');
assert.equal(grassNormal.variant.alternatives.models.length,4);
assert.deepEqual(grassNormal.variant.alternatives.models.map(model=>model.y),[0,90,180,270]);
assert.ok(grassNormal.variant.alternatives.models.every(model=>model.model==='minecraft:block/grass_block'));
assert.equal(selectMinecraftWeightedModel(grassNormal.variant.alternatives,0).y,0);
assert.equal(selectMinecraftWeightedModel(grassNormal.variant.alternatives,1).y,90);
assert.equal(selectMinecraftWeightedModel(grassNormal.variant.alternatives,2).y,180);
assert.equal(selectMinecraftWeightedModel(grassNormal.variant.alternatives,3).y,270);
assert.equal(selectMinecraftWeightedModel(grassNormal.variant.alternatives,4).y,0);
const grassSnow=resolveMinecraftBlockstate(grass,{snowy:true});
assert.equal(grassSnow.variant.alternatives.models.length,1);
assert.equal(grassSnow.variant.alternatives.models[0].model,'minecraft:block/grass_block_snow');

const craftingRaw=JSON.parse(await readFile(new URL('../assets/minecraft/blockstates/crafting_table.json',import.meta.url),'utf8'));
const crafting=resolveMinecraftBlockstate(craftingRaw,{});
assert.equal(crafting.variant.key,'');
assert.equal(crafting.variant.alternatives.models[0].model,'minecraft:block/crafting_table');

console.log('Minecraft blockstate variants + weights + rotations + multipart conditions: PASS');
