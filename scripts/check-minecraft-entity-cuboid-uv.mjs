import assert from 'node:assert/strict';
import {minecraftEntityCuboidUvRects} from '../src/minecraft-entity-cuboid-uv.js';

assert.deepEqual(minecraftEntityCuboidUvRects(18,4,12,18,10),{
  left:[18,14,28,32],
  front:[28,14,40,32],
  right:[40,14,50,32],
  back:[50,14,62,32],
  top:[28,4,40,14],
  bottom:[40,4,52,14]
});
const cube=minecraftEntityCuboidUvRects(0,0,8,8,8);
assert.deepEqual(cube,{left:[0,8,8,16],front:[8,8,16,16],right:[16,8,24,16],back:[24,8,32,16],top:[8,0,16,8],bottom:[16,0,24,8]});
assert.equal(Object.isFrozen(cube),true);assert.equal(Object.isFrozen(cube.right),true);
assert.throws(()=>minecraftEntityCuboidUvRects(0,0,0,8,8),/width must be > 0/);

console.log('shared Minecraft entity cuboid UV unfolding: PASS');
