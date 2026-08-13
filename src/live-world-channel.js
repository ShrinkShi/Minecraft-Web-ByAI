import {LiveWorldWebSocketClient} from './live-world-websocket-client.js';
import {OrderedChangeBuffer} from './ordered-change-buffer.js';

function clientFactory(value){if(typeof value!=='function')throw new TypeError('clientFactory must be a function');return value;}
function defaultClient(options){return new LiveWorldWebSocketClient(options);}

export function createLiveWorldChannel({createClient=defaultClient}={}){
  createClient=clientFactory(createClient);const buffer=new OrderedChangeBuffer();let client=null;
  return{
    bootstrapOptions:{clientFactory:options=>(client=createClient({...options,onWorldBlockChange:change=>buffer.push(Object.freeze({...change}))}))},
    attach(consumer){return buffer.attach(consumer);},
    detach(){return buffer.detach();},
    clear(){buffer.clear();},
    get pending(){return buffer.size;},
    get revision(){return client?.worldRevision??null;}
  };
}
