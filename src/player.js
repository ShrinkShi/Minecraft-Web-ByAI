import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import {BLOCKS} from './blocks.js';
import {applyDamage,knockbackDirection} from './combat.js';
import {normalizeControlState,registerControlActionInterceptor} from './control-intents.js';
import {lookDirectionFromYawPitch} from './player-orientation-rules.js';
import {planPlayerMotionStep,playerSprintActive} from './player-motion-rules.js';
import {addHungerExhaustion,attackExhaustion,canSprintWithHunger,consumeFood,createHungerState,damageExhaustion,jumpExhaustion,movementExhaustion,stepHunger as stepHungerRules} from './hunger-rules.js';
import {PlayerModelFactory} from './player-model-renderer.js';
import {
  PLAYER_COLLISION_RADIUS,
  PLAYER_COLLISION_HEIGHT,
  PLAYER_EYE_HEIGHT,
  PLAYER_WATER_EXIT_STEP_HEIGHT,
  playerCollidesBlocks,
  resolvePlayerAxisMove,
  probePlayerGrounded,
  samplePlayerWaterCoverage
} from './player-environment-rules.js';

export class PlayerController{
  constructor(camera,canvas,world,scene){
    this.camera=camera;this.canvas=canvas;this.world=world;this.scene=scene;
    this.position=new THREE.Vector3(0,40,0);this.velocity=new THREE.Vector3();
    this.yaw=0;this.pitch=0;this.controlState=normalizeControlState();this.grounded=false;this.flying=false;this.viewMode=0;this.swimCoverage=0;
    this.mode='survival';this.hp=20;this.hunger=20;this.saturation=5;this.exhaustion=0;this.foodTickTimer=0;this.hurtUntil=-Infinity;
    this.eye=PLAYER_EYE_HEIGHT;this.height=PLAYER_COLLISION_HEIGHT;this.radius=PLAYER_COLLISION_RADIUS;this.walk=4.3;this.sprint=5.6;
    this.playerModelFactory=null;this.avatarVisual=null;this.visualDead=false;this.avatar=this.createAvatar();
    this.releaseVisualActionInterceptor=registerControlActionInterceptor(intent=>{if(intent?.name==='secondary')this.triggerUseAnimation();});
  }

  createAvatar(){
    if(!this.scene)return null;
    this.playerModelFactory=new PlayerModelFactory();this.avatarVisual=this.playerModelFactory.create();
    const root=this.avatarVisual.root;root.userData.transient=true;root.userData.localPlayer=true;root.visible=false;this.scene.add(root);return root;
  }

  setControlState(state){const previousPrimary=this.controlState.primary;this.controlState=normalizeControlState(state);if(this.controlState.primary&&!previousPrimary)this.triggerPrimaryAnimation();}
  clearControlState(){this.controlState=normalizeControlState();}
  applyLookIntent(yawDelta,pitchDelta){if(!Number.isFinite(yawDelta)||!Number.isFinite(pitchDelta))return;this.setLook(this.yaw+yawDelta,this.pitch+pitchDelta);}
  setMode(mode){this.mode=mode;this.flying=mode==='creative'||mode==='spectator';if(this.flying)this.swimCoverage=0;}
  cycleView(){this.viewMode=(this.viewMode+1)%3;this.syncCamera();return this.viewMode;}
  triggerPrimaryAnimation(){return this.playerModelFactory?.triggerPrimary(this.avatarVisual)??false;}
  triggerUseAnimation(){return this.playerModelFactory?.triggerUse(this.avatarVisual)??false;}
  setDeathVisual(value){this.visualDead=!!value;return this.visualDead;}

  spawn(x,z){const y=this.world.highestSolid(x,z)+1.001;this.position.set(x+.5,y,z+.5);this.velocity.set(0,0,0);this.swimCoverage=0;this.syncCamera();}
  resetVitals(){this.hp=20;this.hunger=20;this.saturation=5;this.exhaustion=0;this.foodTickTimer=0;this.hurtUntil=-Infinity;this.setDeathVisual(false);}
  respawn(x=0,z=0){this.resetVitals();this.spawn(x,z);}
  respawnAt(position){
    if(!position||![position.x,position.y,position.z].every(Number.isFinite))return false;const next=new THREE.Vector3(position.x,position.y,position.z);
    if(this.mode!=='spectator'&&this.collides(next))return false;this.resetVitals();this.position.copy(next);this.velocity.set(0,0,0);this.swimCoverage=0;this.syncCamera();return true;
  }

  restore(snapshot){
    if(!snapshot)return false;const p=snapshot.position;if(!p||![p.x,p.y,p.z].every(Number.isFinite))return false;
    this.position.set(p.x,p.y,p.z);this.velocity.set(0,0,0);this.swimCoverage=0;this.yaw=Number.isFinite(snapshot.yaw)?snapshot.yaw:0;this.pitch=Number.isFinite(snapshot.pitch)?snapshot.pitch:0;
    this.hp=Number.isFinite(snapshot.hp)?Math.max(0,Math.min(20,snapshot.hp)):20;this.applyHungerState({food:Number.isFinite(snapshot.hunger)?snapshot.hunger:20,saturation:Number.isFinite(snapshot.saturation)?snapshot.saturation:5,exhaustion:Number.isFinite(snapshot.exhaustion)?snapshot.exhaustion:0,timer:Number.isFinite(snapshot.foodTickTimer)?snapshot.foodTickTimer:0});this.hurtUntil=-Infinity;this.setDeathVisual(this.hp<=0);
    this.viewMode=Number.isInteger(snapshot.viewMode)?((snapshot.viewMode%3)+3)%3:0;if(this.collides(this.position)&&this.mode!=='spectator')return false;this.syncCamera();return true;
  }

  snapshot(){return{position:{x:this.position.x,y:this.position.y,z:this.position.z},yaw:this.yaw,pitch:this.pitch,hp:this.hp,hunger:this.hunger,saturation:this.saturation,exhaustion:this.exhaustion,foodTickTimer:this.foodTickTimer,mode:this.mode,viewMode:this.viewMode};}

  hungerState(){return createHungerState({food:this.hunger,saturation:this.saturation,exhaustion:this.exhaustion,timer:this.foodTickTimer});}
  applyHungerState(value){const state=createHungerState(value);this.hunger=state.food;this.saturation=state.saturation;this.exhaustion=state.exhaustion;this.foodTickTimer=state.timer;return state;}
  addExhaustion(amount){if(this.mode!=='survival')return this.hungerState();return this.applyHungerState(addHungerExhaustion(this.hungerState(),amount));}
  recordAttackExhaustion(){return this.addExhaustion(attackExhaustion());}
  eat(profile){const result=consumeFood(this.hungerState(),profile);if(result.consumed)this.applyHungerState(result.state);return result;}
  stepHunger(dt){const result=stepHungerRules(this.hungerState(),{dt,hp:this.hp,maxHp:20,mode:this.mode});this.applyHungerState(result.state);if(result.heal>0)this.hp=Math.min(20,this.hp+result.heal);if(result.damage>0){this.hp=Math.max(0,this.hp-result.damage);if(this.hp<=0)this.setDeathVisual(true);}return result;}

  takeDamage(amount,now,source=null){
    if(this.mode==='creative'||this.mode==='spectator')return{applied:false,damage:0,hp:this.hp,dead:false};
    const result=applyDamage(this,amount,now,{maxHp:20});
    if(result.applied)this.addExhaustion(damageExhaustion());
    if(result.applied&&source&&Number.isFinite(source.x)&&Number.isFinite(source.z))this.knockbackFrom(source.x,source.z,.52,.24);
    if(result.dead)this.setDeathVisual(true);
    return result;
  }

  knockbackFrom(sourceX,sourceZ,strength=.45,vertical=.2){
    const direction=knockbackDirection(sourceX,sourceZ,this.position.x,this.position.z);
    this.velocity.x+=direction.x*strength*7;this.velocity.z+=direction.z*strength*7;this.velocity.y=Math.max(this.velocity.y,vertical*7);
  }

  collides(pos){
    if(this.mode==='spectator')return false;
    return playerCollidesBlocks(pos,(x,y,z)=>!!BLOCKS[this.world.getBlock(x,y,z)]?.solid,{radius:this.radius,height:this.height});
  }

  moveAxis(axis,amount,{stepHeight=0}={}){
    if(!amount)return null;
    const result=resolvePlayerAxisMove({position:this.position,velocity:this.velocity,grounded:this.grounded,axis,amount,collides:position=>this.collides(position),stepHeight});
    this.position.set(result.position.x,result.position.y,result.position.z);this.velocity.set(result.velocity.x,result.velocity.y,result.velocity.z);this.grounded=result.grounded;return result;
  }

  waterCoverage(){
    if(this.flying||!this.world)return 0;
    return samplePlayerWaterCoverage(this.position,(x,y,z)=>!!BLOCKS[this.world.getBlock(x,y,z)]?.liquid,{eyeHeight:this.eye});
  }

  update(dt){
    const startX=this.position.x,startZ=this.position.z;
    this.swimCoverage=this.flying?0:this.waterCoverage();
    const jumpProbe=!this.flying&&this.swimCoverage===0&&this.controlState.jump&&this.isGroundedProbe(),sprintAllowed=canSprintWithHunger(this.hunger,this.mode),motionControl=sprintAllowed?this.controlState:{...this.controlState,sprint:false},sprinting=playerSprintActive(motionControl,{swimActive:this.swimCoverage>0});
    if(this.mode==='survival'&&jumpProbe)this.addExhaustion(jumpExhaustion({sprinting}));
    const motion=planPlayerMotionStep({dt,yaw:this.yaw,control:motionControl,velocity:this.velocity,flying:this.flying,swimCoverage:this.swimCoverage,grounded:jumpProbe,walkSpeed:this.walk,sprintSpeed:this.sprint});
    this.velocity.set(motion.velocity.x,motion.velocity.y,motion.velocity.z);
    if(this.flying){
      this.moveAxis('x',motion.displacement.x);this.moveAxis('z',motion.displacement.z);this.moveAxis('y',motion.displacement.y);this.velocity.set(0,0,0);
    }else{
      this.grounded=false;
      const waterExitStep=this.controlState.jump&&this.swimCoverage>0?PLAYER_WATER_EXIT_STEP_HEIGHT:0;
      const xMove=this.moveAxis('x',motion.displacement.x,{stepHeight:waterExitStep});
      this.moveAxis('z',motion.displacement.z,{stepHeight:xMove?.stepped?0:waterExitStep});
      this.moveAxis('y',motion.displacement.y);
      this.velocity.x*=motion.horizontalDrag;this.velocity.z*=motion.horizontalDrag;
      if(this.position.y<-10){this.hp=0;this.setDeathVisual(true);}
    }
    if(this.mode==='survival'){const distance=Math.hypot(this.position.x-startX,this.position.z-startZ),amount=movementExhaustion(distance,{sprinting,swimming:this.swimCoverage>0});if(amount>0)this.addExhaustion(amount);}
    this.syncCamera();this.updateVisual(dt);
  }

  updateVisual(dt){
    if(!this.avatarVisual||!this.playerModelFactory)return false;
    let speed=Math.hypot(this.velocity.x,this.velocity.z);if(this.flying&&speed<.01)speed=Math.hypot(this.controlState.side,this.controlState.forward)*(this.controlState.sprint?this.sprint:this.walk);
    const sprinting=playerSprintActive(this.controlState,{swimActive:this.swimCoverage>0})&&speed>.1;
    return this.playerModelFactory.animate(this.avatarVisual,dt,{speed,sprint:sprinting,primary:this.controlState.primary,dead:this.visualDead||this.hp<=0,headPitch:-this.pitch,headYaw:0});
  }

  isGroundedProbe(){return probePlayerGrounded(this.position,position=>this.collides(position));}
  eyePosition(target=new THREE.Vector3()){return target.set(this.position.x,this.position.y+this.eye,this.position.z);}
  lookDirection(target=new THREE.Vector3()){const direction=lookDirectionFromYawPitch(this.yaw,this.pitch);return target.set(direction.x,direction.y,direction.z);}
  setLook(yaw,pitch){if(Number.isFinite(yaw))this.yaw=yaw;if(Number.isFinite(pitch))this.pitch=Math.max(-1.553,Math.min(1.553,pitch));this.syncCamera();}

  syncCamera(){
    const target=this.eyePosition(new THREE.Vector3()),forward=this.lookDirection(new THREE.Vector3());
    if(this.viewMode===0){this.camera.position.copy(target);this.camera.rotation.order='YXZ';this.camera.rotation.y=this.yaw;this.camera.rotation.x=this.pitch;}
    else{const sign=this.viewMode===1?-1:1;this.camera.position.copy(target).addScaledVector(forward,sign*4).add(new THREE.Vector3(0,.35,0));this.camera.lookAt(target);}
    if(this.avatar){this.avatar.visible=this.viewMode!==0;this.avatar.position.copy(this.position);this.avatar.rotation.y=this.yaw;}
    if(this.canvas)this.canvas.dataset.viewMode=String(this.viewMode);
  }

  dispose(){if(this.canvas)delete this.canvas.dataset.viewMode;this.releaseVisualActionInterceptor?.();this.releaseVisualActionInterceptor=null;if(this.avatar)this.scene?.remove(this.avatar);this.avatar=null;this.avatarVisual=null;this.playerModelFactory?.dispose();this.playerModelFactory=null;}
}
