import {installVanillaUiPresentation} from './vanilla-ui-presentation.js';
import {installWorldSelection} from './world-selection.js';
import {installInventoryPlayerPreview} from './inventory-player-preview.js';
import './furnace-ui.js';
import './main.js';

installVanillaUiPresentation();
installWorldSelection();
const inventoryPreview=installInventoryPlayerPreview();
if(globalThis.__minecraftE2E&&inventoryPreview)globalThis.__minecraftE2E.inventoryPlayerPreview=()=>inventoryPreview.snapshot();
