import {normalizeControlState} from './control-intents.js';
import {encodePlayerControlFrame} from './player-control-frame.js';
import {encodePlayerViewFrame,normalizePlayerYaw,PLAYER_VIEW_MAX_PITCH} from './player-view-frame.js';
import {encodePlayerActionFrame} from './player-action-frame.js';
import {nextNetworkSequence} from './network-sequence.js';

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function sameControl(a,b){return !!a&&!!b&&a.side===b.side&&a.forward===b.forward&&a.jump===b.jump&&a.sneak===b.sneak&&a.sprint===b.sprint&&a.primary===b.primary;}
function sameView(a,b){return !!a&&!!b&&a.yaw===b.yaw&&a.pitch===b.pitch;}
function viewState(value){value=object(value,'player view');const pitch=finite(value.pitch,'player view pitch');if(pitch<-PLAYER_VIEW_MAX_PITCH||pitch>PLAYER_VIEW_MAX_PITCH)throw new RangeError('player view pitch is out of range');return{yaw:normalizePlayerYaw(value.yaw),pitch};}

export class MultiplayerInputBridge{
  constructor({transport,viewProvider,isReady=null}={}){this.transport=object(transport,'transport');if(typeof this.transport.sendInput!=='function')throw new TypeError('transport.sendInput must be a function');this.viewProvider=callback(viewProvider,'viewProvider');this.isReady=isReady===null?()=>this.transport.state==='ready':callback(isReady,'isReady');this.reset();}
  reset(){this.controlSeq=0;this.viewSeq=0;this.actionSeq=0;this.pendingControl=null;this.pendingView=null;this.sentControl=null;this.sentView=null;this.lastSentViewSequence=null;return this;}
  setControl(state){const normalized=normalizeControlState(state);if(sameControl(this.pendingControl,normalized))return false;const primaryChanged=this.pendingControl!==null&&this.pendingControl.primary!==normalized.primary;this.pendingControl=normalized;if(primaryChanged&&this.isReady())this.flush();return true;}
  setView(view){const normalized=viewState(view);if(!sameView(this.pendingView,normalized)){this.pendingView=normalized;return true;}return false;}
  prime(control,view=this.viewProvider()){this.setControl(control);this.setView(view);this.sentControl=null;this.sentView=null;return this;}
  flushView(){if(!this.isReady())return null;const view=this.pendingView||viewState(this.viewProvider());if(sameView(this.sentView,view)&&this.lastSentViewSequence!==null)return{sequence:this.lastSentViewSequence,reused:true,frame:null};const frame=encodePlayerViewFrame(view,this.viewSeq);this.transport.sendInput('view',frame);this.lastSentViewSequence=this.viewSeq;this.viewSeq=nextNetworkSequence(this.viewSeq);this.sentView={yaw:frame.yaw,pitch:frame.pitch};this.pendingView={...this.sentView};return{sequence:frame.seq,reused:false,frame};}
  flushControl(){if(!this.isReady()||!this.pendingControl||sameControl(this.sentControl,this.pendingControl))return null;const frame=encodePlayerControlFrame(this.pendingControl,this.controlSeq);this.transport.sendInput('control',frame);this.controlSeq=nextNetworkSequence(this.controlSeq);this.sentControl=normalizeControlState(this.pendingControl);return frame;}
  flush(){if(!this.isReady())return{view:null,control:null};return{view:this.flushView(),control:this.flushControl()};}
  sendReferencedAction(kind,view=this.viewProvider()){if(kind!=='use'&&kind!=='drop'&&kind!=='attack')throw new RangeError('referenced multiplayer action must be use, drop, or attack');if(!this.isReady())return null;this.setView(view);const viewResult=this.flushView();if(!viewResult)throw new Error('unable to establish authoritative action view');const frame=encodePlayerActionFrame({kind,viewSeq:viewResult.sequence},this.actionSeq);this.transport.sendInput('action',frame);this.actionSeq=nextNetworkSequence(this.actionSeq);return{frame,view:viewResult};}
  sendPayloadlessAction(kind){if(kind!=='use-release'&&kind!=='respawn'&&kind!=='flight-toggle')throw new RangeError('payloadless multiplayer action must be use-release, respawn, or flight-toggle');if(!this.isReady())return null;const frame=encodePlayerActionFrame({kind},this.actionSeq);this.transport.sendInput('action',frame);this.actionSeq=nextNetworkSequence(this.actionSeq);return frame;}
  sendUse(view){return this.sendReferencedAction('use',view);}
  sendUseRelease(){return this.sendPayloadlessAction('use-release');}
  sendDrop(view){return this.sendReferencedAction('drop',view);}
  sendAttack(view){return this.sendReferencedAction('attack',view);}
  sendRespawn(){return this.sendPayloadlessAction('respawn');}
  sendFlightToggle(){return this.sendPayloadlessAction('flight-toggle');}
  sendHotbarSelect(slot){if(!this.isReady())return null;const frame=encodePlayerActionFrame({kind:'hotbar-select',slot},this.actionSeq);this.transport.sendInput('action',frame);this.actionSeq=nextNetworkSequence(this.actionSeq);return frame;}
}
