import {assertClientSessionId} from '../src/client-input-envelope.js';
import {beginFoodUse,createFoodUseState,stepFoodUse} from '../src/food-use-rules.js';
import {HUNGER_DIFFICULTIES,addHungerExhaustion,consumeFood,createHungerState,normalizeFoodProfile,stepHunger} from '../src/hunger-rules.js';
import {nextNetworkSequence} from '../src/network-sequence.js';
import {applyStatusEffect,normalizeStatusEffects,rollFoodStatusEffects,stepStatusEffects} from '../src/status-effect-rules.js';

const MODES=new Set(['survival','adventure','creative','spectator']),DIFFICULTIES=new Set(HUNGER_DIFFICULTIES);
function mode(value){if(typeof value!=='string'||!MODES.has(value))throw new RangeError('player hunger mode is invalid');return value;}
function difficulty(value){if(typeof value!=='string'||!DIFFICULTIES.has(value))throw new RangeError('player hunger difficulty is invalid');return value;}
function bool(value,label){if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}

export class ServerPlayerHungerState{
  constructor(session,{mode:initialMode='survival',difficulty:initialDifficulty='normal',naturalRegeneration=true,random=Math.random,hunger=null,statusEffects=null}={}){
    this.session=assertClientSessionId(session);this.mode=mode(initialMode);this.difficulty=difficulty(initialDifficulty);this.naturalRegeneration=bool(naturalRegeneration,'naturalRegeneration');this.random=callback(random,'hunger random');this.revision=0;this.hunger=createHungerState(hunger??{});this.statusEffects=normalizeStatusEffects(statusEffects);this.foodUse=createFoodUseState();this.foodProfile=null;
  }
  advanceRevision(){this.revision=nextNetworkSequence(this.revision);return this.revision;}
  snapshot(){return Object.freeze({session:this.session,revision:this.revision,mode:this.mode,difficulty:this.difficulty,naturalRegeneration:this.naturalRegeneration,...this.hunger,statusEffects:normalizeStatusEffects(this.statusEffects),foodUse:createFoodUseState(this.foodUse)});}
  setMode(nextMode){nextMode=mode(nextMode);if(nextMode===this.mode)return this.snapshot();this.mode=nextMode;if(this.foodUse.active&&nextMode!=='survival'){this.foodUse=createFoodUseState({duration:this.foodUse.duration});this.foodProfile=null;}this.advanceRevision();return this.snapshot();}
  configure({difficulty:nextDifficulty=this.difficulty,naturalRegeneration:nextNaturalRegeneration=this.naturalRegeneration}={}){nextDifficulty=difficulty(nextDifficulty);nextNaturalRegeneration=bool(nextNaturalRegeneration,'naturalRegeneration');if(nextDifficulty===this.difficulty&&nextNaturalRegeneration===this.naturalRegeneration)return this.snapshot();this.difficulty=nextDifficulty;this.naturalRegeneration=nextNaturalRegeneration;this.advanceRevision();return this.snapshot();}
  beginFoodUse(itemId,profile){const food=normalizeFoodProfile(profile);if(this.mode!=='survival')return Object.freeze({changed:false,reason:'mode-invalid',snapshot:this.snapshot()});if(this.foodUse.active)return Object.freeze({changed:false,reason:'already-using',snapshot:this.snapshot()});const preview=consumeFood(this.hunger,food);if(!preview.consumed)return Object.freeze({changed:false,reason:'not-edible',snapshot:this.snapshot()});this.foodUse=beginFoodUse(itemId);this.foodProfile=food;this.advanceRevision();return Object.freeze({changed:true,reason:'using',snapshot:this.snapshot()});}
  cancelFoodUse(reason='cancelled'){if(!this.foodUse.active)return Object.freeze({changed:false,reason,snapshot:this.snapshot()});this.foodUse=createFoodUseState({duration:this.foodUse.duration});this.foodProfile=null;this.advanceRevision();return Object.freeze({changed:true,reason,snapshot:this.snapshot()});}
  consume(profile=this.foodProfile){if(this.mode!=='survival')return Object.freeze({changed:false,reason:'mode-invalid',snapshot:this.snapshot()});if(!profile)return Object.freeze({changed:false,reason:'food-profile-missing',snapshot:this.snapshot()});const food=normalizeFoodProfile(profile),result=consumeFood(this.hunger,food);if(!result.consumed)return Object.freeze({changed:false,reason:'not-edible',snapshot:this.snapshot()});this.hunger=result.state;const rolled=rollFoodStatusEffects(food.effects,{random:this.random});for(const effect of rolled)this.statusEffects=applyStatusEffect(this.statusEffects,effect);this.advanceRevision();return Object.freeze({changed:true,reason:'consumed',nutrition:result.nutrition,saturationAdded:result.saturationAdded,rolled,snapshot:this.snapshot()});}
  addExhaustion(amount){amount=finite(amount,'hunger exhaustion amount');if(amount<0)throw new RangeError('hunger exhaustion amount must be non-negative');if(this.mode!=='survival'||amount===0)return Object.freeze({changed:false,reason:'no-change',snapshot:this.snapshot()});const next=addHungerExhaustion(this.hunger,amount);if(next.exhaustion===this.hunger.exhaustion)return Object.freeze({changed:false,reason:'no-change',snapshot:this.snapshot()});this.hunger=next;this.advanceRevision();return Object.freeze({changed:true,reason:'exhaustion-added',snapshot:this.snapshot()});}
  step(dt,{hp,maxHp=20}={}){dt=finite(dt,'hunger step dt');hp=finite(hp,'hunger step hp');maxHp=finite(maxHp,'hunger step maxHp');const activeUse=this.foodUse.active?{itemId:this.foodUse.itemId,profile:this.foodProfile}:null,use=stepFoodUse(this.foodUse,dt);this.foodUse=use.state;let completedUse=null;if(use.completed){completedUse=activeUse;this.foodProfile=null;}
    const effectStep=stepStatusEffects(this.statusEffects,{dt});this.statusEffects=effectStep.effects;if(this.mode==='survival'&&effectStep.hungerExhaustion>0)this.hunger=addHungerExhaustion(this.hunger,effectStep.hungerExhaustion);
    const hungerStep=stepHunger(this.hunger,{dt,hp,maxHp,mode:this.mode,difficulty:this.difficulty,naturalRegeneration:this.naturalRegeneration});this.hunger=hungerStep.state;const changed=use.changed||effectStep.changed||hungerStep.changed;if(changed)this.advanceRevision();return Object.freeze({changed,heal:hungerStep.heal,damage:hungerStep.damage,completedUse,foodUseCompleted:!!completedUse,statusEffects:effectStep,snapshot:this.snapshot()});}
  respawn(){const nextHunger=createHungerState(),nextEffects=normalizeStatusEffects(),nextUse=createFoodUseState();const changed=this.hunger.food!==nextHunger.food||this.hunger.saturation!==nextHunger.saturation||this.hunger.exhaustion!==nextHunger.exhaustion||this.hunger.timer!==nextHunger.timer||this.statusEffects.length>0||this.foodUse.active;this.hunger=nextHunger;this.statusEffects=nextEffects;this.foodUse=nextUse;this.foodProfile=null;if(changed)this.advanceRevision();return Object.freeze({changed,reason:changed?'respawned':'no-change',snapshot:this.snapshot()});}
}

export class ServerPlayerHungerHub{
  constructor(options={}){this.options={...options};this.states=new Map();}
  get sessionCount(){return this.states.size;}
  has(session){return this.states.has(assertClientSessionId(session));}
  join(session,options={}){session=assertClientSessionId(session);if(this.states.has(session))throw new Error(`hunger session already exists: ${session}`);const state=new ServerPlayerHungerState(session,{...this.options,...options});this.states.set(session,state);return state.snapshot();}
  leave(session){return this.states.delete(assertClientSessionId(session));}
  state(session){session=assertClientSessionId(session);const state=this.states.get(session);if(!state)throw new Error(`unknown hunger session: ${session}`);return state;}
  snapshot(session){return this.state(session).snapshot();}
  setMode(session,nextMode){return this.state(session).setMode(nextMode);}
  configure(session,options){return this.state(session).configure(options);}
  beginFoodUse(session,itemId,profile){return this.state(session).beginFoodUse(itemId,profile);}
  cancelFoodUse(session,reason){return this.state(session).cancelFoodUse(reason);}
  consume(session,profile){return this.state(session).consume(profile);}
  addExhaustion(session,amount){return this.state(session).addExhaustion(amount);}
  step(session,dt,options){return this.state(session).step(dt,options);}
  respawn(session){return this.state(session).respawn();}
  close(){this.states.clear();}
}
