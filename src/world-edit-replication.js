import {BLOCKS,CHUNK_SIZE,WORLD_HEIGHT} from './blocks.js';
import {blockIdentityEqual,blockIdentityFromKey} from './block-state-sidecar.js';
import {assertClientSessionId} from './client-input-envelope.js';
import {assertNetworkSequence,nextNetworkSequence} from './network-sequence.js';

export const WORLD_EDIT_REPLICATION_VERSION=2;
export const WORLD_EDIT_SYNC_BEGIN_KIND='world-edit-sync-begin';
export const WORLD_EDIT_SYNC_CHUNK_KIND='world-edit-sync-chunk';
export const WORLD_EDIT_SYNC_END_KIND='world-edit-sync-end';
export const WORLD_BLOCK_CHANGE_KIND='world-block-change';
export const WORLD_EDIT_SYNC_CHUNK_SIZE=128;
export const WORLD_EDIT_MAX_TOTAL=1_000_000;
const WORLD_ID_PATTERN=/^[A-Za-z0-9._:-]{1,64}$/;
const BEGIN_KEYS=Object.freeze(['chunkCount','kind','revision','session','totalEdits','v','worldId']);
const CHUNK_KEYS=Object.freeze(['edits','index','kind','revision','session','v','worldId']);
const END_KEYS=Object.freeze(['chunkCount','kind','revision','session','v','worldId']);
const CHANGE_KEYS=Object.freeze(['id','kind','position','previous','previousStateKey','revision','session','stateKey','v','worldId']);
const floorDiv=(value,divisor)=>Math.floor(value/divisor);
const mod=(value,divisor)=>((value%divisor)+divisor)%divisor;

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,expected,label){const keys=Object.keys(value).sort();if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);}
function integer(value,label,{min=Number.MIN_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER}={}){if(!Number.isSafeInteger(value)||value<min||value>max)throw new RangeError(`${label} must be a safe integer from ${min} to ${max}`);return value;}
function worldId(value){if(typeof value!=='string'||!WORLD_ID_PATTERN.test(value))throw new RangeError('world edit worldId must be 1..64 safe ASCII characters');return value;}
function blockId(value,label='block id'){if(!Number.isInteger(value)||value<0||!BLOCKS[value])throw new RangeError(`${label} must reference a known block`);return value;}
function blockIdentity(id,stateKey,label='block identity'){return blockIdentityFromKey(blockId(id,`${label}.id`),stateKey??null);}
function position(value,label='world edit position'){if(!Array.isArray(value)||value.length!==3)throw new TypeError(`${label} must be [x,y,z]`);return{x:integer(value[0],`${label}.x`),y:integer(value[1],`${label}.y`,{min:0,max:WORLD_HEIGHT-1}),z:integer(value[2],`${label}.z`)};}
function editTuple(value,label='world edit'){
  if(!Array.isArray(value)||value.length!==5)throw new TypeError(`${label} must be [x,y,z,id,stateKey]`);
  const p=position(value.slice(0,3),label),identity=blockIdentity(value[3],value[4],label);
  return{x:p.x,y:p.y,z:p.z,id:identity.id,stateKey:identity.stateKey};
}
function normalizeEdit(value,label){if(Array.isArray(value))return editTuple(value,label);value=object(value,label);return editTuple([value.x,value.y,value.z,value.id,value.stateKey??null],label);}
function authoritativeIdentity(value,label){if(Number.isInteger(value))return blockIdentity(value,null,label);value=object(value,label);exactKeys(value,['id','stateKey'],label);return blockIdentity(value.id,value.stateKey,label);}
function syncCount(value,label){return integer(value,label,{min:0,max:WORLD_EDIT_MAX_TOTAL});}
function chunkCount(value){return integer(value,'world edit chunkCount',{min:0,max:Math.ceil(WORLD_EDIT_MAX_TOTAL/WORLD_EDIT_SYNC_CHUNK_SIZE)});}
function index(value){return integer(value,'world edit chunk index',{min:0,max:Math.ceil(WORLD_EDIT_MAX_TOTAL/WORLD_EDIT_SYNC_CHUNK_SIZE)-1});}
function identity(message){return{session:assertClientSessionId(message.session),worldId:worldId(message.worldId),revision:assertNetworkSequence(message.revision,'world edit revision')};}
function encodeIdentity(kind,{session,worldId:wid,revision}){return{v:WORLD_EDIT_REPLICATION_VERSION,kind,session:assertClientSessionId(session),worldId:worldId(wid),revision:assertNetworkSequence(revision,'world edit revision')};}
function voxelLocation(coordinate){
  const parts=coordinate.split(',');if(parts.length!==3)throw new RangeError(`invalid authoritative world edit coordinate: ${coordinate}`);
  const p=position(parts.map(Number),'authoritative world edit coordinate'),cx=floorDiv(p.x,CHUNK_SIZE),cz=floorDiv(p.z,CHUNK_SIZE),lx=mod(p.x,CHUNK_SIZE),lz=mod(p.z,CHUNK_SIZE),localIndex=lx+CHUNK_SIZE*(lz+CHUNK_SIZE*p.y);
  return{p,key:`${cx},${cz}`,localIndex};
}

export function isWorldEditReplicationKind(kind){return kind===WORLD_EDIT_SYNC_BEGIN_KIND||kind===WORLD_EDIT_SYNC_CHUNK_KIND||kind===WORLD_EDIT_SYNC_END_KIND||kind===WORLD_BLOCK_CHANGE_KIND;}
export function encodeWorldEditSyncBegin({session,worldId:wid,revision,totalEdits,chunkCount:chunks}){return{...encodeIdentity(WORLD_EDIT_SYNC_BEGIN_KIND,{session,worldId:wid,revision}),totalEdits:syncCount(totalEdits,'world edit totalEdits'),chunkCount:chunkCount(chunks)};}
export function encodeWorldEditSyncChunk({session,worldId:wid,revision,index:chunkIndex,edits}){if(!Array.isArray(edits)||edits.length<1||edits.length>WORLD_EDIT_SYNC_CHUNK_SIZE)throw new RangeError(`world edit sync chunk must contain 1 to ${WORLD_EDIT_SYNC_CHUNK_SIZE} edits`);return{...encodeIdentity(WORLD_EDIT_SYNC_CHUNK_KIND,{session,worldId:wid,revision}),index:index(chunkIndex),edits:edits.map((value,i)=>{const e=normalizeEdit(value,`world edit ${i}`);return[e.x,e.y,e.z,e.id,e.stateKey];})};}
export function encodeWorldEditSyncEnd({session,worldId:wid,revision,chunkCount:chunks}){return{...encodeIdentity(WORLD_EDIT_SYNC_END_KIND,{session,worldId:wid,revision}),chunkCount:chunkCount(chunks)};}
export function encodeWorldBlockChange({session,worldId:wid,revision,x,y,z,previous,previousStateKey=null,id,stateKey=null}){
  const previousIdentity=blockIdentity(previous,previousStateKey,'world block previous'),nextIdentity=blockIdentity(id,stateKey,'world block');
  return{...encodeIdentity(WORLD_BLOCK_CHANGE_KIND,{session,worldId:wid,revision}),position:[integer(x,'world block x'),integer(y,'world block y',{min:0,max:WORLD_HEIGHT-1}),integer(z,'world block z')],previous:previousIdentity.id,previousStateKey:previousIdentity.stateKey,id:nextIdentity.id,stateKey:nextIdentity.stateKey};
}

export function decodeWorldEditReplication(value,{expectedSession=null,expectedWorldId=null}={}){
  value=object(value,'world edit replication');if(value.v!==WORLD_EDIT_REPLICATION_VERSION)throw new RangeError(`unsupported world edit replication version: ${value.v}`);let expected;if(value.kind===WORLD_EDIT_SYNC_BEGIN_KIND)expected=BEGIN_KEYS;else if(value.kind===WORLD_EDIT_SYNC_CHUNK_KIND)expected=CHUNK_KEYS;else if(value.kind===WORLD_EDIT_SYNC_END_KIND)expected=END_KEYS;else if(value.kind===WORLD_BLOCK_CHANGE_KIND)expected=CHANGE_KEYS;else throw new RangeError(`unsupported world edit replication kind: ${value.kind}`);exactKeys(value,expected,'world edit replication');const identityValue=identity(value);if(expectedSession!==null&&identityValue.session!==assertClientSessionId(expectedSession))throw new RangeError('world edit session mismatch');if(expectedWorldId!==null&&identityValue.worldId!==worldId(expectedWorldId))throw new RangeError('world edit worldId mismatch');
  if(value.kind===WORLD_EDIT_SYNC_BEGIN_KIND)return{version:WORLD_EDIT_REPLICATION_VERSION,kind:value.kind,...identityValue,totalEdits:syncCount(value.totalEdits,'world edit totalEdits'),chunkCount:chunkCount(value.chunkCount)};
  if(value.kind===WORLD_EDIT_SYNC_CHUNK_KIND){if(!Array.isArray(value.edits)||value.edits.length<1||value.edits.length>WORLD_EDIT_SYNC_CHUNK_SIZE)throw new RangeError(`world edit sync chunk must contain 1 to ${WORLD_EDIT_SYNC_CHUNK_SIZE} edits`);return{version:WORLD_EDIT_REPLICATION_VERSION,kind:value.kind,...identityValue,index:index(value.index),edits:value.edits.map((edit,i)=>editTuple(edit,`world edit ${i}`))};}
  if(value.kind===WORLD_EDIT_SYNC_END_KIND)return{version:WORLD_EDIT_REPLICATION_VERSION,kind:value.kind,...identityValue,chunkCount:chunkCount(value.chunkCount)};
  const p=position(value.position,'world block position'),previousIdentity=blockIdentity(value.previous,value.previousStateKey,'world block previous'),nextIdentity=blockIdentity(value.id,value.stateKey,'world block');
  return{version:WORLD_EDIT_REPLICATION_VERSION,kind:value.kind,...identityValue,x:p.x,y:p.y,z:p.z,previous:previousIdentity.id,previousStateKey:previousIdentity.stateKey,id:nextIdentity.id,stateKey:nextIdentity.stateKey};
}

export function encodeWorldEditSync({session,worldId:wid,revision,edits=[]}){if(!Array.isArray(edits))throw new TypeError('world edits must be an array');if(edits.length>WORLD_EDIT_MAX_TOTAL)throw new RangeError(`world edit sync exceeds ${WORLD_EDIT_MAX_TOTAL} edits`);const chunks=Math.ceil(edits.length/WORLD_EDIT_SYNC_CHUNK_SIZE),messages=[encodeWorldEditSyncBegin({session,worldId:wid,revision,totalEdits:edits.length,chunkCount:chunks})];for(let i=0;i<chunks;i++)messages.push(encodeWorldEditSyncChunk({session,worldId:wid,revision,index:i,edits:edits.slice(i*WORLD_EDIT_SYNC_CHUNK_SIZE,(i+1)*WORLD_EDIT_SYNC_CHUNK_SIZE)}));messages.push(encodeWorldEditSyncEnd({session,worldId:wid,revision,chunkCount:chunks}));return messages;}

export function authoritativeEditsToVoxelWorldState(edits){
  edits=object(edits,'authoritative world edits');const savedEdits={},savedBlockStates={};
  for(const [coordinate,value] of Object.entries(edits)){
    const identity=authoritativeIdentity(value,'authoritative world edit block identity'),{key,localIndex}=voxelLocation(coordinate);
    (savedEdits[key]??=[]).push([localIndex,identity.id]);
    if(identity.stateKey!==null)(savedBlockStates[key]??=[]).push([localIndex,identity.id,identity.stateKey]);
  }
  return{savedEdits,savedBlockStates};
}

export function authoritativeEditsToVoxelEdits(edits){return authoritativeEditsToVoxelWorldState(edits).savedEdits;}

export class WorldEditSyncAssembler{
  constructor({session,worldId:wid}={}){this.session=assertClientSessionId(session);this.worldId=worldId(wid);this.reset();}
  reset(){this.active=false;this.revision=null;this.totalEdits=0;this.chunkCount=0;this.nextIndex=0;this.edits=[];return this;}
  accept(message){
    const value=decodeWorldEditReplication(message,{expectedSession:this.session,expectedWorldId:this.worldId});if(value.kind===WORLD_BLOCK_CHANGE_KIND)throw new RangeError('world block change is not part of initial edit sync');
    if(value.kind===WORLD_EDIT_SYNC_BEGIN_KIND){if(this.active)throw new Error('world edit sync already active');if(value.chunkCount!==Math.ceil(value.totalEdits/WORLD_EDIT_SYNC_CHUNK_SIZE))throw new RangeError('world edit sync chunk count does not match total edits');this.active=true;this.revision=value.revision;this.totalEdits=value.totalEdits;this.chunkCount=value.chunkCount;this.nextIndex=0;this.edits=[];return{complete:false,kind:value.kind};}
    if(!this.active)throw new Error('world edit sync message received before begin');if(value.revision!==this.revision)throw new RangeError('world edit sync revision changed mid-stream');
    if(value.kind===WORLD_EDIT_SYNC_CHUNK_KIND){if(value.index!==this.nextIndex)throw new RangeError('world edit sync chunk index is not contiguous');if(this.nextIndex>=this.chunkCount)throw new RangeError('world edit sync has more chunks than declared');this.edits.push(...value.edits);this.nextIndex++;if(this.edits.length>this.totalEdits)throw new RangeError('world edit sync contains more edits than declared');return{complete:false,kind:value.kind,index:value.index};}
    if(value.chunkCount!==this.chunkCount||this.nextIndex!==this.chunkCount||this.edits.length!==this.totalEdits)throw new RangeError('world edit sync ended before the declared snapshot was complete');
    const edits={};for(const edit of this.edits){const key=`${edit.x},${edit.y},${edit.z}`;if(Object.prototype.hasOwnProperty.call(edits,key))throw new RangeError(`world edit sync contains duplicate coordinate: ${key}`);edits[key]=Object.freeze({id:edit.id,stateKey:edit.stateKey});}
    const result=Object.freeze({revision:this.revision,edits:Object.freeze({...edits})});this.reset();return{complete:true,kind:value.kind,result};
  }
}

export class WorldBlockRevisionGate{
  constructor(initialRevision){this.reset(initialRevision);}
  reset(initialRevision){this.revision=assertNetworkSequence(initialRevision,'initial world revision');return this;}
  accept(message,{session,worldId:wid,currentBlock,currentBlockState}={}){
    const value=decodeWorldEditReplication(message,{expectedSession:session,expectedWorldId:wid});if(value.kind!==WORLD_BLOCK_CHANGE_KIND)throw new RangeError('world revision gate only accepts block changes');const expected=nextNetworkSequence(this.revision);if(value.revision!==expected)throw new RangeError(`world block revision gap: expected ${expected}, got ${value.revision}`);
    if(typeof currentBlock==='function'&&currentBlock(value.x,value.y,value.z)!==value.previous)throw new RangeError('world block previous value does not match client state');
    if(typeof currentBlockState==='function'&&!blockIdentityEqual(currentBlockState(value.x,value.y,value.z),{id:value.previous,stateKey:value.previousStateKey}))throw new RangeError('world block previous state does not match client state');
    this.revision=value.revision;return value;
  }
}
