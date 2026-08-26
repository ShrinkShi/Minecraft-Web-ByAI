import {installVanillaUiPresentation} from './vanilla-ui-presentation.js';
import {installVanillaWorkbenchPresentation} from './vanilla-workbench-presentation.js';
import {installVanillaMiningAudioRuntime} from './vanilla-mining-audio-runtime.js';
import {installWorldSelection} from './world-selection.js';
import {installInventoryPlayerPreview} from './inventory-player-preview.js';
import {installImmersiveGameShell} from './immersive-game-shell.js';
import {installGameOptions} from './game-options-ui.js';
import './furnace-ui.js';
import './main.js';

installVanillaUiPresentation();
installVanillaWorkbenchPresentation();
installVanillaMiningAudioRuntime();
installWorldSelection();
const inventoryPreview=installInventoryPlayerPreview();
installImmersiveGameShell(document.querySelector('#game-canvas'));
const gameOptions=installGameOptions();
if(globalThis.__minecraftE2E){
  if(inventoryPreview)globalThis.__minecraftE2E.inventoryPlayerPreview=()=>inventoryPreview.snapshot();
  globalThis.__minecraftE2E.gameOptions=gameOptions;
}
