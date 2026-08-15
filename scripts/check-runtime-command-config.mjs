import assert from 'node:assert/strict';
import {normalizeRuntimeConfig,runtimeConfigFromEnv} from '../server/runtime-config.mjs';

let config=normalizeRuntimeConfig({port:8080});assert.equal(config.allowCommands,false,'multiplayer cheat commands must be deny-by-default');
config=normalizeRuntimeConfig({port:8080,allowCommands:true});assert.equal(config.allowCommands,true);
config=normalizeRuntimeConfig({port:8080,allowCommands:'true'});assert.equal(config.allowCommands,true);
config=normalizeRuntimeConfig({port:8080,allowCommands:'0'});assert.equal(config.allowCommands,false);
assert.throws(()=>normalizeRuntimeConfig({port:8080,allowCommands:'yes'}),/allowCommands/);
const fromEnv=runtimeConfigFromEnv({MCWEB_WS_PORT:'8080',MCWEB_ALLOW_COMMANDS:'true'});assert.equal(fromEnv.allowCommands,true);
const defaultEnv=runtimeConfigFromEnv({MCWEB_WS_PORT:'8080'});assert.equal(defaultEnv.allowCommands,false);
console.log('runtime multiplayer command permission config defaults: PASS');
