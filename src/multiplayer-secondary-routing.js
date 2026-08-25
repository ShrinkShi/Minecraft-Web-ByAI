import {registerControlActionInterceptor,registerControlPrimaryInterceptor,registerControlSecondaryInterceptor} from './control-intents.js';

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}
function sendUseRelease(movement){if(typeof movement.sendUseRelease==='function')return movement.sendUseRelease();if(typeof movement.bridge?.sendUseRelease==='function')return movement.bridge.sendUseRelease();throw new TypeError('multiplayer movement session must expose sendUseRelease or bridge.sendUseRelease');}

export function installMultiplayerSecondaryRouting({runtime,movement}={}){
  runtime=object(runtime,'multiplayer runtime');movement=object(movement,'multiplayer movement session');const player=object(runtime.player,'multiplayer runtime player');if(typeof movement.sendUse!=='function')throw new TypeError('multiplayer movement session must expose sendUse');if(typeof movement.sendDrop!=='function')throw new TypeError('multiplayer movement session must expose sendDrop');if(typeof movement.sendAttack!=='function')throw new TypeError('multiplayer movement session must expose sendAttack');
  const releaseAction=registerControlActionInterceptor(intent=>{
    if(!intent||intent.name!=='drop')return undefined;
    if(player.mode==='spectator')return false;if(movement.ready===false)return false;const sent=movement.sendDrop({yaw:finite(player.yaw,'player.yaw'),pitch:finite(player.pitch,'player.pitch')});return sent!==null;
  });
  const releaseSecondary=registerControlSecondaryInterceptor(pressed=>{
    if(!pressed){if(movement.ready!==false)sendUseRelease(movement);return true;}
    if((player.mode!=='creative'&&player.mode!=='survival')||movement.ready===false)return true;
    movement.sendUse({yaw:finite(player.yaw,'player.yaw'),pitch:finite(player.pitch,'player.pitch')});return true;
  });
  const releasePrimary=registerControlPrimaryInterceptor(pressed=>{if(!pressed)return true;if(player.mode==='spectator'||movement.ready===false)return true;movement.sendAttack({yaw:finite(player.yaw,'player.yaw'),pitch:finite(player.pitch,'player.pitch')});return true;});
  let active=true;return()=>{if(!active)return false;active=false;releasePrimary();releaseSecondary();releaseAction();return true;};
}
