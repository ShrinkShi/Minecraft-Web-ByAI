import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {SingleplayerMiningController} from '../src/singleplayer-mining-controller.js';

let nowTarget={x:1,y:64,z:0,id:BLOCK.STONE,previous:{x:1,y:64,z:1}},mode='survival',selected={id:'wooden_pickaxe',count:1,damage:57},progress=[],drops=[],wear=[],breaks=[];
const controller=new SingleplayerMiningController({
  aim:()=>nowTarget?{...nowTarget,previous:{...nowTarget.previous}}:null,
  getMode:()=>mode,
  getSelectedStack:()=>selected?{...selected}:null,
  breakTarget:target=>{breaks.push(target);return true;},
  spawnDrop:(stack,target)=>drops.push({stack:{...stack},target:{...target}}),
  damageSelected:(expectedId,amount)=>{wear.push({expectedId,amount,before:{...selected}});selected={...selected,damage:(selected.damage??0)+amount};return{changed:true,broken:false,stack:{...selected}};},
  onProgress:value=>progress.push(value)
});
controller.start(0);controller.step(50);assert.ok(controller.snapshot().progress>.18&&controller.snapshot().progress<.19,'first acquired target must count the first elapsed progress slice');controller.step(100);assert.ok(controller.snapshot().progress>.36);nowTarget={...nowTarget,x:2};controller.step(150);assert.ok(controller.snapshot().progress>.18&&controller.snapshot().progress<.19,'switching target must discard old progress but still count the current new-target slice');assert.equal(breaks.length,0);
for(let t=200;t<=450;t+=50)controller.step(t);assert.equal(breaks.length,1,'wooden pickaxe stone mining should complete after six 50ms progress slices from new target acquisition');assert.equal(drops.length,1);assert.deepEqual(drops[0].stack,{id:'block:10',count:1});assert.equal(wear.length,1);assert.deepEqual(wear[0].before,{id:'wooden_pickaxe',count:1,damage:57});assert.equal(wear[0].expectedId,'wooden_pickaxe');assert.equal(wear[0].amount,1);
controller.cancel();assert.equal(controller.snapshot().progress,0);assert.equal(controller.snapshot().held,false);

let switchedItem=null,switchedBreaks=0;const switched=new SingleplayerMiningController({aim:()=>({x:3,y:40,z:2,id:BLOCK.STONE,previous:{x:3,y:40,z:3}}),getMode:()=> 'survival',getSelectedStack:()=>switchedItem,breakTarget:()=>{switchedBreaks++;return true;},spawnDrop:()=>{},damageSelected:()=>({changed:true})});switched.start(0);switched.step(0);for(let t=50;t<=200;t+=50)switched.step(t);const handProgress=switched.snapshot().progress;assert.ok(handProgress>.14&&handProgress<.15,'200ms empty-hand mining should retain only its own slow progress');switchedItem={id:'wooden_pickaxe',count:1};switched.step(250);const afterSwitch=switched.snapshot().progress;assert.ok(afterSwitch>.32&&afterSwitch<.34,'switching to a pickaxe must accelerate only the new 50ms slice, not retroactively re-rate earlier hand mining');assert.equal(switchedBreaks,0,'tool switching must not instantly complete the target from retroactive speed recalculation');

let finalSelected={id:'wooden_pickaxe',count:1,damage:58},finalDrop=0,finalBroken=false;const finalUse=new SingleplayerMiningController({aim:()=>({x:0,y:10,z:0,id:BLOCK.STONE,previous:{x:0,y:10,z:1}}),getMode:()=> 'survival',getSelectedStack:()=>finalSelected,breakTarget:()=>true,spawnDrop:()=>finalDrop++,damageSelected:()=>{finalBroken=true;finalSelected=null;return{changed:true,broken:true,stack:null};}});finalUse.start(0);finalUse.step(0);for(let t=50;t<=300;t+=50)finalUse.step(t);assert.equal(finalDrop,1,'final durability use must still harvest before tool break');assert.equal(finalBroken,true);assert.equal(finalSelected,null);

let creativeWear=0,creativeDrop=0;const creative=new SingleplayerMiningController({aim:()=>({x:0,y:5,z:0,id:BLOCK.STONE,previous:{x:0,y:5,z:1}}),getMode:()=> 'creative',getSelectedStack:()=>({id:'wooden_pickaxe',count:1,damage:58}),breakTarget:()=>true,spawnDrop:()=>creativeDrop++,damageSelected:()=>creativeWear++});creative.start(0);creative.step(0);creative.step(70);assert.equal(creativeWear,0);assert.equal(creativeDrop,0,'creative mining must not spawn survival harvest drops');

let failedWear=0;const failed=new SingleplayerMiningController({aim:()=>({x:0,y:5,z:0,id:BLOCK.STONE,previous:{x:0,y:5,z:1}}),getMode:()=> 'survival',getSelectedStack:()=>({id:'wooden_pickaxe',count:1,damage:3}),breakTarget:()=>false,spawnDrop:()=>{},damageSelected:()=>failedWear++});failed.start(0);failed.step(0);for(let t=50;t<=300;t+=50)failed.step(t);assert.equal(failedWear,0,'failed world mutation must not consume tool durability');
console.log('singleplayer incremental mining + target reset + tool-switch + harvest-before-wear semantics: PASS');
