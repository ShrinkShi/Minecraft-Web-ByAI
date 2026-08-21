import assert from 'node:assert/strict';
import {forwardDamageWithArmorWear} from '../src/armor-damage-bridge.js';

const order=[],player={takeDamage(){order.push('take');return{applied:true,dead:true};}},equipment={damageArmor(amount){order.push(`wear:${amount}`);return{changed:true};}},original=player.takeDamage;
const returned=forwardDamageWithArmorWear({player,equipment,damage:10,event:{amount:10},callback:event=>{assert.equal(event.amount,10);const result=player.takeDamage(4,1000,null);order.push('after-take');if(result.dead)order.push('death-cleanup');return'returned';}});
assert.equal(returned,'returned');assert.deepEqual(order,['take','wear:10','after-take','death-cleanup'],'armor wear must occur immediately after an applied takeDamage and before death cleanup');assert.equal(player.takeDamage,original,'bridge must restore player.takeDamage after callback');

let wearCount=0;const rejectedPlayer={takeDamage(){return{applied:false,dead:false};}},rejectedOriginal=rejectedPlayer.takeDamage;forwardDamageWithArmorWear({player:rejectedPlayer,equipment:{damageArmor(){wearCount++;}},damage:8,event:{amount:8},callback:()=>rejectedPlayer.takeDamage(7,1200,null)});assert.equal(wearCount,0,'hurt-cooldown/rejected damage must not wear armor');assert.equal(rejectedPlayer.takeDamage,rejectedOriginal);

let zeroWear=0;const zeroPlayer={takeDamage(){return{applied:true,dead:false};}};forwardDamageWithArmorWear({player:zeroPlayer,equipment:{damageArmor(){zeroWear++;}},damage:0,event:{amount:0},callback:()=>zeroPlayer.takeDamage(0,0,null)});assert.equal(zeroWear,0,'zero raw damage must not wear armor');

const throwingPlayer={takeDamage(){return{applied:true,dead:false};}},throwingOriginal=throwingPlayer.takeDamage;assert.throws(()=>forwardDamageWithArmorWear({player:throwingPlayer,equipment:{damageArmor(){}},damage:1,event:{amount:1},callback:()=>{throw new Error('boom');}}),/boom/);assert.equal(throwingPlayer.takeDamage,throwingOriginal,'bridge must restore takeDamage even when the callback throws');

console.log('singleplayer applied-damage armor wear bridge ordering: PASS');
