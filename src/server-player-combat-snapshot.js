import {assertClientSessionId} from './client-input-envelope.js';
import {assertNetworkSequence} from './network-sequence.js';

export const SERVER_PLAYER_COMBAT_SNAPSHOT_VERSION=1;
export const SERVER_PLAYER_COMBAT_SNAPSHOT_KIND='player-combat-snapshot';
export const DEFAULT_PLAYER_MAX_HP=20;
const SNAPSHOT_KEYS=Object.freeze(['dead','hp','kind','maxHp','revision','session','v']);

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function exactKeys(value,expected,label){const keys=Object.keys(value).sort();if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))throw new RangeError(`${label} contains unexpected fields`);}
function hp(value,label,max){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)throw new RangeError(`${label} must be between 0 and ${max}`);return value;}
function maxHp(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>1000)throw new RangeError('player combat maxHp must be greater than 0 and at most 1000');return value;}
function dead(value,hpValue){if(typeof value!=='boolean')throw new TypeError('player combat dead must be boolean');if(value!==(hpValue<=0))throw new RangeError('player combat dead must match hp');return value;}

export function encodeServerPlayerCombatSnapshot(snapshot){snapshot=object(snapshot,'server player combat snapshot state');const maximum=maxHp(snapshot.maxHp??DEFAULT_PLAYER_MAX_HP),current=hp(snapshot.hp,'player combat hp',maximum),isDead=dead(snapshot.dead??current<=0,current);return Object.freeze({v:SERVER_PLAYER_COMBAT_SNAPSHOT_VERSION,kind:SERVER_PLAYER_COMBAT_SNAPSHOT_KIND,session:assertClientSessionId(snapshot.session),revision:assertNetworkSequence(snapshot.revision,'player combat revision'),hp:current,maxHp:maximum,dead:isDead});}

export function decodeServerPlayerCombatSnapshot(snapshot,{expectedSession=null}={}){snapshot=object(snapshot,'server player combat snapshot');exactKeys(snapshot,SNAPSHOT_KEYS,'server player combat snapshot');if(snapshot.v!==SERVER_PLAYER_COMBAT_SNAPSHOT_VERSION)throw new RangeError(`unsupported server player combat snapshot version: ${snapshot.v}`);if(snapshot.kind!==SERVER_PLAYER_COMBAT_SNAPSHOT_KIND)throw new RangeError(`unsupported server player combat snapshot kind: ${snapshot.kind}`);const session=assertClientSessionId(snapshot.session);if(expectedSession!==null&&session!==assertClientSessionId(expectedSession))throw new RangeError('server player combat snapshot session mismatch');const maximum=maxHp(snapshot.maxHp),current=hp(snapshot.hp,'player combat hp',maximum);return Object.freeze({version:SERVER_PLAYER_COMBAT_SNAPSHOT_VERSION,kind:SERVER_PLAYER_COMBAT_SNAPSHOT_KIND,session,revision:assertNetworkSequence(snapshot.revision,'player combat revision'),hp:current,maxHp:maximum,dead:dead(snapshot.dead,current)});}

export function isCompatibleServerPlayerCombatSnapshot(snapshot,options){try{decodeServerPlayerCombatSnapshot(snapshot,options);return true;}catch{return false;}}
