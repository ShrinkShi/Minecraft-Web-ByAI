import assert from 'node:assert/strict';
import {encodePlayerActionFrame,decodePlayerActionFrame} from '../src/player-action-frame.js';
import {encodeClientInputEnvelope,decodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {ServerPlayerInputState} from '../server/player-input-state.mjs';

const attack=encodePlayerActionFrame({kind:'attack',viewSeq:4},7);assert.deepEqual(attack,{v:1,seq:7,kind:'attack',viewSeq:4});assert.deepEqual(decodePlayerActionFrame(attack),{kind:'attack',sequence:7,viewSequence:4});const respawn=encodePlayerActionFrame({kind:'respawn'},8);assert.deepEqual(respawn,{v:1,seq:8,kind:'respawn'});assert.deepEqual(decodePlayerActionFrame(respawn),{kind:'respawn',sequence:8});assert.throws(()=>encodePlayerActionFrame({kind:'respawn',viewSeq:4},8),/unexpected fields/);
const respawnEnvelope=encodeClientInputEnvelope({session:'s:combat-input',packetSeq:3,kind:'action',payload:respawn});assert.deepEqual(respawnEnvelope.payload,{v:1,seq:8,kind:'respawn'});assert.equal(decodeClientInputEnvelope(respawnEnvelope).payload.kind,'respawn');
const input=new ServerPlayerInputState('s:combat-input');assert.equal(input.apply({session:'s:combat-input',kind:'view',payload:{version:1,yaw:0,pitch:0,sequence:4}}).accepted,true);assert.equal(input.apply({session:'s:combat-input',kind:'action',payload:decodePlayerActionFrame(attack)}).accepted,true);assert.equal(input.apply({session:'s:combat-input',kind:'action',payload:decodePlayerActionFrame(respawn)}).accepted,true);const actions=input.drainActions();assert.deepEqual(actions[0],{kind:'attack',sequence:7,viewSequence:4,view:{yaw:0,pitch:0,sequence:4},selectedSlot:0});assert.deepEqual(actions[1],{kind:'respawn',sequence:8});
console.log('authoritative attack + respawn input actions: PASS');
