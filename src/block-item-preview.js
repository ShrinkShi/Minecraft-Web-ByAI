import {ATLAS_COLS,ATLAS_ROWS,tileForFace} from './blocks.js';

function tile(value,label){
  if(!Number.isInteger(value)||value<0||value>=ATLAS_COLS*ATLAS_ROWS)throw new RangeError(`${label} must be a valid terrain atlas tile`);
  return value;
}

export function blockItemFaceTiles(itemDefinition){
  if(!itemDefinition||typeof itemDefinition!=='object')return null;
  // Some source-backed block textures are intentionally outside the legacy
  // terrain atlas. Returning null lets UI.makeIcon use the declared source
  // texture rather than rendering a false fallback terrain tile.
  if(itemDefinition.blockPreview===false)return null;
  if(Number.isInteger(itemDefinition.blockId)){
    return Object.freeze({
      top:tile(tileForFace(itemDefinition.blockId,'top'),'top tile'),
      left:tile(tileForFace(itemDefinition.blockId,'north'),'left tile'),
      right:tile(tileForFace(itemDefinition.blockId,'east'),'right tile')
    });
  }
  // Some already-registered block items (currently white wool) predate blockId
  // metadata. A declared atlas tile still means the item is a block preview;
  // use the same source tile on all three faces until its gameplay block joins
  // the expanded registry.
  if(Number.isInteger(itemDefinition.tile)){
    const fallback=tile(itemDefinition.tile,'item tile');
    return Object.freeze({top:fallback,left:fallback,right:fallback});
  }
  return null;
}

export function blockItemAtlasStyle(tileIndex,{facePixels=24}={}){
  tile(tileIndex,'tileIndex');
  if(!Number.isFinite(facePixels)||facePixels<=0)throw new RangeError('facePixels must be > 0');
  const col=tileIndex%ATLAS_COLS,row=Math.floor(tileIndex/ATLAS_COLS);
  return Object.freeze({
    backgroundSize:`${ATLAS_COLS*facePixels}px ${ATLAS_ROWS*facePixels}px`,
    backgroundPosition:`-${col*facePixels}px -${row*facePixels}px`
  });
}
