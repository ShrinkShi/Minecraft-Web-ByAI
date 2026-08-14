import {assertClientSessionId} from '../src/client-input-envelope.js';
import {assertNetworkSequence} from '../src/network-sequence.js';

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function cloneTarget(value){return value?Object.freeze({x:value.x,y:value.y,z:value.z,id:value.id}):null;}
function activeOutcome(value){return !!value&&value.attempted===true&&value.target&&typeof value.progress==='number'&&Number.isFinite(value.progress)&&value.progress>0&&value.progress<1&&!value.breakResult?.changed;}

export class MiningProgressReplicationHub{
  constructor({send,onError=()=>{}}={}){this.send=callback(send,'send');this.onError=callback(onError,'onError');this.activeSessions=new Set();}
  get activeCount(){return this.activeSessions.size;}
  has(session){return this.activeSessions.has(assertClientSessionId(session));}
  report(session,error,phase){try{this.onError({session,error,phase});}catch{}}
  transmit(session,state,phase){try{const wire=this.send(session,state);if(wire===null||wire===undefined){this.report(session,new Error('mining progress transport unavailable'),phase);return false;}return true;}catch(error){this.report(session,error,phase);return false;}}
  update(session,tick,outcome){
    session=assertClientSessionId(session);tick=assertNetworkSequence(tick,'mining progress tick');
    if(activeOutcome(outcome)){
      const state=Object.freeze({session,tick,active:true,progress:outcome.progress,target:cloneTarget(outcome.target)}),sent=this.transmit(session,state,'active');if(sent)this.activeSessions.add(session);return Object.freeze({sent,active:true,state});
    }
    if(!this.activeSessions.has(session))return Object.freeze({sent:false,active:false,state:null});
    const state=Object.freeze({session,tick,active:false,progress:0,target:null}),sent=this.transmit(session,state,'reset');if(sent)this.activeSessions.delete(session);return Object.freeze({sent,active:false,state});
  }
  remove(session){session=assertClientSessionId(session);return this.activeSessions.delete(session);}
  clear(){this.activeSessions.clear();}
}
