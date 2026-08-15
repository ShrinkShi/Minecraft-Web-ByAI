import {currentMultiplayerCombatSnapshot,subscribeMultiplayerCombatSnapshots} from './multiplayer-combat-channel.js';

const OLD_CAPABILITY_NOTICES=Object.freeze([
  '多人服务器已接管移动、普通方块交互、掉落物与背包状态；装备、合成、战斗和本地存档仍未接入。',
  '多人服务器已接管移动、普通方块交互、掉落物、背包与装备状态；合成、战斗和本地存档仍未接入。',
  '多人服务器已接管移动、普通方块交互、掉落物、背包、装备与玩家 2×2 合成状态；工作台、战斗和本地存档仍未接入。',
  '多人服务器已接管移动、普通方块交互、掉落物、背包、装备、玩家 2×2 合成与工作台 3×3 容器；战斗和本地存档仍未接入。'
]);
export const MULTIPLAYER_PVP_CAPABILITY_NOTICE='多人服务器已接管移动、普通方块交互、掉落物、背包、装备、玩家 2×2 合成、工作台 3×3 容器与玩家 PvP 近战；怪物战斗、投射物、爆炸和本地存档仍未接入。';

function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);return value;}
function renderHealth(root,hp,maxHp){root.textContent='';const safeMax=Math.max(.001,Number(maxHp)||20),safeHp=Math.max(0,Math.min(safeMax,Number(hp)||0));for(let i=0;i<10;i++){const heart=document.createElement('i'),threshold=(i+.5)*safeMax/10;heart.className='heart'+(safeHp>=threshold?'':' empty');root.append(heart);}}
function upgradeCapabilityNotice(){for(const line of document.querySelectorAll('#chat-log .chat-line'))if(OLD_CAPABILITY_NOTICES.includes(line.textContent))line.textContent=MULTIPLAYER_PVP_CAPABILITY_NOTICE;}

export function installMultiplayerCombatPresentation({movement,runtime,canvas}={}){
  movement=object(movement,'multiplayer movement session');runtime=object(runtime,'multiplayer runtime');if(typeof movement.sendRespawn!=='function')throw new TypeError('multiplayer movement session must expose sendRespawn');
  const deathRoot=document.querySelector('#death-menu'),reason=document.querySelector('#death-reason'),detail=document.querySelector('#death-detail'),hearts=document.querySelector('#hearts');if(!deathRoot||!reason||!detail||!hearts)throw new Error('multiplayer combat presentation DOM is incomplete');
  let active=true,dead=false,respawnPending=false,respawnTick=null,finishFrame=null,lastSnapshot=null;
  const hidePanels=()=>{document.querySelector('#inventory')?.classList.add('hidden');document.querySelector('#workbench')?.classList.add('hidden');document.querySelector('#chat-input-wrap')?.classList.add('hidden');};
  const cancelFinish=()=>{if(finishFrame!==null){cancelAnimationFrame(finishFrame);finishFrame=null;}};
  const finishRespawnWhenAuthoritativeMovementAdvances=()=>{cancelFinish();const poll=()=>{if(!active)return;const current=currentMultiplayerCombatSnapshot();if(current?.dead){finishFrame=requestAnimationFrame(poll);return;}const tick=movement.current?.()?.tick;if(respawnTick!==null&&(!Number.isInteger(tick)||tick<=respawnTick)){finishFrame=requestAnimationFrame(poll);return;}finishFrame=null;respawnPending=false;dead=false;deathRoot.classList.remove('active');detail.textContent='';};finishFrame=requestAnimationFrame(poll);};
  const present=snapshot=>{if(!active||!snapshot)return;lastSnapshot=snapshot;renderHealth(hearts,snapshot.hp,snapshot.maxHp);upgradeCapabilityNotice();if(snapshot.dead){dead=true;respawnPending=false;cancelFinish();try{if(document.pointerLockElement===canvas)document.exitPointerLock?.();}catch{}hidePanels();reason.textContent=runtime.player?.position?.y<-8?'你掉出了世界':'你死了';detail.textContent='服务器已结算死亡与掉落。点击“重生”后由服务器决定重生位置。';for(const screen of document.querySelectorAll('.screen'))screen.classList.remove('active');deathRoot.classList.add('active');return;}if(dead&&respawnPending)finishRespawnWhenAuthoritativeMovementAdvances();};
  const release=subscribeMultiplayerCombatSnapshots(present);const current=currentMultiplayerCombatSnapshot();if(current)present(current);upgradeCapabilityNotice();
  const onClick=event=>{const target=event.target instanceof Element?event.target.closest('[data-action="respawn"]'):null;if(!target||!dead)return;event.preventDefault();event.stopImmediatePropagation();if(respawnPending)return;respawnPending=true;respawnTick=movement.current?.()?.tick??null;detail.textContent='等待服务器重生…';try{const sent=movement.sendRespawn();if(sent===null)throw new Error('multiplayer movement session is not ready');}catch(error){respawnPending=false;detail.textContent=`重生请求发送失败：${error?.message||error}`;}};
  document.addEventListener('click',onClick,true);
  return()=>{if(!active)return false;active=false;cancelFinish();release();document.removeEventListener('click',onClick,true);deathRoot.classList.remove('active');if(lastSnapshot)renderHealth(hearts,lastSnapshot.maxHp,lastSnapshot.maxHp);return true;};
}
