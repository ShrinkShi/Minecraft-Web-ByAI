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
let originalRenderArmorStatus=null;

function escapeCssUrl(value){return String(value).replaceAll('"','\\"');}

function styleText(){
  const hotbarSlotRules=HOTBAR_SLOTS.map((url,index)=>`#hotbar>.hotbar-slot:nth-of-type(${index+1}){background-image:url("${escapeCssUrl(url)}")}`).join('\n');
  return `
:root{--mc-gui-scale:2;--mc-slot:36px;--mc-hotbar-slot-w:40px;--mc-hotbar-h:44px}
#status-stack{left:50%;bottom:56px;transform:translateX(-50%);width:364px;display:grid;grid-template-columns:182px 182px;grid-template-rows:18px 18px auto;gap:0;align-items:center;pointer-events:none}
#health-row,#hunger-row,#armor-stat{position:static;min-width:0;height:18px;padding:0;border:0;background:none;box-shadow:none;gap:0;display:flex;align-items:center;font-size:0}
#armor-stat{grid-column:1;grid-row:1;justify-content:flex-start}
#health-row{grid-column:1;grid-row:2;justify-content:flex-start}
#hunger-row{grid-column:2;grid-row:2;justify-content:flex-end}
#oxygen-row{grid-column:1/3;grid-row:3;justify-self:center;margin-top:2px}
#health-row i,#hunger-row i,#armor-stat i{display:block;flex:0 0 18px;width:18px;height:18px;margin:0;background-image:url("${escapeCssUrl(HUD_ICONS)}");background-repeat:no-repeat;background-size:108px 72px;image-rendering:pixelated;color:transparent;text-shadow:none;font-size:0}
#health-row .heart{background-position:-72px 0}
#health-row .heart.half{background-position:-90px 0}
#health-row .heart.empty{background-position:0 0}
#hunger-row .food{background-position:-72px -54px}
#hunger-row .food.half{background-position:-90px -54px}
#hunger-row .food.empty{background-position:0 -54px}
#armor-stat .armor-icon{background-position:-36px -18px}
#armor-stat .armor-icon.half{background-position:-18px -18px}
#armor-stat .armor-icon.empty{background-position:0 -18px}
#hotbar{left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:0;padding:0;border:0;background:none;box-shadow:none;height:44px;overflow:visible;align-items:stretch}
#hotbar::before,#hotbar::after{content:"";display:block;flex:0 0 2px;width:2px;height:44px;background-repeat:no-repeat;background-size:2px 44px;image-rendering:pixelated}
#hotbar::before{background-image:url("${escapeCssUrl(HOTBAR_LEFT)}")}
#hotbar::after{background-image:url("${escapeCssUrl(HOTBAR_RIGHT)}")}
#hotbar>.hotbar-slot{position:relative;flex:0 0 40px;width:40px;height:44px;min-width:40px;padding:4px 4px 6px;border:0!important;border-radius:0;background-repeat:no-repeat;background-size:40px 44px!important;background-color:transparent!important;box-shadow:none!important;overflow:visible;image-rendering:pixelated}
${hotbarSlotRules}
#hotbar>.hotbar-slot.selected{outline:0!important;transform:none!important}
#hotbar>.hotbar-slot.selected::after{content:"";position:absolute;z-index:5;left:-4px;top:-2px;width:48px;height:48px;background:url("${escapeCssUrl(HOTBAR_SELECTOR)}") 0 0/48px 48px no-repeat;image-rendering:pixelated;pointer-events:none}
.hotbar-key{position:absolute;top:3px;left:5px;font:10px/1 Arial,sans-serif;color:#fff;text-shadow:1px 1px #222;z-index:6}
.item-icon{image-rendering:pixelated}
.hotbar-slot>.item-icon,.hotbar-slot>.block-item-icon{width:32px;height:32px;margin:2px auto 0}
.inv-slot .item-count,.hotbar-slot .item-count{right:2px;bottom:1px;color:#fff;font:bold 15px/1 Arial,sans-serif;text-shadow:2px 2px #3f3f3f;z-index:7}
.inventory-box,.crafting-box{background:#c6c6c6!important;color:#3f3f3f!important;border:4px solid #000!important;border-top-color:#fff!important;border-left-color:#fff!important;border-right-color:#555!important;border-bottom-color:#555!important;box-shadow:0 0 0 2px #000!important;border-radius:0!important}
.inventory-box h2,.crafting-box h2,.inventory-box h3,.crafting-box h3{color:#3f3f3f;text-shadow:none;font-weight:400}
.inventory-grid,.craft-grid,.equipment-grid{gap:0!important}
.inventory-grid .inv-slot,.craft-grid .inv-slot,.equipment-grid .inv-slot,.result-slot{width:36px!important;height:36px!important;min-width:36px!important;padding:2px!important;border:0!important;border-radius:0!important;background:url("${escapeCssUrl(INVENTORY_SLOT)}") 0 0/36px 36px no-repeat!important;box-shadow:none!important;image-rendering:pixelated}
.inventory-grid .inv-slot:hover,.craft-grid .inv-slot:hover,.equipment-grid .inv-slot:hover,.result-slot:hover{filter:brightness(1.12)}
.block-item-icon{position:relative;display:inline-block;width:32px;height:32px;overflow:visible;filter:drop-shadow(1px 2px 0 #0008);image-rendering:pixelated}
.block-item-icon .block-face{position:absolute;display:block;background-image:url("${escapeCssUrl(TERRAIN_ATLAS)}");background-repeat:no-repeat;image-rendering:pixelated;transform-origin:0 0;backface-visibility:hidden}
.block-item-icon .block-face.top{left:7px;top:1px;width:24px;height:24px;clip-path:polygon(50% 0,100% 28%,50% 56%,0 28%)}
.block-item-icon .block-face.left{left:1px;top:8px;width:24px;height:24px;clip-path:polygon(25% 0,75% 28%,75% 100%,25% 72%);filter:brightness(.78)}
.block-item-icon .block-face.right{left:13px;top:8px;width:24px;height:24px;clip-path:polygon(0 28%,50% 0,50% 72%,0 100%);filter:brightness(.62)}
@media(max-width:700px),(pointer:coarse){:root{--mc-gui-scale:1.5}#status-stack{bottom:64px;transform:translateX(-50%) scale(.82);transform-origin:bottom center}#hotbar{bottom:8px;transform:translateX(-50%) scale(.82);transform-origin:bottom center}}
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

function renderArmorIcons(points){
  const armor=Math.max(0,Math.min(20,Number(points)||0));
  this.armorStat.classList.toggle('hidden',armor<=0);
  this.armorStat.textContent='';
  this.armorStat.setAttribute('aria-label',`护甲 ${armor}/20`);
  if(armor<=0)return;
  for(let index=0;index<10;index++){
    const remaining=armor-index*2;
    const icon=document.createElement('i');
    icon.className=`armor-icon${remaining>=2?'':remaining>=1?' half':' empty'}`;
    this.armorStat.append(icon);
  }
}

export function installVanillaUiPresentation(){
  if(installed)return false;
  installed=true;
  originalMakeIcon=UI.prototype.makeIcon;
  originalRenderArmorStatus=UI.prototype.renderArmorStatus;
  UI.prototype.makeIcon=function(itemId){
    return createBlockItemIcon(itemId)||originalMakeIcon.call(this,itemId);
  };
  UI.prototype.renderArmorStatus=renderArmorIcons;
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
