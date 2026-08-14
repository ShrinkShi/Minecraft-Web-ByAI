import assert from 'node:assert/strict';
import {DesktopControls} from '../src/desktop-controls.js';

class Target{constructor(){this.listeners=new Map();}addEventListener(name,fn){this.listeners.set(name,fn);}removeEventListener(name){this.listeners.delete(name);}}
const windowTarget=new Target(),documentTarget=new Target(),canvas=new Target();
globalThis.window=windowTarget;globalThis.document=documentTarget;documentTarget.pointerLockElement=canvas;
const states=[];const sourceState={side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false};
const bus={
  setMove(_source,side,forward){sourceState.side=side;sourceState.forward=forward;states.push({...sourceState});},
  setButton(_source,name,value){sourceState[name]=value;states.push({...sourceState});},
  resetSource(){Object.assign(sourceState,{side:0,forward:0,jump:false,sneak:false,sprint:false,primary:false});states.push({...sourceState});},
  action(){return false;},look(){}
};
const controls=new DesktopControls(canvas,bus);controls.setGameplayEnabled(true);
const event=(code,timeStamp,{repeat=false}={})=>({code,timeStamp,repeat,preventDefault(){}});
controls.onKeyDown(event('KeyW',100));assert.equal(sourceState.forward,1);assert.equal(sourceState.sprint,false);controls.onKeyUp(event('KeyW',160));
controls.onKeyDown(event('KeyW',330));assert.equal(sourceState.forward,1);assert.equal(sourceState.sprint,true,'second W press within 300ms should sprint');controls.onKeyUp(event('KeyW',400));assert.equal(sourceState.sprint,false,'releasing W ends double-W sprint');
controls.onKeyDown(event('KeyW',1000));controls.onKeyDown(event('ControlLeft',1010));assert.equal(sourceState.sprint,true,'Ctrl remains a direct sprint binding');controls.onKeyUp(event('ControlLeft',1020));assert.equal(sourceState.sprint,false);controls.onKeyUp(event('KeyW',1030));
controls.reset();assert.equal(sourceState.sprint,false);assert.equal(sourceState.forward,0);controls.dispose();
console.log('desktop Ctrl + double-W sprint integration: PASS');
