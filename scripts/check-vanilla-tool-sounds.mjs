import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BLOCK} from '../src/blocks.js';
import {blockSoundTransition} from '../src/vanilla-block-audio.js';
import {BLOCK_SOUND_TYPES,TOOL_ACTION_SOUND_EVENTS,VANILLA_SOUND_EVENTS,soundEventForBlock,soundEventForToolAction} from '../src/vanilla-sounds.js';

const toolExpected={
  till:{event:'item.hoe.till',variants:[
    ['0e6696ec35c5f4982cad6a6731edcffb11728aa9','minecraft/sounds/item/hoe/till1.ogg'],
    ['46dd1e5e0f90bb72261e2986d530e80e8fc50560','minecraft/sounds/item/hoe/till2.ogg'],
    ['cb95637a9d5e9b0cb36a2516f0dfac30fed9d720','minecraft/sounds/item/hoe/till4.ogg']
  ]},
  strip:{event:'item.axe.strip',variants:[
    ['42b2964c08f50be3fda62257202efe42f262c005','minecraft/sounds/item/axe/strip1.ogg'],
    ['38044a5747fd72dc26f3c0a37bef44ffa3744078','minecraft/sounds/item/axe/strip2.ogg'],
    ['a84dafa90faa56556346437e5f27ad047dc584ea','minecraft/sounds/item/axe/strip3.ogg'],
    ['7621881ced7901c92236f386c26cd678aaf9ba49','minecraft/sounds/item/axe/strip4.ogg']
  ]},
  flatten:{event:'item.shovel.flatten',variants:[
    ['659b0fb0ef28429e3b779d833d6eedd8305cbbbc','minecraft/sounds/item/shovel/flatten1.ogg'],
    ['ab51a39c66800bd6fd98c450131aac20790c535a','minecraft/sounds/item/shovel/flatten2.ogg'],
    ['188e05f8f12787ea22dd1836fe2c9c7e4efd03af','minecraft/sounds/item/shovel/flatten3.ogg'],
    ['2bf88ed6015273fa5b757531597cf156176b35f8','minecraft/sounds/item/shovel/flatten4.ogg']
  ]}
};

const blockEventExpected={
  'block.grass.break':[
    ['41cbf5dd08e951ad65883854e74d2e034929f572','minecraft/sounds/dig/grass1.ogg'],['86cb1bb0c45625b18e00a64098cd425a38f6d3f2','minecraft/sounds/dig/grass2.ogg'],['f7d7e5c7089c9b45fa5d1b31542eb455fad995db','minecraft/sounds/dig/grass3.ogg'],['c7b1005d4926f6a2e2387a41ab1fb48a72f18e98','minecraft/sounds/dig/grass4.ogg']
  ],
  'block.grass.place':null,
  'block.grass.step':[
    ['227ab99bf7c6cf0b2002e0f7957d0ff7e5cb0c96','minecraft/sounds/step/grass1.ogg'],['5c971029d9284676dce1dda2c9d202f8c47163b2','minecraft/sounds/step/grass2.ogg'],['76de0a736928eac5003691d73bdc2eda92116198','minecraft/sounds/step/grass3.ogg'],['bc28801224a0aa77fdc93bb7c6c94beacdf77331','minecraft/sounds/step/grass4.ogg'],['813ebd91b9c3fe1ac8f89f13c85d0755678f2165','minecraft/sounds/step/grass5.ogg'],['b88cafe403394cdcd4de0e3aeb7b76f24170c6fe','minecraft/sounds/step/grass6.ogg']
  ],
  'block.gravel.break':[
    ['e8b89f316f3e9989a87f6e6ff12db9abe0f8b09f','minecraft/sounds/dig/gravel1.ogg'],['c3b3797d04cb9640e1d3a72d5e96edb410388fa3','minecraft/sounds/dig/gravel2.ogg'],['48f7e1bb098abd36b9760cca27b9d4391a23de26','minecraft/sounds/dig/gravel3.ogg'],['7bf3553a4fe41a0078f4988a13d6e1ed8663ef4c','minecraft/sounds/dig/gravel4.ogg']
  ],
  'block.gravel.place':null,
  'block.gravel.step':[
    ['1d761cb3bcb45498719e4fba0751e1630e134f1a','minecraft/sounds/step/gravel1.ogg'],['ac7a7c8d106e26abc775b1b46150c083825d8ddc','minecraft/sounds/step/gravel2.ogg'],['c109b985a7e6d5d3828c92e00aefa49deca0eb8c','minecraft/sounds/step/gravel3.ogg'],['a47adece748059294c5f563c0fcac02fa0e4bab4','minecraft/sounds/step/gravel4.ogg']
  ],
  'block.stone.break':[
    ['4e094ed8dfa98656d8fec52a7d20c5ee6098b6ad','minecraft/sounds/dig/stone1.ogg'],['9c92f697142ae320584bf64c0d54381d59703528','minecraft/sounds/dig/stone2.ogg'],['8f23c02475d388b23e5faa680eafe6b991d7a9d4','minecraft/sounds/dig/stone3.ogg'],['363545a76277e5e47538b2dd3a0d6aa4f7a87d34','minecraft/sounds/dig/stone4.ogg']
  ],
  'block.stone.place':null,
  'block.stone.step':[
    ['4a2e3795ffd4d3aab0834b7e41903af3a8f7d197','minecraft/sounds/step/stone1.ogg'],['22a383d9c22342305a4f16fec0bb479a885f8da2','minecraft/sounds/step/stone2.ogg'],['a533e7ae975e62592de868e0d0572778614bd587','minecraft/sounds/step/stone3.ogg'],['d5218034051a13322d7b5efc0b5a9af739615f04','minecraft/sounds/step/stone4.ogg'],['48dd05ab2e4626d74206c2b09a628a3d59ce15e9','minecraft/sounds/step/stone5.ogg'],['c4810a3de80cb57f9cdf8deaacfd36cb619cdf0b','minecraft/sounds/step/stone6.ogg']
  ],
  'block.sand.break':[
    ['9e59c3650c6c3fc0a475f1b753b2fcfef430bf81','minecraft/sounds/dig/sand1.ogg'],['0fa4234797f336ada4e3735e013e44d1099afe57','minecraft/sounds/dig/sand2.ogg'],['c75589cc0087069f387de127dd1499580498738e','minecraft/sounds/dig/sand3.ogg'],['37afa06f97d58767a1cd1382386db878be1532dd','minecraft/sounds/dig/sand4.ogg']
  ],
  'block.sand.place':null,
  'block.sand.step':[
    ['9813c8185197f4a4296649f27a9d738c4a6dfc78','minecraft/sounds/step/sand1.ogg'],['bd1750c016f6bab40934eff0b0fb64c41c86e44b','minecraft/sounds/step/sand2.ogg'],['ab07279288fa49215bada5c17627e6a54ad0437c','minecraft/sounds/step/sand3.ogg'],['a474236fb0c75bd65a6010e87dbc000d345fc185','minecraft/sounds/step/sand4.ogg'],['9fd6d2c633d276b952f2ff2aaa1fa7e5fb5efd2a','minecraft/sounds/step/sand5.ogg']
  ],
  'block.wood.break':[
    ['9bc2a84d0aa98113fc52609976fae8fc88ea6333','minecraft/sounds/dig/wood1.ogg'],['98102533e6085617a2962157b4f3658f59aea018','minecraft/sounds/dig/wood2.ogg'],['45b2aef7b5049e81b39b58f8d631563fadcc778b','minecraft/sounds/dig/wood3.ogg'],['dc66978374a46ab2b87db6472804185824868095','minecraft/sounds/dig/wood4.ogg']
  ],
  'block.wood.place':null,
  'block.wood.step':[
    ['0a417ba6a01b0552e7d15f5ef175ee9037405e58','minecraft/sounds/step/wood1.ogg'],['de199b6c6f0f5ce2f653273d43f57979ee31c395','minecraft/sounds/step/wood2.ogg'],['20c0daaed4cc2a8b4dee028c8c85185e1322b003','minecraft/sounds/step/wood3.ogg'],['8989609f97122d2624e7db821e45e8da2352b025','minecraft/sounds/step/wood4.ogg'],['3c7e76b2eabe4f1199b94d308f1c763ccceac76c','minecraft/sounds/step/wood5.ogg'],['7f9bcd1e3a182da70b32881a7fe92dc17d531824','minecraft/sounds/step/wood6.ogg']
  ],
  'block.glass.break':[
    ['7274a2231ed4544a37e599b7b014e589e5377094','minecraft/sounds/random/glass1.ogg'],['87c47bda3645c68f18a49e83cbf06e5302d087ff','minecraft/sounds/random/glass2.ogg'],['ad7d770b7fff3b64121f75bd60cecfc4866d1cd6','minecraft/sounds/random/glass3.ogg']
  ],
  'block.glass.place':null,
  'block.glass.step':null
};
blockEventExpected['block.grass.place']=blockEventExpected['block.grass.break'];
blockEventExpected['block.gravel.place']=blockEventExpected['block.gravel.break'];
blockEventExpected['block.stone.place']=blockEventExpected['block.stone.break'];
blockEventExpected['block.sand.place']=blockEventExpected['block.sand.break'];
blockEventExpected['block.wood.place']=blockEventExpected['block.wood.break'];
blockEventExpected['block.glass.place']=blockEventExpected['block.stone.break'];
blockEventExpected['block.glass.step']=blockEventExpected['block.stone.step'];

const verifiedObjects=new Set();
function verifyVariants(eventName,expectedVariants){
  const variants=VANILLA_SOUND_EVENTS[eventName];assert.ok(variants,`missing sound event ${eventName}`);assert.equal(variants.length,expectedVariants.length,`${eventName} variant count`);
  for(let index=0;index<variants.length;index++){
    const variant=variants[index],[sha1,logicalPath]=expectedVariants[index];
    assert.equal(variant.sha1,sha1);assert.equal(variant.logicalPath,logicalPath);assert.equal(variant.objectPath,`${sha1.slice(0,2)}/${sha1}`);
    if(verifiedObjects.has(sha1))continue;verifiedObjects.add(sha1);
    const fileUrl=new URL(`../原版Minecraft音频文件/${variant.objectPath}`,import.meta.url),filePath=fileURLToPath(fileUrl);
    assert.equal(existsSync(filePath),true,`missing Mojang audio object ${variant.objectPath}`);
    assert.equal(createHash('sha1').update(readFileSync(filePath)).digest('hex'),sha1,`SHA-1 mismatch for ${logicalPath}`);
  }
}

for(const [kind,entry] of Object.entries(toolExpected)){
  assert.equal(TOOL_ACTION_SOUND_EVENTS[kind],entry.event);assert.equal(soundEventForToolAction(kind),entry.event);verifyVariants(entry.event,entry.variants);
}
for(const [eventName,variants] of Object.entries(blockEventExpected))verifyVariants(eventName,variants);

const typeExpected={
  [BLOCK.GRASS]:'grass',[BLOCK.DIRT]:'gravel',[BLOCK.STONE]:'stone',[BLOCK.SAND]:'sand',[BLOCK.PLANKS]:'wood',[BLOCK.LOG]:'wood',[BLOCK.LEAVES]:'grass',[BLOCK.CRAFTING_TABLE]:'wood',[BLOCK.COBBLESTONE]:'stone',
  [BLOCK.BED_NORTH_FOOT]:'wood',[BLOCK.BED_NORTH_HEAD]:'wood',[BLOCK.BED_SOUTH_FOOT]:'wood',[BLOCK.BED_SOUTH_HEAD]:'wood',[BLOCK.BED_WEST_FOOT]:'wood',[BLOCK.BED_WEST_HEAD]:'wood',[BLOCK.BED_EAST_FOOT]:'wood',[BLOCK.BED_EAST_HEAD]:'wood',
  [BLOCK.IRON_ORE]:'stone',[BLOCK.GLASS]:'glass',[BLOCK.FURNACE]:'stone',[BLOCK.FARMLAND]:'gravel',[BLOCK.DIRT_PATH]:'grass',[BLOCK.STRIPPED_OAK_LOG]:'wood'
};
for(const [id,type] of Object.entries(typeExpected)){
  assert.equal(BLOCK_SOUND_TYPES[id],type,`block ${id} sound type`);
  for(const action of ['break','place','step'])assert.equal(soundEventForBlock(Number(id),action),`block.${type}.${action}`);
}
assert.equal(soundEventForBlock(BLOCK.AIR,'break'),null);assert.equal(soundEventForBlock(BLOCK.WATER,'step'),null);assert.equal(soundEventForBlock(BLOCK.STONE,'hit'),null);assert.equal(soundEventForToolAction('unknown'),null);
assert.deepEqual(blockSoundTransition(BLOCK.STONE,BLOCK.AIR),{blockId:BLOCK.STONE,action:'break'});
assert.deepEqual(blockSoundTransition(BLOCK.AIR,BLOCK.PLANKS),{blockId:BLOCK.PLANKS,action:'place'});
assert.equal(blockSoundTransition(BLOCK.GRASS,BLOCK.FARMLAND),null);assert.equal(blockSoundTransition(BLOCK.AIR,BLOCK.AIR),null);

console.log(`source-backed Minecraft 1.20.1 tool + block sound events: PASS (${verifiedObjects.size} unique OGG objects)`);
