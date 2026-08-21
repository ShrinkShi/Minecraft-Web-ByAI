import {installVanillaUiPresentation} from './vanilla-ui-presentation.js';
import {installVanillaWorkbenchPresentation} from './vanilla-workbench-presentation.js';
import {installWorldSelection} from './world-selection.js';
import {installInventoryPlayerPreview} from './inventory-player-preview.js';
import {installImmersiveGameShell} from './immersive-game-shell.js';
import './furnace-ui.js';
import './main.js';

installVanillaUiPresentation();
installVanillaWorkbenchPresentation();
installWorldSelection();
const inventoryPreview=installInventoryPlayerPreview();
installImmersiveGameShell(document.querySelector('#game-canvas'));
if(globalThis.__minecraftE2E&&inventoryPreview)globalThis.__minecraftE2E.inventoryPlayerPreview=()=>inventoryPreview.snapshot();
