import {ATLAS_COLS,ATLAS_ROWS} from './blocks.js';

function text(value){return value===null||value===undefined?'':String(value);}

export class JadeHud{
  constructor(root=document.querySelector('#jade-hud')){
    this.root=root;this.icon=root?.querySelector('.jade-icon')||null;this.name=root?.querySelector('.jade-name')||null;this.source=root?.querySelector('.jade-source')||null;this.details=root?.querySelector('.jade-details')||null;this.health=root?.querySelector('.jade-health-fill')||null;this.healthText=root?.querySelector('.jade-health-text')||null;this.lastKey='';this.hide();
  }

  hide(){if(this.root)this.root.classList.add('hidden');this.lastKey='';}

  render(info){
    if(!this.root)return;if(!info){this.hide();return;}
    const key=JSON.stringify(info);if(key===this.lastKey)return;this.lastKey=key;this.root.classList.remove('hidden');this.root.dataset.kind=info.kind;this.name.textContent=text(info.name);this.source.textContent=text(info.source||'Minecraft Web By AI');this.details.textContent='';this.icon.textContent='';this.icon.removeAttribute('style');
    this.root.classList.toggle('jade-entity',info.kind==='entity');this.root.classList.toggle('jade-block',info.kind==='block');
    if(info.kind==='block')this.renderBlock(info);else if(info.kind==='entity')this.renderEntity(info);
  }

  renderBlock(info){
    this.health?.parentElement?.classList.add('hidden');
    if(Number.isFinite(info.tile)){
      const tileSize=58;this.icon.className='jade-icon jade-block-icon';const tx=info.tile%ATLAS_COLS,ty=Math.floor(info.tile/ATLAS_COLS);this.icon.style.backgroundSize=`${ATLAS_COLS*tileSize}px ${ATLAS_ROWS*tileSize}px`;this.icon.style.backgroundPosition=`-${tx*tileSize}px -${ty*tileSize}px`;
    }else this.icon.className='jade-icon';
    const rows=[];
    rows.push(`工具：${info.requiredToolName}${info.requiredTool&&!info.toolCorrect?'（当前不匹配）':''}`);
    if(info.liquid)rows.push('掉落：不可直接采集');
    else if(!info.hasDrop)rows.push('掉落：无');
    else rows.push(`掉落：${info.canDrop?'是':'否'}${info.dropName?` · ${info.dropName}`:''}`);
    if(Number.isFinite(info.hardness))rows.push(`硬度：${info.hardness}`);
    for(const value of rows){const row=document.createElement('div');row.className='jade-detail-row';row.textContent=value;this.details.append(row);}
  }

  renderEntity(info){
    this.icon.className='jade-icon jade-entity-icon';this.icon.textContent=info.hostile?'!':'♥';
    const wrap=this.health?.parentElement;if(wrap)wrap.classList.remove('hidden');if(this.health)this.health.style.width=`${Math.round(info.healthRatio*100)}%`;if(this.healthText)this.healthText.textContent=`${info.hp.toFixed(1).replace(/\.0$/,'')} / ${info.maxHp.toFixed(1).replace(/\.0$/,'')}`;
    const row=document.createElement('div');row.className='jade-detail-row';row.textContent=info.hostile?'敌对生物':'被动生物';this.details.append(row);
  }
}
