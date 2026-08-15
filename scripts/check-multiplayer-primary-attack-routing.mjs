import assert from 'node:assert/strict';
import {ControlIntentBus} from '../src/control-intents.js';
import {installMultiplayerSecondaryRouting} from '../src/multiplayer-secondary-routing.js';

const attacks=[],runtime={player:{mode:'survival',yaw:.25,pitch:-.1}},movement={ready:true,sendAttack:view=>(attacks.push({...view}),{attack:true}),sendUse:()=>({use:true}),sendDrop:()=>({drop:true})};const release=installMultiplayerSecondaryRouting({runtime,movement});
try{
  const bus=new ControlIntentBus();bus.setButton('mouse','primary',true);assert.deepEqual(attacks,[{yaw:.25,pitch:-.1}]);bus.setButton('mouse','primary',true);assert.equal(attacks.length,1,'held primary must not enqueue repeated attack actions');bus.setButton('mouse','primary',false);assert.equal(attacks.length,1,'release must not attack');bus.setButton('mouse','primary',true);assert.equal(attacks.length,2,'next press edge must enqueue exactly one attack');runtime.player.mode='spectator';bus.setButton('mouse','primary',false);bus.setButton('mouse','primary',true);assert.equal(attacks.length,2,'spectator primary is intercepted without a combat action');movement.ready=false;runtime.player.mode='survival';bus.setButton('mouse','primary',false);bus.setButton('mouse','primary',true);assert.equal(attacks.length,2,'not-ready primary is intercepted without local fallback');
}finally{release();}
console.log('multiplayer primary press edges route exactly one authoritative attack: PASS');
