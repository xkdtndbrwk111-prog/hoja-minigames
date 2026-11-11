  /* ---------- Infinite stairs ---------- */
  const ST_STAGES=[
    {id:'solo',name:'혼자 도전',desc:'시간이 다 되거나 헛디디면 끝! 최고 층수에 도전해요',n:1},
    {id:'p2',name:'2인 경주',desc:'40초 동안 누가 더 높이 오를까',n:2},
    {id:'p3',name:'3인 경주',desc:'셋이서 40초 경주',n:3},
    {id:'p4',name:'4인 경주',desc:'넷이서 40초 경주',n:4},
    {id:'p6',name:'6인 경주',desc:'여섯이서 40초 경주 · 칠판 앞이 북적여요',n:6},
  ];
  let stairsStage='solo';
  const ST={on:false,raf:0,phase:'idle',resume:'run',n:1,solo:true,players:[],xs:[],rng:null,time:0,limit:40,countdown:0,cShown:0,W:1920,H:1080,hits:[],floats:[],sparks:[],lastHit:new Map(),flash:new Map(),lastT:0,acc:0};
  const stCanvas=$('stCanvas'),stctx=stCanvas.getContext('2d',{alpha:false});
  function stEnsure(i){
    // One shared staircase: every racer faces exactly the same steps, so the race is decided by hands alone.
    while(ST.xs.length<=i+1){
      const last=ST.xs.length-1;
      if(ST.nextDir===undefined)ST.nextDir=ST.rng()<.5?1:-1;
      else if(ST.rng()<.36)ST.nextDir=-ST.nextDir;
      ST.xs.push(ST.xs[last]+ST.nextDir);
    }
  }
  const stNextDir=i=>{stEnsure(i);return ST.xs[i+1]-ST.xs[i];};
  function stWho(i){
    if(i<2)return choices[i];
    const rest=SH_FACES.filter(id=>!choices.includes(id));
    return rest[(i-2)%rest.length];
  }
  const stName=i=>CHARACTERS.find(c=>c.id===stWho(i)).name;
  function stNew(){
    hofRefresh();
    const st=ST_STAGES.find(s=>s.id===stairsStage);
    ST.n=st.n;ST.solo=st.n===1;ST.xs=[0];ST.nextDir=undefined;ST.rng=bRng(Math.floor(Math.random()*1e9));
    ST.players=[];
    for(let i=0;i<ST.n;i++){
      const dir=stNextDir(0);
      ST.players.push({i,idx:0,dir,gauge:100,stun:0,over:false,combo:0,camX:0,camY:0,pop:0,fallY:0,fallV:0,peak:0,shake:0,id:stWho(i)});
    }
    ST.floats=[];ST.sparks=[];ST.time=0;ST.phase='countdown';ST.countdown=2.4;ST.cShown=0;ST.acc=0;ST.record=false;
    $('stOverlay').hidden=true;
    playMood('action');setBgmTempo(1);
  }
  function stMove(p,turn){
    if(ST.phase!=='run'||p.over||p.stun>0)return;
    const dir=turn?-p.dir:p.dir,next=stNextDir(p.idx);
    p.dir=dir;
    if(dir!==next){stMiss(p);return;}
    p.idx++;p.peak=Math.max(p.peak,p.idx);p.combo++;p.pop=1;
    if(ST.solo)p.gauge=Math.min(100,p.gauge+7);
    sfx('flip',.75,1+Math.min(p.combo,30)*.018);
    if(p.idx%25===0){
      const big=p.idx%100===0;
      ST.floats.push({p:p.i,text:p.idx+'층!',color:'#c0532f',size:big?72:52,ttl:1.1,life:1.1});
      sfx('item',.8,big?1.4:1.1);if(big)cheer(.7);
    }
  }
  function stMiss(p){
    p.combo=0;p.shake=.4;sfx('boom',.7);
    if(ST.solo){stGameOver(p);return;}
    // In a race a slip costs five steps and a beat of time, but nobody is ever knocked out of playing.
    ST.floats.push({p:p.i,text:'미끄러졌다!','color':'#b8531f',size:40,ttl:.9,life:.9});
    p.stun=1;p.idx=Math.max(0,p.idx-5);p.dir=stNextDir(p.idx);
  }
  function stGameOver(p){
    p.over=true;p.fallV=-500;
    ST.phase='over';stopBgm(.4);
    hofRecord('stairs',0,p.idx);
    const prev=+preference('stairs-best','0');
    ST.record=p.idx>prev;if(ST.record)remember('stairs-best',String(p.idx));
    setTimeout(()=>{
      if(!ST.on||ST.phase!=='over')return;
      if(ST.record){cheer(1);sfx('goal',1);}
      stResult(`${p.idx}층!`,ST.record?`새 기록! 지난 기록 ${prev}층`:`최고 기록 ${prev}층`,[['↻ 다시 오르기','primary',stNew],['인물 변경','',()=>{leaveStairs();enterSelection();}],['← 모음집','',stHome]]);
    },900);
  }
  function stRaceEnd(){
    ST.phase='over';
    if(ST.n===2)ST.players.forEach(p=>hofRecord('stairs',p.i,p.idx));
    const rank=[...ST.players].sort((a,b)=>b.idx-a.idx),top=rank[0].idx,leaders=rank.filter(p=>p.idx===top);
    let title='';
    if(leaders.length>1)title='공동 1등!';
    else{
      title=`${stName(leaders[0].i)} 1등!`;
      if(ST.n===2){
        const w=leaders[0].i,repeat=streak.side===w&&streak.id===choices[w];
        streak={side:w,id:choices[w],count:repeat?streak.count+1:1};
        if(streak.count>=2)title=`${stName(w)} ${streak.count}연승!`;
      }
    }
    sfx('goal',1.1);cheer(1.1);victoryJingle();
    const detail=rank.map((p,k)=>`${k+1}등 ${stName(p.i)} ${p.idx}층`).join('   ·   ');
    const again=ST.n===2?[['다음 도전자 ▶','primary',()=>{leaveStairs();enterSelection();}],['↻ 바로 재대결','',stNew]]:[['↻ 다시 경주','primary',stNew],['인물 변경','',()=>{leaveStairs();enterSelection();}]];
    stResult(title,detail,[...again,['← 모음집','',stHome]]);
  }
  function stHome(){streak={side:-1,id:null,count:0};leaveStairs();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});}
  function stResult(title,detail,list){
    const bs=list.map(([l,c,f])=>button(l,c,f));
    bs.forEach(b=>{b.disabled=true;setTimeout(()=>{b.disabled=false;},900);});
    $('stOverlay').hidden=false;$('stOverlayTitle').textContent=title;$('stOverlayDetail').textContent=detail;$('stOverlayActions').replaceChildren(...bs);
  }
  function stOpenMenu(){
    if(!ST.on||ST.phase==='over'||ST.phase==='paused')return;
    ST.resume=ST.phase;ST.phase='paused';
    const label=()=>soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';
    const sound=button(label(),'',()=>{cycleSound();sound.textContent=label();});
    $('stOverlay').hidden=false;$('stOverlayTitle').textContent='잠깐 쉬는 중';$('stOverlayDetail').textContent='';
    $('stOverlayActions').replaceChildren(button('▶ 계속','primary',()=>{$('stOverlay').hidden=true;ST.phase=ST.resume;}),button('↻ 처음부터','',stNew),button('인물 변경','',()=>{leaveStairs();enterSelection();}),button('← 모음집','',stHome),sound);
  }
  function stStep(dt){
    if(ST.phase==='countdown'){
      ST.countdown-=dt;
      const show=Math.ceil(ST.countdown/.8);
      if(show!==ST.cShown&&show>0){ST.cShown=show;sfx('menu',1,1+(3-show)*.16);}
      if(ST.countdown<=0){ST.phase='run';sfx('goal',.8);}
      return;
    }
    if(ST.phase!=='run')return;
    ST.time+=dt;
    for(const p of ST.players){
      if(p.stun>0)p.stun=Math.max(0,p.stun-dt);
      if(ST.solo){
        // The clock tightens with height, so every run ends and the record always means something.
        p.gauge-=(11+p.idx*.075)*dt;
        if(p.gauge<=0){p.gauge=0;stGameOver(p);return;}
      }
    }
    if(!ST.solo){
      const left=ST.limit-ST.time,prev=left+dt;
      if(prev>10&&left<=10){sfx('item',.9,.8);setBgmTempo(1.05);}
      if(left<=0)stRaceEnd();
    }
  }
  /* ---------- Infinite stairs: touch and drawing ---------- */
  stCanvas.addEventListener('pointerdown',e=>{
    if(!ST.on||ST.phase!=='run')return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();
    const r=stCanvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*ST.W,y=(e.clientY-r.top)/r.height*ST.H;
    for(let i=ST.hits.length-1;i>=0;i--){
      const h=ST.hits[i],turned=TABLET&&ST.n===2&&(h.key==='t1'||h.key==='c1'),hx=turned?ST.W*1.5-x:x,hy=turned?ST.H-y:y;
      if(hx<h.x||hy<h.y||hx>h.x+h.w||hy>h.y+h.h)continue;
      const now=performance.now();
      // Short enough that a child tapping as fast as possible is never eaten; long enough to drop a double report.
      if(now-(ST.lastHit.get(h.key)||0)<45)return;
      ST.lastHit.set(h.key,now);ST.flash.set(h.key,now);h.fn();return;
    }
  },{passive:false});
  function stMix(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t));}
  const ST_SKY=[[0,[191,227,238],[244,236,216]],[60,[250,190,130],[255,226,170]],[130,[60,50,110],[220,120,120]],[220,[12,14,40],[50,40,90]]];
  function stSky(idx){
    for(let k=ST_SKY.length-1;k>=0;k--){
      if(idx>=ST_SKY[k][0]){
        const a=ST_SKY[k],b=ST_SKY[k+1];if(!b)return [a[1],a[2]];
        const t=(idx-a[0])/(b[0]-a[0]);return [stMix(a[1],b[1],t),stMix(a[2],b[2],t)];
      }
    }
    return [ST_SKY[0][1],ST_SKY[0][2]];
  }
  function stLabel(g,str,x,y,size,color,stroke){
    g.font=`${size}px "HojaTitle",sans-serif`;g.textAlign='center';g.textBaseline='middle';
    if(stroke){g.lineJoin='round';g.lineWidth=size*.2;g.strokeStyle=stroke;g.strokeText(str,x,y);}
    g.fillStyle=color;g.fillText(str,x,y);
  }
  function stBtn(g,key,x,y,w,h,base,edge,now,fn,draw){
    const fl=Math.max(0,1-(now-(ST.flash.get(key)||0))/110);
    g.save();g.translate(0,fl*6);
    g.beginPath();g.roundRect(x,y,w,h,Math.min(26,w*.12));g.fillStyle=base;g.fill();g.lineWidth=5;g.strokeStyle=edge;g.stroke();
    if(fl>0){g.fillStyle=`rgba(255,255,255,${fl*.4})`;g.fill();}
    draw();g.restore();
    ST.hits.push({key,x,y,w,h,fn});
  }
  function stArrow(g,cx,cy,s,dir,color){
    g.fillStyle=color;g.beginPath();
    g.moveTo(cx+dir*s,cy);g.lineTo(cx-dir*s*.1,cy-s*.72);g.lineTo(cx-dir*s*.1,cy-s*.28);g.lineTo(cx-dir*s*.9,cy-s*.28);g.lineTo(cx-dir*s*.9,cy+s*.28);g.lineTo(cx-dir*s*.1,cy+s*.28);g.lineTo(cx-dir*s*.1,cy+s*.72);g.closePath();g.fill();
  }
  function stDrawColumn(g,p,x,w,now,dt){
    const {H}=ST,btnH=Math.min(250,H*.23),btnY=H-btnH-14,top=0;
    g.save();g.beginPath();g.rect(x,0,w,H);g.clip();
    // Camera eases onto the player so each step reads as a hop, not a cut.
    const tx=ST.xs[p.idx],ty=p.idx,ease=Math.min(1,dt*16);
    stEnsure(p.idx+22);
    // Look ahead: a long run in one direction must stay on screen, or a narrow column hides the next steps.
    let ahead=0;for(let i=1;i<=6;i++)ahead+=ST.xs[p.idx+i];ahead/=6;
    const sw=Math.min(w*.27,126),stepX=sw*.66,sh=Math.min(58,btnY*.075),px=x+w/2,py=btnY-sh*2.6;
    const maxOff=(w/2-Math.min(sw*1.25,w*.36)*.55)/stepX;
    const camTarget=clamp(tx+(ahead-tx)*.8,tx-maxOff,tx+maxOff);
    p.camX+=(camTarget-p.camX)*ease;p.camY+=(ty-p.camY)*ease;
    // Tiles stay uncut: wide columns get whole buildings, narrow ones only the outer wall, the narrowest just the far city.
    const n=ST.n,[lc,rc]=n===1?[2,2]:n===2?(p.i?[0,2]:[2,0]):n<=4?[p.i===0?1:0,p.i===n-1?1:0]:[0,0];
    if(!CJ.scene(g,{x,w,S:n===1?3:2,id:p.i,lc,rc,viewH:btnY-8,groundY:py+sh*.62,rise:p.camY*sh,alt:p.camY*34,veil:n>=3?.55:.25})){
      const [c1,c2]=stSky(p.idx),sky=g.createLinearGradient(0,0,0,btnY);
      sky.addColorStop(0,`rgb(${c1})`);sky.addColorStop(1,`rgb(${c2})`);g.fillStyle=sky;g.fillRect(x,0,w,H);
    }
    const marks=ST.n<=2?hofMarks('stairs'):null;
    for(let i=Math.max(0,p.idx-6);i<p.idx+22;i++){
      const sx=px+(ST.xs[i]-p.camX)*stepX,sy=py+(p.camY-i)*sh;
      if(sy<-sh||sy>btnY+sh)continue;
      const mile=i>0&&i%25===0;
      g.beginPath();g.roundRect(sx-sw/2,sy,sw,sh*.62,8);
      g.fillStyle=mile?'#ffd25a':i%2?'#d9a868':'#c08f55';g.fill();g.lineWidth=4;g.strokeStyle=mile?'#7a5206':'#2e1a0c';g.stroke();
      if(mile)stLabel(g,String(i),sx,sy+sh*.31,sh*.42,'#5a3a10');
      const mark=marks&&marks.get(i);
      if(mark){
        const fs=Math.min(24,w*.05,sh*.46),label=mark.text+' '+i+'층';
        g.font=`${fs}px "HojaBody",sans-serif`;
        const tw=Math.min(g.measureText(label).width+18,w*.46),right=sx<x+w/2,lx=right?sx+sw/2+8:sx-sw/2-8-tw;
        g.fillStyle='rgba(30,20,14,.85)';g.beginPath();g.roundRect(lx,sy-2,tw,sh*.66,8);g.fill();
        if(mark.year){g.lineWidth=3;g.strokeStyle='#ffd24a';g.stroke();}
        g.textAlign='center';g.textBaseline='middle';g.fillStyle=mark.year?'#ffe27a':'#e8f8ff';g.fillText(label,lx+tw/2,sy-2+sh*.33,tw-10);
      }
    }
    // Player
    const mood=p.over||p.stun>0?'sad':p.combo>=30?'happy':'neutral',im=shFace(p.id,mood);
    const shakeX=p.shake>0?Math.sin(now/22)*10:0;p.shake=Math.max(0,p.shake-dt);
    p.pop=Math.max(0,p.pop-dt*9);
    if(p.over){p.fallV+=2400*dt;p.fallY+=p.fallV*dt;}
    const size=Math.min(sw*1.25,w*.36),hop=p.pop*p.pop*sh*.8,cx=px+shakeX+(tx-p.camX)*stepX,cy=py+(p.camY-ty)*sh-size*.46-hop+p.fallY;
    if(im.complete&&im.naturalWidth){
      g.save();g.translate(cx,cy);if(p.dir>0)g.scale(-1,1);
      if(p.stun>0)g.rotate(Math.sin(now/70)*.2);
      g.drawImage(im,-size/2,-size/2,size,size);g.restore();
    }
    // Where the next step goes is shown on the character's foot, for reading the stairs at speed.
    const hud=Math.min(44,w*.1);
    g.fillStyle='rgba(255,250,235,.92)';g.beginPath();g.roundRect(x+8,8,w-16,hud*2.3,12);g.fill();
    stLabel(g,ST.n===1?'층수':stName(p.i),x+w/2,8+hud*.55,hud*.62,'#6a5e50');
    stLabel(g,p.idx+'층',x+w/2,8+hud*1.55,hud*1.15,'#3b3229');
    if(ST.solo){
      const gx=x+w*.2,gw=w*.6,gy=8+hud*2.3+10,hgt=26;
      g.fillStyle='rgba(30,30,30,.45)';g.beginPath();g.roundRect(gx,gy,gw,hgt,10);g.fill();
      g.fillStyle=p.gauge<30?'#e83a24':p.gauge<55?'#f2a93b':'#3fbf74';g.beginPath();g.roundRect(gx+3,gy+3,Math.max(0,(gw-6)*p.gauge/100),hgt-6,8);g.fill();
    }
    if(p.stun>0)stLabel(g,'미끄러졌다!',x+w/2,cy-size*.68,Math.min(40,w*.11),'#c0532f','rgba(255,255,255,.95)');
    for(let k=ST.floats.length-1;k>=0;k--){
      const f=ST.floats[k];if(f.p!==p.i)continue;
      f.ttl-=dt;if(f.ttl<=0){ST.floats.splice(k,1);continue;}
      g.globalAlpha=Math.min(1,f.ttl*3);
      stLabel(g,f.text,x+w/2,py-size*1.5-(f.life-f.ttl)*50,Math.min(f.size,w*.15),f.color,'rgba(255,255,255,.95)');g.globalAlpha=1;
    }
    // Controls: left is always "turn", right is always "climb", arrows show which way each one goes.
    const bw=Math.min((w-30)/2,430),gap=Math.min(w-2*bw-20,40),bx=x+(w-2*bw-gap)/2;
    g.fillStyle='#5a4330';g.fillRect(x,btnY-8,w,H-btnY+8);
    const faceSize=Math.min(bw*.3,btnH*.34),labelSize=Math.min(bw*.17,btnH*.2);
    stBtn(g,'t'+p.i,bx,btnY,bw,btnH,'#f1c46e','#6e4726',now,()=>stMove(p,true),()=>{
      stArrow(g,bx+bw/2,btnY+btnH*.36,faceSize,-p.dir,'#3b2918');stLabel(g,'돌기',bx+bw/2,btnY+btnH*.76,labelSize,'#3b2918');
    });
    stBtn(g,'c'+p.i,bx+bw+gap,btnY,bw,btnH,'#96d6a6','#2a6e42',now,()=>stMove(p,false),()=>{
      stArrow(g,bx+bw+gap+bw/2,btnY+btnH*.36,faceSize,p.dir,'#153d24');stLabel(g,'오르기',bx+bw+gap+bw/2,btnY+btnH*.76,labelSize,'#153d24');
    });
    g.restore();
    g.fillStyle='#3a2a1a';g.fillRect(x+w-2,0,4,H);
  }
  function stDraw(now,dt){
    const g=stctx,k=stCanvas.width/ST.W;g.setTransform(k,0,0,k,0,0);
    ST.hits=[];
    const cw=ST.W/ST.n;
    ST.players.forEach((p,i)=>{
      const turned=TABLET&&ST.n===2&&i===1;
      if(turned){g.save();g.translate(ST.W*1.5,ST.H);g.rotate(Math.PI);}
      stDrawColumn(g,p,i*cw,cw,now,dt);
      if(turned)g.restore();
    });
    if(!ST.solo){
      const left=Math.max(0,ST.limit-ST.time),warn=left<=10;
      g.fillStyle=warn?'#ffd9cd':'#fff8e8';g.strokeStyle='#3b3229';g.lineWidth=4;g.beginPath();g.roundRect(ST.W/2-74,ST.H*.3-30,148,62,14);g.fill();g.stroke();
      stLabel(g,String(Math.ceil(left)),ST.W/2,ST.H*.3+2,42,warn?'#d4432a':'#3b3229');
    }
    const mx=ST.W/2-65,my=ST.H-48;
    g.beginPath();g.roundRect(mx,my,130,42,10);g.fillStyle='#fff8e8';g.fill();g.lineWidth=3;g.strokeStyle='#3b3229';g.stroke();
    stLabel(g,'메뉴',ST.W/2,my+22,24,'#3b2918');
    if(ST.phase==='run')ST.hits.push({key:'menu',x:mx-6,y:my-6,w:142,h:54,fn:()=>{sfx('menu',.7);stOpenMenu();}});
    if(ST.phase==='countdown'){
      const n=Math.max(1,Math.ceil(ST.countdown/.8)),frac=(ST.countdown%.8)/.8;
      g.globalAlpha=.5+.5*frac;stLabel(g,String(n),ST.W/2,ST.H*.42,200+70*frac,'#c0532f','rgba(255,255,255,.95)');g.globalAlpha=1;
    }
  }
  function stFrame(now){
    if(!ST.on)return;
    const dt=clamp((now-(ST.lastT||now))/1000,0,.05);ST.lastT=now;
    if(ST.phase!=='paused'){ST.acc=Math.min(.1,ST.acc+dt);while(ST.acc>=1/120){stStep(1/120);ST.acc-=1/120;}}
    stDraw(now,ST.phase==='paused'?0:dt);
    ST.raf=requestAnimationFrame(stFrame);
  }
  function stResize(){
    if(!ST.on)return;
    const r=$('stairsScreen').getBoundingClientRect();if(!r.width||!r.height)return;
    ST.W=1920;ST.H=Math.round(1920*r.height/r.width);
    stCanvas.style.width=r.width+'px';stCanvas.style.height=r.height+'px';
    // Whole-number scaling keeps the pixel tiles even, so this canvas may go up to the full 1920.
    const dpr=Math.min(window.devicePixelRatio||1,1.5,1920/Math.max(1,r.width)),px=Math.round(r.width*dpr);
    if(stCanvas.width!==px){stCanvas.width=px;stCanvas.height=Math.round(r.height*dpr);}
    stDraw(performance.now(),0);
  }
  let stObserver=null;
  function enterStairs(){
    $('menuScreen').hidden=true;$('gameScreen').hidden=true;$('stairsScreen').hidden=false;
    ST.on=true;ST.lastT=0;
    SH_FACES.forEach(id=>['neutral','sad','happy'].forEach(m=>shFace(id,m)));
    stObserver=new ResizeObserver(stResize);stObserver.observe($('stairsScreen'));
    stNew();stResize();
    ST.raf=requestAnimationFrame(stFrame);
  }
  function leaveStairs(){roundClose();
    ST.on=false;cancelAnimationFrame(ST.raf);
    if(stObserver){stObserver.disconnect();stObserver=null;}
    $('stairsScreen').hidden=true;$('stOverlay').hidden=true;ST.phase='idle';
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&ST.on&&location.hash!=='#debug')stOpenMenu();});

