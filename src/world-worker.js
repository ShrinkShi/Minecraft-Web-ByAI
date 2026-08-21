import {createTerrainGenerator} from './terrain-generator.js';

let generator=createTerrainGenerator();

self.onmessage=event=>{
  const message=event.data;
  if(message.type==='init'){
    generator=createTerrainGenerator({seed:message.seed||'1',prompt:message.prompt||'',version:message.terrainVersion});
    self.postMessage({type:'ready'});return;
  }
  if(message.type!=='generate')return;
  const {cx,cz}=message,chunk=generator.generateChunk(cx,cz);
  self.postMessage({type:'chunk',cx,cz,data:chunk.buffer},[chunk.buffer]);
};
