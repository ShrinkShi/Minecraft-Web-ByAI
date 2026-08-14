import {registerControlActionInterceptor,registerControlPrimaryInterceptor} from './control-intents.js';

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError(`${label} must be a finite number`);return value;}

export function installMultiplayerSecondaryRouting({runtime,movement}={}){
  runtime=object(runtime,'multiplayer runtime');movement=object(movement,'multiplayer movement session');const player=object(runtime.player,'multiplayer runtime player');if(typeof movement.sendUse!=='function')throw new TypeError('multiplayer movement session must expose sendUse');if(typeof movement.sendDrop!=='function')throw new TypeError('multiplayer movement session must expose sendDrop');
  const releaseAction=registerControlActionInterceptor(intent=>{
    if(!intent)return undefined;
    if(intent.name==='drop'){
      if(player.mode==='spectator')return false;if(movement.ready===false)return false;const sent=movement.sendDrop({yaw:finite(player.yaw,'player.yaw'),pitch:finite(player.pitch,'player.pitch')});return sent!==null;
    }
    if(intent.name!=='secondary'||(player.mode!=='creative'&&player.mode!=='survival'))return undefined;
    if(movement.ready===false)return false;
    const sent=movement.sendUse({yaw:finite(player.yaw,'player.yaw'),pitch:finite(player.pitch,'player.pitch')});return sent!==null;
  });
  const releasePrimary=registerControlPrimaryInterceptor(()=>true);
  let active=true;return()=>{if(!active)return false;active=false;releasePrimary();releaseAction();return true;};
}
