import {CREATIVE_START,maxStack} from './items.js';

const cloneStack=stack=>stack?{id:stack.id,count:stack.count}:null;

export class Inventory{
  constructor(mode='survival',snapshot=null){
    this.slots=Array(36).fill(null);
    this.cursor=null;
    if(snapshot)this.restore(snapshot);
    else if(mode==='creative')this.seedCreative();
  }

  seedCreative(){
    CREATIVE_START.forEach((id,i)=>{this.slots[27+i]={id,count:maxStack(id)};});
  }

  snapshot(){return{slots:this.slots.map(cloneStack)};}

  restore(snapshot){
    if(!Array.isArray(snapshot?.slots))return false;
    for(let i=0;i<36;i++){
      const s=snapshot.slots[i];
      if(s?.id&&Number.isFinite(s.count)&&s.count>0)this.slots[i]={id:s.id,count:Math.min(maxStack(s.id),Math.floor(s.count))};
    }
    return true;
  }

  hotbar(index){return this.slots[27+index]||null;}

  capacityFor(itemId){
    const limit=maxStack(itemId);let capacity=0;
    for(const slot of this.slots){if(!slot)capacity+=limit;else if(slot.id===itemId)capacity+=Math.max(0,limit-slot.count);}
    return capacity;
  }

  add(itemId,count=1){
    let remaining=Math.max(0,Math.floor(count));
    const limit=maxStack(itemId);
    for(const slot of this.slots){
      if(!slot||slot.id!==itemId||slot.count>=limit)continue;
      const moved=Math.min(remaining,limit-slot.count);slot.count+=moved;remaining-=moved;if(!remaining)return 0;
    }
    for(let i=0;i<this.slots.length;i++){
      if(this.slots[i])continue;
      const moved=Math.min(remaining,limit);this.slots[i]={id:itemId,count:moved};remaining-=moved;if(!remaining)return 0;
    }
    return remaining;
  }

  removeAt(index,count=1){
    const slot=this.slots[index];if(!slot)return null;
    const taken=Math.min(slot.count,Math.max(1,Math.floor(count)));
    const result={id:slot.id,count:taken};slot.count-=taken;if(slot.count<=0)this.slots[index]=null;return result;
  }

  moveBetween(index){
    const slot=this.slots[index];if(!slot)return false;
    const targets=index<27?[27,36]:[0,27];
    let remaining=slot.count,changed=false,limit=maxStack(slot.id);
    for(let i=targets[0];i<targets[1];i++){
      const t=this.slots[i];if(!t||t.id!==slot.id||t.count>=limit)continue;
      const moved=Math.min(remaining,limit-t.count);t.count+=moved;remaining-=moved;changed=changed||moved>0;if(!remaining)break;
    }
    for(let i=targets[0];i<targets[1]&&remaining;i++){
      if(this.slots[i])continue;const moved=Math.min(remaining,limit);this.slots[i]={id:slot.id,count:moved};remaining-=moved;changed=true;
    }
    if(changed){if(remaining)this.slots[index].count=remaining;else this.slots[index]=null;}
    return changed;
  }

  click(index,button=0,shift=false){
    if(shift)return this.moveBetween(index);
    const slot=this.slots[index];
    if(button===0){
      if(!this.cursor&&slot){this.cursor=slot;this.slots[index]=null;return true;}
      if(this.cursor&&!slot){this.slots[index]=this.cursor;this.cursor=null;return true;}
      if(this.cursor&&slot&&this.cursor.id===slot.id){
        const moved=Math.min(this.cursor.count,maxStack(slot.id)-slot.count);if(!moved)return false;slot.count+=moved;this.cursor.count-=moved;if(this.cursor.count<=0)this.cursor=null;return true;
      }
      if(this.cursor&&slot){this.slots[index]=this.cursor;this.cursor=slot;return true;}
      return false;
    }
    if(button===2){
      if(!this.cursor&&slot){const take=Math.ceil(slot.count/2);this.cursor={id:slot.id,count:take};slot.count-=take;if(slot.count<=0)this.slots[index]=null;return true;}
      if(this.cursor&&!slot){this.slots[index]={id:this.cursor.id,count:1};this.cursor.count--;if(this.cursor.count<=0)this.cursor=null;return true;}
      if(this.cursor&&slot&&this.cursor.id===slot.id&&slot.count<maxStack(slot.id)){slot.count++;this.cursor.count--;if(this.cursor.count<=0)this.cursor=null;return true;}
    }
    return false;
  }

  returnCursor(){
    if(!this.cursor)return null;
    const remainder=this.add(this.cursor.id,this.cursor.count);
    const overflow=remainder?{id:this.cursor.id,count:remainder}:null;
    this.cursor=null;
    return overflow;
  }
}
