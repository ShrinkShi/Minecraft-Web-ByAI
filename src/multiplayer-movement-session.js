import {normalizeControlState} from './control-intents.js';
import {normalizePlayerYaw,PLAYER_VIEW_MAX_PITCH} from './player-view-frame.js';
import {MultiplayerSessionBootstrap} from './multiplayer-session-bootstrap.js';
import {MultiplayerInputBridge} from './multiplayer-input-bridge.js';
import {AuthoritativePlayerInterpolator} from './authoritative-player-interpolator.js';
import {assertRemotePlayerId} from './remote-player-replication.js';
import {assertItemEntityId} from './item-entity-replication.js';
import {LiveWorldWebSocketClient} from './live-world-websocket-client.js';
import {OrderedChangeBuffer} from './ordered-change-buffer.js';
import {publishMultiplayerMiningProgress,clearMultiplayerMiningProgress} from './multiplayer-mining-progress-channel.js';

export const MULTIPLAYER_MOVEMENT_STATES=Object.freeze(['idle','connecting','handshaking','synchronizing','ready','failed','closed']);

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function plainOptions(value,label){if(value===undefined||value===null)return{};return object(value,label);}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function sameControl(a,b){return !!a&&!!b&&a.side===b.side&&a.forward===b.forward&&a.jump===b.jump&&a.sneak===b.sneak&&a.sprint===b.sprint&&a.primary===b.primary;}
function viewState(value){value=object(value,'multiplayer player view');const pitch=finite(value.pitch,'multiplayer player view pitch');if(pitch<-PLAYER_VIEW_MAX_PITCH||pitch>PLAYER_VIEW_MAX_PITCH)throw new RangeError('multiplayer player view pitch is out of range');return{yaw:normalizePlayerYaw(value.yaw),pitch};}
function sameView(a,b){return !!a&&!!b&&a.yaw===b.yaw&&a.pitch===b.pitch;}
function cloneSnapshot(value){return value?{...value,position:{...value.position},velocity:{...value.velocity}}:null;}
function cloneWorldEdits(value){return value?{...value,edits:{...value.edits}}:null;}
function cloneInventory(value){return value?{...value,slots:value.slots.map(slot=>slot?{...slot}:null)}:null;}
function cloneRemote(value){return value?{...value,position:value.position?{...value.position}:undefined,velocity:value.velocity?{...value.velocity}:undefined}:null;}
function cloneItemEntity(value){return value?{...value,position:value.position?{...value.position}:undefined,velocity:value.velocity?{...value.velocity}:undefined}:null;}
function cloneMiningProgress(value){return value?{...value,target:value.target?{...value.target}:null}:null;}
function defaultBootstrapFactory(options){return new MultiplayerSessionBootstrap(options);}
function defaultBridgeFactory(options){return new MultiplayerInputBridge(options);}
function defaultInterpolatorFactory(options){return new AuthoritativePlayerInterpolator(options);}
function remoteSystem(value){value=object(value,'remote player system');for(const name of ['spawn','snapshot','despawn','update','dispose','states'])if(typeof value[name]!=='function')throw new TypeError(`remote player system.${name} must be a function`);return value;}
function itemApplier(value){value=object(value,'item entity applier');for(const name of ['spawn','snapshot','despawn'])if(typeof value[name]!=='function')throw new TypeError(`item entity applier.${name} must be a function`);return value;}

export class MultiplayerMovementSession{
  constructor({allowInsecure=false,bootstrapOptions={},bootstrapFactory=defaultBootstrapFactory,bridgeFactory=defaultBridgeFactory,interpolatorFactory=defaultInterpolatorFactory,onStateChange=()=>{},onReady=()=>{},onSnapshot=()=>{},onInventorySnapshot=()=>{},onRemotePlayerSpawn=()=>{},onRemotePlayerSnapshot=()=>{},onRemotePlayerDespawn=()=>{},onItemEntitySpawn=()=>{},onItemEntitySnapshot=()=>{},onItemEntityDespawn=()=>{},onMiningProgress=()=>{},onError=()=>{}}={}){
    this.allowInsecure=!!allowInsecure;this.bootstrapOptions={...plainOptions(bootstrapOptions,'bootstrapOptions')};this.bootstrapFactory=callback(bootstrapFactory,'bootstrapFactory');this.bridgeFactory=callback(bridgeFactory,'bridgeFactory');this.interpolatorFactory=callback(interpolatorFactory,'interpolatorFactory');this.onStateChange=callback(onStateChange,'onStateChange');this.onReady=callback(onReady,'onReady');this.onSnapshot=callback(onSnapshot,'onSnapshot');this.onInventorySnapshot=callback(onInventorySnapshot,'onInventorySnapshot');this.onRemotePlayerSpawn=callback(onRemotePlayerSpawn,'onRemotePlayerSpawn');this.onRemotePlayerSnapshot=callback(onRemotePlayerSnapshot,'onRemotePlayerSnapshot');this.onRemotePlayerDespawn=callback(onRemotePlayerDespawn,'onRemotePlayerDespawn');this.onItemEntitySpawn=callback(onItemEntitySpawn,'onItemEntitySpawn');this.onItemEntitySnapshot=callback(onItemEntitySnapshot,'onItemEntitySnapshot');this.onItemEntityDespawn=callback(onItemEntityDespawn,'onItemEntityDespawn');this.onMiningProgress=callback(onMiningProgress,'onMiningProgress');this.onError=callback(onError,'onError');
    this.miningProgressSource=Object.freeze({session:this});this.worldBlockBuffer=new OrderedChangeBuffer();if(this.bootstrapOptions.clientFactory===undefined)this.bootstrapOptions.clientFactory=clientOptions=>new LiveWorldWebSocketClient({...clientOptions,onWorldBlockChange:change=>this.worldBlockBuffer.push(Object.freeze({...change}))});
    this.bootstrap=null;this.bridge=null;this.interpolator=null;this.remotePlayerSystem=null;this.inventoryApplier=null;this.itemEntityApplier=null;this.state='idle';this.latestControl=normalizeControlState();this.latestView={yaw:0,pitch:0};this.hasExplicitView=false;this.latestSnapshot=null;this.latestInventorySnapshot=null;this.latestMiningProgress=null;this.readyData=null;this.remotePlayers=new Map();this.itemEntities=new Map();
  }

  setState(next,detail=null){if(!MULTIPLAYER_MOVEMENT_STATES.includes(next))throw new RangeError(`unsupported multiplayer movement state: ${next}`);if(this.state===next)return;this.state=next;this.onStateChange({state:next,detail});}
  get ready(){return this.state==='ready'&&!!this.bridge&&!!this.interpolator;}
  get transport(){return this.bootstrap?.client||null;}
  get worldRevision(){return this.transport?.worldRevision??this.readyData?.worldEdits?.revision??null;}
  get inventoryRevision(){return this.latestInventorySnapshot?.revision??this.readyData?.inventorySnapshot?.revision??null;}
  get pendingWorldBlockChangeCount(){return this.worldBlockBuffer.size;}
  current(){return this.interpolator?.current()||null;}
  inventoryState(){return cloneInventory(this.latestInventorySnapshot||this.readyData?.inventorySnapshot||null);}
  miningProgressState(){return cloneMiningProgress(this.latestMiningProgress);}
  remotePlayerStates(){return [...this.remotePlayers.values()].map(cloneRemote);}
  remotePlayerState(playerId){return cloneRemote(this.remotePlayers.get(assertRemotePlayerId(playerId))||null);}
  remoteVisualStates(){return this.remotePlayerSystem?this.remotePlayerSystem.states().map(cloneRemote):[];}
  itemEntityStates(){return [...this.itemEntities.values()].map(cloneItemEntity);}

  detachRemotePlayerSystem(){const system=this.remotePlayerSystem;this.remotePlayerSystem=null;if(system)system.dispose();return system;}
  attachRemotePlayerSystem(system){system=remoteSystem(system);if(this.remotePlayerSystem)throw new Error('remote player system is already attached');this.remotePlayerSystem=system;try{for(const state of this.remotePlayers.values())system.spawn(cloneRemote(state));}catch(error){this.remotePlayerSystem=null;try{system.dispose();}catch{}throw error;}return system;}
  attachWorldBlockApplier(applier){return{drained:this.worldBlockBuffer.attach(callback(applier,'worldBlockApplier')),revision:this.worldRevision};}
  detachWorldBlockApplier(){return this.worldBlockBuffer.detach();}
  attachInventoryApplier(applier){this.inventoryApplier=callback(applier,'inventoryApplier');const current=this.inventoryState();if(current)this.inventoryApplier(current);return current;}
  detachInventoryApplier(){const applier=this.inventoryApplier;this.inventoryApplier=null;return applier;}
  attachItemEntityApplier(applier){if(this.itemEntityApplier)throw new Error('item entity applier is already attached');this.itemEntityApplier=itemApplier(applier);try{for(const state of this.itemEntities.values())this.itemEntityApplier.spawn(cloneItemEntity(state));}catch(error){this.itemEntityApplier=null;throw error;}return this.itemEntityStates();}
  detachItemEntityApplier(){const applier=this.itemEntityApplier;this.itemEntityApplier=null;return applier;}
  resetRuntimeState(){clearMultiplayerMiningProgress(this.miningProgressSource);this.detachRemotePlayerSystem();this.detachInventoryApplier();this.detachItemEntityApplier();this.worldBlockBuffer.clear();this.bridge=null;this.interpolator=null;this.latestSnapshot=null;this.latestInventorySnapshot=null;this.latestMiningProgress=null;this.readyData=null;this.latestControl=normalizeControlState();this.latestView={yaw:0,pitch:0};this.hasExplicitView=false;this.remotePlayers.clear();this.itemEntities.clear();}

  connect(url){if(!['idle','closed','failed'].includes(this.state))throw new Error(`cannot connect while multiplayer movement session is ${this.state}`);if(this.bootstrap&&this.bootstrap.state!=='closed')try{this.bootstrap.close(1000,'reconnecting multiplayer movement session');}catch{}this.resetRuntimeState();const bootstrap=this.bootstrapFactory({...this.bootstrapOptions,allowInsecure:this.allowInsecure,onStateChange:event=>this.handleBootstrapState(event),onReady:data=>this.handleBootstrapReady(data),onInventorySnapshot:snapshot=>this.handleBootstrapInventorySnapshot(snapshot),onPlayerSnapshot:snapshot=>this.handleBootstrapSnapshot(snapshot),onRemotePlayerSpawn:message=>this.handleRemotePlayerSpawn(message),onRemotePlayerSnapshot:message=>this.handleRemotePlayerSnapshot(message),onRemotePlayerDespawn:message=>this.handleRemotePlayerDespawn(message),onItemEntitySpawn:message=>this.handleItemEntitySpawn(message),onItemEntitySnapshot:message=>this.handleItemEntitySnapshot(message),onItemEntityDespawn:message=>this.handleItemEntityDespawn(message),onMiningProgress:message=>this.handleMiningProgress(message),onError:error=>this.handleBootstrapError(error)});if(!bootstrap||typeof bootstrap.connect!=='function'||typeof bootstrap.close!=='function')throw new TypeError('bootstrapFactory must return a MultiplayerSessionBootstrap-compatible object');this.bootstrap=bootstrap;return bootstrap.connect(url);}

  handleBootstrapState({state,detail}={}){if(!MULTIPLAYER_MOVEMENT_STATES.includes(state))throw new RangeError(`unsupported bootstrap state: ${state}`);this.setState(state,detail);}
  handleBootstrapError(error){try{this.onError(error);}catch{}}
  handleBootstrapReady(data){
    data=object(data,'multiplayer bootstrap ready data');const info=object(data.worldInfo,'multiplayer world info'),worldEdits=cloneWorldEdits(object(data.worldEdits,'initial authoritative world edits')),inventorySnapshot=cloneInventory(object(data.inventorySnapshot,'initial authoritative inventory snapshot')),initial=cloneSnapshot(object(data.initialSnapshot,'initial authoritative player snapshot')),client=object(data.client,'multiplayer transport client');const interpolator=this.interpolatorFactory({tickRate:info.tickRate});if(!interpolator||typeof interpolator.accept!=='function'||typeof interpolator.step!=='function'||typeof interpolator.current!=='function')throw new TypeError('interpolatorFactory must return an AuthoritativePlayerInterpolator-compatible object');interpolator.accept(initial);this.interpolator=interpolator;this.latestSnapshot=cloneSnapshot(initial);this.latestInventorySnapshot=cloneInventory(inventorySnapshot);if(!this.hasExplicitView)this.latestView={yaw:initial.yaw,pitch:initial.pitch};const bridge=this.bridgeFactory({transport:client,viewProvider:()=>({...this.latestView}),isReady:()=>this.bootstrap?.state==='ready'});if(!bridge||typeof bridge.prime!=='function'||typeof bridge.flush!=='function')throw new TypeError('bridgeFactory must return a MultiplayerInputBridge-compatible object');bridge.prime(this.latestControl,this.latestView);this.bridge=bridge;const initialFlush=bridge.flush();const ready=Object.freeze({client,worldInfo:info,worldEdits:Object.freeze({...worldEdits,edits:Object.freeze({...worldEdits.edits})}),inventorySnapshot:Object.freeze({...inventorySnapshot,slots:Object.freeze(inventorySnapshot.slots.map(slot=>slot?Object.freeze({...slot}):null))}),initialSnapshot:cloneSnapshot(initial),initialDisplay:interpolator.current(),initialFlush});this.readyData=ready;this.onReady(ready);return ready;
  }
  handleBootstrapInventorySnapshot(snapshot){const copy=cloneInventory(snapshot);this.latestInventorySnapshot=copy;if(this.inventoryApplier)this.inventoryApplier(cloneInventory(copy));this.onInventorySnapshot(cloneInventory(copy));return copy;}
  handleBootstrapSnapshot(snapshot){const copy=cloneSnapshot(snapshot);this.latestSnapshot=copy;if(!this.interpolator)return null;const result=this.interpolator.accept(copy),event={snapshot:cloneSnapshot(copy),result,display:this.interpolator.current()};this.onSnapshot(event);return event;}
  handleMiningProgress(message){const copy=cloneMiningProgress(message);this.latestMiningProgress=copy;publishMultiplayerMiningProgress(this.miningProgressSource,copy);this.onMiningProgress(cloneMiningProgress(copy));return copy;}
  handleRemotePlayerSpawn(message){const copy=cloneRemote(message),playerId=assertRemotePlayerId(copy?.playerId);if(this.remotePlayers.has(playerId))throw new Error(`duplicate remote player in movement session: ${playerId}`);this.remotePlayers.set(playerId,copy);if(this.remotePlayerSystem)this.remotePlayerSystem.spawn(cloneRemote(copy));this.onRemotePlayerSpawn(cloneRemote(copy));return copy;}
  handleRemotePlayerSnapshot(message){const copy=cloneRemote(message),playerId=assertRemotePlayerId(copy?.playerId);if(!this.remotePlayers.has(playerId))throw new Error(`unknown remote player in movement session: ${playerId}`);this.remotePlayers.set(playerId,copy);if(this.remotePlayerSystem)this.remotePlayerSystem.snapshot(cloneRemote(copy));this.onRemotePlayerSnapshot(cloneRemote(copy));return copy;}
  handleRemotePlayerDespawn(message){const playerId=assertRemotePlayerId(message?.playerId);if(!this.remotePlayers.delete(playerId))throw new Error(`unknown remote player despawn in movement session: ${playerId}`);if(this.remotePlayerSystem)this.remotePlayerSystem.despawn(playerId);const copy={...message,playerId};this.onRemotePlayerDespawn(cloneRemote(copy));return copy;}
  handleItemEntitySpawn(message){const copy=cloneItemEntity(message),entityId=assertItemEntityId(copy?.entityId);if(this.itemEntities.has(entityId))throw new Error(`duplicate item entity in movement session: ${entityId}`);this.itemEntities.set(entityId,copy);if(this.itemEntityApplier)this.itemEntityApplier.spawn(cloneItemEntity(copy));this.onItemEntitySpawn(cloneItemEntity(copy));return copy;}
  handleItemEntitySnapshot(message){const copy=cloneItemEntity(message),entityId=assertItemEntityId(copy?.entityId),previous=this.itemEntities.get(entityId);if(!previous)throw new Error(`unknown item entity in movement session: ${entityId}`);if(previous.itemId!==copy.itemId)throw new Error(`item entity type changed in movement session: ${entityId}`);this.itemEntities.set(entityId,copy);if(this.itemEntityApplier)this.itemEntityApplier.snapshot(cloneItemEntity(copy));this.onItemEntitySnapshot(cloneItemEntity(copy));return copy;}
  handleItemEntityDespawn(message){const entityId=assertItemEntityId(message?.entityId);if(!this.itemEntities.delete(entityId))throw new Error(`unknown item entity despawn in movement session: ${entityId}`);const copy={...message,entityId};if(this.itemEntityApplier)this.itemEntityApplier.despawn({...copy});this.onItemEntityDespawn({...copy});return copy;}

  setControl(state){const normalized=normalizeControlState(state),changed=!sameControl(this.latestControl,normalized);this.latestControl=normalized;if(this.bridge)this.bridge.setControl(normalized);return changed;}
  setView(view){const normalized=viewState(view),changed=!sameView(this.latestView,normalized);this.latestView=normalized;this.hasExplicitView=true;if(this.bridge)this.bridge.setView(normalized);return changed;}
  flush(){return this.bridge?this.bridge.flush():{view:null,control:null};}
  step(dt){const state=this.interpolator?this.interpolator.step(dt):null;if(this.remotePlayerSystem)this.remotePlayerSystem.update(dt);return state;}
  sendHotbarSelect(slot){return this.bridge?.sendHotbarSelect(slot)||null;}
  sendUse(view=this.latestView){return this.bridge?.sendUse(view)||null;}
  sendDrop(view=this.latestView){return this.bridge?.sendDrop(view)||null;}
  close(code=1000,reason='multiplayer movement session closed'){const bootstrap=this.bootstrap,system=this.remotePlayerSystem;clearMultiplayerMiningProgress(this.miningProgressSource);this.bootstrap=null;this.bridge=null;this.interpolator=null;this.remotePlayerSystem=null;this.inventoryApplier=null;this.itemEntityApplier=null;this.worldBlockBuffer.clear();this.latestSnapshot=null;this.latestInventorySnapshot=null;this.latestMiningProgress=null;this.readyData=null;this.remotePlayers.clear();this.itemEntities.clear();if(bootstrap&&bootstrap.state!=='closed')bootstrap.close(code,reason);if(system)system.dispose();this.setState('closed',{code,reason});return true;}
}
