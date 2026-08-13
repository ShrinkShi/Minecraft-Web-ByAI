import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome,encodeServerReject} from '../src/multiplayer-handshake.js';
import {encodeServerWorldInfo} from '../src/server-world-info.js';
import {encodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {MultiplayerWebSocketClient} from '../src/websocket-client.js';
import {MultiplayerMovementSession,MULTIPLAYER_MOVEMENT_STATES} from '../src/multiplayer-movement-session.js';

class FakeSocket{
  constructor(url='wss://example.test/ws',protocol=MULTIPLAYER_SUBPROTOCOL){this.url=url;this.protocol=protocol;this.readyState=0;this.sent=[];this.closed=[];this.listeners=new Map();}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  emit(type,event={}){for(const listener of this.listeners.get(type)||[])listener(event);}
  open(){this.readyState=1;this.emit('open',{});}
  message(value){this.emit('message',{data:typeof value==='string'?value:JSON.stringify(value)});}
  send(value){this.sent.push(value);}
  close(code=1000,reason=''){this.closed.push({code,reason});this.readyState=3;this.emit('close',{code,reason});}
}

const info=session=>encodeServerWorldInfo({session,worldId:'movement-world',terrainVersion:1,seed:'movement-seed',prompt:'平原',tickRate:20});
const snapshot=(session,tick,overrides={})=>encodeServerPlayerSnapshot({session,tick,position:{x:.5,y:25.001,z:.5},velocity:{x:0,y:0,z:0},yaw:0,pitch:0,mode:'survival',grounded:true,swimCoverage:0,voided:false,...overrides});
const clientFactoryFor=socket=>options=>new MultiplayerWebSocketClient({...options,socketFactory:()=>socket});
const parseSent=socket=>socket.sent.map(value=>JSON.parse(value));
const near=(actual,expected,epsilon=1e-9,label='value')=>assert.ok(Math.abs(actual-expected)<=epsilon,`${label}: expected ${expected}, got ${actual}`);

assert.deepEqual(MULTIPLAYER_MOVEMENT_STATES,['idle','connecting','handshaking','synchronizing','ready','failed','closed']);
const socket=new FakeSocket(),states=[],readyEvents=[],snapshotEvents=[],errors=[];
const movement=new MultiplayerMovementSession({bootstrapOptions:{clientFactory:clientFactoryFor(socket)},onStateChange:event=>states.push(event),onReady:event=>readyEvents.push(event),onSnapshot:event=>snapshotEvents.push(event),onError:error=>errors.push(error.message)});
assert.equal(movement.state,'idle');assert.equal(movement.ready,false);assert.equal(movement.current(),null);assert.deepEqual(movement.flush(),{view:null,control:null});assert.equal(movement.connect('wss://example.test/ws'),'wss://example.test/ws');assert.equal(movement.state,'connecting');
socket.open();assert.equal(movement.state,'handshaking');assert.equal(parseSent(socket)[0].kind,'hello');socket.message(encodeServerWelcome('move-session'));assert.equal(movement.state,'synchronizing');socket.message(info('move-session'));assert.equal(movement.state,'synchronizing');socket.message(snapshot('move-session',0));
assert.equal(movement.state,'ready');assert.equal(movement.ready,true);assert.equal(readyEvents.length,1);assert.equal(readyEvents[0].worldInfo.worldId,'movement-world');assert.equal(readyEvents[0].initialSnapshot.tick,0);assert.deepEqual(movement.current().position,{x:.5,y:25.001,z:.5});assert.equal(snapshotEvents.length,0,'initial snapshot is surfaced through onReady, not duplicated through onSnapshot');assert.equal(errors.length,0);
let sent=parseSent(socket);assert.equal(sent.length,3,'hello plus initial view/control flush');assert.equal(sent[1].kind,'view');assert.equal(sent[1].payload.seq,0);assert.equal(sent[2].kind,'control');assert.equal(sent[2].payload.seq,0);

assert.equal(movement.setView({yaw:Math.PI/2,pitch:0}),true);assert.equal(movement.setControl({side:0,forward:1,jump:false,sneak:false,sprint:false,primary:false}),true);const flushed=movement.flush();assert.equal(flushed.view.frame.seq,1);assert.equal(flushed.control.seq,1);sent=parseSent(socket);assert.equal(sent.at(-2).kind,'view');assert.equal(sent.at(-1).kind,'control');const countAfterChange=sent.length;movement.flush();assert.equal(socket.sent.length,countAfterChange,'unchanged control/view must not emit duplicate packets');
const hotbar=movement.sendHotbarSelect(4);assert.equal(hotbar.kind,'hotbar-select');assert.equal(parseSent(socket).at(-1).kind,'action');

socket.message(snapshot('move-session',1,{position:{x:.285,y:25.001,z:.5},velocity:{x:-4.3,y:0,z:0},yaw:Math.PI/2}));assert.equal(snapshotEvents.length,1);assert.equal(snapshotEvents[0].result.reason,'interpolating');let display=movement.step(.025);near(display.position.x,.3925,1e-12,'half-tick authoritative movement x');near(display.velocity.x,-2.15,1e-12,'half-tick authoritative velocity');display=movement.step(.025);near(display.position.x,.285,1e-12,'full-tick authoritative movement x');const isolated=movement.current();isolated.position.x=999;assert.notEqual(movement.current().position.x,999);

movement.close(1000,'test complete');assert.equal(movement.state,'closed');assert.equal(movement.ready,false);assert.equal(movement.current(),null);assert.equal(socket.closed.at(-1).code,1000);

const explicitSocket=new FakeSocket(),explicit=new MultiplayerMovementSession({bootstrapOptions:{clientFactory:clientFactoryFor(explicitSocket)}});explicit.connect('wss://example.test/ws');explicit.setView({yaw:.75,pitch:-.2});explicit.setControl({side:1,forward:0,jump:false,sneak:false,sprint:false,primary:false});explicitSocket.open();explicitSocket.message(encodeServerWelcome('explicit-session'));explicitSocket.message(info('explicit-session'));explicitSocket.message(snapshot('explicit-session',0,{yaw:-1,pitch:.1}));const explicitSent=parseSent(explicitSocket);assert.equal(explicitSent[1].kind,'view');near(explicitSent[1].payload.yaw,.75,1e-12,'explicit pre-ready view preserved');near(explicitSent[1].payload.pitch,-.2,1e-12,'explicit pre-ready pitch preserved');assert.equal(explicitSent[2].payload.side,1);explicit.close();

const rejectedSocket=new FakeSocket(),rejectedErrors=[],rejected=new MultiplayerMovementSession({bootstrapOptions:{clientFactory:clientFactoryFor(rejectedSocket)},onError:error=>rejectedErrors.push(error.message)});rejected.connect('wss://example.test/ws');rejectedSocket.open();rejectedSocket.message(encodeServerReject('server-full'));assert.equal(rejected.state,'failed');assert.match(rejectedErrors.at(-1),/server-full/);

const insecureSocket=new FakeSocket(),insecure=new MultiplayerMovementSession({allowInsecure:true,bootstrapOptions:{clientFactory:clientFactoryFor(insecureSocket)}});assert.equal(insecure.connect('ws://127.0.0.1:8080/ws'),'ws://127.0.0.1:8080/ws');insecure.close();const secureOnlySocket=new FakeSocket(),secureOnly=new MultiplayerMovementSession({bootstrapOptions:{clientFactory:clientFactoryFor(secureOnlySocket)}});assert.throws(()=>secureOnly.connect('ws://127.0.0.1:8080/ws'),/allowInsecure/);assert.equal(secureOnly.state,'failed');

assert.throws(()=>new MultiplayerMovementSession({bootstrapOptions:[]}),/bootstrapOptions/);assert.throws(()=>new MultiplayerMovementSession({bootstrapFactory:null}),/bootstrapFactory/);assert.throws(()=>new MultiplayerMovementSession({bridgeFactory:null}),/bridgeFactory/);assert.throws(()=>new MultiplayerMovementSession({interpolatorFactory:null}),/interpolatorFactory/);assert.throws(()=>new MultiplayerMovementSession({onReady:null}),/onReady/);assert.throws(()=>new MultiplayerMovementSession().setView({yaw:0,pitch:99}),/pitch/);

console.log('composed browser multiplayer bootstrap + input bridge + authoritative interpolation: PASS');
