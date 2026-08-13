import {TERRAIN_GENERATOR_VERSION} from '../src/terrain-generator.js';
import {DEFAULT_SERVER_TICK_RATE} from '../src/server-world-info.js';
import {createMultiplayerServer} from './multiplayer-server.mjs';
import {ServerTerrainWorld} from './terrain-world.mjs';
import {AuthoritativeWorldSession} from './authoritative-world-session.mjs';
import {normalizeRuntimeConfig} from './runtime-config.mjs';

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}

export function createAuthoritativeServerRuntime({
  config={},
  setIntervalFn=setInterval,
  clearIntervalFn=clearInterval,
  onLog=()=>{},
  onError=()=>{}
}={}){
  const normalized=normalizeRuntimeConfig(config),log=callback(onLog,'onLog'),report=callback(onError,'onError');
  const world=new ServerTerrainWorld({seed:normalized.seed,prompt:normalized.prompt,maxCacheChunks:normalized.terrainCacheChunks});
  let server=null;
  const authoritative=new AuthoritativeWorldSession({
    world,
    getInputState:session=>server?.getSessionInputState(session)??null,
    sendPlayerSnapshot:(session,snapshot)=>server?.sendPlayerSnapshot(session,snapshot)??null,
    setIntervalFn,
    clearIntervalFn,
    onSessionError:event=>report({source:'world-session',...event}),
    defaultMode:normalized.mode,
    spawnX:normalized.spawnX,
    spawnZ:normalized.spawnZ,
    prefetchRadius:normalized.prefetchRadius
  });

  server=createMultiplayerServer({
    host:normalized.host,
    port:normalized.port,
    allowedOrigins:normalized.allowedOrigins,
    allowMissingOrigin:normalized.allowMissingOrigin,
    onSessionReady:({session})=>{
      const info=server.sendWorldInfo(session,{session,worldId:normalized.worldId,terrainVersion:TERRAIN_GENERATOR_VERSION,seed:normalized.seed,prompt:normalized.prompt,tickRate:DEFAULT_SERVER_TICK_RATE});
      if(info===null)throw new Error('world info transport is unavailable');
      authoritative.join(session,{mode:normalized.mode});
    },
    onSessionClose:({session})=>{if(session)authoritative.leave(session);},
    onSocketError:event=>report({source:'socket',...event})
  });

  let state='idle',address=null,stopPromise=null;
  const runtime={
    config:normalized,world,server,authoritative,
    get state(){return state;},
    get running(){return state==='running';},
    get address(){return address;},
    async start(){
      if(state==='running')return address;
      if(state!=='idle')throw new Error(`cannot start authoritative runtime while ${state}`);
      state='starting';
      try{
        address=await server.listen();authoritative.start();state='running';
        log({event:'listening',address,path:server.path,worldId:normalized.worldId,tickRate:DEFAULT_SERVER_TICK_RATE});return address;
      }catch(error){
        state='failed';authoritative.close();try{await server.close();}catch{}report({source:'runtime-start',error});throw error;
      }
    },
    async stop(){
      if(state==='stopped')return;
      if(stopPromise)return stopPromise;
      stopPromise=(async()=>{
        const wasRunning=state==='running'||state==='starting'||state==='failed';state='stopping';authoritative.close();
        if(wasRunning)try{await server.close();}catch(error){report({source:'runtime-stop',error});state='stopped';throw error;}
        state='stopped';log({event:'stopped',worldId:normalized.worldId});
      })();
      try{await stopPromise;}finally{stopPromise=null;}
    }
  };
  return runtime;
}
