const RECIPES=[
  {id:'planks',kind:'shapeless',items:['block:6'],result:{id:'block:5',count:4}},
  {id:'sticks',kind:'shaped',pattern:[['block:5'],['block:5']],result:{id:'stick',count:4}},
  {id:'crafting_table',kind:'shaped',pattern:[['block:5','block:5'],['block:5','block:5']],result:{id:'block:9',count:1}},
  {id:'bed',kind:'shaped',pattern:[['white_wool','white_wool','white_wool'],['block:5','block:5','block:5']],result:{id:'bed',count:1},minSize:3},
  {id:'wooden_pickaxe',kind:'shaped',pattern:[['block:5','block:5','block:5'],[null,'stick',null],[null,'stick',null]],result:{id:'wooden_pickaxe',count:1},minSize:3},
  {id:'stone_pickaxe',kind:'shaped',pattern:[['block:10','block:10','block:10'],[null,'stick',null],[null,'stick',null]],result:{id:'stone_pickaxe',count:1},minSize:3},
  {id:'iron_pickaxe',kind:'shaped',pattern:[['iron_ingot','iron_ingot','iron_ingot'],[null,'stick',null],[null,'stick',null]],result:{id:'iron_pickaxe',count:1},minSize:3},
  {id:'wooden_sword',kind:'shaped',pattern:[['block:5'],['block:5'],['stick']],result:{id:'wooden_sword',count:1},minSize:3},
  {id:'stone_sword',kind:'shaped',pattern:[['block:10'],['block:10'],['stick']],result:{id:'stone_sword',count:1},minSize:3},
  {id:'iron_axe',kind:'shaped',pattern:[['iron_ingot','iron_ingot'],['iron_ingot','stick'],[null,'stick']],result:{id:'iron_axe',count:1},minSize:3},
  {id:'iron_shovel',kind:'shaped',pattern:[['iron_ingot'],['stick'],['stick']],result:{id:'iron_shovel',count:1},minSize:3},
  {id:'iron_hoe',kind:'shaped',pattern:[['iron_ingot','iron_ingot'],[null,'stick'],[null,'stick']],result:{id:'iron_hoe',count:1},minSize:3},
  {id:'iron_sword',kind:'shaped',pattern:[['iron_ingot'],['iron_ingot'],['stick']],result:{id:'iron_sword',count:1},minSize:3},
  {id:'iron_helmet',kind:'shaped',pattern:[['iron_ingot','iron_ingot','iron_ingot'],['iron_ingot',null,'iron_ingot']],result:{id:'iron_helmet',count:1},minSize:3},
  {id:'iron_chestplate',kind:'shaped',pattern:[['iron_ingot',null,'iron_ingot'],['iron_ingot','iron_ingot','iron_ingot'],['iron_ingot','iron_ingot','iron_ingot']],result:{id:'iron_chestplate',count:1},minSize:3},
  {id:'iron_leggings',kind:'shaped',pattern:[['iron_ingot','iron_ingot','iron_ingot'],['iron_ingot',null,'iron_ingot'],['iron_ingot',null,'iron_ingot']],result:{id:'iron_leggings',count:1},minSize:3},
  {id:'iron_boots',kind:'shaped',pattern:[['iron_ingot',null,'iron_ingot'],['iron_ingot',null,'iron_ingot']],result:{id:'iron_boots',count:1},minSize:3},
  {id:'furnace',kind:'shaped',pattern:[['block:10','block:10','block:10'],['block:10',null,'block:10'],['block:10','block:10','block:10']],result:{id:'block:21',count:1},minSize:3}
];

function trimGrid(slots,size){
  const occupied=[];
  for(let i=0;i<slots.length;i++)if(slots[i])occupied.push([i%size,Math.floor(i/size)]);
  if(!occupied.length)return null;
  const xs=occupied.map(p=>p[0]),ys=occupied.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const width=maxX-minX+1,height=maxY-minY+1,cells=[];
  for(let y=minY;y<=maxY;y++){
    const row=[];
    for(let x=minX;x<=maxX;x++)row.push(slots[y*size+x]?.id||null);
    cells.push(row);
  }
  return{cells,minX,minY,width,height};
}

function matchShaped(recipe,slots,size){
  if(recipe.minSize&&size<recipe.minSize)return null;
  const trimmed=trimGrid(slots,size);if(!trimmed)return null;
  const pattern=recipe.pattern,ph=pattern.length,pw=Math.max(...pattern.map(r=>r.length));
  if(trimmed.width!==pw||trimmed.height!==ph)return null;
  const candidates=[pattern,pattern.map(row=>[...row].reverse())];
  for(const candidate of candidates){
    let ok=true;const used=[];
    for(let y=0;y<ph&&ok;y++)for(let x=0;x<pw;x++){
      const expected=candidate[y]?.[x]||null,actual=trimmed.cells[y]?.[x]||null;
      if(expected!==actual){ok=false;break;}
      if(expected)used.push((trimmed.minY+y)*size+trimmed.minX+x);
    }
    if(ok)return{recipe,used};
  }
  return null;
}

function matchShapeless(recipe,slots){
  const occupied=[];for(let i=0;i<slots.length;i++)if(slots[i])occupied.push([slots[i].id,i]);
  const wanted=[...recipe.items].sort();if(occupied.length!==wanted.length)return null;
  if(occupied.map(x=>x[0]).sort().join('\u0000')!==wanted.join('\u0000'))return null;
  return{recipe,used:occupied.map(x=>x[1])};
}

export function matchRecipe(slots,size){
  for(const recipe of RECIPES){
    const match=recipe.kind==='shaped'?matchShaped(recipe,slots,size):matchShapeless(recipe,slots);
    if(match)return match;
  }
  return null;
}

export class CraftingGrid{
  constructor(size=2){this.size=size;this.slots=Array(size*size).fill(null);this.match=null;this.authoritative=false;this.authoritativeResult=null;this.refresh();}
  refresh(){if(this.authoritative){this.match=null;return this.authoritativeResult?{...this.authoritativeResult}:null;}this.match=matchRecipe(this.slots,this.size);return this.match?.recipe.result||null;}
  replaceSnapshot(snapshot){if(snapshot===null){this.slots=Array(this.size*this.size).fill(null);this.authoritativeResult=null;this.authoritative=false;this.match=null;this.refresh();return true;}if(!snapshot||snapshot.size!==this.size||!Array.isArray(snapshot.slots)||snapshot.slots.length!==this.size*this.size)return false;this.slots=snapshot.slots.map(stack=>stack?{...stack}:null);this.authoritativeResult=snapshot.result?{...snapshot.result}:null;this.authoritative=true;this.match=null;return true;}
  consume(){
    if(this.authoritative)return null;if(!this.match)return null;
    const output={...this.match.recipe.result};
    for(const index of this.match.used){const slot=this.slots[index];if(slot){slot.count--;if(slot.count<=0)this.slots[index]=null;}}
    this.refresh();return output;
  }
  drain(){
    const stacks=[];
    for(let i=0;i<this.slots.length;i++){
      const slot=this.slots[i];if(slot)stacks.push({...slot});this.slots[i]=null;
    }
    this.authoritativeResult=null;this.authoritative=false;this.refresh();return stacks;
  }
  clearTo(inventory){
    const overflow=[];
    for(let i=0;i<this.slots.length;i++){
      const slot=this.slots[i];if(!slot)continue;
      const left=typeof inventory.returnExistingStack==='function'?inventory.returnExistingStack({...slot}):((slot.damage??0)>0&&typeof inventory.addStack==='function'?inventory.addStack({...slot}):inventory.add(slot.id,slot.count));
      if(left)overflow.push({...slot,count:left});this.slots[i]=null;
    }
    this.authoritativeResult=null;this.authoritative=false;this.refresh();return overflow;
  }
}
