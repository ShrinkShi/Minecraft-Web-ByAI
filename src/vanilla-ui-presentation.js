import {requireAssetUrl} from './asset-manifest.js';
import {blockItemAtlasStyle,blockItemFaceTextures,blockItemFaceTiles} from './block-item-preview.js';
import {ITEMS} from './items.js';
import {UI} from './ui.js';

const TERRAIN_ATLAS=requireAssetUrl('terrain.block_atlas');
const CROSSHAIR=requireAssetUrl('gui.crosshair');
const HUD_ICONS=requireAssetUrl('gui.hud_icons');
const XP_BACKGROUND=requireAssetUrl('gui.xp_background');
const XP_PROGRESS=requireAssetUrl('gui.xp_progress');
const HOTBAR_LEFT=requireAssetUrl('gui.hotbar_left_cap');
const HOTBAR_RIGHT=requireAssetUrl('gui.hotbar_right_cap');
const HOTBAR_SELECTOR=requireAssetUrl('gui.hotbar_selector');
const INVENTORY_PANEL=requireAssetUrl('gui.inventory_panel');
const INVENTORY_SLOT=requireAssetUrl('gui.inventory_slot');
const HOTBAR_SLOTS=Object.freeze(Array.from({length:9},(_,index)=>requireAssetUrl(`gui.hotbar_slot_${index}`)));

let installed=false;
let originalMakeIcon=null;

function escapeCssUrl(value){return String(value).replaceAll('"','\\"');}

function styleText(){
  const hotbarSlotRules=HOTBAR_SLOTS.map((url,index)=>`#hotbar>.hotbar-slot:nth-of-type(${index+1}){background-image:url("${escapeCssUrl(url)}")!important}`).join('\n');
  return `
#crosshair{width:30px!important;height:30px!important;margin:0!important;transform:translate(-50%,-50%)!important;border:0!important;background:url("${escapeCssUrl(CROSSHAIR)}") 0 0/30px 30px no-repeat!important;box-shadow:none!important;image-rendering:pixelated!important}
#crosshair::before,#crosshair::after{display:none!important;content:none!important}
.status-stack{left:50%!important;right:auto!important;bottom:8px!important;transform:translateX(-50%)!important;width:364px!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:0!important;pointer-events:none}
#armor-row,.status-row{width:364px!important;padding:0!important;margin:0!important;border:0!important;background:none!important;box-shadow:none!important}
#armor-row{height:18px!important;display:flex!important;justify-content:flex-start!important;align-items:center!important}
#armor-row.hidden{display:none!important}
.status-row{height:18px!important;display:flex!important;justify-content:space-between!important;align-items:center!important}
#hearts,#hunger{display:flex!important;width:162px!important;height:18px!important;gap:0!important;align-items:center!important;padding:0!important;margin:0!important}
#hearts{justify-content:flex-start!important}
#hunger{justify-content:flex-start!important;flex-direction:row-reverse!important}
#hearts i,#hunger i,#armor-row i{display:block!important;position:relative!important;transform:none!important;opacity:1!important;flex:0 0 18px!important;width:18px!important;height:18px!important;margin:0!important;background-color:transparent!important;background-image:url("${escapeCssUrl(HUD_ICONS)}")!important;background-repeat:no-repeat!important;background-size:108px 72px!important;image-rendering:pixelated!important;color:transparent!important;text-shadow:none!important;font-size:0!important}
#hearts .heart::before,#hearts .heart::after,#hunger .food::before,#hunger .food::after,#armor-row .armor-icon::before,#armor-row .armor-icon::after{display:none!important;content:none!important}
#hearts i:not(:last-child){margin-right:-2px!important}
#hunger i:not(:last-child){margin-left:-2px!important}
#armor-row i:not(:last-child){margin-right:-2px!important}
#hearts .heart.full{background-position:-72px 0!important}
#hearts .heart.half{background-position:-90px 0!important}
#hearts .heart.empty{background-position:0 0!important}
#hunger .food.full{background-position:-72px -54px!important}
#hunger .food.half{background-position:-90px -54px!important}
#hunger .food.empty{background-position:0 -54px!important}
#armor-row .armor-icon.full{background-position:-36px -18px!important}
#armor-row .armor-icon.half{background-position:-18px -18px!important}
#armor-row .armor-icon.empty{background-position:0 -18px!important}
.xp-wrap{position:relative!important;width:364px!important;height:10px!important;margin:4px 0 2px!important;padding:0!important;border:0!important;border-radius:0!important;background:url("${escapeCssUrl(XP_BACKGROUND)}") 0 0/364px 10px no-repeat!important;box-shadow:none!important;overflow:visible!important;image-rendering:pixelated!important}
#xp-bar{position:absolute!important;left:0!important;top:0!important;height:10px!important;max-width:364px!important;border:0!important;border-radius:0!important;background:url("${escapeCssUrl(XP_PROGRESS)}") 0 0/364px 10px no-repeat!important;box-shadow:none!important;image-rendering:pixelated!important}
#xp-level{position:absolute!important;left:50%!important;bottom:7px!important;transform:translateX(-50%)!important;color:#80ff20!important;font:bold 20px/1 monospace!important;text-shadow:-2px 0 #183b00,0 2px #183b00,2px 0 #183b00,0 -2px #183b00!important;z-index:8!important;white-space:nowrap!important}
#hotbar{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;display:flex!important;gap:0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;height:44px!important;overflow:visible!important;align-items:stretch!important;pointer-events:auto}
#hotbar::before,#hotbar::after{content:"";display:block;flex:0 0 2px;width:2px;height:44px;background-repeat:no-repeat;background-size:2px 44px;image-rendering:pixelated}
#hotbar::before{background-image:url("${escapeCssUrl(HOTBAR_LEFT)}")}
#hotbar::after{background-image:url("${escapeCssUrl(HOTBAR_RIGHT)}")}
#hotbar>.hotbar-slot{position:relative!important;flex:0 0 40px!important;width:40px!important;height:44px!important;min-width:40px!important;padding:4px 4px 6px!important;border:0!important;border-radius:0!important;background-repeat:no-repeat!important;background-size:40px 44px!important;background-color:transparent!important;box-shadow:none!important;overflow:visible!important;image-rendering:pixelated!important}
${hotbarSlotRules}
#hotbar>.hotbar-slot.selected{outline:0!important;transform:none!important}
#hotbar>.hotbar-slot.selected::after{content:"";position:absolute;z-index:5;left:-4px;top:-2px;width:48px;height:48px;background:url("${escapeCssUrl(HOTBAR_SELECTOR)}") 0 0/48px 48px no-repeat;image-rendering:pixelated;pointer-events:none}
#hotbar .slot-key{display:none!important}
.item-icon{image-rendering:pixelated!important}
.hotbar-slot>.item-icon,.hotbar-slot>.block-item-icon{width:32px!important;height:32px!important;margin:2px auto 0!important}
.inv-slot .slot-count,.hotbar-slot .slot-count{right:2px!important;bottom:1px!important;color:#fff!important;font:bold 15px/1 monospace!important;text-shadow:2px 2px #3f3f3f!important;z-index:7!important}
#inventory .inventory-panel{position:relative!important;width:352px!important;height:332px!important;min-width:352px!important;max-width:352px!important;padding:0!important;margin:0!important;background:url("${escapeCssUrl(INVENTORY_PANEL)}") 0 0/352px 332px no-repeat!important;color:#3f3f3f!important;border:0!important;border-radius:0!important;box-shadow:none!important;image-rendering:pixelated!important;overflow:visible!important}
#inventory .inventory-title{display:none!important}
#inventory .inventory-top{display:block!important;position:static!important;width:0!important;height:0!important;margin:0!important;padding:0!important}
#inventory #equipment-slots{position:absolute!important;left:16px!important;top:16px!important;width:36px!important;height:144px!important;display:grid!important;grid-template-columns:36px!important;grid-template-rows:repeat(4,36px)!important;gap:0!important;margin:0!important;padding:0!important;align-content:start!important}
#inventory .equipment-slot:empty::before,#inventory .equipment-slot:empty::after{display:none!important;content:none!important}
#inventory .player-preview{position:absolute!important;left:52px!important;top:16px!important;width:100px!important;height:144px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:transparent!important;font-size:0!important;box-shadow:none!important;pointer-events:none!important}
#inventory .crafting-area{position:static!important;width:0!important;height:0!important;margin:0!important;padding:0!important;border:0!important;background:none!important}
#inventory .crafting-area>span,#inventory .crafting-line>b{display:none!important}
#inventory .crafting-line{display:block!important;position:static!important;width:0!important;height:0!important;margin:0!important;padding:0!important}
#inventory #craft-grid-2{position:absolute!important;left:196px!important;top:36px!important;width:72px!important;height:72px!important;display:grid!important;grid-template-columns:repeat(2,36px)!important;grid-template-rows:repeat(2,36px)!important;gap:0!important;margin:0!important;padding:0!important}
#inventory #craft-result-2{position:absolute!important;left:308px!important;top:56px!important;width:36px!important;height:36px!important;margin:0!important;padding:0!important;display:grid!important;place-items:center!important}
#inventory #inventory-grid{position:absolute!important;left:16px!important;top:168px!important;width:324px!important;height:108px!important;display:grid!important;grid-template-columns:repeat(9,36px)!important;grid-template-rows:repeat(3,36px)!important;gap:0!important;margin:0!important;padding:0!important}
#inventory #inventory-hotbar{position:absolute!important;left:16px!important;top:284px!important;width:324px!important;height:36px!important;display:grid!important;grid-template-columns:repeat(9,36px)!important;grid-template-rows:36px!important;gap:0!important;margin:0!important;padding:0!important}
#inventory .inv-slot{width:36px!important;height:36px!important;min-width:36px!important;aspect-ratio:auto!important;padding:2px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;image-rendering:pixelated!important}
#inventory .inv-slot:hover{background:rgba(255,255,255,.22)!important;filter:none!important}
#workbench .inventory-panel{background:#c6c6c6!important;color:#3f3f3f!important;border:4px solid #000!important;border-top-color:#fff!important;border-left-color:#fff!important;border-right-color:#555!important;border-bottom-color:#555!important;box-shadow:0 0 0 2px #000!important;border-radius:0!important}
#workbench .inventory-panel h2,#workbench .inventory-panel h3{color:#3f3f3f!important;text-shadow:none!important;font-weight:400!important}
#workbench .inventory-grid,#workbench .craft-grid,#workbench #workbench-hotbar{gap:0!important}
#workbench .inv-slot,#workbench .craft-slot,#workbench .result-slot{width:36px!important;height:36px!important;min-width:36px!important;padding:2px!important;border:0!important;border-radius:0!important;background:url("${escapeCssUrl(INVENTORY_SLOT)}") 0 0/36px 36px no-repeat!important;box-shadow:none!important;image-rendering:pixelated!important}
#workbench .inv-slot:hover,#workbench .craft-slot:hover,#workbench .result-slot:hover{filter:brightness(1.12)}
#inventory .item-icon,#inventory .block-item-icon,#workbench .item-icon,#workbench .block-item-icon{width:32px!important;height:32px!important;margin:0 auto!important}
.block-item-icon{position:relative;display:inline-block;width:32px;height:32px;overflow:visible;filter:drop-shadow(1px 2px 0 #0008);image-rendering:pixelated}
.block-item-icon .block-face{position:absolute;display:block;background-image:url("${escapeCssUrl(TERRAIN_ATLAS)}");background-repeat:no-repeat;image-rendering:pixelated;transform-origin:0 0;backface-visibility:hidden}
.block-item-icon .block-face.top{left:7px;top:1px;width:24px;height:24px;clip-path:polygon(50% 0,100% 28%,50% 56%,0 28%)}
.block-item-icon .block-face.left{left:1px;top:8px;width:24px;height:24px;clip-path:polygon(25% 0,75% 28%,75% 100%,25% 72%);filter:brightness(.78)}
.block-item-icon .block-face.right{left:13px;top:8px;width:24px;height:24px;clip-path:polygon(0 28%,50% 0,50% 72%,0 100%);filter:brightness(.62)}
#oxygen .oxygen-bubble{background-image:url("${escapeCssUrl(HUD_ICONS)}")!important;background-size:108px 72px!important;background-position:0 -36px!important;image-rendering:pixelated!important}
#oxygen .oxygen-bubble.empty{visibility:hidden!important}
@media(max-width:700px),(pointer:coarse){.status-stack{bottom:64px!important;transform:translateX(-50%) scale(.82)!important;transform-origin:bottom center!important}#inventory .inventory-panel{transform:scale(.78)!important;transform-origin:center center!important}}
`;
}

function createBlockItemIcon(itemId){
  const definition=ITEMS[itemId];
  const tiles=blockItemFaceTiles(definition),textures=blockItemFaceTextures(definition);
  if((!tiles&&!textures)||typeof document==='undefined')return null;
  const root=document.createElement('span');
  root.className='block-item-icon';
  root.dataset.itemId=String(itemId);
  root.setAttribute('aria-label',definition?.name||String(itemId));
  root.title=definition?.name||String(itemId);
  for(const faceName of ['left','right','top']){
    const face=document.createElement('span');
    face.className=`block-face ${faceName}`;
    if(textures){
      face.style.backgroundImage=`url("${escapeCssUrl(textures[faceName])}")`;
      face.style.backgroundSize='24px 24px';
      face.style.backgroundPosition='0 0';
    }else{
      const style=blockItemAtlasStyle(tiles[faceName],{facePixels:24});
      face.style.backgroundSize=style.backgroundSize;
      face.style.backgroundPosition=style.backgroundPosition;
    }
    root.append(face);
  }
  return root;
}

function renderVanillaArmor(armorPoints=0){
  if(!this.armorRow)return;
  const points=Math.max(0,Math.min(20,Math.floor(Number(armorPoints)||0)));
  this.armorRow.textContent='';
  this.armorRow.classList.toggle('hidden',points<=0);
  if(points<=0)return;
  for(let index=0;index<10;index++){
    const icon=document.createElement('i'),remaining=points-index*2;
    icon.className=`armor-icon ${remaining>=2?'full':remaining>=1?'half':'empty'}`;
    this.armorRow.append(icon);
  }
}

function renderVanillaStatus(hp,hunger,xp,level,armorPoints=0){
  const safeHp=Math.max(0,Math.min(20,Number(hp)||0)),safeHunger=Math.max(0,Math.min(20,Number(hunger)||0));
  this.hearts.textContent='';
  this.hunger.textContent='';
  for(let index=0;index<10;index++){
    const heartRemaining=safeHp-index*2,foodRemaining=safeHunger-index*2;
    const heart=document.createElement('i'),food=document.createElement('i');
    heart.className=`heart ${heartRemaining>=2?'full':heartRemaining>0?'half':'empty'}`;
    food.className=`food ${foodRemaining>=2?'full':foodRemaining>0?'half':'empty'}`;
    this.hearts.append(heart);this.hunger.append(food);
  }
  this.renderArmor(armorPoints);
  this.xp.style.width=`${Math.max(0,Math.min(100,Number(xp)||0))}%`;
  const safeLevel=Math.max(0,Math.floor(Number(level)||0));
  this.level.textContent=safeLevel>0?String(safeLevel):'';
}

export function installVanillaUiPresentation(){
  if(installed)return false;
  installed=true;
  originalMakeIcon=UI.prototype.makeIcon;
  UI.prototype.makeIcon=function(itemId){return createBlockItemIcon(itemId)||originalMakeIcon.call(this,itemId);};
  UI.prototype.renderArmor=renderVanillaArmor;
  UI.prototype.renderStatus=renderVanillaStatus;
  if(typeof document==='undefined'||!document.head)return true;
  const style=document.createElement('style');
  style.dataset.minecraftVanillaUi='1';
  style.textContent=styleText();
  document.head.append(style);
  return true;
}

export function vanillaUiAssetContract(){
  return Object.freeze({
    crosshair:CROSSHAIR,
    hud:HUD_ICONS,
    xpBackground:XP_BACKGROUND,
    xpProgress:XP_PROGRESS,
    hotbarSlots:HOTBAR_SLOTS,
    selector:HOTBAR_SELECTOR,
    inventoryPanel:INVENTORY_PANEL,
    inventorySlot:INVENTORY_SLOT
  });
}