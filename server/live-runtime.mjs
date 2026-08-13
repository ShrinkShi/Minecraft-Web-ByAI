import {createAuthoritativeServerRuntime} from './runtime.mjs';

export function createLiveAuthoritativeServerRuntime(options={}){
  const runtime=createAuthoritativeServerRuntime(options),report=typeof options?.onError==='function'?options.onError:()=>{};
  runtime.setBlock=(x,y,z,id)=>{
    const change=runtime.world.setBlock(x,y,z,id);if(!change.changed)return Object.freeze({...change,broadcast:0,failed:0});
    let broadcast=0,failed=0;
    for(const session of [...runtime.authoritative.sessions]){
      try{
        const wire=runtime.server.sendWorldBlockChange(session,{worldId:runtime.config.worldId,revision:change.revision,x:change.x,y:change.y,z:change.z,previous:change.previous,id:change.id});
        if(wire===null){failed++;try{report({source:'world-change',session,change,error:new Error('world change transport unavailable')});}catch{}}
        else broadcast++;
      }catch(error){failed++;try{report({source:'world-change',session,change,error});}catch{}}
    }
    return Object.freeze({...change,broadcast,failed});
  };
  return runtime;
}
