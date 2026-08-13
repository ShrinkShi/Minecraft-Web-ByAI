function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}

export class OrderedChangeBuffer{
  constructor(){this.consumer=null;this.queue=[];}
  get size(){return this.queue.length;}
  push(value){if(this.consumer)return this.consumer(value);this.queue.push(value);return value;}
  attach(consumer){consumer=callback(consumer,'consumer');if(this.consumer)throw new Error('consumer is already attached');this.consumer=consumer;const pending=this.queue;this.queue=[];try{for(const value of pending)consumer(value);}catch(error){this.consumer=null;throw error;}return pending.length;}
  detach(){const consumer=this.consumer;this.consumer=null;return consumer;}
  clear(){this.queue=[];this.consumer=null;}
}
