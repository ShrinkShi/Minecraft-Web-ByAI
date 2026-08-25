import assert from 'node:assert/strict';
import {MULTIPLAYER_SUBPROTOCOL,encodeServerWelcome,encodeServerReject} from '../src/multiplayer-handshake.js';
import {encodeServerInventorySnapshot} from '../src/server-inventory-snapshot.js';
import {encodeServerEquipmentSnapshot} from '../src/server-equipment-snapshot.js';
import {encodeServerPlayerCraftingSnapshot} from '../src/server-player-crafting-snapshot.js';
import {encodeServerWorldInfo} from '../src/server-world-info.js';
import {encodeServerPlayerSnapshot} from '../src/server-player-snapshot.js';
import {encodeWorldEditSync} from '../src/world-edit-replication.js';
import {TERRAIN_GENERATOR_VERSION} from '../src/terrain-generator.js';
import {MultiplayerWebSocketClient} from '../src/websocket-client.js';
import {MultiplayerSessionBootstrap,WORLD_SYNC_TIMEOUT_CLOSE_CODE} from '../src/multiplayer-session-bootstrap.js';

class FakeSocket{
  constructor(){this.protocol=MULTIPLAYER_SUBPROTOCOL;this.readyState=0;this.sent=[];this.closed=[];this.listeners=new Map();}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  emit(type,event={}){for(const listener of this.listeners.get(type)||[])listener(event);}
  open(){this.readyState=1;this.emit('open',{});}
  message(value){this.emit('message',{data:JSON.stringify(value)});}
  send(value){this.sent.push(value);}
  close(code=1000,reason=''){this.closed.push({code,reason});this.readyState=3;this.emit('close',{code,reason});}
}
const info=session=>encodeServerWorldInfo({session,worldId:'world-main',terrainVersion:TERRAIN_GENERATOR_VERSION,seed:'seed-1',prompt:'平原',tickRate:20});
const player=(session,tick=0,mode='survival')=>encodeServerPlayerSnapshot({session,tick,position:{x:.5,y:25.001,z:.5},velocity:{x:0,y:0,z:0},yaw:0,pitch:0,mode,flying:mode==='spectator',grounded:mode!=='spectator',swimCoverage:0,voided:false});
const inventory=(session,{revision=0,mode='survival',slots=Array(36).fill(null),cursor=null}={})=>encodeServerInventorySnapshot({session,revision,mode,slots,cursor});
const equipment=(session,{revision=0,slots={head:null,chest:null,legs:null,feet:null}}={})=>encodeServerEquipmentSnapshot({session,revision,slots});
const crafting=(session,{revision=0,slots=[null,null,null,null],result=null}={})=>encodeServerPlayerCraftingSnapshot({session,revision,size:2,slots,result});
const edits=(socket,session,revision=0)=>encodeWorldEditSync({session,worldId:'world-main',revision,edits:revision?[{x:1,y:2,z:3,id:3}]:[]}).forEach(message=>socket.message(message));
const factory=socket=>options=>new MultiplayerWebSocketClient({...options,socketFactory:()=>socket});

const socket=new FakeSocket(),ready=[],errors=[];let timeoutCallback=null;
const bootstrap=new MultiplayerSessionBootstrap({clientFactory:factory(socket),worldSyncTimeoutMs:1000,setTimer:fn=>(timeoutCallback=fn,1),clearTimer:()=>{},onReady:value=>ready.push(value),onError:error=>errors.push(error.message)});
bootstrap.connect('wss://example.test/ws');socket.open();socket.message(encodeServerWelcome('s:a'));socket.message(info('s:a'));socket.message(player('s:a'));socket.message(inventory('s:a',{revision:7}));socket.message(equipment('s:a',{revision:3}));
assert.equal(bootstrap.state,'synchronizing');assert.equal(ready.length,0,'world-info + player + inventory + equipment must not bypass crafting/edit snapshot barriers');socket.message(crafting('s:a',{revision:2}));assert.equal(ready.length,0,'player crafting snapshot must not bypass the edit snapshot barrier');
edits(socket,'s:a',4);assert.equal(bootstrap.state,'ready');assert.equal(ready.length,1);assert.equal(ready[0].worldEdits.revision,4);assert.equal(ready[0].worldEdits.edits['1,2,3'],3);assert.equal(ready[0].initialSnapshot.tick,0);assert.equal(ready[0].initialSnapshot.flying,false);assert.equal(ready[0].inventorySnapshot.revision,7);assert.equal(ready[0].inventorySnapshot.slots.length,36);assert.equal(ready[0].equipmentSnapshot.revision,3);assert.deepEqual(ready[0].equipmentSnapshot.slots,{head:null,chest:null,legs:null,feet:null});assert.equal(ready[0].playerCraftingSnapshot.revision,2);assert.deepEqual(ready[0].playerCraftingSnapshot.slots,[null,null,null,null]);assert.equal(errors.length,0);
socket.message(player('s:a',1));assert.equal(ready.length,1);assert.equal(bootstrap.latestSnapshot.tick,1);assert.equal(bootstrap.latestSnapshot.flying,false);

const reverseSocket=new FakeSocket(),reverseReady=[];const reverse=new MultiplayerSessionBootstrap({clientFactory:factory(reverseSocket),onReady:value=>reverseReady.push(value)});reverse.connect('wss://example.test/ws');reverseSocket.open();reverseSocket.message(encodeServerWelcome('s:reverse'));reverseSocket.message(crafting('s:reverse'));reverseSocket.message(equipment('s:reverse'));reverseSocket.message(inventory('s:reverse'));reverseSocket.message(player('s:reverse',3));reverseSocket.message(info('s:reverse'));assert.equal(reverse.state,'synchronizing');edits(reverseSocket,'s:reverse');assert.equal(reverse.state,'ready');assert.equal(reverseReady[0].initialSnapshot.tick,3);

const missingInventorySocket=new FakeSocket(),missingInventoryReady=[];const missingInventory=new MultiplayerSessionBootstrap({clientFactory:factory(missingInventorySocket),onReady:value=>missingInventoryReady.push(value)});missingInventory.connect('wss://example.test/ws');missingInventorySocket.open();missingInventorySocket.message(encodeServerWelcome('s:no-inventory'));missingInventorySocket.message(info('s:no-inventory'));edits(missingInventorySocket,'s:no-inventory');missingInventorySocket.message(equipment('s:no-inventory'));missingInventorySocket.message(crafting('s:no-inventory'));missingInventorySocket.message(player('s:no-inventory'));assert.equal(missingInventory.state,'synchronizing');assert.equal(missingInventoryReady.length,0,'bootstrap must not become ready without server-owned inventory');

const missingEquipmentSocket=new FakeSocket(),missingEquipmentReady=[];const missingEquipment=new MultiplayerSessionBootstrap({clientFactory:factory(missingEquipmentSocket),onReady:value=>missingEquipmentReady.push(value)});missingEquipment.connect('wss://example.test/ws');missingEquipmentSocket.open();missingEquipmentSocket.message(encodeServerWelcome('s:no-equipment'));missingEquipmentSocket.message(info('s:no-equipment'));edits(missingEquipmentSocket,'s:no-equipment');missingEquipmentSocket.message(inventory('s:no-equipment'));missingEquipmentSocket.message(crafting('s:no-equipment'));missingEquipmentSocket.message(player('s:no-equipment'));assert.equal(missingEquipment.state,'synchronizing');assert.equal(missingEquipmentReady.length,0,'bootstrap must not become ready without server-owned equipment');

const missingCraftingSocket=new FakeSocket(),missingCraftingReady=[];const missingCrafting=new MultiplayerSessionBootstrap({clientFactory:factory(missingCraftingSocket),onReady:value=>missingCraftingReady.push(value)});missingCrafting.connect('wss://example.test/ws');missingCraftingSocket.open();missingCraftingSocket.message(encodeServerWelcome('s:no-crafting'));missingCraftingSocket.message(info('s:no-crafting'));edits(missingCraftingSocket,'s:no-crafting');missingCraftingSocket.message(inventory('s:no-crafting'));missingCraftingSocket.message(equipment('s:no-crafting'));missingCraftingSocket.message(player('s:no-crafting'));assert.equal(missingCrafting.state,'synchronizing');assert.equal(missingCraftingReady.length,0,'bootstrap must not become ready without server-owned player crafting');

const mismatchSocket=new FakeSocket(),mismatchErrors=[];const mismatch=new MultiplayerSessionBootstrap({clientFactory:factory(mismatchSocket),onError:error=>mismatchErrors.push(error.message)});mismatch.connect('wss://example.test/ws');mismatchSocket.open();mismatchSocket.message(encodeServerWelcome('s:mismatch'));mismatchSocket.message(info('s:mismatch'));edits(mismatchSocket,'s:mismatch');mismatchSocket.message(inventory('s:mismatch',{mode:'creative'}));mismatchSocket.message(equipment('s:mismatch'));mismatchSocket.message(crafting('s:mismatch'));mismatchSocket.message(player('s:mismatch',0,'survival'));assert.equal(mismatch.state,'failed');assert.match(mismatchErrors.at(-1),/mode bootstrap mismatch/);

const timedSocket=new FakeSocket(),timedErrors=[];let timedCallback=null;const timed=new MultiplayerSessionBootstrap({clientFactory:factory(timedSocket),worldSyncTimeoutMs:1000,setTimer:fn=>(timedCallback=fn,2),clearTimer:()=>{},onError:error=>timedErrors.push(error.message)});timed.connect('wss://example.test/ws');timedSocket.open();timedSocket.message(encodeServerWelcome('s:timeout'));timedSocket.message(info('s:timeout'));timedSocket.message(player('s:timeout'));timedCallback();assert.equal(timed.state,'failed');assert.equal(timedSocket.closed.at(-1).code,WORLD_SYNC_TIMEOUT_CLOSE_CODE);assert.match(timedErrors.at(-1),/synchronization timed out/);

const rejectedSocket=new FakeSocket(),rejectedErrors=[];const rejected=new MultiplayerSessionBootstrap({clientFactory:factory(rejectedSocket),onError:error=>rejectedErrors.push(error.message)});rejected.connect('wss://example.test/ws');rejectedSocket.open();rejectedSocket.message(encodeServerReject('server-full'));assert.equal(rejected.state,'failed');assert.match(rejectedErrors.at(-1),/server-full/);

const handlerSocket=new FakeSocket(),handlerErrors=[];const handler=new MultiplayerSessionBootstrap({clientFactory:factory(handlerSocket),onReady:()=>{throw new Error('ready setup failed');},onError:error=>handlerErrors.push(error.message)});handler.connect('wss://example.test/ws');handlerSocket.open();handlerSocket.message(encodeServerWelcome('s:handler'));handlerSocket.message(info('s:handler'));edits(handlerSocket,'s:handler');handlerSocket.message(inventory('s:handler'));handlerSocket.message(equipment('s:handler'));handlerSocket.message(crafting('s:handler'));handlerSocket.message(player('s:handler'));assert.equal(handler.state,'failed');assert.equal(handlerSocket.closed.at(-1).code,1011);assert.match(handlerErrors.at(-1),/ready setup failed/);

assert.equal(typeof timeoutCallback,'function');assert.throws(()=>new MultiplayerSessionBootstrap({worldSyncTimeoutMs:999}),/1000 to 60000/);assert.throws(()=>new MultiplayerSessionBootstrap({onReady:null}),/onReady/);
console.log('multiplayer bootstrap requires terrain-v3 world-info + initial edits + inventory + equipment + player crafting + authoritative player snapshot v2: PASS');