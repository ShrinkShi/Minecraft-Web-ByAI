import {assertClientSessionId} from '../src/client-input-envelope.js';
import {normalizeControlState} from '../src/control-intents.js';
import {normalizePlayerYaw,PLAYER_VIEW_MAX_PITCH} from '../src/player-view-frame.js';
import {planPlayerMotionStep} from '../src/player-motion-rules.js';
import {
  PLAYER_COLLISION_RADIUS,
  PLAYER_COLLISION_HEIGHT,
  PLAYER_EYE_HEIGHT,
  PLAYER_WATER_EXIT_STEP_HEIGHT,
  playerCollidesBlocks,
  resolvePlayerAxisMove,
  probePlayerGrounded,
  samplePlayerWaterCoverage
} from '../src/player-environment-rules.js';

export const SERVER_PLAYER_TICK_RATE=20;
export const SERVER_PLAYER_TICK_DT=1/SERVER_PLAYER_TICK_RATE;
export const SERVER_PLAYER_MODES=Object.freeze(['survival','adventure','creative','spectator']);
const MODE_SET=new Set(SERVER_PLAYER_MODES);

function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function vector3(value,label,{defaultZero=false}={}){if((value===undefined||value===null)&&defaultZero)return{x:0,y:0,z:0};if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return{x:finite(value.x,`${label}.x`),y:finite(value.y,`${label}.y`),z:finite(value.z,`${label}.z`)};}
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function mode(value){if(!MODE_SET.has(value))throw new RangeError(`unsupported server player mode: ${value}`);return value;}
function pitch(value){value=finite(value,'pitch');if(value<-PLAYER_VIEW_MAX_PITCH||value>PLAYER_VIEW_MAX_PITCH)throw new RangeError('pitch is out of range');return value;}
function cloneState(state){if(!state)return null;return{session:state.session,tick:state.tick,position:{...state.position},velocity:{...state.velocity},yaw:state.yaw,pitch:state.pitch,mode:state.mode,flying:state.flying,grounded:state.grounded,swimCoverage:state.swimCoverage,voided:state.voided};}
function validateEnvironment(environment){if(!environment||typeof environment!=='object'||Array.isArray(environment))throw new TypeError('environment must be an object');return{isSolidBlock:callback(environment.isSolidBlock,'environment.isSolidBlock'),isLiquidBlock:callback(environment.isLiquidBlock,'environment.isLiquidBlock')};}
function normalizedInput(inputState,session){if(inputState===null||inputState===undefined)return{control:normalizeControlState(),view:null};if(typeof inputState!=='object'||Array.isArray(inputState))throw new TypeError('inputState must be an object');if(inputState.session!==undefined&&inputState.session!==session)throw new RangeError('inputState session does not match simulation session');const control=inputState.control?normalizeControlState(inputState.control):normalizeControlState();let view=null;if(inputState.view){if(typeof inputState.view!=='object'||Array.isArray(inputState.view))throw new TypeError('inputState.view must be an object');view={yaw:normalizePlayerYaw(inputState.view.yaw),pitch:pitch(inputState.view.pitch)};}return{control,view};}

export class ServerPlayerSimulation{
  constructor(environment){this.environment=validateEnvironment(environment);this.players=new Map();}
  addSession(session,{position,velocity={x:0,y:0,z:0},yaw=0,pitch:initialPitch=0,mode:initialMode='survival'}={}){session=assertClientSessionId(session);if(this.players.has(session))throw new Error(`server player session already exists: ${session}`);const playerMode=mode(initialMode),state={session,tick:0,position:vector3(position,'position'),velocity:vector3(velocity,'velocity'),yaw:normalizePlayerYaw(yaw),pitch:pitch(initialPitch),mode:playerMode,flying:playerMode==='creative'||playerMode==='spectator',grounded:false,swimCoverage:0,voided:false};this.players.set(session,state);return cloneState(state);}
  removeSession(session){session=assertClientSessionId(session);return this.players.delete(session);}
  hasSession(session){session=assertClientSessionId(session);return this.players.has(session);}
  snapshot(session){session=assertClientSessionId(session);return cloneState(this.players.get(session));}
  get sessionCount(){return this.players.size;}
  setMode(session,nextMode){session=assertClientSessionId(session);const state=this.players.get(session);if(!state)throw new Error(`unknown server player session: ${session}`);state.mode=mode(nextMode);state.flying=state.mode==='creative'||state.mode==='spectator';if(state.flying)state.swimCoverage=0;return cloneState(state);}
  relocate(session,positionValue,{velocity={x:0,y:0,z:0}}={}){session=assertClientSessionId(session);const state=this.players.get(session);if(!state)throw new Error(`unknown server player session: ${session}`);state.position=vector3(positionValue,'relocate position');state.velocity=vector3(velocity,'relocate velocity');state.grounded=false;state.swimCoverage=0;state.voided=false;return cloneState(state);}
  applyVelocityImpulse(session,impulse){session=assertClientSessionId(session);const state=this.players.get(session);if(!state)throw new Error(`unknown server player session: ${session}`);const delta=vector3(impulse,'velocity impulse');state.velocity.x+=delta.x;state.velocity.y+=delta.y;state.velocity.z+=delta.z;return cloneState(state);}
  collides(state,position){if(state.mode==='spectator')return false;return playerCollidesBlocks(position,this.environment.isSolidBlock,{radius:PLAYER_COLLISION_RADIUS,height:PLAYER_COLLISION_HEIGHT});}
  moveAxis(state,axis,amount,{stepHeight=0}={}){if(!amount)return null;const result=resolvePlayerAxisMove({position:state.position,velocity:state.velocity,grounded:state.grounded,axis,amount,collides:position=>this.collides(state,position),stepHeight});state.position=result.position;state.velocity=result.velocity;state.grounded=result.grounded;return result;}
  step(session,inputState=null){session=assertClientSessionId(session);const state=this.players.get(session);if(!state)throw new Error(`unknown server player session: ${session}`);const input=normalizedInput(inputState,session);if(input.view){state.yaw=input.view.yaw;state.pitch=input.view.pitch;}state.flying=state.mode==='creative'||state.mode==='spectator';state.swimCoverage=state.flying?0:samplePlayerWaterCoverage(state.position,this.environment.isLiquidBlock,{eyeHeight:PLAYER_EYE_HEIGHT});const groundedForJump=!state.flying&&state.swimCoverage===0&&input.control.jump&&probePlayerGrounded(state.position,position=>this.collides(state,position));const motion=planPlayerMotionStep({dt:SERVER_PLAYER_TICK_DT,yaw:state.yaw,control:input.control,velocity:state.velocity,flying:state.flying,swimCoverage:state.swimCoverage,grounded:groundedForJump});state.velocity={...motion.velocity};if(state.flying){this.moveAxis(state,'x',motion.displacement.x);this.moveAxis(state,'z',motion.displacement.z);this.moveAxis(state,'y',motion.displacement.y);state.velocity={x:0,y:0,z:0};}else{state.grounded=false;const waterExitStep=input.control.jump&&state.swimCoverage>0?PLAYER_WATER_EXIT_STEP_HEIGHT:0;const xMove=this.moveAxis(state,'x',motion.displacement.x,{stepHeight:waterExitStep});this.moveAxis(state,'z',motion.displacement.z,{stepHeight:xMove?.stepped?0:waterExitStep});this.moveAxis(state,'y',motion.displacement.y);state.velocity.x*=motion.horizontalDrag;state.velocity.z*=motion.horizontalDrag;}state.voided=state.position.y<-10;state.tick=(state.tick+1)>>>0;return cloneState(state);}
  stepAll(inputProvider=()=>null){const provider=callback(inputProvider,'inputProvider'),snapshots=[];for(const session of this.players.keys())snapshots.push(this.step(session,provider(session)));return snapshots;}
}
