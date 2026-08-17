import assert from 'node:assert/strict';
import {MOB_MODEL_SPECS,MOB_MODEL_TYPES,minecraftCubeUvRects,mobModelSpec} from '../src/mob-model-specs.js';

assert.deepEqual([...MOB_MODEL_TYPES].sort(),['chicken','cow','creeper','pig','sheep','skeleton','spider','zombie']);
assert.deepEqual(minecraftCubeUvRects(0,0,8,8,8),{
  left:[0,8,8,16],front:[8,8,16,16],right:[16,8,24,16],back:[24,8,32,16],top:[8,0,16,8],bottom:[16,0,24,8]
});
assert.deepEqual(minecraftCubeUvRects(18,4,12,18,10),{
  left:[18,14,28,32],front:[28,14,40,32],right:[40,14,50,32],back:[50,14,62,32],top:[28,4,40,14],bottom:[40,4,52,14]
});

for(const type of MOB_MODEL_TYPES){
  const spec=mobModelSpec(type);assert.equal(spec,MOB_MODEL_SPECS[type]);
  assert.ok(spec.heightPixels>0,`${type} height must be positive`);
  const [textureWidth,textureHeight]=spec.textureSize;assert.ok(textureWidth>0&&textureHeight>0,`${type} texture dimensions must be positive`);
  assert.ok(spec.materials.base?.startsWith('entity.'),`${type} must bind a logical entity texture`);
  const partNames=new Set();let boxCount=0;
  for(const part of spec.parts){
    assert.ok(!partNames.has(part.name),`${type} part names must be unique: ${part.name}`);partNames.add(part.name);
    assert.equal(part.pivot.length,3);assert.equal(part.rotation.length,3);assert.ok(part.boxes.length>0,`${type}/${part.name} must contain geometry`);
    for(const box of part.boxes){
      boxCount++;assert.equal(box.size.length,3);assert.equal(box.offset.length,3);assert.equal(box.uv.length,2);assert.ok(spec.materials[box.material],`${type}/${box.name} references unknown material ${box.material}`);
      for(const size of box.size)assert.ok(size>0,`${type}/${box.name} dimensions must be positive`);
      const rects=minecraftCubeUvRects(box.uv[0],box.uv[1],...box.size);
      for(const [face,rect] of Object.entries(rects)){
        const [u0,v0,u1,v1]=rect;assert.ok(u0>=0&&v0>=0&&u1<=textureWidth&&v1<=textureHeight,`${type}/${box.name}/${face} UV ${rect} must fit ${textureWidth}x${textureHeight}`);assert.ok(u1>u0&&v1>v0);
      }
    }
  }
  assert.ok(boxCount>=5,`${type} must no longer collapse to a generic colored body/head proxy`);
}

const cowBody=MOB_MODEL_SPECS.cow.parts.find(part=>part.name==='body');
assert.deepEqual(cowBody.pivot,[0,19,2],'cow rotated body pivot must be converted from Java y=5 into Y-up ground space');
assert.deepEqual(cowBody.rotation,[-Math.PI/2,0,0],'cow X rotation must flip sign when converting Java Y-down model space to Three.js Y-up');
assert.deepEqual(cowBody.boxes.find(box=>box.name==='body').offset,[-6,-8,-7]);
const udder=cowBody.boxes.find(box=>box.name==='udder');
assert.ok(udder,'cow must include the source-model udder cuboid instead of painting its belly onto the back');
assert.deepEqual(udder.size,[4,6,1]);assert.deepEqual(udder.offset,[-2,-8,-8]);assert.deepEqual(udder.uv,[52,0]);
assert.equal(MOB_MODEL_SPECS.creeper.parts.filter(part=>part.name.endsWith('Leg')).length,4);
assert.equal(MOB_MODEL_SPECS.spider.parts.filter(part=>/Leg\d+$/.test(part.name)).length,8);
assert.ok(MOB_MODEL_SPECS.sheep.materials.fur==='entity.sheep_fur');
assert.ok(MOB_MODEL_SPECS.sheep.parts.some(part=>part.boxes.some(box=>box.material==='fur'&&box.inflate>0)),'sheep must preserve a separate fleece overlay');
assert.equal(MOB_MODEL_SPECS.skeleton.parts.find(part=>part.name==='leftArm').boxes[0].size[0],2,'skeleton limbs must stay visually thinner than zombie limbs');
assert.ok(MOB_MODEL_SPECS.chicken.parts.some(part=>part.name==='leftWing')&&MOB_MODEL_SPECS.chicken.parts.some(part=>part.name==='rightWing'));

console.log('vanilla-compatible mob cuboids + Y-up cow body/udder conversion + articulated UV bounds: PASS');
