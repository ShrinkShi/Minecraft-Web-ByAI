import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {encodeMultiplayerCommandRequest,decodeMultiplayerCommandResult,MULTIPLAYER_COMMAND_RESULT_KIND} from '../src/multiplayer-command-wire.js';
import {decodeServerInventorySnapshot,SERVER_INVENTORY_SNAPSHOT_KIND} from '../src/server-inventory-snapshot.js';
import {createAuthoritativeServerRuntime} from '../server/runtime.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));
function queue(socket){const values=[],waiters=[];socket.on('message',(data,isBinary)=>{if(isBinary)return;const value=JSON.parse(data.toString('utf8')),waiter=waiters.shift();if(waiter)waiter(value);else values.push(value);});return{next(label){if(values.length)return Promise.resolve(values.shift());return Promise.race([new Promise(resolve=>waiters.push(resolve)),timeout(3000,label)]);}};}
async function open(url){return Promise.race([new Promise((resolve,reject)=>{const socket=new WebSocket(url,[MULTIPLAYER_SUBPROTOCOL],{origin:ORIGIN});socket.once('open',()=>resolve(socket));socket.once('error',reject);}),timeout(3000,'command runtime websocket open')]);}
async function nextKind(messages,kind,label){for(let i=0;i<20;i++){const message=await messages.next(label);if(message.kind===kind)return message;}throw new Error(`did not receive ${kind}`);}
async function connectRuntime(runtime){const address=await runtime.start(),socket=await open(`ws://127.0.0.1:${address.port}${runtime.server.path}`),messages=queue(socket);socket.send(JSON.stringify(encodeClientHello()));const welcome=await messages.next('command welcome');assert.equal(welcome.kind,'welcome');const inventory=decodeServerInventorySnapshot(await nextKind(messages,SERVER_INVENTORY_SNAPSHOT_KIND,'command bootstrap'),{expectedSession:welcome.session});return{socket,messages,welcome,inventory};}

async function testDeniedByDefault(){
  const errors=[],runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],worldId:'command-denied',seed:'command-denied',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:16},setIntervalFn:()=>({timer:'disabled'}),clearIntervalFn:()=>{},onError:event=>errors.push(event)});let socket=null;
  try{const connected=await connectRuntime(runtime);socket=connected.socket;assert.equal(connected.inventory.revision,0);socket.send(JSON.stringify(encodeMultiplayerCommandRequest({session:connected.welcome.session,requestId:0,text:'/give stick 3'})));const result=decodeMultiplayerCommandResult(await nextKind(connected.messages,MULTIPLAYER_COMMAND_RESULT_KIND,'denied command result'),{expectedSession:connected.welcome.session});assert.equal(result.code,'denied');assert.equal(runtime.inventories.snapshot(connected.welcome.session).revision,0);assert.equal(runtime.inventories.snapshot(connected.welcome.session).slots.every(slot=>slot===null),true);assert.deepEqual(errors,[]);}finally{if(socket?.readyState===WebSocket.OPEN)socket.terminate();await runtime.stop();}
}

async function testEnabledAuthority(){
  const errors=[],runtime=createAuthoritativeServerRuntime({config:{host:'127.0.0.1',port:0,allowedOrigins:[ORIGIN],allowCommands:true,worldId:'command-enabled',seed:'command-enabled',prompt:'plains',mode:'survival',spawnX:0,spawnZ:0,prefetchRadius:0,terrainCacheChunks:16},setIntervalFn:()=>({timer:'disabled'}),clearIntervalFn:()=>{},onError:event=>errors.push(event)});let socket=null;
  try{
    const connected=await connectRuntime(runtime);socket=connected.socket;const session=connected.welcome.session;
    socket.send(JSON.stringify(encodeMultiplayerCommandRequest({session,requestId:0,text:'/give stick 3'})));
    let inventoryWire=null,resultWire=null;for(let i=0;i<20&&(!inventoryWire||!resultWire);i++){const message=await connected.messages.next('enabled give response');if(message.kind===SERVER_INVENTORY_SNAPSHOT_KIND)inventoryWire=message;else if(message.kind===MULTIPLAYER_COMMAND_RESULT_KIND)resultWire=message;}
    assert.ok(inventoryWire);assert.ok(resultWire);const inventory=decodeServerInventorySnapshot(inventoryWire,{expectedSession:session}),result=decodeMultiplayerCommandResult(resultWire,{expectedSession:session});assert.equal(result.ok,true);assert.equal(inventory.revision,1);assert.deepEqual(inventory.slots[0],{id:'stick',count:3});assert.deepEqual(runtime.inventories.snapshot(session).slots[0],{id:'stick',count:3});

    socket.send(JSON.stringify(encodeMultiplayerCommandRequest({session,requestId:1,text:'/gamemode creative'})));
    let modeInventory=null,modeResult=null;for(let i=0;i<20&&(!modeInventory||!modeResult);i++){const message=await connected.messages.next('enabled gamemode response');if(message.kind===SERVER_INVENTORY_SNAPSHOT_KIND)modeInventory=message;else if(message.kind===MULTIPLAYER_COMMAND_RESULT_KIND)modeResult=message;}
    const modeSnapshot=decodeServerInventorySnapshot(modeInventory,{expectedSession:session}),commandResult=decodeMultiplayerCommandResult(modeResult,{expectedSession:session});assert.equal(commandResult.ok,true);assert.equal(modeSnapshot.mode,'creative');assert.equal(modeSnapshot.revision,2);assert.deepEqual(modeSnapshot.slots[0],{id:'stick',count:3},'gamemode must preserve carried inventory');assert.equal(runtime.authoritative.snapshot(session).mode,'creative');assert.equal(runtime.inventories.snapshot(session).mode,'creative');assert.deepEqual(errors,[]);

    const closed=Promise.race([new Promise(resolve=>socket.once('close',(code,reason)=>resolve({code,reason:reason.toString('utf8')}))),timeout(3000,'replayed command close')]);socket.send(JSON.stringify(encodeMultiplayerCommandRequest({session,requestId:1,text:'/give stick 1'})));const closeEvent=await closed;assert.equal(closeEvent.code,1008);assert.match(closeEvent.reason,/stale or duplicate command request/);assert.equal(runtime.inventories.snapshot(session).revision,2,'replayed request must not execute a second mutation');
  }finally{if(socket?.readyState===WebSocket.OPEN)socket.terminate();await runtime.stop();}
}

await testDeniedByDefault();await testEnabledAuthority();
console.log('real WebSocket deny-by-default + authoritative commands + replay rejection: PASS');
