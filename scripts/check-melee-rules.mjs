import assert from 'node:assert/strict';
import {meleeProfile,DEFAULT_MELEE_ATTACK_SPEED,DEFAULT_MELEE_DAMAGE} from '../src/melee-rules.js';
import {ServerPlayerCombatState} from '../server/player-combat-state.mjs';

assert.equal(DEFAULT_MELEE_DAMAGE,1);
assert.equal(DEFAULT_MELEE_ATTACK_SPEED,4);
assert.deepEqual(meleeProfile(null),{itemId:null,damage:1,attackSpeed:4,attackIntervalMs:250,durabilityCost:0});
assert.deepEqual(meleeProfile('iron_sword'),{itemId:'iron_sword',damage:6,attackSpeed:1.6,attackIntervalMs:625,durabilityCost:1});
assert.deepEqual(meleeProfile('iron_axe'),{itemId:'iron_axe',damage:9,attackSpeed:.9,attackIntervalMs:1000/.9,durabilityCost:2});
assert.deepEqual(meleeProfile('iron_shovel'),{itemId:'iron_shovel',damage:4.5,attackSpeed:1,attackIntervalMs:1000,durabilityCost:2});
assert.deepEqual(meleeProfile('iron_pickaxe'),{itemId:'iron_pickaxe',damage:4,attackSpeed:1.2,attackIntervalMs:1000/1.2,durabilityCost:2});
assert.equal(meleeProfile('stick').damage,1);assert.equal(meleeProfile('stick').attackIntervalMs,250);assert.equal(meleeProfile('stick').durabilityCost,0);

const state=new ServerPlayerCombatState('melee-profile-ci',{attackCooldownMs:600});
assert.equal(state.tryAttack(0,'survival',625).accepted,true);
assert.equal(state.tryAttack(600,'survival',625).accepted,false,'per-attack sword interval overrides the historical state default');
assert.equal(state.tryAttack(625,'survival',625).accepted,true);
assert.equal(state.tryAttack(1_200,'survival',1000/.9).accepted,false,'slower axe profile must not reuse sword timing');
assert.equal(state.tryAttack(625+1000/.9,'survival',1000/.9).accepted,true);

console.log('shared melee damage + per-item attack interval + successful-hit durability profile contract: PASS');
