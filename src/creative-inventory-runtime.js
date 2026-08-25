import {CREATIVE_CATALOG_CATEGORIES,CREATIVE_CATALOG_ITEMS,listCreativeCatalog} from './creative-catalog.js';
import {hasMultiplayerInventoryTransactionSender,sendMultiplayerInventoryTransaction} from './multiplayer-inventory-transaction-channel.js';

const STATE_BY_UI=new WeakMap();
const ALL_CATEGORY=Object.freeze({id:'all',label:'全部'});

function ensureStylesheet(documentRef){
  if(!documentRef?.head||documentRef.querySelector('link[data-creative-inventory-style]'))return;
  const link=documentRef.createElement('link');link.rel='stylesheet';link.href=new URL('../creative-inventory.css',import.meta.url).href;link.dataset.creativeInventoryStyle='1';documentRef.head.append(link);
}

function createElement(documentRef,tag,className,text=''){
  const node=documentRef.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;
}

function renderTabs(state){
  state.tabs.textContent='';for(const category of [ALL_CATEGORY,...CREATIVE_CATALOG_CATEGORIES]){const button=createElement(state.document,'button','creative-catalog-tab',category.label);button.type='button';button.dataset.creativeCategory=category.id;button.classList.toggle('active',state.category===category.id);button.setAttribute('aria-pressed',state.category===category.id?'true':'false');state.tabs.append(button);}
}

function renderItems(state){
  const entries=listCreativeCatalog({category:state.category,query:state.query});state.grid.textContent='';state.summary.textContent=`${entries.length} / ${CREATIVE_CATALOG_ITEMS.length}`;
  if(!entries.length){state.grid.append(createElement(state.document,'div','creative-catalog-empty','没有匹配的物品'));return;}
  for(const entry of entries){const button=createElement(state.document,'button','inv-slot creative-catalog-slot');button.type='button';button.dataset.creativeItem=entry.id;button.title=entry.name;button.setAttribute('aria-label',`${entry.name}，${entry.id}`);button.append(state.ui.makeIcon(entry.id));state.grid.append(button);}
}

function renderCatalog(state){renderTabs(state);renderItems(state);}

function pickCatalogItem(state,itemId){
  if(state.mode!=='creative')return false;const entry=CREATIVE_CATALOG_ITEMS.find(candidate=>candidate.id===itemId);if(!entry)return false;
  if(hasMultiplayerInventoryTransactionSender()){
    try{const request=sendMultiplayerInventoryTransaction({type:'creative-pick',itemId});if(!request)throw new Error('多人创造物品事务发送器不可用');return true;}catch(error){state.ui.showToast?.(`创造物品请求失败：${error?.message||error}`);return false;}
  }
  if(!state.ui.inventoryModel)return false;state.ui.inventoryModel.cursor={id:entry.id,count:entry.stack};if(typeof state.ui.changed==='function')state.ui.changed();else{state.ui.refreshInventory?.();state.ui.renderCursor?.();}return true;
}

function install(ui){
  if(!ui?.inventory)return null;const documentRef=ui.inventory.ownerDocument||globalThis.document,panel=ui.inventory.querySelector?.('.inventory-panel');if(!documentRef||!panel)return null;ensureStylesheet(documentRef);
  const title=panel.querySelector('.inventory-title'),survivalTop=panel.querySelector('.inventory-top');if(!title||!survivalTop||!ui.invGrid||!ui.invHotbar||typeof ui.makeIcon!=='function')return null;
  const root=createElement(documentRef,'div','creative-catalog hidden');root.dataset.creativeCatalog='1';const toolbar=createElement(documentRef,'div','creative-catalog-toolbar'),tabs=createElement(documentRef,'div','creative-catalog-tabs'),search=createElement(documentRef,'input','creative-catalog-search'),summary=createElement(documentRef,'span','creative-catalog-summary'),grid=createElement(documentRef,'div','creative-catalog-grid');search.type='search';search.placeholder='搜索物品名称或 ID';search.autocomplete='off';search.spellcheck=false;search.setAttribute('aria-label','搜索创造物品');toolbar.append(tabs,search,summary);root.append(toolbar,grid);title.after(root);
  const state={ui,document:documentRef,root,title,survivalTop,tabs,search,summary,grid,mode:null,category:'all',query:'',applied:false};STATE_BY_UI.set(ui,state);
  tabs.addEventListener('click',event=>{const button=event.target.closest?.('[data-creative-category]');if(!button||!tabs.contains(button))return;state.category=button.dataset.creativeCategory||'all';renderCatalog(state);});
  search.addEventListener('input',()=>{state.query=search.value;renderItems(state);});search.addEventListener('keydown',event=>event.stopPropagation());
  grid.addEventListener('click',event=>{const button=event.target.closest?.('[data-creative-item]');if(!button||!grid.contains(button))return;event.preventDefault();pickCatalogItem(state,button.dataset.creativeItem);});
  renderCatalog(state);return state;
}

export function applyCreativeInventoryModePresentation(ui,mode){
  const state=STATE_BY_UI.get(ui)||install(ui);if(!state)return false;const creative=mode==='creative';if(state.applied&&state.mode===mode)return creative;state.mode=mode;state.applied=true;state.root.classList.toggle('hidden',!creative);state.survivalTop.classList.toggle('hidden',creative);state.ui.invGrid.classList.toggle('hidden',creative);state.title.textContent=creative?'创造物品栏':'物品栏';state.ui.invHotbar.classList.toggle('creative-inventory-hotbar',creative);if(creative)renderCatalog(state);return creative;
}
