import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {blockSoundPlayback} from '../src/vanilla-sounds.js';
import {STEP_DISTANCE,blockSoundTransition,installVanillaBlockAudio} from '../src/vanilla-block-audio.js';

assert.equal(STEP_DISTANCE,1.6);
assert.deepEqual(blockSoundPlayback(BLOCK.STONE,'break'),{volume:1,playbackRate:.8});
assert.deepEqual(blockSoundPlayback(BLOCK.STONE,'place'),{volume:1,playbackRate:.8});
assert.deepEqual(blockSoundPlayback(BLOCK.STONE,'step'),{volume:.15,playbackRate:1});
assert.equal(blockSoundPlayback(BLOCK.WATER,'step'),null);
assert.equal(blockSoundPlayback(BLOCK.STONE,'hit'),null);
assert.deepEqual(blockSoundTransition(BLOCK.STONE,BLOCK.AIR),{blockId:BLOCK.STONE,action:'break'});
assert.deepEqual(blockSoundTransition(BLOCK.AIR,BLOCK.PLANKS),{blockId:BLOCK.PLANKS,action:'place'});
assert.equal(blockSoundTransition(BLOCK.GRASS,BLOCK.FARMLAND),null);

const key=(x,y,z)=>`${x},${y},${z}`;
const cells=new Map();
const world={
  getBlock(x,y,z){return cells.get(key(x,y,z))??BLOCK.AIR;},
  setBlock(x,y,z,id){const cell=key(x,y,z),previous=cells.get(cell)??BLOCK.AIR;if(previous===id)return false;cells.set(cell,id);return true;}
};
const player={
  position:{x:.25,y:1,z:1.25},grounded:true,flying:false,mode:'survival',swimCoverage:0,dx:0,
  update(){this.position.x+=this.dx;return this.position.x;}
};
const listeners=new Map(),eventTarget={
  addEventListener(type,listener){listeners.set(type,listener);},
  removeEventListener(type,listener){if(listeners.get(type)===listener)listeners.delete(type);},
  emit(type,detail){listeners.get(type)?.({detail});}
};
const originalSetBlock=world.setBlock,originalUpdate=player.update,sounds=[],miningSounds=[];
const audio=installVanillaBlockAudio({world,player,eventTarget,playSound:(blockId,action)=>{sounds.push({blockId,action});return Promise.resolve({played:true});},playMiningSound:blockId=>{miningSounds.push(blockId);return Promise.resolve({played:true});}});

assert.equal(world.setBlock(0,0,0,BLOCK.STONE),true);
assert.deepEqual(sounds.pop(),{blockId:BLOCK.STONE,action:'place'});
assert.equal(world.setBlock(0,0,0,BLOCK.STONE),false);assert.equal(sounds.length,0);
assert.equal(world.setBlock(0,0,0,BLOCK.AIR),true);
assert.deepEqual(sounds.pop(),{blockId:BLOCK.STONE,action:'break'});

assert.equal(world.setBlock(2,0,0,BLOCK.GRASS,{sound:false}),true);assert.equal(sounds.length,0);
assert.equal(world.setBlock(2,0,0,BLOCK.FARMLAND),true);assert.equal(sounds.length,0,'block-to-block tool mutation must not emit ordinary break/place');
assert.equal(world.setBlock(3,0,0,BLOCK.PLANKS,{sound:false}),true);assert.equal(sounds.length,0,'explicit sound:false must stay silent');

assert.equal(world.setBlock(4,0,0,BLOCK.BED_NORTH_HEAD),true);assert.equal(sounds.length,0,'bed head must not duplicate paired placement sound');
assert.equal(world.setBlock(5,0,0,BLOCK.BED_NORTH_FOOT),true);assert.deepEqual(sounds.pop(),{blockId:BLOCK.BED_NORTH_FOOT,action:'place'});

for(let x=0;x<=6;x++)world.setBlock(x,0,1,BLOCK.STONE,{sound:false});
player.position.x=.25;player.dx=.5;sounds.length=0;
player.update(.05);player.update(.05);player.update(.05);assert.equal(sounds.length,0,'1.5 blocks should stay below the quieter 1.6-block cadence');
player.update(.05);assert.deepEqual(sounds,[{blockId:BLOCK.STONE,action:'step'}],'2.0 blocks should cross the 1.6-block threshold exactly once');
player.update(.05);assert.equal(sounds.length,1,'distance remainder must not become frame-rate-driven sound spam');

eventTarget.emit('minecraft:mining-hit',{blockId:BLOCK.STONE,x:0,y:0,z:0});assert.deepEqual(miningSounds,[BLOCK.STONE],'mining hit event must route into source-backed block hit playback');

player.flying=true;player.dx=.6;player.update(.05);assert.equal(sounds.length,1,'flying must reset/suppress footsteps');
player.flying=false;player.dx=2;player.update(.05);assert.equal(sounds.length,1,'teleport-sized frame movement must not emit a footstep');
player.dx=0;player.swimCoverage=.5;player.update(.05);assert.equal(sounds.length,1,'swimming must suppress footsteps');

assert.equal(audio.dispose(),true);assert.equal(audio.dispose(),false);assert.equal(world.setBlock,originalSetBlock);assert.equal(player.update,originalUpdate);assert.equal(listeners.has('minecraft:mining-hit'),false);
eventTarget.emit('minecraft:mining-hit',{blockId:BLOCK.STONE});assert.deepEqual(miningSounds,[BLOCK.STONE],'disposed runtime must stop mining hit routing');
console.log('vanilla block audio transition, Java playback profile, quieter footstep cadence, mining-hit routing and disposal contracts: PASS');
