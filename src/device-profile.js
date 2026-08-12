const MOBILE_UA=/(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile)/i;

export function classifyDevice({ua='',uaDataMobile=false,maxTouchPoints=0,coarse=false,hoverNone=false,width=0,height=0}={}){
  const w=Math.max(0,Number(width)||0),h=Math.max(0,Number(height)||0),min=Math.min(w,h),max=Math.max(w,h);
  const uaMobile=MOBILE_UA.test(String(ua));
  const touchFirst=Number(maxTouchPoints)>0&&!!coarse&&!!hoverNone;
  const compact=min>0&&min<=1024&&max<=1800;
  const mobile=!!uaDataMobile||uaMobile||(touchFirst&&compact);
  return{kind:mobile?'mobile':'desktop',mobile,touch:Number(maxTouchPoints)>0,coarse:!!coarse,orientation:w>=h?'landscape':'portrait',width:w,height:h};
}

export function detectDeviceProfile(win=globalThis.window){
  if(!win)return classifyDevice();
  const nav=win.navigator||{},coarse=!!win.matchMedia?.('(pointer: coarse)').matches,hoverNone=!!win.matchMedia?.('(hover: none)').matches;
  return classifyDevice({ua:nav.userAgent||'',uaDataMobile:!!nav.userAgentData?.mobile,maxTouchPoints:nav.maxTouchPoints||0,coarse,hoverNone,width:win.innerWidth||0,height:win.innerHeight||0});
}

export function applyDeviceProfile(profile,root=globalThis.document?.body){
  if(!root||!profile)return profile;
  root.dataset.device=profile.kind;root.dataset.orientation=profile.orientation;root.classList.toggle('mobile-device',profile.mobile);return profile;
}

export function watchDeviceProfile(callback,{win=globalThis.window,root=globalThis.document?.body}={}){
  if(!win)return()=>{};
  const emit=()=>{const profile=applyDeviceProfile(detectDeviceProfile(win),root);callback?.(profile);return profile;};
  const coarse=win.matchMedia?.('(pointer: coarse)'),hover=win.matchMedia?.('(hover: none)');
  win.addEventListener('resize',emit,{passive:true});win.addEventListener('orientationchange',emit,{passive:true});coarse?.addEventListener?.('change',emit);hover?.addEventListener?.('change',emit);emit();
  return()=>{win.removeEventListener('resize',emit);win.removeEventListener('orientationchange',emit);coarse?.removeEventListener?.('change',emit);hover?.removeEventListener?.('change',emit);};
}
