import {requireAssetUrl} from './asset-manifest.js';
import {blockItemAtlasStyle,blockItemFaceTiles} from './block-item-preview.js';
import {ITEMS} from './items.js';
import {UI} from './ui.js';

const TERRAIN_ATLAS=requireAssetUrl('terrain.block_atlas');
const HUD_ICONS=requireAssetUrl('gui.hud_icons');
const HOTBAR_LEFT=requireAssetUrl('gui.hotbar_left_cap');
const HOTBAR_RIGHT=requireAssetUrl('gui.hotbar_right_cap');
const HOTBAR_SELECTOR=requireAssetUrl('gui.hotbar_selector');
const INVENTORY_SLOT=requireAssetUrl('gui.inventory_slot');
const HOTBAR_SLOTS=Object.freeze(Array.from({length:9},(_,index)=>requireAssetUrl(`gui.hotbar_slot_${index}`)));

let installed=false;
let originalMakeIcon=null;
let originalRenderStatus=null;

function escapeCssUrl(value){return String(value).replaceAll('"','\\"');}

function styleText(){
  const hotbarSlotRules=HOTBAR_SLOTS.map((url,index)=>`#hotbar>.hotbar-slot:nth-of-type(${index+1}){background-image:url("${escapeCssUrl(url)}")}`).join('\n');
  return `
.status-stack{left:50%!important;right:auto!important;bottom:8px!important;transform:translateX(-50%)!important;width:364px!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:0!important;pointer-events:none}
#armor-row,.status-row{width:364px!important;padding:0!important;margin:0!important;border:0!important;background:none!important;box-shadow:none!important}
#armor-row{height:18px!important;display:flex!important;justify-content:flex-start!important;align-items:center!important}
.status-row{height:18px!important;display:flex!important;justify-content:space-between!important;align-items:center!important}
#hearts,#hunger{display:flex!important;width:180px!important;height:18px!important;gap:0!important;align-items:center!important;padding:0!important;margin:0!important}
#hunger{justify-content:flex-end!important}
#hearts i,#hunger i,#armor-row i{display:block!important;flex:0 0 18px!important;width:18px!important;height:18px!important;margin:0!important;background-image:url("${escapeCssUrl(HUD_ICONS)}")!important;background-repeat:no-repeat!important;background-size:108px 72px!important;image-rendering:pixelated;color:transparent!important;text-shadow:none!important;font-size:0!important}
#hearts .heart.full{background-position:-72px 0!important}
#hearts .heart.half{background-position:-90px 0!important}
#hearts .heart.empty{background-position:0 0!important}
#hunger .food.full{background-position:-72px -54px!important}
#hunger .food.half{background-position:-90px -54px!important}
#hunger .food.empty{background-position:0 -54px!important}
#armor-row .armor-icon.full{background-position:-36px -18px!important}
#armor-row .armor-icon.half{background-position:-18px -18px!important}
#armor-row .armor-icon.empty{background-position:0 -18px!important}
.xp-wrap{width:364px!important;height:10px!important;margin:2px 0 1px!important}
#hotbar{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;display:flex!important;gap:0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;height:44px!important;overflow:visible!important;align-items:stretch!important;pointer-events:auto}
#hotbar::before,#hotbar::after{content:"";display:block;flex:0 0 2px;width:2px;height:44px;background-repeat:no-repeat;background-size:2px 44px;image-rendering:pixelated}
#hotbar::before{background-image:url("${escapeCssUrl(HOTBAR_LEFT)}")}
#hotbar::after{background-image:url("${escapeCssUrl(HOTBAR_RIGHT)}")}
#hotbar>.hotbar-slot{position:relative!important;flex:0 0 40px!important;width:40px!important;height:44px!important;min-width:40px!important;padding:4px 4px 6px!important;border:0!important;border-radius:0!important;background-repeat:no-repeat!important;background-size:40px 44px!important;background-color:transparent!important;box-shadow:none!important;overflow:visible!important;image-rendering:pixelated}
${hotbarSlotRules}
#hotbar>.hotbar-slot.selected{outline:0!important;transform:none!important}
#hotbar>.hotbar-slot.selected::after{content:"";position:absolute;z-index:5;left:-4px;top:-2px;width:48px;height:48px;background:url("${escapeCssUrl(HOTBAR_SELECTOR)}") 0 0/48px 48px no-repeat;image-rendering:pixelated;pointer-events:none}
.hotbar-key{position:absolute!important;top:3px!important;left:5px!important;font:10px/1 Arial,sans-serif!important;color:#fff!important;text-shadow:1px 1px #222!important;z-index:6}
.item-icon{image-rendering:pixelated}
.hotbar-slot>.item-icon,.hotbar-slot>.block-item-icon{width:32px!important;height:32px!important;margin:2px auto 0!important}
.inv-slot .item-count,.hotbar-slot .item-count{right:2px!important;bottom:1px!important;color:#fff!important;font:bold 15px/1 Arial,sans-serif!important;text-shadow:2px 2px #3f3f3f!important;z-index:7}
#inventory .inventory-panel,#workbench .inventory-panel{background:#c6c6c6!important;color:#3f3f3f!important;border:4px solid #000!important;border-top-color:#fff!important;border-left-color:#fff!important;border-right-color:#555!important;border-bottom-color:#555!important;box-shadow:0 0 0 2px #000!important;border-radius:0!important}
#inventory .inventory-panel h2,#inventory .inventory-panel h3,#workbench .inventory-panel h2,#workbench .inventory-panel h3{color:#3f3f3f!important;text-shadow:none!important;font-weight:400!important}
.inventory-grid,.craft-grid,.equipment-grid,#inventory-hotbar,#workbench-hotbar{gap:0!important}
.inv-slot,.craft-slot,.result-slot{width:36px!important;height:36px!important;min-width:36px!important;padding:2px!important;border:0!important;border-radius:0!important;background:url("${escapeCssUrl(INVENTORY_SLOT)}") 0 0/36px 36px no-repeat!important;box-shadow:none!important;image-rendering:pixelated}
.inv-slot:hover,.craft-slot:hover,.result-slot:hover{filter:brightness(1.12)}
.block-item-icon{position:relative;display:inline-block;width:32px;height:32px;overflow:visible;filter:drop-shadow(1px 2px 0 #0008);image-rendering:pixelated}
.block-item-icon .block-face{position:absolute;display:block;background-image:url("${escapeCssUrl(TERRAIN_ATLAS)}");background-repeat:no-repeat;image-rendering:pixelated;transform-origin:0 0;backface-visibility:hidden}
.block-item-icon .block-face.top{left:7px;top:1px;width:24px;height:24px;clip-path:polygon(50% 0,100% 28%,50% 56%,0 28%)}
.block-item-icon .block-face.left{left:1px;top:8px;width:24px;height:24px;clip-path:polygon(25% 0,75% 28%,75% 100%,25% 72%);filter:brightness(.78)}
.block-item-icon .block-face.right{left:13px;top:8px;width:24px;height:24px;clip-path:polygon(0 28%,50% 0,50% 72%,0 100%);filter:brightness(.62)}
@media(max-width:700px),(pointer:coarse){.status-stack{bottom:64px!important;transform:translateX(-50%) scale(.82)!important;transform-origin:bottom center!important}}
`;
}

function createBlockItemIcon(itemId){
  const definition=ITEMS[itemId];
  const tiles=blockItemFaceTiles(definition);
  if(!tiles||typeof document==='undefined')return null;
  const root=document.createElement('span');
  root.className='block-item-icon';
  root.dataset.itemId=String(itemId);
  root.setAttribute('aria-label',definition?.name||String(itemId));
  root.title=definition?.name||String(itemId);
  for(const faceName of ['left','right','top']){
    const face=document.createElement('span');
    face.className=`block-face ${faceName}`;
    const style=blockItemAtlasStyle(tiles[faceName],{facePixels:24});
    face.style.backgroundSize=style.backgroundSize;
    face.style.backgroundPosition=style.backgroundPosition;
    root.append(face);
  }
  return root;
}

function renderVanillaStatus(hp,hunger,xp,level,armorPoints=0){
  const safeHp=Math.max(0,Math.min(20,Number(hp)||0)),safeHunger=Math.max(0,Math.min(20,Number(hunger)||0));
  this.hearts.textContent='';
  this.hunger.textContent='';
  for(let index=0;index<10;index++){
    const heartRemaining=safeHp-index*2,foodRemaining=safeHunger-index*2;
    const heart=document.createElement('i'),food=document.createElement('i');
    heart.className=`heart ${heartRemaining>=2?'full':heartRemaining>=1?'half':'empty'}`;
    food.className=`food ${foodRemaining>=2?'full':foodRemaining>=1?'half':'empty'}`;
    this.hearts.append(heart);this.hunger.append(food);
  }
  this.renderArmor(armorPoints);
  this.xp.style.width=`${Math.max(0,Math.min(100,Number(xp)||0))}%`;
  this.level.textContent=Number.isFinite(Number(level))?String(level):'0';
}

export function installVanillaUiPresentation(){
  if(installed)return false;
  installed=true;
  originalMakeIcon=UI.prototype.makeIcon;
  originalRenderStatus=UI.prototype.renderStatus;
  UI.prototype.makeIcon=function(itemId){return createBlockItemIcon(itemId)||originalMakeIcon.call(this,itemId);};
  UI.prototype.renderStatus=renderVanillaStatus;
  if(typeof document==='undefined'||!document.head)return true;
  const style=document.createElement('style');
  style.dataset.minecraftVanillaUi='1';
  style.textContent=styleText();
  document.head.append(style);
  return true;
}

export function vanillaUiAssetContract(){
  return Object.freeze({hud:HUD_ICONS,hotbarSlots:HOTBAR_SLOTS,selector:HOTBAR_SELECTOR,inventorySlot:INVENTORY_SLOT});
}
