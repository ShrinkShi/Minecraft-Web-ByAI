import assert from 'node:assert/strict';
import {ServerPlayerInventoryHub} from '../server/player-inventory-state.mjs';
import {HungerRuntimeController} from '../server/hunger-runtime-controller.mjs';

class CombatStub{
  constructor(){this.states=new Map();this.heals=[];this.damages=[];}
  join(session,{hp=20,maxHp=20}={}){this.states.set(session,{hp,maxHp,dead:hp<=0});}
  snapshot(session){const state=this.states.get(session);if(!state)throw new Error(`missing combat state: ${session}`);return{session,hp:state.hp,maxHp:state.maxHp,dead:state.dead};}
  isDead(session){return this.snapshot(session).dead;}
  heal(session,amount){const state=this.states.get(session),previous=state.hp;state.hp=Math.min(state.maxHp,state.hp+amount);const healed=state.hp-previous;this.heals.push({session,amount,healed});return{changed:healed>0,healed,snapshot:this.snapshot(session)};}
  damageEnvironment(session,_player,amount,reason){const state=this.states.get(session),previous=state.hp;state.hp=Math.max(0,state.hp-amount);state.dead=state.hp<=0;const damage=previous-state.hp;this.damages.push({session,amount,damage,reason});return{changed:damage>0,reason,result:{applied:damage>0,damage,hp:state.hp,dead:state.dead},death:null};}
}

const inventories=new ServerPlayerInventoryHub(),combat=new CombatStub(),hungerWires=[],inventoryReplications=[];
const hunger=new HungerRuntimeController({
  inventories,
  combat,
  hungerOptions:{random:()=>0},
  replicateInventory:session=>{const snapshot=inventories.snapshot(session);inventoryReplications.push(snapshot);return{snapshot,replicated:true};},
  sendHungerSnapshot:(session,snapshot)=>{hungerWires.push({session,snapshot});return snapshot;}
});

const input=(selectedSlot=0,control={})=>({selectedSlot,control:{side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false,...control}});
const player=(session,{x=0,y=65,z=0,grounded=true,velocityY=0,mode='survival',flying=false,swimCoverage=0,tick=1}={})=>({session,tick,mode,flying,swimCoverage,grounded,position:{x,y,z},velocity:{x:0,y:velocityY,z:0}});

{
  const session='s:hunger-food';inventories.join(session,{mode:'survival'});inventories.addPickup(session,'raw_chicken',2);combat.join(session);hunger.join(session,{mode:'survival',hunger:{food:10,saturation:0}});
  const started=hunger.handleUse(session,{kind:'use',selectedSlot:0});assert.equal(started.handled,true);assert.equal(started.result.changed,true);assert.equal(hunger.snapshot(session).foodUse.active,true);
  hunger.step(session,player(session),input(),.8);assert.equal(inventories.selectedStack(session,0).count,2);assert.equal(hunger.snapshot(session).statusEffects.length,0);
  const finished=hunger.step(session,player(session,{tick:2}),input(),.8);assert.equal(finished.foodTransaction.committed,true);assert.equal(inventories.selectedStack(session,0).count,1);assert.equal(hunger.snapshot(session).food,12);assert.equal(hunger.snapshot(session).statusEffects.length,1);assert.equal(hunger.snapshot(session).statusEffects[0].id,'hunger');assert.equal(inventoryReplications.length,1);
  const restarted=hunger.handleUse(session,{kind:'use',selectedSlot:0});assert.equal(restarted.result.changed,true);const remaining=hunger.prepareActions(session,[{kind:'use-release'}]);assert.deepEqual(remaining,[]);assert.equal(hunger.snapshot(session).foodUse.active,false);assert.equal(inventories.selectedStack(session,0).count,1);assert.equal(hunger.snapshot(session).statusEffects.length,1);
  hunger.handleUse(session,{kind:'use',selectedSlot:0});hunger.step(session,player(session,{tick:3}),input(),.8);const cancelled=hunger.step(session,player(session,{tick:4}),input(1),.8);assert.equal(cancelled.foodTransaction,null);assert.equal(hunger.snapshot(session).foodUse.active,false);assert.equal(inventories.selectedStack(session,0).count,1);
}

{
  const session='s:hunger-sprint';inventories.join(session,{mode:'survival'});combat.join(session);hunger.join(session,{mode:'survival',hunger:{food:6,saturation:0}});const gated=hunger.inputState(session,input(0,{forward:1,sprint:true}));assert.equal(gated.control.sprint,false);
}

{
  const session='s:hunger-motion';inventories.join(session,{mode:'survival'});combat.join(session);hunger.join(session,{mode:'survival',hunger:{food:20,saturation:5}});const sprint=input(0,{forward:1,sprint:true});hunger.step(session,player(session,{x:0,grounded:true}),sprint,.05);hunger.step(session,player(session,{x:1,grounded:true,tick:2}),sprint,.05);assert.ok(hunger.snapshot(session).exhaustion>=.1);const beforeJump=hunger.snapshot(session).exhaustion;hunger.step(session,player(session,{x:1.1,y:65.2,grounded:false,velocityY:8,tick:3}),input(0,{forward:1,jump:true,sprint:true}),.05);assert.ok(hunger.snapshot(session).exhaustion>beforeJump);
}

{
  const session='s:hunger-regen';inventories.join(session,{mode:'survival'});combat.join(session,{hp:19,maxHp:20});hunger.join(session,{mode:'survival',hunger:{food:20,saturation:5}});hunger.step(session,player(session),input(),.5);assert.ok(combat.snapshot(session).hp>19);assert.equal(combat.heals.at(-1).session,session);assert.ok(hunger.snapshot(session).exhaustion>0);
}

{
  const session='s:hunger-starve';inventories.join(session,{mode:'survival'});combat.join(session,{hp:2,maxHp:20});hunger.join(session,{mode:'survival',difficulty:'normal',hunger:{food:0,saturation:0}});hunger.step(session,player(session),input(),4);assert.equal(combat.snapshot(session).hp,1);assert.equal(combat.damages.at(-1).reason,'starvation');hunger.step(session,player(session,{tick:2}),input(),4);assert.equal(combat.snapshot(session).hp,1);
}

{
  const session='s:hunger-respawn';inventories.join(session,{mode:'survival'});combat.join(session);hunger.join(session,{mode:'survival',hunger:{food:3,saturation:0,exhaustion:2}});const result=hunger.respawn(session);assert.equal(result.changed,true);assert.equal(hunger.snapshot(session).food,20);assert.equal(hunger.snapshot(session).saturation,5);assert.equal(hunger.snapshot(session).exhaustion,0);
}

assert.ok(hungerWires.length>=10);
hunger.close();inventories.close();
console.log('authoritative hunger runtime: ok');
