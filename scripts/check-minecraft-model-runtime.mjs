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
assert.deepEqual(runtime.blockIds,[BLOCK.CRAFTING_TABLE]);
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

const first=instantiateMinecraftModelTemplate(crafting,3,40,-2);
const second=instantiateMinecraftModelTemplate(crafting,3,40,-2);
assert.equal(first.length,1);
assert.deepEqual(first,second,'position-based model selection must be deterministic');
assert.equal(first[0].x,3);assert.equal(first[0].y,40);assert.equal(first[0].z,-2);
assert.equal(first[0].model.faces.length,6);
assert.equal(first[0].renderLayer,'opaque');
assert.equal(minecraftModelLayerForTexture('minecraft:block/crafting_table_top',first[0]),'opaque');

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

console.log('Minecraft interpreted-model preload/cache/template selection runtime: PASS');
