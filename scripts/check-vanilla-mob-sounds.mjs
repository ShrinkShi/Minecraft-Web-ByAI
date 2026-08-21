import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {MOB_SOUND_EVENTS,mobSoundEvent,mobSoundVolume} from '../src/vanilla-mob-sounds.js';
import {vanillaSoundObjectUrl} from '../src/vanilla-sounds.js';

const required={
  cow:['ambient','hurt','death'],sheep:['ambient','hurt','death'],pig:['ambient','hurt','death'],chicken:['ambient','hurt','death'],
  zombie:['ambient','hurt','death'],skeleton:['ambient','hurt','death'],creeper:['hurt','death'],spider:['ambient','hurt','death']
};
for(const[type,kinds]of Object.entries(required))for(const kind of kinds){const eventName=mobSoundEvent(type,kind);assert.equal(eventName,`entity.${type}.${kind}`);assert.ok(MOB_SOUND_EVENTS[eventName]?.length>0,`${eventName} must expose at least one source-backed OGG`);}
assert.equal(mobSoundEvent('creeper','ambient'),null,'creeper has no normal ambient voice event');
assert.equal(mobSoundEvent('unknown','hurt'),null);

const unique=new Map();for(const list of Object.values(MOB_SOUND_EVENTS))for(const variant of list)unique.set(variant.sha1,variant);
assert.ok(unique.size>=40,'current eight-mob roster should resolve a substantial source-backed OGG set');
for(const variant of unique.values()){
  assert.match(variant.sha1,/^[0-9a-f]{40}$/);assert.ok(variant.logicalPath.endsWith('.ogg'));
  const file=fileURLToPath(vanillaSoundObjectUrl(variant)),stat=statSync(file);assert.ok(stat.isFile()&&stat.size>0,`missing Minecraft sound object ${variant.sha1} (${variant.logicalPath})`);
}

const listener={x:0,y:64,z:0};
assert.equal(mobSoundVolume({x:0,y:64,z:0},listener),1);
assert.ok(Math.abs(mobSoundVolume({x:12,y:64,z:0},listener)-.5)<1e-12);
assert.equal(mobSoundVolume({x:24,y:64,z:0},listener),0);
assert.equal(mobSoundVolume({x:100,y:64,z:0},listener),0);
assert.equal(mobSoundVolume(null,listener),0);
console.log(`vanilla mob sound mappings + ${unique.size} source OGG objects + distance attenuation: PASS`);
