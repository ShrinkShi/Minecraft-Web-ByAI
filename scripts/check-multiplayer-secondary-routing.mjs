import assert from 'node:assert/strict';
import {ControlIntentBus,registerControlActionInterceptor} from '../src/control-intents.js';
import {installMultiplayerSecondaryRouting} from '../src/multiplayer-secondary-routing.js';

const calls=[];let fallback=0;
const runtime={player:{mode:'creative',yaw:.75,pitch:-.25}};
const movement={ready:true,sendUse(view){calls.push({...view});return{frame:true};}};
const bus=new ControlIntentBus({onAction:intent=>{fallback++;return`fallback:${intent.name}`;}});
const release=installMultiplayerSecondaryRouting({runtime,movement});

assert.equal(bus.action('mouse','secondary'),true);assert.deepEqual(calls,[{yaw:.75,pitch:-.25}]);assert.equal(fallback,0,'creative multiplayer secondary must bypass the legacy unsupported fallback');
assert.equal(bus.action('keyboard','inventory'),'fallback:inventory');assert.equal(fallback,1,'unrelated actions must fall through unchanged');
runtime.player.mode='survival';assert.equal(bus.action('mouse','secondary'),'fallback:secondary');assert.equal(fallback,2,'non-creative secondary remains owned by the existing fallback until survival use semantics exist');assert.equal(calls.length,1);
runtime.player.mode='creative';movement.ready=false;assert.equal(bus.action('mouse','secondary'),false);assert.equal(fallback,2,'a creative route with an unavailable multiplayer transport must be handled without re-running local placement');assert.equal(calls.length,1);
movement.ready=true;runtime.player.yaw=-1.5;runtime.player.pitch=.4;assert.equal(bus.action('touch','secondary'),true);assert.deepEqual(calls[1],{yaw:-1.5,pitch:.4},'routing must snapshot the current local view when the action is emitted');
assert.equal(release(),true);assert.equal(release(),false,'routing cleanup must be idempotent');assert.equal(bus.action('mouse','secondary'),'fallback:secondary');assert.equal(fallback,3,'disposing multiplayer routing must restore the original action callback');

let first=0,second=0;const releaseFirst=registerControlActionInterceptor(()=>{first++;return undefined;}),releaseSecond=registerControlActionInterceptor(intent=>{if(intent.name==='secondary'){second++;return'handled';}return undefined;});assert.equal(bus.action('mouse','secondary'),'handled');assert.equal(first,1);assert.equal(second,1);releaseFirst();releaseSecond();
assert.throws(()=>registerControlActionInterceptor(null),/interceptor/);assert.throws(()=>installMultiplayerSecondaryRouting({runtime:{player:{mode:'creative',yaw:0,pitch:0}},movement:{}}),/sendUse/);

console.log('scoped multiplayer secondary routing lifecycle: PASS');
