import {assertClientSessionId} from './client-input-envelope.js';
import {assertNetworkSequence,isNetworkSequenceNewer,networkSequenceDistance} from './network-sequence.js';
import {normalizePlayerYaw,PLAYER_VIEW_MAX_PITCH} from './player-view-frame.js';

export const DEFAULT_AUTHORITATIVE_INTERPOLATION_TICK_RATE=20;
export const DEFAULT_AUTHORITATIVE_SNAP_DISTANCE=2.5;
export const DEFAULT_AUTHORITATIVE_MAX_TICK_GAP=4;

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function boolean(value,label){if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function positive(value,label){value=finite(value,label);if(value<=0)throw new RangeError(`${label} must be greater than zero`);return value;}
function positiveInteger(value,label){if(!Number.isInteger(value)||value<1||value>0x7fffffff)throw new RangeError(`${label} must be a positive integer`);return value;}
function vector(value,label){value=object(value,label);return{x:finite(value.x,`${label}.x`),y:finite(value.y,`${label}.y`),z:finite(value.z,`${label}.z`)};}
function pitch(value){value=finite(value,'snapshot pitch');if(value<-PLAYER_VIEW_MAX_PITCH||value>PLAYER_VIEW_MAX_PITCH)throw new RangeError('snapshot pitch is out of range');return value;}
function coverage(value){value=finite(value,'snapshot swimCoverage');if(value<0||value>1)throw new RangeError('snapshot swimCoverage must be between 0 and 1');return value;}
function cloneState(value){return value?{...value,position:{...value.position},velocity:{...value.velocity}}:null;}
function lerp(a,b,t){return a+(b-a)*t;}
function lerpVector(a,b,t){return{x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t)};}
function lerpYaw(a,b,t){const delta=normalizePlayerYaw(b-a);return normalizePlayerYaw(a+delta*t);}
function distanceSquared(a,b){const x=a.x-b.x,y=a.y-b.y,z=a.z-b.z;return x*x+y*y+z*z;}

function normalizeSnapshot(snapshot){
  snapshot=object(snapshot,'decoded authoritative player snapshot');
  const mode=String(snapshot.mode||'');if(!['survival','adventure','creative','spectator'].includes(mode))throw new RangeError(`unsupported authoritative player mode: ${mode}`);
  const normalized={
    session:assertClientSessionId(snapshot.session),
    tick:assertNetworkSequence(snapshot.tick,'authoritative player snapshot tick'),
    position:vector(snapshot.position,'snapshot position'),
    velocity:vector(snapshot.velocity,'snapshot velocity'),
    yaw:normalizePlayerYaw(finite(snapshot.yaw,'snapshot yaw')),
    pitch:pitch(snapshot.pitch),
    mode,
    grounded:boolean(snapshot.grounded,'snapshot grounded'),
    swimCoverage:coverage(snapshot.swimCoverage),
    voided:boolean(snapshot.voided,'snapshot voided')
  };
  if(Object.prototype.hasOwnProperty.call(snapshot,'flying'))normalized.flying=boolean(snapshot.flying,'snapshot flying');
  return normalized;
}

export class AuthoritativePlayerInterpolator{
  constructor({tickRate=DEFAULT_AUTHORITATIVE_INTERPOLATION_TICK_RATE,snapDistance=DEFAULT_AUTHORITATIVE_SNAP_DISTANCE,maxTickGap=DEFAULT_AUTHORITATIVE_MAX_TICK_GAP}={}){
    this.tickRate=positive(tickRate,'tickRate');this.interval=1/this.tickRate;this.snapDistance=positive(snapDistance,'snapDistance');this.maxTickGap=positiveInteger(maxTickGap,'maxTickGap');this.reset();
  }

  reset(snapshot=null){this.session=null;this.lastTick=null;this.from=null;this.target=null;this.display=null;this.elapsed=0;if(snapshot!==null)this.accept(snapshot);return this;}
  get ready(){return this.display!==null;}
  current(){return cloneState(this.display);}

  accept(snapshot){
    const next=normalizeSnapshot(snapshot);
    if(this.session!==null&&next.session!==this.session)throw new RangeError('authoritative player interpolation session mismatch');
    if(this.lastTick!==null&&!isNetworkSequenceNewer(next.tick,this.lastTick))return{accepted:false,snapped:false,reason:'stale-or-duplicate',tick:next.tick};
    if(this.display===null){this.session=next.session;this.lastTick=next.tick;this.from=cloneState(next);this.target=cloneState(next);this.display=cloneState(next);this.elapsed=this.interval;return{accepted:true,snapped:true,reason:'initial',tick:next.tick};}

    const gap=networkSequenceDistance(next.tick,this.lastTick),tooFar=distanceSquared(this.display.position,next.position)>=this.snapDistance*this.snapDistance,tooOld=gap>this.maxTickGap;
    this.session=next.session;this.lastTick=next.tick;this.target=cloneState(next);this.elapsed=0;
    if(tooFar||tooOld){this.from=cloneState(next);this.display=cloneState(next);this.elapsed=this.interval;return{accepted:true,snapped:true,reason:tooFar?'distance-snap':'tick-gap-snap',tick:next.tick,gap};}
    this.from=cloneState(this.display);return{accepted:true,snapped:false,reason:'interpolating',tick:next.tick,gap};
  }

  step(dt){
    dt=finite(dt,'interpolation dt');if(dt<0)throw new RangeError('interpolation dt must be non-negative');if(!this.display||!this.target||!this.from)return null;
    this.elapsed=Math.min(this.interval,this.elapsed+dt);const t=this.interval===0?1:Math.min(1,this.elapsed/this.interval),target=this.target,from=this.from;
    const display={session:target.session,tick:target.tick,position:lerpVector(from.position,target.position,t),velocity:lerpVector(from.velocity,target.velocity,t),yaw:lerpYaw(from.yaw,target.yaw,t),pitch:lerp(from.pitch,target.pitch,t),mode:target.mode,grounded:target.grounded,swimCoverage:target.swimCoverage,voided:target.voided};
    if(Object.prototype.hasOwnProperty.call(target,'flying'))display.flying=target.flying;
    this.display=display;return cloneState(this.display);
  }
}
