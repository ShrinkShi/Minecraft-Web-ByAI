import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {chooseLookTargetInfo,inspectBlockTarget,inspectMobTarget} from '../src/target-inspector.js';

let info=inspectBlockTarget(BLOCK.STONE,{selectedItemId:null});assert.equal(info.name,'石头');assert.equal(info.requiredToolName,'镐');assert.equal(info.toolCorrect,false);assert.equal(info.canDrop,false);assert.equal(info.dropName,'圆石');
info=inspectBlockTarget(BLOCK.STONE,{selectedItemId:'wooden_pickaxe'});assert.equal(info.toolCorrect,true);assert.equal(info.canDrop,true);
info=inspectBlockTarget(BLOCK.DIRT,{selectedItemId:null});assert.equal(info.requiredToolName,'任意');assert.equal(info.canDrop,true);assert.equal(info.dropName,'泥土');
info=inspectBlockTarget(BLOCK.LEAVES,{selectedItemId:'wooden_pickaxe'});assert.equal(info.hasDrop,false);assert.equal(info.canDrop,false);
assert.equal(inspectBlockTarget(BLOCK.AIR),null);

const cow={id:7,type:'cow',components:{hp:6}};info=inspectMobTarget(cow);assert.equal(info.name,'牛');assert.equal(info.hp,6);assert.equal(info.maxHp,10);assert.equal(info.healthRatio,.6);assert.equal(info.hostile,false);
const zombie={id:8,type:'zombie',components:{hp:19}};info=inspectMobTarget(zombie);assert.equal(info.name,'僵尸');assert.equal(info.maxHp,20);assert.equal(info.hostile,true);
assert.equal(inspectMobTarget({type:'missing',components:{hp:1}}),null);

info=chooseLookTargetInfo({blockHit:{id:BLOCK.STONE,distance:3},entityHit:{entity:cow,distance:2},selectedItemId:'wooden_pickaxe'});assert.equal(info.kind,'entity');
info=chooseLookTargetInfo({blockHit:{id:BLOCK.STONE,distance:2},entityHit:{entity:cow,distance:3},selectedItemId:'wooden_pickaxe'});assert.equal(info.kind,'block');assert.equal(info.canDrop,true);
console.log('Jade-style block/entity target inspection: PASS');
