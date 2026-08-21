import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {TOOL_ACTION_SOUND_EVENTS,VANILLA_SOUND_EVENTS,soundEventForToolAction} from '../src/vanilla-sounds.js';

const expected={
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

for(const [kind,entry] of Object.entries(expected)){
  assert.equal(TOOL_ACTION_SOUND_EVENTS[kind],entry.event);
  assert.equal(soundEventForToolAction(kind),entry.event);
  const variants=VANILLA_SOUND_EVENTS[entry.event];
  assert.equal(variants.length,entry.variants.length);
  for(let index=0;index<variants.length;index++){
    const variant=variants[index],[sha1,logicalPath]=entry.variants[index];
    assert.equal(variant.sha1,sha1);assert.equal(variant.logicalPath,logicalPath);assert.equal(variant.objectPath,`${sha1.slice(0,2)}/${sha1}`);
    const fileUrl=new URL(`../原版Minecraft音频文件/${variant.objectPath}`,import.meta.url),filePath=fileURLToPath(fileUrl);
    assert.equal(existsSync(filePath),true,`missing Mojang audio object ${variant.objectPath}`);
    assert.equal(createHash('sha1').update(readFileSync(filePath)).digest('hex'),sha1,`SHA-1 mismatch for ${logicalPath}`);
  }
}
assert.equal(soundEventForToolAction('unknown'),null);
console.log('source-backed Minecraft 1.20.1 tool sound events: PASS');
