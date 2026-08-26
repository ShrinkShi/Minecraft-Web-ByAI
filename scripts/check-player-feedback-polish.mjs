import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIRST_PERSON_ITEM_TRANSFORMS,firstPersonActionPose} from '../src/first-person-presentation-rules.js';
import {publishPlayerDamage,subscribePlayerDamage,playerDamageSubscriberCount} from '../src/player-damage-channel.js';

assert.ok(FIRST_PERSON_ITEM_TRANSFORMS.tool.scale<=1.4,'tool should no longer be oversized in the palm');
assert.ok(FIRST_PERSON_ITEM_TRANSFORMS.tool.position[1]<.12,'tool grip should stay close to the wrist');
const idle=firstPersonActionPose();assert.ok(idle.x>.75&&idle.y<-.6,'idle hand remains lower-right');
let received=null;const release=subscribePlayerDamage(event=>{received=event;});assert.equal(playerDamageSubscriberCount(),1);publishPlayerDamage({damage:3,hp:17,source:{x:1,z:2}});assert.equal(received.damage,3);assert.equal(received.hp,17);assert.deepEqual(received.source,{x:1,z:2});release();assert.equal(playerDamageSubscriberCount(),0);

const playerSource=readFileSync(new URL('../src/player.js',import.meta.url),'utf8');
assert.match(playerSource,/inputAmount=Math\.min\(1,Math\.hypot\(this\.controlState\.side,this\.controlState\.forward\)\)/,'third-person gait must derive movement from control displacement rather than residual velocity');
assert.match(playerSource,/publishPlayerDamage\(\{damage:result\.damage/,'combat damage must publish local feedback');
assert.match(playerSource,/knockbackFrom\(source\.x,source\.z,\.52,\.24\)/,'combat damage keeps knockback');
console.log('player feedback and presentation polish ok');
