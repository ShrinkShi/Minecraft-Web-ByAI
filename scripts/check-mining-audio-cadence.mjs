import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {SINGLEPLAYER_MINING_HIT_INTERVAL_MS,SingleplayerMiningController} from '../src/singleplayer-mining-controller.js';
import {blockHitPlayback} from '../src/vanilla-mining-audio.js';

assert.equal(SINGLEPLAYER_MINING_HIT_INTERVAL_MS,200);
assert.deepEqual(blockHitPlayback(),{volume:.25,playbackRate:.5});

let mode='survival',target={x:4,y:20,z:4,id:BLOCK.STONE,previous:{x:4,y:20,z:5}},hits=[];
const controller=new SingleplayerMiningController({
  aim:()=>target?{...target,previous:{...target.previous}}:null,
  getMode:()=>mode,
  getSelectedStack:()=>null,
  breakTarget:()=>false,
  spawnDrop:()=>{},
  damageSelected:()=>({changed:false}),
  onHit:event=>hits.push({time:clock,blockId:event.target.id,x:event.target.x})
});
let clock=0;controller.start(clock);controller.step(clock);assert.deepEqual(hits,[{time:0,blockId:BLOCK.STONE,x:4}],'first acquired mining target should sound immediately');
clock=100;controller.step(clock);clock=199;controller.step(clock);assert.equal(hits.length,1,'mining hit sound must not spam between 200ms cadence boundaries');
clock=200;controller.step(clock);assert.equal(hits.length,2,'200ms boundary should emit the next hit sound');
clock=250;target={...target,x:5};controller.step(clock);assert.equal(hits.length,3,'changing target should restart hit cadence immediately for the new block');assert.equal(hits.at(-1).x,5);
mode='creative';clock=450;controller.step(clock);assert.equal(hits.length,3,'creative instant mining must not emit survival digging-hit cadence');
controller.cancel();
console.log('singleplayer mining hit cadence + source-backed hit playback profile: PASS');
