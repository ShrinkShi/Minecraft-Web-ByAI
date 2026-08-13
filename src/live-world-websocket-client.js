import {MultiplayerWebSocketClient} from './websocket-client.js';
import {WORLD_BLOCK_CHANGE_KIND,WorldBlockRevisionGate} from './world-edit-replication.js';

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}

export class LiveWorldWebSocketClient extends MultiplayerWebSocketClient{
  constructor({onWorldBlockChange=()=>{},...options}={}){
    super(options);this.onWorldBlockChange=callback(onWorldBlockChange,'onWorldBlockChange');this.worldBlockGate=null;
  }

  get worldRevision(){return this.worldBlockGate?.revision??this.worldEditSync?.revision??null;}

  resetRealtimeState(){super.resetRealtimeState();this.worldBlockGate=null;}

  handleWorldEditSync(raw){
    super.handleWorldEditSync(raw);
    if(this.state==='ready'&&this.worldEditSync&&!this.worldBlockGate)this.worldBlockGate=new WorldBlockRevisionGate(this.worldEditSync.revision);
  }

  handleWorldBlockChange(raw){
    if(!this.worldInfo||!this.worldEditSync||!this.worldBlockGate){this.protocolFailure(new Error('world block change received before initial world synchronization'),1002,'world block before initial sync');return;}
    let change;try{change=this.worldBlockGate.accept(raw,{session:this.session,worldId:this.worldInfo.worldId});}catch(error){this.protocolFailure(error,1002,'invalid world block change');return;}
    try{this.onWorldBlockChange(change);}catch(error){this.protocolFailure(error,1011,'world block change handler failed');}
  }

  handleMessage(socket,event){
    if(socket===this.socket&&this.state==='ready'&&typeof event?.data==='string'){
      try{const raw=JSON.parse(event.data);if(raw?.kind===WORLD_BLOCK_CHANGE_KIND){this.handleWorldBlockChange(raw);return;}}catch{}
    }
    return super.handleMessage(socket,event);
  }
}
