function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function worldLike(value){if(!value||typeof value!=='object'||typeof value.setBlock!=='function')throw new TypeError('world must expose setBlock');return value;}

export class WorldChangeHub{
  constructor({world,getSessions,sendChange,onSendError=()=>{}}={}){
    this.world=worldLike(world);this.getSessions=callback(getSessions,'getSessions');this.sendChange=callback(sendChange,'sendChange');this.onSendError=callback(onSendError,'onSendError');
  }

  report(event){try{this.onSendError(event);}catch{}}

  setBlock(x,y,z,id){
    const change=this.world.setBlock(x,y,z,id);if(!change?.changed)return Object.freeze({...change,broadcast:0,failed:0});
    const sessions=[...this.getSessions()];let broadcast=0,failed=0;
    for(const session of sessions){
      try{const result=this.sendChange(session,change);if(result===null||result===undefined){failed++;this.report({session,change,error:new Error('world change transport unavailable')});}else broadcast++;}
      catch(error){failed++;this.report({session,change,error});}
    }
    return Object.freeze({...change,broadcast,failed});
  }
}
