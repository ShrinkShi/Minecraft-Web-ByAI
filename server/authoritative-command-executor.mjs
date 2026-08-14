import {ITEM_ALIASES} from '../src/commands.js';
import {ITEMS} from '../src/items.js';
import {MAX_MULTIPLAYER_COMMAND_LENGTH} from '../src/multiplayer-command-wire.js';

const PLAYER_MODES=new Set(['survival','creative','adventure','spectator']);

function callback(value,label){if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value;}
function commandText(value){if(typeof value!=='string')throw new TypeError('authoritative command text must be a string');const text=value.trim();if(!text.startsWith('/')||text.length<2||text.length>MAX_MULTIPLAYER_COMMAND_LENGTH)throw new RangeError('authoritative command text is invalid');return text;}
function ok(message){return Object.freeze({ok:true,code:'ok',message});}
function fail(code,message){return Object.freeze({ok:false,code,message});}
function denied(){return fail('denied','服务器未启用作弊指令。管理员可通过 MCWEB_ALLOW_COMMANDS=true 显式开启。');}

export function executeAuthoritativeCommand(text,{allowCommands=false,setMode,give}={}){
  text=commandText(text);setMode=callback(setMode,'setMode');give=callback(give,'give');
  const parts=text.slice(1).trim().split(/\s+/),name=(parts.shift()||'').toLowerCase();
  if(name==='help'){
    if(parts.length)return fail('usage','用法：/help');
    return ok(allowCommands?'多人可用：/help /gamemode /give':'多人可用：/help；/gamemode 与 /give 需要服务器显式启用作弊指令。');
  }
  if(name==='gamemode'){
    if(!allowCommands)return denied();
    if(parts.length!==1||!PLAYER_MODES.has(parts[0].toLowerCase()))return fail('usage','用法：/gamemode <survival|creative|adventure|spectator>');
    const mode=parts[0].toLowerCase();setMode(mode);return ok(`已将游戏模式切换为 ${mode}`);
  }
  if(name==='give'){
    if(!allowCommands)return denied();
    if(parts.length<1||parts.length>2)return fail('usage','用法：/give <物品> [数量]');
    const alias=parts[0].toLowerCase(),itemId=ITEM_ALIASES[alias]||alias,count=parts.length===2?Number(parts[1]):1;
    if(!ITEMS[itemId])return fail('usage',`未知物品：${alias}`);
    if(!Number.isInteger(count)||count<1||count>2304)return fail('usage','给予数量必须是 1..2304 的整数');
    const result=give(itemId,count);if(!result||typeof result!=='object'||!Number.isInteger(result.remaining)||result.remaining<0||result.remaining>count)throw new TypeError('give callback returned an invalid result');
    const inserted=count-result.remaining;if(inserted===0)return fail('inventory-full','背包已满，未给予任何物品');
    return ok(`给予 ${ITEMS[itemId].name} × ${inserted}${result.remaining?`（背包已满，剩余 ${result.remaining}）`:''}`);
  }
  return fail('unknown-command',`多人服务器暂不支持指令：/${name}`);
}
