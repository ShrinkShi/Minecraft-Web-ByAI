import assert from 'node:assert/strict';
import {resolveMinecraftBlockModel} from '../src/minecraft-model-resolver.js';
import {compileMinecraftBlockModelGeometry} from '../src/minecraft-model-geometry.js';
import {
  applyMinecraftModelInstanceTransform,
  minecraftFaceUvCorners,
  transformMinecraftModelDirection
} from '../src/minecraft-model-instance.js';

const approx=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);
const approxVec=(actual,expected,epsilon=1e-9)=>{assert.equal(actual.length,expected.length);actual.forEach((value,index)=>approx(value,expected[index],epsilon));};

assert.equal(transformMinecraftModelDirection('north',{y:90}),'east','Minecraft +90 Y blockstate rotation turns north toward east');
assert.equal(transformMinecraftModelDirection('east',{y:90}),'south');
assert.equal(transformMinecraftModelDirection('up',{x:90}),'north');
assert.equal(transformMinecraftModelDirection('north',{x:90}),'down');
assert.equal(transformMinecraftModelDirection('north',{x:90,y:90}),'down','model-state composition applies X before Y');
assert.equal(transformMinecraftModelDirection('north',{y:270}),'west');
assert.throws(()=>transformMinecraftModelDirection('north',{y:45}),/0, 90, 180, or 270/);
assert.throws(()=>transformMinecraftModelDirection('sideways'),/unknown Minecraft model direction/);

const northVertices=[[0,0,0],[0,1,0],[1,1,0],[1,0,0]];
assert.deepEqual(minecraftFaceUvCorners([0,0,16,16],0,{vertices:northVertices,direction:'north'}),[[16,16],[16,0],[0,0],[0,16]]);
assert.deepEqual(minecraftFaceUvCorners([0,0,16,16],90,{vertices:northVertices,direction:'north'}),[[16,0],[0,0],[0,16],[16,16]],'face rotation is a clockwise texture-vertex permutation');
assert.deepEqual(minecraftFaceUvCorners([16,0,0,16],0,{vertices:northVertices,direction:'north'}),[[0,16],[0,0],[16,0],[16,16]],'flipped explicit UV rectangles remain flipped');

const cube=await resolveMinecraftBlockModel('block/instance_cube',{loadModel:async()=>({
  textures:{all:'block/stone'},
  elements:[{
    from:[0,0,0],to:[16,16,16],
    faces:{
      north:{texture:'#all',uv:[0,0,16,16],cullface:'north'},
      up:{texture:'#all',uv:[0,0,16,16]},
      east:{texture:'#all',uv:[2,4,14,12],rotation:90,cullface:'east'}
    }
  }]
})});
const geometry=compileMinecraftBlockModelGeometry(cube);

const identity=applyMinecraftModelInstanceTransform(geometry,{x:0,y:0,uvlock:false});
assert.equal(identity.modelId,'minecraft:block/instance_cube');
assert.deepEqual(identity.bounds,{min:[0,0,0],max:[1,1,1]});
assert.deepEqual(identity.faces.map(face=>face.direction),['up','north','east']);
assert.deepEqual(identity.faces.map(face=>face.sourceDirection),['up','north','east']);
assert.deepEqual(identity.faces.find(face=>face.direction==='north').uvCorners,[[16,16],[16,0],[0,0],[0,16]]);
assert.equal(identity.faces.find(face=>face.direction==='north').cullface,'north');
assert.equal(identity.faces.find(face=>face.direction==='north').sourceCullface,'north');

const rotateY=applyMinecraftModelInstanceTransform(geometry,{y:90,uvlock:false});
const rotatedNorth=rotateY.faces.find(face=>face.sourceDirection==='north');
assert.equal(rotatedNorth.direction,'east');
assert.equal(rotatedNorth.cullface,'east');
assert.deepEqual(rotatedNorth.vertices,[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]);
assert.deepEqual(rotatedNorth.normal,[1,0,0]);
assert.deepEqual(rotatedNorth.uvCorners,[[16,16],[16,0],[0,0],[0,16]],'without uvlock texture coordinates remain attached to source vertices');
assert.deepEqual(rotateY.bounds,{min:[0,0,0],max:[1,1,1]});

const topNoLock=rotateY.faces.find(face=>face.sourceDirection==='up');
const rotateYLocked=applyMinecraftModelInstanceTransform(geometry,{y:90,uvlock:true});
const topLocked=rotateYLocked.faces.find(face=>face.sourceDirection==='up');
assert.equal(topLocked.direction,'up');
assert.deepEqual(topNoLock.uvCorners,[[0,16],[16,16],[16,0],[0,0]]);
assert.deepEqual(topLocked.uvCorners,[[0,0],[0,16],[16,16],[16,0]],'uvlock reprojects UV roles in the final face orientation');
assert.notDeepEqual(topLocked.uvCorners,topNoLock.uvCorners);

const flipXNoLock=applyMinecraftModelInstanceTransform(geometry,{x:180,uvlock:false});
const flipXLocked=applyMinecraftModelInstanceTransform(geometry,{x:180,uvlock:true});
const northNoLock=flipXNoLock.faces.find(face=>face.sourceDirection==='north');
const northLocked=flipXLocked.faces.find(face=>face.sourceDirection==='north');
assert.equal(northLocked.direction,'south');
assert.equal(northLocked.cullface,'south');
assert.deepEqual(northNoLock.uvCorners,[[16,16],[16,0],[0,0],[0,16]]);
assert.deepEqual(northLocked.uvCorners,[[0,0],[0,16],[16,16],[16,0]],'x=180 uvlock keeps a side texture upright instead of flipping it with the model');

const explicitEast=identity.faces.find(face=>face.sourceDirection==='east');
assert.deepEqual(explicitEast.uvCorners,[[14,4],[2,4],[2,12],[14,12]],'explicit crop + clockwise face rotation are compiled to final UV corners');

const partial=await resolveMinecraftBlockModel('block/partial_instance',{loadModel:async()=>({
  textures:{all:'block/oak_planks'},
  elements:[{
    from:[2,4,6],to:[14,12,10],
    faces:{up:{texture:'#all',uv:[3,5,11,13]},north:{texture:'#all',uv:[1,2,9,10]}}
  }]
})});
const partialGeometry=compileMinecraftBlockModelGeometry(partial);
const partialLocked=applyMinecraftModelInstanceTransform(partialGeometry,{y:90,uvlock:true});
assert.deepEqual(partialLocked.bounds,{min:[.375,.25,.125],max:[.625,.75,.875]});
assert.equal(partialLocked.faces.find(face=>face.sourceDirection==='north').direction,'east');
assert.deepEqual(partialLocked.faces.find(face=>face.sourceDirection==='north').uvCorners,[[9,10],[9,2],[1,2],[1,10]],'non-full explicit UV crop survives model rotation');

const slanted=await resolveMinecraftBlockModel('block/slanted_instance',{loadModel:async()=>({
  textures:{all:'block/stone'},
  elements:[{
    from:[7,0,7],to:[9,16,9],
    rotation:{origin:[8,8,8],axis:'y',angle:45,rescale:false},
    faces:{east:{texture:'#all'},north:{texture:'#all'}}
  }]
})});
const slantedGeometry=compileMinecraftBlockModelGeometry(slanted);
const slantedInstance=applyMinecraftModelInstanceTransform(slantedGeometry,{y:90,uvlock:true});
const slantedEast=slantedInstance.faces.find(face=>face.sourceDirection==='east');
assert.equal(slantedEast.direction,'south');
approxVec(slantedEast.normal,[Math.SQRT1_2,0,Math.SQRT1_2]);
assert.equal(slantedEast.uvCorners.length,4,'uvlock role selection is based on pre-element-rotation cuboid corners while actual slanted vertices remain transformed');

assert.throws(()=>applyMinecraftModelInstanceTransform(null),/compiled Minecraft model geometry/);
assert.throws(()=>applyMinecraftModelInstanceTransform(geometry,{uvlock:1}),/must be a boolean/);
assert.throws(()=>applyMinecraftModelInstanceTransform(geometry,{x:45}),/0, 90, 180, or 270/);

console.log('Minecraft blockstate model x/y transforms + cullface + UV rotation/uvlock: PASS');
