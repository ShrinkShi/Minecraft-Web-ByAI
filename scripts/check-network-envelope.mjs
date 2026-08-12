import assert from 'node:assert/strict';
import {encodePlayerControlFrame} from '../src/player-control-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {encodePlayerActionFrame} from '../src/player-action-frame.js';
import {
  NETWORK_SEQUENCE_MAX,
  NETWORK_SEQUENCE_HALF_RANGE,
  nextNetworkSequence,
  networkSequenceDistance,
  isNetworkSequenceNewer,
  NetworkSequenceGate
} from '../src/network-sequence.js';
import {
  CLIENT_INPUT_ENVELOPE_VERSION,
  CLIENT_INPUT_KINDS,
  assertClientSessionId,
  encodeClientInputEnvelope,
  decodeClientInputEnvelope,
  isCompatibleClientInputEnvelope,
  ClientInputSessionGate
} from '../src/client-input-envelope.js';

assert.equal(CLIENT_INPUT_ENVELOPE_VERSION,1);
assert.deepEqual(CLIENT_INPUT_KINDS,['control','view','action']);
assert.equal(NETWORK_SEQUENCE_MAX,0xffffffff);
assert.equal(NETWORK_SEQUENCE_HALF_RANGE,0x80000000);
assert.equal(nextNetworkSequence(0),1);
assert.equal(nextNetworkSequence(0xffffffff),0,'uint32 packet sequence wraps cleanly');
assert.equal(networkSequenceDistance(0,0xffffffff),1);
assert.equal(isNetworkSequenceNewer(0,0xffffffff),true);
assert.equal(isNetworkSequenceNewer(0xffffffff,0),false);
assert.equal(isNetworkSequenceNewer(10,10),false);
assert.equal(isNetworkSequenceNewer(0x80000000,0),false,'exact half-range is ambiguous and must not be accepted as newer');
assert.throws(()=>nextNetworkSequence(-1),/uint32/);
assert.throws(()=>networkSequenceDistance('1',0),/uint32/);

const sequenceGate=new NetworkSequenceGate();
assert.equal(sequenceGate.accept(0xfffffffe),true);
assert.equal(sequenceGate.accept(0xffffffff),true);
assert.equal(sequenceGate.accept(0),true,'gate accepts natural wraparound');
assert.equal(sequenceGate.accept(0),false,'duplicate packet is rejected');
assert.equal(sequenceGate.accept(0xffffffff),false,'stale packet from before wrap is rejected');
sequenceGate.reset();assert.equal(sequenceGate.accept(9),true);assert.equal(sequenceGate.accept(8),false);

assert.equal(assertClientSessionId('world-7.session_A:1'),'world-7.session_A:1');
for(const bad of ['', 'has space', 'slash/not-allowed', 'x'.repeat(65), 123, null])assert.throws(()=>assertClientSessionId(bad),/session/);

const session='sess-world_42';
const control=encodePlayerControlFrame({side:.2,forward:.8,jump:true,sneak:false,sprint:true,primary:false},11);
const view=encodePlayerViewFrame({yaw:.75,pitch:-.25},12);
const action=encodePlayerActionFrame({kind:'use',viewSeq:12},13);
const select=encodePlayerActionFrame({kind:'hotbar-select',slot:4},14);

const controlEnvelope=encodeClientInputEnvelope({session,packetSeq:100,kind:'control',payload:control});
const viewEnvelope=encodeClientInputEnvelope({session,packetSeq:101,kind:'view',payload:view});
const actionEnvelope=encodeClientInputEnvelope({session,packetSeq:102,kind:'action',payload:action});
const selectEnvelope=encodeClientInputEnvelope({session,packetSeq:103,kind:'action',payload:select});
assert.deepEqual(Object.keys(controlEnvelope).sort(),['kind','packetSeq','payload','session','v']);
assert.equal('token' in controlEnvelope,false);assert.equal('device' in controlEnvelope,false);assert.equal('source' in controlEnvelope,false);
assert.notEqual(controlEnvelope.payload,control,'envelope owns a cloned wire payload');
assert.notEqual(controlEnvelope.payload.move,control.move,'nested mutable arrays are cloned');
control.move[0]=1;assert.notEqual(controlEnvelope.payload.move[0],1,'caller mutation cannot change an encoded envelope');

const decodedControl=decodeClientInputEnvelope(controlEnvelope,{expectedSession:session});
assert.equal(decodedControl.packetSequence,100);assert.equal(decodedControl.kind,'control');assert.equal(decodedControl.payload.sequence,11);
const decodedView=decodeClientInputEnvelope(viewEnvelope,{expectedSession:session});assert.equal(decodedView.payload.sequence,12);assert.equal(decodedView.payload.yaw,.75);
const decodedAction=decodeClientInputEnvelope(actionEnvelope,{expectedSession:session});assert.equal(decodedAction.payload.sequence,13);assert.equal(decodedAction.payload.viewSequence,12);
const decodedSelect=decodeClientInputEnvelope(selectEnvelope,{expectedSession:session});assert.equal(decodedSelect.payload.slot,4);
assert.equal(isCompatibleClientInputEnvelope(actionEnvelope,{expectedSession:session}),true);

assert.throws(()=>encodeClientInputEnvelope({session,packetSeq:'1',kind:'control',payload:controlEnvelope.payload}),/uint32/);
assert.throws(()=>encodeClientInputEnvelope({session,packetSeq:1,kind:'chat',payload:{}}),/unsupported client input kind/);
assert.throws(()=>encodeClientInputEnvelope({session,packetSeq:1,kind:'action',payload:{...action,target:{x:1,y:2,z:3}}}),/unexpected fields/,'client target injection remains rejected through the envelope');
assert.throws(()=>encodeClientInputEnvelope({session,packetSeq:1,kind:'view',payload:{...view,source:'touch'}}),/unexpected fields/);
assert.throws(()=>encodeClientInputEnvelope({session,packetSeq:1,kind:'control',payload:controlEnvelope.payload,device:'mobile'}),/unexpected fields/);
assert.throws(()=>decodeClientInputEnvelope({...viewEnvelope,v:2}),/unsupported client input envelope version/);
assert.throws(()=>decodeClientInputEnvelope({...viewEnvelope,token:'secret'}),/unexpected fields/,'auth material is not part of the realtime input envelope');
assert.throws(()=>decodeClientInputEnvelope(viewEnvelope,{expectedSession:'other-session'}),/session mismatch/);
assert.throws(()=>decodeClientInputEnvelope({...viewEnvelope,kind:'action'}),/unexpected fields|unsupported/,'payload schema must match envelope kind');
assert.equal(isCompatibleClientInputEnvelope({...actionEnvelope,device:'mobile'}),false);

const sessionGate=new ClientInputSessionGate(session);
assert.equal(sessionGate.accept(controlEnvelope).accepted,true);
assert.equal(sessionGate.accept(viewEnvelope).accepted,true);
assert.equal(sessionGate.accept(viewEnvelope).accepted,false,'duplicate envelope is rejected at the session gate');
assert.equal(sessionGate.accept(actionEnvelope).accepted,true);
assert.equal(sessionGate.accept({...actionEnvelope,packetSeq:99}).accepted,false,'stale envelope is rejected across message kinds');
assert.throws(()=>sessionGate.accept({...selectEnvelope,session:'stale-session'}),/session mismatch/);
sessionGate.reset('sess-reconnect_43');
const reconnectEnvelope=encodeClientInputEnvelope({session:'sess-reconnect_43',packetSeq:0,kind:'view',payload:view});
assert.equal(sessionGate.accept(reconnectEnvelope).accepted,true,'new server-assigned session epoch resets packet ordering');

console.log('strict client-input envelope + session packet ordering contracts: PASS');
