import {createMultiplayerServer,DEFAULT_ALLOWED_ORIGINS} from './multiplayer-server.mjs';

function parsePort(value){const port=Number(value);if(!Number.isInteger(port)||port<1||port>65535)throw new RangeError('MCWEB_WS_PORT must be an integer from 1 to 65535');return port;}
function parseOrigins(value){if(!value)return DEFAULT_ALLOWED_ORIGINS;if(value.trim()==='*')return'*';const origins=value.split(',').map(item=>item.trim()).filter(Boolean);if(!origins.length)throw new RangeError('MCWEB_ALLOWED_ORIGINS must contain at least one origin');return origins;}

const host=process.env.MCWEB_WS_HOST||'127.0.0.1',port=parsePort(process.env.MCWEB_WS_PORT||'8080'),allowedOrigins=parseOrigins(process.env.MCWEB_ALLOWED_ORIGINS);
const server=createMultiplayerServer({host,port,allowedOrigins,
  onSessionReady:({session,remoteAddress})=>console.log(`[multiplayer] session ready ${session} from ${remoteAddress||'unknown'}`),
  onSessionClose:({session,code})=>console.log(`[multiplayer] session closed ${session||'pre-handshake'} code=${code}`),
  onSocketError:({session,error})=>console.error(`[multiplayer] socket error ${session||'pre-handshake'}:`,error)
});

await server.listen();const address=server.address();
console.log(`[multiplayer] listening on ws://${address.address}:${address.port}${server.path}`);
console.log(`[multiplayer] allowed origins: ${allowedOrigins==='*'?'*':allowedOrigins.join(', ')}`);

let shuttingDown=false;
async function shutdown(signal){if(shuttingDown)return;shuttingDown=true;console.log(`[multiplayer] ${signal}: shutting down`);try{await server.close();process.exitCode=0;}catch(error){console.error('[multiplayer] shutdown failed',error);process.exitCode=1;}}
process.on('SIGINT',()=>shutdown('SIGINT'));process.on('SIGTERM',()=>shutdown('SIGTERM'));
