import {assertClientSessionId} from '../src/client-input-envelope.js';
import {DEFAULT_ATTACK_COOLDOWN_MS,DEFAULT_HURT_COOLDOWN_MS,applyDamage,canAttack} from '../src/combat.js';
import {mitigateArmorDamage} from '../src/armor-rules.js';
import {nextNetworkSequence} from '../src/network-sequence.js';
import {DEFAULT_PLAYER_MAX_HP} from '../src/server-player-combat-snapshot.js';

const DAMAGEABLE_MODES=new Set(['survival','adventure']);
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function nonNegative(value,label){value=finite(value,label);if(value<0)throw new RangeError(`${label} must be non-negative`);return value;}
function mode(value){if(typeof value!=='string'||!['survival','adventure','creative','spectator'].includes(value))throw new RangeError('combat mode is invalid');return value;}

export class ServerPlayerCombatState{
  constructor(session,{maxHp=DEFAULT_PLAYER_MAX_HP,attackCooldownMs=DEFAULT_ATTACK_COOLDOWN_MS,hurtCooldownMs=DEFAULT_HURT_COOLDOWN_MS}={}){
    this.session=assertClientSessionId(session);this.maxHp=finite(maxHp,'maxHp');if(this.maxHp<=0)throw new RangeError('maxHp must be positive');this.attackCooldownMs=nonNegative(attackCooldownMs,'attackCooldownMs');this.hurtCooldownMs=nonNegative(hurtCooldownMs,'hurtCooldownMs');this.revision=0;this.hp=this.maxHp;this.hurtUntil=-Infinity;this.lastAttackAt=-Infinity;
  }
  get dead(){return this.hp<=0;}
  advanceRevision(){this.revision=nextNetworkSequence(this.revision);return this.revision;}
  tryAttack(nowMs,playerMode,cooldownMs=this.attackCooldownMs){nowMs=finite(nowMs,'attack time');playerMode=mode(playerMode);cooldownMs=nonNegative(cooldownMs,'attack cooldown');if(this.dead)return Object.freeze({accepted:false,reason:'attacker-dead'});if(playerMode==='spectator')return Object.freeze({accepted:false,reason:'attacker-spectator'});if(!canAttack(this.lastAttackAt,nowMs,cooldownMs))return Object.freeze({accepted:false,reason:'attack-cooldown'});this.lastAttackAt=nowMs;return Object.freeze({accepted:true,reason:'attack-ready',cooldownMs});}
  takeDamage(amount,nowMs,{mode:playerMode='survival',armorPoints=0}={}){amount=nonNegative(amount,'damage amount');nowMs=finite(nowMs,'damage time');playerMode=mode(playerMode);armorPoints=nonNegative(armorPoints,'armorPoints');if(amount<=0)return Object.freeze({applied:false,reason:'zero-damage',damage:0,hp:this.hp,dead:this.dead});if(!DAMAGEABLE_MODES.has(playerMode))return Object.freeze({applied:false,reason:'mode-immune',damage:0,hp:this.hp,dead:this.dead});const mitigated=mitigateArmorDamage(amount,armorPoints);if(mitigated<=0)return Object.freeze({applied:false,reason:'fully-mitigated',damage:0,hp:this.hp,dead:this.dead});const result=applyDamage(this,mitigated,nowMs,{hurtCooldownMs:this.hurtCooldownMs,maxHp:this.maxHp});if(!result.applied)return Object.freeze({...result,reason:this.dead?'target-dead':'hurt-cooldown'});this.advanceRevision();return Object.freeze({...result,reason:result.dead?'killed':'damaged'});}
  heal(amount){amount=nonNegative(amount,'heal amount');if(amount<=0)return Object.freeze({changed:false,reason:'zero-heal',healed:0,snapshot:this.snapshot()});if(this.dead)return Object.freeze({changed:false,reason:'player-dead',healed:0,snapshot:this.snapshot()});const previous=this.hp,next=Math.min(this.maxHp,previous+amount);if(next===previous)return Object.freeze({changed:false,reason:'full-health',healed:0,snapshot:this.snapshot()});this.hp=next;this.advanceRevision();return Object.freeze({changed:true,reason:'healed',healed:next-previous,snapshot:this.snapshot()});}
  kill(playerMode='survival'){playerMode=mode(playerMode);if(!DAMAGEABLE_MODES.has(playerMode))return Object.freeze({changed:false,reason:'mode-immune',snapshot:this.snapshot()});if(this.dead)return Object.freeze({changed:false,reason:'already-dead',snapshot:this.snapshot()});this.hp=0;this.hurtUntil=Infinity;this.advanceRevision();return Object.freeze({changed:true,reason:'killed',snapshot:this.snapshot()});}
  respawn(){if(!this.dead)return Object.freeze({changed:false,reason:'not-dead',snapshot:this.snapshot()});this.hp=this.maxHp;this.hurtUntil=-Infinity;this.lastAttackAt=-Infinity;this.advanceRevision();return Object.freeze({changed:true,reason:'respawned',snapshot:this.snapshot()});}
  snapshot(){return Object.freeze({session:this.session,revision:this.revision,hp:this.hp,maxHp:this.maxHp,dead:this.dead});}
}

export class ServerPlayerCombatHub{
  constructor(options={}){this.options={...options};this.states=new Map();}
  get sessionCount(){return this.states.size;}
  has(session){return this.states.has(assertClientSessionId(session));}
  join(session){session=assertClientSessionId(session);if(this.states.has(session))throw new Error(`combat session already exists: ${session}`);const state=new ServerPlayerCombatState(session,this.options);this.states.set(session,state);return state.snapshot();}
  leave(session){return this.states.delete(assertClientSessionId(session));}
  state(session){session=assertClientSessionId(session);const state=this.states.get(session);if(!state)throw new Error(`unknown combat session: ${session}`);return state;}
  snapshot(session){return this.state(session).snapshot();}
  isDead(session){return this.state(session).dead;}
  tryAttack(session,nowMs,modeValue,cooldownMs){return this.state(session).tryAttack(nowMs,modeValue,cooldownMs);}
  takeDamage(session,amount,nowMs,options={}){return this.state(session).takeDamage(amount,nowMs,options);}
  heal(session,amount){return this.state(session).heal(amount);}
  kill(session,modeValue){return this.state(session).kill(modeValue);}
  respawn(session){return this.state(session).respawn();}
  close(){this.states.clear();}
}
