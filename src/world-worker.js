const CHUNK=16, H=64;
let seed=1, prompt='';
function hashString(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function hash2(x,z){let h=Math.imul(x,374761393)^Math.imul(z,668265263)^seed;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967295}
function smooth(t){return t*t*(3-2*t)}
function valueNoise(x,z){const x0=Math.floor(x),z0=Math.floor(z),tx=smooth(x-x0),tz=smooth(z-z0);const a=hash2(x0,z0),b=hash2(x0+1,z0),c=hash2(x0,z0+1),d=hash2(x0+1,z0+1);const ab=a+(b-a)*tx,cd=c+(d-c)*tx;return ab+(cd-ab)*tz}
function fbm(x,z){let v=0,a=.55,f=.035,n=0;for(let i=0;i<4;i++){v+=valueNoise(x*f,z*f)*a;n+=a;a*=.5;f*=2}return v/n}
function params(){const p=prompt.toLowerCase();return{amp:/山|mountain|峭壁/.test(p)?18:/平原|plain/.test(p)?5:10,sea:/海|ocean|湖|lake|河|river/.test(p)?24:20,forest:/森林|forest|丛林|jungle/.test(p)?0.11:0.055,sand:/沙漠|desert|沙地/.test(p)?0.36:0.14}}
function heightAt(x,z,pr){const continental=(fbm(x*.55,z*.55)-.5)*pr.amp;const detail=(fbm(x+731,z-271)-.5)*4;return Math.max(6,Math.min(H-10,Math.floor(25+continental+detail)))}
function index(x,y,z){return x+CHUNK*(z+CHUNK*y)}
function set(arr,x,y,z,id){if(x>=0&&x<CHUNK&&z>=0&&z<CHUNK&&y>=0&&y<H)arr[index(x,y,z)]=id}
function tree(arr,lx,base,lz){for(let y=0;y<4;y++)set(arr,lx,base+y,lz,6);for(let y=base+2;y<=base+5;y++)for(let x=lx-2;x<=lx+2;x++)for(let z=lz-2;z<=lz+2;z++){const d=Math.abs(x-lx)+Math.abs(z-lz)+(y===base+5?1:0);if(d<=4&&!(x===lx&&z===lz&&y<base+4))set(arr,x,y,z,7)}}
self.onmessage=e=>{const m=e.data;if(m.type==='init'){seed=hashString(m.seed||'1');prompt=m.prompt||'';self.postMessage({type:'ready'});return}if(m.type!=='generate')return;const {cx,cz}=m,pr=params(),arr=new Uint8Array(CHUNK*CHUNK*H);for(let lx=0;lx<CHUNK;lx++)for(let lz=0;lz<CHUNK;lz++){const wx=cx*CHUNK+lx,wz=cz*CHUNK+lz,top=heightAt(wx,wz,pr),moist=fbm(wx+2000,wz-900);for(let y=0;y<=top;y++){let id=3;if(y===top) id=top<=pr.sea+1||moist<pr.sand?4:1;else if(y>=top-3) id=(top<=pr.sea+1||moist<pr.sand)?4:2;set(arr,lx,y,lz,id)}for(let y=top+1;y<=pr.sea;y++)set(arr,lx,y,lz,8);if(top>pr.sea+1&&arr[index(lx,top,lz)]===1&&hash2(wx*7,wz*7)<pr.forest&&lx>2&&lx<13&&lz>2&&lz<13)tree(arr,lx,top+1,lz)}self.postMessage({type:'chunk',cx,cz,data:arr.buffer},[arr.buffer])}
