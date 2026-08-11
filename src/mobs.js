const loot=(id,min,max)=>Object.freeze({id,min,max});

export const PASSIVE_MOBS=Object.freeze({
  cow:Object.freeze({name:'牛',hp:10,speed:1.35,width:.9,height:1.4,color:0x6f4a2f,accent:0xd8c4a8,loot:Object.freeze([loot('raw_beef',1,3),loot('leather',0,2)]),xp:[1,3]}),
  sheep:Object.freeze({name:'羊',hp:8,speed:1.3,width:.9,height:1.3,color:0xe9e6df,accent:0x8c8178,loot:Object.freeze([loot('white_wool',1,1),loot('raw_mutton',1,2)]),xp:[1,3]}),
  pig:Object.freeze({name:'猪',hp:10,speed:1.3,width:.9,height:.9,color:0xe7a1a8,accent:0xc87882,loot:Object.freeze([loot('raw_porkchop',1,3)]),xp:[1,3]}),
  chicken:Object.freeze({name:'鸡',hp:4,speed:1.45,width:.45,height:.75,color:0xf2f0e7,accent:0xe7b53f,loot:Object.freeze([loot('raw_chicken',1,1),loot('feather',0,2)]),xp:[1,3]})
});

export const HOSTILE_MOBS=Object.freeze({
  zombie:Object.freeze({name:'僵尸',hp:20,speed:1.65,width:.6,height:1.8,color:0x4f8d4b,accent:0x365b8c,followRange:24,attackRange:1.55,attackDamage:3,attackCooldown:1.0,loot:Object.freeze([loot('rotten_flesh',0,2)]),xp:[5,5]})
});

export const PASSIVE_MOB_IDS=Object.freeze(Object.keys(PASSIVE_MOBS));

export function choosePassiveMob(rng=Math.random){
  const value=Math.max(0,Math.min(.999999999,Number(rng())||0));
  return PASSIVE_MOB_IDS[Math.floor(value*PASSIVE_MOB_IDS.length)];
}

export function isNightTime(gameTime){
  if(!Number.isFinite(gameTime))return false;
  const time=((gameTime%24000)+24000)%24000;
  return time>=13000&&time<23000;
}

function mobDef(type){return PASSIVE_MOBS[type]||HOSTILE_MOBS[type]||null;}
function rollInclusive(min,max,rng){const value=Math.max(0,Math.min(.999999999,Number(rng())||0));return min+Math.floor(value*(max-min+1));}

export function rollMobLoot(type,rng=Math.random){
  const def=mobDef(type);if(!def)return[];const result=[];
  for(const entry of def.loot||[]){const count=rollInclusive(entry.min,entry.max,rng);if(count>0)result.push({id:entry.id,count});}
  return result;
}

export function rollMobXp(type,rng=Math.random){
  const def=mobDef(type);if(!def?.xp)return 0;return rollInclusive(def.xp[0],def.xp[1],rng);
}
