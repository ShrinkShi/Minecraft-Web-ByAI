import assert from 'node:assert/strict';
import {BED_BLOCK_IDS,bedBlockMeta} from '../src/bed-rules.js';
import {BLOCKS} from '../src/blocks.js';
import {BED_FACING_ROTATION,BED_HALF_SPECS,BED_MODEL_HEIGHT,BED_TEXTURE_SIZE,bedHalfSpec,bedVisualDescriptor,minecraftCuboidUvRects} from '../src/bed-model-specs.js';

assert.deepEqual(BED_TEXTURE_SIZE,[64,64]);
assert.equal(BED_MODEL_HEIGHT,9/16);
assert.deepEqual(Object.keys(BED_HALF_SPECS).sort(),['foot','head']);
assert.deepEqual(Object.keys(BED_FACING_ROTATION).sort(),['east','north','south','west']);
assert.equal(BED_FACING_ROTATION.south,0);
assert.equal(BED_FACING_ROTATION.north,Math.PI);
assert.equal(BED_FACING_ROTATION.east,Math.PI/2);
assert.equal(BED_FACING_ROTATION.west,-Math.PI/2);

const headMattress=BED_HALF_SPECS.head.cuboids[0],footMattress=BED_HALF_SPECS.foot.cuboids[0];
for(const mattress of[headMattress,footMattress]){
  assert.deepEqual(mattress.size,[16,16,6],'bed entity sheet must retain its source-space 16x16x6 mattress cuboid');
  assert.deepEqual(mattress.offset,[0,0,0]);assert.deepEqual(mattress.position,[0,9,0]);assert.deepEqual(mattress.rotation,[Math.PI/2,0,0]);
}
assert.deepEqual(headMattress.uv,[0,0]);assert.deepEqual(footMattress.uv,[0,22]);
assert.deepEqual(minecraftCuboidUvRects(...headMattress.uv,...headMattress.size).front,[6,6,22,22],'source front face is the pillow/red head-mattress top after X rotation');
assert.deepEqual(minecraftCuboidUvRects(...footMattress.uv,...footMattress.size).front,[6,28,22,44],'source front face is the red foot-mattress top after X rotation');

for(const [part,spec] of Object.entries(BED_HALF_SPECS)){
  assert.equal(bedHalfSpec(part),spec);assert.equal(spec.cuboids.length,3,`${part} must have one mattress and two outer legs`);
  for(const cuboid of spec.cuboids){
    const [w,h,d]=cuboid.size;assert.ok(w>0&&h>0&&d>0);assert.equal(cuboid.offset.length,3);assert.equal(cuboid.position.length,3);assert.equal(cuboid.rotation.length,3);
    const rects=minecraftCuboidUvRects(cuboid.uv[0],cuboid.uv[1],w,h,d);
    for(const [face,[u0,v0,u1,v1]] of Object.entries(rects)){assert.ok(u0>=0&&v0>=0&&u1<=64&&v1<=64,`${part}/${cuboid.name}/${face} UV must fit the 64x64 red-bed sheet`);assert.ok(u1>u0&&v1>v0);}
  }
}
assert.equal(bedHalfSpec('other'),null);

for(const id of BED_BLOCK_IDS){
  const meta=bedBlockMeta(id),block=BLOCKS[id],descriptor=bedVisualDescriptor(4.9,7.2,-3.1,id);
  assert.equal(block.solid,true,`${id} must remain solid for existing gameplay/collision semantics`);
  assert.equal(block.fullCube,false,`${id} may not occlude neighbors as a full cube`);
  assert.equal(block.renderKind,'bed');assert.equal(block.bedPart,meta.part);assert.equal(block.bedFacing,meta.facing);
  assert.deepEqual(descriptor,{kind:'bed',x:4,y:7,z:-4,id,part:meta.part,facing:meta.facing,rotationY:BED_FACING_ROTATION[meta.facing]});
}
assert.equal(bedVisualDescriptor(0,0,0,3),null);

console.log('source-space bed mattress UV geometry + four-facing render descriptors: PASS');
