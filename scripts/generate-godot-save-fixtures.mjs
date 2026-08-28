import fs from 'node:fs';
import {BLOCK,CHUNK_SIZE,WORLD_HEIGHT} from '../src/blocks.js';
import {BlockStateSidecar} from '../src/block-state-sidecar.js';
import {
  SINGLEPLAYER_SAVE_VERSION,
  resolveSingleplayerBlockStates,
  resolveSingleplayerTerrainVersion
} from '../src/world-save-compatibility.js';

const outputPath=process.argv[2];
if(!outputPath)throw new Error('usage: node scripts/generate-godot-save-fixtures.mjs <output.json>');

const index=(x,y,z)=>x+CHUNK_SIZE*(z+CHUNK_SIZE*y);
const stateIndex=index(1,40,1);
const plainIndex=index(2,40,2);
const negativeIndex=index(15,40,15);
const sidecar=new BlockStateSidecar();
sidecar.setFromKey('0,0',stateIndex,BLOCK.LOG,'axis=x');

const currentRecord={
  id:'world_godot_save_fixture',
  name:'Godot Save Fixture',
  seed:'山海🌍',
  prompt:'森林 山 海',
  version:SINGLEPLAYER_SAVE_VERSION,
  terrainVersion:4,
  edits:{
    '0,0':[[stateIndex,BLOCK.LOG],[plainIndex,BLOCK.COBBLESTONE]],
    '-1,-1':[[negativeIndex,BLOCK.PLANKS]]
  },
  blockStates:sidecar.export(),
  customFutureField:{preserve:true}
};

const compatibilityCases=[
  {name:'new-world',record:null,ok:true,terrainVersion:resolveSingleplayerTerrainVersion(null),blockStates:resolveSingleplayerBlockStates(null)},
  {name:'legacy-unversioned',record:{version:7},ok:true,terrainVersion:resolveSingleplayerTerrainVersion({version:7}),blockStates:resolveSingleplayerBlockStates({version:7})},
  {name:'save-v10',record:{version:10,terrainVersion:4},ok:true,terrainVersion:resolveSingleplayerTerrainVersion({version:10,terrainVersion:4}),blockStates:resolveSingleplayerBlockStates({version:10,terrainVersion:4})},
  {name:'save-v8-missing-terrain',record:{version:8},ok:false,errorIncludes:'missing terrainVersion'},
  {name:'save-v11-missing-states',record:{version:11,terrainVersion:4},ok:false,errorIncludes:'missing blockStates'}
];

const document={
  schema:'minecraft-godot-save-fixture-v1',
  chunkSize:CHUNK_SIZE,
  worldHeight:WORLD_HEIGHT,
  currentRecord,
  expected:{
    terrainVersion:resolveSingleplayerTerrainVersion(currentRecord),
    blockStates:resolveSingleplayerBlockStates(currentRecord),
    cells:{
      state:{world:[1,40,1],chunkKey:'0,0',index:stateIndex,id:BLOCK.LOG,stateKey:'axis=x'},
      plain:{world:[2,40,2],chunkKey:'0,0',index:plainIndex,id:BLOCK.COBBLESTONE},
      negative:{world:[-1,40,-1],chunkKey:'-1,-1',index:negativeIndex,id:BLOCK.PLANKS}
    }
  },
  compatibilityCases
};

fs.writeFileSync(outputPath,JSON.stringify(document));
console.log(`wrote Godot save compatibility fixture to ${outputPath}`);
