import {currentMultiplayerHungerSnapshot,subscribeMultiplayerHungerSnapshots} from './multiplayer-hunger-channel.js';

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function renderHunger(root,food){const safeFood=Math.max(0,Math.min(20,Number(food)||0));root.textContent='';root.dataset.food=String(safeFood);root.setAttribute('aria-label',`饥饿值 ${safeFood.toFixed(1)} / 20`);for(let i=0;i<10;i++){const icon=document.createElement('i');icon.className='food'+(safeFood>=i*2+1?'':' empty');root.append(icon);}}

export function installMultiplayerHungerPresentation({runtime}={}){
  runtime=object(runtime,'multiplayer runtime');const root=document.querySelector('#hunger');if(!root)throw new Error('multiplayer hunger presentation DOM is incomplete');let active=true,lastSnapshot=null;
  const present=snapshot=>{if(!active||!snapshot)return;lastSnapshot=snapshot;renderHunger(root,snapshot.food);if(runtime.hungerState&&runtime.hungerState.revision!==snapshot.revision)return;};
  const release=subscribeMultiplayerHungerSnapshots(present),current=currentMultiplayerHungerSnapshot();if(current)present(current);else if(runtime.hungerState)present(runtime.hungerState);
  return()=>{if(!active)return false;active=false;release();if(lastSnapshot)renderHunger(root,20);return true;};
}
