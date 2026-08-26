const STORAGE_KEY='minecraft-web.game-options.v1';
export const DEFAULT_INTERFACE_SCALE=1;
export const DEFAULT_DIFFICULTY='normal';
export const INTERFACE_SCALE_OPTIONS=Object.freeze([.75,1,1.25,1.5]);
export const DIFFICULTIES=Object.freeze(['peaceful','easy','normal','hard']);
export const DIFFICULTY_LABELS=Object.freeze({peaceful:'和平',easy:'简单',normal:'普通',hard:'困难'});
const DIFFICULTY_DAMAGE_MULTIPLIERS=Object.freeze({peaceful:0,easy:.5,normal:1,hard:1.5});

export function normalizeInterfaceScale(value){
  const number=Number(value);if(!Number.isFinite(number))return DEFAULT_INTERFACE_SCALE;
  return INTERFACE_SCALE_OPTIONS.reduce((best,candidate)=>Math.abs(candidate-number)<Math.abs(best-number)?candidate:best,DEFAULT_INTERFACE_SCALE);
}
export function normalizeDifficulty(value){return DIFFICULTIES.includes(value)?value:DEFAULT_DIFFICULTY;}
export function normalizeGameOptions(value={}){return Object.freeze({interfaceScale:normalizeInterfaceScale(value?.interfaceScale),difficulty:normalizeDifficulty(value?.difficulty)});}
export function hostileDamageForDifficulty(amount,difficulty){
  const damage=Number(amount);if(!Number.isFinite(damage)||damage<0)throw new RangeError('hostile damage must be a non-negative finite number');
  return damage*DIFFICULTY_DAMAGE_MULTIPLIERS[normalizeDifficulty(difficulty)];
}
export function hostileSpawningAllowed(difficulty){return normalizeDifficulty(difficulty)!=='peaceful';}

function storageLike(storage){return storage&&typeof storage.getItem==='function'&&typeof storage.setItem==='function'?storage:null;}
export function readGameOptions(storage=globalThis.localStorage){
  const target=storageLike(storage);if(!target)return normalizeGameOptions();
  try{const raw=target.getItem(STORAGE_KEY);return raw?normalizeGameOptions(JSON.parse(raw)):normalizeGameOptions();}catch{return normalizeGameOptions();}
}
export function writeGameOptions(value,storage=globalThis.localStorage){
  const normalized=normalizeGameOptions(value),target=storageLike(storage);if(target){try{target.setItem(STORAGE_KEY,JSON.stringify(normalized));}catch{}}
  return normalized;
}
export function gameOptionsStorageKey(){return STORAGE_KEY;}
