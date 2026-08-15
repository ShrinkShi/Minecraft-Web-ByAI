import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  DEFAULT_MINECRAFT_NAMESPACE,
  minecraftBlockstateAssetPath,
  minecraftModelAssetPath,
  minecraftTextureAssetPath,
  normalizeMinecraftResourceId,
  parseMinecraftResourceId
} from '../src/minecraft-resource-id.js';
import {resolveMinecraftBlockModel} from '../src/minecraft-model-resolver.js';

assert.equal(DEFAULT_MINECRAFT_NAMESPACE,'minecraft');
assert.deepEqual(parseMinecraftResourceId('block/stone'),{namespace:'minecraft',path:'block/stone',id:'minecraft:block/stone'});
assert.deepEqual(parseMinecraftResourceId('example:block/widget'),{namespace:'example',path:'block/widget',id:'example:block/widget'});
assert.equal(normalizeMinecraftResourceId('block/stone'),'minecraft:block/stone');
assert.equal(minecraftModelAssetPath('block/stone'),'./assets/minecraft/models/block/stone.json');
assert.equal(minecraftTextureAssetPath('block/stone'),'./assets/minecraft/textures/block/stone.png');
assert.equal(minecraftBlockstateAssetPath('grass_block'),'./assets/minecraft/blockstates/grass_block.json');
assert.throws(()=>normalizeMinecraftResourceId('Minecraft:block/stone'),/namespace/);
assert.throws(()=>normalizeMinecraftResourceId('minecraft:../stone'),/traversal/);
assert.throws(()=>normalizeMinecraftResourceId('minecraft:block//stone'),/empty path segments/);
assert.throws(()=>normalizeMinecraftResourceId('minecraft:block:stone'),/at most one/);
assert.throws(()=>minecraftBlockstateAssetPath('block/stone'),/must name a block/);

const inheritedElement={
  from:[0,0,0],to:[16,16,16],
  faces:{
    north:{texture:'#all',cullface:'north',rotation:90,tintindex:0},
    south:{texture:'#all'}
  }
};
const models=new Map([
  ['minecraft:block/base',{
    ambientocclusion:false,
    gui_light:'front',
    textures:{all:'minecraft:block/stone',particle:'#all'},
    elements:[inheritedElement]
  }],
  ['minecraft:block/child',{
    parent:'block/base',
    textures:{surface:'block/dirt',all:'#surface'}
  }],
  ['minecraft:block/grandchild',{
    parent:'minecraft:block/child',
    ambientocclusion:true,
    elements:[{
      from:[1,2,3],to:[4,5,6],shade:false,
      rotation:{origin:[8,8,8],axis:'y',angle:22.5,rescale:true},
      faces:{up:{texture:'#particle',uv:[1,2,3,4]}}
    }]
  }]
]);
const loaderCalls=[];
const loadModel=async id=>{loaderCalls.push(id);return models.get(id)??null;};

const child=await resolveMinecraftBlockModel('block/child',{loadModel});
assert.equal(child.id,'minecraft:block/child');
assert.equal(child.parent,'minecraft:block/base');
assert.deepEqual(child.lineage,['minecraft:block/base','minecraft:block/child']);
assert.equal(child.ambientOcclusion,false);
assert.equal(child.guiLight,'front');
assert.deepEqual(child.textures,{all:'minecraft:block/dirt',particle:'minecraft:block/dirt',surface:'minecraft:block/dirt'});
assert.equal(child.elements.length,1,'child without elements must inherit parent elements');
assert.equal(child.elements[0].faces.north.texture,'minecraft:block/dirt','child texture override must rebind inherited parent faces');
assert.equal(child.elements[0].faces.north.textureReference,'#all');
assert.equal(child.elements[0].faces.north.cullface,'north');
assert.equal(child.elements[0].faces.north.rotation,90);
assert.equal(child.elements[0].faces.north.tintIndex,0);
assert.equal(child.elements[0].faces.south.uv,null);
assert.ok(Object.isFrozen(child));
assert.ok(Object.isFrozen(child.elements));
assert.ok(Object.isFrozen(child.elements[0].faces));
assert.deepEqual(loaderCalls,['minecraft:block/child','minecraft:block/base']);

const grandchild=await resolveMinecraftBlockModel('minecraft:block/grandchild',{loadModel:async id=>models.get(id)??null});
assert.deepEqual(grandchild.lineage,['minecraft:block/base','minecraft:block/child','minecraft:block/grandchild']);
assert.equal(grandchild.ambientOcclusion,true);
assert.equal(grandchild.elements.length,1,'child elements must replace inherited elements rather than append');
assert.deepEqual(grandchild.elements[0].from,[1,2,3]);
assert.deepEqual(grandchild.elements[0].to,[4,5,6]);
assert.equal(grandchild.elements[0].shade,false);
assert.deepEqual(grandchild.elements[0].rotation,{origin:[8,8,8],axis:'y',angle:22.5,rescale:true});
assert.equal(grandchild.elements[0].faces.up.texture,'minecraft:block/dirt');
assert.deepEqual(grandchild.elements[0].faces.up.uv,[1,2,3,4]);

const directTexture=await resolveMinecraftBlockModel('block/direct',{loadModel:async id=>id==='minecraft:block/direct'?{
  elements:[{from:[0,0,0],to:[1,1,1],faces:{east:{texture:'example:block/direct'}}}]
}:null});
assert.equal(directTexture.elements[0].faces.east.texture,'example:block/direct');

await assert.rejects(()=>resolveMinecraftBlockModel('block/missing',{loadModel:async()=>null}),/missing Minecraft model: minecraft:block\/missing/);
await assert.rejects(()=>resolveMinecraftBlockModel('block/a',{loadModel:async id=>({
  'minecraft:block/a':{parent:'block/b'},
  'minecraft:block/b':{parent:'block/a'}
})[id]}),/parent cycle: minecraft:block\/a -> minecraft:block\/b -> minecraft:block\/a/);
await assert.rejects(()=>resolveMinecraftBlockModel('block/texture-cycle',{loadModel:async()=>({
  textures:{a:'#b',b:'#a'}
})}),/texture variable cycle/);
await assert.rejects(()=>resolveMinecraftBlockModel('block/missing-texture',{loadModel:async()=>({
  elements:[{from:[0,0,0],to:[16,16,16],faces:{north:{texture:'#nope'}}}]
})}),/missing Minecraft texture variable: #nope/);
await assert.rejects(()=>resolveMinecraftBlockModel('block/bad-face',{loadModel:async()=>({
  elements:[{from:[0,0,0],to:[16,16,16],faces:{north:{texture:'block/stone',rotation:45}}}]
})}),/rotation must be 0, 90, 180, or 270/);
await assert.rejects(()=>resolveMinecraftBlockModel('block/bad-rotation',{loadModel:async()=>({
  elements:[{from:[0,0,0],to:[16,16,16],rotation:{origin:[8,8,8],axis:'q',angle:22.5},faces:{north:{texture:'block/stone'}}}]
})}),/axis must be x, y, or z/);

const grassPath=new URL('../assets/minecraft/models/block/grass_block.json',import.meta.url);
const grassRaw=JSON.parse(await readFile(grassPath,'utf8'));
const grass=await resolveMinecraftBlockModel('minecraft:block/grass_block',{loadModel:async id=>{
  if(id==='minecraft:block/grass_block')return grassRaw;
  if(id==='minecraft:block/block')return{};
  return null;
}});
assert.deepEqual(grass.lineage,['minecraft:block/block','minecraft:block/grass_block']);
assert.equal(grass.elements.length,2,'tracked original 1.20.1 grass model must preserve base + overlay elements');
assert.equal(grass.elements[0].faces.up.texture,'minecraft:block/grass_block_top');
assert.equal(grass.elements[0].faces.up.tintIndex,0);
assert.equal(grass.elements[1].faces.north.texture,'minecraft:block/grass_block_side_overlay');
assert.equal(grass.elements[1].faces.north.tintIndex,0);
assert.equal(grass.elements[1].faces.north.cullface,'north');

console.log('Minecraft resource ids + parent/texture/element block model resolver: PASS');
