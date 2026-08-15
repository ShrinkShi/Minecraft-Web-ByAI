import assert from 'node:assert/strict';
import {MultiplayerInputBridge} from '../src/multiplayer-input-bridge.js';

class FakeTransport{
  constructor(){this.state='connecting';this.sent=[];this.fail=false;}
  sendInput(kind,payload){if(this.fail)throw new Error('transport failed');this.sent.push({kind,payload});return payload;}
}
const control=(overrides={})=>({side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false,...overrides});
let currentView={yaw:0,pitch:0};const transport=new FakeTransport(),bridge=new MultiplayerInputBridge({transport,viewProvider:()=>currentView});

bridge.prime(control({forward:1}),currentView);assert.deepEqual(bridge.flush(),{view:null,control:null},'pending state is retained while transport is not ready');assert.equal(transport.sent.length,0);
transport.state='ready';let result=bridge.flush();assert.equal(transport.sent.length,2);assert.deepEqual(transport.sent.map(value=>value.kind),['view','control'],'network tick flushes absolute view before control');assert.equal(transport.sent[0].payload.seq,0);assert.equal(transport.sent[1].payload.seq,0);assert.equal(transport.sent[1].payload.move[1],1);assert.equal(result.view.sequence,0);assert.equal(result.view.reused,false);

result=bridge.flush();assert.equal(transport.sent.length,2,'unchanged control/view do not produce duplicate packets');assert.equal(result.view.reused,true);assert.equal(result.control,null);
bridge.setControl(control({forward:1,sprint:true}));bridge.flush();assert.equal(transport.sent.length,3);assert.equal(transport.sent[2].kind,'control');assert.equal(transport.sent[2].payload.seq,1);assert.equal(transport.sent[2].payload.buttons&4,4);

bridge.setView({yaw:.1,pitch:.01});bridge.setView({yaw:.2,pitch:.02});bridge.setView({yaw:.3,pitch:.03});bridge.flush();assert.equal(transport.sent.length,4,'multiple mouse/look updates coalesce to one absolute view packet');assert.equal(transport.sent[3].kind,'view');assert.equal(transport.sent[3].payload.seq,1);assert.ok(Math.abs(transport.sent[3].payload.yaw-.3)<1e-12);assert.equal(transport.sent[3].payload.pitch,.03);

let action=bridge.sendUse({yaw:.3,pitch:.03});assert.equal(transport.sent.length,5,'use reuses already-sent unchanged view instead of emitting a redundant view');assert.equal(transport.sent[4].kind,'action');assert.equal(action.frame.seq,0);assert.equal(action.frame.kind,'use');assert.equal(action.frame.viewSeq,1);assert.equal(action.view.reused,true);

action=bridge.sendUse({yaw:Math.PI*2+.4,pitch:.04});assert.equal(transport.sent.length,7,'changed view is flushed immediately before a view-dependent action');assert.deepEqual(transport.sent.slice(-2).map(value=>value.kind),['view','action']);assert.equal(transport.sent.at(-2).payload.seq,2);assert.ok(Math.abs(transport.sent.at(-2).payload.yaw-.4)<1e-12,'pending views are canonicalized before coalescing');assert.equal(transport.sent.at(-1).payload.seq,1);assert.equal(transport.sent.at(-1).payload.viewSeq,2);

action=bridge.sendDrop({yaw:.4,pitch:.04});assert.equal(transport.sent.at(-1).payload.kind,'drop');assert.equal(transport.sent.at(-1).payload.seq,2);assert.equal(transport.sent.at(-1).payload.viewSeq,2);assert.equal(action.view.reused,true);
const hotbar=bridge.sendHotbarSelect(7);assert.equal(hotbar.seq,3);assert.equal(hotbar.kind,'hotbar-select');assert.equal(hotbar.slot,7);assert.equal(transport.sent.at(-1).kind,'action');

bridge.setView({yaw:Math.PI*2+.4,pitch:.04});bridge.flush();assert.equal(transport.sent.length,9,'equivalent canonical yaw does not send a redundant view');
transport.state='connecting';bridge.setControl(control({side:1}));assert.equal(bridge.sendUse(),null);assert.equal(bridge.sendHotbarSelect(1),null);assert.equal(transport.sent.length,9);transport.state='ready';bridge.flush();assert.equal(transport.sent.at(-1).kind,'control');assert.equal(transport.sent.at(-1).payload.move[0],1);

bridge.controlSeq=0xffffffff;bridge.setControl(control({side:-1}));bridge.flushControl();assert.equal(transport.sent.at(-1).payload.seq,0xffffffff);assert.equal(bridge.controlSeq,0,'control sequence wraps uint32');bridge.viewSeq=0xffffffff;bridge.setView({yaw:.8,pitch:0});const wrapView=bridge.flushView();assert.equal(wrapView.frame.seq,0xffffffff);assert.equal(bridge.viewSeq,0);bridge.actionSeq=0xffffffff;const wrapAction=bridge.sendHotbarSelect(0);assert.equal(wrapAction.seq,0xffffffff);assert.equal(bridge.actionSeq,0);

transport.fail=true;bridge.setControl(control({forward:-1}));const beforeSeq=bridge.controlSeq;assert.throws(()=>bridge.flushControl(),/transport failed/);assert.equal(bridge.controlSeq,beforeSeq,'failed transport send does not consume semantic sequence');transport.fail=false;bridge.flushControl();assert.equal(bridge.controlSeq,(beforeSeq+1)>>>0);

bridge.reset();assert.equal(bridge.controlSeq,0);assert.equal(bridge.viewSeq,0);assert.equal(bridge.actionSeq,0);assert.equal(bridge.lastSentViewSequence,null);assert.equal(bridge.flushControl(),null);
assert.throws(()=>new MultiplayerInputBridge({transport:null,viewProvider:()=>currentView}),/transport/);assert.throws(()=>new MultiplayerInputBridge({transport:{},viewProvider:()=>currentView}),/sendInput/);assert.throws(()=>new MultiplayerInputBridge({transport,viewProvider:null}),/viewProvider/);assert.throws(()=>bridge.setView({yaw:0,pitch:2}),/pitch is out of range/);assert.throws(()=>bridge.sendReferencedAction('inventory'),/use, drop, or attack/);transport.state='ready';assert.throws(()=>bridge.sendHotbarSelect(9),/0 to 8/);

console.log('coalesced runtime multiplayer control/view/action bridge: PASS');
