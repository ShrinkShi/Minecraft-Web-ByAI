import assert from 'node:assert/strict';
import {ControlIntentBus,registerControlActionInterceptor,registerControlPrimaryInterceptor} from '../src/control-intents.js';
import {installMultiplayerSecondaryRouting} from '../src/multiplayer-secondary-routing.js';

const calls=[],drops=[];let fallback=0,primaryFallback=0;
const runtime={player:{mode:'creative',yaw:.75,pitch:-.25}};
const movement={ready:true,sendUse(view){calls.push({...view});return{frame:true};},sendDrop(view){drops.push({...view});return{frame:true};}};
const bus=new ControlIntentBus({onAction:intent=>{fallback++;return`fallback:${intent.name}`;},onPrimary:()=>{primaryFallback++;}});
const release=installMultiplayerSecondaryRouting({runtime,movement});

bus.setButton('mouse','primary',true);bus.setButton('mouse','primary',false);assert.equal(primaryFallback,0,'multiplayer primary changes must bypass the legacy unsupported fallback while the scoped route is installed');
assert.equal(bus.action('mouse','secondary'),true);assert.deepEqual(calls,[{yaw:.75,pitch:-.25}]);assert.equal(fallback,0,'creative multiplayer secondary must bypass the legacy unsupported fallback');
assert.equal(bus.action('keyboard','drop'),true);assert.deepEqual(drops,[{yaw:.75,pitch:-.25}]);assert.equal(fallback,0,'multiplayer drop must bypass the legacy unsupported fallback');
assert.equal(bus.action('keyboard','inventory'),'fallback:inventory');assert.equal(fallback,1,'unrelated actions must fall through unchanged');
runtime.player.mode='survival';runtime.player.yaw=.2;runtime.player.pitch=.1;assert.equal(bus.action('keyboard','drop'),true);assert.deepEqual(drops[1],{yaw:.2,pitch:.1},'survival multiplayer drop remains server-authoritative');assert.equal(bus.action('mouse','secondary'),'fallback:secondary');assert.equal(fallback,2,'non-creative secondary remains owned by the existing fallback until survival use semantics exist');assert.equal(calls.length,1);
runtime.player.mode='spectator';assert.equal(bus.action('keyboard','drop'),false);assert.equal(drops.length,2,'spectator must not emit server drop actions');
runtime.player.mode='creative';movement.ready=false;assert.equal(bus.action('mouse','secondary'),false);assert.equal(bus.action('keyboard','drop'),false);assert.equal(fallback,2,'an unavailable multiplayer transport must be handled without re-running local actions');assert.equal(calls.length,1);assert.equal(drops.length,2);
movement.ready=true;runtime.player.yaw=-1.5;runtime.player.pitch=.4;assert.equal(bus.action('touch','secondary'),true);assert.deepEqual(calls[1],{yaw:-1.5,pitch:.4},'routing must snapshot the current local view when the action is emitted');
assert.equal(release(),true);assert.equal(release(),false,'routing cleanup must be idempotent');bus.setButton('mouse','primary',true);bus.setButton('mouse','primary',false);assert.equal(primaryFallback,2,'disposing multiplayer routing must restore the original primary callback');assert.equal(bus.action('mouse','secondary'),'fallback:secondary');assert.equal(fallback,3,'disposing multiplayer routing must restore the original action callback');assert.equal(bus.action('keyboard','drop'),'fallback:drop');assert.equal(fallback,4,'disposing multiplayer routing must restore legacy drop handling too');

let first=0,second=0;const releaseFirst=registerControlActionInterceptor(()=>{first++;return undefined;}),releaseSecond=registerControlActionInterceptor(intent=>{if(intent.name==='secondary'){second++;return'handled';}return undefined;});assert.equal(bus.action('mouse','secondary'),'handled');assert.equal(first,1);assert.equal(second,1);releaseFirst();releaseSecond();
let primaryFirst=0,primarySecond=0;const releasePrimaryFirst=registerControlPrimaryInterceptor(()=>{primaryFirst++;return undefined;}),releasePrimarySecond=registerControlPrimaryInterceptor(()=>{primarySecond++;return false;});bus.setButton('mouse','primary',true);assert.equal(primaryFirst,1);assert.equal(primarySecond,1);assert.equal(primaryFallback,2,'a later primary interceptor may explicitly handle the transition');releasePrimaryFirst();releasePrimarySecond();bus.setButton('mouse','primary',false);assert.equal(primaryFallback,3);
assert.throws(()=>registerControlActionInterceptor(null),/interceptor/);assert.throws(()=>registerControlPrimaryInterceptor(null),/interceptor/);assert.throws(()=>installMultiplayerSecondaryRouting({runtime:{player:{mode:'creative',yaw:0,pitch:0}},movement:{}}),/sendUse/);assert.throws(()=>installMultiplayerSecondaryRouting({runtime:{player:{mode:'creative',yaw:0,pitch:0}},movement:{sendUse(){}}}),/sendDrop/);

console.log('scoped multiplayer secondary + drop + primary routing lifecycle: PASS');
