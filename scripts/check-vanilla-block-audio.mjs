import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {blockSoundPlayback} from '../src/vanilla-sounds.js';
import {blockSoundTransition,installVanillaBlockAudio} from '../src/vanilla-block-audio.js';

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
const originalSetBlock=world.setBlock,originalUpdate=player.update,sounds=[];
const audio=installVanillaBlockAudio({world,player,playSound:(blockId,action)=>{sounds.push({blockId,action});return Promise.resolve({played:true});}});

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

for(let x=0;x<=4;x++)world.setBlock(x,0,1,BLOCK.STONE,{sound:false});
player.position.x=.25;player.dx=.2;sounds.length=0;
player.update(.05);player.update(.05);assert.equal(sounds.length,0);
player.update(.05);assert.deepEqual(sounds,[{blockId:BLOCK.STONE,action:'step'}],'0.6 blocks of grounded movement should cross the 0.55 step threshold once');
player.update(.05);assert.equal(sounds.length,1,'distance remainder must not become frame-rate-driven sound spam');

player.flying=true;player.dx=.6;player.update(.05);assert.equal(sounds.length,1,'flying must reset/suppress footsteps');
player.flying=false;player.dx=2;player.update(.05);assert.equal(sounds.length,1,'teleport-sized frame movement must not emit a footstep');
player.dx=0;player.swimCoverage=.5;player.update(.05);assert.equal(sounds.length,1,'swimming must suppress footsteps');

assert.equal(audio.dispose(),true);assert.equal(audio.dispose(),false);assert.equal(world.setBlock,originalSetBlock);assert.equal(player.update,originalUpdate);
console.log('vanilla block audio transition, Java playback profile, footstep cadence and disposal contracts: PASS');
