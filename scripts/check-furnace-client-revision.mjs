import assert from 'node:assert/strict';
import {LiveWorldWebSocketClient} from '../src/live-world-websocket-client.js';
import {NETWORK_SEQUENCE_MAX} from '../src/network-sequence.js';
import {encodeServerFurnaceContainerSnapshot} from '../src/server-furnace-container-snapshot.js';

const session='s:furnace-revision',target={x:1,y:64,z:2},errors=[];
const client=new LiveWorldWebSocketClient({onProtocolError:error=>errors.push(error)});
client.state='ready';client.session=session;
const snapshot=(revision,{burnRemaining=100,burnTotal=300,cookProgress=1,cookTotal=200}={})=>encodeServerFurnaceContainerSnapshot({session,target,revision,slots:[{id:'raw_iron',count:1},{id:'block:5',count:1},null],burnRemaining,burnTotal,cookProgress,cookTotal,storedExperience:0,lit:burnRemaining>0});

client.handleFurnaceSnapshot(snapshot(NETWORK_SEQUENCE_MAX,{cookProgress:10}));
assert.equal(client.state,'ready');assert.equal(client.furnaceSnapshot.revision,NETWORK_SEQUENCE_MAX);assert.equal(client.furnaceSnapshot.cookProgress,10);

client.handleFurnaceSnapshot(snapshot(NETWORK_SEQUENCE_MAX,{burnRemaining:99,cookProgress:11}));
assert.equal(client.state,'ready','timer-only same-revision snapshots must remain valid');assert.equal(client.furnaceSnapshot.revision,NETWORK_SEQUENCE_MAX);assert.equal(client.furnaceSnapshot.cookProgress,11);assert.equal(errors.length,0);

client.handleFurnaceSnapshot(snapshot(0,{burnRemaining:98,cookProgress:12}));
assert.equal(client.state,'ready','uint32 revision wrap from 0xffffffff to 0 must be accepted');assert.equal(client.furnaceSnapshot.revision,0);assert.equal(client.furnaceSnapshot.cookProgress,12);assert.equal(errors.length,0);

client.handleFurnaceSnapshot(snapshot(NETWORK_SEQUENCE_MAX,{burnRemaining:97,cookProgress:13}));
assert.equal(client.state,'error','a pre-wrap revision received after wrap must still be rejected as stale');assert.equal(client.furnaceSnapshot,null);assert.equal(client.session,null);assert.equal(errors.length,1);assert.match(errors[0].message,/stale furnace container revision/);

console.log('furnace client accepts same-revision timers + uint32 wrap and rejects post-wrap stale packets: PASS');
