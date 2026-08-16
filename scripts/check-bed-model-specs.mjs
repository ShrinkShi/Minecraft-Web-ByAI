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
assert.deepEqual(BED_HALF_SPECS.head.cuboids[0].faceUv.top,[10,6,26,22],'head mattress top must sample the pillow/red region rather than the wooden bed-sheet area');
assert.deepEqual(BED_HALF_SPECS.foot.cuboids[0].faceUv.top,[2,28,18,44],'foot mattress top must remain entirely on the red blanket region');
assert.equal(Object.isFrozen(BED_HALF_SPECS.head.cuboids[0].faceUv.top),true);

for(const [part,spec] of Object.entries(BED_HALF_SPECS)){
  assert.equal(bedHalfSpec(part),spec);assert.equal(spec.cuboids.length,3,`${part} must have one mattress and two outer legs`);
  let highest=0;
  for(const cuboid of spec.cuboids){
    const [w,h,d]=cuboid.size,[x,y,z]=cuboid.offset;assert.ok(w>0&&h>0&&d>0);assert.ok(x>=0&&y>=0&&z>=0);assert.ok(x+w<=16&&z+d<=16);highest=Math.max(highest,y+h);
    const rects={...minecraftCuboidUvRects(cuboid.uv[0],cuboid.uv[1],w,h,d),...cuboid.faceUv};
    for(const [face,[u0,v0,u1,v1]] of Object.entries(rects)){assert.ok(u0>=0&&v0>=0&&u1<=64&&v1<=64,`${part}/${cuboid.name}/${face} UV must fit the 64x64 red-bed sheet`);assert.ok(u1>u0&&v1>v0);}
  }
  assert.equal(highest,9,`${part} visual must remain 9/16 block high`);
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

console.log('bed half cuboids + corrected mattress UV bounds + four-facing render descriptors: PASS');
