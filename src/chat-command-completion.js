import {suggestCommands} from './command-suggestions.js';
import {hasMultiplayerCommandSender,sendMultiplayerCommand,subscribeMultiplayerCommandResults} from './multiplayer-command-channel.js';

let installed=null;

function documentReady(){return typeof document!=='undefined'&&typeof document.querySelector==='function'&&typeof document.createElement==='function';}
function ensureStyles(){
  if(!documentReady()||document.querySelector('link[data-command-completion-style]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('../command-completion.css',import.meta.url).href;link.dataset.commandCompletionStyle='1';document.head?.append?.(link);
}
function applyableIndices(suggestions){const result=[];for(let i=0;i<suggestions.length;i++)if(typeof suggestions[i]?.replacement==='string')result.push(i);return result;}
function appendChatMessage(message,type='system'){
  if(!documentReady())return null;const log=document.querySelector('#chat-log');if(!log)return null;const line=document.createElement('div');line.className=`chat-line ${type}`;line.textContent=String(message);log.append(line);while(log.children.length>8)log.firstChild.remove();line._timer=setTimeout(()=>line.classList.add('faded'),9000);return line;
}
function restoreGameplayPointerLock(){
  if(!documentReady()||typeof document.querySelector!=='function')return;const fine=typeof matchMedia!=='function'||matchMedia('(pointer: fine)').matches;if(!fine)return;const canvas=document.querySelector('#game-canvas');if(canvas&&typeof canvas.requestPointerLock==='function')try{const result=canvas.requestPointerLock();result?.catch?.(()=>{});}catch{}
}

export class ChatCommandCompletion{
  constructor({input=document.querySelector('#chat-input'),wrap=document.querySelector('#chat-input-wrap')}={}){
    this.input=input;this.wrap=wrap;this.panel=null;this.suggestions=[];this.activeIndex=-1;this.bound=false;this.releaseCommandResults=null;
    if(input&&wrap)this.bind();
  }

  bind(){
    if(this.bound)return this;this.bound=true;ensureStyles();
    this.panel=document.createElement('div');this.panel.className='chat-command-suggestions hidden';this.panel.setAttribute('role','listbox');this.panel.setAttribute('aria-label','指令建议');this.wrap.prepend(this.panel);
    this.onInput=()=>this.refresh(true);this.onFocus=()=>this.refresh(true);this.onBlur=()=>this.hide();
    this.onKeyDown=e=>this.handleKeyDown(e);
    this.releaseCommandResults=subscribeMultiplayerCommandResults(result=>appendChatMessage(result.message,result.ok?'system':'error'));
    this.input.addEventListener('input',this.onInput);this.input.addEventListener('focus',this.onFocus);this.input.addEventListener('blur',this.onBlur);this.input.addEventListener('keydown',this.onKeyDown,{capture:true});
    this.panel.addEventListener('pointerdown',e=>{const row=e.target.closest('[data-command-suggestion-index]');if(!row)return;e.preventDefault();const index=Number(row.dataset.commandSuggestionIndex);this.apply(index);});
    return this;
  }

  chatOpen(){return !!this.wrap&&!this.wrap.classList.contains('hidden');}
  refresh(resetSelection=false){
    if(!this.input||!this.panel||!this.chatOpen()){this.hide();return[];}
    this.suggestions=suggestCommands(this.input.value).slice(0,10);
    const applyable=applyableIndices(this.suggestions);
    if(resetSelection||!applyable.includes(this.activeIndex))this.activeIndex=applyable[0]??-1;
    this.render();return this.suggestions;
  }
  hide(){if(this.panel)this.panel.classList.add('hidden');}
  render(){
    if(!this.panel)return;this.panel.textContent='';const visible=this.suggestions.length>0;this.panel.classList.toggle('hidden',!visible);if(!visible)return;
    this.suggestions.forEach((suggestion,index)=>{
      const row=document.createElement(suggestion.replacement?'button':'div');row.className='chat-command-suggestion';if(suggestion.replacement){row.type='button';row.dataset.commandSuggestionIndex=String(index);row.setAttribute('role','option');row.setAttribute('aria-selected',String(index===this.activeIndex));if(index===this.activeIndex)row.classList.add('active');}else row.classList.add('hint-only');
      const main=document.createElement('span');main.className='chat-command-suggestion-main';main.textContent=suggestion.label;
      const meta=document.createElement('span');meta.className='chat-command-suggestion-meta';meta.textContent=suggestion.description||suggestion.usage||'';
      row.append(main,meta);this.panel.append(row);
    });
  }
  cycle(direction){
    const applyable=applyableIndices(this.suggestions);if(!applyable.length)return false;const current=applyable.indexOf(this.activeIndex),next=current<0?0:(current+direction+applyable.length)%applyable.length;this.activeIndex=applyable[next];this.render();return true;
  }
  apply(index=this.activeIndex){
    const suggestion=this.suggestions[index];if(!suggestion||typeof suggestion.replacement!=='string'||!this.input)return false;
    this.input.value=suggestion.replacement;this.input.dispatchEvent(new Event('input',{bubbles:true}));this.input.focus();this.input.setSelectionRange(this.input.value.length,this.input.value.length);return true;
  }
  submitMultiplayerCommand(e){
    const value=this.input?.value?.trim()||'';if(!value.startsWith('/')||!hasMultiplayerCommandSender())return false;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();this.input.value='';this.wrap.classList.add('hidden');this.input.blur();this.hide();
    try{sendMultiplayerCommand(value);}catch(error){appendChatMessage(`指令发送失败：${error?.message||error}`,'error');}
    restoreGameplayPointerLock();return true;
  }
  handleKeyDown(e){
    if(!this.chatOpen())return;
    if(e.key==='Enter'&&this.submitMultiplayerCommand(e))return;
    if(e.key==='Tab'){
      e.preventDefault();e.stopPropagation();
      if(!this.suggestions.length)this.refresh(true);
      if(e.shiftKey&&this.suggestions.length){this.cycle(-1);return;}
      if(this.activeIndex<0){this.cycle(1);return;}
      this.apply();return;
    }
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      if(!this.suggestions.length)return;e.preventDefault();e.stopPropagation();this.cycle(e.key==='ArrowDown'?1:-1);
    }
  }
  dispose(){
    if(!this.bound)return false;this.bound=false;this.releaseCommandResults?.();this.releaseCommandResults=null;this.input?.removeEventListener('input',this.onInput);this.input?.removeEventListener('focus',this.onFocus);this.input?.removeEventListener('blur',this.onBlur);this.input?.removeEventListener('keydown',this.onKeyDown,{capture:true});this.panel?.remove();this.panel=null;this.suggestions=[];this.activeIndex=-1;if(installed===this)installed=null;return true;
  }
}

export function ensureChatCommandCompletion(){
  if(!documentReady())return null;if(installed)return installed;const input=document.querySelector('#chat-input'),wrap=document.querySelector('#chat-input-wrap');if(!input||!wrap)return null;installed=new ChatCommandCompletion({input,wrap});return installed;
}
