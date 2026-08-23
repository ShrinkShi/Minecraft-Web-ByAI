import assert from 'node:assert/strict';
import {ControlIntentBus} from '../src/control-intents.js';
import {installMultiplayerSecondaryRouting} from '../src/multiplayer-secondary-routing.js';

for(const mode of ['survival','creative']){
  const uses=[];const runtime={player:{mode,yaw:.25,pitch:-.15}},movement={ready:true,sendUse:view=>{uses.push(view);return uses.length;},sendDrop:()=>1,sendAttack:()=>1};
  const release=installMultiplayerSecondaryRouting({runtime,movement});
  try{
    const localEdges=[];const bus=new ControlIntentBus({onSecondary:pressed=>localEdges.push(pressed)});
    bus.setSecondary('desktop',true);
    assert.equal(uses.length,1,`${mode} held-secondary press must send exactly one authoritative use`);
    assert.deepEqual(uses[0],{yaw:.25,pitch:-.15});
    assert.deepEqual(localEdges,[],`${mode} multiplayer interceptor must consume local secondary`);
    bus.setSecondary('desktop',true);assert.equal(uses.length,1,'repeated held press must not duplicate use');
    bus.setSecondary('desktop',false);assert.equal(uses.length,1,'release must not send another use');
  }finally{release();}
}
{
  const uses=[];const runtime={player:{mode:'spectator',yaw:0,pitch:0}},movement={ready:true,sendUse:view=>{uses.push(view);return 1;},sendDrop:()=>1,sendAttack:()=>1};
  const release=installMultiplayerSecondaryRouting({runtime,movement});
  try{const bus=new ControlIntentBus();bus.setSecondary('desktop',true);assert.equal(uses.length,0,'spectator secondary must not reach server use');bus.setSecondary('desktop',false);}finally{release();}
}
console.log('multiplayer held-secondary authority routing: PASS');
