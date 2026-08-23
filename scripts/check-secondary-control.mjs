import assert from 'node:assert/strict';
import {CONTROL_INTENT_VERSION,ControlIntentBus,normalizeControlState} from '../src/control-intents.js';

const edges=[],states=[];const bus=new ControlIntentBus({onState:state=>states.push(state),onSecondary:(pressed,event)=>edges.push({pressed,event})});
assert.equal(CONTROL_INTENT_VERSION,1);
assert.equal(Object.hasOwn(normalizeControlState(),'secondary'),false,'secondary must stay outside multiplayer movement state');
assert.deepEqual(bus.secondarySnapshot(),{pressed:false,sequence:0});
bus.setSecondary('desktop',true);assert.equal(bus.secondarySnapshot().pressed,true);assert.equal(edges.length,1);assert.equal(edges[0].pressed,true);
bus.setSecondary('desktop',true);assert.equal(edges.length,1,'repeated press from one source must not emit another edge');
bus.setSecondary('touch',true);assert.equal(edges.length,1,'second source must not duplicate the effective pressed edge');
bus.setSecondary('desktop',false);assert.equal(edges.length,1,'one source releasing while another holds must stay pressed');
bus.setSecondary('touch',false);assert.equal(edges.length,2);assert.equal(edges[1].pressed,false);
assert.equal(Object.hasOwn(bus.snapshot(),'secondary'),false,'serialized control snapshot must not grow a secondary field');
bus.setSecondary('desktop',true);bus.resetSource('desktop');assert.equal(edges.at(-1).pressed,false,'source reset must release secondary');
bus.setSecondary('touch',true);bus.resetAll();assert.equal(edges.at(-1).pressed,false,'global input reset must release secondary');
assert.equal(states.length,0,'secondary edges must not mutate movement/control state');
console.log('continuous secondary input remains local and protocol-neutral: PASS');
