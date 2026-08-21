from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def replace_once(path,old,new):
    text=read(path);count=text.count(old)
    if count!=1: raise SystemExit(f'{path}: expected one anchor, found {count}: {old[:120]!r}')
    write(path,text.replace(old,new,1))

# Append-only farming block IDs. Existing FARMLAND=24 remains moisture 0.
replace_once('src/blocks.js',
"  FARMLAND:24,DIRT_PATH:25,STRIPPED_OAK_LOG:26,\n  COAL_ORE:27\n});",
"  FARMLAND:24,DIRT_PATH:25,STRIPPED_OAK_LOG:26,\n  COAL_ORE:27,\n  FARMLAND_MOISTURE_1:28,FARMLAND_MOISTURE_2:29,FARMLAND_MOISTURE_3:30,FARMLAND_MOISTURE_4:31,FARMLAND_MOISTURE_5:32,FARMLAND_MOISTURE_6:33,FARMLAND_MOISTURE_7:34,\n  WHEAT_AGE_0:35,WHEAT_AGE_1:36,WHEAT_AGE_2:37,WHEAT_AGE_3:38,WHEAT_AGE_4:39,WHEAT_AGE_5:40,WHEAT_AGE_6:41,WHEAT_AGE_7:42\n});")
replace_once('src/blocks.js',
"  27:{name:'煤矿石',solid:true,hardness:3,tiles:[15,15,15],drops:'coal',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'wood'}\n};\n\nfor(const id of BED_BLOCK_IDS){",
"  27:{name:'煤矿石',solid:true,hardness:3,tiles:[15,15,15],drops:'coal',requires:'pickaxe',effectiveTool:'pickaxe',minToolTier:'wood'}\n};\n\nBLOCKS[BLOCK.FARMLAND].farmlandMoisture=0;\nfor(let moisture=1;moisture<=7;moisture++){\n  const id=BLOCK[`FARMLAND_MOISTURE_${moisture}`];\n  BLOCKS[id]={name:`耕地（湿润度 ${moisture}）`,solid:true,hardness:.6,tiles:[2,2,2],drops:'block:2',effectiveTool:'shovel',fullCube:false,farmlandMoisture:moisture};\n}\nfor(let age=0;age<=7;age++){\n  const id=BLOCK[`WHEAT_AGE_${age}`];\n  BLOCKS[id]={name:age===7?'成熟小麦':`小麦（生长 ${age}/7）`,solid:false,transparent:true,hardness:.1,tiles:[0,0,0],drops:'wheat_seeds',fullCube:false,crop:'wheat',cropAge:age};\n}\n\nfor(const id of BED_BLOCK_IDS){")

# Canonical wheat items; starter slots stay stable.
replace_once('src/items.js',
"  bread:textured('面包',64,'item.bread',{food:{nutrition:5,saturationModifier:.6}}),",
"  bread:textured('面包',64,'item.bread',{food:{nutrition:5,saturationModifier:.6}}),\n  wheat_seeds:textured('小麦种子',64,'item.wheat_seeds',{plantKind:'wheat'}),\n  wheat:textured('小麦',64,'item.wheat'),")
replace_once('src/asset-manifest.js',
"  'item.bread':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/bread.png`,{minecraftVersion:'1.20.1',directCanonical:true}),",
"  'item.bread':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/bread.png`,{minecraftVersion:'1.20.1',directCanonical:true}),\n  'item.wheat_seeds':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/wheat_seeds.png`,{minecraftVersion:'1.20.1',directCanonical:true}),\n  'item.wheat':supplied('item-texture',`${CANONICAL_ITEM_ROOT}/wheat.png`,{minecraftVersion:'1.20.1',directCanonical:true}),")

# Wheat -> bread, Workbench-only as in Java because the row is width 3.
replace_once('src/recipes.js',
"  {id:'furnace',kind:'shaped',pattern:[['block:10','block:10','block:10'],['block:10',null,'block:10'],['block:10','block:10','block:10']],result:{id:'block:21',count:1},minSize:3}",
"  {id:'furnace',kind:'shaped',pattern:[['block:10','block:10','block:10'],['block:10',null,'block:10'],['block:10','block:10','block:10']],result:{id:'block:21',count:1},minSize:3},\n  {id:'bread',kind:'shaped',pattern:[['wheat','wheat','wheat']],result:{id:'bread',count:1},minSize:3}")

# Opt all encoded farmland/wheat states into the generic canonical model interpreter.
replace_once('src/minecraft-model-registry.js',
"  [BLOCK.FURNACE]:descriptor('minecraft:furnace',{state:{facing:'north',lit:'false'}})\n});",
"  [BLOCK.FURNACE]:descriptor('minecraft:furnace',{state:{facing:'north',lit:'false'}}),\n  [BLOCK.FARMLAND]:descriptor('minecraft:farmland',{state:{moisture:'0'}}),\n  [BLOCK.FARMLAND_MOISTURE_1]:descriptor('minecraft:farmland',{state:{moisture:'1'}}),\n  [BLOCK.FARMLAND_MOISTURE_2]:descriptor('minecraft:farmland',{state:{moisture:'2'}}),\n  [BLOCK.FARMLAND_MOISTURE_3]:descriptor('minecraft:farmland',{state:{moisture:'3'}}),\n  [BLOCK.FARMLAND_MOISTURE_4]:descriptor('minecraft:farmland',{state:{moisture:'4'}}),\n  [BLOCK.FARMLAND_MOISTURE_5]:descriptor('minecraft:farmland',{state:{moisture:'5'}}),\n  [BLOCK.FARMLAND_MOISTURE_6]:descriptor('minecraft:farmland',{state:{moisture:'6'}}),\n  [BLOCK.FARMLAND_MOISTURE_7]:descriptor('minecraft:farmland',{state:{moisture:'7'}}),\n  [BLOCK.WHEAT_AGE_0]:descriptor('minecraft:wheat',{state:{age:'0'},renderLayer:'cutout'}),\n  [BLOCK.WHEAT_AGE_1]:descriptor('minecraft:wheat',{state:{age:'1'},renderLayer:'cutout'}),\n  [BLOCK.WHEAT_AGE_2]:descriptor('minecraft:wheat',{state:{age:'2'},renderLayer:'cutout'}),\n  [BLOCK.WHEAT_AGE_3]:descriptor('minecraft:wheat',{state:{age:'3'},renderLayer:'cutout'}),\n  [BLOCK.WHEAT_AGE_4]:descriptor('minecraft:wheat',{state:{age:'4'},renderLayer:'cutout'}),\n  [BLOCK.WHEAT_AGE_5]:descriptor('minecraft:wheat',{state:{age:'5'},renderLayer:'cutout'}),\n  [BLOCK.WHEAT_AGE_6]:descriptor('minecraft:wheat',{state:{age:'6'},renderLayer:'cutout'}),\n  [BLOCK.WHEAT_AGE_7]:descriptor('minecraft:wheat',{state:{age:'7'},renderLayer:'cutout'})\n});")
replace_once('tools/minecraft_model_acceptance.py',
'    "minecraft:furnace",\n)',
'    "minecraft:furnace",\n    "minecraft:farmland",\n    "minecraft:wheat",\n)')

# Make mining drops extensible without changing the default one-drop contract.
replace_once('src/singleplayer-mining-controller.js',
"  constructor({aim,getMode,getSelectedStack,breakTarget,spawnDrop,damageSelected,onProgress=()=>{},onHit=()=>{},onBreak=()=>{}}={}){\n    this.aim=callback(aim,'aim');this.getMode=callback(getMode,'getMode');this.getSelectedStack=callback(getSelectedStack,'getSelectedStack');this.breakTarget=callback(breakTarget,'breakTarget');this.spawnDrop=callback(spawnDrop,'spawnDrop');this.damageSelected=callback(damageSelected,'damageSelected');this.onProgress=callback(onProgress,'onProgress');this.onHit=callback(onHit,'onHit');this.onBreak=callback(onBreak,'onBreak');",
"  constructor({aim,getMode,getSelectedStack,breakTarget,spawnDrop,damageSelected,resolveDrops=null,onProgress=()=>{},onHit=()=>{},onBreak=()=>{}}={}){\n    this.aim=callback(aim,'aim');this.getMode=callback(getMode,'getMode');this.getSelectedStack=callback(getSelectedStack,'getSelectedStack');this.breakTarget=callback(breakTarget,'breakTarget');this.spawnDrop=callback(spawnDrop,'spawnDrop');this.damageSelected=callback(damageSelected,'damageSelected');this.resolveDrops=resolveDrops===null?(({block})=>block?.drops?[{id:block.drops,count:1}]:[]):callback(resolveDrops,'resolveDrops');this.onProgress=callback(onProgress,'onProgress');this.onHit=callback(onHit,'onHit');this.onBreak=callback(onBreak,'onBreak');")
replace_once('src/singleplayer-mining-controller.js',
"      if(mode!=='creative'&&canHarvestBlock(broken.id,selectedId)&&block?.drops){this.spawnDrop({id:block.drops,count:1},broken);harvested=true;}",
"      if(mode!=='creative'&&canHarvestBlock(broken.id,selectedId)){const resolved=this.resolveDrops({target:broken,block,selected:selected?{...selected}:null});if(!Array.isArray(resolved))throw new TypeError('resolveDrops must return an array');for(const stack of resolved){if(!stack||typeof stack.id!=='string'||!Number.isInteger(stack.count)||stack.count<1)throw new TypeError('resolved mining drops must contain string id and positive integer count');this.spawnDrop({id:stack.id,count:stack.count},broken);}harvested=resolved.length>0;}")

# Browser integration: farming runtime owns only singleplayer crop timing/state.
replace_once('src/main.js',
"import {SingleplayerFurnaceRuntime} from './singleplayer-furnace-runtime.js';",
"import {SingleplayerFurnaceRuntime} from './singleplayer-furnace-runtime.js';\nimport {SingleplayerFarmingRuntime} from './singleplayer-farming-runtime.js';")
replace_once('src/main.js',
"let deviceProfile=detectDeviceProfile(),desktopControls=null,mobileControls=null,gameplayRuntime=null,singleplayerFurnace=null;",
"let deviceProfile=detectDeviceProfile(),desktopControls=null,mobileControls=null,gameplayRuntime=null,singleplayerFurnace=null,singleplayerFarming=null;")
replace_once('src/main.js',
"  spawnDrop:(stack,broken)=>drops?.spawnStack(stack,new THREE.Vector3(broken.x+.5,broken.y+.6,broken.z+.5)),\n  damageSelected:",
"  spawnDrop:(stack,broken)=>drops?.spawnStack(stack,new THREE.Vector3(broken.x+.5,broken.y+.6,broken.z+.5)),\n  resolveDrops:({target,block})=>singleplayerFarming?.dropsForBlock(target.id,block?.drops)??(block?.drops?[{id:block.drops,count:1}]:[]),\n  damageSelected:")
replace_once('src/main.js',
"function prepareSingleplayerMiningTarget(blockId=3){if(!e2eEnabled||sessionKind!=='singleplayer'||!world||!player||!BLOCKS[blockId])return null;player.spawn(Math.floor(player.position.x),Math.floor(player.position.z));player.setLook(0,0);const origin=player.eyePosition(new THREE.Vector3()),x=Math.floor(origin.x),y=Math.floor(origin.y),baseZ=Math.floor(origin.z);for(let offset=1;offset<=6;offset++)world.setBlock(x,y,baseZ-offset,0);const z=baseZ-1;if(!world.setBlock(x,y,z,blockId))return null;selectedTarget=null;singleplayerMining.cancel();return{x,y,z,id:blockId};}\nif(e2eEnabled)Object.defineProperty(globalThis,'__minecraftE2E'",
"function prepareSingleplayerMiningTarget(blockId=3){if(!e2eEnabled||sessionKind!=='singleplayer'||!world||!player||!BLOCKS[blockId])return null;player.spawn(Math.floor(player.position.x),Math.floor(player.position.z));player.setLook(0,0);const origin=player.eyePosition(new THREE.Vector3()),x=Math.floor(origin.x),y=Math.floor(origin.y),baseZ=Math.floor(origin.z);for(let offset=1;offset<=6;offset++)world.setBlock(x,y,baseZ-offset,0);const z=baseZ-1;if(!world.setBlock(x,y,z,blockId))return null;selectedTarget=null;singleplayerMining.cancel();return{x,y,z,id:blockId};}\nfunction prepareSingleplayerFarmingPlot(){if(!e2eEnabled||sessionKind!=='singleplayer'||!world||!player||!singleplayerFarming)return null;const x=Math.floor(player.position.x),z=Math.floor(player.position.z),y=Math.max(1,Math.floor(player.position.y)-1);world.setBlock(x,y,z,BLOCK.FARMLAND);world.setBlock(x,y+1,z,BLOCK.AIR);return{x,y,z};}\nif(e2eEnabled)Object.defineProperty(globalThis,'__minecraftE2E'")
replace_once('src/main.js',
"experienceTotal:()=>totalXp,playerVitals:",
"experienceTotal:()=>totalXp,farming:()=>singleplayerFarming?.snapshot()||null,farmingTick:()=>singleplayerFarming?.tickNow(()=>0)||false,prepareSingleplayerFarmingPlot,plantWheatAt:(x,y,z)=>singleplayerFarming?.plantWheat({x,y,z,id:world?.getBlock(x,y,z)})||false,worldBlock:(x,y,z)=>world?.getBlock(x,y,z)??null,playerVitals:")
replace_once('src/main.js',
"running=false;clearPlayerInput();const movement=multiplayerMovement;multiplayerMovement=null;multiplayerStarting=false;singleplayerFurnace?.dispose();singleplayerFurnace=null;sessionKind=null;",
"running=false;clearPlayerInput();const movement=multiplayerMovement;multiplayerMovement=null;multiplayerStarting=false;singleplayerFarming?.dispose();singleplayerFarming=null;singleplayerFurnace?.dispose();singleplayerFurnace=null;sessionKind=null;")
replace_once('src/main.js',
"weather,onWorldEdit:markSaveDirty,onWorldProgress:",
"weather,onWorldEdit:event=>{markSaveDirty();singleplayerFarming?.observeEdit(event);},onWorldProgress:")
replace_once('src/main.js',
"  singleplayerFurnace=new SingleplayerFurnaceRuntime({world,inventory,getMode:()=>player?.mode||'spectator',onChanged:markSaveDirty,onExperience:addExperience,onDrop:(stack,target)=>drops?.spawnStack(stack,new THREE.Vector3(target.x+.5,target.y+.6,target.z+.5))});const furnaceRestore=singleplayerFurnace.restore(saved?.furnaces);",
"  singleplayerFurnace=new SingleplayerFurnaceRuntime({world,inventory,getMode:()=>player?.mode||'spectator',onChanged:markSaveDirty,onExperience:addExperience,onDrop:(stack,target)=>drops?.spawnStack(stack,new THREE.Vector3(target.x+.5,target.y+.6,target.z+.5))});const furnaceRestore=singleplayerFurnace.restore(saved?.furnaces);\n  singleplayerFarming=new SingleplayerFarmingRuntime({world,getWeather:()=>weather,onChanged:markSaveDirty,onDrop:(stack,target)=>drops?.spawnStack(stack,new THREE.Vector3(target.x+.5,target.y+.35,target.z+.5))});")
replace_once('src/main.js',
"const selected=ui.selectedItem(),def=ITEMS[selected?.id];if(player.mode==='survival'&&def?.food){const eaten=player.eat(def.food);if(!eaten.consumed){ui.showToast('饥饿值已满');return;}ui.consumeSelected(1);markSaveDirty();renderPlayerStatus();ui.showToast(`食用 ${def.name}`);return;}if(player.mode==='spectator'||player.mode==='adventure'||!hit)return;",
"const selected=ui.selectedItem(),def=ITEMS[selected?.id];if(player.mode==='survival'&&def?.food){const eaten=player.eat(def.food);if(!eaten.consumed){ui.showToast('饥饿值已满');return;}ui.consumeSelected(1);markSaveDirty();renderPlayerStatus();ui.showToast(`食用 ${def.name}`);return;}if(player.mode!=='spectator'&&player.mode!=='adventure'&&def?.plantKind==='wheat'){if(!hit||!singleplayerFarming?.plantWheat(hit)){ui.showToast('小麦种子只能种在上方为空的耕地上');return;}if(player.mode!=='creative')ui.consumeSelected(1);markSaveDirty();ui.showToast('种植 小麦');return;}if(player.mode==='spectator'||player.mode==='adventure'||!hit)return;")
replace_once('src/main.js',
"singleplayerFurnace?.update(dt);drops?.update(dt,player);",
"singleplayerFurnace?.update(dt);singleplayerFarming?.update(dt);drops?.update(dt,player);")

# Asset manifest audit covers new direct-canonical item bindings.
replace_once('scripts/check-asset-manifest.mjs',
"'item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots','item.coal','item.apple','item.bread','item.cooked_beef'",
"'item.iron_helmet','item.iron_chestplate','item.iron_leggings','item.iron_boots','item.coal','item.apple','item.bread','item.wheat_seeds','item.wheat','item.cooked_beef'")
replace_once('scripts/check-asset-manifest.mjs',
"'item.coal','item.apple','item.bread','item.cooked_beef'",
"'item.coal','item.apple','item.bread','item.wheat_seeds','item.wheat','item.cooked_beef'")
replace_once('scripts/check-asset-manifest.mjs',
"(?:wooden_sword|stone_sword|bow|iron_hoe|iron_helmet|iron_chestplate|iron_leggings|iron_boots|coal|apple|bread|cooked_beef|cooked_mutton|cooked_porkchop|cooked_chicken)",
"(?:wooden_sword|stone_sword|bow|iron_hoe|iron_helmet|iron_chestplate|iron_leggings|iron_boots|coal|apple|bread|wheat_seeds|wheat|cooked_beef|cooked_mutton|cooked_porkchop|cooked_chicken)")
replace_once('scripts/check-asset-manifest.mjs',
"'iron_boots','coal','apple','bread','cooked_beef'",
"'iron_boots','coal','apple','bread','wheat_seeds','wheat','cooked_beef'")
replace_once('scripts/check-asset-manifest.mjs',
"for(const itemId of ['apple','bread','cooked_beef','cooked_mutton','cooked_porkchop','cooked_chicken'])",
"for(const itemId of ['apple','bread','wheat_seeds','wheat','cooked_beef','cooked_mutton','cooked_porkchop','cooked_chicken'])")
replace_once('scripts/check-asset-manifest.mjs',
"'item.coal','item.apple','item.bread','item.cooked_beef'",
"'item.coal','item.apple','item.bread','item.wheat_seeds','item.wheat','item.cooked_beef'")

# Runtime provenance should explicitly include the new farming model roots.
replace_once('scripts/check-minecraft-runtime-assets.mjs',
"'blockstates/furnace.json','models/block/furnace.json','models/block/furnace_on.json','models/block/orientable.json','models/block/orientable_with_bottom.json'",
"'blockstates/furnace.json','models/block/furnace.json','models/block/furnace_on.json','models/block/orientable.json','models/block/orientable_with_bottom.json',\n  'blockstates/farmland.json','models/block/farmland.json','models/block/farmland_moist.json','blockstates/wheat.json','models/block/wheat_stage0.json','models/block/wheat_stage7.json'")

print('farming phase 1 integration patch applied')
