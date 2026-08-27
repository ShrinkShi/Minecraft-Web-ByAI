import {DIFFICULTIES,UI_SCALES,loadGameSettings,subscribeGameSettings,updateGameSettings} from './game-settings.js';

const DIFFICULTY_LABELS=Object.freeze({peaceful:'和平',easy:'简单',normal:'普通',hard:'困难'});
const SCALE_LABELS=new Map([[.75,'75%'],[1,'100%'],[1.25,'125%'],[1.5,'150%'],[2,'200%']]);

function installStyles(){
  if(document.querySelector('#game-options-style'))return;
  const style=document.createElement('style');style.id='game-options-style';style.textContent=`
:root{--game-ui-scale:1}
.status-stack{transform:translateX(-50%) scale(var(--game-ui-scale))!important;transform-origin:bottom center!important}
.inventory-panel,.furnace-panel{transform:scale(var(--game-ui-scale))!important;transform-origin:center center!important}
#inventory.creative-mode .inventory-panel{transform:scale(var(--game-ui-scale))!important;transform-origin:center center!important}
.options-layer{background:#000b}.options-card{width:min(560px,92vw);padding:24px;background:linear-gradient(#202020,#111);border:3px solid #555;box-shadow:0 0 30px #000;display:flex;flex-direction:column;gap:16px;color:#fff}.options-card h2{margin:0 0 4px;text-align:center}.options-row{display:grid;grid-template-columns:170px 1fr;gap:14px;align-items:center}.options-row select{width:100%;min-height:44px;padding:7px 10px;background:#090909;color:#fff;border:2px solid #8b8b8b}.options-note{margin:0;color:#bbb;font:12px/1.45 Arial,sans-serif}.hurt-vignette{position:fixed;inset:0;z-index:12;pointer-events:none;opacity:0;background:radial-gradient(circle at center,transparent 45%,rgba(170,0,0,.16) 68%,rgba(220,0,0,.66) 100%);transition:opacity .08s linear}.hurt-vignette.active{opacity:1}.status-stack.hurt-shake{animation:hud-hurt-shake .22s steps(2,end)}@keyframes hud-hurt-shake{0%{margin-left:0}25%{margin-left:-5px}50%{margin-left:5px}75%{margin-left:-3px}100%{margin-left:0}}
.sleep-overlay{position:fixed;inset:0;z-index:13;pointer-events:none;display:grid;place-items:center;background:rgba(7,11,30,.18);opacity:0;transition:opacity .3s}.sleep-overlay.active{opacity:1}.sleep-overlay span{margin-top:38vh;padding:7px 12px;background:#0008;color:#fff;text-shadow:1px 1px #000}
@media(max-width:700px),(pointer:coarse){.inventory-panel,.furnace-panel,#inventory.creative-mode .inventory-panel{--mobile-ui-scale:min(var(--game-ui-scale),1.25);transform:scale(var(--mobile-ui-scale))!important}.options-row{grid-template-columns:1fr;gap:4px}}
`;document.head.append(style);
}
function applySettings(settings){document.documentElement.style.setProperty('--game-ui-scale',String(settings.uiScale));}
function makeOptionsScreen(){
  let root=document.querySelector('#options-menu');if(root)return root;
  root=document.createElement('section');root.id='options-menu';root.className='screen options-layer';root.innerHTML=`<div class="options-card"><h2>选项</h2><label class="options-row"><span>界面大小</span><select id="option-ui-scale"></select></label><label class="options-row"><span>难度</span><select id="option-difficulty"></select></label><p class="options-note">界面大小仅影响快捷栏、生命/饱食度状态区以及物品栏、工作台、熔炉等容器 GUI。Ctrl + 鼠标滚轮不会再缩放浏览器页面。</p><button class="mc-button" data-options-back>完成</button></div>`;
  document.querySelector('#app')?.append(root);
  const scale=root.querySelector('#option-ui-scale'),difficulty=root.querySelector('#option-difficulty');
  for(const value of UI_SCALES){const option=document.createElement('option');option.value=String(value);option.textContent=SCALE_LABELS.get(value)||`${Math.round(value*100)}%`;scale.append(option);}
  for(const value of DIFFICULTIES){const option=document.createElement('option');option.value=value;option.textContent=DIFFICULTY_LABELS[value];difficulty.append(option);}
  const sync=settings=>{scale.value=String(settings.uiScale);difficulty.value=settings.difficulty;};sync(loadGameSettings());
  scale.addEventListener('change',()=>updateGameSettings({uiScale:Number(scale.value)}));difficulty.addEventListener('change',()=>updateGameSettings({difficulty:difficulty.value}));
  root._sync=sync;return root;
}
function activeGameScreen(){return document.querySelector('#pause-menu.active')?'pause':'main';}
function showScreen(root){for(const screen of document.querySelectorAll('.screen'))screen.classList.remove('active');root.classList.add('active');}
function restoreScreen(previous){showScreen(document.querySelector(previous==='pause'?'#pause-menu':'#main-menu'));}

export function installOptionsUi(){
  installStyles();const root=makeOptionsScreen();let previous='main';const settings=loadGameSettings();applySettings(settings);root._sync?.(settings);
  const release=subscribeGameSettings(next=>{applySettings(next);root._sync?.(next);});
  window.addEventListener('wheel',event=>{if(event.ctrlKey&&event.cancelable)event.preventDefault();},{capture:true,passive:false});
  document.addEventListener('click',event=>{
    const options=event.target.closest?.('[data-action="options"]');if(options){event.preventDefault();event.stopImmediatePropagation();previous=activeGameScreen();showScreen(root);document.exitPointerLock?.();return;}
    if(event.target.closest?.('[data-options-back]')){event.preventDefault();event.stopImmediatePropagation();restoreScreen(previous);}
  },true);
  return{root,release,snapshot:()=>loadGameSettings()};
}
