import {MultiplayerWebSocketClient} from './websocket-client.js';
import {NetworkSequenceGate,nextNetworkSequence} from './network-sequence.js';
import {WORLD_BLOCK_CHANGE_KIND,WorldBlockRevisionGate} from './world-edit-replication.js';
import {SERVER_WORKBENCH_CONTAINER_SNAPSHOT_KIND,SERVER_WORKBENCH_CONTAINER_CLOSE_KIND,decodeServerWorkbenchContainerSnapshot,decodeServerWorkbenchContainerClose} from './server-workbench-container-snapshot.js';
import {WORKBENCH_TRANSACTION_RESULT_KIND,decodeWorkbenchTransactionResult,encodeWorkbenchTransactionRequest,normalizeWorkbenchTransactionAction} from './workbench-transaction-wire.js';
import {publishMultiplayerWorkbenchSnapshot,publishMultiplayerWorkbenchResult,publishMultiplayerWorkbenchClose} from './multiplayer-workbench-channel.js';
import {SERVER_PLAYER_COMBAT_SNAPSHOT_KIND,decodeServerPlayerCombatSnapshot} from './server-player-combat-snapshot.js';
import {publishMultiplayerCombatSnapshot,clearMultiplayerCombatSnapshot} from './multiplayer-combat-channel.js';

export const MAX_PENDING_WORKBENCH_TRANSACTIONS=2;
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}

export class LiveWorldWebSocketClient extends MultiplayerWebSocketClient{
  constructor({onWorldBlockChange=()=>{},...options}={}){
    super(options);this.onWorldBlockChange=callback(onWorldBlockChange,'onWorldBlockChange');this.worldBlockGate=null;this.workbenchSnapshot=null;this.workbenchSnapshotGate=null;this.workbenchTransactionRequestSeq=0;this.pendingWorkbenchTransactions=new Map();this.combatSnapshot=null;this.combatSnapshotGate=new NetworkSequenceGate();
  }

  get worldRevision(){return this.worldBlockGate?.revision??this.worldEditSync?.revision??null;}

  resetRealtimeState(){const hadCombat=!!this.combatSnapshot;super.resetRealtimeState();this.worldBlockGate=null;this.workbenchSnapshot=null;this.workbenchSnapshotGate=null;this.workbenchTransactionRequestSeq=0;this.pendingWorkbenchTransactions?.clear();this.combatSnapshot=null;this.combatSnapshotGate=new NetworkSequenceGate();if(hadCombat)clearMultiplayerCombatSnapshot();}

  handleWorldEditSync(raw){super.handleWorldEditSync(raw);if(this.state==='ready'&&this.worldEditSync&&!this.worldBlockGate)this.worldBlockGate=new WorldBlockRevisionGate(this.worldEditSync.revision);}
  handleWorldBlockChange(raw){if(!this.worldInfo||!this.worldEditSync||!this.worldBlockGate){this.protocolFailure(new Error('world block change received before initial world synchronization'),1002,'world block before initial sync');return;}let change;try{change=this.worldBlockGate.accept(raw,{session:this.session,worldId:this.worldInfo.worldId});}catch(error){this.protocolFailure(error,1002,'invalid world block change');return;}try{this.onWorldBlockChange(change);}catch(error){this.protocolFailure(error,1011,'world block change handler failed');}}

  handleCombatSnapshot(raw){let snapshot;try{snapshot=decodeServerPlayerCombatSnapshot(raw,{expectedSession:this.session});}catch(error){this.protocolFailure(error,1002,'invalid player combat snapshot');return;}if(!this.combatSnapshotGate.accept(snapshot.revision)){this.protocolFailure(new Error('stale or duplicate player combat revision'),1002,'stale player combat snapshot');return;}this.combatSnapshot=snapshot;publishMultiplayerCombatSnapshot(snapshot);}
  handleWorkbenchSnapshot(raw){let snapshot;try{snapshot=decodeServerWorkbenchContainerSnapshot(raw,{expectedSession:this.session});}catch(error){this.protocolFailure(error,1002,'invalid workbench snapshot');return;}if(!this.workbenchSnapshot||this.workbenchSnapshot.containerId!==snapshot.containerId)this.workbenchSnapshotGate=new NetworkSequenceGate();if(!this.workbenchSnapshotGate.accept(snapshot.revision)){this.protocolFailure(new Error('stale or duplicate workbench container revision'),1002,'stale workbench snapshot');return;}this.workbenchSnapshot=snapshot;publishMultiplayerWorkbenchSnapshot(snapshot);}
  handleWorkbenchClose(raw){let message;try{message=decodeServerWorkbenchContainerClose(raw,{expectedSession:this.session});}catch(error){this.protocolFailure(error,1002,'invalid workbench close');return;}if(!this.workbenchSnapshot||this.workbenchSnapshot.containerId!==message.containerId){this.protocolFailure(new Error(`unexpected workbench close containerId: ${message.containerId}`),1002,'unexpected workbench close');return;}this.workbenchSnapshot=null;this.workbenchSnapshotGate=null;publishMultiplayerWorkbenchClose(message);}
  handleWorkbenchTransactionResult(raw){let result;try{result=decodeWorkbenchTransactionResult(raw,{expectedSession:this.session});}catch(error){this.protocolFailure(error,1002,'invalid workbench transaction result');return;}const expected=this.pendingWorkbenchTransactions.get(result.requestId);if(!expected){this.protocolFailure(new Error(`unexpected workbench transaction result requestId: ${result.requestId}`),1002,'unexpected workbench transaction result');return;}if(expected.containerId!==result.containerId){this.protocolFailure(new Error('workbench transaction result container mismatch'),1002,'workbench result container mismatch');return;}this.pendingWorkbenchTransactions.delete(result.requestId);publishMultiplayerWorkbenchResult(result);}

  handleMessage(socket,event){
    if(socket===this.socket&&this.state==='ready'&&typeof event?.data==='string'){
      try{const raw=JSON.parse(event.data);if(raw?.kind===WORLD_BLOCK_CHANGE_KIND){this.handleWorldBlockChange(raw);return;}if(raw?.kind===SERVER_PLAYER_COMBAT_SNAPSHOT_KIND){this.handleCombatSnapshot(raw);return;}if(raw?.kind===SERVER_WORKBENCH_CONTAINER_SNAPSHOT_KIND){this.handleWorkbenchSnapshot(raw);return;}if(raw?.kind===SERVER_WORKBENCH_CONTAINER_CLOSE_KIND){this.handleWorkbenchClose(raw);return;}if(raw?.kind===WORKBENCH_TRANSACTION_RESULT_KIND){this.handleWorkbenchTransactionResult(raw);return;}}catch{}
    }
    return super.handleMessage(socket,event);
  }

  sendWorkbenchTransaction(action,expectedInventoryRevision){if(this.state!=='ready'||!this.session||!this.socket)throw new Error('websocket client is not ready');if(this.socket.readyState!==undefined&&this.socket.readyState!==1)throw new Error('websocket transport is not open');const normalized=normalizeWorkbenchTransactionAction(action),snapshot=this.workbenchSnapshot;if(!snapshot)throw new Error('no authoritative workbench container is open');const closeCleanup=normalized.type==='close',pending=[...this.pendingWorkbenchTransactions.values()];if(closeCleanup){if(pending.some(value=>value.actionType==='close')||pending.length>=MAX_PENDING_WORKBENCH_TRANSACTIONS)throw new Error('workbench cleanup queue is full');}else if(pending.length)throw new Error('a workbench transaction is already awaiting the server');const request=encodeWorkbenchTransactionRequest({session:this.session,requestId:this.workbenchTransactionRequestSeq,containerId:snapshot.containerId,expectedInventoryRevision,expectedContainerRevision:snapshot.revision,action:normalized});this.socket.send(JSON.stringify(request));this.pendingWorkbenchTransactions.set(request.requestId,{containerId:request.containerId,actionType:request.action.type});this.workbenchTransactionRequestSeq=nextNetworkSequence(this.workbenchTransactionRequestSeq);return request;}
}
