import assert from 'node:assert/strict';
import {GAMEPLAY_KEY_LOCK_CODES,shouldSuppressBrowserShortcut} from '../src/immersive-shell-rules.js';

assert.ok(GAMEPLAY_KEY_LOCK_CODES.includes('KeyW'),'locking KeyW is required so Chromium can deliver Ctrl+W to the game');
assert.ok(GAMEPLAY_KEY_LOCK_CODES.includes('F3'));
assert.ok(GAMEPLAY_KEY_LOCK_CODES.includes('F5'));
assert.equal(shouldSuppressBrowserShortcut({code:'F3',target:null}),true);
assert.equal(shouldSuppressBrowserShortcut({code:'F5',target:null}),true);
assert.equal(shouldSuppressBrowserShortcut({code:'KeyW',ctrlKey:true,target:null}),true);
assert.equal(shouldSuppressBrowserShortcut({code:'KeyW',ctrlKey:false,target:null}),false);
assert.equal(shouldSuppressBrowserShortcut({code:'F3',target:{tagName:'INPUT'}}),false,'editing text must not be hijacked by gameplay shell shortcuts');
assert.equal(shouldSuppressBrowserShortcut({code:'F3',target:null},{gameplayActive:false}),false);

console.log('immersive desktop shell key-lock + F3/Ctrl+W suppression contracts: PASS');
