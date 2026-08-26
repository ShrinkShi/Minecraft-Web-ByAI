import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nearestMobSegmentHit} from '../src/mob-segment-hit-rules.js';

const records=[{id:1,type:'near'},{id:2,type:'far'}],positions=new Map([[1,{x:0,y:0,z:2}],[2,{x:0,y:0,z:4}]]),defs={near:{width:.6,height:1.8},far:{width:.6,height:1.8}};
const hit=nearestMobSegmentHit({records,positionOf:r=>positions.get(r.id),definitionFor:r=>defs[r.type],start:{x:0,y:.9,z:0},end:{x:0,y:.9,z:6}});assert.equal(hit.entity.id,1);assert.ok(hit.t>0&&hit.t<1);
const excluded=nearestMobSegmentHit({records,positionOf:r=>positions.get(r.id),definitionFor:r=>defs[r.type],start:{x:0,y:.9,z:0},end:{x:0,y:.9,z:6},excludeId:1});assert.equal(excluded.entity.id,2);
const miss=nearestMobSegmentHit({records,positionOf:r=>positions.get(r.id),definitionFor:r=>defs[r.type],start:{x:5,y:.9,z:0},end:{x:5,y:.9,z:6}});assert.equal(miss,null);

const projectileSource=readFileSync(new URL('../src/projectiles.js',import.meta.url),'utf8');assert.match(projectileSource,/mobDistance<=playerDistance/);assert.match(projectileSource,/hurtByProjectile/);assert.match(projectileSource,/entitySystem===entry\.kind/);
const hostileSource=readFileSync(new URL('../src/hostile-mobs.js',import.meta.url),'utf8');assert.match(hostileSource,/RETALIATES_TO_SKELETON=new Set\(\['zombie','spider'\]\)/);assert.match(hostileSource,/retaliationTargetId=source\.entityId/);assert.match(hostileSource,/hostileSpawningAllowed\(difficulty\)/);assert.match(hostileSource,/hostileDamageForDifficulty/);
const runtimeSource=readFileSync(new URL('../src/client-gameplay-runtime.js',import.meta.url),'utf8');assert.match(runtimeSource,/projectiles\.setMobSystems\(\{passiveMobs,hostileMobs\}\)/);
console.log('projectile mob collision, skeleton retaliation and difficulty wiring ok');
