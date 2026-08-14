import {DoubleTapForwardSprint} from './sprint-gesture.js';

const MOVEMENT_CODES=new Set(['KeyW','KeyA','KeyS','KeyD']);
const BUTTON_CODES=new Map([['Space','jump'],['ShiftLeft','sneak'],['ShiftRight','sneak'],['ControlLeft','sprint'],['ControlRight','sprint']]);

export class DesktopControls{
  constructor(canvas,bus){
    this.canvas=canvas;this.bus=bus;this.source='desktop';this.gameplayEnabled=false;this.keys=new Set();this.forwardSprint=new DoubleTapForwardSprint();this.bind();
  }

  bind(){
    this.onKeyDown=e=>{
      const code=e.code;
      if((MOVEMENT_CODES.has(code)||BUTTON_CODES.has(code))&&this.gameplayEnabled){
        if(code==='KeyW'&&!e.repeat)this.forwardSprint.press(Number.isFinite(e.timeStamp)?e.timeStamp:performance.now());
        this.keys.add(code);this.syncContinuous();if(code==='Space')e.preventDefault();
      }
      if(e.repeat)return;
      let handled=false;
      if(code==='Escape')handled=!!this.bus.action(this.source,'escape');
      else if(code==='KeyE')handled=!!this.bus.action(this.source,'inventory');
      else if(code==='F5')handled=!!this.bus.action(this.source,'view');
      else if(code==='KeyT')handled=!!this.bus.action(this.source,'chat',{prefix:''});
      else if(code==='Slash')handled=!!this.bus.action(this.source,'chat',{prefix:'/'});
      else if(code==='KeyQ')handled=!!this.bus.action(this.source,'drop');
      else if(/^Digit[1-9]$/.test(code))handled=!!this.bus.action(this.source,'hotbar-select',{index:Number(code.slice(-1))-1});
      if(handled)e.preventDefault();
    };
    this.onKeyUp=e=>{if(MOVEMENT_CODES.has(e.code)||BUTTON_CODES.has(e.code)){this.keys.delete(e.code);if(e.code==='KeyW')this.forwardSprint.release();this.syncContinuous();}};
    this.onMouseMove=e=>{if(!this.gameplayEnabled||document.pointerLockElement!==this.canvas)return;this.bus.look(this.source,-e.movementX*.0022,-e.movementY*.0022);};
    this.onMouseDown=e=>{if(!this.gameplayEnabled)return;if(e.button===0)this.bus.setButton(this.source,'primary',true);else if(e.button===2)this.bus.action(this.source,'secondary');};
    this.onMouseUp=e=>{if(e.button===0)this.bus.setButton(this.source,'primary',false);};
    this.onWheel=e=>{if(!this.gameplayEnabled)return;this.bus.action(this.source,'hotbar-step',{step:e.deltaY>0?1:-1});};
    this.onCanvasClick=()=>this.bus.action(this.source,'focus');
    window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);document.addEventListener('mousemove',this.onMouseMove);this.canvas.addEventListener('mousedown',this.onMouseDown);window.addEventListener('mouseup',this.onMouseUp);this.canvas.addEventListener('wheel',this.onWheel,{passive:true});this.canvas.addEventListener('click',this.onCanvasClick);
  }

  syncContinuous(){
    const forward=(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0),side=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0);this.bus.setMove(this.source,side,forward);
    for(const name of ['jump','sneak','sprint']){
      let pressed=name==='sprint'&&this.forwardSprint.active&&this.keys.has('KeyW');
      for(const [code,button] of BUTTON_CODES)if(button===name&&this.keys.has(code)){pressed=true;break;}
      this.bus.setButton(this.source,name,pressed);
    }
  }

  reset(){this.keys.clear();this.forwardSprint.reset();this.bus.resetSource(this.source);}
  setGameplayEnabled(enabled){const next=!!enabled;if(next===this.gameplayEnabled)return;this.gameplayEnabled=next;if(!next)this.reset();}
  dispose(){this.reset();window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);document.removeEventListener('mousemove',this.onMouseMove);this.canvas.removeEventListener('mousedown',this.onMouseDown);window.removeEventListener('mouseup',this.onMouseUp);this.canvas.removeEventListener('wheel',this.onWheel);this.canvas.removeEventListener('click',this.onCanvasClick);}
}
