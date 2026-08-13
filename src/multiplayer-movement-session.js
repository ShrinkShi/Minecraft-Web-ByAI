import {normalizeControlState} from './control-intents.js';
import {normalizePlayerYaw,PLAYER_VIEW_MAX_PITCH} from './player-view-frame.js';
import {MultiplayerSessionBootstrap} from './multiplayer-session-bootstrap.js';
import {MultiplayerInputBridge} from './multiplayer-input-bridge.js';
import {AuthoritativePlayerInterpolator} from './authoritative-player-interpolator.js';
import {assertRemotePlayerId} from './remote-player-replication.js';

export const MULTIPLAYER_MOVEMENT_STATES=Object.freeze(['idle','connecting','handshaking','synchronizing','ready','failed','closed']);

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function plainOptions(value,label){if(value===undefined||value===null)return{};return object(value,label);}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function sameControl(a,b){return !!a&&!!b&&a.side===b.side&&a.forward===b.forward&&a.jump===b.jump&&a.sneak===b.sneak&&a.sprint===b.sprint&&a.primary===b.primary;}
function viewState(value){value=object(value,'multiplayer player view');const pitch=finite(value.pitch,'multiplayer player view pitch');if(pitch<-PLAYER_VIEW_MAX_PITCH||pitch>PLAYER_VIEW_MAX_PITCH)throw new RangeError('multiplayer player view pitch is out of range');return{yaw:normalizePlayerYaw(value.yaw),pitch};}
function sameView(a,b){return !!a&&!!b&&a.yaw===b.yaw&&a.pitch===b.pitch;}
function cloneSnapshot(value){return value?{...value,position:{...value.position},velocity:{...value.velocity}}:null;}
function cloneRemote(value){return value?{...value,position:value.position?{...value.position}:undefined,velocity:value.velocity?{...value.velocity}:undefined}:null;}
function defaultBootstrapFactory(options){return new MultiplayerSessionBootstrap(options);}
function defaultBridgeFactory(options){return new MultiplayerInputBridge(options);}
function defaultInterpolatorFactory(options){return new AuthoritativePlayerInterpolator(options);}

export class MultiplayerMovementSession{
  constructor({allowInsecure=false,bootstrapOptions={},bootstrapFactory=defaultBootstrapFactory,bridgeFactory=defaultBridgeFactory,interpolatorFactory=defaultInterpolatorFactory,onStateChange=()=>{},onReady=()=>{},onSnapshot=()=>{},onRemotePlayerSpawn=()=>{},onRemotePlayerSnapshot=()=>{},onRemotePlayerDespawn=()=>{},onError=()=>{}}={}){
    this.allowInsecure=!!allowInsecure;this.bootstrapOptions={...plainOptions(bootstrapOptions,'bootstrapOptions')};this.bootstrapFactory=callback(bootstrapFactory,'bootstrapFactory');this.bridgeFactory=callback(bridgeFactory,'bridgeFactory');this.interpolatorFactory=callback(interpolatorFactory,'interpolatorFactory');this.onStateChange=callback(onStateChange,'onStateChange');this.onReady=callback(onReady,'onReady');this.onSnapshot=callback(onSnapshot,'onSnapshot');this.onRemotePlayerSpawn=callback(onRemotePlayerSpawn,'onRemotePlayerSpawn');this.onRemotePlayerSnapshot=callback(onRemotePlayerSnapshot,'onRemotePlayerSnapshot');this.onRemotePlayerDespawn=callback(onRemotePlayerDespawn,'onRemotePlayerDespawn');this.onError=callback(onError,'onError');
    this.bootstrap=null;this.bridge=null;this.interpolator=null;this.state='idle';this.latestControl=normalizeControlState();this.latestView={yaw:0,pitch:0};this.hasExplicitView=false;this.latestSnapshot=null;this.readyData=null;this.remotePlayers=new Map();
  }

  setState(next,detail=null){if(!MULTIPLAYER_MOVEMENT_STATES.includes(next))throw new RangeError(`unsupported multiplayer movement state: ${next}`);if(this.state===next)return;this.state=next;this.onStateChange({state:next,detail});}
  get ready(){return this.state==='ready'&&!!this.bridge&&!!this.interpolator;}
  get transport(){return this.bootstrap?.client||null;}
  current(){return this.interpolator?.current()||null;}
  remotePlayerStates(){return [...this.remotePlayers.values()].map(cloneRemote);}
  remotePlayerState(playerId){return cloneRemote(this.remotePlayers.get(assertRemotePlayerId(playerId))||null);}
  resetRuntimeState(){this.bridge=null;this.interpolator=null;this.latestSnapshot=null;this.readyData=null;this.latestControl=normalizeControlState();this.latestView={yaw:0,pitch:0};this.hasExplicitView=false;this.remotePlayers.clear();}

  connect(url){
    if(!['idle','closed','failed'].includes(this.state))throw new Error(`cannot connect while multiplayer movement session is ${this.state}`);
    if(this.bootstrap&&this.bootstrap.state!=='closed')try{this.bootstrap.close(1000,'reconnecting multiplayer movement session');}catch{}
    this.resetRuntimeState();const bootstrap=this.bootstrapFactory({...this.bootstrapOptions,allowInsecure:this.allowInsecure,onStateChange:event=>this.handleBootstrapState(event),onReady:data=>this.handleBootstrapReady(data),onPlayerSnapshot:snapshot=>this.handleBootstrapSnapshot(snapshot),onRemotePlayerSpawn:message=>this.handleRemotePlayerSpawn(message),onRemotePlayerSnapshot:message=>this.handleRemotePlayerSnapshot(message),onRemotePlayerDespawn:message=>this.handleRemotePlayerDespawn(message),onError:error=>this.handleBootstrapError(error)});
    if(!bootstrap||typeof bootstrap.connect!=='function'||typeof bootstrap.close!=='function')throw new TypeError('bootstrapFactory must return a MultiplayerSessionBootstrap-compatible object');this.bootstrap=bootstrap;return bootstrap.connect(url);
  }

  handleBootstrapState({state,detail}={}){if(!MULTIPLAYER_MOVEMENT_STATES.includes(state))throw new RangeError(`unsupported bootstrap state: ${state}`);this.setState(state,detail);}
  handleBootstrapError(error){try{this.onError(error);}catch{}}
  handleBootstrapReady(data){
    data=object(data,'multiplayer bootstrap ready data');const info=object(data.worldInfo,'multiplayer world info'),initial=cloneSnapshot(object(data.initialSnapshot,'initial authoritative player snapshot')),client=object(data.client,'multiplayer transport client');const interpolator=this.interpolatorFactory({tickRate:info.tickRate});if(!interpolator||typeof interpolator.accept!=='function'||typeof interpolator.step!=='function'||typeof interpolator.current!=='function')throw new TypeError('interpolatorFactory must return an AuthoritativePlayerInterpolator-compatible object');interpolator.accept(initial);this.interpolator=interpolator;this.latestSnapshot=cloneSnapshot(initial);if(!this.hasExplicitView)this.latestView={yaw:initial.yaw,pitch:initial.pitch};const bridge=this.bridgeFactory({transport:client,viewProvider:()=>({...this.latestView}),isReady:()=>this.bootstrap?.state==='ready'});if(!bridge||typeof bridge.prime!=='function'||typeof bridge.flush!=='function')throw new TypeError('bridgeFactory must return a MultiplayerInputBridge-compatible object');bridge.prime(this.latestControl,this.latestView);this.bridge=bridge;const initialFlush=bridge.flush();const ready=Object.freeze({client,worldInfo:info,initialSnapshot:cloneSnapshot(initial),initialDisplay:interpolator.current(),initialFlush});this.readyData=ready;this.onReady(ready);return ready;
  }
  handleBootstrapSnapshot(snapshot){const copy=cloneSnapshot(snapshot);this.latestSnapshot=copy;if(!this.interpolator)return null;const result=this.interpolator.accept(copy),event={snapshot:cloneSnapshot(copy),result,display:this.interpolator.current()};this.onSnapshot(event);return event;}
  handleRemotePlayerSpawn(message){const copy=cloneRemote(message),playerId=assertRemotePlayerId(copy?.playerId);if(this.remotePlayers.has(playerId))throw new Error(`duplicate remote player in movement session: ${playerId}`);this.remotePlayers.set(playerId,copy);this.onRemotePlayerSpawn(cloneRemote(copy));return copy;}
  handleRemotePlayerSnapshot(message){const copy=cloneRemote(message),playerId=assertRemotePlayerId(copy?.playerId);if(!this.remotePlayers.has(playerId))throw new Error(`unknown remote player in movement session: ${playerId}`);this.remotePlayers.set(playerId,copy);this.onRemotePlayerSnapshot(cloneRemote(copy));return copy;}
  handleRemotePlayerDespawn(message){const playerId=assertRemotePlayerId(message?.playerId);if(!this.remotePlayers.delete(playerId))throw new Error(`unknown remote player despawn in movement session: ${playerId}`);const copy={...message,playerId};this.onRemotePlayerDespawn(copy);return copy;}

  setControl(state){const normalized=normalizeControlState(state),changed=!sameControl(this.latestControl,normalized);this.latestControl=normalized;if(this.bridge)this.bridge.setControl(normalized);return changed;}
  setView(view){const normalized=viewState(view),changed=!sameView(this.latestView,normalized);this.latestView=normalized;this.hasExplicitView=true;if(this.bridge)this.bridge.setView(normalized);return changed;}
  flush(){return this.bridge?this.bridge.flush():{view:null,control:null};}
  step(dt){return this.interpolator?this.interpolator.step(dt):null;}
  sendHotbarSelect(slot){return this.bridge?.sendHotbarSelect(slot)||null;}
  sendUse(view=this.latestView){return this.bridge?.sendUse(view)||null;}
  sendDrop(view=this.latestView){return this.bridge?.sendDrop(view)||null;}
  close(code=1000,reason='multiplayer movement session closed'){const bootstrap=this.bootstrap;this.bootstrap=null;this.bridge=null;this.interpolator=null;this.latestSnapshot=null;this.readyData=null;this.remotePlayers.clear();if(bootstrap&&bootstrap.state!=='closed')bootstrap.close(code,reason);this.setState('closed',{code,reason});return true;}
}
