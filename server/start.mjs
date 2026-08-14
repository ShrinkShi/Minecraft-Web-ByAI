import {createAuthoritativeServerRuntime} from './runtime.mjs';
import {runtimeConfigFromEnv} from './runtime-config.mjs';

const config=runtimeConfigFromEnv(process.env);
const runtime=createAuthoritativeServerRuntime({
  config,
  onLog:event=>{
    if(event.event==='listening')console.log(`[multiplayer] listening on ws://${event.address.address}:${event.address.port}${event.path} world=${event.worldId} tick=${event.tickRate}Hz`);
    else if(event.event==='stopped')console.log(`[multiplayer] stopped world=${event.worldId}`);
  },
  onError:event=>console.error(`[multiplayer] ${event.source}${event.session?` session=${event.session}`:''}${event.phase?` phase=${event.phase}`:''}:`,event.error)
});

await runtime.start();
console.log(`[multiplayer] allowed origins: ${config.allowedOrigins==='*'?'*':config.allowedOrigins.join(', ')}`);
console.log(`[multiplayer] terrain seed=${JSON.stringify(config.seed)} prompt=${JSON.stringify(config.prompt)} mode=${config.mode}`);
console.log(`[multiplayer] cheat commands: ${config.allowCommands?'enabled for connected clients':'disabled (set MCWEB_ALLOW_COMMANDS=true to enable)'}`);

let shuttingDown=false;
async function shutdown(signal){
  if(shuttingDown)return;shuttingDown=true;console.log(`[multiplayer] ${signal}: shutting down`);
  try{await runtime.stop();process.exitCode=0;}catch(error){console.error('[multiplayer] shutdown failed',error);process.exitCode=1;}
}
process.once('SIGINT',()=>{void shutdown('SIGINT');});
process.once('SIGTERM',()=>{void shutdown('SIGTERM');});
