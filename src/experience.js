function requireLevel(level){if(!Number.isInteger(level)||level<0)throw new RangeError('level must be a non-negative integer');}
function requireXp(value){if(!Number.isFinite(value)||value<0)throw new RangeError('xp must be >= 0');}

export function xpToNextLevel(level){
  requireLevel(level);if(level<=15)return 2*level+7;if(level<=30)return 5*level-38;return 9*level-158;
}

export function totalXpForLevel(level){
  requireLevel(level);if(level<=16)return level*level+6*level;if(level<=31)return Math.floor(2.5*level*level-40.5*level+360);return Math.floor(4.5*level*level-162.5*level+2220);
}

export function levelForTotalXp(totalXp){
  requireXp(totalXp);const total=Math.floor(totalXp);let low=0,high=1;while(totalXpForLevel(high)<=total)high*=2;
  while(low+1<high){const mid=Math.floor((low+high)/2);if(totalXpForLevel(mid)<=total)low=mid;else high=mid;}return low;
}

export function experienceState(totalXp){
  requireXp(totalXp);const total=Math.floor(totalXp),level=levelForTotalXp(total),start=totalXpForLevel(level),needed=xpToNextLevel(level),into=total-start;
  return{total,level,into,needed,progress:needed?into/needed:0};
}
