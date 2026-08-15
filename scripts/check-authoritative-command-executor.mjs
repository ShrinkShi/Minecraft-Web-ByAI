import assert from 'node:assert/strict';
import {executeAuthoritativeCommand} from '../server/authoritative-command-executor.mjs';

const calls=[];
const callbacks={setMode:mode=>calls.push(['mode',mode]),give:(id,count)=>(calls.push(['give',id,count]),{remaining:0})};

let result=executeAuthoritativeCommand('/help',{allowCommands:false,...callbacks});assert.equal(result.ok,true);assert.match(result.message,/需要服务器显式启用作弊指令/);assert.deepEqual(calls,[]);
result=executeAuthoritativeCommand('/give stick 3',{allowCommands:false,...callbacks});assert.deepEqual(result,{ok:false,code:'denied',message:'服务器未启用作弊指令。管理员可通过 MCWEB_ALLOW_COMMANDS=true 显式开启。'});assert.deepEqual(calls,[],'denied commands must never reach authoritative mutation callbacks');
result=executeAuthoritativeCommand('/gamemode creative',{allowCommands:false,...callbacks});assert.equal(result.code,'denied');assert.deepEqual(calls,[]);

result=executeAuthoritativeCommand('/gamemode creative',{allowCommands:true,...callbacks});assert.equal(result.ok,true);assert.deepEqual(calls.pop(),['mode','creative']);
result=executeAuthoritativeCommand('/give minecraft:oak_log 5',{allowCommands:true,...callbacks});assert.equal(result.ok,true);assert.match(result.message,/橡木原木 × 5/);assert.deepEqual(calls.pop(),['give','block:6',5]);
result=executeAuthoritativeCommand('/give missing 1',{allowCommands:true,...callbacks});assert.equal(result.code,'usage');
result=executeAuthoritativeCommand('/give stick 0',{allowCommands:true,...callbacks});assert.equal(result.code,'usage');
result=executeAuthoritativeCommand('/tp 1 2 3',{allowCommands:true,...callbacks});assert.equal(result.code,'unknown-command','unsupported singleplayer commands must not gain authority accidentally');
result=executeAuthoritativeCommand('/give stick 64',{allowCommands:true,setMode:callbacks.setMode,give:()=>({remaining:64})});assert.deepEqual(result,{ok:false,code:'inventory-full',message:'背包已满，未给予任何物品'});
assert.throws(()=>executeAuthoritativeCommand('help',{allowCommands:true,...callbacks}),/invalid/);

console.log('authoritative multiplayer command whitelist + deny-by-default policy: PASS');
