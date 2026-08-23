import assert from 'node:assert/strict';
import {DESKTOP_BROWSER_RESERVED_CODES,DESKTOP_SPRINT_HOLD_CODE,DESKTOP_SPRINT_HOLD_CODES,desktopButtonForCode} from '../src/desktop-controls.js';

assert.equal(DESKTOP_SPRINT_HOLD_CODE,'ControlLeft');
assert.deepEqual(DESKTOP_SPRINT_HOLD_CODES,['ControlLeft','ControlRight']);
assert.equal(desktopButtonForCode('KeyR'),null,'legacy R sprint binding must stay removed');
assert.equal(desktopButtonForCode('ControlLeft'),'sprint');
assert.equal(desktopButtonForCode('ControlRight'),'sprint');
assert.equal(desktopButtonForCode('ShiftLeft'),'sneak');
assert.equal(desktopButtonForCode('Space'),'jump');
assert.ok(DESKTOP_BROWSER_RESERVED_CODES.includes('Tab'));
assert.ok(DESKTOP_BROWSER_RESERVED_CODES.includes('ControlLeft'));
assert.ok(DESKTOP_BROWSER_RESERVED_CODES.includes('ControlRight'));
console.log('browser-safe desktop keymap contract: PASS');
