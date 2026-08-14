export const CONTROL_INTENT_VERSION=1;
export const CONTINUOUS_CONTROLS=Object.freeze(['jump','sneak','sprint','primary']);
export const CONTROL_ACTIONS=Object.freeze(['focus','escape','pause','inventory','view','chat','drop','hotbar-select','hotbar-step','secondary']);

const clamp=(value,min=-1,max=1)=>Math.max(min,Math.min(max,Number(value)||0));
const buttonSet=new Set(CONTINUOUS_CONTROLS),actionSet=new Set(CONTROL_ACTIONS),actionInterceptors=new Set(),primaryInterceptors=new Set();

function emptySource(){return{side:0,forward:0,buttons:new Set()};}
function sameState(a,b){return a.side===b.side&&a.forward===b.forward&&CONTINUOUS_CONTROLS.every(name=>a[name]===b[name]);}
function registerInterceptor(set,handler,label){if(typeof handler!=='function')throw new TypeError(`${label} interceptor must be a function`);set.add(handler);let active=true;return()=>{if(!active)return false;active=false;return set.delete(handler);};}

export function normalizeControlState(value={}){
  let side=clamp(value.side),forward=clamp(value.forward);const length=Math.hypot(side,forward);
  if(length>1){side/=length;forward/=length;}
  return{version:CONTROL_INTENT_VERSION,side,forward,jump:!!value.jump,sneak:!!value.sneak,sprint:!!value.sprint,primary:!!value.primary};
}

export function registerControlActionInterceptor(handler){return registerInterceptor(actionInterceptors,handler,'control action');}
export function registerControlPrimaryInterceptor(handler){return registerInterceptor(primaryInterceptors,handler,'control primary');}

export class ControlIntentBus{
  constructor(callbacks={}){this.callbacks=callbacks;this.sources=new Map();this.state=normalizeControlState();this.sequence=0;}
  source(name){if(typeof name!=='string'||!name)throw new TypeError('control source must be a non-empty string');let source=this.sources.get(name);if(!source){source=emptySource();this.sources.set(name,source);}return source;}
  setMove(sourceName,side,forward){const source=this.source(sourceName);source.side=clamp(side);source.forward=clamp(forward);return this.recompute();}
  setButton(sourceName,name,pressed){if(!buttonSet.has(name))throw new RangeError(`unknown continuous control: ${name}`);const source=this.source(sourceName);if(pressed)source.buttons.add(name);else source.buttons.delete(name);return this.recompute();}
  look(sourceName,yawDelta,pitchDelta){if(typeof sourceName!=='string'||!sourceName)return false;if(!Number.isFinite(yawDelta)||!Number.isFinite(pitchDelta))return false;this.callbacks.onLook?.({source:sourceName,yawDelta:clamp(yawDelta,-.75,.75),pitchDelta:clamp(pitchDelta,-.75,.75),sequence:++this.sequence,version:CONTROL_INTENT_VERSION});return true;}
  action(sourceName,name,payload=null){if(!actionSet.has(name))throw new RangeError(`unknown control action: ${name}`);const intent={source:sourceName,name,payload,sequence:++this.sequence,version:CONTROL_INTENT_VERSION};for(const interceptor of [...actionInterceptors]){const result=interceptor(intent);if(result!==undefined)return result;}return this.callbacks.onAction?.(intent)??false;}
  resetSource(sourceName){if(!this.sources.has(sourceName))return this.snapshot();this.sources.delete(sourceName);return this.recompute();}
  resetAll(){if(!this.sources.size&&sameState(this.state,normalizeControlState()))return this.snapshot();this.sources.clear();return this.recompute();}
  snapshot(){return{...this.state,sequence:this.sequence};}
  recompute(){
    let side=0,forward=0;const buttons=new Set();for(const source of this.sources.values()){side+=source.side;forward+=source.forward;for(const name of source.buttons)buttons.add(name);}
    const next=normalizeControlState({side,forward,...Object.fromEntries(CONTINUOUS_CONTROLS.map(name=>[name,buttons.has(name)]))}),previous=this.state,primaryChanged=next.primary!==previous.primary;
    if(!sameState(previous,next)){this.state=next;this.sequence++;this.callbacks.onState?.({...next,sequence:this.sequence});}
    if(primaryChanged){const event={sequence:this.sequence,version:CONTROL_INTENT_VERSION};let intercepted=false;for(const interceptor of [...primaryInterceptors]){const result=interceptor(next.primary,event);if(result!==undefined){intercepted=true;break;}}if(!intercepted)this.callbacks.onPrimary?.(next.primary,event);}
    return this.snapshot();
  }
}
