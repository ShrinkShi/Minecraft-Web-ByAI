const PROFILES=Object.freeze({
  swing:Object.freeze({kind:'tone',wave:'triangle',from:190,to:85,duration:.085,gain:.035}),
  hit:Object.freeze({kind:'noise-tone',wave:'square',from:115,to:72,duration:.11,gain:.075}),
  shoot:Object.freeze({kind:'noise-tone',wave:'triangle',from:420,to:170,duration:.13,gain:.045}),
  burn:Object.freeze({kind:'noise',duration:.12,gain:.024}),
  'creeper-prime':Object.freeze({kind:'tone',wave:'sine',from:170,to:720,duration:.42,gain:.045}),
  explosion:Object.freeze({kind:'explosion',wave:'sine',from:78,to:28,duration:.62,gain:.12}),
  'block-break':Object.freeze({kind:'noise',duration:.095,gain:.035}),
  use:Object.freeze({kind:'tone',wave:'triangle',from:240,to:180,duration:.07,gain:.022})
});

export const GAME_SOUND_IDS=Object.freeze(Object.keys(PROFILES));
export function soundProfile(id){return PROFILES[id]||null;}

function browserContextFactory(){const Ctor=globalThis.AudioContext||globalThis.webkitAudioContext;return Ctor?new Ctor():null;}

export class GameAudioSystem{
  constructor({contextFactory=browserContextFactory,masterGain=.62}={}){if(typeof contextFactory!=='function')throw new TypeError('audio contextFactory must be a function');this.contextFactory=contextFactory;this.masterGain=Math.max(0,Math.min(1,Number(masterGain)||0));this.context=null;this.master=null;this.lastPlayed=new Map();this.disposed=false;}
  ensureContext(){if(this.disposed)return null;if(this.context)return this.context;const context=this.contextFactory();if(!context)return null;this.context=context;this.master=context.createGain();this.master.gain.value=this.masterGain;this.master.connect(context.destination);return context;}
  unlock(){const context=this.ensureContext();if(!context)return false;if(context.state==='suspended')context.resume?.().catch?.(()=>{});return true;}
  play(id,{gain=1,minIntervalMs=0}={}){
    const profile=soundProfile(id);if(!profile||this.disposed)return false;const nowMs=typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now(),last=this.lastPlayed.get(id)??-Infinity;if(Number.isFinite(minIntervalMs)&&minIntervalMs>0&&nowMs-last<minIntervalMs)return false;this.lastPlayed.set(id,nowMs);const context=this.ensureContext();if(!context||!this.master)return false;if(context.state==='suspended')context.resume?.().catch?.(()=>{});const level=Math.max(0,Math.min(2,Number(gain)||0));if(level<=0)return false;if(profile.kind==='noise'||profile.kind==='noise-tone'||profile.kind==='explosion')this.noise(profile.duration,profile.gain*level,profile.kind==='explosion');if(profile.kind==='tone'||profile.kind==='noise-tone'||profile.kind==='explosion')this.tone(profile,level);return true;
  }
  tone(profile,level){const context=this.context,start=context.currentTime,duration=profile.duration,osc=context.createOscillator(),gain=context.createGain();osc.type=profile.wave||'sine';osc.frequency.setValueAtTime(profile.from,start);osc.frequency.exponentialRampToValueAtTime(Math.max(1,profile.to),start+duration);gain.gain.setValueAtTime(Math.max(.0001,profile.gain*level),start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain);gain.connect(this.master);osc.start(start);osc.stop(start+duration+.01);}
  noise(duration,level,lowPass=false){const context=this.context,frames=Math.max(1,Math.ceil(context.sampleRate*duration)),buffer=context.createBuffer(1,frames,context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames*.35);const source=context.createBufferSource(),gain=context.createGain(),start=context.currentTime;source.buffer=buffer;gain.gain.setValueAtTime(Math.max(.0001,level),start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(gain);if(lowPass){const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(900,start);filter.frequency.exponentialRampToValueAtTime(120,start+duration);gain.connect(filter);filter.connect(this.master);}else gain.connect(this.master);source.start(start);source.stop(start+duration+.01);}
  snapshot(){return Object.freeze({available:!!this.context,unlocked:this.context?.state==='running',masterGain:this.masterGain,lastPlayed:Object.freeze(Object.fromEntries(this.lastPlayed))});}
  dispose(){if(this.disposed)return false;this.disposed=true;try{this.context?.close?.();}catch{}this.context=null;this.master=null;this.lastPlayed.clear();return true;}
}

export const gameAudio=new GameAudioSystem();
export function playGameSound(id,options){return gameAudio.play(id,options);}
export function unlockGameAudio(){return gameAudio.unlock();}
export function gameAudioSnapshot(){return gameAudio.snapshot();}
