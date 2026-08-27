export const GAME_SETTINGS_STORAGE_KEY='minecraft-web.game-settings.v1';
export const DIFFICULTIES=Object.freeze(['peaceful','easy','normal','hard']);
export const UI_SCALES=Object.freeze([.75,1,1.25,1.5,2]);
export const DEFAULT_GAME_SETTINGS=Object.freeze({uiScale:1,difficulty:'normal'});
const listeners=new Set();
let cached=null;

function nearestScale(value){
  const number=Number(value);if(!Number.isFinite(number))return DEFAULT_GAME_SETTINGS.uiScale;
  return UI_SCALES.reduce((best,next)=>Math.abs(next-number)<Math.abs(best-number)?next:best,UI_SCALES[0]);
}
export function normalizeDifficulty(value){return DIFFICULTIES.includes(value)?value:DEFAULT_GAME_SETTINGS.difficulty;}
export function normalizeGameSettings(value={}){return Object.freeze({uiScale:nearestScale(value?.uiScale),difficulty:normalizeDifficulty(value?.difficulty)});}
function storage(){try{return globalThis.localStorage||null;}catch{return null;}}
export function loadGameSettings(){
  if(cached)return cached;let parsed=null;try{const raw=storage()?.getItem(GAME_SETTINGS_STORAGE_KEY);if(raw)parsed=JSON.parse(raw);}catch{}
  cached=normalizeGameSettings(parsed||DEFAULT_GAME_SETTINGS);return cached;
}
export function saveGameSettings(value){
  const next=normalizeGameSettings(value);cached=next;try{storage()?.setItem(GAME_SETTINGS_STORAGE_KEY,JSON.stringify(next));}catch{}
  for(const listener of listeners)listener(next);return next;
}
export function updateGameSettings(patch={}){return saveGameSettings({...loadGameSettings(),...patch});}
export function subscribeGameSettings(listener){if(typeof listener!=='function')throw new TypeError('game settings listener must be a function');listeners.add(listener);return()=>listeners.delete(listener);}
export function currentDifficulty(){return loadGameSettings().difficulty;}
export function difficultyDamageMultiplier(difficulty=currentDifficulty()){
  const value=normalizeDifficulty(difficulty);return value==='peaceful'?0:value==='easy'?.5:value==='hard'?1.5:1;
}
export function hostileSpawningAllowed(difficulty=currentDifficulty()){return normalizeDifficulty(difficulty)!=='peaceful';}
export function scaleDifficultyDamage(amount,difficulty=currentDifficulty()){
  const number=Number(amount);if(!Number.isFinite(number)||number<0)throw new RangeError('damage amount must be a non-negative finite number');return number*difficultyDamageMultiplier(difficulty);
}
