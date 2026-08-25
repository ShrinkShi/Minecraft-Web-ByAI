import assert from 'node:assert/strict';
import {
  PLAYER_ACTION_FRAME_VERSION,
  PLAYER_GAMEPLAY_ACTIONS,
  actionRequiresView,
  actionHasNoPayload,
  encodePlayerActionFrame,
  decodePlayerActionFrame,
  isCompatibleActionFrame
} from '../src/player-action-frame.js';

assert.equal(PLAYER_ACTION_FRAME_VERSION,3);
assert.deepEqual(PLAYER_GAMEPLAY_ACTIONS,['use','use-release','drop','attack','respawn','hotbar-select','flight-toggle']);
assert.equal(actionRequiresView('use'),true);
assert.equal(actionRequiresView('use-release'),false);
assert.equal(actionRequiresView('drop'),true);
assert.equal(actionRequiresView('attack'),true);
assert.equal(actionRequiresView('respawn'),false);
assert.equal(actionRequiresView('hotbar-select'),false);
assert.equal(actionRequiresView('flight-toggle'),false);
assert.equal(actionHasNoPayload('use-release'),true);
assert.equal(actionHasNoPayload('respawn'),true);
assert.equal(actionHasNoPayload('flight-toggle'),true);
assert.equal(actionHasNoPayload('use'),false);

const desktopUse=encodePlayerActionFrame({kind:'use',viewSeq:72},73);
const touchUse=encodePlayerActionFrame({kind:'use',viewSeq:72},73);
const networkUse=encodePlayerActionFrame({kind:'use',viewSeq:72},73);
assert.deepEqual(desktopUse,touchUse);
assert.deepEqual(networkUse,desktopUse,'wire use action must be device-neutral');
assert.deepEqual(Object.keys(desktopUse).sort(),['kind','seq','v','viewSeq']);
assert.equal('source' in desktopUse,false);assert.equal('device' in desktopUse,false);assert.equal('target' in desktopUse,false);
assert.deepEqual(decodePlayerActionFrame(desktopUse),{kind:'use',sequence:73,viewSequence:72});

const useRelease=encodePlayerActionFrame({kind:'use-release'},74);
assert.deepEqual(useRelease,{v:PLAYER_ACTION_FRAME_VERSION,seq:74,kind:'use-release'});
assert.deepEqual(decodePlayerActionFrame(useRelease),{kind:'use-release',sequence:74});
assert.equal(isCompatibleActionFrame(useRelease),true);

const drop=encodePlayerActionFrame({kind:'drop',viewSeq:80},81);
assert.deepEqual(decodePlayerActionFrame(drop),{kind:'drop',sequence:81,viewSequence:80});
assert.equal('target' in drop,false,'drop direction is resolved from authoritative player view, not a client target');

const attack=encodePlayerActionFrame({kind:'attack',viewSeq:82},83);
assert.deepEqual(Object.keys(attack).sort(),['kind','seq','v','viewSeq']);
assert.deepEqual(decodePlayerActionFrame(attack),{kind:'attack',sequence:83,viewSequence:82});
assert.equal('target' in attack,false,'attack target is resolved from the authoritative referenced view, not a client target');

const respawn=encodePlayerActionFrame({kind:'respawn'},84);
assert.deepEqual(Object.keys(respawn).sort(),['kind','seq','v']);
assert.deepEqual(decodePlayerActionFrame(respawn),{kind:'respawn',sequence:84});
assert.equal(actionRequiresView(respawn.kind),false,'respawn is a server state transition and must not fabricate a view dependency');

const select=encodePlayerActionFrame({kind:'hotbar-select',slot:8},85);
assert.deepEqual(Object.keys(select).sort(),['kind','seq','slot','v']);
assert.deepEqual(decodePlayerActionFrame(select),{kind:'hotbar-select',sequence:85,slot:8});
assert.equal(isCompatibleActionFrame(select),true);

const flightToggle=encodePlayerActionFrame({kind:'flight-toggle'},86);
assert.deepEqual(flightToggle,{v:PLAYER_ACTION_FRAME_VERSION,seq:86,kind:'flight-toggle'});
assert.deepEqual(decodePlayerActionFrame(flightToggle),{kind:'flight-toggle',sequence:86});
assert.equal(actionRequiresView(flightToggle.kind),false,'creative flight toggle is a server-owned state transition and has no client target/view payload');
assert.equal(isCompatibleActionFrame(flightToggle),true);

assert.throws(()=>encodePlayerActionFrame({kind:'use',viewSeq:1},-1),/uint32/);
assert.throws(()=>encodePlayerActionFrame({kind:'use',viewSeq:-1},1),/view sequence/);
assert.throws(()=>encodePlayerActionFrame({kind:'use-release',viewSeq:1},1),/unexpected fields/);
assert.throws(()=>encodePlayerActionFrame({kind:'hotbar-select',slot:'3'},1),/integer from 0 to 8/);
assert.throws(()=>encodePlayerActionFrame({kind:'hotbar-select',slot:9},1),/integer from 0 to 8/);
assert.throws(()=>encodePlayerActionFrame({kind:'inventory'},1),/unsupported player gameplay action/);
assert.throws(()=>encodePlayerActionFrame({kind:'chat'},1),/unsupported player gameplay action/);
assert.throws(()=>encodePlayerActionFrame({kind:'use',viewSeq:1,target:{x:1,y:2,z:3}},2),/unexpected fields/,'client target hints are not authoritative');
assert.throws(()=>encodePlayerActionFrame({kind:'attack',viewSeq:1,target:'session-other'},2),/unexpected fields/,'client player target hints are not authoritative');
assert.throws(()=>encodePlayerActionFrame({kind:'respawn',viewSeq:1},2),/unexpected fields/,'respawn must not carry a stale referenced view');
assert.throws(()=>encodePlayerActionFrame({kind:'flight-toggle',viewSeq:1},2),/unexpected fields/,'flight toggle must not carry a stale referenced view');
assert.throws(()=>decodePlayerActionFrame({...desktopUse,v:2}),/unsupported player action frame version/);
assert.throws(()=>decodePlayerActionFrame({...desktopUse,viewSeq:'72'}),/view sequence/);
assert.throws(()=>decodePlayerActionFrame({...desktopUse,source:'desktop'}),/unexpected fields/);
assert.throws(()=>decodePlayerActionFrame({...desktopUse,target:{x:0,y:0,z:0}}),/unexpected fields/);
assert.throws(()=>decodePlayerActionFrame({v:PLAYER_ACTION_FRAME_VERSION,seq:1,kind:'pause'}),/unsupported player gameplay action/);
assert.equal(isCompatibleActionFrame({}),false);
assert.equal(isCompatibleActionFrame({...select,device:'mobile'}),false);

console.log('strict platform-neutral gameplay action wire v3 + use release + creative flight toggle: PASS');
