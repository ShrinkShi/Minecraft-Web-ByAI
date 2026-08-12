import {ITEMS} from './items.js';

const ITEM_ALIASES={
  grass:'block:1',grass_block:'block:1','minecraft:grass_block':'block:1',
  dirt:'block:2','minecraft:dirt':'block:2',stone:'block:3','minecraft:stone':'block:3',
  sand:'block:4','minecraft:sand':'block:4',planks:'block:5',oak_planks:'block:5','minecraft:oak_planks':'block:5',
  log:'block:6',oak_log:'block:6','minecraft:oak_log':'block:6',crafting_table:'block:9','minecraft:crafting_table':'block:9',cobblestone:'block:10','minecraft:cobblestone':'block:10',
  stick:'stick','minecraft:stick':'stick',wooden_pickaxe:'wooden_pickaxe','minecraft:wooden_pickaxe':'wooden_pickaxe',
  leather_helmet:'leather_helmet','minecraft:leather_helmet':'leather_helmet',
  leather_chestplate:'leather_chestplate','minecraft:leather_chestplate':'leather_chestplate',
  leather_leggings:'leather_leggings','minecraft:leather_leggings':'leather_leggings',
  leather_boots:'leather_boots','minecraft:leather_boots':'leather_boots'
};

const num=(value,current)=>value==='~'?current:value?.startsWith('~')?current+Number(value.slice(1)||0):Number(value);

export function executeCommand(text,ctx){
  const raw=text.trim();if(!raw.startsWith('/'))return{ok:true,message:`<玩家> ${raw}`,chat:true};
  const parts=raw.slice(1).trim().split(/\s+/),name=(parts.shift()||'').toLowerCase();
  if(name==='gamemode'){
    const mode=(parts[0]||'').toLowerCase();if(!['survival','creative','adventure','spectator'].includes(mode))return fail('用法：/gamemode <survival|creative|adventure|spectator>');
    ctx.setMode(mode);return ok(`已将游戏模式切换为 ${mode}`);
  }
  if(name==='give'){
    const alias=(parts[0]||'').toLowerCase(),itemId=ITEM_ALIASES[alias]||alias,count=Math.max(1,Math.min(2304,Number(parts[1]||1)|0));
    if(!ITEMS[itemId])return fail(`未知物品：${alias}`);
    const remaining=ctx.inventory.add(itemId,count);ctx.inventoryChanged();return ok(`给予 ${ITEMS[itemId].name} × ${count-remaining}${remaining?`（背包已满，剩余 ${remaining}）`:''}`);
  }
  if(name==='tp'||name==='teleport'){
    if(parts.length<3)return fail('用法：/tp <x> <y> <z>');
    const p=ctx.player.position,x=num(parts[0],p.x),y=num(parts[1],p.y),z=num(parts[2],p.z);if(![x,y,z].every(Number.isFinite))return fail('坐标无效');
    ctx.teleport(x,y,z);return ok(`已传送至 ${x.toFixed(1)} ${y.toFixed(1)} ${z.toFixed(1)}`);
  }
  if(name==='spawnpoint'){
    if(parts.length!==0&&parts.length!==3)return fail('用法：/spawnpoint [x y z]');
    const p=ctx.player?.position;if(!p)return fail('当前环境没有玩家位置');
    const x=parts.length?num(parts[0],p.x):p.x,y=parts.length?num(parts[1],p.y):p.y,z=parts.length?num(parts[2],p.z):p.z;
    if(![x,y,z].every(Number.isFinite))return fail('重生点坐标无效');
    if(typeof ctx.setSpawnpoint!=='function')return fail('当前环境不支持 /spawnpoint');
    const accepted=ctx.setSpawnpoint(x,y,z);if(accepted===false)return fail('无法设置重生点');
    return ok(`已将重生点设置为 ${x.toFixed(1)} ${y.toFixed(1)} ${z.toFixed(1)}`);
  }
  if(name==='xp'||name==='experience'){
    const action=(parts.shift()||'').toLowerCase();
    const amount=Number(parts.shift());
    const unit=(parts.shift()||'points').toLowerCase();
    if(action!=='add'||parts.length||!Number.isInteger(amount)||amount<=0||amount>100000||!['point','points'].includes(unit))return fail('用法：/xp add <1..100000> [points]');
    if(typeof ctx.addXp!=='function')return fail('当前环境不支持 /xp');
    ctx.addXp(amount);return ok(`增加 ${amount} 点经验`);
  }
  if(name==='kill'){
    if(parts.length)return fail('用法：/kill');
    if(typeof ctx.kill!=='function')return fail('当前环境不支持 /kill');
    ctx.kill();return ok('已杀死玩家');
  }
  if(name==='time'){
    if(parts[0]!=='set')return fail('用法：/time set <day|night|数字>');
    const value=(parts[1]||'').toLowerCase(),time=value==='day'?1000:value==='noon'?6000:value==='night'?13000:value==='midnight'?18000:Number(value);
    if(!Number.isFinite(time))return fail('时间值无效');ctx.setTime(((time%24000)+24000)%24000);return ok(`时间已设为 ${Math.floor(time)}`);
  }
  if(name==='weather'){
    const weather=(parts[0]||'').toLowerCase();if(!['clear','rain','thunder'].includes(weather))return fail('用法：/weather <clear|rain|thunder>');ctx.setWeather(weather);return ok(`天气已设为 ${weather}`);
  }
  if(name==='help')return ok('可用：/gamemode /give /tp /spawnpoint /kill /xp /time set /weather /help');
  return fail(`未知指令：/${name}`);
}

const ok=message=>({ok:true,message});
const fail=message=>({ok:false,message});
