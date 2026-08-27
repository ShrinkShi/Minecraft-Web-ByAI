import {installVanillaUiPresentation} from './vanilla-ui-presentation.js';
import {installVanillaWorkbenchPresentation} from './vanilla-workbench-presentation.js';
import {installVanillaMiningAudioRuntime} from './vanilla-mining-audio-runtime.js';
import {installWorldSelection} from './world-selection.js';
import {installInventoryPlayerPreview} from './inventory-player-preview.js';
import {installImmersiveGameShell} from './immersive-game-shell.js';
import {installOptionsUi} from './options-ui.js';
import './furnace-ui.js';
import './main.js';

installVanillaUiPresentation();
installVanillaWorkbenchPresentation();
installVanillaMiningAudioRuntime();
installWorldSelection();
const inventoryPreview=installInventoryPlayerPreview();
const optionsUi=installOptionsUi();
installImmersiveGameShell(document.querySelector('#game-canvas'));
if(globalThis.__minecraftE2E){
  if(inventoryPreview)globalThis.__minecraftE2E.inventoryPlayerPreview=()=>inventoryPreview.snapshot();
  if(optionsUi)globalThis.__minecraftE2E.gameSettings=()=>optionsUi.snapshot();
}
