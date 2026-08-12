import assert from 'node:assert/strict';
import {BED_IDS,BED_BLOCK_IDS,bedBlockMeta,isBedBlock,bedFacingFromLook,bedPlacement,bedPartner,bedRespawnAnchor} from '../src/bed-rules.js';
import {BLOCKS} from '../src/blocks.js';
import {ITEMS,itemForBlock} from '../src/items.js';
import {CraftingGrid} from '../src/recipes.js';
import {rollMobLoot} from '../src/mobs.js';

assert.equal(BED_BLOCK_IDS.length,8);assert.equal(new Set(BED_BLOCK_IDS).size,8);
assert.deepEqual(BED_IDS.north,{foot:11,head:12,dx:0,dz:-1});assert.deepEqual(BED_IDS.east,{foot:17,head:18,dx:1,dz:0});
assert.equal(bedFacingFromLook({x:0,z:-1}),'north');assert.equal(bedFacingFromLook({x:0,z:1}),'south');assert.equal(bedFacingFromLook({x:-2,z:.2}),'west');assert.equal(bedFacingFromLook({x:2,z:.2}),'east');assert.equal(bedFacingFromLook(null),'north');

const north=bedPlacement({x:4.9,y:12,z:-2.1},{x:0,z:-1});
assert.deepEqual(north,{facing:'north',foot:{x:4,y:12,z:-3,id:11},head:{x:4,y:12,z:-4,id:12}});
assert.deepEqual(bedPartner(north.foot,north.foot.id),north.head);assert.deepEqual(bedPartner(north.head,north.head.id),north.foot);
assert.deepEqual(bedRespawnAnchor(north.foot,north.foot.id),{x:4.5,y:13.01,z:-2.5});assert.deepEqual(bedRespawnAnchor(north.head,north.head.id),{x:4.5,y:13.01,z:-2.5});
assert.equal(bedPlacement(null,{x:0,z:-1}),null);assert.equal(bedPartner({x:0,y:0,z:0},3),null);assert.equal(bedRespawnAnchor({x:0,y:0,z:0},3),null);

for(const id of BED_BLOCK_IDS){
  assert.equal(isBedBlock(id),true);const meta=bedBlockMeta(id);assert.ok(meta);assert.equal(BLOCKS[id].bed,true);assert.equal(BLOCKS[id].bedPart,meta.part);assert.equal(BLOCKS[id].bedFacing,meta.facing);assert.equal(BLOCKS[id].drops,'bed');assert.deepEqual(BLOCKS[id].tint,[255,118,118]);assert.equal(itemForBlock(id),'bed');
}
assert.equal(isBedBlock(10),false);assert.equal(bedBlockMeta(10),null);
assert.equal(ITEMS.bed.name,'床');assert.equal(ITEMS.bed.stack,1);assert.equal(ITEMS.bed.placeKind,'bed');assert.ok(ITEMS.bed.texture.startsWith('data:image/svg+xml'));

const grid=new CraftingGrid(3);grid.slots=[
  {id:'white_wool',count:1},{id:'white_wool',count:1},{id:'white_wool',count:1},
  {id:'block:5',count:1},{id:'block:5',count:1},{id:'block:5',count:1},
  null,null,null
];
assert.deepEqual(grid.refresh(),{id:'bed',count:1});assert.deepEqual(grid.consume(),{id:'bed',count:1});assert.ok(grid.slots.every(slot=>slot===null));
const grid2=new CraftingGrid(2);grid2.slots=[{id:'white_wool',count:1},{id:'white_wool',count:1},{id:'block:5',count:1},{id:'block:5',count:1}];assert.equal(grid2.refresh(),null);
assert.deepEqual(rollMobLoot('sheep',()=>0),[{id:'white_wool',count:1},{id:'raw_mutton',count:1}]);

console.log('bed placement and recipe rules: PASS');
