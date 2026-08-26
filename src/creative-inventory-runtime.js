import {CREATIVE_CATALOG_CATEGORIES,CREATIVE_CATALOG_ITEMS,listCreativeCatalog} from './creative-catalog.js';
import {requireAssetUrl} from './asset-manifest.js';
import {hasMultiplayerInventoryTransactionSender,sendMultiplayerInventoryTransaction} from './multiplayer-inventory-transaction-channel.js';

const STATE_BY_UI=new WeakMap();
const ALL_CATEGORY=Object.freeze({id:'all',label:'搜索物品'});
const SURVIVAL_VIEW=Object.freeze({id:'survival',label:'生存物品栏'});
const TAB_ICON_ITEMS=Object.freeze({
  all:'block:9',
  building:'block:5',
  tools:'iron_pickaxe',
  combat:'iron_sword',
  food:'apple',
  nature:'wheat_seeds',
  materials:'iron_ingot',
  misc:'bed',
  survival:'leather_chestplate'
});
const CREATIVE_GUI=Object.freeze({
  items:requireAssetUrl('gui.creative_tab_items'),
  search:requireAssetUrl('gui.creative_tab_search'),
  inventory:requireAssetUrl('gui.creative_tab_inventory')
});

function ensureStylesheet(documentRef){
  if(!documentRef?.head||documentRef.querySelector('link[data-creative-inventory-style]'))return;
  const link=documentRef.createElement('link');link.rel='stylesheet';link.href=new URL('../creative-inventory.css',import.meta.url).href;link.dataset.creativeInventoryStyle='1';documentRef.head.append(link);
}

function createElement(documentRef,tag,className,text=''){
  const node=documentRef.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;
}

function setDisplayHidden(node,hidden){
  if(!node)return;node.classList.toggle('hidden',hidden);if(hidden)node.style.setProperty('display','none','important');else node.style.removeProperty('display');
}

function cssUrl(url){return `url("${String(url).replaceAll('"','\\"')}")`;}
function categoryLabel(category){return category==='all'?ALL_CATEGORY.label:CREATIVE_CATALOG_CATEGORIES.find(candidate=>candidate.id===category)?.label||ALL_CATEGORY.label;}

function appendTabIcon(state,button,id){
  const itemId=TAB_ICON_ITEMS[id];if(!itemId)return;const icon=state.ui.makeIcon(itemId);if(!icon)return;icon.classList.add('creative-tab-icon');button.append(icon);
}

function createTab(state,{id,label,survival=false}){
  const button=createElement(state.document,'button','creative-catalog-tab');button.type='button';button.title=label;button.setAttribute('aria-label',label);
  if(survival)button.dataset.creativeView='survival';else button.dataset.creativeCategory=id;
  const active=survival?state.view==='survival':state.view==='catalog'&&state.category===id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false');appendTabIcon(state,button,id);
  const accessible=createElement(state.document,'span','creative-tab-label',label);button.append(accessible);return button;
}

function renderTabs(state){
  state.tabs.textContent='';state.tabs.append(createTab(state,ALL_CATEGORY));for(const category of CREATIVE_CATALOG_CATEGORIES)state.tabs.append(createTab(state,category));state.tabs.append(createTab(state,{...SURVIVAL_VIEW,survival:true}));
}

function renderItems(state){
  const entries=listCreativeCatalog({category:state.category,query:state.query});state.grid.textContent='';state.summary.textContent=`${entries.length} / ${CREATIVE_CATALOG_ITEMS.length}`;state.sectionTitle.textContent=categoryLabel(state.category);state.root.dataset.category=state.category;
  if(!entries.length){state.grid.append(createElement(state.document,'div','creative-catalog-empty','没有匹配的物品'));return;}
  for(const entry of entries){const button=createElement(state.document,'button','inv-slot creative-catalog-slot');button.type='button';button.dataset.creativeItem=entry.id;button.title=entry.name;button.setAttribute('aria-label',`${entry.name}，${entry.id}`);button.append(state.ui.makeIcon(entry.id));state.grid.append(button);}
}

function clearCatalog(state){state.tabs.textContent='';state.grid.textContent='';state.summary.textContent='';state.sectionTitle.textContent='';}

function applyView(state){
  const catalog=state.view==='catalog';state.root.dataset.view=state.view;state.ui.inventory.dataset.creativeView=state.view;setDisplayHidden(state.body,!catalog);setDisplayHidden(state.survivalTop,catalog);setDisplayHidden(state.ui.invGrid,catalog);setDisplayHidden(state.ui.invHotbar,false);
  state.panel.style.setProperty('--creative-panel-texture',cssUrl(catalog?(state.category==='all'?CREATIVE_GUI.search:CREATIVE_GUI.items):CREATIVE_GUI.inventory));
  state.title.textContent=catalog?categoryLabel(state.category):SURVIVAL_VIEW.label;renderTabs(state);if(catalog)renderItems(state);
}

function pickCatalogItem(state,itemId){
  if(state.mode!=='creative'||state.view!=='catalog')return false;const entry=CREATIVE_CATALOG_ITEMS.find(candidate=>candidate.id===itemId);if(!entry)return false;
  if(hasMultiplayerInventoryTransactionSender()){
    try{const request=sendMultiplayerInventoryTransaction({type:'creative-pick',itemId});if(!request)throw new Error('多人创造物品事务发送器不可用');return true;}catch(error){state.ui.showToast?.(`创造物品请求失败：${error?.message||error}`);return false;}
  }
  if(!state.ui.inventoryModel)return false;state.ui.inventoryModel.cursor={id:entry.id,count:entry.stack};if(typeof state.ui.changed==='function')state.ui.changed();else{state.ui.refreshInventory?.();state.ui.renderCursor?.();}return true;
}

function install(ui){
  if(!ui?.inventory)return null;const documentRef=ui.inventory.ownerDocument||globalThis.document,panel=ui.inventory.querySelector?.('.inventory-panel');if(!documentRef||!panel)return null;ensureStylesheet(documentRef);
  const title=panel.querySelector('.inventory-title'),survivalTop=panel.querySelector('.inventory-top');if(!title||!survivalTop||!ui.invGrid||!ui.invHotbar||typeof ui.makeIcon!=='function')return null;
  const root=createElement(documentRef,'div','creative-catalog hidden');setDisplayHidden(root,true);root.dataset.creativeCatalog='1';
  const tabs=createElement(documentRef,'div','creative-catalog-tabs'),body=createElement(documentRef,'div','creative-catalog-body'),sectionTitle=createElement(documentRef,'div','creative-catalog-section-title'),toolbar=createElement(documentRef,'div','creative-catalog-toolbar'),search=createElement(documentRef,'input','creative-catalog-search'),summary=createElement(documentRef,'span','creative-catalog-summary'),grid=createElement(documentRef,'div','creative-catalog-grid');
  search.type='search';search.placeholder='搜索物品名称或 ID';search.autocomplete='off';search.spellcheck=false;search.setAttribute('aria-label','搜索创造物品');toolbar.append(search,summary);body.append(sectionTitle,toolbar,grid);root.append(tabs,body);title.after(root);
  const state={ui,document:documentRef,panel,root,body,title,survivalTop,tabs,search,summary,sectionTitle,grid,mode:null,view:'catalog',category:'building',query:'',applied:false};STATE_BY_UI.set(ui,state);
  tabs.addEventListener('click',event=>{
    const survival=event.target.closest?.('[data-creative-view="survival"]');if(survival&&tabs.contains(survival)){state.view='survival';applyView(state);return;}
    const button=event.target.closest?.('[data-creative-category]');if(!button||!tabs.contains(button))return;state.view='catalog';state.category=button.dataset.creativeCategory||'all';if(state.category!=='all'){state.query='';state.search.value='';}applyView(state);
  });
  search.addEventListener('input',()=>{state.query=search.value;renderItems(state);});search.addEventListener('keydown',event=>event.stopPropagation());
  grid.addEventListener('click',event=>{const button=event.target.closest?.('[data-creative-item]');if(!button||!grid.contains(button))return;event.preventDefault();pickCatalogItem(state,button.dataset.creativeItem);});
  return state;
}

export function applyCreativeInventoryModePresentation(ui,mode){
  const state=STATE_BY_UI.get(ui)||install(ui);if(!state)return false;const creative=mode==='creative';if(state.applied&&state.mode===mode)return creative;state.mode=mode;state.applied=true;ui.inventory.classList.toggle('creative-mode',creative);state.panel.classList.toggle('creative-inventory-panel',creative);setDisplayHidden(state.root,!creative);state.ui.invHotbar.classList.toggle('creative-inventory-hotbar',creative);
  if(creative){state.view='catalog';state.category='building';state.query='';state.search.value='';applyView(state);}else{delete ui.inventory.dataset.creativeView;state.panel.style.removeProperty('--creative-panel-texture');setDisplayHidden(state.survivalTop,false);setDisplayHidden(state.ui.invGrid,false);setDisplayHidden(state.ui.invHotbar,false);state.title.textContent='物品栏';clearCatalog(state);}
  return creative;
}
