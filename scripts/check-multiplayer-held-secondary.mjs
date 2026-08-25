import assert from 'node:assert/strict';
import {ControlIntentBus} from '../src/control-intents.js';
import {installMultiplayerSecondaryRouting} from '../src/multiplayer-secondary-routing.js';

for(const mode of ['survival','creative']){
  const uses=[],releases=[];const runtime={player:{mode,yaw:.25,pitch:-.15}},movement={ready:true,sendUse:view=>{uses.push(view);return uses.length;},sendUseRelease:()=>{releases.push(true);return releases.length;},sendDrop:()=>1,sendAttack:()=>1};
  const release=installMultiplayerSecondaryRouting({runtime,movement});
  try{
    const localEdges=[];const bus=new ControlIntentBus({onSecondary:pressed=>localEdges.push(pressed)});
    bus.setSecondary('desktop',true);
    assert.equal(uses.length,1,`${mode} held-secondary press must send exactly one authoritative use`);
    assert.deepEqual(uses[0],{yaw:.25,pitch:-.15});
    assert.deepEqual(localEdges,[],`${mode} multiplayer interceptor must consume local secondary`);
    bus.setSecondary('desktop',true);assert.equal(uses.length,1,'repeated held press must not duplicate use');
    bus.setSecondary('desktop',false);assert.equal(releases.length,1,'release must send exactly one authoritative use-release');
    bus.setSecondary('desktop',false);assert.equal(releases.length,1,'repeated released state must not duplicate use-release');
  }finally{release();}
}
{
  const uses=[],releases=[];const runtime={player:{mode:'spectator',yaw:0,pitch:0}},movement={ready:true,sendUse:view=>{uses.push(view);return 1;},sendUseRelease:()=>{releases.push(true);return 1;},sendDrop:()=>1,sendAttack:()=>1};
  const release=installMultiplayerSecondaryRouting({runtime,movement});
  try{const bus=new ControlIntentBus();bus.setSecondary('desktop',true);assert.equal(uses.length,0,'spectator secondary press must not start server use');bus.setSecondary('desktop',false);assert.equal(releases.length,1,'spectator release still clears any server-side held use latch');}finally{release();}
}
{
  const releases=[];const runtime={player:{mode:'survival',yaw:0,pitch:0}},movement={ready:true,bridge:{sendUseRelease:()=>{releases.push(true);return 1;}},sendUse:()=>1,sendDrop:()=>1,sendAttack:()=>1};
  const release=installMultiplayerSecondaryRouting({runtime,movement});try{const bus=new ControlIntentBus();bus.setSecondary('desktop',true);bus.setSecondary('desktop',false);assert.equal(releases.length,1,'movement bridge fallback must expose use-release without widening movement-session API yet');}finally{release();}
}
console.log('multiplayer held-secondary press/release authority routing: PASS');
