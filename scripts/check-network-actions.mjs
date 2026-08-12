import assert from 'node:assert/strict';
import {
  PLAYER_ACTION_FRAME_VERSION,
  PLAYER_GAMEPLAY_ACTIONS,
  actionRequiresView,
  encodePlayerActionFrame,
  decodePlayerActionFrame,
  isCompatibleActionFrame
} from '../src/player-action-frame.js';

assert.equal(PLAYER_ACTION_FRAME_VERSION,1);
assert.deepEqual(PLAYER_GAMEPLAY_ACTIONS,['use','drop','hotbar-select']);
assert.equal(actionRequiresView('use'),true);
assert.equal(actionRequiresView('drop'),true);
assert.equal(actionRequiresView('hotbar-select'),false);

const desktopUse=encodePlayerActionFrame({kind:'use',viewSeq:72},73);
const touchUse=encodePlayerActionFrame({kind:'use',viewSeq:72},73);
const networkUse=encodePlayerActionFrame({kind:'use',viewSeq:72},73);
assert.deepEqual(desktopUse,touchUse);
assert.deepEqual(networkUse,desktopUse,'wire use action must be device-neutral');
assert.deepEqual(Object.keys(desktopUse).sort(),['kind','seq','v','viewSeq']);
assert.equal('source' in desktopUse,false);assert.equal('device' in desktopUse,false);assert.equal('target' in desktopUse,false);
assert.deepEqual(decodePlayerActionFrame(desktopUse),{kind:'use',sequence:73,viewSequence:72});

const drop=encodePlayerActionFrame({kind:'drop',viewSeq:80},81);
assert.deepEqual(decodePlayerActionFrame(drop),{kind:'drop',sequence:81,viewSequence:80});
assert.equal('target' in drop,false,'drop direction is resolved from authoritative player view, not a client target');

const select=encodePlayerActionFrame({kind:'hotbar-select',slot:8},82);
assert.deepEqual(Object.keys(select).sort(),['kind','seq','slot','v']);
assert.deepEqual(decodePlayerActionFrame(select),{kind:'hotbar-select',sequence:82,slot:8});
assert.equal(isCompatibleActionFrame(select),true);

assert.throws(()=>encodePlayerActionFrame({kind:'use',viewSeq:1},-1),/uint32/);
assert.throws(()=>encodePlayerActionFrame({kind:'use',viewSeq:-1},1),/view sequence/);
assert.throws(()=>encodePlayerActionFrame({kind:'hotbar-select',slot:'3'},1),/integer from 0 to 8/);
assert.throws(()=>encodePlayerActionFrame({kind:'hotbar-select',slot:9},1),/integer from 0 to 8/);
assert.throws(()=>encodePlayerActionFrame({kind:'inventory'},1),/unsupported player gameplay action/);
assert.throws(()=>encodePlayerActionFrame({kind:'chat'},1),/unsupported player gameplay action/);
assert.throws(()=>encodePlayerActionFrame({kind:'use',viewSeq:1,target:{x:1,y:2,z:3}},2),/unexpected fields/,'client target hints are not authoritative in v1');
assert.throws(()=>decodePlayerActionFrame({...desktopUse,v:2}),/unsupported player action frame version/);
assert.throws(()=>decodePlayerActionFrame({...desktopUse,viewSeq:'72'}),/view sequence/);
assert.throws(()=>decodePlayerActionFrame({...desktopUse,source:'desktop'}),/unexpected fields/);
assert.throws(()=>decodePlayerActionFrame({...desktopUse,target:{x:0,y:0,z:0}}),/unexpected fields/);
assert.throws(()=>decodePlayerActionFrame({v:1,seq:1,kind:'pause'}),/unsupported player gameplay action/);
assert.equal(isCompatibleActionFrame({}),false);
assert.equal(isCompatibleActionFrame({...select,device:'mobile'}),false);

console.log('strict platform-neutral gameplay action wire contracts: PASS');
