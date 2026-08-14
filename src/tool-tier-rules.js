export const TOOL_TIER_ORDER=Object.freeze(['wood','stone','iron','diamond','netherite']);
export const TOOL_TIER_LABELS=Object.freeze({wood:'木质',stone:'石质',iron:'铁质',diamond:'钻石',netherite:'下界合金'});
const TIER_RANK=Object.freeze(Object.fromEntries(TOOL_TIER_ORDER.map((tier,index)=>[tier,index])));

export function toolTierRank(tier){
  if(tier===null||tier===undefined)return -1;
  if(typeof tier!=='string'||!(tier in TIER_RANK))throw new RangeError(`unsupported tool tier: ${tier}`);
  return TIER_RANK[tier];
}

export function toolTierLabel(tier){
  if(tier===null||tier===undefined)return null;
  toolTierRank(tier);return TOOL_TIER_LABELS[tier];
}

export function minimumToolTier(block){
  if(!block?.requires)return null;
  return block.minToolTier||'wood';
}

export function toolMeetsBlockRequirement(tool,block){
  if(!block?.requires)return true;
  if(!tool||tool.kind!==block.requires)return false;
  return toolTierRank(tool.tier||'wood')>=toolTierRank(minimumToolTier(block));
}
