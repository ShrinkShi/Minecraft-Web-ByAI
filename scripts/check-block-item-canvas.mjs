import assert from 'node:assert/strict';
import {blockItemCanvasFacePoints} from '../src/block-item-canvas-renderer.js';

const faces=blockItemCanvasFacePoints();
assert.deepEqual(Object.keys(faces).sort(),['left','right','top']);
for(const [name,points] of Object.entries(faces)){
  assert.equal(points.length,4,`${name} must contain four ordered corners`);
  const [p0,p1,p2,p3]=points;
  assert.deepEqual(p2,[p1[0]+p3[0]-p0[0],p1[1]+p3[1]-p0[1]],`${name} corners must describe an affine parallelogram in winding order`);
  const cross=(p1[0]-p0[0])*(p3[1]-p0[1])-(p1[1]-p0[1])*(p3[0]-p0[0]);
  assert.notEqual(cross,0,`${name} projection must have non-zero area`);
}
assert.deepEqual(faces.top,[[3,10],[16,3],[29,10],[16,17]],'top face may not regress to the old self-intersecting left/top/bottom/right order');

console.log('affine block-item top/left/right projection geometry: PASS');
