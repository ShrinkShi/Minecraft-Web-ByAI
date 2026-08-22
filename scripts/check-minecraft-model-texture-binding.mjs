import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildMinecraftModelMeshBatches} from '../src/minecraft-model-mesh-batch.js';
import {minecraftModelTextureLayerResolver} from '../src/minecraft-model-runtime.js';
import {
  createMinecraftModelAtlasResolver,
  createMinecraftModelTextureBinding,
  loadMinecraftModelAtlasResolver,
  normalizeMinecraftModelAtlasManifest
} from '../src/minecraft-model-texture-binding.js';

const MANIFEST_PATH=resolve(process.cwd(),'assets/model-textures/model-texture-atlas.json');
const raw=JSON.parse(readFileSync(MANIFEST_PATH,'utf8'));
const resolver=createMinecraftModelAtlasResolver(raw);

assert.equal(resolver.manifest.format,1);
assert.equal(resolver.manifest.minecraftVersion,'1.20.1');
assert.equal(resolver.manifest.sourceKind,'directory');
assert.equal(resolver.manifest.sourceRoot,'MC原版素材assets');
assert.equal('sourceArchiveSha256' in resolver.manifest,false);
assert.deepEqual(resolver.manifest.closure,{blockstates:12,models:58,textures:28,metadata:0});
assert.equal(resolver.textureCount,28);
assert.deepEqual(resolver.atlas,{
  path:'model-texture-atlas.png',
  sha256:'b8ccd8f5273ab896386ddd1e541419488b89b341748c520521d18fcf59d2658b',
  width:128,
  height:128,
  gutterPx:1,
  packing:'power-of-two-shelf-v1'
});
assert.equal(Object.isFrozen(resolver.manifest),true);
assert.equal(Object.isFrozen(resolver.manifest.closure),true);
assert.equal(Object.isFrozen(resolver.manifest.textures),true);
assert.equal(Object.isFrozen(resolver.requireRegion('block/glass')),true);

assert.equal(resolver.hasTexture('block/glass'),true);
assert.equal(resolver.hasTexture('minecraft:block/iron_ore'),true);
assert.equal(resolver.hasTexture('minecraft:block/furnace_front'),true);
assert.equal(resolver.hasTexture('minecraft:block/furnace_front_on'),true);
assert.equal(resolver.hasTexture('minecraft:block/furnace_side'),true);
assert.equal(resolver.hasTexture('minecraft:block/furnace_top'),true);
assert.equal(resolver.hasTexture('minecraft:block/farmland'),true);
assert.equal(resolver.hasTexture('minecraft:block/farmland_moist'),true);
assert.equal(resolver.hasTexture('minecraft:block/wheat_stage7'),true);
assert.equal(resolver.hasTexture('minecraft:block/not_imported'),false);
assert.deepEqual(resolver.requireRegion('block/glass'),{
  u0:0.4296875,
  v0:0.1484375,
  u1:0.5546875,
  v1:0.2734375
});
assert.deepEqual(resolver.requireRegion('block/furnace_front'),{
  u0:0.8515625,
  v0:0.0078125,
  u1:0.9765625,
  v1:0.1328125
});
assert.equal(resolver.requireTextureRecord('block/furnace_front').canonical,'assets/minecraft/textures/block/furnace_front.png');
assert.equal(resolver.requireTextureRecord('block/furnace_front').source,'MC原版素材assets/minecraft/textures/block/furnace_front.png');
assert.equal(resolver.requireTextureRecord('block/torch').canonical,'assets/minecraft/textures/block/torch.png');
assert.throws(()=>resolver.requireRegion('block/not_imported'),/not present in the tracked atlas/);
assert.throws(()=>resolver.hasTexture('../glass'),/resource path/);

const calls=[];
const textureBinding=createMinecraftModelTextureBinding(resolver,{
  resolveLayer:(texture,face,instance)=>{
    calls.push([texture,face?.tag,instance?.blockId]);
    return texture==='minecraft:block/glass'?'translucent':'opaque';
  }
});
const glassBinding=textureBinding('block/glass',{tag:'face'},{blockId:91});
assert.equal(glassBinding.layer,'translucent');
assert.deepEqual(glassBinding.region,resolver.requireRegion('minecraft:block/glass'));
assert.deepEqual(calls,[['minecraft:block/glass','face',91]]);
assert.equal(Object.isFrozen(glassBinding),true);

const runtimeBinding=createMinecraftModelTextureBinding(resolver,{resolveLayer:minecraftModelTextureLayerResolver});
assert.equal(runtimeBinding('block/glass',{tag:'face'},{blockId:20,renderLayer:'translucent',textureLayers:{}}).layer,'translucent');
assert.equal(runtimeBinding('block/iron_ore',{tag:'face'},{blockId:19,renderLayer:'opaque',textureLayers:{}}).layer,'opaque');
assert.equal(runtimeBinding('block/furnace_front',{tag:'face'},{blockId:21,renderLayer:'opaque',textureLayers:{}}).layer,'opaque');
assert.equal(runtimeBinding('block/glass',{tag:'face'},{blockId:20,renderLayer:'opaque',textureLayers:{'minecraft:block/glass':'cutout'}}).layer,'cutout');

const model={faces:[{
  direction:'north',
  sourceDirection:'north',
  texture:'minecraft:block/glass',
  vertices:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],
  normal:[0,0,-1],
  uvCorners:[[16,16],[16,0],[0,0],[0,16]],
  cullface:null,
  tintIndex:null
}]};
const batches=buildMinecraftModelMeshBatches([{x:0,y:0,z:0,model,blockId:91}],{textureBinding});
assert.equal(batches.opaque.faceCount,0);
assert.equal(batches.cutout.faceCount,0);
assert.equal(batches.translucent.faceCount,1);
assert.equal(batches.translucent.vertexCount,4);

assert.throws(()=>createMinecraftModelTextureBinding(resolver),/resolveLayer must be a function/);
const invalidLayerBinding=createMinecraftModelTextureBinding(resolver,{resolveLayer:()=> 'blend'});
assert.throws(()=>invalidLayerBinding('block/glass'),/unsupported Minecraft model render layer/);

let requestedUrl=null;
const loaded=await loadMinecraftModelAtlasResolver({
  fetchImpl:async url=>{
    requestedUrl=url;
    return{ok:true,status:200,json:async()=>raw};
  }
});
assert.equal(requestedUrl,'./assets/model-textures/model-texture-atlas.json');
assert.equal(loaded.textureCount,28);
assert.deepEqual(loaded.requireRegion('block/iron_ore'),resolver.requireRegion('block/iron_ore'));
await assert.rejects(
  ()=>loadMinecraftModelAtlasResolver({fetchImpl:async()=>({ok:false,status:404,json:async()=>({})})}),
  /HTTP 404/
);

const badFormat=structuredClone(raw);
badFormat.format=2;
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badFormat),/format must be 1/);

const badVersion=structuredClone(raw);
badVersion.minecraftVersion='1.20.2';
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badVersion),/Java 1\.20\.1/);

const badRegion=structuredClone(raw);
badRegion.textures['minecraft:block/glass'].region.u0=0;
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badRegion),/does not match pixelRegion/);

const badPixels=structuredClone(raw);
badPixels.textures['minecraft:block/glass'].pixelRegion.x=127;
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badPixels),/inside the atlas bounds/);

const nonCanonical=structuredClone(raw);
nonCanonical.textures={'block/glass':structuredClone(raw.textures['minecraft:block/glass'])};
assert.throws(()=>normalizeMinecraftModelAtlasManifest(nonCanonical),/texture key must be canonical/);

const badCanonical=structuredClone(raw);
badCanonical.textures['minecraft:block/glass'].canonical='assets/minecraft/textures/block/iron_ore.png';
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badCanonical),/canonical must match its resource ID/);

const badSource=structuredClone(raw);
badSource.textures['minecraft:block/glass'].source='elsewhere/glass.png';
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badSource),/source must end with its canonical path/);

const badClosureCount=structuredClone(raw);
badClosureCount.closure.textures=17;
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badClosureCount),/closure texture count must match/);

const badAtlasWidth=structuredClone(raw);
badAtlasWidth.atlas.width=96;
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badAtlasWidth),/square power-of-two/);

const badGutter=structuredClone(raw);
badGutter.atlas.gutterPx=2;
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badGutter),/gutter must be 1px/);

const badPacking=structuredClone(raw);
badPacking.atlas.packing='experimental';
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badPacking),/packing must be power-of-two-shelf-v1/);

const badSourceKind=structuredClone(raw);
badSourceKind.sourceKind='folder';
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badSourceKind),/sourceKind must be directory or archive/);

const missingSourceRoot=structuredClone(raw);
delete missingSourceRoot.sourceRoot;
assert.throws(()=>normalizeMinecraftModelAtlasManifest(missingSourceRoot),/sourceRoot must be a non-empty string/);

const mixedDirectoryArchive=structuredClone(raw);
mixedDirectoryArchive.sourceArchiveSha256='b65a2211175af90664de9f41ea422f4869eee855f0da4bf6fe0715434ebe9c69';
assert.throws(()=>normalizeMinecraftModelAtlasManifest(mixedDirectoryArchive),/directory provenance may not include archive fields/);

const legacyArchive=structuredClone(raw);
delete legacyArchive.sourceKind;delete legacyArchive.sourceRoot;
legacyArchive.sourceArchiveSha256='b65a2211175af90664de9f41ea422f4869eee855f0da4bf6fe0715434ebe9c69';
const normalizedLegacyArchive=normalizeMinecraftModelAtlasManifest(legacyArchive);
assert.equal(normalizedLegacyArchive.sourceKind,'archive');
assert.equal(normalizedLegacyArchive.sourceArchiveSha256,legacyArchive.sourceArchiveSha256);

const badArchiveSha=structuredClone(legacyArchive);
badArchiveSha.sourceArchiveSha256='not-a-sha';
assert.throws(()=>normalizeMinecraftModelAtlasManifest(badArchiveSha),/sourceArchiveSha256 must be a lowercase SHA-256/);

console.log('tracked Minecraft model atlas manifest + furnace directory provenance + strict texture binding resolver: PASS');
