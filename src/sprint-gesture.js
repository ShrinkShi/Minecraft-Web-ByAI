export const DEFAULT_DOUBLE_TAP_SPRINT_MS=300;

function timestamp(value){if(!Number.isFinite(value)||value<0)throw new TypeError('sprint gesture timestamp must be a non-negative finite number');return value;}

export class DoubleTapForwardSprint{
  constructor({windowMs=DEFAULT_DOUBLE_TAP_SPRINT_MS}={}){
    if(!Number.isFinite(windowMs)||windowMs<100||windowMs>1000)throw new RangeError('double-tap sprint window must be from 100 to 1000 ms');this.windowMs=windowMs;this.lastPressAt=-Infinity;this.active=false;
  }

  press(now,{repeat=false}={}){
    now=timestamp(now);if(repeat)return false;const triggered=now-this.lastPressAt<=this.windowMs;this.lastPressAt=now;if(triggered)this.active=true;return triggered;
  }
  release(){const wasActive=this.active;this.active=false;return wasActive;}
  reset(){this.lastPressAt=-Infinity;this.active=false;}
}
