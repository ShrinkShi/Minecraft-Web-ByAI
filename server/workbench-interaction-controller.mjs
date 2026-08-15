import {BLOCK} from '../src/blocks.js';
import {assertClientSessionId} from '../src/client-input-envelope.js';
import {assertHotbarSlot} from '../src/inventory-layout.js';
import {DEFAULT_BLOCK_REACH,raycastAuthoritativeBlock} from './block-targeting.mjs';

function worldLike(value){if(!value||typeof value!=='object'||typeof value.getBlock!=='function')throw new TypeError('world must expose getBlock');return value;}
function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function reach(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>16)throw new RangeError('maxDistance must be greater than 0 and at most 16');return value;}
function playerLike(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.mode!=='string'||!value.position||typeof value.position!=='object')throw new TypeError('player state must expose mode and position');return value;}
function actionLike(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.kind!=='string')throw new TypeError('interaction action must be an object');if(value.kind!=='use')return{kind:value.kind};const view=value.view;if(!view||typeof view!=='object'||Array.isArray(view)||typeof view.yaw!=='number'||!Number.isFinite(view.yaw)||typeof view.pitch!=='number'||!Number.isFinite(view.pitch))throw new TypeError('use action must expose a finite referenced view');return{kind:'use',selectedSlot:assertHotbarSlot(value.selectedSlot,'workbench use selectedSlot'),view:{yaw:view.yaw,pitch:view.pitch}};}
const frozen=value=>Object.freeze(value);

export class WorkbenchInteractionController{
  constructor({world,onOpen=()=>{},maxDistance=DEFAULT_BLOCK_REACH}={}){this.world=worldLike(world);this.onOpen=callback(onOpen,'onOpen');this.maxDistance=reach(maxDistance);}
  step(session,player,actions=[]){session=assertClientSessionId(session);player=playerLike(player);if(!Array.isArray(actions))throw new TypeError('interaction actions must be an array');const results=[];for(const raw of actions){const action=actionLike(raw);if(action.kind!=='use'){results.push(frozen({kind:action.kind,handled:false,reason:'unsupported-action'}));continue;}if(player.mode!=='survival'&&player.mode!=='creative'){results.push(frozen({kind:'use',handled:false,reason:'mode-not-interactive',selectedSlot:action.selectedSlot}));continue;}const target=raycastAuthoritativeBlock(this.world,{position:player.position,yaw:action.view.yaw,pitch:action.view.pitch},{maxDistance:this.maxDistance});if(!target||target.id!==BLOCK.CRAFTING_TABLE){results.push(frozen({kind:'use',handled:false,reason:target?'not-workbench':'no-target',selectedSlot:action.selectedSlot,target:target||null}));continue;}const opened=this.onOpen({session,player,target,action});results.push(frozen({kind:'use',handled:true,reason:opened?.reason||'workbench-opened',selectedSlot:action.selectedSlot,target,opened:opened||null}));}return Object.freeze(results);}
}
