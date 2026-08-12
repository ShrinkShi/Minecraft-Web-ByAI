import {watchDeviceProfile} from './device-profile.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export class MobileControls{
  constructor(callbacks={}){
    this.callbacks=callbacks;this.root=document.querySelector('#mobile-controls');this.joystick=document.querySelector('#mobile-joystick');this.knob=document.querySelector('#mobile-joystick-knob');this.lookZone=document.querySelector('#mobile-look-zone');
    this.profile={mobile:false,orientation:'landscape'};this.gameplayEnabled=false;this.movePointer=null;this.lookPointer=null;this.lookLast=null;this.holds=new Map();this.toggles={sprint:false,sneak:false};
    this.bind();this.stopWatch=watchDeviceProfile(profile=>{this.profile=profile;this.callbacks.onProfile?.(profile);this.sync();});
  }

  bind(){
    if(!this.root)return;
    this.joystick?.addEventListener('pointerdown',e=>{if(!this.interactive())return;e.preventDefault();e.stopPropagation();this.movePointer=e.pointerId;this.updateJoystick(e);});
    this.lookZone?.addEventListener('pointerdown',e=>{if(!this.interactive())return;e.preventDefault();this.lookPointer=e.pointerId;this.lookLast={x:e.clientX,y:e.clientY};});
    window.addEventListener('pointermove',e=>{
      if(e.pointerId===this.movePointer)this.updateJoystick(e);
      if(e.pointerId===this.lookPointer&&this.lookLast){const dx=e.clientX-this.lookLast.x,dy=e.clientY-this.lookLast.y;this.lookLast={x:e.clientX,y:e.clientY};this.callbacks.onLook?.(dx,dy);}
    },{passive:false});
    const release=e=>{if(e.pointerId===this.movePointer){this.movePointer=null;this.resetMove();}if(e.pointerId===this.lookPointer){this.lookPointer=null;this.lookLast=null;}const hold=this.holds.get(e.pointerId);if(hold){this.holds.delete(e.pointerId);this.callbacks.onHold?.(hold,false);}};
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
    for(const button of this.root.querySelectorAll('[data-mobile-action]'))button.addEventListener('pointerdown',e=>{if(!this.interactive())return;e.preventDefault();e.stopPropagation();this.callbacks.onAction?.(button.dataset.mobileAction);});
    for(const button of this.root.querySelectorAll('[data-mobile-hold]'))button.addEventListener('pointerdown',e=>{if(!this.interactive())return;e.preventDefault();e.stopPropagation();const name=button.dataset.mobileHold;this.holds.set(e.pointerId,name);this.callbacks.onHold?.(name,true);});
    for(const button of this.root.querySelectorAll('[data-mobile-toggle]'))button.addEventListener('pointerdown',e=>{if(!this.interactive())return;e.preventDefault();e.stopPropagation();const name=button.dataset.mobileToggle,next=!this.toggles[name];this.toggles[name]=next;button.classList.toggle('active',next);button.setAttribute('aria-pressed',String(next));this.callbacks.onToggle?.(name,next);});
  }

  interactive(){return !!this.profile.mobile&&this.profile.orientation==='landscape'&&this.gameplayEnabled;}

  updateJoystick(e){
    const rect=this.joystick?.getBoundingClientRect();if(!rect)return;const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,radius=Math.max(24,Math.min(rect.width,rect.height)*.36),rawX=e.clientX-cx,rawY=e.clientY-cy,length=Math.hypot(rawX,rawY)||1,scale=Math.min(1,radius/length),dx=rawX*scale,dy=rawY*scale,nx=clamp(dx/radius,-1,1),ny=clamp(dy/radius,-1,1);
    if(this.knob)this.knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;this.callbacks.onMove?.(nx,-ny);
  }

  resetMove(){if(this.knob)this.knob.style.transform='translate(-50%,-50%)';this.callbacks.onMove?.(0,0);}
  reset(){this.movePointer=null;this.lookPointer=null;this.lookLast=null;this.resetMove();for(const [pointerId,name] of this.holds){void pointerId;this.callbacks.onHold?.(name,false);}this.holds.clear();for(const name of Object.keys(this.toggles)){if(this.toggles[name])this.callbacks.onToggle?.(name,false);this.toggles[name]=false;}for(const button of this.root?.querySelectorAll('[data-mobile-toggle]')||[]){button.classList.remove('active');button.setAttribute('aria-pressed','false');}}

  setGameplayEnabled(enabled){const next=!!enabled;if(next===this.gameplayEnabled)return;this.gameplayEnabled=next;if(!next)this.reset();this.sync();}
  sync(){if(!this.root)return;const visible=this.interactive();this.root.classList.toggle('hidden',!visible);this.root.setAttribute('aria-hidden',String(!visible));if(!visible&&(this.movePointer!==null||this.lookPointer!==null||this.holds.size))this.reset();}
  dispose(){this.stopWatch?.();this.reset();}
}
