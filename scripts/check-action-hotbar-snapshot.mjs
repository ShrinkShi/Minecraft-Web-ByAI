import assert from 'node:assert/strict';
import {decodeClientInputEnvelope,encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {encodePlayerActionFrame} from '../src/player-action-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {ServerPlayerInputState} from '../server/player-input-state.mjs';

const session='s:action-slot';
const decoded=(kind,payload,packetSeq)=>decodeClientInputEnvelope(encodeClientInputEnvelope({session,packetSeq,kind,payload}),{expectedSession:session});
const state=new ServerPlayerInputState(session);
assert.equal(state.apply(decoded('view',encodePlayerViewFrame({yaw:.25,pitch:-.1},10),0)).accepted,true);
assert.equal(state.apply(decoded('action',encodePlayerActionFrame({kind:'hotbar-select',slot:2},20),1)).accepted,true);
const queued=state.apply(decoded('action',encodePlayerActionFrame({kind:'use',viewSeq:10},21),2));
assert.deepEqual(queued,{accepted:true,reason:'action-queued',sequence:21,viewSequence:10},'selectedSlot stays an internal queued-action snapshot instead of expanding the input application API');
assert.equal(state.apply(decoded('action',encodePlayerActionFrame({kind:'hotbar-select',slot:8},22),3)).accepted,true);
assert.equal(state.snapshot().selectedSlot,8,'live selected slot should advance after the queued use');
const [use]=state.drainActions();
assert.equal(use.kind,'use');assert.equal(use.selectedSlot,2,'queued use must retain the hotbar slot active when the action passed the server gate');assert.equal(use.view.sequence,10);assert.equal(use.view.yaw,.25);assert.equal(use.view.pitch,-.1);
use.selectedSlot=7;use.view.yaw=99;assert.equal(state.snapshot().selectedSlot,8,'drained action mutation must not affect authoritative live input state');
console.log('queued action hotbar/view snapshot: PASS');
