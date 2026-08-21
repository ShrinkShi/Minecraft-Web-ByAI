import {BLOCK} from './blocks.js';

export const FARMLAND_TICK_INTERVAL_SECONDS=10;
export const FARMLAND_WATER_RADIUS=4;
export const WHEAT_MAX_AGE=7;

export const FARMLAND_BLOCK_IDS=Object.freeze([
  BLOCK.FARMLAND,
  BLOCK.FARMLAND_MOISTURE_1,
  BLOCK.FARMLAND_MOISTURE_2,
  BLOCK.FARMLAND_MOISTURE_3,
  BLOCK.FARMLAND_MOISTURE_4,
  BLOCK.FARMLAND_MOISTURE_5,
  BLOCK.FARMLAND_MOISTURE_6,
  BLOCK.FARMLAND_MOISTURE_7
]);

export const WHEAT_BLOCK_IDS=Object.freeze([
  BLOCK.WHEAT_AGE_0,
  BLOCK.WHEAT_AGE_1,
  BLOCK.WHEAT_AGE_2,
  BLOCK.WHEAT_AGE_3,
  BLOCK.WHEAT_AGE_4,
  BLOCK.WHEAT_AGE_5,
  BLOCK.WHEAT_AGE_6,
  BLOCK.WHEAT_AGE_7
]);

const farmlandIndex=new Map(FARMLAND_BLOCK_IDS.map((id,index)=>[id,index]));
const wheatIndex=new Map(WHEAT_BLOCK_IDS.map((id,index)=>[id,index]));
const finiteRandom=random=>{if(typeof random!=='function')throw new TypeError('farming random source must be a function');const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('farming random source must return a finite number in [0,1)');return value;};

export function isFarmlandBlock(blockId){return farmlandIndex.has(Number(blockId));}
export function farmlandMoisture(blockId){return farmlandIndex.get(Number(blockId))??null;}
export function farmlandBlockForMoisture(value){if(!Number.isInteger(value)||value<0||value>7)throw new RangeError('farmland moisture must be an integer from 0 to 7');return FARMLAND_BLOCK_IDS[value];}
export function isWheatCropBlock(blockId){return wheatIndex.has(Number(blockId));}
export function wheatAge(blockId){return wheatIndex.get(Number(blockId))??null;}
export function wheatBlockForAge(value){if(!Number.isInteger(value)||value<0||value>WHEAT_MAX_AGE)throw new RangeError('wheat age must be an integer from 0 to 7');return WHEAT_BLOCK_IDS[value];}

export function canPlantWheat(targetBlockId,aboveBlockId){return isFarmlandBlock(targetBlockId)&&Number(aboveBlockId)===BLOCK.AIR;}

export function nextFarmlandBlock(blockId,{hydrated=false,hasCrop=false}={}){
  const moisture=farmlandMoisture(blockId);if(moisture===null)throw new RangeError('farmland transition requires a farmland block');
  if(hydrated)return farmlandBlockForMoisture(7);
  if(moisture>0)return farmlandBlockForMoisture(moisture-1);
  return hasCrop?farmlandBlockForMoisture(0):BLOCK.DIRT;
}

export function wheatGrowthChance(farmlandBlockId){
  const moisture=farmlandMoisture(farmlandBlockId);if(moisture===null)return 0;
  return moisture>0?.45:.20;
}

export function nextWheatBlock(blockId,farmlandBlockId,random=Math.random){
  const age=wheatAge(blockId);if(age===null)throw new RangeError('wheat growth requires a wheat crop block');
  if(age>=WHEAT_MAX_AGE)return blockId;
  return finiteRandom(random)<wheatGrowthChance(farmlandBlockId)?wheatBlockForAge(age+1):blockId;
}

export function wheatHarvestDrops(blockId,random=Math.random){
  const age=wheatAge(blockId);if(age===null)throw new RangeError('wheat harvest requires a wheat crop block');
  if(age<WHEAT_MAX_AGE)return Object.freeze([{id:'wheat_seeds',count:1}]);
  const extraSeeds=Math.floor(finiteRandom(random)*4);
  const drops=[{id:'wheat',count:1}];
  if(extraSeeds>0)drops.push({id:'wheat_seeds',count:extraSeeds});
  return Object.freeze(drops.map(stack=>Object.freeze(stack)));
}

export function farmlandHasNearbyWater(getBlock,x,y,z){
  if(typeof getBlock!=='function')throw new TypeError('farmland water probe must be a function');
  for(let dx=-FARMLAND_WATER_RADIUS;dx<=FARMLAND_WATER_RADIUS;dx++)for(let dz=-FARMLAND_WATER_RADIUS;dz<=FARMLAND_WATER_RADIUS;dz++)for(let dy=0;dy<=1;dy++)if(getBlock(x+dx,y+dy,z+dz)===BLOCK.WATER)return true;
  return false;
}
