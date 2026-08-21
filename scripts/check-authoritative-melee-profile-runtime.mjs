import assert from 'node:assert/strict';
import {BLOCK} from '../src/blocks.js';
import {CombatRuntimeController} from '../server/combat-runtime-controller.mjs';

const players=new Map([
  ['s:a',{session:'s:a',mode:'survival',position:{x:.5,y:0,z:.5},yaw:0,pitch:0,tick:0}],
  ['s:b',{session:'s:b',mode:'survival',position:{x:.5,y:0,z:-1.5},yaw:0,pitch:0,tick:0}]
]);
const impulses=[];
const authoritative={
  sessions:['s:a','s:b'],
  snapshot:session=>players.get(session)||null,
  applyVelocityImpulse:(session,velocity)=>{impulses.push({session,velocity:{...velocity}});return true;},
  getInputState:()=>({control:{primary:false}}),
  respawn:session=>({session})
};
let held={id:'iron_sword',count:1,damage:0},inventoryRevision=0,inventoryReplications=0;
const inventories={
  selectedStack:(session,slot)=>session==='s:a'&&slot===0?{...held}:null,
  damageSelected:(session,slot,expectedId,amount)=>{
    assert.equal(session,'s:a');assert.equal(slot,0);assert.equal(expectedId,held.id);
    held={...held,damage:(held.damage||0)+amount};inventoryRevision++;
    return{changed:true,broken:false,reason:'damaged',stack:{...held}};
  },
  snapshot:()=>({revision:inventoryRevision}),drainAll:()=>[]
};
let armorWearAttempts=0;
const equipments={armorPoints:()=>0,damageArmor:(session,amount)=>{assert.equal(session,'s:b');assert.ok(amount>0);armorWearAttempts++;return{changed:false,wear:Math.max(1,Math.floor(amount/4)),damaged:[],broken:[]};},snapshot:()=>({revision:0}),drain:()=>[]};
const craftings={snapshot:()=>({revision:0}),drain:()=>[]};
const controller=new CombatRuntimeController({
  world:{getBlock:()=>BLOCK.AIR},authoritative,inventories,equipments,craftings,workbenches:{},itemEntities:{},
  replicateInventory:()=>{inventoryReplications++;return{replicated:true};},replicateEquipment:()=>({replicated:true}),replicateCrafting:()=>({replicated:true}),sendCombatSnapshot:()=>({type:'combat'}),combatOptions:{maxHp:40,hurtCooldownMs:1000}
});
controller.join('s:a');controller.join('s:b');
const action={kind:'attack',selectedSlot:0,view:{yaw:0,pitch:0}};

let result=controller.attack('s:a',players.get('s:a'),action);
assert.equal(result.reason,'damaged');assert.equal(result.profile.itemId,'iron_sword');assert.equal(result.result.damage,6);assert.equal(controller.snapshot('s:b').hp,34);assert.equal(result.wear.changed,true);assert.equal(held.damage,1);assert.equal(inventoryRevision,1);assert.equal(inventoryReplications,1);assert.equal(armorWearAttempts,1,'applied hit should ask equipment state to wear even when no armor is equipped');assert.equal(impulses.length,1);

players.get('s:a').tick=12;result=controller.attack('s:a',players.get('s:a'),action);
assert.equal(result.reason,'attack-cooldown','sword cannot attack again before its 625 ms interval');assert.equal(controller.snapshot('s:b').hp,34);assert.equal(held.damage,1);assert.equal(inventoryRevision,1);assert.equal(armorWearAttempts,1);

players.get('s:a').tick=13;result=controller.attack('s:a',players.get('s:a'),action);
assert.equal(result.reason,'hurt-cooldown','a ready swing rejected by target invulnerability must not wear the weapon or armor');assert.equal(result.wear,null);assert.equal(result.armorWear,null);assert.equal(controller.snapshot('s:b').hp,34);assert.equal(held.damage,1);assert.equal(inventoryRevision,1);assert.equal(inventoryReplications,1);assert.equal(armorWearAttempts,1);

players.get('s:a').tick=26;result=controller.attack('s:a',players.get('s:a'),action);
assert.equal(result.reason,'damaged');assert.equal(controller.snapshot('s:b').hp,28);assert.equal(held.damage,2);assert.equal(inventoryRevision,2);assert.equal(inventoryReplications,2);assert.equal(armorWearAttempts,2);

held={id:'iron_axe',count:1,damage:0};players.get('s:a').tick=40;result=controller.attack('s:a',players.get('s:a'),action);
assert.equal(result.reason,'attack-cooldown','switching to a slower axe must use the current held item interval');assert.equal(held.damage,0);assert.equal(armorWearAttempts,2);
players.get('s:a').tick=49;result=controller.attack('s:a',players.get('s:a'),action);
assert.equal(result.reason,'damaged');assert.equal(result.profile.itemId,'iron_axe');assert.equal(result.result.damage,9);assert.equal(controller.snapshot('s:b').hp,19);assert.equal(held.damage,2,'axe entity hit costs two durability');assert.equal(inventoryRevision,3);assert.equal(inventoryReplications,3);assert.equal(armorWearAttempts,3);

controller.close();
console.log('authoritative item-specific melee intervals + successful-hit-only weapon/armor wear contract: PASS');
