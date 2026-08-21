import assert from 'node:assert/strict';
import {FIRST_PERSON_RIGHT_ARM_LAYOUT} from '../src/first-person-presentation-rules.js';
import {playerModelPart} from '../src/player-model-specs.js';
import {vanillaWorkbenchAssetContract} from '../src/vanilla-workbench-presentation.js';

const rightArm=playerModelPart('rightArm'),leftArm=playerModelPart('leftArm'),rightLeg=playerModelPart('rightLeg'),leftLeg=playerModelPart('leftLeg');
assert.ok(rightArm&&leftArm&&rightLeg&&leftLeg);
assert.ok(rightArm.pivot[0]>0,'yaw=0 faces -Z, so anatomical right arm must occupy +X from the rear camera');
assert.ok(leftArm.pivot[0]<0,'left arm must occupy -X from the rear camera');
assert.ok(rightLeg.pivot[0]>0,'right leg must stay on the same anatomical side as the right arm');
assert.ok(leftLeg.pivot[0]<0,'left leg must stay on the same anatomical side as the left arm');

assert.ok(FIRST_PERSON_RIGHT_ARM_LAYOUT.baseCenterY>0,'first-person arm must extend from lower-right shoulder toward screen centre');
assert.ok(FIRST_PERSON_RIGHT_ARM_LAYOUT.sleeveCenterY>0);
assert.ok(FIRST_PERSON_RIGHT_ARM_LAYOUT.itemAnchorY>FIRST_PERSON_RIGHT_ARM_LAYOUT.baseCenterY,'held item belongs near the hand end, not behind the shoulder');
assert.equal(FIRST_PERSON_RIGHT_ARM_LAYOUT.rotationZ,Math.PI,'right arm cuboid must preserve shoulder-to-hand texture orientation after reversing geometry direction');

const workbench=vanillaWorkbenchAssetContract();
assert.match(workbench.panel,/MC原版素材assets\/minecraft\/textures\/gui\/container\/crafting_table\.png$/);
assert.deepEqual({...workbench},{panel:workbench.panel,width:352,height:332,craftLeft:60,craftTop:34,resultLeft:248,resultTop:70,inventoryTop:168,hotbarTop:284});
assert.equal(workbench.craftLeft%2,0);assert.equal(workbench.resultLeft%2,0);
console.log('player handedness + first-person arm orientation + canonical workbench layout: PASS');
