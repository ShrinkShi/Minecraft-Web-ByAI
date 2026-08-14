import assert from 'node:assert/strict';
import {DESKTOP_BROWSER_RESERVED_CODES,DESKTOP_SPRINT_HOLD_CODE,desktopButtonForCode} from '../src/desktop-controls.js';

assert.equal(DESKTOP_SPRINT_HOLD_CODE,'KeyR');
assert.equal(desktopButtonForCode('KeyR'),'sprint');
assert.equal(desktopButtonForCode('ControlLeft'),null,'Ctrl must not be a gameplay sprint hold key because Ctrl+W is browser-reserved');
assert.equal(desktopButtonForCode('ControlRight'),null);
assert.equal(desktopButtonForCode('ShiftLeft'),'sneak');
assert.equal(desktopButtonForCode('Space'),'jump');
assert.ok(DESKTOP_BROWSER_RESERVED_CODES.includes('Tab'));
assert.ok(DESKTOP_BROWSER_RESERVED_CODES.includes('ControlLeft'));
assert.ok(DESKTOP_BROWSER_RESERVED_CODES.includes('ControlRight'));
console.log('browser-safe desktop keymap contract: PASS');
