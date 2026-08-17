import {WorldStorage,worldIdFor} from './storage.js';

const DEFAULT_TERRAIN_PROMPT='温带森林，起伏丘陵，河谷与少量沙地';
const MODE_LABELS=Object.freeze({survival:'生存模式',creative:'创造模式'});

export function worldModeLabel(mode){return MODE_LABELS[mode]||String(mode||'未知模式');}

export function formatWorldUpdatedAt(value){
  const time=Number(value);
  if(!Number.isFinite(time)||time<=0)return'从未保存';
  try{return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(time));}
  catch{return new Date(time).toLocaleString();}
}

export function suggestWorldName(worlds=[]){
  const names=new Set(worlds.map(world=>String(world?.name||'').trim()).filter(Boolean));
  if(!names.has('新的世界'))return'新的世界';
  let suffix=2;
  while(names.has(`新的世界 (${suffix})`))suffix++;
  return`新的世界 (${suffix})`;
}

function attachStylesheet(){
  if(document.querySelector('link[data-world-selection-style="1"]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href='./world-selection.css';link.dataset.worldSelectionStyle='1';
  document.head.append(link);
}

function worldListMarkup(){
  return `
    <div class="world-selection-shell">
      <div class="world-selection-view world-list-view" data-world-view="list">
        <h1 class="world-selection-title">选择世界</h1>
        <p id="world-list-summary" class="world-selection-subtitle">正在读取此浏览器中的本地世界…</p>
        <div class="world-list-frame">
          <div id="world-list" class="world-list" role="listbox" aria-label="本地世界"></div>
          <div id="world-empty" class="world-empty" hidden>尚未创建本地世界。<br>点击“创建新的世界”开始。</div>
          <div id="world-list-error" class="world-list-error" hidden></div>
        </div>
        <div class="world-selection-actions">
          <button id="world-enter-selected" class="world-button" type="button" data-world-action="enter" disabled>进入选中的世界</button>
          <button class="world-button" type="button" data-world-action="new">创建新的世界</button>
          <button id="world-edit-selected" class="world-button" type="button" data-world-action="edit" disabled>编辑</button>
          <button class="world-button" type="button" data-action="back-main">取消</button>
        </div>
      </div>

      <div class="world-selection-view world-editor-view" data-world-view="editor" hidden>
        <div class="world-editor-card">
          <h1 id="world-editor-title" class="world-selection-title">创建新的世界</h1>
          <p id="world-editor-subtitle" class="world-selection-subtitle">创建参数只决定新世界；已有世界从世界列表进入。</p>
          <div class="world-editor-fields">
            <label class="world-field">世界名称
              <input id="world-name" maxlength="40" autocomplete="off" />
            </label>
            <label class="world-field">种子
              <input id="world-seed" maxlength="80" autocomplete="off" spellcheck="false" />
              <span id="world-seed-hint" class="world-field-hint">留空会自动生成种子。</span>
            </label>
            <label class="world-field">游戏模式
              <select id="game-mode"><option value="survival">生存</option><option value="creative">创造</option></select>
            </label>
            <label class="world-field">AI 地形提示词
              <textarea id="terrain-prompt"></textarea>
              <span id="world-prompt-hint" class="world-field-hint">仅创建新世界时用于地形参数映射。</span>
            </label>
          </div>
          <p id="world-editor-error" class="world-editor-error" role="alert"></p>
          <div class="world-editor-actions">
            <button id="world-editor-submit" class="world-button" type="button" data-world-action="submit">创建世界</button>
            <button class="world-button" type="button" data-world-action="back-list">取消</button>
          </div>
          <button id="world-launch-button" class="world-launch-hidden" type="button" data-action="create-world" aria-hidden="true" tabindex="-1">启动世界</button>
        </div>
      </div>
    </div>`;
}

export class WorldSelectionController{
  constructor({root=document.querySelector('#world-menu'),storage=new WorldStorage()}={}){
    this.root=root;this.storage=storage;this.worlds=[];this.selectedId=null;this.editingId=null;this.refreshToken=0;
  }

  install(){
    if(!this.root||this.root.dataset.worldSelectionInstalled==='1')return false;
    attachStylesheet();this.root.dataset.worldSelectionInstalled='1';this.root.setAttribute('aria-label','世界选择');this.root.innerHTML=worldListMarkup();
    this.listView=this.root.querySelector('[data-world-view="list"]');this.editorView=this.root.querySelector('[data-world-view="editor"]');this.list=this.root.querySelector('#world-list');this.empty=this.root.querySelector('#world-empty');this.listError=this.root.querySelector('#world-list-error');this.summary=this.root.querySelector('#world-list-summary');this.enterButton=this.root.querySelector('#world-enter-selected');this.editButton=this.root.querySelector('#world-edit-selected');
    this.editorTitle=this.root.querySelector('#world-editor-title');this.editorSubtitle=this.root.querySelector('#world-editor-subtitle');this.nameInput=this.root.querySelector('#world-name');this.seedInput=this.root.querySelector('#world-seed');this.seedHint=this.root.querySelector('#world-seed-hint');this.modeInput=this.root.querySelector('#game-mode');this.promptInput=this.root.querySelector('#terrain-prompt');this.promptHint=this.root.querySelector('#world-prompt-hint');this.editorError=this.root.querySelector('#world-editor-error');this.submitButton=this.root.querySelector('#world-editor-submit');this.launchButton=this.root.querySelector('#world-launch-button');
    this.root.addEventListener('click',event=>{void this.handleRootClick(event);});
    this.root.addEventListener('dblclick',event=>{const entry=event.target.closest('.world-entry[data-world-id]');if(!entry)return;event.preventDefault();this.selectWorld(entry.dataset.worldId);void this.enterSelected();});
    this.root.addEventListener('keydown',event=>{const entry=event.target.closest?.('.world-entry[data-world-id]');if(entry&&event.key==='Enter'){event.preventDefault();this.selectWorld(entry.dataset.worldId);void this.enterSelected();}});
    document.addEventListener('click',event=>{const action=event.target.closest?.('[data-action]')?.dataset.action;if(action==='singleplayer')void this.openList();});
    this.showListView();return true;
  }

  showListView(){this.editingId=null;this.editorView.hidden=true;this.listView.hidden=false;this.setEditorError('');}
  showEditorView(){this.listView.hidden=true;this.editorView.hidden=false;this.setEditorError('');queueMicrotask(()=>this.nameInput?.focus());}
  setEditorError(message=''){if(this.editorError)this.editorError.textContent=String(message||'');}

  async openList(){this.showListView();await this.refreshList();}

  async refreshList(){
    const token=++this.refreshToken;this.summary.textContent='正在读取此浏览器中的本地世界…';this.listError.hidden=true;
    let worlds=[];
    try{worlds=await this.storage.listWorlds();}
    catch(error){if(token!==this.refreshToken)return;this.worlds=[];this.list.replaceChildren();this.empty.hidden=true;this.listError.hidden=false;this.listError.textContent=`无法读取本地世界：${error?.message||error}`;this.summary.textContent='IndexedDB 存档不可用';this.selectedId=null;this.syncSelectionButtons();return;}
    if(token!==this.refreshToken)return;
    this.worlds=worlds;if(this.selectedId&&!worlds.some(world=>world.id===this.selectedId))this.selectedId=null;
    this.renderWorlds();this.summary.textContent=worlds.length?`${worlds.length} 个本地世界 · 最近游玩优先`:'此浏览器还没有本地世界';
  }

  renderWorlds(){
    this.list.replaceChildren();
    for(const world of this.worlds){
      const entry=document.createElement('button');entry.type='button';entry.className='world-entry';entry.dataset.worldId=world.id;entry.setAttribute('role','option');entry.setAttribute('aria-selected',world.id===this.selectedId?'true':'false');if(world.id===this.selectedId)entry.classList.add('selected');
      const icon=document.createElement('span');icon.className='world-icon';icon.setAttribute('aria-hidden','true');
      const main=document.createElement('span');main.className='world-entry-main';
      const name=document.createElement('span');name.className='world-entry-name';name.textContent=world.name||'未命名世界';
      const meta=document.createElement('span');meta.className='world-entry-meta';const mode=document.createElement('span');mode.className='world-mode';mode.textContent=worldModeLabel(world.mode);meta.append(mode,document.createTextNode(` · 最后游玩 ${formatWorldUpdatedAt(world.updatedAt)}`));
      const detail=document.createElement('span');detail.className='world-entry-detail';detail.textContent=`种子: ${world.seed??'未知'} · 存档版本 ${world.version??'旧版'}`;
      main.append(name,meta,detail);entry.append(icon,main);this.list.append(entry);
    }
    this.empty.hidden=this.worlds.length>0;this.syncSelectionButtons();
  }

  selectWorld(id){
    this.selectedId=this.worlds.some(world=>world.id===id)?id:null;
    for(const entry of this.list.querySelectorAll('.world-entry')){const selected=entry.dataset.worldId===this.selectedId;entry.classList.toggle('selected',selected);entry.setAttribute('aria-selected',selected?'true':'false');}
    this.syncSelectionButtons();
  }

  syncSelectionButtons(){const selected=!!this.selectedId;this.enterButton.disabled=!selected;this.editButton.disabled=!selected;}

  openCreate(){
    this.editingId=null;this.editorTitle.textContent='创建新的世界';this.editorSubtitle.textContent='设置新世界参数。已有存档请返回世界列表进入。';this.submitButton.textContent='创建世界';
    this.nameInput.value=suggestWorldName(this.worlds);this.seedInput.value='';this.seedInput.readOnly=false;this.seedHint.textContent='留空会自动生成种子。';this.modeInput.value='survival';this.promptInput.value=DEFAULT_TERRAIN_PROMPT;this.promptInput.readOnly=false;this.promptHint.textContent='创建时用于程序化地形参数映射。';this.showEditorView();
  }

  async openEdit(){
    if(!this.selectedId)return;let record=null;
    try{record=await this.storage.getWorld(this.selectedId);}catch(error){this.listError.hidden=false;this.listError.textContent=`无法读取选中世界：${error?.message||error}`;return;}
    if(!record){await this.refreshList();return;}
    this.editingId=record.id;this.editorTitle.textContent='编辑世界';this.editorSubtitle.textContent='可重命名世界或修改游戏模式；种子与地形提示词保持锁定，避免已生成地形出现断层。';this.submitButton.textContent='保存修改';
    this.nameInput.value=record.name||'未命名世界';this.seedInput.value=String(record.seed??'');this.seedInput.readOnly=true;this.seedHint.textContent='已有世界的种子不可修改。';this.modeInput.value=record.mode==='creative'?'creative':'survival';this.promptInput.value=record.prompt||'';this.promptInput.readOnly=true;this.promptHint.textContent='已有世界的地形提示词不可修改，以保持后续区块生成兼容。';this.showEditorView();
  }

  populateLaunchFields(record){
    this.nameInput.value=record.name||'新的世界';this.seedInput.value=String(record.seed??'');this.modeInput.value=record.mode==='creative'?'creative':'survival';this.promptInput.value=record.prompt||DEFAULT_TERRAIN_PROMPT;
  }

  async enterSelected(){
    if(!this.selectedId)return;let record=null;
    try{record=await this.storage.getWorld(this.selectedId);}catch(error){this.listError.hidden=false;this.listError.textContent=`无法读取选中世界：${error?.message||error}`;return;}
    if(!record){await this.refreshList();return;}
    this.populateLaunchFields(record);this.launchButton.click();
  }

  async submitEditor(){
    const name=this.nameInput.value.trim()||'新的世界',mode=this.modeInput.value==='creative'?'creative':'survival';this.nameInput.value=name;this.setEditorError('');
    if(this.editingId){
      let record=null;
      try{record=await this.storage.getWorld(this.editingId);}catch(error){this.setEditorError(`读取存档失败：${error?.message||error}`);return;}
      if(!record){this.setEditorError('该世界已不存在，请返回列表刷新。');return;}
      const seed=String(record.seed??''),nextId=worldIdFor(name,seed);
      try{
        if(nextId!==record.id&&await this.storage.getWorld(nextId)){this.setEditorError('已经存在同名且相同种子的世界。');return;}
        const updated={...record,id:nextId,name,mode,updatedAt:Date.now()};if(record.player&&typeof record.player==='object')updated.player={...record.player,mode};
        await this.storage.putWorld(updated);if(nextId!==record.id)await this.storage.deleteWorld(record.id);this.selectedId=nextId;await this.openList();
      }catch(error){this.setEditorError(`保存修改失败：${error?.message||error}`);}
      return;
    }
    const seed=this.seedInput.value.trim()||String(Date.now());this.seedInput.value=seed;const id=worldIdFor(name,seed);
    try{if(await this.storage.getWorld(id)){this.setEditorError('已经存在同名且相同种子的世界，请从世界列表进入。');return;}}
    catch(error){this.setEditorError(`无法检查现有存档：${error?.message||error}`);return;}
    this.launchButton.click();
  }

  async handleRootClick(event){
    const entry=event.target.closest('.world-entry[data-world-id]');if(entry){this.selectWorld(entry.dataset.worldId);return;}
    const action=event.target.closest('[data-world-action]')?.dataset.worldAction;if(!action)return;
    if(action==='enter')await this.enterSelected();
    else if(action==='new')this.openCreate();
    else if(action==='edit')await this.openEdit();
    else if(action==='back-list')await this.openList();
    else if(action==='submit')await this.submitEditor();
  }
}

let installedController=null;
export function installWorldSelection(){
  if(installedController)return installedController;
  const controller=new WorldSelectionController();if(!controller.install())return null;installedController=controller;return controller;
}
