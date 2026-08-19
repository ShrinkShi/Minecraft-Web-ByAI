import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const runtimePath=resolve(root,'assets/minecraft/runtime-manifest.json');
const runtime=JSON.parse(readFileSync(runtimePath,'utf8'));
const source=JSON.parse(readFileSync(resolve(root,'assets/minecraft/source-manifest.json'),'utf8'));
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const pngSize=path=>{const bytes=readFileSync(path);assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG',`${path} must be a PNG`);return[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];};

assert.equal(runtime.format,1);
assert.equal(runtime.minecraftVersion,'1.20.1');
assert.equal(source.format,1);
assert.equal(source.minecraftVersion,'1.20.1');
for(const manifest of [runtime,source]){
  assert.equal(manifest.sourceKind,'directory');
  assert.equal(manifest.sourceRoot,'MC原版素材assets');
  assert.equal('sourceArchive' in manifest,false);
  assert.equal('sourceArchiveSha256' in manifest,false);
}

const atlasPath=resolve(root,'assets',runtime.atlas.path);
assert.equal(sha256(atlasPath),runtime.atlas.sha256,'tracked atlas must match generated runtime manifest checksum');
assert.deepEqual(pngSize(atlasPath),[64,64],'atlas must remain 4 * 16px');
assert.deepEqual(Object.keys(runtime.atlas.tiles).map(Number).sort((a,b)=>a-b),Array.from({length:16},(_,index)=>index));
assert.equal(runtime.atlas.tiles['12'].source,'textures/block/crafting_table_front.png');
assert.equal(runtime.atlas.tiles['14'].source,'textures/block/iron_ore.png');
assert.equal(runtime.atlas.tiles['15'].source,'textures/block/white_wool.png');
assert.equal(runtime.atlas.tiles['0'].treatment,'grass');
assert.equal(runtime.atlas.tiles['8'].treatment,'foliage');
assert.equal(runtime.atlas.tiles['9'].treatment,'water');

for(const [name,record] of Object.entries(runtime.items)){
  const path=resolve(root,'assets/items',name);
  assert.equal(sha256(path),record.sha256,`${name} must match the generated runtime checksum`);
  assert.ok(source.files[record.source],`${name} must retain an exact source-manifest record`);
}
assert.equal(runtime.items['iron_ingot.png'].source,'textures/item/iron_ingot.png');

// Direct item textures are copied byte-for-byte from the canonical extracted
// source directory. Lock equality directly so these cannot silently become
// hand-authored lookalikes even though they are not part of runtime.items.
for(const name of ['glass','furnace_top','furnace_side','furnace_front']){
  const tracked=resolve(root,'assets/items',`${name}.png`);
  const canonical=resolve(root,'MC原版素材assets/minecraft/textures/block',`${name}.png`);
  assert.equal(sha256(tracked),sha256(canonical),`${name}.png must remain byte-identical to the canonical extracted Minecraft texture`);
  assert.deepEqual(pngSize(tracked),[16,16],`${name}.png must retain the original 16x16 source dimensions`);
}
const ironPickaxeRuntime=resolve(root,'assets/items/iron_pickaxe.png');
const ironPickaxeCanonical=resolve(root,'MC原版素材assets/minecraft/textures/item/iron_pickaxe.png');
assert.equal(sha256(ironPickaxeRuntime),sha256(ironPickaxeCanonical),'iron_pickaxe.png must remain byte-identical to the canonical extracted Minecraft item texture');
assert.equal(sha256(ironPickaxeRuntime),'67305d8bd14e1d60633258f52055fce5aeaea7837c10e62d436fc16f163be627');
assert.deepEqual(pngSize(ironPickaxeRuntime),[16,16],'iron_pickaxe.png must retain the original 16x16 source dimensions');

for(const [relative,checksum] of Object.entries(runtime.referenceFiles)){
  assert.equal(sha256(resolve(root,'assets',relative)),checksum,`${relative} must match runtime manifest checksum`);
}

const entityDimensions={
  'textures/entity/cow/cow.png':[64,32],
  'textures/entity/sheep/sheep.png':[64,32],
  'textures/entity/sheep/sheep_fur.png':[64,32],
  'textures/entity/pig/pig.png':[64,32],
  'textures/entity/chicken.png':[64,32],
  'textures/entity/zombie/zombie.png':[64,64],
  'textures/entity/skeleton/skeleton.png':[64,32],
  'textures/entity/creeper/creeper.png':[64,32],
  'textures/entity/spider/spider.png':[64,32]
};
for(const [relative,size] of Object.entries(entityDimensions)){
  assert.ok(source.files[relative],`${relative} must be traceable to the canonical extracted source directory`);
  const runtimeRelative=`minecraft/${relative}`;
  assert.ok(runtime.referenceFiles[runtimeRelative],`${relative} must be carried into runtime resources`);
  assert.deepEqual(pngSize(resolve(root,'assets',runtimeRelative)),size,`${relative} dimensions must match the model UV contract`);
}

for(const required of [
  'textures/block/grass_block_top.png','textures/block/grass_block_side.png','textures/block/grass_block_side_overlay.png',
  'textures/block/crafting_table_front.png','textures/block/iron_ore.png','textures/block/white_wool.png',
  'textures/item/stick.png','textures/item/wooden_pickaxe.png','textures/item/stone_pickaxe.png','textures/item/raw_iron.png','textures/item/iron_ingot.png',
  'textures/entity/bed/red.png','models/block/grass_block.json','models/block/crafting_table.json',
  'blockstates/furnace.json','models/block/furnace.json','models/block/furnace_on.json','models/block/orientable.json','models/block/orientable_with_bottom.json'
])assert.ok(source.files[required],`${required} must be traceable to the canonical extracted source directory`);

assert.deepEqual(runtime.tintProfile.grass,[145,189,89]);
assert.deepEqual(runtime.tintProfile.foliage,[119,171,47]);
assert.deepEqual(runtime.tintProfile.water,[63,118,228]);
assert.deepEqual(runtime.tintProfile.leather,[160,101,64]);

console.log('Minecraft 1.20.1 directory-backed runtime assets + furnace/ingot/iron-pickaxe provenance + entity dimensions/checksums: PASS');