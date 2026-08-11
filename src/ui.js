import {ATLAS_COLS,ATLAS_ROWS} from './blocks.js';
import {ITEMS,maxStack} from './items.js';
import {CraftingGrid} from './recipes.js';
import {EQUIPMENT_SLOTS} from './equipment.js';

export class UI{
  constructor(){
    this.main=document.querySelector('#main-menu');this.worldMenu=document.querySelector('#world-menu');this.pause=document.querySelector('#pause-menu');
    this.hud=document.querySelector('#hud');this.inventory=document.querySelector('#inventory');this.workbench=document.querySelector('#workbench');this.loading=document.querySelector('#loading');
    this.hotbar=document.querySelector('#hotbar');this.invGrid=document.querySelector('#inventory-grid');this.invHotbar=document.querySelector('#inventory-hotbar');this.equipmentSlots=document.querySelector('#equipment-slots');
    this.workbenchGrid=document.querySelector('#workbench-grid');this.workbenchHotbar=document.querySelector('#workbench-hotbar');
    this.craftGrid2=document.querySelector('#craft-grid-2');this.craftResult2=document.querySelector('#craft-result-2');this.craftGrid3=document.querySelector('#craft-grid-3');this.craftResult3=document.querySelector('#craft-result-3');
    this.cursorStack=document.querySelector('#cursor-stack');this.hearts=document.querySelector('#hearts');this.hunger=document.querySelector('#hunger');this.armorRow=document.querySelector('#armor-row');this.xp=document.querySelector('#xp-bar');this.level=document.querySelector('#xp-level');
    this.debug=document.querySelector('#debug');this.toast=document.querySelector('#toast');this.breakMeter=document.querySelector('#break-meter');this.loadingBar=document.querySelector('#loading-bar');this.loadingDetail=document.querySelector('#loading-detail');
    this.chatLog=document.querySelector('#chat-log');this.chatWrap=document.querySelector('#chat-input-wrap');this.chatInput=document.querySelector('#chat-input');
    this.selected=0;this.inventoryModel=null;this.equipmentModel=null;this.craft2=new CraftingGrid(2);this.craft3=new CraftingGrid(3);this.onChanged=()=>{};this.onOverflow=()=>{};
    this.renderStatus(20,20,0,0,0);this.bindSlotEvents();this.renderHotbar();
  }

  showScreen(el){for(const s of document.querySelectorAll('.screen'))s.classList.remove('active');if(el)el.classList.add('active');}

  bindInventory(model,{equipment=null,onChanged=()=>{},onOverflow=()=>{}}={}){
    this.inventoryModel=model;this.equipmentModel=equipment;this.onChanged=onChanged;this.onOverflow=onOverflow;this.refreshInventory();
  }

  bindSlotEvents(){
    document.addEventListener('pointerdown',e=>{
      const slot=e.target.closest('[data-inv-index],[data-equipment-slot],[data-craft-index],[data-craft-result]');
      if(!slot||!this.inventoryModel)return;
      if(e.button!==0&&e.button!==2)return;
      e.preventDefault();
      if(slot.dataset.invIndex!==undefined){
        const changed=this.inventoryModel.click(Number(slot.dataset.invIndex),e.button,e.shiftKey);
        if(changed)this.changed();
      }else if(slot.dataset.equipmentSlot!==undefined){
        const changed=this.equipmentModel?.click(slot.dataset.equipmentSlot,this.inventoryModel,e.button)||false;
        if(changed)this.changed();
      }else if(slot.dataset.craftIndex!==undefined){
        const grid=slot.dataset.craftSize==='3'?this.craft3:this.craft2;
        if(e.shiftKey){
          const index=Number(slot.dataset.craftIndex),item=grid.slots[index];
          if(item){const before=item.count,left=this.inventoryModel.add(item.id,before),moved=before-left;if(moved>0){if(left>0)item.count=left;else grid.slots[index]=null;grid.refresh();this.changed();}}
        }else if(this.clickCraftInput(grid,Number(slot.dataset.craftIndex),e.button))this.changed();
      }else if(slot.dataset.craftResult!==undefined){
        const grid=slot.dataset.craftResult==='3'?this.craft3:this.craft2;
        if(this.takeCraftResult(grid,e.shiftKey))this.changed();
      }
    });
    document.addEventListener('contextmenu',e=>{if(e.target.closest('.inventory-panel'))e.preventDefault();});
    document.addEventListener('pointermove',e=>{this.cursorStack.style.transform=`translate(${e.clientX+10}px,${e.clientY+10}px)`;});
  }

  clickCraftInput(grid,index,button){
    const slot=grid.slots[index],cursor=this.inventoryModel.cursor;
    if(button===0){
      if(!cursor&&slot){this.inventoryModel.cursor=slot;grid.slots[index]=null;grid.refresh();return true;}
      if(cursor&&!slot){grid.slots[index]=cursor;this.inventoryModel.cursor=null;grid.refresh();return true;}
      if(cursor&&slot&&cursor.id===slot.id){const moved=Math.min(cursor.count,maxStack(slot.id)-slot.count);if(!moved)return false;slot.count+=moved;cursor.count-=moved;if(cursor.count<=0)this.inventoryModel.cursor=null;grid.refresh();return true;}
      if(cursor&&slot){grid.slots[index]=cursor;this.inventoryModel.cursor=slot;grid.refresh();return true;}
    }
    if(button===2){
      if(!cursor&&slot){const take=Math.ceil(slot.count/2);this.inventoryModel.cursor={id:slot.id,count:take};slot.count-=take;if(slot.count<=0)grid.slots[index]=null;grid.refresh();return true;}
      if(cursor&&!slot){grid.slots[index]={id:cursor.id,count:1};cursor.count--;if(cursor.count<=0)this.inventoryModel.cursor=null;grid.refresh();return true;}
      if(cursor&&slot&&cursor.id===slot.id&&slot.count<maxStack(slot.id)){slot.count++;cursor.count--;if(cursor.count<=0)this.inventoryModel.cursor=null;grid.refresh();return true;}
    }
    return false;
  }

  takeCraftResult(grid,shift){
    const result=grid.refresh();if(!result)return false;
    if(shift){
      let crafted=false,safety=64;
      while(safety--&&grid.refresh()){
        const r=grid.match.recipe.result;if(this.inventoryModel.capacityFor(r.id)<r.count)break;
        const out=grid.consume();this.inventoryModel.add(out.id,out.count);crafted=true;
      }
      return crafted;
    }
    const cursor=this.inventoryModel.cursor,limit=maxStack(result.id);
    if(cursor&&(cursor.id!==result.id||cursor.count+result.count>limit))return false;
    const out=grid.consume();
    if(!out)return false;
    if(cursor)cursor.count+=out.count;else this.inventoryModel.cursor={...out};
    return true;
  }

  changed(){this.onChanged();this.refreshInventory();}

  makeIcon(itemId){
    const def=ITEMS[itemId];if(!def)return document.createElement('span');
    if(Number.isFinite(def.tile)){
      const d=document.createElement('div');d.className='slot-swatch';const tx=def.tile%ATLAS_COLS,ty=Math.floor(def.tile/ATLAS_COLS);
      d.style.backgroundSize=`${ATLAS_COLS*32}px ${ATLAS_ROWS*32}px`;d.style.backgroundPosition=`-${tx*32}px -${ty*32}px`;return d;
    }
    const img=document.createElement('img');img.className='item-icon';img.src=def.texture;img.alt=def.name;return img;
  }

  makeSlot(stack,{key=null,index=null,equipmentSlot=null,craftIndex=null,craftSize=null,result=null,hud=false}={}){
    const s=document.createElement(hud?'div':'button');s.className=hud?'inv-slot hotbar-slot':'inv-slot';if(equipmentSlot!==null)s.classList.add('equipment-slot');if(s.tagName==='BUTTON')s.type='button';
    if(index!==null)s.dataset.invIndex=index;
    if(equipmentSlot!==null)s.dataset.equipmentSlot=equipmentSlot;
    if(craftIndex!==null){s.dataset.craftIndex=craftIndex;s.dataset.craftSize=craftSize;}
    if(result!==null)s.dataset.craftResult=result;
    if(stack){s.append(this.makeIcon(stack.id));const c=document.createElement('span');c.className='slot-count';if(stack.count>1)c.textContent=stack.count;s.append(c);s.title=ITEMS[stack.id]?.name||stack.id;}
    if(key){const k=document.createElement('span');k.className='slot-key';k.textContent=key;s.append(k);}
    return s;
  }

  refreshInventory(){this.renderHotbar();this.renderInventoryPanels();this.renderEquipment();this.renderCrafting();this.renderCursor();}

  renderHotbar(){
    this.hotbar.textContent='';
    for(let i=0;i<9;i++){
      const stack=this.inventoryModel?.hotbar(i)||null,s=this.makeSlot(stack,{key:String(i+1),hud:true});if(i===this.selected)s.classList.add('selected');this.hotbar.append(s);
    }
  }

  renderInventoryPanels(){
    const build=(main,hot)=>{
      main.textContent='';hot.textContent='';
      for(let i=0;i<27;i++)main.append(this.makeSlot(this.inventoryModel?.slots[i],{index:i}));
      for(let i=27;i<36;i++)hot.append(this.makeSlot(this.inventoryModel?.slots[i],{index:i}));
    };
    build(this.invGrid,this.invHotbar);build(this.workbenchGrid,this.workbenchHotbar);
  }

  renderEquipment(){
    if(!this.equipmentSlots)return;this.equipmentSlots.textContent='';
    for(const slot of EQUIPMENT_SLOTS)this.equipmentSlots.append(this.makeSlot(this.equipmentModel?.get(slot)||null,{equipmentSlot:slot}));
  }

  renderCrafting(){
    const build=(grid,container,resultEl,size)=>{
      container.textContent='';grid.slots.forEach((stack,i)=>container.append(this.makeSlot(stack,{craftIndex:i,craftSize:String(size)})));
      resultEl.textContent='';const r=grid.refresh();resultEl.append(this.makeSlot(r,{result:String(size)}));
    };
    build(this.craft2,this.craftGrid2,this.craftResult2,2);build(this.craft3,this.craftGrid3,this.craftResult3,3);
  }

  renderCursor(){
    this.cursorStack.textContent='';const cursor=this.inventoryModel?.cursor;
    this.cursorStack.classList.toggle('hidden',!cursor);if(cursor)this.cursorStack.append(this.makeSlot(cursor,{hud:true}));
  }

  select(i){this.selected=(i+9)%9;this.renderHotbar();const stack=this.selectedItem();if(stack)this.showToast(ITEMS[stack.id]?.name||stack.id);}
  selectedItem(){return this.inventoryModel?.hotbar(this.selected)||null;}
  consumeSelected(count=1){if(!this.inventoryModel)return null;const result=this.inventoryModel.removeAt(27+this.selected,count);if(result)this.changed();return result;}

  hasOpenPanel(){return !this.inventory.classList.contains('hidden')||!this.workbench.classList.contains('hidden');}
  openInventory(){this.workbench.classList.add('hidden');this.inventory.classList.remove('hidden');this.refreshInventory();}
  openWorkbench(){this.inventory.classList.add('hidden');this.workbench.classList.remove('hidden');this.refreshInventory();}
  closePanels(){
    if(!this.inventoryModel)return[];
    const overflow=[...this.craft2.clearTo(this.inventoryModel),...this.craft3.clearTo(this.inventoryModel)];
    const cursorOverflow=this.inventoryModel.returnCursor();if(cursorOverflow)overflow.push(cursorOverflow);
    this.inventory.classList.add('hidden');this.workbench.classList.add('hidden');this.changed();if(overflow.length)this.onOverflow(overflow);return overflow;
  }

  openChat(prefix=''){
    this.chatWrap.classList.remove('hidden');this.chatInput.value=prefix;this.chatInput.focus();requestAnimationFrame(()=>this.chatInput.setSelectionRange(this.chatInput.value.length,this.chatInput.value.length));
  }
  closeChat(){this.chatWrap.classList.add('hidden');this.chatInput.blur();}
  isChatOpen(){return !this.chatWrap.classList.contains('hidden');}
  chatMessage(text,type='system'){
    const line=document.createElement('div');line.className=`chat-line ${type}`;line.textContent=text;this.chatLog.append(line);while(this.chatLog.children.length>8)this.chatLog.firstChild.remove();
    clearTimeout(line._timer);line._timer=setTimeout(()=>line.classList.add('faded'),9000);
  }

  renderStatus(hp,hunger,xp,level,armorPoints=0){
    this.hearts.textContent='';this.hunger.textContent='';this.armorRow.textContent='';
    for(let i=0;i<10;i++){
      const h=document.createElement('i');h.className='heart'+(hp>=i*2+1?'':' empty');this.hearts.append(h);
      const f=document.createElement('i');f.className='food'+(hunger>=i*2+1?'':' empty');this.hunger.append(f);
      const a=document.createElement('i'),remaining=armorPoints-i*2;a.className='armor-icon'+(remaining>=2?' full':remaining>=1?' half':'');this.armorRow.append(a);
    }
    this.xp.style.width=`${Math.max(0,Math.min(100,xp))}%`;this.level.textContent=level;
  }

  showLoading(show,detail='准备区块',p=0){this.loading.classList.toggle('hidden',!show);this.loadingDetail.textContent=detail;this.loadingBar.style.width=`${p}%`;}
  showToast(text){this.toast.textContent=text;this.toast.classList.remove('hidden');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toast.classList.add('hidden'),900);}
  setBreak(p){this.breakMeter.classList.toggle('hidden',p<=0||p>=1);this.breakMeter.querySelector('span').style.width=`${p*100}%`;}
}