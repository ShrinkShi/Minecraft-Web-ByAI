import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  assertMinecraftModelRuntime,
  compileMinecraftModelRuntime,
  instantiateMinecraftModelTemplate,
  minecraftModelLayerForTexture,
  minecraftModelSelectionHash,
  minecraftModelTemplate
} from '../src/minecraft-model-runtime.js';
import {BLOCK} from '../src/blocks.js';

function resourceUrl(resourceId,kind){
  const [namespace,path]=resourceId.split(':');
  return new URL(`../assets/${namespace}/${kind}/${path}.json`,import.meta.url);
}
async function readJson(url){return JSON.parse(await readFile(url,'utf8'));}

const blockstateReads=new Map(),modelReads=new Map();
const runtime=await compileMinecraftModelRuntime({
  loadBlockstate:async id=>{
    blockstateReads.set(id,(blockstateReads.get(id)||0)+1);
    return readJson(resourceUrl(id,'blockstates'));
  },
  loadModel:async id=>{
    modelReads.set(id,(modelReads.get(id)||0)+1);
    return readJson(resourceUrl(id,'models'));
  }
});

assert.equal(assertMinecraftModelRuntime(runtime),runtime);
assert.deepEqual(runtime.blockIds,[
  BLOCK.PLANKS,
  BLOCK.CRAFTING_TABLE,BLOCK.IRON_ORE,BLOCK.GLASS,BLOCK.FURNACE,
  BLOCK.FARMLAND,BLOCK.FARMLAND_MOISTURE_1,BLOCK.FARMLAND_MOISTURE_2,BLOCK.FARMLAND_MOISTURE_3,BLOCK.FARMLAND_MOISTURE_4,BLOCK.FARMLAND_MOISTURE_5,BLOCK.FARMLAND_MOISTURE_6,BLOCK.FARMLAND_MOISTURE_7,
  BLOCK.WHEAT_AGE_0,BLOCK.WHEAT_AGE_1,BLOCK.WHEAT_AGE_2,BLOCK.WHEAT_AGE_3,BLOCK.WHEAT_AGE_4,BLOCK.WHEAT_AGE_5,BLOCK.WHEAT_AGE_6,BLOCK.WHEAT_AGE_7,BLOCK.SHORT_GRASS,
  BLOCK.GRANITE,BLOCK.DIORITE,BLOCK.ANDESITE,BLOCK.SPRUCE_PLANKS,BLOCK.BIRCH_PLANKS,BLOCK.JUNGLE_PLANKS,BLOCK.ACACIA_PLANKS,BLOCK.DARK_OAK_PLANKS,BLOCK.MANGROVE_PLANKS,BLOCK.CHERRY_PLANKS
]);

const simpleFullCubes=[
  [BLOCK.PLANKS,'minecraft:oak_planks'],
  [BLOCK.GRANITE,'minecraft:granite'],
  [BLOCK.DIORITE,'minecraft:diorite'],
  [BLOCK.ANDESITE,'minecraft:andesite'],
  [BLOCK.SPRUCE_PLANKS,'minecraft:spruce_planks'],
  [BLOCK.BIRCH_PLANKS,'minecraft:birch_planks'],
  [BLOCK.JUNGLE_PLANKS,'minecraft:jungle_planks'],
  [BLOCK.ACACIA_PLANKS,'minecraft:acacia_planks'],
  [BLOCK.DARK_OAK_PLANKS,'minecraft:dark_oak_planks'],
  [BLOCK.MANGROVE_PLANKS,'minecraft:mangrove_planks'],
  [BLOCK.CHERRY_PLANKS,'minecraft:cherry_planks']
];
for(const [blockId,blockstate] of simpleFullCubes){
  const simple=minecraftModelTemplate(runtime,blockId);
  assert.equal(simple.blockstate,blockstate);
  assert.equal(simple.renderLayer,'opaque');
  assert.equal(simple.parts.length,1);
  assert.equal(simple.parts[0].kind,'variant');
  assert.equal(simple.parts[0].alternatives.models.length,1);
  assert.equal(simple.parts[0].alternatives.models[0].model.faces.length,6);
  assert.equal(blockstateReads.get(blockstate),1,`${blockstate} blockstate must be cached once`);
}

const crafting=minecraftModelTemplate(runtime,BLOCK.CRAFTING_TABLE);
assert.equal(crafting.blockstate,'minecraft:crafting_table');
assert.equal(crafting.renderLayer,'opaque');
assert.equal(crafting.parts.length,1);
assert.equal(crafting.parts[0].kind,'variant');
assert.equal(crafting.parts[0].alternatives.models.length,1);
assert.equal(crafting.parts[0].alternatives.models[0].modelId,'minecraft:block/crafting_table');
assert.equal(crafting.parts[0].alternatives.models[0].model.faces.length,6);
assert.equal(blockstateReads.get('minecraft:crafting_table'),1);
assert.equal(modelReads.get('minecraft:block/crafting_table'),1);
assert.equal(modelReads.get('minecraft:block/cube'),1);
assert.equal(modelReads.get('minecraft:block/block'),1);

const iron=minecraftModelTemplate(runtime,BLOCK.IRON_ORE);
assert.equal(iron.blockstate,'minecraft:iron_ore');
assert.equal(iron.renderLayer,'opaque');
assert.equal(iron.parts.length,1);
assert.equal(iron.parts[0].kind,'variant');
assert.equal(iron.parts[0].alternatives.models.length,1);
assert.equal(iron.parts[0].alternatives.models[0].modelId,'minecraft:block/iron_ore');
assert.equal(iron.parts[0].alternatives.models[0].model.faces.length,6);
assert.equal(blockstateReads.get('minecraft:iron_ore'),1);
assert.equal(modelReads.get('minecraft:block/iron_ore'),1);
assert.equal(modelReads.get('minecraft:block/cube_all'),1);
assert.equal(modelReads.get('minecraft:block/block'),1,'shared parent model remains cached across roots');

const glass=minecraftModelTemplate(runtime,BLOCK.GLASS);
assert.equal(glass.blockstate,'minecraft:glass');
assert.equal(glass.renderLayer,'translucent');
assert.equal(glass.parts.length,1);
assert.equal(glass.parts[0].kind,'variant');
assert.equal(glass.parts[0].alternatives.models.length,1);
assert.equal(glass.parts[0].alternatives.models[0].modelId,'minecraft:block/glass');
assert.equal(glass.parts[0].alternatives.models[0].model.faces.length,6);
assert.equal(blockstateReads.get('minecraft:glass'),1);
assert.equal(modelReads.get('minecraft:block/glass'),1);
assert.equal(modelReads.get('minecraft:block/cube_all'),1,'cube_all must remain cached across source-backed full cubes');

const furnace=minecraftModelTemplate(runtime,BLOCK.FURNACE);
assert.equal(furnace.blockstate,'minecraft:furnace');
assert.equal(furnace.renderLayer,'opaque');
assert.equal(furnace.parts.length,1);
assert.equal(furnace.parts[0].kind,'variant');
assert.equal(furnace.parts[0].alternatives.models.length,1);
assert.equal(furnace.parts[0].alternatives.models[0].modelId,'minecraft:block/furnace');
assert.equal(furnace.parts[0].alternatives.models[0].model.faces.length,6);
assert.equal(blockstateReads.get('minecraft:furnace'),1);
assert.equal(modelReads.get('minecraft:block/furnace'),1);
assert.equal(modelReads.get('minecraft:block/orientable'),1);
assert.equal(modelReads.get('minecraft:block/orientable_with_bottom'),1);
assert.equal(modelReads.get('minecraft:block/block'),1,'shared base model must remain cached after furnace parent resolution');

const shortGrass=minecraftModelTemplate(runtime,BLOCK.SHORT_GRASS);
assert.equal(shortGrass.blockstate,'minecraft:grass');
assert.equal(shortGrass.renderLayer,'cutout');
assert.equal(shortGrass.parts.length,1);
assert.equal(shortGrass.parts[0].alternatives.models[0].modelId,'minecraft:block/grass');
assert.equal(shortGrass.parts[0].alternatives.models[0].model.faces.length,4);
assert.ok(shortGrass.parts[0].alternatives.models[0].model.faces.every(face=>face.tintIndex===0),'canonical tinted_cross faces must preserve tintindex 0');
assert.equal(blockstateReads.get('minecraft:grass'),1);
assert.equal(modelReads.get('minecraft:block/grass'),1);
assert.equal(modelReads.get('minecraft:block/tinted_cross'),1);

const first=instantiateMinecraftModelTemplate(crafting,3,40,-2);
const second=instantiateMinecraftModelTemplate(crafting,3,40,-2);
assert.equal(first.length,1);
assert.deepEqual(first,second,'position-based model selection must be deterministic');
assert.equal(first[0].x,3);assert.equal(first[0].y,40);assert.equal(first[0].z,-2);
assert.equal(first[0].model.faces.length,6);
assert.equal(first[0].renderLayer,'opaque');
assert.equal(minecraftModelLayerForTexture('minecraft:block/crafting_table_top',first[0]),'opaque');
const ironInstance=instantiateMinecraftModelTemplate(iron,5,12,7)[0];assert.equal(ironInstance.modelId,'minecraft:block/iron_ore');assert.equal(minecraftModelLayerForTexture('minecraft:block/iron_ore',ironInstance),'opaque');
const glassInstance=instantiateMinecraftModelTemplate(glass,6,13,8)[0];assert.equal(glassInstance.modelId,'minecraft:block/glass');assert.equal(minecraftModelLayerForTexture('minecraft:block/glass',glassInstance),'translucent');
const furnaceInstance=instantiateMinecraftModelTemplate(furnace,7,14,9)[0];assert.equal(furnaceInstance.modelId,'minecraft:block/furnace');assert.equal(minecraftModelLayerForTexture('minecraft:block/furnace_front',furnaceInstance),'opaque');
const graniteInstance=instantiateMinecraftModelTemplate(minecraftModelTemplate(runtime,BLOCK.GRANITE),8,15,10)[0];assert.equal(graniteInstance.modelId,'minecraft:block/granite');assert.equal(minecraftModelLayerForTexture('minecraft:block/granite',graniteInstance),'opaque');

for(const position of [[0,0,0],[1,2,3],[-1,63,-9],[2147483647,1,-2147483648]]){
  const hash=minecraftModelSelectionHash(...position,BLOCK.CRAFTING_TABLE,0);
  assert.ok(Number.isInteger(hash)&&hash>=0&&hash<=0xffffffff,'selection hash must be uint32');
  assert.equal(hash,minecraftModelSelectionHash(...position,BLOCK.CRAFTING_TABLE,0));
}

const weightedRegistry={
  42:{blockstate:'minecraft:test_weighted',state:{powered:false},renderLayer:'cutout',textureLayers:{'minecraft:block/glass':'translucent'}}
};
const syntheticModels={
  'minecraft:block/a':{textures:{all:'minecraft:block/stone'},elements:[{from:[0,0,0],to:[16,16,16],faces:{north:{texture:'#all'}}}]},
  'minecraft:block/b':{textures:{all:'minecraft:block/glass'},elements:[{from:[0,0,0],to:[16,16,16],faces:{south:{texture:'#all'}}}]}
};
const weighted=await compileMinecraftModelRuntime({
  registry:weightedRegistry,
  loadBlockstate:async id=>id==='minecraft:test_weighted'?{variants:{'powered=false':[{model:'minecraft:block/a',weight:1},{model:'minecraft:block/b',weight:3}]}}:null,
  loadModel:async id=>syntheticModels[id]??null
});
const template=minecraftModelTemplate(weighted,42);
assert.equal(template.parts[0].alternatives.totalWeight,4);
let sawA=false,sawB=false;
for(let x=0;x<64;x++){
  const instance=instantiateMinecraftModelTemplate(template,x,10,0)[0];
  sawA ||= instance.modelId==='minecraft:block/a';
  sawB ||= instance.modelId==='minecraft:block/b';
  if(instance.modelId==='minecraft:block/b')assert.equal(minecraftModelLayerForTexture('minecraft:block/glass',instance),'translucent');
}
assert.ok(sawA&&sawB,'weighted templates must retain coordinate-varying alternatives');
assert.equal(minecraftModelLayerForTexture('minecraft:block/stone',instantiateMinecraftModelTemplate(template,0,10,0)[0]),'cutout');

assert.throws(()=>assertMinecraftModelRuntime({...runtime,format:99}),/format must be/);
assert.rejects(()=>compileMinecraftModelRuntime({loadBlockstate:async()=>null,loadModel:async()=>null}),/missing Minecraft blockstate/);

console.log('Minecraft interpreted-model preload/cache/template selection runtime + registry breadth full cubes + iron ore/glass/furnace/grass roots: PASS');