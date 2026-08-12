import assert from 'node:assert/strict';
import {CONTROL_INTENT_VERSION,CONTROL_ACTIONS,ControlIntentBus,normalizeControlState} from '../src/control-intents.js';
import {PLAYER_CONTROL_FRAME_VERSION,PLAYER_CONTROL_BUTTONS,encodePlayerControlFrame,decodePlayerControlFrame,isCompatibleControlFrame} from '../src/player-control-frame.js';

assert.equal(CONTROL_INTENT_VERSION,1);assert.equal(PLAYER_CONTROL_FRAME_VERSION,1);
assert.deepEqual(PLAYER_CONTROL_BUTTONS,{jump:1,sneak:2,sprint:4,primary:8});
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
const logical={side:-.25,forward:.8,jump:true,sneak:false,sprint:true,primary:false};
const desktopState=canonical({source:'desktop',...logical}),touchState=canonical({source:'touch',...logical}),networkState=canonical({source:'network-peer',...logical});
assert.deepEqual(desktopState,touchState);assert.deepEqual(networkState,desktopState,'future network input must use the same gameplay state contract');
const desktopFrame=encodePlayerControlFrame(desktopState,42),touchFrame=encodePlayerControlFrame(touchState,42),networkFrame=encodePlayerControlFrame(networkState,42);
assert.deepEqual(desktopFrame,touchFrame);assert.deepEqual(networkFrame,desktopFrame,'wire frame must not contain device/source identity');
assert.deepEqual(Object.keys(desktopFrame).sort(),['buttons','move','seq','v']);assert.equal('source' in desktopFrame,false);assert.equal('device' in desktopFrame,false);
const decoded=decodePlayerControlFrame(desktopFrame);assert.equal(decoded.sequence,42);assert.deepEqual({...decoded,sequence:undefined},{...normalizeControlState(logical),sequence:undefined});assert.equal(isCompatibleControlFrame(desktopFrame),true);
assert.throws(()=>decodePlayerControlFrame({...desktopFrame,v:99}),/unsupported/);assert.throws(()=>decodePlayerControlFrame({...desktopFrame,buttons:16}),/unknown button bits/);assert.throws(()=>decodePlayerControlFrame({...desktopFrame,seq:-1}),/uint32/);assert.equal(isCompatibleControlFrame({}),false);

bus.resetAll();snapshot=bus.snapshot();assert.deepEqual({...snapshot,sequence:0},{...normalizeControlState(),sequence:0},'shape after reset remains canonical');
assert.ok(states.length>0);
console.log('unified control intent + platform-neutral wire frame contracts: PASS');
