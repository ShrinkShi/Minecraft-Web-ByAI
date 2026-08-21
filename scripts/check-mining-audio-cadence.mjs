import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {SINGLEPLAYER_MINING_HIT_INTERVAL_MS,SingleplayerMiningController} from '../src/singleplayer-mining-controller.js';
import {blockHitPlayback,preloadBlockSoundObjects} from '../src/vanilla-mining-audio.js';
import {miningHitBlockId} from '../src/vanilla-mining-audio-runtime.js';
import {playBlockSound} from '../src/vanilla-sounds.js';

assert.equal(SINGLEPLAYER_MINING_HIT_INTERVAL_MS,200);
assert.deepEqual(blockHitPlayback(),{volume:.25,playbackRate:.5});
assert.equal(miningHitBlockId({detail:{blockId:BLOCK.STONE}}),BLOCK.STONE);
assert.equal(miningHitBlockId({detail:{blockId:'3'}}),BLOCK.STONE);
assert.equal(miningHitBlockId({detail:{blockId:'bad'}}),null);
assert.equal(miningHitBlockId(null),null);

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

const previousAudioContext=globalThis.AudioContext,previousFetch=globalThis.fetch;
let fetchCount=0,decodeCount=0,startCount=0;
class FakeAudioContext{
  constructor(){this.state='running';this.destination={};}
  decodeAudioData(bytes){decodeCount++;return Promise.resolve({byteLength:bytes.byteLength});}
  createBufferSource(){return{buffer:null,playbackRate:{value:1},connect(){},start(){startCount++;}};}
  createGain(){return{gain:{value:1},connect(){}};}
  resume(){return Promise.resolve();}
}
try{
  globalThis.AudioContext=FakeAudioContext;
  globalThis.fetch=async()=>{fetchCount++;return{ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(8)};};
  assert.equal(await preloadBlockSoundObjects(BLOCK.STONE,'break'),true,'mining prewarm should decode every stone break variant into the shared cache');
  assert.equal(fetchCount,4);assert.equal(decodeCount,4);
  const played=await playBlockSound(BLOCK.STONE,'break',{random:()=>0});
  assert.equal(played.played,true);assert.equal(startCount,1);
  assert.equal(fetchCount,4,'real break playback must reuse the prewarmed fetch/cache instead of fetching again');
  assert.equal(decodeCount,4,'real break playback must reuse the predecoded AudioBuffer instead of decoding again');
  assert.equal(await preloadBlockSoundObjects(BLOCK.WATER,'break'),false,'blocks without a mapped sound event must fail closed');
}finally{
  if(previousAudioContext===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=previousAudioContext;
  if(previousFetch===undefined)delete globalThis.fetch;else globalThis.fetch=previousFetch;
}

console.log('singleplayer mining cadence + browser bridge + shared break predecode cache reuse: PASS');
