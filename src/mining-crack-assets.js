export const MINING_CRACK_ASSET_COUNT=10;
export const MINING_CRACK_ASSET_ROOT='./MC原版素材assets/minecraft/textures/block';

export function miningCrackAssetUrl(stage){
  if(!Number.isInteger(stage)||stage<0||stage>=MINING_CRACK_ASSET_COUNT)throw new RangeError(`mining crack stage must be an integer from 0 to ${MINING_CRACK_ASSET_COUNT-1}`);
  return `${MINING_CRACK_ASSET_ROOT}/destroy_stage_${stage}.png`;
}

export const MINING_CRACK_ASSET_URLS=Object.freeze(Array.from({length:MINING_CRACK_ASSET_COUNT},(_,stage)=>miningCrackAssetUrl(stage)));
