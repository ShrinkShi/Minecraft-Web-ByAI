import {beginFoodUse,createFoodUseState,stepFoodUse} from './food-use-rules.js';
import {normalizeFoodProfile} from './hunger-rules.js';

const callback=(value,label)=>{if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;};

export class SingleplayerFoodUseRuntime{
  constructor({getMode,getSelectedStack,canStart,complete,onState=()=>{}}={}){
    this.getMode=callback(getMode,'getMode');
    this.getSelectedStack=callback(getSelectedStack,'getSelectedStack');
    this.canStart=callback(canStart,'canStart');
    this.complete=callback(complete,'complete');
    this.onState=callback(onState,'onState');
    this.state=createFoodUseState();
    this.profile=null;
    this.lastReason='idle';
  }

  start(itemId,profile){
    const food=normalizeFoodProfile(profile),selected=this.getSelectedStack();
    if(this.getMode()!=='survival')return Object.freeze({started:false,reason:'mode-invalid',state:this.snapshot()});
    if(!selected||selected.id!==itemId||selected.count<1)return Object.freeze({started:false,reason:'item-mismatch',state:this.snapshot()});
    if(!this.canStart(itemId,food))return Object.freeze({started:false,reason:'not-edible',state:this.snapshot()});
    this.profile=food;this.state=beginFoodUse(itemId);this.lastReason='using';this.emit();
    return Object.freeze({started:true,reason:'using',state:this.snapshot()});
  }

  cancel(reason='cancelled'){
    const changed=this.state.active;this.state=createFoodUseState({duration:this.state.duration});this.profile=null;this.lastReason=reason;if(changed)this.emit();return Object.freeze({cancelled:changed,reason,state:this.snapshot()});
  }

  update(dt){
    if(!this.state.active)return Object.freeze({changed:false,completed:false,reason:this.lastReason,state:this.snapshot()});
    const selected=this.getSelectedStack();
    if(this.getMode()!=='survival')return Object.freeze({...this.cancel('mode-changed'),changed:true,completed:false});
    if(!selected||selected.id!==this.state.itemId||selected.count<1)return Object.freeze({...this.cancel('item-changed'),changed:true,completed:false});
    const stepped=stepFoodUse(this.state,dt);this.state=stepped.state;if(stepped.changed)this.emit();
    if(!stepped.completed)return Object.freeze({changed:stepped.changed,completed:false,reason:'using',state:this.snapshot()});
    const itemId=selected.id,profile=this.profile;this.profile=null;
    const result=this.complete(itemId,profile);
    const completed=!!result?.consumed;this.lastReason=completed?'completed':(result?.reason||'completion-rejected');this.emit();
    return Object.freeze({changed:true,completed,reason:this.lastReason,result:result||null,state:this.snapshot()});
  }

  snapshot(){return Object.freeze({...this.state,reason:this.lastReason});}
  emit(){this.onState(this.snapshot());}
  dispose(){this.cancel('disposed');}
}
