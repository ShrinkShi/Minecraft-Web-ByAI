import {TERRAIN_GENERATOR_VERSION} from '../src/terrain-generator.js';
import {DEFAULT_SERVER_TICK_RATE} from '../src/server-world-info.js';
import {createMultiplayerServer} from './multiplayer-server.mjs';
import {ServerTerrainWorld} from './terrain-world.mjs';
import {AuthoritativeWorldSession} from './authoritative-world-session.mjs';
import {CreativeBlockBreakController} from './creative-block-break-controller.mjs';
import {CreativeBlockUseController,DEFAULT_INTERACTION_ACTIONS_PER_TICK} from './creative-block-use-controller.mjs';
import {ServerPlayerInventoryHub} from './player-inventory-state.mjs';
import {RemotePlayerReplicationHub} from './remote-player-replication-hub.mjs';
import {normalizeRuntimeConfig} from './runtime-config.mjs';

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function observer(value,label){const fn=callback(value,label);return event=>{try{fn(event);}catch{}};}

export function createAuthoritativeServerRuntime({config={},setIntervalFn=setInterval,clearIntervalFn=clearInterval,playerIdFactory=undefined,onLog=()=>{},onError=()=>{}}={}){
  const normalized=normalizeRuntimeConfig(config),log=observer(onLog,'onLog'),report=observer(onError,'onError');
  const world=new ServerTerrainWorld({seed:normalized.seed,prompt:normalized.prompt,maxCacheChunks:normalized.terrainCacheChunks});
  let server=null,authoritative=null;
  const inventories=new ServerPlayerInventoryHub();
  const replication=new RemotePlayerReplicationHub({sendSpawn:(session,state)=>server?.sendRemotePlayerSpawn(session,state)??null,sendSnapshot:(session,state)=>server?.sendRemotePlayerSnapshot(session,state)??null,sendDespawn:(session,playerId)=>server?.sendRemotePlayerDespawn(session,playerId)??null,...(playerIdFactory===undefined?{}:{playerIdFactory:callback(playerIdFactory,'playerIdFactory')}),onSendError:event=>report({source:'remote-replication',...event})});
  const commitBlockChange=(x,y,z,id)=>{const change=world.setBlock(x,y,z,id);if(!change.changed)return Object.freeze({...change,broadcast:0,failed:0});let broadcast=0,failed=0;for(const session of [...(authoritative?.sessions||[])]){try{const wire=server?.sendWorldBlockChange(session,{worldId:normalized.worldId,revision:change.revision,x:change.x,y:change.y,z:change.z,previous:change.previous,id:change.id})??null;if(wire===null){failed++;report({source:'world-change',session,change,error:new Error('world change transport unavailable')});}else broadcast++;}catch(error){failed++;report({source:'world-change',session,change,error});}}return Object.freeze({...change,broadcast,failed});};
  const creativeBreak=new CreativeBlockBreakController({world,setBlock:commitBlockChange});
  const creativeUse=new CreativeBlockUseController({world,setBlock:commitBlockChange,inventories});
  authoritative=new AuthoritativeWorldSession({world,getInputState:session=>server?.getSessionInputState(session)??null,sendPlayerSnapshot:(session,snapshot)=>{const wire=server?.sendPlayerSnapshot(session,snapshot)??null;if(wire!==null){try{creativeBreak.step(session,snapshot);}catch(error){report({source:'creative-block-break',session,error});}try{creativeUse.step(session,snapshot,server?.drainSessionActions(session,DEFAULT_INTERACTION_ACTIONS_PER_TICK)??[]);}catch(error){report({source:'creative-block-use',session,error});}replication.update(session,snapshot);}return wire;},setIntervalFn,clearIntervalFn,onSessionError:event=>report({source:'world-session',...event}),defaultMode:normalized.mode,spawnX:normalized.spawnX,spawnZ:normalized.spawnZ,prefetchRadius:normalized.prefetchRadius});

  server=createMultiplayerServer({host:normalized.host,port:normalized.port,allowedOrigins:normalized.allowedOrigins,allowMissingOrigin:normalized.allowMissingOrigin,onSessionReady:({session})=>{
    const info=server.sendWorldInfo(session,{session,worldId:normalized.worldId,terrainVersion:TERRAIN_GENERATOR_VERSION,seed:normalized.seed,prompt:normalized.prompt,tickRate:DEFAULT_SERVER_TICK_RATE});if(info===null)throw new Error('world info transport is unavailable');
    const worldEdits=server.sendWorldEditSync(session,{worldId:normalized.worldId,revision:world.revision,edits:world.editEntries()});if(worldEdits===null)throw new Error('world edit sync transport is unavailable');
    const joined=authoritative.join(session,{mode:normalized.mode});try{
      inventories.join(session,{mode:joined.snapshot.mode});
      const inventory=server.sendInventorySnapshot(session,inventories.snapshot(session));if(inventory===null)throw new Error('inventory snapshot transport is unavailable');
      replication.join(session,joined.snapshot);
    }catch(error){if(inventories.has(session))inventories.leave(session);authoritative.leave(session);creativeBreak.remove(session);throw error;}
  },onInput:({session,message})=>{if(message?.kind==='control')creativeBreak.observePrimary(session,message.payload.primary);},onSessionClose:({session})=>{if(session){creativeBreak.remove(session);if(inventories.has(session))inventories.leave(session);replication.leave(session);authoritative.leave(session);}},onSocketError:event=>report({source:'socket',...event})});

  let state='idle',address=null,stopPromise=null;
  const runtime={config:normalized,world,server,authoritative,inventories,replication,get state(){return state;},get running(){return state==='running';},get address(){return address;},
    setBlock:commitBlockChange,
    selectedStack(session){const input=server?.getSessionInputState(session);if(!input)throw new Error(`unknown input session: ${session}`);return inventories.selectedStack(session,input.selectedSlot);},
    async start(){if(state==='running')return address;if(state!=='idle')throw new Error(`cannot start authoritative runtime while ${state}`);state='starting';try{address=await server.listen();authoritative.start();state='running';log({event:'listening',address,path:server.path,worldId:normalized.worldId,tickRate:DEFAULT_SERVER_TICK_RATE});return address;}catch(error){state='failed';creativeBreak.clear();inventories.close();replication.close();authoritative.close();try{await server.close();}catch{}report({source:'runtime-start',error});throw error;}},
    async stop(){if(state==='stopped')return;if(stopPromise)return stopPromise;stopPromise=(async()=>{const wasRunning=state==='running'||state==='starting'||state==='failed';state='stopping';creativeBreak.clear();inventories.close();replication.close();authoritative.close();if(wasRunning)try{await server.close();}catch(error){report({source:'runtime-stop',error});state='stopped';throw error;}state='stopped';log({event:'stopped',worldId:normalized.worldId});})();try{await stopPromise;}finally{stopPromise=null;}}
  };return runtime;
}
