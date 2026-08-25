export const CREATIVE_FLIGHT_DOUBLE_PRESS_MS=300;
export const CREATIVE_FLIGHT_MODES=Object.freeze(['survival','adventure','creative','spectator']);
const MODE_SET=new Set(CREATIVE_FLIGHT_MODES);

function mode(value){if(!MODE_SET.has(value))throw new RangeError(`unsupported player mode: ${value}`);return value;}
function timestamp(value){if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new RangeError('press timestamp must be a finite non-negative number');return value;}

export function normalizeFlyingForMode(playerMode,flying=false){playerMode=mode(playerMode);if(playerMode==='spectator')return true;if(playerMode!=='creative')return false;return !!flying;}
export function canToggleCreativeFlight(playerMode){return mode(playerMode)==='creative';}
export function toggleCreativeFlightState(playerMode,flying=false){playerMode=mode(playerMode);const current=normalizeFlyingForMode(playerMode,flying);if(playerMode!=='creative')return Object.freeze({changed:false,flying:current,reason:'mode-not-creative'});return Object.freeze({changed:true,flying:!current,reason:current?'flight-disabled':'flight-enabled'});}

export class CreativeFlightToggleDetector{
  constructor({windowMs=CREATIVE_FLIGHT_DOUBLE_PRESS_MS}={}){if(!Number.isFinite(windowMs)||windowMs<100||windowMs>1000)throw new RangeError('creative flight double-press window must be between 100 and 1000 ms');this.windowMs=windowMs;this.reset();}
  reset(){this.lastPressAt=null;return this;}
  press(now,playerMode){now=timestamp(now);playerMode=mode(playerMode);if(playerMode!=='creative'){this.reset();return Object.freeze({toggle:false,reason:'mode-not-creative'});}if(this.lastPressAt!==null){const elapsed=now-this.lastPressAt;if(elapsed>=0&&elapsed<=this.windowMs){this.reset();return Object.freeze({toggle:true,reason:'double-press'});}if(elapsed<0){this.lastPressAt=now;return Object.freeze({toggle:false,reason:'clock-reset'});}}
    this.lastPressAt=now;return Object.freeze({toggle:false,reason:'armed'});
  }
}
