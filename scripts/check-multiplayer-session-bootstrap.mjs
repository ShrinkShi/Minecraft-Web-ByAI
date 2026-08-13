import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome,encodeServerReject} from '../src/multiplayer-handshake.js';
import {encodeServerWorldInfo} from '../src/server-world-info.js';
import {encodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {MultiplayerWebSocketClient} from '../src/websocket-client.js';
import {MULTIPLAYER_BOOTSTRAP_STATES,DEFAULT_WORLD_SYNC_TIMEOUT_MS,WORLD_SYNC_TIMEOUT_CLOSE_CODE,MultiplayerSessionBootstrap} from '../src/multiplayer-session-bootstrap.js';

class FakeSocket{
  constructor(url='wss://example.test/ws',protocol=MULTIPLAYER_SUBPROTOCOL){this.url=url;this.protocol=protocol;this.readyState=0;this.sent=[];this.closed=[];this.listeners=new Map();}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  emit(type,event={}){for(const listener of this.listeners.get(type)||[])listener(event);}
  open(){this.readyState=1;this.emit('open',{});}
  message(value){this.emit('message',{data:typeof value==='string'?value:JSON.stringify(value)});}
  send(value){this.sent.push(value);}
  close(code=1000,reason=''){this.closed.push({code,reason});this.readyState=3;this.emit('close',{code,reason});}
}
const worldInfo=session=>encodeServerWorldInfo({session,worldId:'world-main',terrainVersion:1,seed:'seed-1',prompt:'平原',tickRate:20});
const snapshot=(session,tick=0)=>encodeServerPlayerSnapshot({session,tick,position:{x:.5,y:25.001,z:.5},velocity:{x:0,y:0,z:0},yaw:0,pitch:0,mode:'survival',grounded:true,swimCoverage:0,voided:false});
const factoryFor=(socket,extra={})=>options=>new MultiplayerWebSocketClient({...options,...extra,socketFactory:()=>socket});

assert.deepEqual(MULTIPLAYER_BOOTSTRAP_STATES,['idle','connecting','handshaking','synchronizing','ready','failed','closed']);assert.equal(DEFAULT_WORLD_SYNC_TIMEOUT_MS,10000);assert.equal(WORLD_SYNC_TIMEOUT_CLOSE_CODE,4002);

const socket=new FakeSocket(),states=[],ready=[],infos=[],snapshots=[],errors=[];let timerFn=null,cleared=[];
const bootstrap=new MultiplayerSessionBootstrap({clientFactory:factoryFor(socket),worldSyncTimeoutMs:1000,setTimer:fn=>(timerFn=fn,91),clearTimer:id=>cleared.push(id),onStateChange:event=>states.push(event),onReady:data=>ready.push(data),onWorldInfo:info=>infos.push(info),onPlayerSnapshot:value=>snapshots.push(value),onError:error=>errors.push(error.message)});
assert.equal(bootstrap.state,'idle');assert.equal(bootstrap.connect('wss://example.test/ws'),'wss://example.test/ws');assert.equal(bootstrap.state,'connecting');socket.open();assert.equal(bootstrap.state,'handshaking');assert.equal(JSON.parse(socket.sent[0]).kind,'hello');socket.message(encodeServerWelcome('session-a'));assert.equal(bootstrap.state,'synchronizing');assert.equal(typeof timerFn,'function');
socket.message(worldInfo('session-a'));assert.equal(bootstrap.state,'synchronizing');assert.equal(infos.length,1);assert.equal(Object.isFrozen(infos[0]),true);socket.message(snapshot('session-a',0));assert.equal(bootstrap.state,'ready');assert.equal(ready.length,1);assert.equal(ready[0].worldInfo.worldId,'world-main');assert.equal(ready[0].initialSnapshot.tick,0);assert.equal(bootstrap.readyData.initialSnapshot.position.y,25.001);assert.equal(Object.isFrozen(bootstrap.readyData.initialSnapshot.position),true);assert.equal(cleared.includes(91),true);assert.equal(errors.length,0);
socket.message(snapshot('session-a',1));assert.equal(ready.length,1,'subsequent authoritative snapshots must not re-fire bootstrap ready');assert.equal(snapshots.length,2);assert.equal(bootstrap.latestSnapshot.tick,1);

const reverseSocket=new FakeSocket(),reverseReady=[];const reverse=new MultiplayerSessionBootstrap({clientFactory:factoryFor(reverseSocket),onReady:data=>reverseReady.push(data)});reverse.connect('wss://example.test/ws');reverseSocket.open();reverseSocket.message(encodeServerWelcome('reverse'));reverseSocket.message(snapshot('reverse',3));assert.equal(reverse.state,'synchronizing');reverseSocket.message(worldInfo('reverse'));assert.equal(reverse.state,'ready');assert.equal(reverseReady[0].initialSnapshot.tick,3,'bootstrap tolerates strict messages arriving in either post-welcome order');

const timeoutSocket=new FakeSocket();let timeoutCallback=null;const timeoutErrors=[];const timed=new MultiplayerSessionBootstrap({clientFactory:factoryFor(timeoutSocket),worldSyncTimeoutMs:1000,setTimer:fn=>(timeoutCallback=fn,5),clearTimer:()=>{},onError:error=>timeoutErrors.push(error.message)});timed.connect('wss://example.test/ws');timeoutSocket.open();timeoutSocket.message(encodeServerWelcome('timeout'));assert.equal(timed.state,'synchronizing');timeoutCallback();assert.equal(timed.state,'failed');assert.equal(timeoutSocket.closed.at(-1).code,WORLD_SYNC_TIMEOUT_CLOSE_CODE);assert.match(timeoutErrors.at(-1),/synchronization timed out/);assert.equal(timed.worldInfo,null);assert.equal(timed.readyData,null);

const rejectedSocket=new FakeSocket(),rejectErrors=[];const rejected=new MultiplayerSessionBootstrap({clientFactory:factoryFor(rejectedSocket),onError:error=>rejectErrors.push(error.message)});rejected.connect('wss://example.test/ws');rejectedSocket.open();rejectedSocket.message(encodeServerReject('server-full'));assert.equal(rejected.state,'failed');assert.match(rejectErrors.at(-1),/server-full/);

const protocolSocket=new FakeSocket(),protocolErrors=[];const protocol=new MultiplayerSessionBootstrap({clientFactory:factoryFor(protocolSocket),onError:error=>protocolErrors.push(error.message)});protocol.connect('wss://example.test/ws');protocolSocket.open();protocolSocket.message(encodeServerWelcome('protocol'));protocolSocket.message({...worldInfo('protocol'),terrainVersion:2});assert.equal(protocol.state,'failed');assert.match(protocolErrors.at(-1),/terrain generator version/);

const handlerSocket=new FakeSocket(),handlerErrors=[];const handler=new MultiplayerSessionBootstrap({clientFactory:factoryFor(handlerSocket),onReady:()=>{throw new Error('ready setup failed');},onError:error=>handlerErrors.push(error.message)});handler.connect('wss://example.test/ws');handlerSocket.open();handlerSocket.message(encodeServerWelcome('handler'));handlerSocket.message(worldInfo('handler'));handlerSocket.message(snapshot('handler'));assert.equal(handler.state,'failed');assert.equal(handlerSocket.closed.at(-1).code,1011);assert.match(handlerErrors.at(-1),/ready setup failed/);

const invalidSocket=new FakeSocket(),invalid=new MultiplayerSessionBootstrap({clientFactory:factoryFor(invalidSocket)});assert.throws(()=>invalid.connect('ws://example.test/ws'),/allowInsecure/);assert.equal(invalid.state,'failed');const localSocket=new FakeSocket(),local=new MultiplayerSessionBootstrap({allowInsecure:true,clientFactory:factoryFor(localSocket)});assert.equal(local.connect('ws://127.0.0.1:8080/ws'),'ws://127.0.0.1:8080/ws');local.close();assert.equal(local.state,'closed');assert.equal(localSocket.closed.at(-1).code,1000);assert.equal(local.worldInfo,null);

const reconnectSocketA=new FakeSocket(),reconnectSocketB=new FakeSocket();let factoryCount=0;const reconnect=new MultiplayerSessionBootstrap({clientFactory:options=>new MultiplayerWebSocketClient({...options,socketFactory:()=>factoryCount++===0?reconnectSocketA:reconnectSocketB})});reconnect.connect('wss://one.test/ws');reconnectSocketA.open();reconnect.close();assert.equal(reconnect.state,'closed');reconnect.connect('wss://two.test/ws');assert.equal(reconnect.state,'connecting');reconnectSocketB.open();reconnectSocketB.message(encodeServerWelcome('second'));reconnectSocketB.message(worldInfo('second'));reconnectSocketB.message(snapshot('second'));assert.equal(reconnect.state,'ready');assert.equal(reconnect.readyData.worldInfo.session,'second');

assert.throws(()=>new MultiplayerSessionBootstrap({clientFactory:null}),/clientFactory/);assert.throws(()=>new MultiplayerSessionBootstrap({worldSyncTimeoutMs:999}),/1000 to 60000/);assert.throws(()=>new MultiplayerSessionBootstrap({onReady:null}),/onReady/);assert.throws(()=>new MultiplayerSessionBootstrap({onWorldInfo:null}),/onWorldInfo/);assert.throws(()=>new MultiplayerSessionBootstrap({onPlayerSnapshot:null}),/onPlayerSnapshot/);assert.throws(()=>new MultiplayerSessionBootstrap({onError:null}),/onError/);
console.log('browser multiplayer world-info + authoritative snapshot bootstrap lifecycle: PASS');
