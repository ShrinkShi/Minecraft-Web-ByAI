export const DAY_TICKS=24000;
export const SLEEP_START=12542;
export const SLEEP_END=23460;
export const RAIN_SLEEP_START=12010;
export const RAIN_SLEEP_END=23992;
export const MORNING_TIME=1000;
export const MAX_SLEEP_PERCENTAGE=0x7fffffff;
const WEATHER_TYPES=new Set(['clear','rain','thunder']);

export function normalizeDayTime(value){
  if(!Number.isFinite(value))throw new TypeError('game time must be finite');
  return((Math.floor(value)%DAY_TICKS)+DAY_TICKS)%DAY_TICKS;
}

function assertWeather(weather){
  if(!WEATHER_TYPES.has(weather))throw new RangeError(`unknown sleep weather: ${weather}`);
  return weather;
}

export function isSleepTime(gameTime,weather='clear'){
  const time=normalizeDayTime(gameTime),type=assertWeather(weather);
  if(type==='thunder')return true;
  if(type==='rain')return time>=RAIN_SLEEP_START&&time<RAIN_SLEEP_END;
  return time>=SLEEP_START&&time<SLEEP_END;
}

export function requiredSleepers(totalPlayers,percentage=100){
  if(!Number.isInteger(totalPlayers)||totalPlayers<1)throw new RangeError('totalPlayers must be a positive integer');
  if(!Number.isInteger(percentage)||percentage<0||percentage>MAX_SLEEP_PERCENTAGE)throw new RangeError('sleep percentage must be a non-negative 32-bit integer');
  return Math.max(1,Math.ceil(totalPlayers*percentage/100));
}

export function resolveSleep({gameTime,weather='clear',sleepingPlayers=1,totalPlayers=1,percentage=100}={}){
  if(!Number.isInteger(sleepingPlayers)||sleepingPlayers<0||sleepingPlayers>totalPlayers)throw new RangeError('sleepingPlayers must be within the player count');
  const required=requiredSleepers(totalPlayers,percentage),time=normalizeDayTime(gameTime);
  if(!isSleepTime(time,weather))return{allowed:false,ready:false,reason:'daytime',time,required,sleepingPlayers};
  if(sleepingPlayers<required)return{allowed:true,ready:false,reason:'waiting',time,required,sleepingPlayers};
  return{allowed:true,ready:true,reason:'ready',time,required,sleepingPlayers,nextTime:MORNING_TIME};
}
