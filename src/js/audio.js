  /* ---------- Audio: everything embedded, decoded once, played through Web Audio for low latency. ---------- */
  const SFX_FILES={
    coin:['coin0','coin1'],wood:['wood0','wood1'],flip:['flip0','flip1','flip2'],hit:['hit0','hit1','hit2'],tap:['tap0','tap1'],smash:['smash0','smash1'],rail:['rail0'],soft:['soft'],
    goal:['bell'],menu:['click'],glass:['glass'],charge:['force0'],shield:['force1'],shot:['laserL'],
    item:['retro'],zap:['laserS'],boom:['crunch'],low:['low']
  };
  let soundMode=preference('soundmode','all'),ac=null,sfxBus=null,bgmBus=null,buffers={},decoding=false;
  let bgmNode=null,bgmGainNode=null,bgmName=null,wantBgm=null,lastSoundAt={};
  function b64buf(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer;}
  function unlockAudio(){
    try{
      if(!ac){
        const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
        ac=new C({latencyHint:'interactive'});
        const comp=ac.createDynamicsCompressor();comp.connect(ac.destination);
        sfxBus=ac.createGain();bgmBus=ac.createGain();sfxBus.connect(comp);bgmBus.connect(comp);
        applySoundMode();decodeAll();
      }
      if(ac.state!=='running')ac.resume();
    }catch{}
  }
  async function decodeAll(){
    if(decoding)return;decoding=true;
    // Short effects first so the very first hits already have sound; music decodes last.
    const keys=Object.keys(AUDIO_DATA).sort((a,b)=>AUDIO_DATA[a].length-AUDIO_DATA[b].length);
    for(const k of keys){
      try{buffers[k]=await ac.decodeAudioData(b64buf(AUDIO_DATA[k]));}
      catch{
        buffers[k]=null;
        if(AUDIO_ALT[k])try{buffers[k]=await ac.decodeAudioData(b64buf(AUDIO_ALT[k]));}catch{}
      }
      if(wantBgm&&wantBgm.name===k)playBgm(wantBgm.name,wantBgm.opts);
    }
  }
  function applySoundMode(){
    if(!ac)return;
    sfxBus.gain.value=soundMode==='off'?0:.9;
    bgmBus.gain.value=soundMode==='all'?.34:0;
  }
  function synthBlip(kind,intensity){
    // Used only where a browser cannot decode the embedded file (older Safari with Ogg).
    const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
    const f={hit:320,tap:420,smash:150,rail:220,soft:260,goal:660,menu:520,glass:900,charge:120,shield:300,shot:180,item:760,zap:980,boom:70,low:60}[kind]||300;
    o.type=kind==='smash'||kind==='boom'?'sawtooth':'triangle';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.55,t+.14);
    g.gain.setValueAtTime(.32*intensity,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);
    o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+.2);
  }
  function sfx(kind='hit',intensity=1,rate=0){
    if(!ac||soundMode==='off'||ac.state!=='running')return;
    const now=performance.now();
    if(now-(lastSoundAt[kind]||0)<(kind==='rail'?45:kind==='flip'?15:40))return;
    lastSoundAt[kind]=now;
    const list=SFX_FILES[kind]||SFX_FILES.hit,key=list[Math.floor(Math.random()*list.length)],buf=buffers[key];
    if(!buf){if(buffers[key]===null)synthBlip(kind,intensity);return;}
    const s=ac.createBufferSource(),g=ac.createGain();
    s.buffer=buf;s.playbackRate.value=rate||(.93+Math.random()*.14);
    g.gain.value=Math.min(1.25,intensity);
    s.connect(g);g.connect(sfxBus);s.start();
  }
  function cheer(power=1){
    // A crowd swell shaped from noise: no CC0 crowd sample small enough was found, and this one is 0 bytes.
    if(!ac||soundMode==='off'||ac.state!=='running')return;
    const len=1.5,buf=ac.createBuffer(1,ac.sampleRate*len,ac.sampleRate),d=buf.getChannelData(0);
    let v=0;for(let i=0;i<d.length;i++){v=v*.72+(Math.random()*2-1)*.28;d[i]=v*(.72+.28*Math.sin(i/ac.sampleRate*31));}
    const s=ac.createBufferSource(),bp=ac.createBiquadFilter(),g=ac.createGain(),t=ac.currentTime;
    s.buffer=buf;bp.type='bandpass';bp.frequency.value=1500;bp.Q.value=.6;
    g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.55*power,t+.16);g.gain.exponentialRampToValueAtTime(.001,t+len);
    s.connect(bp);bp.connect(g);g.connect(sfxBus);s.start(t);
  }
  function stopBgm(fade=.25){
    wantBgm=null;bgmName=null;
    if(!bgmNode||!ac)return;
    const n=bgmNode,g=bgmGainNode,t=ac.currentTime;
    try{g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(.0001,t+fade);n.stop(t+fade+.02);}catch{}
    bgmNode=null;bgmGainNode=null;
  }
  function playBgm(name,opts={}){
    if(!ac){wantBgm={name,opts};return;}
    if(bgmName===name&&bgmNode)return;
    const buf=buffers[name];
    if(!buf){stopBgm();wantBgm={name,opts};return;}
    stopBgm(.2);wantBgm=null;bgmName=name;
    const s=ac.createBufferSource(),g=ac.createGain(),t=ac.currentTime;
    s.buffer=buf;s.loop=opts.loop!==false;
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(opts.gain||1,t+.3);
    s.connect(g);g.connect(bgmBus);s.start(t);bgmNode=s;bgmGainNode=g;
    if(opts.duration){g.gain.setValueAtTime(opts.gain||1,t+opts.duration-1.2);g.gain.linearRampToValueAtTime(.0001,t+opts.duration);s.stop(t+opts.duration+.05);}
  }
  // Songs are shared by mood rather than owned by a game, and each new match takes the next one in its pool.
  const BGM_POOLS={action:['battle','menu'],calm:['think','menu'],bright:['menu','battle']};
  const bgmTurn={action:0,calm:0,bright:0};
  function playMood(mood){
    const pool=BGM_POOLS[mood],name=pool[bgmTurn[mood]++%pool.length];
    playBgm(name,{gain:name==='think'?.9:.85});
  }
  function victoryJingle(){
    stopBgm(.25);
    if(!ac||soundMode==='off'||ac.state!=='running')return;
    const t0=ac.currentTime+.08;
    [[523.25,0,.16],[659.25,.15,.16],[783.99,.3,.16],[1046.5,.45,.5],[783.99,.75,.14],[1046.5,.9,.7]].forEach(([f,at,len])=>{
      for(const [type,vol,mul] of [['triangle',.3,1],['sine',.14,2]]){
        const o=ac.createOscillator(),g=ac.createGain(),t=t0+at;
        o.type=type;o.frequency.value=f*mul;
        g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+len);
        o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+len+.02);
      }
    });
    // Music returns under the result screen unless a new match has already started its own.
    setTimeout(()=>{if(!bgmNode&&!wantBgm)playBgm('menu',{gain:.6});},2600);
  }
  function setBgmTempo(rate){if(bgmNode&&ac)try{bgmNode.playbackRate.setTargetAtTime(rate,ac.currentTime,.4);}catch{}}
  ['pointerdown','pointerup','touchend','click','keydown'].forEach(n=>document.addEventListener(n,unlockAudio,{capture:true,passive:true}));

