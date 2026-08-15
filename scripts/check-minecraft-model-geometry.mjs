import assert from 'node:assert/strict';
import {resolveMinecraftBlockModel} from '../src/minecraft-model-resolver.js';
import {compileMinecraftBlockModelGeometry,defaultMinecraftFaceUv} from '../src/minecraft-model-geometry.js';

const approx=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);
const approxVec=(actual,expected,epsilon=1e-9)=>{
  assert.equal(actual.length,expected.length);
  actual.forEach((value,index)=>approx(value,expected[index],epsilon));
};

const from=[2,3,4],to=[14,11,12];
assert.deepEqual(defaultMinecraftFaceUv(from,to,'down'),[2,4,14,12]);
assert.deepEqual(defaultMinecraftFaceUv(from,to,'up'),[2,4,14,12]);
assert.deepEqual(defaultMinecraftFaceUv(from,to,'north'),[2,5,14,13]);
assert.deepEqual(defaultMinecraftFaceUv(from,to,'south'),[2,5,14,13]);
assert.deepEqual(defaultMinecraftFaceUv(from,to,'west'),[4,5,12,13]);
assert.deepEqual(defaultMinecraftFaceUv(from,to,'east'),[4,5,12,13]);
assert.throws(()=>defaultMinecraftFaceUv(from,to,'sideways'),/unknown Minecraft model face direction/);

const cube=await resolveMinecraftBlockModel('block/test_cube',{loadModel:async id=>id==='minecraft:block/test_cube'?{
  textures:{all:'block/stone'},
  elements:[{
    from:[0,0,0],to:[16,16,16],
    faces:{
      down:{texture:'#all'},up:{texture:'#all'},north:{texture:'#all'},south:{texture:'#all'},west:{texture:'#all'},east:{texture:'#all',uv:[1,2,15,14],rotation:90,tintindex:2,cullface:'east'}
    }
  }]
}:null});
const compiled=compileMinecraftBlockModelGeometry(cube);
assert.equal(compiled.modelId,'minecraft:block/test_cube');
assert.equal(compiled.elements.length,1);
assert.equal(compiled.faces.length,6);
assert.deepEqual(compiled.bounds,{min:[0,0,0],max:[1,1,1]});
assert.ok(Object.isFrozen(compiled));
assert.ok(Object.isFrozen(compiled.faces));

const byDirection=Object.fromEntries(compiled.faces.map(face=>[face.direction,face]));
assert.deepEqual(byDirection.east.vertices,[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]);
assert.deepEqual(byDirection.west.vertices,[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]);
assert.deepEqual(byDirection.up.vertices,[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]);
assert.deepEqual(byDirection.down.vertices,[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]);
assert.deepEqual(byDirection.south.vertices,[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]);
assert.deepEqual(byDirection.north.vertices,[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]);
assert.deepEqual(byDirection.east.normal,[1,0,0]);
assert.deepEqual(byDirection.west.normal,[-1,0,0]);
assert.deepEqual(byDirection.up.normal,[0,1,0]);
assert.deepEqual(byDirection.down.normal,[0,-1,0]);
assert.deepEqual(byDirection.south.normal,[0,0,1]);
assert.deepEqual(byDirection.north.normal,[0,0,-1]);
assert.deepEqual(byDirection.north.uv,[0,0,16,16]);
assert.equal(byDirection.north.uvSource,'derived');
assert.deepEqual(byDirection.east.uv,[1,2,15,14]);
assert.equal(byDirection.east.uvSource,'explicit');
assert.equal(byDirection.east.rotation,90);
assert.equal(byDirection.east.tintIndex,2);
assert.equal(byDirection.east.cullface,'east');
assert.equal(byDirection.east.texture,'minecraft:block/stone');

const slab=await resolveMinecraftBlockModel('block/slab',{loadModel:async()=>({
  textures:{all:'block/oak_planks'},
  elements:[{from:[0,0,0],to:[16,8,16],faces:{down:{texture:'#all'},up:{texture:'#all'},north:{texture:'#all'},south:{texture:'#all'},west:{texture:'#all'},east:{texture:'#all'}}}]
})});
const slabGeometry=compileMinecraftBlockModelGeometry(slab);
const slabFaces=Object.fromEntries(slabGeometry.faces.map(face=>[face.direction,face]));
assert.deepEqual(slabGeometry.bounds,{min:[0,0,0],max:[1,.5,1]});
assert.deepEqual(slabFaces.up.uv,[0,0,16,16]);
assert.deepEqual(slabFaces.down.uv,[0,0,16,16]);
assert.deepEqual(slabFaces.north.uv,[0,8,16,16],'bottom slab side must derive the lower half of the texture');
assert.deepEqual(slabFaces.south.uv,[0,8,16,16]);
assert.deepEqual(slabFaces.west.uv,[0,8,16,16]);
assert.deepEqual(slabFaces.east.uv,[0,8,16,16]);

const rotated=await resolveMinecraftBlockModel('block/rotated',{loadModel:async()=>({
  textures:{all:'block/stone'},
  elements:[{
    from:[8,0,7],to:[10,16,9],
    rotation:{origin:[8,8,8],axis:'y',angle:45,rescale:false},
    shade:false,
    faces:{east:{texture:'#all'},north:{texture:'#all'}}
  }]
})});
const rotatedGeometry=compileMinecraftBlockModelGeometry(rotated);
const rotatedEast=rotatedGeometry.faces.find(face=>face.direction==='east');
const rootHalf=Math.SQRT1_2;
approxVec(rotatedEast.normal,[rootHalf,0,-rootHalf]);
assert.equal(rotatedEast.shade,false);
assert.notDeepEqual(rotatedEast.vertices,[[.625,0,.4375],[.625,1,.4375],[.625,1,.5625],[.625,0,.5625]],'element rotation must transform actual vertices');

const rescaled=await resolveMinecraftBlockModel('block/rescaled',{loadModel:async()=>({
  textures:{all:'block/stone'},
  elements:[{
    from:[7,0,7],to:[9,16,9],
    rotation:{origin:[8,8,8],axis:'y',angle:45,rescale:true},
    faces:{east:{texture:'#all'},west:{texture:'#all'},north:{texture:'#all'},south:{texture:'#all'}}
  }]
})});
const rescaledGeometry=compileMinecraftBlockModelGeometry(rescaled);
const plainRotated=await resolveMinecraftBlockModel('block/plain-rotated',{loadModel:async()=>({
  textures:{all:'block/stone'},
  elements:[{
    from:[7,0,7],to:[9,16,9],
    rotation:{origin:[8,8,8],axis:'y',angle:45,rescale:false},
    faces:{east:{texture:'#all'},west:{texture:'#all'},north:{texture:'#all'},south:{texture:'#all'}}
  }]
})});
const plainRotatedGeometry=compileMinecraftBlockModelGeometry(plainRotated);
const rescaledWidth=rescaledGeometry.bounds.max[0]-rescaledGeometry.bounds.min[0];
const plainWidth=plainRotatedGeometry.bounds.max[0]-plainRotatedGeometry.bounds.min[0];
assert.ok(rescaledWidth>plainWidth,'rescale=true must enlarge axes perpendicular to the element rotation axis');

const empty=compileMinecraftBlockModelGeometry({id:'minecraft:block/empty',ambientOcclusion:true,elements:[]});
assert.deepEqual(empty.elements,[]);
assert.deepEqual(empty.faces,[]);
assert.equal(empty.bounds,null);
assert.throws(()=>compileMinecraftBlockModelGeometry(null),/resolved Minecraft block model/);
assert.throws(()=>compileMinecraftBlockModelGeometry({elements:[{from:[0,0,0],to:[0,0,0],faces:{east:{texture:'minecraft:block/stone'}}}]}),/degenerate geometry/);

console.log('Minecraft cuboid geometry + derived UV + element rotation/rescale compiler: PASS');
