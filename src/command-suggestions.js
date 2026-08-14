import {ITEMS} from './items.js';
import {ITEM_ALIASES} from './commands.js';
import {PASSIVE_MOB_IDS,HOSTILE_MOB_IDS} from './mobs.js';

const COMMANDS=Object.freeze([
  {name:'gamemode',usage:'/gamemode <survival|creative|adventure|spectator>',description:'切换游戏模式'},
  {name:'give',usage:'/give <物品> [数量]',description:'给予物品'},
  {name:'tp',aliases:['teleport'],usage:'/tp <x> <y> <z>',description:'传送玩家'},
  {name:'spawnpoint',usage:'/spawnpoint [x y z]',description:'设置重生点'},
  {name:'summon',usage:'/summon <实体> [x y z]',description:'召唤实体'},
  {name:'kill',usage:'/kill',description:'杀死当前玩家'},
  {name:'xp',aliases:['experience'],usage:'/xp add <数量> [points]',description:'增加经验值'},
  {name:'time',usage:'/time set <day|noon|night|midnight|数字>',description:'设置时间'},
  {name:'weather',usage:'/weather <clear|rain|thunder>',description:'设置天气'},
  {name:'help',usage:'/help',description:'显示可用指令'}
]);

export const COMMAND_DEFINITIONS=COMMANDS;

const valueSuggestion=(value,replacement,definition,description=null)=>Object.freeze({
  kind:'value',label:value,replacement,usage:definition.usage,description:description||definition.description
});
const hintSuggestion=(label,definition,description=null)=>Object.freeze({
  kind:'hint',label,replacement:null,usage:definition.usage,description:description||definition.description
});

const commandNames=()=>COMMANDS.flatMap(command=>[
  {token:command.name,definition:command},
  ...(command.aliases||[]).map(token=>({token,definition:command}))
]);

const preferredItemTokens=(()=>{
  const candidates=[];
  for(const alias of Object.keys(ITEM_ALIASES))candidates.push(alias);
  for(const id of Object.keys(ITEMS))candidates.push(id);
  const unique=[...new Set(candidates)];
  return Object.freeze(unique.sort((a,b)=>{
    const ans=a.startsWith('minecraft:')?1:0,bns=b.startsWith('minecraft:')?1:0;
    return ans-bns||a.localeCompare(b);
  }));
})();

const entityTokens=Object.freeze([...new Set([...PASSIVE_MOB_IDS,...HOSTILE_MOB_IDS])].sort());
const GAMEMODES=Object.freeze(['survival','creative','adventure','spectator']);
const WEATHER=Object.freeze(['clear','rain','thunder']);
const TIMES=Object.freeze(['day','noon','night','midnight']);

function normalizeText(value){return typeof value==='string'?value:'';}
function prefixMatches(values,prefix){const needle=prefix.toLowerCase();return values.filter(value=>value.toLowerCase().startsWith(needle));}
function commandDefinition(token){
  const lower=token.toLowerCase();
  return COMMANDS.find(command=>command.name===lower||(command.aliases||[]).includes(lower))||null;
}
function complete(token,args,value,{space=true}={}){
  const body=[token,...args,value].join(' ');
  return `/${body}${space?' ':''}`;
}
function argContext(body){
  const firstSpace=body.search(/\s/);
  if(firstSpace<0)return null;
  const token=body.slice(0,firstSpace),rest=body.slice(firstSpace+1),trailing=/\s$/.test(body),raw=rest.trim()?rest.trim().split(/\s+/):[];
  const prefix=trailing?'':(raw.pop()||'');
  return{token,args:raw,prefix,argIndex:raw.length};
}
function commandSuggestions(body){
  const prefix=body.toLowerCase();
  return commandNames().filter(entry=>entry.token.startsWith(prefix)).map(entry=>valueSuggestion(`/${entry.token}`,`/${entry.token} `,entry.definition));
}
function valueSuggestions(values,ctx,definition,{description=null,space=true}={}){
  return prefixMatches(values,ctx.prefix).map(value=>valueSuggestion(value,complete(ctx.token,ctx.args,value,{space}),definition,description));
}

export function suggestCommands(input){
  const text=normalizeText(input);if(!text.startsWith('/'))return[];
  const body=text.slice(1);if(!/\s/.test(body))return commandSuggestions(body);
  const ctx=argContext(body);if(!ctx)return commandSuggestions(body);
  const definition=commandDefinition(ctx.token);if(!definition)return commandSuggestions(ctx.token);
  const name=definition.name,index=ctx.argIndex;
  if(name==='gamemode'&&index===0)return valueSuggestions(GAMEMODES,ctx,definition);
  if(name==='give'){
    if(index===0)return valueSuggestions(preferredItemTokens,ctx,definition,{description:'物品 ID / 常用别名'});
    if(index===1)return[hintSuggestion('[数量 1..2304]',definition,'可选给予数量')];
  }
  if(name==='tp')return[hintSuggestion(index===0?'<x>':index===1?'<y>':index===2?'<z>':'',definition,'支持绝对坐标与 ~ 相对坐标')].filter(s=>s.label);
  if(name==='spawnpoint')return[hintSuggestion(index===0?'[x]':index===1?'[y]':index===2?'[z]':'',definition,'留空则使用当前位置；坐标支持 ~')].filter(s=>s.label);
  if(name==='summon'){
    if(index===0)return valueSuggestions(entityTokens,ctx,definition,{description:'当前已实现实体类型'});
    return[hintSuggestion(index===1?'[x]':index===2?'[y]':index===3?'[z]':'',definition,'可选召唤坐标，支持 ~')].filter(s=>s.label);
  }
  if(name==='xp'){
    if(index===0)return valueSuggestions(['add'],ctx,definition);
    if(index===1&&ctx.args[0]==='add')return[hintSuggestion('<数量 1..100000>',definition,'增加的经验点数')];
    if(index===2&&ctx.args[0]==='add')return valueSuggestions(['points'],ctx,definition,{space:false});
  }
  if(name==='time'){
    if(index===0)return valueSuggestions(['set'],ctx,definition);
    if(index===1&&ctx.args[0]==='set')return[
      ...valueSuggestions(TIMES,ctx,definition,{space:false}),
      hintSuggestion('<数字>',definition,'0..23999 会映射到一天内时间')
    ];
  }
  if(name==='weather'&&index===0)return valueSuggestions(WEATHER,ctx,definition,{space:false});
  return[];
}
