import assert from 'node:assert/strict';
import {
  PLAYER_VIEW_FRAME_VERSION,
  PLAYER_VIEW_MAX_PITCH,
  normalizePlayerYaw,
  encodePlayerViewFrame,
  decodePlayerViewFrame,
  isCompatibleViewFrame
} from '../src/player-view-frame.js';

assert.equal(PLAYER_VIEW_FRAME_VERSION,1);
assert.equal(PLAYER_VIEW_MAX_PITCH,1.553);
assert.equal(normalizePlayerYaw(0),0);
assert.ok(Math.abs(normalizePlayerYaw(Math.PI*2+.25)-.25)<1e-12);
assert.equal(normalizePlayerYaw(Math.PI),-Math.PI);

const absoluteView={yaw:Math.PI*4+.35,pitch:-.45};
const desktopFrame=encodePlayerViewFrame(absoluteView,43);
const touchFrame=encodePlayerViewFrame(absoluteView,43);
const networkFrame=encodePlayerViewFrame(absoluteView,43);
assert.deepEqual(desktopFrame,touchFrame);
assert.deepEqual(networkFrame,desktopFrame,'absolute view wire state must be device-neutral');
assert.deepEqual(Object.keys(desktopFrame).sort(),['pitch','seq','v','yaw']);
assert.ok(Math.abs(desktopFrame.yaw-.35)<1e-12);
assert.equal(desktopFrame.pitch,-.45);
assert.equal('source' in desktopFrame,false);
assert.equal('device' in desktopFrame,false);

const decoded=decodePlayerViewFrame(desktopFrame);
assert.ok(Math.abs(decoded.yaw-.35)<1e-12);
assert.equal(decoded.pitch,-.45);
assert.equal(decoded.sequence,43);
assert.equal(isCompatibleViewFrame(desktopFrame),true);

assert.throws(()=>encodePlayerViewFrame(absoluteView,-1),/uint32/);
assert.throws(()=>encodePlayerViewFrame({yaw:0,pitch:PLAYER_VIEW_MAX_PITCH+.001},1),/out of range/);
assert.throws(()=>decodePlayerViewFrame({...desktopFrame,v:2}),/unsupported/);
assert.throws(()=>decodePlayerViewFrame({...desktopFrame,yaw:Math.PI}),/canonical/);
assert.throws(()=>decodePlayerViewFrame({...desktopFrame,pitch:-PLAYER_VIEW_MAX_PITCH-.001}),/out of range/);
assert.throws(()=>decodePlayerViewFrame({...desktopFrame,yaw:'.35'}),/finite number/);
assert.throws(()=>decodePlayerViewFrame({...desktopFrame,source:'touch'}),/unexpected fields/);
assert.equal(isCompatibleViewFrame({}),false);
assert.equal(isCompatibleViewFrame({...desktopFrame,device:'mobile'}),false);

console.log('platform-neutral absolute view frame contracts: PASS');
