  /* ---------- Rhythm games ----------
     Eight ways to play one engine. Every tune is generated here from a seed and synthesized live,
     so the games add no audio files and owe nothing to anyone's recording. */
  const RH_SONGS=[
    {id:'march',name:'호자 행진곡',bpm:108,root:60,seed:11,prog:[0,3,4,0],cells:['x...x...x.x.x...','x.x.x...x...x...'],lead:'square',desc:'씩씩하게'},
    {id:'break',name:'쉬는 시간',bpm:96,root:62,seed:27,prog:[0,4,2,3],cells:['x..x..x.x.......','..x.x.x...x.x...'],lead:'triangle',desc:'느긋하게'},
    {id:'run',name:'달려라 호자',bpm:126,root:64,seed:41,prog:[0,2,3,4],cells:['x.x.x.x.x.x.x...','x...x.x.x...x.x.'],lead:'square',desc:'신나게'},
    {id:'fish',name:'붕어빵 스윙',bpm:114,root:65,seed:53,prog:[0,0,3,4],cells:['x..x..x.x..x..x.','x...x..x..x.x...'],lead:'sawtooth',desc:'통통 튀게'},
    {id:'star',name:'칠판 위의 별',bpm:84,root:67,seed:68,prog:[0,3,1,4],cells:['x...x...x...x.x.','x.....x.x.......'],lead:'sine',desc:'차분하게'},
    {id:'king',name:'광개토 전진',bpm:138,root:57,seed:79,prog:[0,4,3,4],cells:['x.xxx.x.x.xxx...','x.x.xxx.x...x.x.'],lead:'square',desc:'아주 빠르게'},
    {id:'rain',name:'비 오는 창가',bpm:78,root:62,seed:91,prog:[0,5,3,4],cells:['x.....x.x...x...','x...x.....x.x...'],lead:'sine',desc:'아주 천천히'},
    {id:'lunch',name:'급식 종이 울려요',bpm:120,root:60,seed:103,prog:[0,3,0,4],cells:['x.x.x...x.x.x.x.','x...x.x.x.x.....'],lead:'triangle',desc:'배고프게'},
    {id:'jump',name:'줄넘기 한판',bpm:132,root:62,seed:117,prog:[0,4,5,3],cells:['x..x..x.x..x..x.','x.x..x..x.x..x..'],lead:'square',desc:'통통 빠르게'},
    {id:'clean',name:'청소 시간 폴카',bpm:144,root:65,seed:129,prog:[0,4,0,4],cells:['x.x.x.x.x...x...','x...x.x.x.x.x...'],lead:'triangle',desc:'후다닥'},
    {id:'moon',name:'달빛 자장가',bpm:72,root:60,seed:137,prog:[0,5,1,4],cells:['x.....x.x.....x.','x.......x...x...'],lead:'sine',desc:'살금살금'},
    {id:'cheer',name:'우리 반 응원가',bpm:116,root:67,seed:149,prog:[0,3,4,4],cells:['x.x.x.x.x...x...','x..x..x.x.x.x...'],lead:'sawtooth',desc:'다 같이'}
  ];
  const RH_PENTA=[0,2,4,7,9,12,14,16,19,21];
  const RH_DEGREE=[0,2,4,5,7,9,11];
  function rhSeed(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
  // Intro, then a four-bar tune that returns, a contrasting middle, and the tune again: easy to learn by ear.
  function rhCompose(song){
    const rnd=rhSeed(song.seed),phrase=(cells,start)=>{
      const out=[];let i=start;
      for(let bar=0;bar<4;bar++){
        const cell=cells[bar%2===1&&rnd()<.5?1:bar%2];
        for(let s=0;s<16;s++){
          if(cell[s]!=='x')continue;
          i=clamp(i+[-2,-1,-1,1,1,2][Math.floor(rnd()*6)],0,RH_PENTA.length-1);
          let len=1;while(s+len<16&&cell[s+len]==='.'&&len<6)len++;
          out.push({step:bar*16+s,pitch:RH_PENTA[i],len});
        }
      }
      return out;
    };
    const A=phrase(song.cells,3),B=phrase([song.cells[1],song.cells[0]],5);
    const form=[null,A,A,B,B,A,A];   // Each entry is four bars. The first is the intro.
    const notes=[];
    form.forEach((ph,k)=>{if(ph)for(const n of ph)notes.push({step:k*64+n.step,midi:song.root+12+n.pitch,len:n.len});});
    const totalSteps=form.length*64+16,bass=[],drums=[];
    for(let bar=0;bar<totalSteps/16-1;bar++){
      const deg=RH_DEGREE[song.prog[bar%4]],base=song.root-12+deg;
      for(const s of [0,6,8,14])bass.push({step:bar*16+s,midi:base+(s===6?7:0),len:s%8===0?3:2});
      for(let s=0;s<16;s+=2)drums.push({step:bar*16+s,kind:s%8===0?'kick':s%8===4?'snare':'hat'});
    }
    return {song,notes,bass,drums,totalSteps,stepLen:60/song.bpm/4,chords:song.prog};
  }
  // Which tune notes must be played, by difficulty. Gaps keep hard charts possible for a child's hands.
  function rhChart(music,level,lanes){
    const need=level==='easy'?4:level==='normal'?2:1,gapMin=level==='hard'?(music.song.bpm>120?2:1):need;
    const out=[];let last=-99,lastLane=-1;
    for(const n of music.notes){
      if(n.step%need!==0||n.step-last<gapMin)continue;
      let lane=lanes?((n.midi%lanes)+lanes)%lanes:0;
      if(lanes>1&&lane===lastLane&&n.step-last<=2)lane=(lane+1)%lanes;
      out.push({step:n.step,t:n.step*music.stepLen,lane,len:n.len,midi:n.midi});
      last=n.step;lastLane=lane;
    }
    return out;
  }
  const RH_PERFECT=.075,RH_GOOD=.15,RH_LATE=.2;
  const RH={sess:null};
  let boardLag=(()=>{const v=Number(localStorage.getItem('hoja-airhockey-board-lag'));return v>=0&&v<=.4?v:0;})();
  const RH_COLORS=['#e0584a','#3f8fd8','#37aa74','#f0bc3a','#a877d8','#ef8f3c','#32b7c0','#d65a9c'];
  const RH_GEM=['gem_red','gem_blue','gem_green','gem_yellow','gem_purple','gem_red','gem_blue','gem_green'],RH_DIA=['dia_red','dia_blue','dia_green','dia_yellow','dia_purple'];
  function rhBlip(kind,when){
    if(!ac)return;
    const g=ac.createGain();g.connect(sfxBus);
    if(kind==='kick'){const o=ac.createOscillator();o.frequency.setValueAtTime(130,when);o.frequency.exponentialRampToValueAtTime(40,when+.11);g.gain.setValueAtTime(.55,when);g.gain.exponentialRampToValueAtTime(.001,when+.14);o.connect(g);o.start(when);o.stop(when+.16);return;}
    const len=kind==='snare'?.12:.04,buf=ac.createBuffer(1,Math.ceil(ac.sampleRate*len),ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const s=ac.createBufferSource(),hp=ac.createBiquadFilter();s.buffer=buf;hp.type='highpass';hp.frequency.value=kind==='snare'?1400:6500;
    g.gain.setValueAtTime(kind==='snare'?.22:.1,when);g.gain.exponentialRampToValueAtTime(.001,when+len);s.connect(hp);hp.connect(g);s.start(when);
  }
  function rhTone(midi,when,len,type,vol){
    if(!ac)return;
    const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=440*Math.pow(2,(midi-69)/12);
    g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(vol,when+.012);g.gain.setValueAtTime(vol*.8,when+Math.max(.02,len*.6));g.gain.exponentialRampToValueAtTime(.001,when+len);
    o.connect(g);g.connect(sfxBus);o.start(when);o.stop(when+len+.02);
  }
  function rhAudioOk(){return ac&&soundMode!=='off'&&ac.state==='running';}
  /* ---------- Neon stage: shared pictures and hit effects ----------
     Glow is slow to draw live, so each colour's note is drawn once and reused. The burst and ring come from Kenney's Particle Pack. */
  const RH_NEON=['#ff4d8d','#36d6ff','#4dff9a','#ffe14d','#b77dff','#ff9a3d','#2ff5e0','#ff6be6'];
  const RH_STILL=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const rhSprites={};
  function rhCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function rhTint(pic,color){
    const img=paImg(pic);if(!img.complete||!img.naturalWidth)return null;
    const c=rhCanvas(128,128),x=c.getContext('2d');
    x.drawImage(img,0,0,128,128);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,128,128);
    return c;
  }
  function rhStarPath(x,cx,cy,r){x.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,q=i%2?r*.45:r;x[i?'lineTo':'moveTo'](cx+Math.cos(a)*q,cy+Math.sin(a)*q);}x.closePath();}
  function rhSprite(kind,color){
    const key=kind+color;if(rhSprites[key])return rhSprites[key];
    let c=null;
    if(kind==='burst')c=rhTint('burst',color);
    else if(kind==='ringFx')c=rhTint('ring',color);
    else{
      const wide=kind==='bar'||kind==='tile';
      c=rhCanvas(wide?200:128,kind==='bar'?72:kind==='tile'?96:128);
      const x=c.getContext('2d');x.shadowColor=color;x.shadowBlur=20;x.fillStyle=color;x.strokeStyle=color;
      if(kind==='bar'){x.beginPath();x.roundRect(22,22,156,28,12);x.fill();x.fill();x.shadowBlur=0;x.fillStyle='rgba(255,255,255,.88)';x.beginPath();x.roundRect(36,30,128,9,4);x.fill();}
      else if(kind==='tile'){x.lineWidth=6;x.globalAlpha=.4;x.beginPath();x.roundRect(22,18,156,60,12);x.fill();x.globalAlpha=1;x.stroke();x.shadowBlur=0;x.fillStyle='rgba(255,255,255,.8)';x.fillRect(46,44,108,6);}
      else if(kind==='dot'){x.beginPath();x.arc(64,64,36,0,7);x.fill();x.fill();x.shadowBlur=0;x.fillStyle='rgba(255,255,255,.85)';x.beginPath();x.arc(64,64,17,0,7);x.fill();}
      else if(kind==='ring'){x.lineWidth=7;x.beginPath();x.arc(64,64,46,0,7);x.stroke();x.stroke();}
      else if(kind==='star'){rhStarPath(x,64,64,44);x.fill();x.fill();x.shadowBlur=0;x.fillStyle='rgba(255,255,255,.85)';rhStarPath(x,64,64,20);x.fill();}
    }
    if(c)rhSprites[key]=c;
    return c;
  }
  // w and h are the size of the shape itself; the glow around it spills past them.
  function rhNote(g,kind,color,cx,cy,w,h){
    const s=rhSprite(kind,color);if(!s)return;
    const dw=kind==='bar'||kind==='tile'?w*200/156:w*128/72,dh=kind==='bar'?h*72/28:kind==='tile'?h*96/60:(h||w)*128/72;
    g.drawImage(s,cx-dw/2,cy-dh/2,dw,dh);
  }
  function rhGlowStroke(g,color,lw){
    g.strokeStyle=color;
    g.globalAlpha=.18;g.lineWidth=lw*3.4;g.stroke();
    g.globalAlpha=.4;g.lineWidth=lw*1.9;g.stroke();
    g.globalAlpha=1;g.lineWidth=lw;g.stroke();
  }
  function rhFx(sess,x,y,color,big){
    sess.fx.push({x,y,color,big,age:0,turn:Math.random()*6});
    if(sess.fx.length>24)sess.fx.shift();
  }
  function rhDrawFx(sess,g,dt){
    const unit=clamp(Math.min(sess.W,sess.H)*.2,90,220);
    g.save();g.globalCompositeOperation='lighter';
    for(const f of sess.fx){
      f.age+=dt;
      const k=clamp(f.age/.34,0,1),size=unit*(f.big?1.7:1.2),burst=rhSprite('burst',f.color),ring=rhSprite('ringFx',f.color);
      g.globalAlpha=1-k;
      if(burst){const s=size*(.65+k*.7);g.save();g.translate(f.x,f.y);g.rotate(f.turn+k);g.drawImage(burst,-s/2,-s/2,s,s);g.restore();}
      if(ring){const s=size*(.2+k*1.1);g.drawImage(ring,f.x-s/2,f.y-s/2,s,s);}
      if(f.big){
        const dot=rhSprite('dot',f.color),d=unit*.12*(1-k*.6);
        if(dot)for(let i=0;i<6;i++){const a=f.turn+i*Math.PI/3,r=size*.62*k;g.drawImage(dot,f.x+Math.cos(a)*r-d/2,f.y+Math.sin(a)*r-d/2,d,d);}
      }
    }
    g.restore();g.globalAlpha=1;
    sess.fx=sess.fx.filter(f=>f.age<.34);
  }
  /* Fever: a long combo lights the stage. Ten brightens the edge, twenty brings low flames, thirty is full fever until a miss. */
  const RH_FEVER=30,rhFlames={};
  function rhFlame(color){
    if(rhFlames[color])return rhFlames[color];
    const img=sxImgs.flame;if(!img||!img.complete||!img.naturalWidth)return null;
    const c=rhCanvas(128,128),x=c.getContext('2d');
    x.drawImage(img,0,0,128,128);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,128,128);
    return rhFlames[color]=c;
  }
  // Where flames stand: along both road edges, or along the bottom of a panel.
  function rhFeverSpots(sess,p){
    const f=p.f,out=[];
    if(sess.style.full){
      for(const k of [.3,.5,.7,.9]){
        const y=f.y+(p.hitY-f.y)*k,w=rhRoadW(p,y),size=clamp(w*.3,50,sess.H*.3);
        out.push({x:f.cx-w/2,y,size},{x:f.cx+w/2,y,size});
      }
    }else{
      const size=clamp(f.h*.42,50,sess.H*.4);
      for(let i=0;i<7;i++)out.push({x:f.x+f.w*(i+.5)/7,y:f.y+f.h,size});
    }
    return out;
  }
  function rhFever(sess,g,p,t,dt){
    const combo=p.combo,fever=combo>=RH_FEVER;
    if(fever&&!p.fever){
      const cx=p.f.cx||p.f.x+p.f.w/2,cy=p.f.y+p.f.h*.34;
      rhFx(sess,cx,cy,'#ff4d8d',true);rhFx(sess,cx,cy,'#36d6ff',true);
      sess.pops.push({x:cx,y:cy,text:'FEVER!',color:'#ff6be6',size:3,age:0});
      sfx('goal',.6);
    }
    p.fever=fever;
    if(combo<10)return;
    const beat=sess.music.stepLen*4,pulse=1-(Math.abs(t)%beat)/beat,f=p.f;
    g.save();g.globalCompositeOperation='lighter';
    g.globalAlpha=(fever?.55:.26)+pulse*.3;g.strokeStyle=fever?'#ff6be6':'#7fe9ff';g.lineWidth=fever?7:4;
    g.beginPath();
    if(sess.style.full){const b=f.cx-f.w/2,a=f.cx-f.wTop/2;g.moveTo(a,f.y);g.lineTo(b,p.hitY);g.lineTo(b+f.w,p.hitY);g.lineTo(a+f.wTop,f.y);}
    else g.roundRect(f.x,f.y,f.w,f.h,18);
    g.stroke();
    if(combo>=20){
      const big=fever?1.25:.75,spots=rhFeverSpots(sess,p);
      spots.forEach((s,i)=>{
        const fire=rhFlame(i%2?'#36d6ff':'#ff4d8d');if(!fire)return;
        const wave=RH_STILL?.5:.5+.5*Math.sin(t*(9+i%3*2)+i*1.7),h=s.size*big*(.82+wave*.28+pulse*.14),w=s.size*big*(.9-wave*.12);
        g.globalAlpha=(fever?.92:.6)*(.72+wave*.28);
        g.drawImage(fire,s.x-w/2,s.y-h*.86,w,h);
      });
    }
    g.restore();g.globalAlpha=1;
    if(fever){
      const cx=sess.style.full?f.cx:f.x+f.w*.84,y=sess.style.full?f.y+(p.hitY-f.y)*.34:f.y+f.h*.09;
      g.textAlign='center';g.textBaseline='middle';g.font='900 '+Math.round(clamp(f.w*.055,18,44)*(1+pulse*.12))+'px "HojaTitle","HojaBody",sans-serif';
      g.lineWidth=6;g.strokeStyle='#120c2c';g.strokeText('FEVER',cx,y);g.fillStyle='#ff6be6';g.fillText('FEVER',cx,y);
    }
  }
  function rhJudge(sess,p,err,x,y,color){
    const abs=Math.abs(err),kind=abs<=RH_PERFECT?'perfect':abs<=RH_GOOD?'good':'miss';
    if(kind==='miss'){rhMiss(sess,p,x,y);return kind;}
    p[kind]++;p.combo++;p.maxCombo=Math.max(p.maxCombo,p.combo);p.bump=1;
    const add=(kind==='perfect'?3:1)+(p.combo>=20?1:0);
    p.score+=add;paSetScore(p.side,p.score);
    const big=kind==='perfect';
    rhFx(sess,x,y,color||(big?'#ffe14d':'#4dff9a'),big);
    sess.pops.push({x,y:y-24,text:big?'정확!':'좋아',color:big?'#ffe14d':'#4dff9a',size:big?1.45:1,age:0});
    if(p.combo%10===0&&p.f){
      const cx=p.f.cx||p.f.x+p.f.w/2,cy=p.f.y+p.f.h*.4;
      rhFx(sess,cx,cy,'#ffe14d',true);
      sess.pops.push({x:cx,y:cy,text:p.combo+' 콤보!',color:'#fff',size:2.4,age:-.1});
    }
    return kind;
  }
  function rhMiss(sess,p,x,y){
    p.miss++;p.combo=0;p.shake=.16;
    sess.pops.push({x,y,text:'놓침',color:'#a7a9c4',size:.9,age:0});
  }
  function rhDrawPops(sess,g,dt){
    g.textAlign='center';g.textBaseline='middle';
    for(const b of sess.pops){
      b.age+=dt;
      if(b.age<0)continue;
      const k=clamp(b.age/.55,0,1),rise=b.age*60,grow=1+Math.min(.2,b.age*1.4);
      g.globalAlpha=1-k;
      g.font='900 '+Math.round(clamp(sess.W*.019,18,36)*(b.size||1)*grow)+'px "HojaBody",sans-serif';
      g.lineWidth=6;g.strokeStyle='#120c2c';g.strokeText(b.text,b.x,b.y-rise);g.fillStyle=b.color;g.fillText(b.text,b.x,b.y-rise);
    }
    g.globalAlpha=1;
    sess.pops=sess.pops.filter(b=>b.age<.55);
  }
  function rhRound(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);}
  function rhComboText(g,p,x,y,size,dt){
    p.bump=Math.max(0,(p.bump||0)-(dt||0)*6);
    if(p.combo<3)return;
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(255,255,255,.9)';g.font='900 '+Math.round(size*(1+(p.bump||0)*.35))+'px "HojaBody",sans-serif';g.fillText(p.combo+' 콤보',x,y);
  }
  function rhPanel(g,x,y,w,h,color){
    g.fillStyle='rgba(30,22,78,.72)';rhRound(g,x,y,w,h,18);g.fill();
    rhRound(g,x+2,y+2,w-4,h-4,16);rhGlowStroke(g,color,2);
  }

  /* The road: notes start small and far away near the top of the screen and grow as they reach the line. Touch stays below the top third. */
  const RH_TOP=.3,RH_FAR=1/RH_TOP-1,RH_LEAD=1.5;
  function rhRoadY(p,u){
    const f=p.f,span=p.hitY-f.y;
    if(u<=0)return p.hitY-u*span*(.6*RH_FAR/(1-RH_TOP)+.4);
    return f.y+span*(.6*(1/(1+RH_FAR*u)-RH_TOP)/(1-RH_TOP)+.4*(1-u));
  }
  function rhRoadW(p,y){const f=p.f;return f.wTop+(f.w-f.wTop)*Math.max(0,(y-f.y)/(p.hitY-f.y));}
  function rhRoadBg(sess,lanes){
    const W=Math.max(1,Math.round(sess.W)),H=Math.max(1,Math.round(sess.H)),c=rhCanvas(W,H),x=c.getContext('2d');
    const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#0c0824');sky.addColorStop(.55,'#1d1548');sky.addColorStop(1,'#120c2c');x.fillStyle=sky;x.fillRect(0,0,W,H);
    const rnd=rhSeed(7);x.fillStyle='#fff';
    for(let i=0;i<70;i++){x.globalAlpha=.15+rnd()*.5;const s=1+rnd()*1.6;x.fillRect(rnd()*W,rnd()*H*.5,s,s);}
    x.globalAlpha=1;
    for(const p of sess.players){
      const f=p.f,cx=f.cx,topL=cx-f.wTop/2,botL=cx-f.w/2;
      for(let i=0;i<lanes;i++){
        x.beginPath();x.moveTo(topL+f.wTop*i/lanes,f.y);x.lineTo(topL+f.wTop*(i+1)/lanes,f.y);x.lineTo(botL+f.w*(i+1)/lanes,p.hitY);x.lineTo(botL+f.w*i/lanes,p.hitY);x.closePath();
        x.fillStyle=i%2?'rgba(255,255,255,.055)':'rgba(255,255,255,.025)';x.fill();
      }
      for(let i=0;i<=lanes;i++){
        const edge=i===0||i===lanes;
        x.beginPath();x.moveTo(topL+f.wTop*i/lanes,f.y);x.lineTo(botL+f.w*i/lanes,p.hitY);
        if(edge)rhGlowStroke(x,'#7fe9ff',3);else{x.strokeStyle='rgba(150,190,255,.3)';x.lineWidth=1.5;x.stroke();}
      }
      for(let i=0;i<lanes;i++){
        const color=RH_NEON[i%8],px=f.x+i*f.lw+4,py=p.hitY+9,pw=f.lw-8,ph=f.y+f.h-p.hitY-13;
        x.fillStyle=color;x.globalAlpha=.2;rhRound(x,px,py,pw,ph,14);x.fill();x.globalAlpha=1;
        rhRound(x,px,py,pw,ph,14);rhGlowStroke(x,color,2);
      }
      x.beginPath();x.moveTo(botL,p.hitY);x.lineTo(botL+f.w,p.hitY);rhGlowStroke(x,'#ffffff',3);
    }
    return c;
  }

  /* Falling lanes: tap, hold, piano, stars and whole-class ensemble all use this */
  function rhLaneStyle(opts){
    const lanes=opts.lanes,kind=opts.note||'bar';
    const laneAt=(p,x,y)=>{
      const yy=Math.min(y,p.hitY),w=rhRoadW(p,yy);
      return clamp(Math.floor((x-(p.f.cx-w/2))/(w/lanes)),0,lanes-1);
    };
    return {
      lanes,full:true,laneAt,
      layout(sess){
        const n=sess.players.length,W=sess.W,H=sess.H,tall=H>W,pad=10;
        const w=n>1?W*.47:Math.min(W-pad*2,W*(tall?.94:lanes>=8?.86:.62));
        sess.players.forEach((p,i)=>{
          const x=n>1?(i?W*.515:W*.015):(W-w)/2,y=Math.round(H*.03);
          p.f={x,y,w,h:H-y-pad,lw:w/lanes,wTop:w*RH_TOP,cx:x+w/2};
          p.hitY=H-clamp(H*.17,84,170);
          p.held=new Map();
        });
        sess.bg=rhRoadBg(sess,lanes);
      },
      press(sess,p,x,y,id,t){
        const lane=laneAt(p,x,y);
        p.flash[lane]=Math.max(p.flash[lane],.1);
        let best=null,bd=9;
        for(const n of p.notes){if(n.done||n.lane!==lane)continue;const d=Math.abs(n.t-t);if(d<bd){bd=d;best=n;}if(n.t-t>RH_GOOD)break;}
        const cx=p.f.x+(lane+.5)*p.f.lw;
        if(!best||bd>RH_GOOD)return;
        best.done=true;p.flash[lane]=.26;
        const judged=rhJudge(sess,p,best.t-t,cx,p.hitY,RH_NEON[lane%8]);
        sess.hitSound(best);
        if(opts.hold&&best.hold&&judged!=='miss'){best.holding=true;p.held.set(id,best);}
      },
      release(sess,p,id,t){
        const n=p.held.get(id);if(!n)return;
        p.held.delete(id);n.holding=false;n.finished=true;
        const cx=p.f.x+(n.lane+.5)*p.f.lw;
        if(t<n.tEnd-RH_GOOD)rhMiss(sess,p,cx,p.hitY-20);else rhJudge(sess,p,0,cx,p.hitY,RH_NEON[n.lane%8]);
      },
      update(sess,p,t){
        for(const n of p.notes){
          if(!n.done&&t-n.t>RH_LATE){n.done=true;n.finished=true;rhMiss(sess,p,p.f.x+(n.lane+.5)*p.f.lw,p.hitY-20);}
          if(n.holding&&t>=n.tEnd){
            n.holding=false;n.finished=true;for(const [k,v] of p.held)if(v===n)p.held.delete(k);
            rhJudge(sess,p,0,p.f.x+(n.lane+.5)*p.f.lw,p.hitY,RH_NEON[n.lane%8]);
          }
        }
      },
      draw(sess,g,p,t,dt){
        const f=p.f,lead=sess.lead*RH_LEAD,botL=f.cx-f.w/2,topL=f.cx-f.wTop/2,barLen=sess.music.stepLen*4;
        if(p.side===0&&sess.bg)g.drawImage(sess.bg,0,0,sess.W,sess.H);
        rhFever(sess,g,p,t,dt);
        g.save();g.globalCompositeOperation='lighter';
        for(let i=0;i<lanes;i++){
          if(p.flash[i]<=0)continue;
          p.flash[i]-=dt;
          const a=clamp(p.flash[i]*4,0,1),color=RH_NEON[i%8],beam=g.createLinearGradient(0,f.y,0,p.hitY);
          beam.addColorStop(0,'rgba(0,0,0,0)');beam.addColorStop(1,color);
          g.globalAlpha=a*.6;g.fillStyle=beam;
          g.beginPath();g.moveTo(topL+f.wTop*i/lanes,f.y);g.lineTo(topL+f.wTop*(i+1)/lanes,f.y);g.lineTo(botL+f.w*(i+1)/lanes,p.hitY);g.lineTo(botL+f.w*i/lanes,p.hitY);g.closePath();g.fill();
          g.globalAlpha=a*.7;g.fillStyle=color;rhRound(g,f.x+i*f.lw+4,p.hitY+9,f.lw-8,f.y+f.h-p.hitY-13,14);g.fill();
        }
        g.globalAlpha=(1-(Math.abs(t)%barLen)/barLen)*.7;g.fillStyle='#fff';g.fillRect(botL,p.hitY-2,f.w,4);
        g.restore();g.globalAlpha=1;
        const show=[];
        for(const n of p.notes){
          if(n.finished||(n.done&&!n.holding))continue;
          if((n.t-t)/lead>1)break;
          show.push(n);
        }
        const unit=clamp(sess.H*.05,18,42);
        for(let i=show.length-1;i>=0;i--){
          const n=show[i],u=(n.t-t)/lead,color=RH_NEON[n.lane%8],y=n.holding?p.hitY:rhRoadY(p,u),rw=rhRoadW(p,y),nx=f.cx-rw/2+(n.lane+.5)*rw/lanes,scale=rw/f.w;
          g.globalAlpha=clamp((1-u)*7,0,1);
          if(n.hold){
            const y2=rhRoadY(p,Math.min(1,(n.tEnd-t)/lead)),w2=rhRoadW(p,y2),x2=f.cx-w2/2+(n.lane+.5)*w2/lanes,half=rw/lanes*.2,half2=w2/lanes*.2;
            g.fillStyle=color;g.globalAlpha*=n.holding?.85:.5;
            g.beginPath();g.moveTo(nx-half,y);g.lineTo(nx+half,y);g.lineTo(x2+half2,y2);g.lineTo(x2-half2,y2);g.closePath();g.fill();
            g.globalAlpha=clamp((1-u)*7,0,1);
          }
          if(!n.holding){
            if(kind==='star')rhNote(g,'star',RH_NEON[3],nx,y,rw/lanes*.5);
            else rhNote(g,kind,color,nx,y,rw/lanes*.9,unit*(kind==='tile'?2:1)*Math.max(.28,scale));
          }
        }
        g.globalAlpha=1;
        rhComboText(g,p,f.cx,f.y+(p.hitY-f.y)*.5,Math.round(clamp(f.w*.05,20,44)),dt);
      },
      point(sess,p,n){return {x:p.f.x+(n.lane+.5)*p.f.lw,y:p.hitY+20};}
    };
  }

  /* Rings that close on a circle, placed on a walking path so the eye can follow */
  function rhCircleStyle(){
    return {
      lanes:0,
      layout(sess){
        const n=sess.players.length,gap=n>1?clamp(sess.W*.05,44,96):0,pad=10;
        sess.players.forEach((p,i)=>{
          const w=(sess.W-gap*(n-1)-pad*2)/n,h=sess.H-pad*2-6;
          p.f={x:pad+i*(w+gap),y:pad+6,w,h};
          p.r=clamp(Math.min(w,h)*.11,34,76);
          p.notes.forEach((m,k)=>{
            const a=(k*.62)+(m.midi%7)*.2,rx=(w/2-p.r*1.3),ry=(h/2-p.r*1.3);
            m.x=p.f.x+w/2+Math.cos(a)*rx*(.45+.55*((k%5)/4));m.y=p.f.y+h/2+Math.sin(a*1.4)*ry*(.45+.55*((k%3)/2));
          });
        });
      },
      press(sess,p,x,y,id,t){
        let best=null,bd=9;
        for(const n of p.notes){
          if(n.done)continue;if(n.t-t>sess.lead)break;
          const d=Math.hypot(n.x-x,n.y-y);
          if(d<=p.r*1.25&&Math.abs(n.t-t)<bd){bd=Math.abs(n.t-t);best=n;}
        }
        if(!best)return;
        best.done=true;
        if(bd>RH_GOOD)rhMiss(sess,p,best.x,best.y);else{rhJudge(sess,p,best.t-t,best.x,best.y,RH_NEON[best.midi%8]);sess.hitSound(best);}
      },
      update(sess,p,t){for(const n of p.notes)if(!n.done&&t-n.t>RH_LATE){n.done=true;rhMiss(sess,p,n.x,n.y);}},
      draw(sess,g,p,t,dt){
        const {x,y,w,h}=p.f;
        rhPanel(g,x,y,w,h,'#36d6ff');
        const vis=p.notes.filter(n=>!n.done&&n.t-t<sess.lead);
        for(let i=vis.length-1;i>=0;i--){
          const n=vis[i],k=clamp((n.t-t)/sess.lead,0,1),color=RH_NEON[n.midi%8];
          g.globalAlpha=clamp(1.3-k,0,1);
          rhNote(g,'dot',color,n.x,n.y,p.r*2);
          rhNote(g,'ring',color,n.x,n.y,p.r*2*(1+k*1.5)*.92);
          g.globalAlpha=1;
        }
        rhComboText(g,p,x+w/2,y+clamp(h*.08,26,50),Math.round(clamp(w*.05,18,38)),dt);
      },
      point(sess,p,n){return {x:n.x,y:n.y};}
    };
  }

  /* Two drums and a track running towards them */
  function rhDrumStyle(){
    const COLOR=['#ff4d8d','#36d6ff'];
    return {
      lanes:2,
      layout(sess){
        const n=sess.players.length,gap=n>1?clamp(sess.W*.05,44,96):0,pad=10;
        sess.players.forEach((p,i)=>{
          const w=(sess.W-gap*(n-1)-pad*2)/n,h=sess.H-pad*2;
          p.f={x:pad+i*(w+gap),y:pad,w,h,trackH:h*.36,hitX:pad+i*(w+gap)+clamp(w*.13,50,110)};
          p.pads=[{x:p.f.x,y:pad+p.f.trackH+8,w:w/2-4,h:h-p.f.trackH-8},{x:p.f.x+w/2+4,y:pad+p.f.trackH+8,w:w/2-4,h:h-p.f.trackH-8}];
        });
      },
      press(sess,p,x,y,id,t){
        if(y<p.pads[0].y)return;
        const lane=x<p.pads[1].x?0:1;p.flash[lane]=.12;
        let best=null,bd=9;
        for(const n of p.notes){if(n.done||n.lane!==lane)continue;const d=Math.abs(n.t-t);if(d<bd){bd=d;best=n;}if(n.t-t>RH_GOOD)break;}
        if(!best||bd>RH_GOOD)return;
        best.done=true;p.flash[lane]=.24;rhJudge(sess,p,best.t-t,p.f.hitX,p.f.y+p.f.trackH/2,COLOR[lane]);sess.hitSound(best);
      },
      update(sess,p,t){for(const n of p.notes)if(!n.done&&t-n.t>RH_LATE){n.done=true;rhMiss(sess,p,p.f.hitX,p.f.y+p.f.trackH*.2);}},
      draw(sess,g,p,t,dt){
        const {x,y,w,trackH,hitX}=p.f,cy=y+trackH/2,r=clamp(trackH*.3,18,46),speed=(w-(hitX-x))/sess.lead;
        rhPanel(g,x,y,w,trackH,'#b77dff');
        g.beginPath();g.arc(hitX,cy,r*1.12,0,7);rhGlowStroke(g,'#ffffff',3);
        for(let i=p.notes.length-1;i>=0;i--){
          const n=p.notes[i];if(n.done||n.t-t>sess.lead)continue;
          rhNote(g,'dot',COLOR[n.lane],hitX+(n.t-t)*speed,cy,r*2);
        }
        p.pads.forEach((pad,k)=>{
          if(p.flash[k]>0)p.flash[k]-=dt;
          g.fillStyle=COLOR[k];g.globalAlpha=p.flash[k]>0?.6:.16;rhRound(g,pad.x,pad.y,pad.w,pad.h,20);g.fill();g.globalAlpha=1;
          rhRound(g,pad.x+2,pad.y+2,pad.w-4,pad.h-4,18);rhGlowStroke(g,COLOR[k],3);
          g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='900 '+Math.round(clamp(pad.w*.13,22,60))+'px "HojaTitle","HojaBody",sans-serif';
          g.fillText(k?'딱':'둥',pad.x+pad.w/2,pad.y+pad.h/2);
        });
        rhComboText(g,p,x+w/2,y+24,Math.round(clamp(w*.04,16,28)),dt);
      },
      point(sess,p,n){const pad=p.pads[n.lane];return {x:pad.x+pad.w/2,y:pad.y+pad.h/2};}
    };
  }

  /* A needle sweeps the clock face; tap anywhere when it crosses a mark */
  function rhSpinStyle(){
    return {
      lanes:0,
      layout(sess){
        const n=sess.players.length,gap=n>1?clamp(sess.W*.05,44,96):0,pad=10;
        sess.players.forEach((p,i)=>{
          const w=(sess.W-gap*(n-1)-pad*2)/n,h=sess.H-pad*2;
          p.f={x:pad+i*(w+gap),y:pad,w,h,cx:pad+i*(w+gap)+w/2,cy:pad+h/2,r:Math.min(w,h)*.4};
        });
      },
      press(sess,p,x,y,id,t){
        if(x<p.f.x||x>p.f.x+p.f.w)return;
        p.flash[0]=.1;
        let best=null,bd=9;
        for(const n of p.notes){if(n.done)continue;const d=Math.abs(n.t-t);if(d<bd){bd=d;best=n;}if(n.t-t>RH_GOOD)break;}
        if(!best||bd>RH_GOOD)return;
        best.done=true;
        const lap=sess.music.stepLen*32,a=(best.t/lap)*Math.PI*2-Math.PI/2;
        rhJudge(sess,p,best.t-t,p.f.cx+Math.cos(a)*p.f.r,p.f.cy+Math.sin(a)*p.f.r,RH_NEON[best.midi%8]);sess.hitSound(best);
      },
      update(sess,p,t){for(const n of p.notes)if(!n.done&&t-n.t>RH_LATE){n.done=true;rhMiss(sess,p,p.f.cx,p.f.cy);}},
      draw(sess,g,p,t,dt){
        const {x,y,w,h,cx,cy,r}=p.f,lap=sess.music.stepLen*32,ang=b=>(b/lap)*Math.PI*2-Math.PI/2;
        if(p.flash[0]>0)p.flash[0]-=dt;
        rhPanel(g,x,y,w,h,p.flash[0]>0?'#ffe14d':'#b77dff');
        g.beginPath();g.arc(cx,cy,r,0,7);rhGlowStroke(g,'#7fe9ff',3);
        for(const n of p.notes){
          if(n.done||n.t-t>lap*.92)continue;
          const a=ang(n.t);rhNote(g,'dot',RH_NEON[n.midi%8],cx+Math.cos(a)*r,cy+Math.sin(a)*r,clamp(r*.075,9,20)*2.2);
        }
        const a=ang(t);g.lineCap='round';g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*r*1.08,cy+Math.sin(a)*r*1.08);rhGlowStroke(g,'#ff4d8d',4);g.lineCap='butt';
        g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';
        if(p.combo>=3)rhComboText(g,p,cx,cy,Math.round(clamp(r*.2,18,38)),dt);else{g.font='800 '+Math.round(clamp(r*.13,13,24))+'px "HojaBody",sans-serif';g.fillText('아무 데나 톡!',cx,cy);}
      },
      point(sess,p){return {x:p.f.cx,y:p.f.cy};}
    };
  }

  /* Catch the stars: stand under the note by touching a lane */
  function rhCatchStyle(){
    const base=rhLaneStyle({lanes:3,note:'star'});
    const catchIt=(sess,p,n,t)=>{n.done=true;n.finished=true;rhJudge(sess,p,n.t-t,p.f.x+(n.lane+.5)*p.f.lw,p.hitY,RH_NEON[3]);sess.hitSound(n);};
    return Object.assign({},base,{
      layout(sess){base.layout(sess);for(const p of sess.players){p.pos=1;p.avatar=new Image();p.avatar.src=portraitFor(p.side,'happy');}},
      press(sess,p,x,y,id,t){p.pos=base.laneAt(p,x,y);p.flash[p.pos]=.14;this.collect(sess,p,t);},
      collect(sess,p,t){
        for(const n of p.notes){
          if(n.done)continue;if(n.t-t>RH_GOOD)break;
          if(n.lane===p.pos&&Math.abs(n.t-t)<=RH_GOOD)catchIt(sess,p,n,t);
        }
      },
      update(sess,p,t){
        // Standing in the right lane is enough, so this is the gentlest game for younger pupils.
        for(const n of p.notes){if(n.done)continue;if(n.t>t)break;if(n.lane===p.pos)catchIt(sess,p,n,t);}
        for(const n of p.notes)if(!n.done&&t-n.t>RH_LATE){n.done=true;n.finished=true;rhMiss(sess,p,p.f.x+(n.lane+.5)*p.f.lw,p.hitY-20);}
      },
      draw(sess,g,p,t,dt){
        p.flash[p.pos]=Math.max(p.flash[p.pos],.07);
        base.draw(sess,g,p,t,dt);
        const size=clamp(Math.min(p.f.lw*.6,sess.H*.22),60,190),ax=p.f.x+(p.pos+.5)*p.f.lw;
        if(p.avatar.complete)g.drawImage(p.avatar,ax-size/2,p.hitY-size*.62,size,size);
      }
    });
  }

  /* Call and response: the drum plays a bar, then you play it back */
  function rhEchoStyle(){
    return {
      lanes:0,
      prepare(sess){
        const barLen=sess.music.stepLen*16,rnd=rhSeed(sess.music.song.seed+7);
        const dense=sess.level==='easy'?[0,8]:sess.level==='normal'?[0,4,8,12]:[0,2,4,6,8,10,12,14];
        const chart=[],calls=[];
        // Bars go in pairs after the intro: odd bars call, even bars answer.
        for(let bar=8;bar+1<sess.music.totalSteps/16-1;bar+=2){
          const beats=dense.filter((s,k)=>k===0||rnd()<.72);
          for(const s of beats){
            const step=bar*16+s;
            calls.push({t:step*sess.music.stepLen});
            chart.push({step:step+16,t:(step+16)*sess.music.stepLen,lane:0,len:1,midi:72});
          }
        }
        sess.calls=calls;sess.barLen=barLen;sess.echoChart=chart;
        sess.callAt=0;
      },
      layout(sess){
        const n=sess.players.length,gap=n>1?clamp(sess.W*.05,44,96):0,pad=10;
        sess.players.forEach((p,i)=>{
          const w=(sess.W-gap*(n-1)-pad*2)/n,h=sess.H-pad*2;
          p.f={x:pad+i*(w+gap),y:pad,w,h};
        });
      },
      press(sess,p,x,y,id,t){
        p.flash[0]=.12;
        let best=null,bd=9;
        for(const n of p.notes){if(n.done)continue;const d=Math.abs(n.t-t);if(d<bd){bd=d;best=n;}if(n.t-t>RH_GOOD)break;}
        if(!best||bd>RH_GOOD)return;
        best.done=true;p.flash[0]=.24;rhJudge(sess,p,best.t-t,p.f.x+p.f.w/2,p.f.y+p.f.h*.56,'#ff4d8d');sess.hitSound(best);
      },
      update(sess,p,t){for(const n of p.notes)if(!n.done&&t-n.t>RH_LATE){n.done=true;rhMiss(sess,p,p.f.x+p.f.w/2,p.f.y+p.f.h*.35);}},
      draw(sess,g,p,t,dt){
        const {x,y,w,h}=p.f,bar=Math.floor(t/sess.barLen),listen=bar>=8&&bar%2===0,color=listen?'#36d6ff':bar>=8?'#ff4d8d':'#b77dff';
        if(p.flash[0]>0)p.flash[0]-=dt;
        rhPanel(g,x,y,w,h,color);
        const r=Math.min(w,h)*.3,cx=x+w/2,cy=y+h*.56;
        g.fillStyle=color;g.globalAlpha=p.flash[0]>0?.55:.14;g.beginPath();g.arc(cx,cy,r,0,7);g.fill();g.globalAlpha=1;
        g.beginPath();g.arc(cx,cy,r,0,7);rhGlowStroke(g,color,5);
        g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='900 '+Math.round(clamp(w*.055,20,46))+'px "HojaTitle","HojaBody",sans-serif';
        g.fillText(bar<8?'준비…':listen?'잘 들어요':'따라 쳐요!',cx,y+h*.14);
        const beat=(t/(sess.barLen/4))%4;
        for(let i=0;i<4;i++){const on=Math.floor(beat)===i;g.globalAlpha=on?1:.3;rhNote(g,'dot',color,cx+(i-1.5)*clamp(w*.06,26,60),y+h*.25,clamp(w*.012,6,12)*2.4);}
        g.globalAlpha=1;
        g.fillStyle='#fff';g.font='900 '+Math.round(r*.3)+'px "HojaBody",sans-serif';g.fillText(p.combo>=3?p.combo+' 콤보':'둥!',cx,cy);
      },
      point(sess,p){return {x:p.f.x+p.f.w/2,y:p.f.y+p.f.h*.56};}
    };
  }

  /* Piano tiles: the tune only sounds when you press, so you are the one playing it */
  function rhPianoStyle(){
    const base=rhLaneStyle({lanes:4,note:'tile'});
    return Object.assign({},base,{
      mute:true,
      press(sess,p,x,y,id,t){
        const lane=base.laneAt(p,x,y),n=p.notes.find(m=>!m.done);
        p.flash[lane]=.12;
        if(!n)return;
        const cx=p.f.x+(lane+.5)*p.f.lw;
        if(n.lane===lane&&n.t-t<=sess.lead*RH_LEAD*.5){n.done=true;n.finished=true;p.flash[lane]=.26;rhJudge(sess,p,n.t>t?Math.min(n.t-t,.07):t-n.t,cx,p.hitY,RH_NEON[lane%8]);sess.hitSound(n);}
        else{p.combo=0;p.shake=.16;sess.pops.push({x:cx,y:p.hitY-20,text:'삐끗',color:'#ff6b6b',age:0});}
      }
    });
  }

  /* One session: pick a tune, count in, play, score */
  // Tap along for as long as you like: the value follows the last eight taps and each tap shows how it would be judged.
  function boardCalibrate(done){
    const BEAT=800,KEEP=8,box=paEl('div','rh-cal'),title=paEl('div','rh-cal-title','전자칠판 보정'),hint=paEl('div','rh-cal-note','원이 닿을 때마다 화면을 눌러 주세요'),spot=paEl('div','rh-cal-spot'),ring=paEl('div','rh-cal-ring'),note=paEl('div','rh-cal-note rh-cal-result','네 번 이상 누르면 보정값이 나와요'),use=paEl('div','rh-cal-use','리듬 게임 · 탑 쌓기 · 호자 양궁 · 신호등 줄다리기에 적용돼요'),row=paEl('div','rh-cal-row');
    spot.append(ring);box.append(title,hint,spot,note,use,row);$('app').append(box);
    const first=performance.now()+1400,taps=[];let shown=-1,raf=0,value=boardLag;
    if(location.hash==='#debug')window.__v37.cal={first,BEAT};
    const measure=()=>{const sorted=[...taps].sort((a,b)=>a-b);return clamp(Math.round(sorted[Math.floor(sorted.length/2)]*100)/100,0,.4);};
    box.addEventListener('pointerdown',e=>{
      e.preventDefault();
      const now=performance.now(),i=Math.round((now-first)/BEAT),d=(now-(first+i*BEAT))/1000;
      if(i<0||Math.abs(d)>BEAT*.45/1000)return;
      paFlash(spot,'on',120);
      taps.push(d);if(taps.length>KEEP)taps.shift();
      if(taps.length>=4){value=measure();title.textContent='보정값 '+value.toFixed(2)+'초';}
      const err=d-value,abs=Math.abs(err);
      note.textContent=abs<=RH_PERFECT?'정확!':abs<=RH_GOOD?(err<0?'좋아 · 조금 일찍':'좋아 · 조금 늦게'):(err<0?'일찍 눌렀어요':'늦게 눌렀어요');
    });
    row.addEventListener('pointerdown',e=>e.stopPropagation());
    const close=()=>{cancelAnimationFrame(raf);box.remove();};
    const add=(text,cls,fn)=>{const b=paEl('button',cls,text);b.type='button';b.addEventListener('click',()=>{sfx('menu',.7);fn();});row.append(b);};
    add('적용','primary',()=>{boardLag=value;remember('board-lag',String(value));close();done();});
    add('처음부터','',()=>{taps.length=0;value=boardLag;title.textContent='전자칠판 보정';note.textContent='네 번 이상 누르면 보정값이 나와요';});
    add('보정 끄기','',()=>{boardLag=0;remember('board-lag','0');close();done();});
    add('취소','',close);
    const tick=now=>{
      if(!box.isConnected)return;
      const i=Math.max(0,Math.ceil((now-first)/BEAT)),k=clamp(((first+i*BEAT)-now)/BEAT,0,1);
      ring.style.transform='scale('+(1+k*1.5)+')';
      const passed=Math.floor((now-first)/BEAT);
      if(passed!==shown&&passed>=0){shown=passed;if(rhAudioOk())rhBlip('kick',ac.currentTime);paFlash(spot,'beat',140);}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
  }
  function rhMake(stage,host,buildStyle){
    host.classList.add('pa-rhythm');
    const picker=paEl('div','rh-picker');
    const head=paEl('div','rh-picker-head');head.append(paEl('div','rh-picker-title','노래를 골라요'));picker.append(head);
    const grid=paEl('div','rh-songs');
    for(const song of RH_SONGS){
      const b=paEl('button','rh-song');b.append(paEl('b','',song.name),paEl('span','',song.desc+' · '+song.bpm+' BPM'));
      paTap(b,()=>{picker.remove();rhBegin(stage,host,song,buildStyle());});grid.append(b);
    }
    picker.append(grid);host.append(picker);
    paHint(stage.desc);
    return {
      frame(dt){if(RH.sess)RH.sess.frame(dt);},
      stop(){RH.sess=null;}
    };
  }
  function rhBegin(stage,host,song,style){
    // The road takes the whole screen, so the class goes on before anything measures the stage.
    $('partyScreen').classList.toggle('rh-full',Boolean(style.full));
    if(stage.coop){$('paLabel0').textContent='우리 반';$('paName0').textContent='다 같이';}
    const canvas=paEl('canvas','rh-canvas');host.append(canvas);
    const g=canvas.getContext('2d'),music=rhCompose(song),solo=stage.people===1||stage.coop;
    const players=[];
    const n=solo?1:2;
    const sess={style,music,level:stage.level,lead:stage.lead||1.7,pops:[],fx:[],players,W:0,H:0,count:music.stepLen*16,time:-music.stepLen*16,base:null,lastAudio:null,stepIndex:0,nextStep:-16,finished:false};
    if(style.prepare)style.prepare(sess);
    const chart=sess.echoChart||rhChart(music,stage.level,style.lanes);
    if(style.holdNotes)for(const c of chart)if(c.len>=3){c.hold=true;c.tEnd=c.t+(c.len-.5)*music.stepLen;}
    for(let i=0;i<n;i++)players.push({side:i,score:0,combo:0,maxCombo:0,perfect:0,good:0,miss:0,bump:0,shake:0,flash:[0,0,0,0,0,0,0,0,0,0,0,0],notes:chart.map(c=>Object.assign({},c))});
    function resize(){
      const r=host.getBoundingClientRect();if(!r.width||!r.height)return;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      sess.W=r.width;sess.H=r.height;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
      canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';g.setTransform(dpr,0,0,dpr,0,0);
      style.layout(sess);
    }
    resize();
    const owners=new Map();
    const playerAt=x=>{for(const p of players)if(x>=p.f.x-20&&x<=p.f.x+p.f.w+20)return p;return players[0];};
    canvas.addEventListener('pointerdown',e=>{
      e.preventDefault();if(!PS.live||PS.ended)return;
      const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,p=playerAt(x);
      if(style.full&&y<sess.H*.34)return;
      owners.set(e.pointerId,p);
      try{canvas.setPointerCapture(e.pointerId);}catch{}
      if(sess.time>-.5)style.press(sess,p,x,y,e.pointerId,sess.time-boardLag);
    });
    const up=e=>{const p=owners.get(e.pointerId);owners.delete(e.pointerId);if(p&&style.release&&PS.live)style.release(sess,p,e.pointerId,sess.time-boardLag);};
    canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    sess.resize=resize;
    sess.hitSound=n=>{if(rhAudioOk())rhTone(n.midi||72,ac.currentTime,.14,'triangle',.16);};
    sess.clockBase=null;
    sess.frame=dt=>{
      if(sess.finished)return;
      const r=host.getBoundingClientRect();if(Math.abs(r.width-sess.W)>1||Math.abs(r.height-sess.H)>1)resize();
      // The audio clock is the steady one; the frame clock stands in when sound is off.
      if(rhAudioOk()&&PS.speed===1){
        const a=ac.currentTime;
        if(sess.lastAudio===null)sess.clockBase=a-sess.time;
        else if(a-sess.lastAudio>.25)sess.clockBase+=(a-sess.lastAudio)-dt;
        sess.lastAudio=a;sess.time=a-sess.clockBase;
      }else{sess.time+=dt;sess.lastAudio=null;}
      const t=sess.time,lookAhead=.16;
      if(rhAudioOk()&&PS.speed===1){
        while(sess.nextStep*music.stepLen<t+lookAhead){
          const s=sess.nextStep,when=sess.clockBase+s*music.stepLen;
          // Sound can start late, after the first touch: steps already gone are skipped, not scheduled in the past.
          if(when<ac.currentTime){sess.nextStep++;continue;}
          if(s<0){if(s%4===0)rhBlip('hat',when);}
          else{
            for(const d of music.drums)if(d.step===s)rhBlip(d.kind,when);
            for(const b of music.bass)if(b.step===s)rhTone(b.midi,when,b.len*music.stepLen,'triangle',.26);
            if(!style.mute)for(const m of music.notes)if(m.step===s)rhTone(m.midi,when,Math.min(m.len,4)*music.stepLen,song.lead,song.lead==='sine'?.2:.09);
            if(sess.calls)for(const c of sess.calls)if(Math.abs(c.t-s*music.stepLen)<.001)rhBlip('kick',when),rhTone(72,when,.14,'square',.14);
          }
          sess.nextStep++;
        }
      }
      if(t>-.2)for(const p of players)style.update(sess,p,t-boardLag);
      g.clearRect(0,0,sess.W,sess.H);
      for(const p of players){
        const wobble=!RH_STILL&&p.shake>0;
        if(wobble){g.save();g.translate(Math.sin(p.shake*90)*5,0);}
        if(!style.full)rhFever(sess,g,p,t,dt);
        style.draw(sess,g,p,t,dt);
        if(wobble)g.restore();
        p.shake=Math.max(0,p.shake-dt);
      }
      rhDrawFx(sess,g,dt);
      rhDrawPops(sess,g,dt);
      if(t<0){
        g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='900 '+Math.round(clamp(sess.H*.2,60,170))+'px "HojaTitle","HojaBody",sans-serif';
        g.lineWidth=8;g.strokeStyle='#ff4d8d';const label=Math.ceil(-t/(music.stepLen*4));g.strokeText(label,sess.W/2,sess.H/2);g.fillText(label,sess.W/2,sess.H/2);
      }
      paTime(song.name);
      const hasCombo=players.map(p=>p.combo);
      paHint(players.length===1?'콤보 '+hasCombo[0]+' · 최고 '+players[0].maxCombo:'콤보 '+hasCombo[0]+' : '+hasCombo[1]);
      if(t>music.notes[music.notes.length-1].step*music.stepLen+2.2&&players.every(p=>p.notes.every(n=>n.done||n.finished))){
        sess.finished=true;RH.sess=null;
        const line=p=>'정확 '+p.perfect+' · 좋아 '+p.good+' · 놓침 '+p.miss+' · 최고 콤보 '+p.maxCombo;
        if(players.length===1){
          const p=players[0],key=song.id+'-'+stage.id;
          const {best,fresh}=paBest(key,p.score,false);
          paEnd(null,(fresh?'새 기록! ':'')+p.score+'점 (최고 '+best+'점) · '+line(p));
        }else{
          const [a,b]=players;
          paEnd(a.score===b.score?-1:a.score>b.score?0:1,a.score+' : '+b.score+'  |  왼쪽 '+line(a)+'  |  오른쪽 '+line(b));
        }
      }
    };
    RH.sess=sess;
    if(!rhAudioOk())paHint('소리를 켜면 박자가 더 잘 들려요');
  }
  const RH_LEVELS=(lead)=>[
    {id:'d-easy',name:'둘이 쉬움',level:'easy',lead:lead*1.15,desc:'한 박에 하나씩 · 점수가 높은 쪽 승리'},
    {id:'d-normal',name:'둘이 보통',level:'normal',lead,desc:'반 박까지 나와요 · 점수가 높은 쪽 승리'},
    {id:'d-hard',name:'둘이 어려움',level:'hard',lead:lead*.85,desc:'노래 그대로 쳐요 · 점수가 높은 쪽 승리'},
    {id:'s-normal',name:'혼자 보통',people:1,level:'normal',lead,desc:'노래마다 최고 기록을 남겨요'},
    {id:'s-hard',name:'혼자 어려움',people:1,level:'hard',lead:lead*.85,desc:'노래마다 최고 기록을 남겨요'}
  ];
  const RH_DEFS={
    rfall:{name:'호자 리듬',title:'HOJA 리듬 · 떨어지는 음표',make:(st,h)=>rhMake(st,h,()=>rhLaneStyle({lanes:4})),stages:RH_LEVELS(1.7)},
    rhold:{name:'꾹 눌러 리듬',title:'HOJA 리듬 · 꾹 누르기',make:(st,h)=>rhMake(st,h,()=>Object.assign(rhLaneStyle({lanes:3,hold:true}),{holdNotes:true})),stages:RH_LEVELS(1.8)},
    rcircle:{name:'동글 리듬',title:'HOJA 리듬 · 동그라미',make:(st,h)=>rhMake(st,h,rhCircleStyle),stages:RH_LEVELS(1.25)},
    rdrum:{name:'둥딱 북치기',title:'HOJA 리듬 · 둥딱 북치기',make:(st,h)=>rhMake(st,h,rhDrumStyle),stages:RH_LEVELS(1.7)},
    rspin:{name:'빙글 시계',title:'HOJA 리듬 · 빙글 시계',make:(st,h)=>rhMake(st,h,rhSpinStyle),stages:RH_LEVELS(1.7)},
    rpiano:{name:'피아노 타일',title:'HOJA 리듬 · 피아노 타일',make:(st,h)=>rhMake(st,h,rhPianoStyle),stages:RH_LEVELS(1.9)},
    rcatch:{name:'별 받기',title:'HOJA 리듬 · 별 받기',make:(st,h)=>rhMake(st,h,rhCatchStyle),stages:RH_LEVELS(1.8)},
    recho:{name:'따라 치기',title:'HOJA 리듬 · 따라 치기',make:(st,h)=>rhMake(st,h,rhEchoStyle),stages:RH_LEVELS(1.7)},
    rband:{name:'우리 반 합주',title:'HOJA 리듬 · 우리 반 합주',make:(st,h)=>rhMake(st,h,()=>rhLaneStyle({lanes:8})),stages:[
      {id:'all-easy',name:'다 같이 쉬움',people:1,coop:true,level:'easy',lead:2,desc:'여덟 칸을 여럿이 함께 쳐요 · 우리 반 최고 기록에 도전'},
      {id:'all-normal',name:'다 같이 보통',people:1,coop:true,level:'normal',lead:1.8,desc:'여덟 칸을 여럿이 함께 쳐요 · 우리 반 최고 기록에 도전'},
      {id:'all-hard',name:'다 같이 어려움',people:1,coop:true,level:'hard',lead:1.5,desc:'여덟 칸을 여럿이 함께 쳐요 · 우리 반 최고 기록에 도전'}]}
  };
  for(const [id,def] of Object.entries(RH_DEFS)){
    PARTY_GAMES[id]=Object.assign({noCount:true,mood:'none',sel:def.stages[1].id,rhythm:true},def);
    $('openParty-'+id).addEventListener('click',()=>{
      if(currentGame!==id)streak={side:-1,id:null,count:0};
      currentGame=id;sfx('menu',.8);toggleFullscreen(true);enterSelection();
    });
  }

