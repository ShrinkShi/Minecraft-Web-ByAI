import assert from 'node:assert/strict';
import {encodePlayerControlFrame} from '../src/player-control-frame.js';
import {encodePlayerViewFrame} from '../src/player-view-frame.js';
import {encodePlayerActionFrame} from '../src/player-action-frame.js';
import {
  MULTIPLAYER_HANDSHAKE_VERSION,
  MULTIPLAYER_SUBPROTOCOL,
  SERVER_REJECT_CODES,
  encodeClientHello,
  decodeClientHello,
  encodeServerWelcome,
  encodeServerReject,
  decodeServerHandshake,
  isCompatibleServerHandshake
} from '../src/multiplayer-handshake.js';
import {
  WEBSOCKET_CLIENT_STATES,
  DEFAULT_HANDSHAKE_TIMEOUT_MS,
  HANDSHAKE_TIMEOUT_CLOSE_CODE,
  normalizeWebSocketUrl,
  MultiplayerWebSocketClient
} from '../src/websocket-client.js';

class FakeSocket{
  constructor(url,protocol=MULTIPLAYER_SUBPROTOCOL){this.url=url;this.protocol=protocol;this.readyState=0;this.sent=[];this.closed=[];this.listeners=new Map();}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  emit(type,event={}){for(const listener of this.listeners.get(type)||[])listener(event);}
  open(){this.readyState=1;this.emit('open',{});}
  message(value){this.emit('message',{data:typeof value==='string'?value:JSON.stringify(value)});}
  send(value){this.sent.push(value);}
  close(code=1000,reason=''){this.closed.push({code,reason});this.readyState=3;this.emit('close',{code,reason});}
}

assert.equal(MULTIPLAYER_HANDSHAKE_VERSION,1);assert.equal(MULTIPLAYER_SUBPROTOCOL,'minecraft-web-v1');assert.ok(SERVER_REJECT_CODES.includes('protocol-mismatch'));
assert.deepEqual(encodeClientHello(),{v:1,kind:'hello'});assert.deepEqual(decodeClientHello({v:1,kind:'hello'}),{version:1,kind:'hello'});
assert.deepEqual(encodeServerWelcome('session-1'),{v:1,kind:'welcome',session:'session-1'});assert.deepEqual(encodeServerReject('server-full'),{v:1,kind:'reject',code:'server-full'});
assert.deepEqual(decodeServerHandshake({v:1,kind:'welcome',session:'session-1'}),{version:1,kind:'welcome',session:'session-1'});
assert.deepEqual(decodeServerHandshake({v:1,kind:'reject',code:'policy'}),{version:1,kind:'reject',code:'policy'});
assert.equal(isCompatibleServerHandshake({v:1,kind:'welcome',session:'ok'}),true);assert.equal(isCompatibleServerHandshake({v:2,kind:'welcome',session:'ok'}),false);
assert.throws(()=>decodeClientHello({v:1,kind:'hello',token:'secret'}),/unexpected fields/);assert.throws(()=>decodeServerHandshake({v:1,kind:'welcome',session:'ok',device:'mobile'}),/unexpected fields/);assert.throws(()=>encodeServerReject('database-error'),/unsupported server reject code/);

assert.equal(normalizeWebSocketUrl('wss://example.com/game'),'wss://example.com/game');
assert.equal(normalizeWebSocketUrl('ws://127.0.0.1:8080/socket',{allowInsecure:true}),'ws://127.0.0.1:8080/socket');
assert.throws(()=>normalizeWebSocketUrl('ws://127.0.0.1:8080/socket'),/allowInsecure/);assert.throws(()=>normalizeWebSocketUrl('https://example.com/socket'),/ws:\/\/ or wss:\/\//);assert.throws(()=>normalizeWebSocketUrl('wss://user:pass@example.com/socket'),/embedded credentials/);assert.throws(()=>normalizeWebSocketUrl('relative/socket'),/absolute URL/);
assert.deepEqual(WEBSOCKET_CLIENT_STATES,['idle','connecting','handshaking','ready','rejected','closed','error']);assert.equal(DEFAULT_HANDSHAKE_TIMEOUT_MS,5000);assert.equal(HANDSHAKE_TIMEOUT_CLOSE_CODE,4000);

const states=[],protocolErrors=[],created=[];
const client=new MultiplayerWebSocketClient({
  socketFactory:(url,protocol)=>{const socket=new FakeSocket(url,protocol);created.push(socket);return socket;},
  onStateChange:event=>states.push(event),onProtocolError:error=>protocolErrors.push(error.message)
});
assert.equal(client.state,'idle');assert.equal(client.connect('wss://example.com/socket'),'wss://example.com/socket');assert.equal(client.state,'connecting');assert.equal(created[0].url,'wss://example.com/socket');assert.equal(created[0].protocol,MULTIPLAYER_SUBPROTOCOL);
assert.throws(()=>client.connect('wss://example.com/second'),/cannot connect/);
const socket=created[0];socket.open();assert.equal(client.state,'handshaking');assert.deepEqual(JSON.parse(socket.sent[0]),{v:1,kind:'hello'});assert.throws(()=>client.sendInput('view',{}),/not ready/);
socket.message(encodeServerWelcome('world-session_7'));assert.equal(client.state,'ready');assert.equal(client.session,'world-session_7');assert.equal(client.packetSeq,0);

const control=encodePlayerControlFrame({side:0,forward:1,jump:false,sneak:false,sprint:true,primary:false},31),view=encodePlayerViewFrame({yaw:.5,pitch:-.2},32),action=encodePlayerActionFrame({kind:'use',viewSeq:32},33);
const controlEnvelope=client.sendInput('control',control);const viewEnvelope=client.sendInput('view',view);const actionEnvelope=client.sendInput('action',action);
assert.equal(controlEnvelope.packetSeq,0);assert.equal(viewEnvelope.packetSeq,1);assert.equal(actionEnvelope.packetSeq,2);assert.equal(client.packetSeq,3);assert.equal(controlEnvelope.session,'world-session_7');assert.equal(JSON.parse(socket.sent.at(-1)).kind,'action');

socket.message(encodeServerWelcome('unexpected-second-welcome'));assert.equal(client.state,'error');assert.equal(socket.closed.at(-1).code,1002);assert.match(protocolErrors.at(-1),/unexpected server message/);

const rejectStates=[],rejectSocket=new FakeSocket('wss://example.com',MULTIPLAYER_SUBPROTOCOL),rejectClient=new MultiplayerWebSocketClient({socketFactory:()=>rejectSocket,onStateChange:event=>rejectStates.push(event)});
rejectClient.connect('wss://example.com');rejectSocket.open();rejectSocket.message(encodeServerReject('server-full'));assert.equal(rejectClient.state,'rejected');assert.equal(rejectClient.session,null);assert.equal(rejectSocket.closed.at(-1).code,1000);assert.equal(rejectStates.at(-1).detail,'server-full');

const badErrors=[],badSocket=new FakeSocket('wss://example.com',MULTIPLAYER_SUBPROTOCOL),badClient=new MultiplayerWebSocketClient({socketFactory:()=>badSocket,onProtocolError:error=>badErrors.push(error.message)});
badClient.connect('wss://example.com');badSocket.open();badSocket.message('{not-json');assert.equal(badClient.state,'error');assert.equal(badSocket.closed.at(-1).code,1002);assert.match(badErrors.at(-1),/valid JSON/);

const protocolSocket=new FakeSocket('wss://example.com',''),protocolClient=new MultiplayerWebSocketClient({socketFactory:()=>protocolSocket});protocolClient.connect('wss://example.com');protocolSocket.open();assert.equal(protocolClient.state,'error');assert.equal(protocolSocket.closed.at(-1).code,1002);

let timeoutFn=null,cleared=[];const timeoutSocket=new FakeSocket('wss://example.com',MULTIPLAYER_SUBPROTOCOL),timeoutErrors=[];
const timeoutClient=new MultiplayerWebSocketClient({socketFactory:()=>timeoutSocket,handshakeTimeoutMs:250,setTimer:fn=>(timeoutFn=fn,77),clearTimer:id=>cleared.push(id),onProtocolError:error=>timeoutErrors.push(error.message)});
timeoutClient.connect('wss://example.com');timeoutSocket.open();assert.equal(typeof timeoutFn,'function');timeoutFn();assert.equal(timeoutClient.state,'error');assert.equal(timeoutSocket.closed.at(-1).code,HANDSHAKE_TIMEOUT_CLOSE_CODE);assert.match(timeoutErrors.at(-1),/timed out/);

const closeSocket=new FakeSocket('wss://example.com',MULTIPLAYER_SUBPROTOCOL),closeClient=new MultiplayerWebSocketClient({socketFactory:()=>closeSocket});closeClient.connect('wss://example.com');closeSocket.open();closeSocket.message(encodeServerWelcome('close-session'));closeClient.close();assert.equal(closeClient.state,'closed');assert.equal(closeClient.session,null);assert.equal(closeSocket.closed.at(-1).code,1000);

assert.throws(()=>new MultiplayerWebSocketClient({socketFactory:null}),/socketFactory/);assert.throws(()=>new MultiplayerWebSocketClient({socketFactory:()=>new FakeSocket('x'),handshakeTimeoutMs:100}),/250 to 60000/);
console.log('strict websocket hello/welcome + ready-state input transport contracts: PASS');
