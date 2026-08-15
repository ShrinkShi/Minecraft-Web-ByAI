import assert from 'node:assert/strict';
import {encodeServerPlayerCombatSnapshot,decodeServerPlayerCombatSnapshot,isCompatibleServerPlayerCombatSnapshot} from '../src/server-player-combat-snapshot.js';

const wire=encodeServerPlayerCombatSnapshot({session:'s:combat',revision:2,hp:13.5,maxHp:20,dead:false});assert.deepEqual(wire,{v:1,kind:'player-combat-snapshot',session:'s:combat',revision:2,hp:13.5,maxHp:20,dead:false});const decoded=decodeServerPlayerCombatSnapshot(wire,{expectedSession:'s:combat'});assert.equal(decoded.hp,13.5);assert.equal(decoded.dead,false);assert.equal(isCompatibleServerPlayerCombatSnapshot({...wire,extra:true}),false);assert.throws(()=>decodeServerPlayerCombatSnapshot({...wire,dead:true}),/dead must match hp/);assert.throws(()=>decodeServerPlayerCombatSnapshot({...wire,hp:-1}),/between 0 and 20/);assert.throws(()=>decodeServerPlayerCombatSnapshot(wire,{expectedSession:'s:other'}),/session mismatch/);
const dead=encodeServerPlayerCombatSnapshot({session:'s:combat',revision:3,hp:0,maxHp:20,dead:true});assert.equal(decodeServerPlayerCombatSnapshot(dead).dead,true);
console.log('strict authoritative player combat snapshot contract: PASS');
