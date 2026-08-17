import assert from 'node:assert/strict';
import {PLAYER_MODEL_PIXELS,PLAYER_MODEL_SCALE,PLAYER_MODEL_SPEC,PLAYER_SKIN_TEXTURE_SIZE,normalizePlayerVisualInput,playerModelPart,playerModelUvRects} from '../src/player-model-specs.js';

assert.deepEqual(PLAYER_SKIN_TEXTURE_SIZE,[64,64]);
assert.equal(PLAYER_MODEL_PIXELS,32);assert.equal(PLAYER_MODEL_SCALE,.9);
assert.deepEqual(PLAYER_MODEL_SPEC.parts.map(part=>part.name),['head','body','rightArm','leftArm','rightLeg','leftLeg']);

let boxes=0,base=0,overlay=0;
for(const part of PLAYER_MODEL_SPEC.parts){
  assert.equal(playerModelPart(part.name),part);assert.equal(part.pivot.length,3);assert.ok(part.boxes.length>=2);
  for(const box of part.boxes){
    boxes++;if(box.layer==='base')base++;else if(box.layer==='overlay')overlay++;else assert.fail(`unknown player layer ${box.layer}`);
    assert.equal(box.size.length,3);assert.equal(box.offset.length,3);assert.equal(box.uv.length,2);
    const rects=playerModelUvRects(box);for(const [face,[u0,v0,u1,v1]] of Object.entries(rects)){assert.ok(u0>=0&&v0>=0&&u1<=64&&v1<=64,`${part.name}/${box.name}/${face} escapes 64x64 skin`);assert.ok(u1>u0&&v1>v0);}
  }
}
assert.equal(boxes,12);assert.equal(base,6);assert.equal(overlay,6);
assert.deepEqual(playerModelPart('rightArm').boxes[0].uv,[40,16]);
assert.deepEqual(playerModelPart('leftArm').boxes[0].uv,[32,48]);
assert.deepEqual(playerModelPart('rightLeg').boxes[0].uv,[0,16]);
assert.deepEqual(playerModelPart('leftLeg').boxes[0].uv,[16,48]);
assert.notDeepEqual(playerModelPart('rightArm').boxes[0].uv,playerModelPart('leftArm').boxes[0].uv,'modern Steve left arm must not mirror the right arm source region');
assert.equal(playerModelPart('head').boxes.find(box=>box.name==='hat').inflate,.5);
assert.equal(playerModelPart('body').boxes.find(box=>box.name==='jacket').inflate,.25);

assert.deepEqual(normalizePlayerVisualInput({speed:-2,sprint:1,primary:'yes',dead:0,headYaw:99,headPitch:-99}),{speed:0,sprint:true,primary:true,dead:false,headYaw:1.25,headPitch:-1.1});
assert.equal(playerModelPart('missing'),null);

console.log('source-backed wide Steve geometry + overlay UV contract: PASS');
