import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {encodePlayerControlFrame} from '../src/player-control-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {encodePlayerActionFrame} from '../src/player-action-frame.js';
import {encodeClientInputEnvelope} from '../src/client-input-envelope.js';
import {MULTIPLAYER_SUBPROTOCOL,encodeClientHello} from '../src/multiplayer-handshake.js';
import {createMultiplayerServer,SERVER_HELLO_TIMEOUT_CLOSE_CODE} from '../server/multiplayer-server.mjs';

const ORIGIN='http://localhost:4173';
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout waiting for ${label}`)),ms));

function openClient(url,{origin=ORIGIN,protocol=MULTIPLAYER_SUBPROTOCOL}={}){
  return Promise.race([new Promise((resolve,reject)=>{
    const protocols=protocol?[protocol]:[];const socket=new WebSocket(url,protocols,{origin});
    socket.once('open',()=>resolve(socket));socket.once('error',reject);
  }),timeout(2500,'websocket open')]);
}

function nextJson(socket){
  return Promise.race([new Promise((resolve,reject)=>{
    const onMessage=(data,isBinary)=>{cleanup();if(isBinary){reject(new Error('expected text websocket message'));return;}try{resolve(JSON.parse(data.toString('utf8')));}catch(error){reject(error);}};
    const onClose=(code,reason)=>{cleanup();reject(new Error(`socket closed before message: ${code} ${reason}`));};
    const cleanup=()=>{socket.off('message',onMessage);socket.off('close',onClose);};socket.once('message',onMessage);socket.once('close',onClose);
  }),timeout(2500,'json websocket message')]);
}

function nextClose(socket){
  return Promise.race([new Promise(resolve=>socket.once('close',(code,reason)=>resolve({code,reason:reason.toString('utf8')}))),timeout(2500,'websocket close')]);
}

function waitUntil(predicate,label){
  return Promise.race([new Promise(resolve=>{const poll=()=>predicate()?resolve():setTimeout(poll,10);poll();}),timeout(2500,label)]);
}

function expectUpgradeStatus(url,{origin=ORIGIN,protocol=null,status}){
  return Promise.race([new Promise((resolve,reject)=>{
    const protocols=protocol?[protocol]:[];const socket=new WebSocket(url,protocols,{origin});
    socket.once('open',()=>{socket.terminate();reject(new Error(`expected HTTP ${status}, websocket opened`));});
    socket.once('unexpected-response',(_request,response)=>{const actual=response.statusCode;response.resume();actual===status?resolve():reject(new Error(`expected HTTP ${status}, got ${actual}`));});
    socket.once('error',()=>{});
  }),timeout(2500,`HTTP upgrade rejection ${status}`)]);
}

let sessionCounter=0;const readyEvents=[],inputs=[],closeEvents=[],socketErrors=[];
const server=createMultiplayerServer({
  port:0,allowedOrigins:[ORIGIN],helloTimeoutMs:300,sessionFactory:()=>`test-session-${++sessionCounter}`,
  onSessionReady:event=>readyEvents.push(event),
  onInput:event=>{
    inputs.push(event);
    if(event.message.kind==='action'&&event.message.payload.kind==='hotbar-select')throw new Error('intentional input handler failure');
  },
  onSessionClose:event=>closeEvents.push(event),
  onSocketError:event=>socketErrors.push(event)
});

try{
  const address=await server.listen();assert.equal(address.address,'127.0.0.1');assert.ok(address.port>0);
  const httpBase=`http://127.0.0.1:${address.port}`,wsUrl=`ws://127.0.0.1:${address.port}${server.path}`;
  const health=await fetch(`${httpBase}/healthz`);assert.equal(health.status,200);assert.deepEqual(await health.json(),{ok:true,protocol:MULTIPLAYER_SUBPROTOCOL});
  const missing=await fetch(`${httpBase}/missing`);assert.equal(missing.status,404);

  await expectUpgradeStatus(wsUrl,{protocol:null,status:426});
  await expectUpgradeStatus(wsUrl,{origin:'https://evil.example',protocol:MULTIPLAYER_SUBPROTOCOL,status:403});

  const socket=await openClient(wsUrl);assert.equal(socket.protocol,MULTIPLAYER_SUBPROTOCOL);
  const welcomePromise=nextJson(socket);socket.send(JSON.stringify(encodeClientHello()));const welcome=await welcomePromise;
  assert.deepEqual(welcome,{v:1,kind:'welcome',session:'test-session-1'});await waitUntil(()=>readyEvents.length===1,'server ready callback');assert.equal(readyEvents[0].session,'test-session-1');assert.equal(readyEvents[0].origin,ORIGIN);

  const control=encodePlayerControlFrame({side:.2,forward:.8,jump:false,sneak:false,sprint:true,primary:false},10),view=encodePlayerViewFrame({yaw:.4,pitch:-.2},11),action=encodePlayerActionFrame({kind:'use',viewSeq:11},12);
  const envelopes=[
    encodeClientInputEnvelope({session:welcome.session,packetSeq:0,kind:'control',payload:control}),
    encodeClientInputEnvelope({session:welcome.session,packetSeq:1,kind:'view',payload:view}),
    encodeClientInputEnvelope({session:welcome.session,packetSeq:2,kind:'action',payload:action})
  ];
  for(const envelope of envelopes)socket.send(JSON.stringify(envelope));await waitUntil(()=>inputs.length===3,'three authoritative input callbacks');
  assert.deepEqual(inputs.map(event=>[event.message.kind,event.message.packetSequence]),[['control',0],['view',1],['action',2]]);assert.equal(inputs[2].message.payload.viewSequence,11);

  const duplicateClose=nextClose(socket);socket.send(JSON.stringify(envelopes[2]));assert.equal((await duplicateClose).code,1008,'reliable stream duplicate packetSeq is a protocol/policy violation');

  const callbackFailure=await openClient(wsUrl);const callbackWelcomePromise=nextJson(callbackFailure);callbackFailure.send(JSON.stringify(encodeClientHello()));const callbackWelcome=await callbackWelcomePromise;
  const hotbar=encodePlayerActionFrame({kind:'hotbar-select',slot:2},13),callbackEnvelope=encodeClientInputEnvelope({session:callbackWelcome.session,packetSeq:0,kind:'action',payload:hotbar});
  const callbackClose=nextClose(callbackFailure);callbackFailure.send(JSON.stringify(callbackEnvelope));assert.equal((await callbackClose).code,1011,'application callback failures must close only the affected session');
  await waitUntil(()=>socketErrors.some(event=>event.error?.message==='intentional input handler failure'),'input handler error callback');

  const malformed=await openClient(wsUrl);const malformedClose=nextClose(malformed);malformed.send(JSON.stringify({v:1,kind:'hello',token:'secret'}));assert.equal((await malformedClose).code,1002);

  const binary=await openClient(wsUrl);const binaryClose=nextClose(binary);binary.send(Buffer.from([1,2,3]));assert.equal((await binaryClose).code,1003);

  const mismatch=await openClient(wsUrl);const mismatchWelcomePromise=nextJson(mismatch);mismatch.send(JSON.stringify(encodeClientHello()));const mismatchWelcome=await mismatchWelcomePromise;
  const mismatchClose=nextClose(mismatch);mismatch.send(JSON.stringify(encodeClientInputEnvelope({session:'other-session',packetSeq:0,kind:'view',payload:view})));assert.equal((await mismatchClose).code,1002);assert.notEqual(mismatchWelcome.session,'other-session');

  const idle=await openClient(wsUrl);const idleClose=await nextClose(idle);assert.equal(idleClose.code,SERVER_HELLO_TIMEOUT_CLOSE_CODE);assert.match(idleClose.reason,/hello timeout/);

  await waitUntil(()=>closeEvents.length>=6,'session close callbacks');
}finally{
  await server.close();
}

console.log('real Node websocket upgrade + hello/session/input gate integration: PASS');
