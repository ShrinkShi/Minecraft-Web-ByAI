import assert from 'node:assert/strict';
import {resolveMinecraftBlockModel} from '../src/minecraft-model-resolver.js';
import {compileMinecraftBlockModelGeometry} from '../src/minecraft-model-geometry.js';
import {applyMinecraftModelInstanceTransform} from '../src/minecraft-model-instance.js';
import {
  buildMinecraftModelMeshBatches,
  minecraftModelBatchTransferables,
  MINECRAFT_MODEL_RENDER_LAYERS
} from '../src/minecraft-model-mesh-batch.js';

assert.deepEqual(MINECRAFT_MODEL_RENDER_LAYERS,['opaque','cutout','translucent']);

const resolved=await resolveMinecraftBlockModel('block/batched',{loadModel:async()=>({
  textures:{stone:'block/stone',leaves:'block/oak_leaves',glass:'block/glass'},
  elements:[{
    from:[0,0,0],to:[16,16,16],
    faces:{
      north:{texture:'#stone',uv:[0,0,16,16],cullface:'north'},
      south:{texture:'#stone',uv:[4,4,12,12]},
      up:{texture:'#leaves',uv:[0,0,16,16],tintindex:0},
      east:{texture:'#glass',uv:[0,0,16,16],cullface:'east'}
    }
  }]
})});
const geometry=compileMinecraftBlockModelGeometry(resolved);
const model=applyMinecraftModelInstanceTransform(geometry,{y:90,uvlock:true});

const bindings={
  'minecraft:block/stone':{layer:'opaque',region:{u0:0,v0:.5,u1:.25,v1:.75}},
  'minecraft:block/oak_leaves':{layer:'cutout',region:{u0:.25,v0:.5,u1:.5,v1:.75}},
  'minecraft:block/glass':{layer:'translucent',region:{u0:.5,v0:.5,u1:.75,v1:.75}}
};
const cullCalls=[];
const tintCalls=[];
const batches=buildMinecraftModelMeshBatches([
  {x:10,y:20,z:-3,model,blockId:100}
],{
  textureBinding:texture=>bindings[texture],
  resolveTint:(face,instance)=>{
    tintCalls.push([face.sourceDirection,face.tintIndex,instance.blockId]);
    return face.tintIndex===0?[.2,.8,.3]:[1,1,1];
  },
  isCullFaceVisible:context=>{
    cullCalls.push([context.face.sourceDirection,context.direction,context.x,context.y,context.z]);
    return context.direction!=='south';
  }
});

// y=90 turns source north->east and source east->south. Only faces with an
// explicit cullface ask the neighbor-visibility callback; the source east/glass
// face is hidden, while the south face without cullface remains present.
assert.deepEqual(cullCalls,[['north','east',10,20,-3],['east','south',10,20,-3]]);
assert.equal(batches.opaque.faceCount,2);
assert.equal(batches.cutout.faceCount,1);
assert.equal(batches.translucent.faceCount,0);
assert.equal(batches.opaque.vertexCount,8);
assert.equal(batches.cutout.vertexCount,4);
assert.equal(batches.translucent.vertexCount,0);
assert.ok(batches.opaque.positions instanceof Float32Array);
assert.ok(batches.opaque.normals instanceof Float32Array);
assert.ok(batches.opaque.uvs instanceof Float32Array);
assert.ok(batches.opaque.colors instanceof Float32Array);
assert.ok(batches.opaque.indices instanceof Uint32Array);
assert.deepEqual([...batches.opaque.indices],[0,1,2,0,2,3,4,5,6,4,6,7]);

// The first surviving opaque face is source north -> final east. World block
// offsets are added only during batching; the model instance remains block-local.
assert.deepEqual([...batches.opaque.positions.slice(0,12)],[11,20,-3,11,21,-3,11,21,-2,11,20,-2]);
assert.deepEqual([...batches.opaque.normals.slice(0,12)],[1,0,0,1,0,0,1,0,0,1,0,0]);

// Stone atlas region is u=.00..25 / v=.50..75. Minecraft model V grows down,
// so the batching contract flips V into WebGL UV orientation.
assert.deepEqual([...batches.opaque.uvs.slice(0,8)],[0,.5,0,.75,.25,.75,.25,.5]);
// Source south uses an explicit 4..12 crop inside the same atlas region.
assert.deepEqual([...batches.opaque.uvs.slice(8,16)],[.1875,.5625,.1875,.6875,.0625,.6875,.0625,.5625]);
assert.deepEqual([...batches.opaque.colors.slice(0,12)],Array(12).fill(1));

const cutoutColors=[...batches.cutout.colors];
for(let i=0;i<cutoutColors.length;i+=3){
  assert.ok(Math.abs(cutoutColors[i]-.2)<1e-6);
  assert.ok(Math.abs(cutoutColors[i+1]-.8)<1e-6);
  assert.ok(Math.abs(cutoutColors[i+2]-.3)<1e-6);
}
assert.ok(tintCalls.some(call=>call[0]==='up'&&call[1]===0&&call[2]===100));

const transfers=minecraftModelBatchTransferables(batches);
assert.equal(transfers.length,15,'three render layers expose five transferable buffers each');
assert.ok(transfers.every(buffer=>buffer instanceof ArrayBuffer));
assert.equal(new Set(transfers).size,15,'each typed-array field owns an independent transferable buffer');

// Multiple instances append to one layer batch rather than producing one Mesh
// per block. The second instance doubles the opaque face/vertex counts.
const doubled=buildMinecraftModelMeshBatches([
  {x:0,y:0,z:0,model},
  {x:2,y:0,z:0,model}
],{
  textureBinding:texture=>bindings[texture],
  resolveTint:()=>[1,1,1],
  isCullFaceVisible:()=>true
});
assert.equal(doubled.opaque.faceCount,4);
assert.equal(doubled.opaque.vertexCount,16);
assert.equal(doubled.cutout.faceCount,2);
assert.equal(doubled.translucent.faceCount,2);
assert.deepEqual([...doubled.opaque.indices.slice(-6)],[12,13,14,12,14,15]);

// A face without cullface must not be suppressed merely because the callback
// would reject a full-cube neighbor. This is essential for internal/multipart
// model faces.
const noCullModel={faces:[{
  direction:'north',sourceDirection:'north',texture:'minecraft:block/stone',
  vertices:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],normal:[0,0,-1],
  uvCorners:[[16,16],[16,0],[0,0],[0,16]],cullface:null,tintIndex:null
}]};
let noCullCallbackCount=0;
const noCull=buildMinecraftModelMeshBatches([{x:0,y:0,z:0,model:noCullModel}],{
  textureBinding:texture=>bindings[texture],
  isCullFaceVisible:()=>{noCullCallbackCount++;return false;}
});
assert.equal(noCullCallbackCount,0);
assert.equal(noCull.opaque.faceCount,1);

assert.throws(()=>buildMinecraftModelMeshBatches(null,{textureBinding:()=>bindings['minecraft:block/stone']}),/instances must be an array/);
assert.throws(()=>buildMinecraftModelMeshBatches([]),/textureBinding must be a function/);
assert.throws(()=>buildMinecraftModelMeshBatches([{x:.5,y:0,z:0,model:noCullModel}],{textureBinding:texture=>bindings[texture]}),/integer block coordinate/);
assert.throws(()=>buildMinecraftModelMeshBatches([{x:0,y:0,z:0,model:noCullModel}],{textureBinding:()=>({layer:'blend',region:{u0:0,v0:0,u1:1,v1:1}})}),/unsupported render layer/);
assert.throws(()=>buildMinecraftModelMeshBatches([{x:0,y:0,z:0,model:noCullModel}],{textureBinding:()=>({layer:'opaque',region:{u0:0,v0:0,u1:0,v1:1}})}),/non-empty normalized atlas rectangle/);
assert.throws(()=>buildMinecraftModelMeshBatches([{x:0,y:0,z:0,model:{faces:[{...noCullModel.faces[0],uvCorners:[[17,0],[16,0],[0,0],[0,16]]}]}}],{textureBinding:texture=>bindings[texture]}),/outside the current 0..16 model-atlas contract/);
assert.throws(()=>buildMinecraftModelMeshBatches([{x:0,y:0,z:0,model:noCullModel}],{textureBinding:texture=>bindings[texture],resolveTint:()=>[2,1,1]}),/components must be within 0..1/);
assert.throws(()=>buildMinecraftModelMeshBatches([{x:0,y:0,z:0,model:{faces:[{...noCullModel.faces[0],cullface:'north'}]}}],{textureBinding:texture=>bindings[texture],isCullFaceVisible:()=>1}),/must return a boolean/);
assert.throws(()=>minecraftModelBatchTransferables({}),/missing Minecraft model mesh batch/);

console.log('Minecraft interpreted-model chunk batching + atlas/layer/cull/tint buffers: PASS');
