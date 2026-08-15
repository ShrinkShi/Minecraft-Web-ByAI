import {assertClientSessionId} from '../src/client-input-envelope.js';
import {SERVER_PLAYER_TICK_DT,SERVER_PLAYER_MODES,ServerPlayerSimulation} from './player-simulation.mjs';
import {ServerTerrainWorld} from './terrain-world.mjs';

export const AUTHORITATIVE_WORLD_TICK_MS=SERVER_PLAYER_TICK_DT*1000;
export const DEFAULT_AUTHORITATIVE_SPAWN_X=0;
export const DEFAULT_AUTHORITATIVE_SPAWN_Z=0;
export const DEFAULT_AUTHORITATIVE_PREFETCH_RADIUS=1;
const MODE_SET=new Set(SERVER_PLAYER_MODES);

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function integer(value,label){if(!Number.isInteger(value))throw new TypeError(`${label} must be an integer`);return value;}
function mode(value){if(!MODE_SET.has(value))throw new RangeError(`unsupported authoritative world player mode: ${value}`);return value;}
function prefetchRadius(value){value=integer(value,'prefetchRadius');if(value<0||value>16)throw new RangeError('prefetchRadius must be an integer from 0 to 16');return value;}
function worldLike(value){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('world must be an object');if(!value.environment||typeof value.environment!=='object')throw new TypeError('world.environment must be an object');for(const name of ['highestSolid','prefetchAround'])if(typeof value[name]!=='function')throw new TypeError(`world.${name} must be a function`);return value;}
function simulationLike(value){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('simulation must be an object');for(const name of ['addSession','removeSession','hasSession','snapshot','step','setMode','relocate','applyVelocityImpulse'])if(typeof value[name]!=='function')throw new TypeError(`simulation.${name} must be a function`);return value;}
function cloneJoinInfo(value){return{session:value.session,spawn:{...value.spawn},snapshot:{...value.snapshot,position:{...value.snapshot.position},velocity:{...value.snapshot.velocity}}};}

export class AuthoritativeWorldSession{
  constructor({world=null,worldOptions={},simulation=null,getInputState,sendPlayerSnapshot,setIntervalFn=setInterval,clearIntervalFn=clearInterval,onSessionError=()=>{},onTick=()=>{},defaultMode='survival',spawnX=DEFAULT_AUTHORITATIVE_SPAWN_X,spawnZ=DEFAULT_AUTHORITATIVE_SPAWN_Z,prefetchRadius:initialPrefetchRadius=DEFAULT_AUTHORITATIVE_PREFETCH_RADIUS}={}){
    if(world===null){if(!worldOptions||typeof worldOptions!=='object'||Array.isArray(worldOptions))throw new TypeError('worldOptions must be an object');world=new ServerTerrainWorld(worldOptions);}this.world=worldLike(world);this.simulation=simulation===null?new ServerPlayerSimulation(this.world.environment):simulationLike(simulation);this.getInputState=callback(getInputState,'getInputState');this.sendPlayerSnapshot=callback(sendPlayerSnapshot,'sendPlayerSnapshot');this.setIntervalFn=callback(setIntervalFn,'setIntervalFn');this.clearIntervalFn=callback(clearIntervalFn,'clearIntervalFn');this.onSessionError=callback(onSessionError,'onSessionError');this.onTick=callback(onTick,'onTick');this.defaultMode=mode(defaultMode);this.spawnX=finite(spawnX,'spawnX');this.spawnZ=finite(spawnZ,'spawnZ');this.prefetchRadius=prefetchRadius(initialPrefetchRadius);this.sessions=new Set();this.timer=null;
  }
  get sessionCount(){return this.sessions.size;}
  get running(){return this.timer!==null;}
  hasSession(session){session=assertClientSessionId(session);return this.sessions.has(session);}
  snapshot(session){session=assertClientSessionId(session);return this.sessions.has(session)?this.simulation.snapshot(session):null;}
  spawnPosition(x=this.spawnX,z=this.spawnZ,prefetch=this.prefetchRadius){x=finite(x,'spawnX');z=finite(z,'spawnZ');prefetch=prefetchRadius(prefetch);this.world.prefetchAround(x,z,prefetch);const blockX=Math.floor(x),blockZ=Math.floor(z),ground=this.world.highestSolid(blockX,blockZ);return{x:blockX+.5,y:ground+1.001,z:blockZ+.5,ground};}
  join(session,{mode:playerMode=this.defaultMode,spawnX=this.spawnX,spawnZ=this.spawnZ,prefetchRadius:joinPrefetch=this.prefetchRadius}={}){session=assertClientSessionId(session);if(this.sessions.has(session)||this.simulation.hasSession(session))throw new Error(`authoritative world session already joined: ${session}`);playerMode=mode(playerMode);const spawn=this.spawnPosition(spawnX,spawnZ,joinPrefetch),snapshot=this.simulation.addSession(session,{position:spawn,mode:playerMode});this.sessions.add(session);try{const wire=this.sendPlayerSnapshot(session,snapshot);if(wire===null||wire===undefined)throw new Error('initial authoritative snapshot transport is unavailable');}catch(error){this.sessions.delete(session);this.simulation.removeSession(session);throw error;}return cloneJoinInfo({session,spawn,snapshot});}
  leave(session){session=assertClientSessionId(session);const joined=this.sessions.delete(session),removed=this.simulation.removeSession(session);return joined||removed;}
  setMode(session,nextMode){session=assertClientSessionId(session);if(!this.sessions.has(session))throw new Error(`unknown authoritative world session: ${session}`);return this.simulation.setMode(session,mode(nextMode));}
  applyVelocityImpulse(session,impulse){session=assertClientSessionId(session);if(!this.sessions.has(session))throw new Error(`unknown authoritative world session: ${session}`);return this.simulation.applyVelocityImpulse(session,impulse);}
  respawn(session,{spawnX=this.spawnX,spawnZ=this.spawnZ,prefetchRadius:respawnPrefetch=this.prefetchRadius}={}){session=assertClientSessionId(session);if(!this.sessions.has(session))throw new Error(`unknown authoritative world session: ${session}`);const spawn=this.spawnPosition(spawnX,spawnZ,respawnPrefetch),snapshot=this.simulation.relocate(session,spawn,{velocity:{x:0,y:0,z:0}});return cloneJoinInfo({session,spawn,snapshot});}
  reportSessionError(session,error,phase){try{this.onSessionError({session,error,phase});}catch{}}
  tickSession(session){session=assertClientSessionId(session);if(!this.sessions.has(session))return{session,stepped:false,sent:false,reason:'not-joined'};let inputState;try{inputState=this.getInputState(session);}catch(error){this.reportSessionError(session,error,'input');this.leave(session);return{session,stepped:false,sent:false,reason:'input-error'};}if(inputState===null||inputState===undefined)return{session,stepped:false,sent:false,reason:'input-unavailable'};let snapshot;try{snapshot=this.simulation.step(session,inputState);}catch(error){this.reportSessionError(session,error,'simulation');this.leave(session);return{session,stepped:false,sent:false,reason:'simulation-error'};}try{const wire=this.sendPlayerSnapshot(session,snapshot);return{session,stepped:true,sent:wire!==null&&wire!==undefined,reason:wire===null||wire===undefined?'transport-unavailable':'snapshot-sent',snapshot};}catch(error){this.reportSessionError(session,error,'snapshot');this.leave(session);return{session,stepped:true,sent:false,reason:'snapshot-error',snapshot};}}
  tickOnce(){const results=[];for(const session of [...this.sessions])results.push(this.tickSession(session));try{this.onTick(Object.freeze({dt:SERVER_PLAYER_TICK_DT,results:Object.freeze(results)}));}catch(error){this.reportSessionError(null,error,'post-tick');}return results;}
  start(){if(this.timer!==null)return false;this.timer=this.setIntervalFn(()=>{try{this.tickOnce();}catch(error){this.reportSessionError(null,error,'tick-loop');}},AUTHORITATIVE_WORLD_TICK_MS);return true;}
  stop(){if(this.timer===null)return false;const timer=this.timer;this.timer=null;this.clearIntervalFn(timer);return true;}
  close(){this.stop();for(const session of [...this.sessions])this.leave(session);}
}
