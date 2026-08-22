import {requireAssetUrl} from './asset-manifest.js';

const CRAFTING_TABLE_PANEL=requireAssetUrl('gui.crafting_table_panel');
let installed=false;

function escapeCssUrl(value){return String(value).replaceAll('"','\\"');}

export function installVanillaWorkbenchPresentation(){
  if(installed)return false;installed=true;
  if(typeof document==='undefined'||!document.head)return true;
  const style=document.createElement('style');style.dataset.minecraftVanillaWorkbench='1';
  style.textContent=`
#workbench .workbench-panel{position:relative!important;width:352px!important;height:332px!important;min-width:352px!important;max-width:352px!important;padding:0!important;margin:0!important;background:url("${escapeCssUrl(CRAFTING_TABLE_PANEL)}") 0 0/352px 332px no-repeat!important;color:#3f3f3f!important;border:0!important;border-radius:0!important;box-shadow:none!important;image-rendering:pixelated!important;overflow:visible!important}
#workbench .inventory-title{position:absolute!important;left:16px!important;top:10px!important;margin:0!important;padding:0!important;font:14px/1 monospace!important;font-weight:400!important;text-align:left!important;color:#3f3f3f!important;text-shadow:none!important;z-index:3!important}
#workbench .workbench-craft{display:block!important;position:static!important;width:0!important;height:0!important;margin:0!important;padding:0!important}
#workbench .workbench-craft>b{display:none!important}
#workbench #craft-grid-3{position:absolute!important;left:60px!important;top:34px!important;width:108px!important;height:108px!important;display:grid!important;grid-template-columns:repeat(3,36px)!important;grid-template-rows:repeat(3,36px)!important;gap:0!important;margin:0!important;padding:0!important}
#workbench #craft-result-3{position:absolute!important;left:248px!important;top:70px!important;width:36px!important;height:36px!important;display:grid!important;place-items:center!important;margin:0!important;padding:0!important}
#workbench #workbench-grid{position:absolute!important;left:16px!important;top:168px!important;width:324px!important;height:108px!important;display:grid!important;grid-template-columns:repeat(9,36px)!important;grid-template-rows:repeat(3,36px)!important;gap:0!important;margin:0!important;padding:0!important}
#workbench #workbench-hotbar{position:absolute!important;left:16px!important;top:284px!important;width:324px!important;height:36px!important;display:grid!important;grid-template-columns:repeat(9,36px)!important;grid-template-rows:36px!important;gap:0!important;margin:0!important;padding:0!important}
#workbench .inv-slot,#workbench .craft-slot,#workbench .result-slot,#workbench .craft-result .inv-slot{width:36px!important;height:36px!important;min-width:36px!important;aspect-ratio:auto!important;padding:2px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;image-rendering:pixelated!important}
#workbench .inv-slot:hover,#workbench .craft-slot:hover,#workbench .result-slot:hover,#workbench .craft-result .inv-slot:hover{background:rgba(255,255,255,.22)!important;filter:none!important}
body:has(#inventory:not(.hidden),#workbench:not(.hidden)) #hud .crosshair,body:has(#inventory:not(.hidden),#workbench:not(.hidden)) #hud .jade-hud,body:has(#inventory:not(.hidden),#workbench:not(.hidden)) #hud .status-stack,body:has(#inventory:not(.hidden),#workbench:not(.hidden)) #hud .oxygen,body:has(#inventory:not(.hidden),#workbench:not(.hidden)) #hud .break-meter,body:has(#inventory:not(.hidden),#workbench:not(.hidden)) #hud #first-person-viewmodel-canvas{display:none!important}
#workbench .mobile-panel-close{z-index:8!important}
@media(max-width:700px),(pointer:coarse){#workbench .workbench-panel{transform:scale(.78)!important;transform-origin:center center!important}}
`;
  document.head.append(style);return true;
}

export function vanillaWorkbenchAssetContract(){return Object.freeze({panel:CRAFTING_TABLE_PANEL,width:352,height:332,craftLeft:60,craftTop:34,resultLeft:248,resultTop:70,inventoryTop:168,hotbarTop:284});}
