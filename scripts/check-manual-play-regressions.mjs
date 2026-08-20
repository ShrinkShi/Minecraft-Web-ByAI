import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inventoryPreviewPointerPose,playerAttackArmPitch,playerUseArmPitch} from '../src/player-presentation-rules.js';
import {FIRST_PERSON_ATTACK_DURATION,FIRST_PERSON_USE_DURATION,STEVE_RIGHT_ARM_BASE_FRONT,STEVE_RIGHT_ARM_SLEEVE_FRONT,firstPersonActionPose,minecraftSkinCropCss} from '../src/first-person-presentation-rules.js';
import {mobModelSpec} from '../src/mob-model-specs.js';

const up=inventoryPreviewPointerPose(0,-1),down=inventoryPreviewPointerPose(0,1),left=inventoryPreviewPointerPose(-1,0),right=inventoryPreviewPointerPose(1,0);
assert.ok(up.headPitch>0,'moving the pointer upward must make inventory Steve look upward');
assert.ok(down.headPitch<0,'moving the pointer downward must make inventory Steve look downward');
assert.ok(left.headYaw<0&&left.bodyYaw<0,'left/right preview tracking must retain its existing sign');
assert.ok(right.headYaw>0&&right.bodyYaw>0,'left/right preview tracking must retain its existing sign');
assert.equal(up.headPitch,.48);assert.equal(down.headPitch,-.48);

assert.ok(playerAttackArmPitch(0)>0,'attack arm pitch must begin on the forward side of the model');
assert.ok(playerAttackArmPitch(Math.PI/2)>0,'attack arm pitch must remain forward at maximum swing');
assert.ok(Math.abs(playerAttackArmPitch(Math.PI/2)-1.9)<1e-12);
assert.ok(playerUseArmPitch(.34)>0,'use animation must hold the arm forward');
assert.ok(playerUseArmPitch(.17)>playerUseArmPitch(.34),'mid-use pose must swing farther forward');

assert.deepEqual(STEVE_RIGHT_ARM_BASE_FRONT,[44,20,48,32]);
assert.deepEqual(STEVE_RIGHT_ARM_SLEEVE_FRONT,[44,36,48,48]);
assert.deepEqual(minecraftSkinCropCss(STEVE_RIGHT_ARM_BASE_FRONT),{
  width:'68px',height:'204px',backgroundSize:'1088px 1088px',backgroundPosition:'-748px -340px'
});
assert.deepEqual(minecraftSkinCropCss(STEVE_RIGHT_ARM_SLEEVE_FRONT),{
  width:'68px',height:'204px',backgroundSize:'1088px 1088px',backgroundPosition:'-748px -612px'
});
const idlePose=firstPersonActionPose(),attackPose=firstPersonActionPose({attackRemaining:FIRST_PERSON_ATTACK_DURATION/2}),usePose=firstPersonActionPose({useRemaining:FIRST_PERSON_USE_DURATION/2});
assert.notDeepEqual(attackPose,idlePose,'first-person attack must move the 3D arm/viewmodel');
assert.notDeepEqual(usePose,idlePose,'first-person use must move the 3D arm/viewmodel');
assert.ok(attackPose.rotX<idlePose.rotX,'attack swing must drive the arm farther forward');
assert.ok(usePose.y>idlePose.y,'use pose must lift the held viewmodel');

const pig=mobModelSpec('pig');assert.ok(pig,'pig model spec must exist');
const parts=Object.fromEntries(pig.parts.map(part=>[part.name,part]));
assert.deepEqual(parts.body.pivot,[0,13,2]);
assert.deepEqual(parts.body.rotation,[-Math.PI/2,0,0]);
assert.deepEqual(parts.body.boxes[0].size,[10,16,8]);
assert.deepEqual(parts.body.boxes[0].offset,[-5,-6,-7]);
assert.deepEqual(parts.head.pivot,[0,12,-6]);
assert.deepEqual(parts.head.boxes[0].offset,[-4,-4,-8]);
assert.deepEqual(parts.head.boxes[1].offset,[-2,-3,-9]);
assert.deepEqual(parts.frontLeftLeg.pivot,[3,6,-5]);
assert.deepEqual(parts.frontRightLeg.pivot,[-3,6,-5]);
assert.deepEqual(parts.backLeftLeg.pivot,[3,6,4]);
assert.deepEqual(parts.backRightLeg.pivot,[-3,6,4]);

const viewmodel=await readFile(new URL('../src/first-person-player-presentation.js',import.meta.url),'utf8');
assert.match(viewmodel,/requireAssetUrl\('entity\.player\.steve'\)/,'first-person arm must bind the source-backed Steve asset');
assert.match(viewmodel,/new THREE\.BoxGeometry\(\.27,\.78,\.27\)/,'first-person base arm must remain real 3D cuboid geometry');
assert.match(viewmodel,/first-person-arm-sleeve/,'first-person arm must retain the source-backed sleeve layer');
assert.doesNotMatch(viewmodel,/linear-gradient\(/,'first-person arm must not regress to the fake CSS gradient limb');

console.log('manual-play presentation regression contract: PASS');
