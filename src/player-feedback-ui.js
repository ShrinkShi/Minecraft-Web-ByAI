function ensureFeedbackNodes(){
  let hurt=document.querySelector('.hurt-vignette');if(!hurt){hurt=document.createElement('div');hurt.className='hurt-vignette';hurt.setAttribute('aria-hidden','true');document.querySelector('#app')?.append(hurt);}
  let sleep=document.querySelector('.sleep-overlay');if(!sleep){sleep=document.createElement('div');sleep.className='sleep-overlay';sleep.setAttribute('aria-hidden','true');sleep.innerHTML='<span>正在睡觉…</span>';document.querySelector('#app')?.append(sleep);}
  return{hurt,sleep,sleepText:sleep.querySelector('span')};
}
function retriggerClass(node,name,duration){
  if(!node)return;node.classList.remove(name);void node.offsetWidth;node.classList.add(name);clearTimeout(node[`_${name}Timer`]);node[`_${name}Timer`]=setTimeout(()=>node.classList.remove(name),duration);
}

export function installPlayerFeedbackUi(){
  const nodes=ensureFeedbackNodes(),status=document.querySelector('.status-stack');let lastHurt=null,lastSleep=null;
  const onHurt=event=>{lastHurt=event?.detail?{...event.detail}:{};retriggerClass(nodes.hurt,'active',330);retriggerClass(status,'hurt-shake',240);};
  const onSleep=event=>{
    const detail=event?.detail||{},active=!!detail.active;lastSleep={...detail,active};nodes.sleep.classList.toggle('active',active);if(nodes.sleepText)nodes.sleepText.textContent=detail.message||'正在睡觉…';
  };
  globalThis.addEventListener?.('minecraft-player-hurt',onHurt);globalThis.addEventListener?.('minecraft-player-sleep',onSleep);
  return{
    dispose(){globalThis.removeEventListener?.('minecraft-player-hurt',onHurt);globalThis.removeEventListener?.('minecraft-player-sleep',onSleep);nodes.hurt.remove();nodes.sleep.remove();},
    snapshot:()=>Object.freeze({hurtActive:nodes.hurt.classList.contains('active'),hudShaking:status?.classList.contains('hurt-shake')||false,sleepActive:nodes.sleep.classList.contains('active'),lastHurt:lastHurt?Object.freeze({...lastHurt}):null,lastSleep:lastSleep?Object.freeze({...lastSleep}):null})
  };
}
