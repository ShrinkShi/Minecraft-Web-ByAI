import assert from 'node:assert/strict';
import {CONTROL_INTENT_VERSION,CONTROL_ACTIONS,ControlIntentBus,normalizeControlState} from '../src/control-intents.js';

assert.equal(CONTROL_INTENT_VERSION,1);
const diagonal=normalizeControlState({side:2,forward:2,jump:1});assert.equal(diagonal.version,1);assert.ok(Math.abs(diagonal.side-Math.SQRT1_2)<1e-12);assert.ok(Math.abs(diagonal.forward-Math.SQRT1_2)<1e-12);assert.equal(diagonal.jump,true);assert.equal(diagonal.sneak,false);assert.equal(diagonal.sprint,false);assert.equal(diagonal.primary,false);

const states=[],primaryEdges=[],looks=[],actions=[];
const bus=new ControlIntentBus({onState:state=>states.push(state),onPrimary:value=>primaryEdges.push(value),onLook:intent=>looks.push(intent),onAction:intent=>{actions.push(intent);return true;}});
bus.setMove('desktop',1,0);bus.setButton('desktop','sprint',true);let snapshot=bus.snapshot();assert.equal(snapshot.side,1);assert.equal(snapshot.forward,0);assert.equal(snapshot.sprint,true);
bus.setMove('touch',0,.5);snapshot=bus.snapshot();assert.ok(Math.abs(snapshot.side-.8944271909999159)<1e-12);assert.ok(Math.abs(snapshot.forward-.4472135954999579)<1e-12,'multiple local adapters merge through one normalized state');
bus.setButton('desktop','primary',true);bus.setButton('touch','primary',true);bus.setButton('desktop','primary',false);assert.deepEqual(primaryEdges,[true],'primary stays held while another source still owns it');bus.setButton('touch','primary',false);assert.deepEqual(primaryEdges,[true,false]);
bus.resetSource('desktop');snapshot=bus.snapshot();assert.equal(snapshot.sprint,false);assert.equal(snapshot.side,0);assert.equal(snapshot.forward,.5);

bus.look('touch',.2,-.1);assert.equal(looks.at(-1).source,'touch');assert.equal(looks.at(-1).yawDelta,.2);assert.equal(looks.at(-1).pitchDelta,-.1);bus.look('desktop',99,-99);assert.equal(looks.at(-1).yawDelta,.75);assert.equal(looks.at(-1).pitchDelta,-.75);
assert.ok(CONTROL_ACTIONS.includes('secondary')&&CONTROL_ACTIONS.includes('hotbar-select')&&CONTROL_ACTIONS.includes('pause'));assert.equal(bus.action('desktop','inventory'),true);assert.equal(actions.at(-1).name,'inventory');assert.throws(()=>bus.action('desktop','teleport-hack'),/unknown control action/);

const canonical=input=>{const testBus=new ControlIntentBus();testBus.setMove(input.source,input.side,input.forward);for(const name of ['jump','sneak','sprint','primary'])if(input[name])testBus.setButton(input.source,name,true);const {sequence,...state}=testBus.snapshot();return state;};
const logical={side:-.25,forward:.8,jump:true,sneak:false,sprint:true,primary:false};assert.deepEqual(canonical({source:'desktop',...logical}),canonical({source:'touch',...logical}));assert.deepEqual(canonical({source:'network-peer',...logical}),canonical({source:'desktop',...logical}),'future network input must use the same gameplay state contract');

bus.resetAll();snapshot=bus.snapshot();assert.deepEqual({...snapshot,sequence:0},{...normalizeControlState(),sequence:0},'shape after reset remains canonical');
assert.ok(states.length>0);
console.log('unified control intent contracts: PASS');
