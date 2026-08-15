import {assertClientSessionId} from './client-input-envelope.js';
import {decodeItemStackTuple,encodeItemStackTuple,itemStacksCanMerge} from './item-stack.js';
import {matchRecipe} from './recipes.js';
import {assertNetworkSequence} from './network-sequence.js';

export const SERVER_PLAYER_CRAFTING_SNAPSHOT_VERSION=1;
export const SERVER_PLAYER_CRAFTING_SNAPSHOT_KIND='player-crafting-snapshot';
export const PLAYER_CRAFTING_SIZE=2;
export const PLAYER_CRAFTING_SLOT_COUNT=4;

const SNAPSHOT_KEYS=Object.freeze(['kind','result','revision','session','size','slots','v']);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,keys,label){const actual=Object.keys(value).sort(),expected=[...keys].sort();if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);}
function size(value){if(value!==PLAYER_CRAFTING_SIZE)throw new RangeError(`player crafting size must be ${PLAYER_CRAFTING_SIZE}`);return value;}
function slots(value,label){if(!Array.isArray(value)||value.length!==PLAYER_CRAFTING_SLOT_COUNT)throw new RangeError(`${label} must contain exactly ${PLAYER_CRAFTING_SLOT_COUNT} slots`);return value;}
function encodeSlot(value,index){return value===null||value===undefined?null:encodeItemStackTuple(value,{label:`player crafting slot ${index}`});}
function decodeSlot(value,index){return value===null?null:decodeItemStackTuple(value,{label:`player crafting slot ${index}`});}
function derivedResult(decodedSlots){const match=matchRecipe(decodedSlots,PLAYER_CRAFTING_SIZE);return match?.recipe?.result?Object.freeze({...match.recipe.result}):null;}
function sameStack(a,b){if(a===null||b===null)return a===b;return a.count===b.count&&itemStacksCanMerge(a,b);}

export function encodeServerPlayerCraftingSnapshot(snapshot){
  snapshot=object(snapshot,'server player crafting snapshot state');const normalizedSlots=slots(snapshot.slots,'player crafting snapshot slots').map((value,index)=>value?decodeItemStackTuple(encodeSlot(value,index),{label:`player crafting slot ${index}`}):null),result=derivedResult(normalizedSlots);
  return Object.freeze({v:SERVER_PLAYER_CRAFTING_SNAPSHOT_VERSION,kind:SERVER_PLAYER_CRAFTING_SNAPSHOT_KIND,session:assertClientSessionId(snapshot.session),revision:assertNetworkSequence(snapshot.revision,'player crafting revision'),size:size(snapshot.size??PLAYER_CRAFTING_SIZE),slots:Object.freeze(normalizedSlots.map(encodeSlot)),result:result?encodeItemStackTuple(result,{label:'player crafting result'}):null});
}

export function decodeServerPlayerCraftingSnapshot(snapshot,{expectedSession=null}={}){
  snapshot=object(snapshot,'server player crafting snapshot');exactKeys(snapshot,SNAPSHOT_KEYS,'server player crafting snapshot');if(snapshot.v!==SERVER_PLAYER_CRAFTING_SNAPSHOT_VERSION)throw new RangeError(`unsupported server player crafting snapshot version: ${snapshot.v}`);if(snapshot.kind!==SERVER_PLAYER_CRAFTING_SNAPSHOT_KIND)throw new RangeError(`unsupported server player crafting snapshot kind: ${snapshot.kind}`);const session=assertClientSessionId(snapshot.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('server player crafting snapshot session mismatch');size(snapshot.size);const decodedSlots=slots(snapshot.slots,'player crafting snapshot slots').map(decodeSlot),expectedResult=derivedResult(decodedSlots),decodedResult=snapshot.result===null?null:decodeItemStackTuple(snapshot.result,{label:'player crafting result'});if(!sameStack(expectedResult,decodedResult))throw new RangeError('server player crafting snapshot result does not match server recipe state');return Object.freeze({version:SERVER_PLAYER_CRAFTING_SNAPSHOT_VERSION,kind:SERVER_PLAYER_CRAFTING_SNAPSHOT_KIND,session,revision:assertNetworkSequence(snapshot.revision,'player crafting revision'),size:PLAYER_CRAFTING_SIZE,slots:Object.freeze(decodedSlots),result:decodedResult});
}

export function isCompatibleServerPlayerCraftingSnapshot(snapshot,options){try{decodeServerPlayerCraftingSnapshot(snapshot,options);return true;}catch{return false;}}
