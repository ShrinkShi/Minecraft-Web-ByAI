import {DIFFICULTIES,DIFFICULTY_LABELS,INTERFACE_SCALE_OPTIONS,readGameOptions,writeGameOptions} from './game-settings-rules.js';

const STYLE_ID='minecraft-game-options-style';
const SCREEN_ID='options-menu';
let currentOptions=readGameOptions();

function applyInterfaceScale(scale){
  document.documentElement.style.setProperty('--mc-ui-scale',String(scale));
  document.documentElement.dataset.mcUiScale=String(scale);
}
function publish(options){
  currentOptions=writeGameOptions(options);applyInterfaceScale(currentOptions.interfaceScale);
  globalThis.__minecraftGameOptions=Object.freeze({...currentOptions});
  globalThis.dispatchEvent?.(new CustomEvent('minecraft-game-options-change',{detail:globalThis.__minecraftGameOptions}));
  return globalThis.__minecraftGameOptions;
}
function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
:root{--mc-ui-scale:1}
#hud .status-stack{transform:translateX(-50%) scale(var(--mc-ui-scale));transform-origin:50% 100%}
#hud .oxygen{transform:scale(var(--mc-ui-scale));transform-origin:100% 100%}
#inventory .inventory-panel,#workbench .inventory-panel,.furnace-panel{transform:scale(var(--mc-ui-scale));transform-origin:50% 50%}
.game-options-card{width:min(560px,92vw);background:#1d1d1df2;border:2px solid #555;box-shadow:0 0 30px #000;padding:26px;display:flex;flex-direction:column;gap:16px;color:#fff}
.game-options-card h2{margin:0 0 4px;text-align:center}.game-options-row{display:grid;grid-template-columns:1fr 220px;align-items:center;gap:16px}.game-options-row label{font-weight:bold}.game-options-row small{display:block;margin-top:3px;color:#aaa;font-weight:normal}.game-options-card select{width:100%;min-height:42px;background:#090909;color:#fff;border:2px solid #8b8b8b;padding:7px 10px}.game-options-actions{display:flex;justify-content:center;margin-top:4px}.game-options-actions .mc-button{width:min(360px,100%)}
@media(max-width:650px){.game-options-row{grid-template-columns:1fr}.game-options-card{max-height:90vh;overflow:auto}}
`;
  document.head.append(style);
}
function option(value,label){const node=document.createElement('option');node.value=String(value);node.textContent=label;return node;}
function ensureScreen(){
  let screen=document.getElementById(SCREEN_ID);if(screen)return screen;
  screen=document.createElement('section');screen.id=SCREEN_ID;screen.className='screen pause-layer';screen.setAttribute('aria-label','游戏选项');
  const card=document.createElement('div');card.className='game-options-card';
  const title=document.createElement('h2');title.textContent='选项';card.append(title);
  const scaleRow=document.createElement('div');scaleRow.className='game-options-row';const scaleLabel=document.createElement('label');scaleLabel.innerHTML='界面大小<small>调整快捷栏、生命/饱食度 HUD、容器和物品栏 GUI。</small>';const scaleSelect=document.createElement('select');scaleSelect.id='interface-scale-setting';for(const scale of INTERFACE_SCALE_OPTIONS)scaleSelect.append(option(scale,`${Math.round(scale*100)}%`));scaleRow.append(scaleLabel,scaleSelect);card.append(scaleRow);
  const difficultyRow=document.createElement('div');difficultyRow.className='game-options-row';const difficultyLabel=document.createElement('label');difficultyLabel.innerHTML='难度<small>和平会停止敌对生物；其余难度调整敌对生物伤害。</small>';const difficultySelect=document.createElement('select');difficultySelect.id='difficulty-setting';for(const difficulty of DIFFICULTIES)difficultySelect.append(option(difficulty,DIFFICULTY_LABELS[difficulty]));difficultyRow.append(difficultyLabel,difficultySelect);card.append(difficultyRow);
  const actions=document.createElement('div');actions.className='game-options-actions';const done=document.createElement('button');done.type='button';done.className='mc-button primary';done.textContent='完成';done.dataset.gameOptionsDone='1';actions.append(done);card.append(actions);screen.append(card);document.querySelector('#app')?.append(screen);
  scaleSelect.addEventListener('change',()=>publish({...currentOptions,interfaceScale:Number(scaleSelect.value)}));difficultySelect.addEventListener('change',()=>publish({...currentOptions,difficulty:difficultySelect.value}));
  return screen;
}
function activeReturnScreen(){return document.querySelector('#pause-menu.active')?'pause':document.querySelector('#main-menu.active')?'main':'pause';}
function showScreen(screen){for(const node of document.querySelectorAll('.screen'))node.classList.remove('active');screen?.classList.add('active');}

export function installGameOptions(){
  ensureStyle();const screen=ensureScreen();let returnTo='main';
  const syncControls=()=>{screen.querySelector('#interface-scale-setting').value=String(currentOptions.interfaceScale);screen.querySelector('#difficulty-setting').value=currentOptions.difficulty;};
  publish(currentOptions);syncControls();
  document.addEventListener('click',event=>{
    const optionsButton=event.target.closest?.('[data-action="options"]');if(optionsButton){event.preventDefault();event.stopImmediatePropagation();returnTo=activeReturnScreen();syncControls();showScreen(screen);document.exitPointerLock?.();return;}
    const done=event.target.closest?.('[data-game-options-done]');if(done){event.preventDefault();event.stopPropagation();showScreen(document.querySelector(returnTo==='pause'?'#pause-menu':'#main-menu'));}
  },true);
  return Object.freeze({get current(){return globalThis.__minecraftGameOptions;},open(){returnTo=activeReturnScreen();syncControls();showScreen(screen);},close(){showScreen(document.querySelector(returnTo==='pause'?'#pause-menu':'#main-menu'));},set(value){const next=publish({...currentOptions,...value});syncControls();return next;}});
}
