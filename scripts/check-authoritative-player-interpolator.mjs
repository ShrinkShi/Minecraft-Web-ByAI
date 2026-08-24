import assert from 'node:assert/strict';
import {AuthoritativePlayerInterpolator,DEFAULT_AUTHORITATIVE_INTERPOLATION_TICK_RATE,DEFAULT_AUTHORITATIVE_SNAP_DISTANCE,DEFAULT_AUTHORITATIVE_MAX_TICK_GAP} from '../src/authoritative-player-interpolator.js';

const near=(actual,expected,epsilon=1e-9,label='value')=>assert.ok(Math.abs(actual-expected)<=epsilon,`${label}: expected ${expected}, got ${actual}`);
const state=(tick,overrides={})=>({session:'interp-session',tick,position:{x:0,y:25,z:0},velocity:{x:0,y:0,z:0},yaw:0,pitch:0,mode:'survival',flying:false,grounded:true,swimCoverage:0,voided:false,...overrides});

assert.equal(DEFAULT_AUTHORITATIVE_INTERPOLATION_TICK_RATE,20);assert.equal(DEFAULT_AUTHORITATIVE_SNAP_DISTANCE,2.5);assert.equal(DEFAULT_AUTHORITATIVE_MAX_TICK_GAP,4);
const interp=new AuthoritativePlayerInterpolator();assert.equal(interp.ready,false);assert.equal(interp.current(),null);assert.equal(interp.step(.05),null);
let result=interp.accept(state(0));assert.deepEqual(result,{accepted:true,snapped:true,reason:'initial',tick:0});assert.equal(interp.ready,true);assert.deepEqual(interp.current().position,{x:0,y:25,z:0});assert.equal(interp.current().flying,false);
result=interp.accept(state(1,{position:{x:-.215,y:25,z:0},velocity:{x:-4.3,y:0,z:0},yaw:Math.PI/2}));assert.equal(result.accepted,true);assert.equal(result.snapped,false);let sampled=interp.step(.025);near(sampled.position.x,-.1075,1e-12,'half-tick x');near(sampled.velocity.x,-2.15,1e-12,'half-tick velocity');near(sampled.yaw,Math.PI/4,1e-12,'half-tick yaw');sampled=interp.step(.025);near(sampled.position.x,-.215,1e-12,'full-tick x');near(sampled.yaw,Math.PI/2,1e-12,'full-tick yaw');

result=interp.accept(state(2,{position:{x:-.43,y:25,z:0},velocity:{x:-4.3,y:0,z:0},yaw:Math.PI/2}));interp.step(.01);const beforeRetarget=interp.current().position.x;result=interp.accept(state(3,{position:{x:-.645,y:25,z:0},velocity:{x:-4.3,y:0,z:0},yaw:Math.PI/2}));assert.equal(result.reason,'interpolating');sampled=interp.step(.025);near(sampled.position.x,beforeRetarget+(-.645-beforeRetarget)*.5,1e-12,'retarget from displayed state');

const stale=interp.accept(state(3,{position:{x:99,y:25,z:0}}));assert.deepEqual(stale,{accepted:false,snapped:false,reason:'stale-or-duplicate',tick:3});assert.notEqual(interp.current().position.x,99);
const distanceSnap=interp.accept(state(4,{position:{x:10,y:25,z:0}}));assert.equal(distanceSnap.snapped,true);assert.equal(distanceSnap.reason,'distance-snap');assert.equal(interp.current().position.x,10);
const gapSnap=interp.accept(state(10,{position:{x:10.1,y:25,z:0}}));assert.equal(gapSnap.snapped,true);assert.equal(gapSnap.reason,'tick-gap-snap');assert.equal(gapSnap.gap,6);

const angle=new AuthoritativePlayerInterpolator();angle.accept(state(20,{yaw:Math.PI-.02}));angle.accept(state(21,{yaw:-Math.PI+.02}));sampled=angle.step(.025);assert.ok(Math.abs(Math.abs(sampled.yaw)-Math.PI)<.03,'yaw interpolation must take the short wraparound path');angle.step(.025);near(angle.current().yaw,-Math.PI+.02,1e-12,'wrapped target yaw');

const wrap=new AuthoritativePlayerInterpolator();wrap.accept(state(0xffffffff));result=wrap.accept(state(0,{position:{x:.1,y:25,z:0}}));assert.equal(result.accepted,true);assert.equal(result.gap,1);assert.equal(wrap.accept(state(0xffffffff)).accepted,false);

const metadata=new AuthoritativePlayerInterpolator();metadata.accept(state(100));metadata.accept(state(101,{position:{x:.1,y:25,z:0},mode:'creative',flying:true,grounded:false,swimCoverage:.5,voided:true,pitch:.4}));sampled=metadata.step(.01);assert.equal(sampled.mode,'creative');assert.equal(sampled.flying,true,'discrete authoritative flight state must survive interpolation immediately');assert.equal(sampled.grounded,false);assert.equal(sampled.swimCoverage,.5);assert.equal(sampled.voided,true);near(sampled.pitch,.08,1e-12,'pitch interpolation');metadata.accept(state(102,{position:{x:.2,y:25,z:0},mode:'creative',flying:false}));assert.equal(metadata.step(.01).flying,false,'later authoritative flight disable must also propagate');

const isolated=interp.current();isolated.position.x=777;assert.notEqual(interp.current().position.x,777,'current() must not expose mutable interpolation state');interp.reset();assert.equal(interp.ready,false);assert.equal(interp.current(),null);assert.equal(interp.session,null);assert.equal(interp.lastTick,null);

assert.throws(()=>new AuthoritativePlayerInterpolator({tickRate:0}),/greater than zero/);assert.throws(()=>new AuthoritativePlayerInterpolator({snapDistance:0}),/greater than zero/);assert.throws(()=>new AuthoritativePlayerInterpolator({maxTickGap:0}),/positive integer/);assert.throws(()=>new AuthoritativePlayerInterpolator().accept(state(0,{session:'bad session'})),/session/);assert.throws(()=>new AuthoritativePlayerInterpolator().accept(state(0,{position:{x:Number.NaN,y:0,z:0}})),/finite/);assert.throws(()=>new AuthoritativePlayerInterpolator().accept(state(0,{mode:'builder'})),/unsupported/);assert.throws(()=>new AuthoritativePlayerInterpolator().accept(state(0,{flying:1})),/flying must be boolean/);assert.throws(()=>new AuthoritativePlayerInterpolator().step(-.1),/non-negative/);
const sessionGuard=new AuthoritativePlayerInterpolator();sessionGuard.accept(state(0));assert.throws(()=>sessionGuard.accept({...state(1),session:'other-session'}),/session mismatch/);

console.log('authoritative player snapshot interpolation + flight metadata + snap/wrap rules: PASS');
