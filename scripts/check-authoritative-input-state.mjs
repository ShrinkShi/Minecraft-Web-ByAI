import assert from 'node:assert/strict';
import {decodeClientInputEnvelope,encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {encodePlayerControlFrame} from '../src/player-control-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {encodePlayerActionFrame} from '../src/player-action-frame.js';
import {ServerPlayerInputState,DEFAULT_VIEW_HISTORY_LIMIT,DEFAULT_ACTION_QUEUE_LIMIT} from '../server/player-input-state.mjs';

const session='state-session-1';
const decoded=(kind,payload,packetSeq=0)=>decodeClientInputEnvelope(encodeClientInputEnvelope({session,packetSeq,kind,payload}),{expectedSession:session});
assert.equal(DEFAULT_VIEW_HISTORY_LIMIT,64);assert.equal(DEFAULT_ACTION_QUEUE_LIMIT,64);

const state=new ServerPlayerInputState(session,{viewHistoryLimit:3,actionQueueLimit:2});
assert.deepEqual(state.snapshot(),{session,control:null,view:null,selectedSlot:0,pendingActionCount:0,retainedViewCount:0});

const control10=encodePlayerControlFrame({side:.25,forward:.75,jump:true,sneak:false,sprint:true,primary:false},10);
assert.equal(state.apply(decoded('control',control10)).accepted,true);assert.equal(state.snapshot().control.sequence,10);assert.equal(state.snapshot().control.forward,.75);
const staleControl=encodePlayerControlFrame({side:0,forward:-1,jump:false,sneak:false,sprint:false,primary:false},10);
assert.deepEqual(state.apply(decoded('control',staleControl,1)),{accepted:false,reason:'stale-control-sequence'},'new packetSeq must not replay the same inner control sequence');
assert.equal(state.snapshot().control.forward,.75,'stale semantic control must not mutate authoritative input state');

for(const [packetSeq,sequence,yaw] of [[2,20,.1],[3,21,.2],[4,22,.3]]){
  assert.equal(state.apply(decoded('view',encodePlayerViewFrame({yaw,pitch:-.1},sequence),packetSeq)).accepted,true);
}
assert.equal(state.snapshot().view.sequence,22);assert.equal(state.snapshot().retainedViewCount,3);

const use30=encodePlayerActionFrame({kind:'use',viewSeq:20},30);
assert.equal(state.apply(decoded('action',use30,5)).accepted,true);let snapshot=state.snapshot();assert.equal(snapshot.pendingActionCount,1);assert.equal(snapshot.selectedSlot,0);
let actions=state.drainActions(1);assert.deepEqual(actions,[{kind:'use',sequence:30,viewSequence:20,view:{yaw:.1,pitch:-.1,sequence:20}}]);assert.equal(state.snapshot().pendingActionCount,0);
actions[0].view.yaw=99;assert.equal(state.snapshot().view.yaw,.3,'drained action copies must not mutate retained view state');

const replayUse30=encodePlayerActionFrame({kind:'use',viewSeq:22},30);
assert.deepEqual(state.apply(decoded('action',replayUse30,6)),{accepted:false,reason:'stale-action-sequence'},'new outer packet sequence must not replay an old action frame');

const hotbar31=encodePlayerActionFrame({kind:'hotbar-select',slot:7},31);assert.deepEqual(state.apply(decoded('action',hotbar31,7)),{accepted:true,reason:'hotbar-updated',sequence:31,slot:7});assert.equal(state.snapshot().selectedSlot,7);

assert.equal(state.apply(decoded('view',encodePlayerViewFrame({yaw:.4,pitch:0},23),8)).accepted,true);assert.equal(state.snapshot().retainedViewCount,3,'view history remains bounded');
const evicted32=encodePlayerActionFrame({kind:'drop',viewSeq:20},32);assert.deepEqual(state.apply(decoded('action',evicted32,9)),{accepted:false,reason:'unknown-action-view'},'actions cannot reference an evicted or never accepted view');

const use33=encodePlayerActionFrame({kind:'use',viewSeq:21},33),drop34=encodePlayerActionFrame({kind:'drop',viewSeq:22},34),use35=encodePlayerActionFrame({kind:'use',viewSeq:23},35);
assert.equal(state.apply(decoded('action',use33,10)).accepted,true);assert.equal(state.apply(decoded('action',drop34,11)).accepted,true);assert.deepEqual(state.apply(decoded('action',use35,12)),{accepted:false,reason:'action-queue-full'},'bounded action queue rejects overflow rather than growing without limit');
assert.equal(state.snapshot().pendingActionCount,2);assert.equal(state.drainActions().length,2);assert.equal(state.snapshot().pendingActionCount,0);assert.deepEqual(state.drainActions(),[]);
assert.throws(()=>state.drainActions(-1),/non-negative integer/);

const other=decodeClientInputEnvelope(encodeClientInputEnvelope({session:'other-session',packetSeq:0,kind:'view',payload:encodePlayerViewFrame({yaw:0,pitch:0},1)}));
assert.deepEqual(state.apply(other),{accepted:false,reason:'session-mismatch'});
assert.throws(()=>new ServerPlayerInputState('',{}),/session/);assert.throws(()=>new ServerPlayerInputState(session,{viewHistoryLimit:0}),/1 to 4096/);assert.throws(()=>new ServerPlayerInputState(session,{actionQueueLimit:4097}),/1 to 4096/);

const wrapping=new ServerPlayerInputState('wrap-session');
const wrapMessage=(sequence,packetSeq)=>decodeClientInputEnvelope(encodeClientInputEnvelope({session:'wrap-session',packetSeq,kind:'view',payload:encodePlayerViewFrame({yaw:0,pitch:0},sequence)}));
assert.equal(wrapping.apply(wrapMessage(0xffffffff,0)).accepted,true);assert.equal(wrapping.apply(wrapMessage(0,1)).accepted,true,'inner semantic sequence gate accepts uint32 wraparound');assert.equal(wrapping.snapshot().view.sequence,0);

console.log('authoritative per-session input state + inner replay guards: PASS');
