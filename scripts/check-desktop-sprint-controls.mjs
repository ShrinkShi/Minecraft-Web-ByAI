import assert from 'node:assert/strict';
import {DESKTOP_SPRINT_HOLD_CODE,DESKTOP_SPRINT_HOLD_CODES,DesktopControls,desktopButtonForCode} from '../src/desktop-controls.js';

class Target{constructor(){this.listeners=new Map();}addEventListener(name,fn){this.listeners.set(name,fn);}removeEventListener(name){this.listeners.delete(name);}}
const windowTarget=new Target(),documentTarget=new Target(),canvas=new Target();
globalThis.window=windowTarget;globalThis.document=documentTarget;documentTarget.pointerLockElement=canvas;
const states=[],actions=[];const sourceState={side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false};
const bus={
  setMove(_source,side,forward){sourceState.side=side;sourceState.forward=forward;states.push({...sourceState});},
  setButton(_source,name,value){sourceState[name]=value;states.push({...sourceState});},
  resetSource(){Object.assign(sourceState,{side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false});states.push({...sourceState});},
  action(_source,name){actions.push(name);return name==='drop';},look(){}
};
assert.equal(DESKTOP_SPRINT_HOLD_CODE,'ControlLeft');assert.deepEqual(DESKTOP_SPRINT_HOLD_CODES,['ControlLeft','ControlRight']);assert.equal(desktopButtonForCode('ControlLeft'),'sprint');assert.equal(desktopButtonForCode('ControlRight'),'sprint');assert.equal(desktopButtonForCode('KeyR'),null);
const controls=new DesktopControls(canvas,bus);const event=(code,timeStamp,{repeat=false}={})=>({code,timeStamp,repeat,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}});
controls.onKeyDown(event('KeyQ',50));assert.deepEqual(actions,[],'Q must not emit a drop action before gameplay input is enabled');
controls.setGameplayEnabled(true);controls.onKeyDown(event('KeyQ',60));assert.deepEqual(actions,['drop'],'Q emits drop while gameplay input is active');
controls.onKeyDown(event('KeyW',100));assert.equal(sourceState.forward,1);assert.equal(sourceState.sprint,false);controls.onKeyUp(event('KeyW',160));
controls.onKeyDown(event('KeyW',330));assert.equal(sourceState.forward,1);assert.equal(sourceState.sprint,true,'second W press within 300ms should sprint');controls.onKeyUp(event('KeyW',400));assert.equal(sourceState.sprint,false,'releasing W ends double-W sprint');
controls.onKeyDown(event('KeyW',1000));controls.onKeyDown(event('ControlLeft',1010));assert.equal(sourceState.sprint,true,'Left Ctrl + W should sprint');controls.onKeyUp(event('ControlLeft',1020));assert.equal(sourceState.sprint,false);controls.onKeyUp(event('KeyW',1030));
controls.onKeyDown(event('KeyW',1400));controls.onKeyDown(event('ControlRight',1410));assert.equal(sourceState.sprint,true,'Right Ctrl + W should sprint too');controls.onKeyUp(event('ControlRight',1420));assert.equal(sourceState.sprint,false);controls.onKeyUp(event('KeyW',1430));
controls.onKeyDown(event('KeyW',1800));controls.onKeyDown(event('KeyR',1810));assert.equal(sourceState.sprint,false,'R is no longer a sprint binding');controls.onKeyUp(event('KeyR',1820));controls.onKeyUp(event('KeyW',1830));
const tab=event('Tab',1900);controls.onKeyDown(tab);assert.equal(tab.defaultPrevented,true,'gameplay Tab must not move browser focus');assert.equal(sourceState.sprint,false);
controls.setGameplayEnabled(false);controls.onKeyDown(event('KeyQ',2000));assert.deepEqual(actions,['drop'],'Q must not emit while inventory/chat/pause disables gameplay input');
controls.reset();assert.equal(sourceState.sprint,false);assert.equal(sourceState.forward,0);controls.dispose();
console.log('desktop Ctrl+W + double-W sprint + browser-reserved-key integration: PASS');
