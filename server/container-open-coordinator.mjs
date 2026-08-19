import {assertClientSessionId} from '../src/client-input-envelope.js';

const coordinators=new WeakMap();
function ownerObject(value){if(!value||typeof value!=='object'&&typeof value!=='function')throw new TypeError('container coordinator owner must be an object');return value;}
function kind(value){if(typeof value!=='string'||!/^[a-z0-9-]{1,64}$/u.test(value))throw new RangeError('container kind must be 1 to 64 lowercase ASCII characters, digits, or hyphens');return value;}
function closer(value){if(typeof value!=='function')throw new TypeError('container closer must be a function');return value;}

export class ServerContainerOpenCoordinator{
  constructor(){this.owners=new Map();this.closers=new Map();}
  register(containerKind,close){containerKind=kind(containerKind);close=closer(close);if(this.closers.has(containerKind))throw new Error(`container closer already registered: ${containerKind}`);this.closers.set(containerKind,close);let released=false;return()=>{if(released)return false;released=true;if(this.closers.get(containerKind)!==close)return false;this.closers.delete(containerKind);for(const[session,current]of [...this.owners])if(current===containerKind)this.owners.delete(session);return true;};}
  owner(session){return this.owners.get(assertClientSessionId(session))||null;}
  claim(containerKind,session){containerKind=kind(containerKind);session=assertClientSessionId(session);if(!this.closers.has(containerKind))throw new Error(`container closer is not registered: ${containerKind}`);const previous=this.owners.get(session)||null;if(previous===containerKind)return Object.freeze({changed:false,previous,current:containerKind});if(previous){const close=this.closers.get(previous);if(typeof close!=='function')throw new Error(`container closer disappeared: ${previous}`);close(session,'switched-container');if(this.owners.get(session)===previous)this.owners.delete(session);}this.owners.set(session,containerKind);return Object.freeze({changed:true,previous,current:containerKind});}
  release(containerKind,session){containerKind=kind(containerKind);session=assertClientSessionId(session);if(this.owners.get(session)!==containerKind)return false;this.owners.delete(session);return true;}
  clear(){this.owners.clear();this.closers.clear();}
}

export function containerOpenCoordinatorFor(owner){owner=ownerObject(owner);let coordinator=coordinators.get(owner);if(!coordinator){coordinator=new ServerContainerOpenCoordinator();coordinators.set(owner,coordinator);}return coordinator;}
