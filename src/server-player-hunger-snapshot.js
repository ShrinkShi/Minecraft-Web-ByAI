import {assertClientSessionId} from './client-input-envelope.js';
import {createFoodUseState} from './food-use-rules.js';
import {HUNGER_DIFFICULTIES,createHungerState} from './hunger-rules.js';
import {assertNetworkSequence} from './network-sequence.js';
import {normalizeStatusEffects} from './status-effect-rules.js';

export const SERVER_PLAYER_HUNGER_SNAPSHOT_VERSION=1;
export const SERVER_PLAYER_HUNGER_SNAPSHOT_KIND='player-hunger-snapshot';
const MODES=Object.freeze(['survival','adventure','creative','spectator']);
const MODE_SET=new Set(MODES),DIFFICULTY_SET=new Set(HUNGER_DIFFICULTIES);
const SNAPSHOT_KEYS=Object.freeze(['difficulty','exhaustion','food','foodUse','kind','mode','naturalRegeneration','revision','saturation','session','statusEffects','timer','v']);
const FOOD_USE_KEYS=Object.freeze(['active','duration','elapsed','itemId','progress']);
const EFFECT_KEYS=Object.freeze(['amplifier','id','remainingSeconds']);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,expected,label){const keys=Object.keys(value).sort();if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);}
function mode(value){if(typeof value!=='string'||!MODE_SET.has(value))throw new RangeError('player hunger mode is invalid');return value;}
function difficulty(value){if(typeof value!=='string'||!DIFFICULTY_SET.has(value))throw new RangeError('player hunger difficulty is invalid');return value;}
function naturalRegeneration(value){if(typeof value!=='boolean')throw new TypeError('player hunger naturalRegeneration must be boolean');return value;}
function wireFoodUse(value){const state=createFoodUseState(value);return Object.freeze({active:state.active,itemId:state.itemId,elapsed:state.elapsed,duration:state.duration,progress:state.progress});}
function decodeFoodUse(value){value=object(value,'player hunger foodUse');exactKeys(value,FOOD_USE_KEYS,'player hunger foodUse');return wireFoodUse(value);}
function wireEffects(value){return Object.freeze(normalizeStatusEffects(value).map(effect=>Object.freeze({...effect})));}
function decodeEffects(value){if(!Array.isArray(value))throw new TypeError('player hunger statusEffects must be an array');for(const effect of value){object(effect,'player hunger status effect');exactKeys(effect,EFFECT_KEYS,'player hunger status effect');}return wireEffects(value);}

export function encodeServerPlayerHungerSnapshot(snapshot){
  snapshot=object(snapshot,'server player hunger snapshot state');const hunger=createHungerState(snapshot);
  return Object.freeze({v:SERVER_PLAYER_HUNGER_SNAPSHOT_VERSION,kind:SERVER_PLAYER_HUNGER_SNAPSHOT_KIND,session:assertClientSessionId(snapshot.session),revision:assertNetworkSequence(snapshot.revision,'player hunger revision'),mode:mode(snapshot.mode),difficulty:difficulty(snapshot.difficulty??'normal'),naturalRegeneration:naturalRegeneration(snapshot.naturalRegeneration??true),food:hunger.food,saturation:hunger.saturation,exhaustion:hunger.exhaustion,timer:hunger.timer,statusEffects:wireEffects(snapshot.statusEffects),foodUse:wireFoodUse(snapshot.foodUse)});
}

export function decodeServerPlayerHungerSnapshot(snapshot,{expectedSession=null}={}){
  snapshot=object(snapshot,'server player hunger snapshot');exactKeys(snapshot,SNAPSHOT_KEYS,'server player hunger snapshot');if(snapshot.v!==SERVER_PLAYER_HUNGER_SNAPSHOT_VERSION)throw new RangeError(`unsupported server player hunger snapshot version: ${snapshot.v}`);if(snapshot.kind!==SERVER_PLAYER_HUNGER_SNAPSHOT_KIND)throw new RangeError(`unsupported server player hunger snapshot kind: ${snapshot.kind}`);const session=assertClientSessionId(snapshot.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('server player hunger snapshot session mismatch');const hunger=createHungerState(snapshot);
  return Object.freeze({version:SERVER_PLAYER_HUNGER_SNAPSHOT_VERSION,kind:SERVER_PLAYER_HUNGER_SNAPSHOT_KIND,session,revision:assertNetworkSequence(snapshot.revision,'player hunger revision'),mode:mode(snapshot.mode),difficulty:difficulty(snapshot.difficulty),naturalRegeneration:naturalRegeneration(snapshot.naturalRegeneration),food:hunger.food,saturation:hunger.saturation,exhaustion:hunger.exhaustion,timer:hunger.timer,statusEffects:decodeEffects(snapshot.statusEffects),foodUse:decodeFoodUse(snapshot.foodUse)});
}

export function isCompatibleServerPlayerHungerSnapshot(snapshot,options){try{decodeServerPlayerHungerSnapshot(snapshot,options);return true;}catch{return false;}}
