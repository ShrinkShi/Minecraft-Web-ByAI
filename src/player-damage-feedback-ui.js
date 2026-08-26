import {subscribePlayerDamage} from './player-damage-channel.js';

const STYLE_ID='minecraft-player-damage-feedback-style';
function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
.player-damage-vignette{position:fixed;inset:0;z-index:18;pointer-events:none;opacity:0;box-shadow:inset 0 0 38px 10px rgba(190,0,0,.82),inset 0 0 110px 38px rgba(120,0,0,.34);background:radial-gradient(circle at center,transparent 48%,rgba(150,0,0,.12) 72%,rgba(200,0,0,.34) 100%)}
.player-damage-vignette.mc-hurt-active{animation:mc-player-hurt-vignette .36s ease-out}
#hearts.mc-hurt-active{animation:mc-player-hurt-hearts .34s steps(2,end)}
@keyframes mc-player-hurt-vignette{0%{opacity:.95}38%{opacity:.58}100%{opacity:0}}
@keyframes mc-player-hurt-hearts{0%{transform:translate(0,0)}20%{transform:translate(-5px,-2px)}40%{transform:translate(4px,1px)}60%{transform:translate(-3px,2px)}80%{transform:translate(2px,-1px)}100%{transform:translate(0,0)}}
@media(prefers-reduced-motion:reduce){.player-damage-vignette.mc-hurt-active{animation-duration:.18s}#hearts.mc-hurt-active{animation:none}}
`;document.head.append(style);
}
function restartAnimation(node){if(!node)return;node.classList.remove('mc-hurt-active');void node.offsetWidth;node.classList.add('mc-hurt-active');}
export function installPlayerDamageFeedback(){
  ensureStyle();let overlay=document.querySelector('.player-damage-vignette');if(!overlay){overlay=document.createElement('div');overlay.className='player-damage-vignette';overlay.setAttribute('aria-hidden','true');document.querySelector('#app')?.append(overlay);}
  const hearts=document.querySelector('#hearts');const release=subscribePlayerDamage(()=>{restartAnimation(overlay);restartAnimation(hearts);});
  return Object.freeze({dispose(){release();overlay?.remove();},flash(){restartAnimation(overlay);restartAnimation(hearts);}});
}
