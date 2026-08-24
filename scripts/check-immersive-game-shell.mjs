import assert from 'node:assert/strict';
import {GAMEPLAY_KEY_LOCK_CODES,shouldSuppressBrowserShortcut} from '../src/immersive-shell-rules.js';

assert.ok(GAMEPLAY_KEY_LOCK_CODES.includes('KeyW'),'locking KeyW is required so Chromium can deliver Ctrl+W to the game');
assert.ok(GAMEPLAY_KEY_LOCK_CODES.includes('ControlLeft'),'left Ctrl must stay captured while immersive Ctrl+W sprint is active');
assert.ok(GAMEPLAY_KEY_LOCK_CODES.includes('ControlRight'),'right Ctrl must stay captured while immersive Ctrl+W sprint is active');
assert.equal(GAMEPLAY_KEY_LOCK_CODES.includes('KeyR'),false,'legacy R sprint binding must not remain in the immersive key lock set');
assert.ok(GAMEPLAY_KEY_LOCK_CODES.includes('F3'));
assert.ok(GAMEPLAY_KEY_LOCK_CODES.includes('F5'));
assert.equal(shouldSuppressBrowserShortcut({code:'F3',target:null}),true);
assert.equal(shouldSuppressBrowserShortcut({code:'F5',target:null}),true);
assert.equal(shouldSuppressBrowserShortcut({code:'KeyW',ctrlKey:true,target:null}),true);
assert.equal(shouldSuppressBrowserShortcut({code:'KeyW',metaKey:true,target:null}),true);
assert.equal(shouldSuppressBrowserShortcut({code:'KeyW',ctrlKey:false,metaKey:false,target:null}),false);
assert.equal(shouldSuppressBrowserShortcut({code:'F3',target:{tagName:'INPUT'}}),false,'editing text must not be hijacked by gameplay shell shortcuts');
assert.equal(shouldSuppressBrowserShortcut({code:'F3',target:null},{gameplayActive:false}),false);

console.log('immersive desktop shell key-lock + Ctrl/Meta+W suppression contracts: PASS');
