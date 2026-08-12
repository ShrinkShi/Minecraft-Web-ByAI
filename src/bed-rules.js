export const BED_IDS=Object.freeze({
  north:Object.freeze({foot:11,head:12,dx:0,dz:-1}),
  south:Object.freeze({foot:13,head:14,dx:0,dz:1}),
  west:Object.freeze({foot:15,head:16,dx:-1,dz:0}),
  east:Object.freeze({foot:17,head:18,dx:1,dz:0})
});

const metadata=new Map();
for(const [facing,entry] of Object.entries(BED_IDS)){
  metadata.set(entry.foot,Object.freeze({facing,part:'foot',dx:entry.dx,dz:entry.dz,partnerId:entry.head}));
  metadata.set(entry.head,Object.freeze({facing,part:'head',dx:entry.dx,dz:entry.dz,partnerId:entry.foot}));
}

export const BED_BLOCK_IDS=Object.freeze([...metadata.keys()]);
export const isBedBlock=id=>metadata.has(Number(id));
export const bedBlockMeta=id=>metadata.get(Number(id))||null;

export function bedFacingFromLook(look){
  const x=Number(look?.x),z=Number(look?.z);
  if(!Number.isFinite(x)||!Number.isFinite(z))return'north';
  if(Math.abs(x)>Math.abs(z))return x>=0?'east':'west';
  return z>=0?'south':'north';
}

export function bedPlacement(footCell,look){
  if(!footCell||![footCell.x,footCell.y,footCell.z].every(Number.isFinite))return null;
  const foot={x:Math.floor(footCell.x),y:Math.floor(footCell.y),z:Math.floor(footCell.z)};
  const facing=bedFacingFromLook(look),entry=BED_IDS[facing];
  return{
    facing,
    foot:{...foot,id:entry.foot},
    head:{x:foot.x+entry.dx,y:foot.y,z:foot.z+entry.dz,id:entry.head}
  };
}

export function bedPartner(cell,id){
  const meta=bedBlockMeta(id);if(!meta||!cell||![cell.x,cell.y,cell.z].every(Number.isFinite))return null;
  const sign=meta.part==='foot'?1:-1;
  return{x:Math.floor(cell.x)+meta.dx*sign,y:Math.floor(cell.y),z:Math.floor(cell.z)+meta.dz*sign,id:meta.partnerId};
}

function bedFootCell(cell,id){
  const meta=bedBlockMeta(id);if(!meta||!cell||![cell.x,cell.y,cell.z].every(Number.isFinite))return null;
  let x=Math.floor(cell.x),y=Math.floor(cell.y),z=Math.floor(cell.z);
  if(meta.part==='head'){x-=meta.dx;z-=meta.dz;}
  return{x,y,z};
}

export function bedSleepCheckPoint(cell,id){
  const foot=bedFootCell(cell,id);if(!foot)return null;
  return{x:foot.x+.5,y:foot.y,z:foot.z+.5};
}

export function bedRespawnAnchor(cell,id){
  const foot=bedFootCell(cell,id);if(!foot)return null;
  return{x:foot.x+.5,y:foot.y+1.01,z:foot.z+.5};
}
