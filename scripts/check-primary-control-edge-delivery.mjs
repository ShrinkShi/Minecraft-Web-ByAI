import assert from 'node:assert/strict';
import {MultiplayerInputBridge} from '../src/multiplayer-input-bridge.js';

const sent=[];const transport={state:'ready',sendInput(kind,payload){sent.push({kind,payload});return payload;}};
let view={yaw:0,pitch:0};const control=primary=>({side:0,forward:0,jump:false,sneak:false,sprint:false,primary});
const bridge=new MultiplayerInputBridge({transport,viewProvider:()=>view});
bridge.prime(control(false),view);bridge.flush();assert.deepEqual(sent.map(entry=>entry.kind),['view','control']);sent.length=0;

view={yaw:.35,pitch:.1};bridge.setView(view);bridge.setControl(control(true));
assert.deepEqual(sent.map(entry=>entry.kind),['view','control'],'primary press must immediately flush the latest view before the control edge');assert.equal(sent[1].payload.buttons&8,8);
sent.length=0;

bridge.setControl(control(false));
assert.deepEqual(sent.map(entry=>entry.kind),['control'],'primary release must be delivered immediately instead of coalescing with a later frame');assert.equal(sent[0].payload.buttons&8,0);
sent.length=0;

bridge.setControl({...control(false),forward:1});assert.equal(sent.length,0,'ordinary continuous movement remains coalesced until the network tick');bridge.flush();assert.equal(sent.length,1);assert.equal(sent[0].payload.kind??'control','control');

console.log('primary control edge delivery: PASS');
