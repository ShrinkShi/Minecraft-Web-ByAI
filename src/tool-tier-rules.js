export const TOOL_TIER_RANKS=Object.freeze({wood:0,gold:0,stone:1,iron:2,diamond:3,netherite:4});
export const TOOL_TIER_LABELS=Object.freeze({wood:'木质',gold:'金质',stone:'石质',iron:'铁质',diamond:'钻石',netherite:'下界合金'});

export function toolTierRank(tier){
  if(tier===null||tier===undefined)return -1;
  if(typeof tier!=='string'||!Object.hasOwn(TOOL_TIER_RANKS,tier))throw new RangeError(`unsupported tool tier: ${tier}`);
  return TOOL_TIER_RANKS[tier];
}

export function toolTierLabel(tier){
  if(tier===null||tier===undefined)return null;
  toolTierRank(tier);
  return TOOL_TIER_LABELS[tier];
}

export function minimumToolTier(block){
  if(!block?.requires)return null;
  const tier=block.minToolTier||'wood';
  toolTierRank(tier);
  return tier;
}

export function toolMeetsBlockRequirement(tool,block){
  if(!block?.requires)return true;
  if(!tool||tool.kind!==block.requires)return false;
  const requiredTier=minimumToolTier(block),heldTier=tool.tier||'wood';
  return toolTierRank(heldTier)>=toolTierRank(requiredTier);
}
