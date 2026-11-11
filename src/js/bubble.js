  /* ---------- Puzzle Bubble: rules ---------- */
  const B_STAGES=[
    {id:'easy',name:'쉬움 3색',desc:'색이 적고 줄도 천천히 내려와요',colors:3,push:28,rows:4},
    {id:'std',name:'기본 4색',desc:'같은 얼굴 3개를 붙이면 터져요',colors:4,push:22,rows:4},
    {id:'fast',name:'빠른 천장',desc:'줄이 금방금방 내려와요',colors:4,push:12,rows:4},
    {id:'rock',name:'바위 판',desc:'바위는 안 터져요 · 붙은 곳을 끊으면 떨어져요',colors:4,push:22,rows:4,rocks:true},
    {id:'bomb',name:'폭탄 판',desc:'여섯 번째마다 폭탄! 닿은 곳 주변이 터져요',colors:5,push:22,rows:4,bomb:6},
  ];
  const B_R=40,B_D=80,B_H=B_D*.866,B_COLS=8,B_DEAD=11,B_W=B_D*8.5,B_LY=B_R+B_DEAD*B_H+B_D*1.45,B_FH=B_LY+B_D*1.22;
  const B_ROCK=9,B_BOMB=8,B_SPEED=1500,B_MAXANG=78*Math.PI/180;
  const B_FACES=['HOJA','NAHANSANG','SUMAKSAE','MURYEONG_KING','GWANGGAETO_KING'],B_TINT=['#e8574a','#3f8ee0','#49b35c','#f2c230','#9a63d6'];
  const bOdd=(f,r)=>((r+f.shift)&1)===1;
  const bX=(f,r,c)=>B_R+c*B_D+(bOdd(f,r)?B_R:0);
  const bY=r=>B_R+r*B_H;
  function bNeighbors(f,r,c){
    const o=bOdd(f,r)?1:0,list=[[r,c-1],[r,c+1],[r-1,c-1+o],[r-1,c+o],[r+1,c-1+o],[r+1,c+o]];
    return list.filter(([a,b])=>a>=0&&b>=0&&b<B_COLS);
  }
  const bGet=(f,r,c)=>(f.rows[r]?f.rows[r][c]:0)||0;
  function bSet(f,r,c,v){while(f.rows.length<=r)f.rows.push(new Array(B_COLS).fill(0));f.rows[r][c]=v;}
  function bCluster(f,r,c){
    const v=bGet(f,r,c),seen=new Set([r+','+c]),out=[[r,c]],st=[[r,c]];
    while(st.length){
      const [a,b]=st.pop();
      for(const [x,y] of bNeighbors(f,a,b)){
        const k=x+','+y;if(seen.has(k)||bGet(f,x,y)!==v)continue;
        seen.add(k);out.push([x,y]);st.push([x,y]);
      }
    }
    return out;
  }
  function bFloating(f){
    // Everything not chained back to the ceiling falls: this is the game's whole depth for a child.
    const seen=new Set(),st=[];
    for(let c=0;c<B_COLS;c++)if(bGet(f,0,c)){seen.add('0,'+c);st.push([0,c]);}
    while(st.length){
      const [a,b]=st.pop();
      for(const [x,y] of bNeighbors(f,a,b)){
        const k=x+','+y;if(seen.has(k)||!bGet(f,x,y))continue;
        seen.add(k);st.push([x,y]);
      }
    }
    const out=[];
    f.rows.forEach((row,r)=>row.forEach((v,c)=>{if(v&&!seen.has(r+','+c))out.push([r,c]);}));
    return out;
  }
  function bLowest(f){for(let r=f.rows.length-1;r>=0;r--)if(f.rows[r].some(Boolean))return r;return -1;}
  function bPresentColors(f){
    const s=new Set();for(const row of f.rows)for(const v of row)if(v>=1&&v<=5)s.add(v);return [...s];
  }
  function bRandomRow(stage,rng,rockChance){
    const row=new Array(B_COLS).fill(0);
    let prev=0;
    for(let c=0;c<B_COLS;c++){
      // Repeat the neighbour often so a fresh row always offers something to aim at.
      let v=prev&&rng()<.42?prev:1+Math.floor(rng()*stage.colors);
      if(rockChance&&rng()<rockChance)v=B_ROCK;
      row[c]=v;prev=v===B_ROCK?0:v;
    }
    return row;
  }
  function bPlaceSnap(f,x,y){
    // Nearest free hex to the impact point that still touches the ceiling or another bubble.
    let best=null,bd=Infinity;
    const r0=clamp(Math.round((y-B_R)/B_H),0,B_DEAD+2);
    for(let r=Math.max(0,r0-1);r<=r0+1;r++)for(let c=0;c<B_COLS;c++){
      if(bGet(f,r,c))continue;
      const ok=r===0||bNeighbors(f,r,c).some(([a,b])=>bGet(f,a,b));if(!ok)continue;
      const d=Math.hypot(bX(f,r,c)-x,bY(r)-y);
      if(d<bd){bd=d;best=[r,c];}
    }
    return best;
  }
  function bTrace(f,ang){
    // Shared by the aiming guide and the computer, so what the guide promises is what the shot does.
    let x=B_W/2,y=B_LY,vx=Math.sin(ang),vy=-Math.cos(ang);const pts=[[x,y]],step=B_R/3;
    for(let i=0;i<1400;i++){
      x+=vx*step;y+=vy*step;
      if(x<B_R){x=2*B_R-x;vx=-vx;pts.push([B_R,y]);}
      if(x>B_W-B_R){x=2*(B_W-B_R)-x;vx=-vx;pts.push([B_W-B_R,y]);}
      let hit=y<=B_R;
      if(!hit){
        const r0=Math.round((y-B_R)/B_H);
        for(let r=Math.max(0,r0-1);r<=r0+1&&!hit;r++){
          const row=f.rows[r];if(!row)continue;
          for(let c=0;c<B_COLS;c++)if(row[c]&&Math.hypot(bX(f,r,c)-x,bY(r)-y)<B_D*.86){hit=true;break;}
        }
      }
      if(hit){pts.push([x,y]);return {pts,cell:bPlaceSnap(f,x,y)};}
    }
    return {pts,cell:null};
  }
  function bEvaluate(f,cell,v){
    // Trial placement for the computer: how many bubbles would this shot remove?
    const [r,c]=cell;bSet(f,r,c,v);let score=0;
    if(v===B_BOMB){
      const blast=[[r,c],...bNeighbors(f,r,c)].filter(([a,b])=>bGet(f,a,b));score=blast.length*8;
    }else{
      const cl=bCluster(f,r,c);
      if(cl.length>=3){
        const saved=cl.map(([a,b])=>[a,b,bGet(f,a,b)]);cl.forEach(([a,b])=>{f.rows[a][b]=0;});
        const dropped=bFloating(f).length;saved.forEach(([a,b,w])=>{f.rows[a][b]=w;});
        score=cl.length*10+dropped*14;
      }else score=cl.length*3;
    }
    f.rows[r][c]=0;
    return score-(r>=B_DEAD-1?30:0)-r*.4;
  }

  /* ---------- Puzzle Bubble: match ---------- */
  let bubbleStage='std';
  const BB={on:false,raf:0,phase:'idle',resume:'playing',stage:null,fields:[],countdown:0,cShown:0,token:0,acc:0,lastT:0,sprites:[],faces:[],result:null,time:0};
  const bCanvases=[$('bField0'),$('bField1')],bCtx=bCanvases.map(c=>c.getContext('2d',{alpha:false}));
  B_FACES.forEach((id,i)=>{const im=new Image();im.addEventListener('load',bBuildSprites);im.src=characterPortrait(id);BB.faces[i]=im;});
  const bIsAI=i=>aiLevel>0&&i===1;
  function bRng(seed){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function bMakeField(i,seed,stage){
    const rng=bRng(seed),rows=[];
    for(let r=0;r<stage.rows;r++)rows.push(bRandomRow(stage,rng,stage.rocks?.08:0));
    return {i,rows,shift:0,rng:Math.random,stage,angle:0,pid:null,lastMove:0,shot:null,cur:0,next:0,shots:0,pushT:stage.push,slide:0,pending:0,score:0,lost:false,
      pops:[],falls:[],floats:[],trace:null,traceAng:null,aiT:1.2+Math.random()*.4,aiTarget:0,shake:0,flash:0,warned:false,combo:0,swapR:0};
  }
  function bDrawColor(f){
    const have=bPresentColors(f);
    return have.length?have[Math.floor(Math.random()*have.length)]:1+Math.floor(Math.random()*f.stage.colors);
  }
  function bNextBall(f){
    f.shots++;
    if(f.stage.bomb&&f.shots%f.stage.bomb===0)return B_BOMB;
    return bDrawColor(f);
  }
  function bFloat(f,x,y,text,color,size=44,ttl=1){f.floats.push({x,y,text,color,size,ttl,life:ttl});}
  function bNote(i,mood,note){
    $('bPortrait'+i).src=portraitFor(i,mood);
    if(note!==undefined)$('bNote'+i).textContent=note;
    const t=$('bTeam'+i);t.classList.toggle('react',mood==='happy'||mood==='surprised');t.classList.toggle('sad',mood==='sad'||mood==='angry');
  }
  function bSyncScores(){
    for(let i=0;i<2;i++){
      $('bScore'+i).textContent=BB.fields[i]?BB.fields[i].score:0;
      const p=BB.fields[i]?BB.fields[i].pending:0;
      $('bPending'+i).textContent=p>0?p+'줄 내려와요!':'';
    }
  }
  function bNewMatch(){
    BB.token++;
    const st=B_STAGES.find(s=>s.id===bubbleStage),seed=Math.floor(Math.random()*1e9);
    BB.stage=st;BB.fields=[bMakeField(0,seed,st),bMakeField(1,seed,st)];
    BB.fields.forEach(f=>{f.cur=bDrawColor(f);f.next=bDrawColor(f);});
    BB.result=null;BB.time=0;BB.phase='countdown';BB.countdown=2.4;BB.cShown=0;BB.acc=0;
    $('bOverlay').hidden=true;
    for(let i=0;i<2;i++){
      $('bName'+i).textContent=nameFor(i);
      $('bLabel'+i).textContent=aiLevel&&i===1?'COMPUTER · '+AI_LEVELS[aiLevel].label:i?'2P':'1P';
      bNote(i,'neutral','');
      const champ=streak.side===i&&streak.id===choices[i]&&streak.count>0;
      $('bStreak'+i).textContent=champ?(streak.count>=2?streak.count+'연승 중':'챔피언'):'';
    }
    $('bCaption').textContent='HOJA 퍼즐버블 · '+st.name;
    bSyncScores();bBuildSprites();
    setBgmTempo(1);playMood('action');
  }
  function bFire(f){
    if(f.shot||f.lost||BB.phase!=='playing')return;
    const ang=f.angle;
    f.shot={x:B_W/2,y:B_LY,vx:Math.sin(ang)*B_SPEED,vy:-Math.cos(ang)*B_SPEED,v:f.cur};
    f.cur=f.next;f.next=bNextBall(f);f.trace=null;sfx('zap',.5,1.25);
  }
  function bSwap(f){
    if(f.shot||f.lost||f.cur===f.next||BB.phase!=='playing')return;
    const a=f.cur;f.cur=f.next;f.next=a;f.swapR=1;f.trace=null;sfx('menu',.7,1.2);
  }
  function bPopTone(rate){
    // Synthesised: a pop is a very short pitch drop, so no sample file is needed for it.
    if(!ac||soundMode==='off'||ac.state!=='running')return;
    const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime,f0=480*rate;
    o.type='sine';o.frequency.setValueAtTime(f0*1.8,t);o.frequency.exponentialRampToValueAtTime(f0*.55,t+.09);
    g.gain.setValueAtTime(.34,t);g.gain.exponentialRampToValueAtTime(.001,t+.11);
    o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+.12);
  }
  function bRemove(f,cells,kind){
    cells.forEach(([r,c],k)=>{
      const v=bGet(f,r,c);if(!v)return;
      const x=bX(f,r,c),y=bY(r);
      f.rows[r][c]=0;
      if(kind==='pop')f.pops.push({x,y,v,t:-k*.035,life:.22});
      else f.falls.push({x,y,v,vx:(Math.random()-.5)*160,vy:-90-Math.random()*120,rot:0});
    });
  }
  function bSettle(f,r,c,v){
    bSet(f,r,c,v);sfx('tap',.55);
    let removed=0,dropped=0;
    if(v===B_BOMB){
      const blast=[[r,c],...bNeighbors(f,r,c)].filter(([a,b])=>bGet(f,a,b));
      for(const [a,b] of [...blast])for(const [x,y] of bNeighbors(f,a,b))if(bGet(f,x,y)&&!blast.some(([p,q])=>p===x&&q===y)&&Math.random()<.45)blast.push([x,y]);
      removed=blast.length;bRemove(f,blast,'pop');sfx('boom',.8);f.shake=.7;
    }else{
      const cl=bCluster(f,r,c);
      if(cl.length>=3){removed=cl.length;bRemove(f,cl,'pop');}
    }
    if(removed){
      const fl=bFloating(f);dropped=fl.length;bRemove(f,fl,'fall');
      for(let k=0;k<Math.min(5,removed);k++)setTimeout(()=>bPopTone(1+k*.16),k*38);
      const total=removed+dropped;
      f.score+=removed*10+dropped*20;
      // Big plays push rows onto the opponent; incoming rows get cancelled first, so defence is rewarded too.
      let attack=(total>=7?1+Math.floor((total-7)/6):0)+(dropped>=6?1:0);
      if(attack>0){
        const can=Math.min(attack,f.pending);f.pending-=can;attack-=can;
        if(attack>0){
          BB.fields[1-f.i].pending+=attack;
          bFloat(f,B_W/2,bY(Math.max(0,r-1)),attack+'줄 공격!',SIDE_COLOR[f.i],54,1.1);
          sfx('smash',.8);bNote(f.i,'happy','받아라!');bNote(1-f.i,'surprised','온다!');
        }else bFloat(f,B_W/2,bY(Math.max(0,r-1)),'방어!',SIDE_COLOR[f.i],48,.9);
      }else if(dropped>=2){bFloat(f,bX(f,r,c),bY(r)-50,dropped+'개 떨어짐!',SIDE_COLOR[f.i],42,.9);}
      if(bLowest(f)<0){
        f.score+=300;BB.fields[1-f.i].pending+=2;bFloat(f,B_W/2,B_LY*.45,'올 클리어!','#c0532f',72,1.5);sfx('goal',1);cheer(.8);bNote(f.i,'happy','싹 비웠다!');
        const rng=Math.random;for(let k=0;k<3;k++)f.rows.unshift(bRandomRow(f.stage,rng,0)),f.shift^=1;
      }
    }
    bSyncScores();
    // Rows owed from the opponent land between shots, never mid-flight, so a shot's result is always fair.
    if(f.pending>0){f.pending--;bPushRow(f,true);bSyncScores();}
    bCheckLoss(f);
    if(f.cur!==B_BOMB&&bPresentColors(f).length&&!bPresentColors(f).includes(f.cur))f.cur=bDrawColor(f);
    if(f.next!==B_BOMB&&bPresentColors(f).length&&!bPresentColors(f).includes(f.next))f.next=bDrawColor(f);
  }
  function bPushRow(f,hostile){
    f.rows.unshift(bRandomRow(f.stage,Math.random,f.stage.rocks?.08:0));f.shift^=1;f.slide=B_H;f.trace=null;
    while(f.rows.length>B_DEAD+3)f.rows.pop();
    if(hostile){f.shake=Math.max(f.shake,.6);sfx('low',.7);}else sfx('soft',.6);
    if(f.shot){bCheckLoss(f);return;}
  }
  function bCheckLoss(f){
    if(f.lost||BB.phase!=='playing')return;
    const low=bLowest(f);
    if(low>=B_DEAD){f.lost=true;bEnd(1-f.i);return;}
    const danger=low>=B_DEAD-2;
    if(danger&&!f.warned){bNote(f.i,'surprised','위험해!');sfx('item',.7,.8);}
    f.warned=danger;
  }
  function bEnd(w){
    BB.phase='over';BB.result=w;
    BB.fields.forEach(f=>{f.shot=null;f.pid=null;f.trace=null;});
    const loser=BB.fields[1-w];
    loser.rows.forEach((row,r)=>row.forEach((v,c)=>{if(v){loser.falls.push({x:bX(loser,r,c),y:bY(r),v,vx:(Math.random()-.5)*260,vy:-120-Math.random()*220,rot:0});row[c]=0;}}));
    const repeat=streak.side===w&&streak.id===choices[w];
    streak={side:w,id:choices[w],count:repeat?streak.count+1:1};
    hofWin('bubble',w);
    bNote(w,'happy','이겼다!');bNote(1-w,'sad','아쉬워…');
    sfx('goal',1.1);sfx('boom',.9);cheer(1.1);victoryJingle();
    const title=streak.count>=2?`${nameFor(w)} ${streak.count}연승!`:`${nameFor(w)} 승리!`;
    const detail=`${BB.fields[0].score} : ${BB.fields[1].score}점 · ${Math.ceil(BB.time)}초`;
    const next=button('다음 도전자 ▶','primary',()=>{leaveBubble();enterSelection();});
    const again=button('↻ 바로 재대결','',()=>{bNewMatch();});
    const home=button('← 모음집','',()=>{streak={side:-1,id:null,count:0};leaveBubble();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});});
    // Both children are mid-swing when a match ends; hold the buttons off so a stray lift doesn't skip it.
    [next,again,home].forEach(b=>{b.disabled=true;setTimeout(()=>{b.disabled=false;},1900);});
    setTimeout(()=>{if(BB.on&&BB.phase==='over')bOverlay(title,detail,[next,again,home]);},1100);
  }
  function bOverlay(title,detail,actions){
    $('bOverlay').hidden=false;$('bOverlayTitle').textContent=title;$('bOverlayDetail').textContent=detail;
    $('bOverlayActions').replaceChildren(...actions);
  }
  function bOpenMenu(){
    if(BB.phase==='over'||BB.phase==='paused'||!BB.on)return;
    BB.resume=BB.phase;BB.phase='paused';BB.fields.forEach(f=>{f.pid=null;});
    const label=()=>soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';
    const sound=button(label(),'',()=>{cycleSound();sound.textContent=label();});
    bOverlay('잠깐 쉬는 중','',[
      button('▶ 계속','primary',()=>{$('bOverlay').hidden=true;BB.phase=BB.resume;}),
      button('↻ 다시 하기','',()=>{bNewMatch();}),
      button('인물 변경','',()=>{leaveBubble();enterSelection();}),
      button('← 모음집','',()=>{leaveBubble();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});}),
      sound,
    ]);
  }
  /* ---------- Puzzle Bubble: computer ---------- */
  const B_AI=[null,{think:3,jitter:.14,noise:28,turn:1.4},{think:1.9,jitter:.05,noise:8,turn:3},{think:1,jitter:.01,noise:1,turn:6}];
  function bAiStep(f,dt){
    const lv=B_AI[aiLevel];
    f.angle+=clamp(f.aiTarget-f.angle,-lv.turn*dt,lv.turn*dt);
    f.aiT-=dt;
    if(f.aiT>0||f.shot)return;
    if(!f.aiChosen){
      let best=-Infinity,pick=0;
      for(const v of (f.next!==f.cur?[f.cur,f.next]:[f.cur])){
        for(let a=-B_MAXANG;a<=B_MAXANG;a+=.035){
          const t=bTrace(f,a);if(!t.cell)continue;
          const s=bEvaluate(f,t.cell,v)+Math.random()*lv.noise;
          if(s>best){best=s;pick={a,v};}
        }
      }
      if(pick&&pick.v!==f.cur)bSwap(f);
      f.aiTarget=clamp((pick?pick.a:0)+(Math.random()*2-1)*lv.jitter,-B_MAXANG,B_MAXANG);
      f.aiChosen=true;f.aiT=Math.min(.55,lv.think*.3);
      return;
    }
    if(Math.abs(f.aiTarget-f.angle)<.012){f.angle=f.aiTarget;bFire(f);f.aiChosen=false;f.aiT=lv.think*(.8+Math.random()*.4);}
  }
  /* ---------- Puzzle Bubble: simulation ---------- */
  function bStepField(f,dt){
    if(f.slide>0)f.slide=Math.max(0,f.slide-dt*B_H*3.2);
    f.pushT-=dt;
    if(f.pushT<=0&&!f.shot){
      f.pushT=Math.max(f.stage.push*.6,f.stage.push-BB.time*.04);
      bPushRow(f,false);bCheckLoss(f);if(BB.phase!=='playing')return;
    }
    if(bIsAI(f.i))bAiStep(f,dt);
    const s=f.shot;if(!s)return;
    const sub=Math.max(1,Math.ceil(B_SPEED*dt/(B_R*.5))),h=dt/sub;
    for(let k=0;k<sub;k++){
      s.x+=s.vx*h;s.y+=s.vy*h;
      if(s.x<B_R){s.x=2*B_R-s.x;s.vx=Math.abs(s.vx);sfx('rail',.25);}
      if(s.x>B_W-B_R){s.x=2*(B_W-B_R)-s.x;s.vx=-Math.abs(s.vx);sfx('rail',.25);}
      let hit=s.y<=B_R;
      if(!hit){
        const r0=Math.round((s.y-B_R)/B_H);
        for(let r=Math.max(0,r0-1);r<=r0+1&&!hit;r++){
          const row=f.rows[r];if(!row)continue;
          for(let c=0;c<B_COLS;c++)if(row[c]&&Math.hypot(bX(f,r,c)-s.x,bY(r)-s.y)<B_D*.86){hit=true;break;}
        }
      }
      if(hit){
        const cell=bPlaceSnap(f,s.x,s.y);f.shot=null;f.trace=null;
        if(cell)bSettle(f,cell[0],cell[1],s.v);
        return;
      }
    }
  }
  function bStep(dt){
    if(BB.phase==='countdown'){
      BB.countdown-=dt;
      const show=Math.ceil(BB.countdown/.8);
      if(show!==BB.cShown&&show>0){BB.cShown=show;sfx('menu',1,1+(3-show)*.16);}
      if(BB.countdown<=0){BB.phase='playing';sfx('goal',.9);}
      return;
    }
    if(BB.phase!=='playing')return;
    BB.time+=dt;
    for(const f of BB.fields){bStepField(f,dt);if(BB.phase!=='playing')return;}
  }
  /* ---------- Puzzle Bubble: touch ---------- */
  function bLocal(i,e){
    const r=bCanvases[i].getBoundingClientRect();
    const nx=(e.clientX-r.left)/r.width,ny=(e.clientY-r.top)/r.height,turned=TABLET&&i===1;
    return {x:(turned?1-nx:nx)*B_W,y:(turned?1-ny:ny)*B_FH};
  }
  function bAimAt(f,p){
    const dx=p.x-B_W/2,dy=B_LY-p.y;
    if(Math.hypot(dx,dy)<34)return;
    // Pointing below the launcher still aims upward on that side, so a low reach is never a dead touch.
    f.angle=clamp(Math.atan2(dx,Math.max(dy,6)),-B_MAXANG,B_MAXANG);
    f.lastMove=performance.now();f.trace=null;
  }
  const bInNext=p=>Math.hypot(p.x-(B_W/2+B_D*2.1),p.y-(B_LY+B_D*.08))<B_D*.78;
  bCanvases.forEach((cv,i)=>{
    cv.addEventListener('pointerdown',e=>{
      if(!BB.on||(BB.phase!=='playing'&&BB.phase!=='countdown')||bIsAI(i))return;
      if(e.pointerType==='mouse'&&e.button!==0)return;
      e.preventDefault();
      const f=BB.fields[i],p=bLocal(i,e);
      if(bInNext(p)){bSwap(f);return;}
      if(f.pid!==null&&performance.now()-f.lastMove<160)return;
      f.pid=e.pointerId;bAimAt(f,p);
      try{cv.setPointerCapture(e.pointerId);}catch{}
    },{passive:false});
    cv.addEventListener('pointermove',e=>{
      const f=BB.fields[i];if(!f||e.pointerId!==f.pid)return;
      e.preventDefault();bAimAt(f,bLocal(i,e));
    },{passive:false});
    const up=(e,cancel)=>{
      const f=BB.fields[i];if(!f||e.pointerId!==f.pid)return;
      f.pid=null;
      if(!cancel)bFire(f);
    };
    cv.addEventListener('pointerup',e=>up(e,false));
    cv.addEventListener('pointercancel',e=>up(e,true));
  });
  /* ---------- Puzzle Bubble: drawing ---------- */
  function bBuildSprites(){
    const S=Math.ceil(bCanvases[0].width/B_W*B_D)||80;
    BB.sprites=[];
    for(let v=1;v<=5;v++){
      const c=document.createElement('canvas');c.width=c.height=S;
      const g=c.getContext('2d'),r=S/2,tint=B_TINT[v-1];
      g.beginPath();g.arc(r,r,r-S*.0225-.5,0,Math.PI*2);g.fillStyle=tint;g.fill();
      g.lineWidth=S*.045;g.strokeStyle='rgba(30,30,40,.55)';g.stroke();
      const im=BB.faces[v-1];
      if(im&&im.complete&&im.naturalWidth){
        const fr=r*.7;g.save();g.beginPath();g.arc(r,r,fr,0,Math.PI*2);g.clip();g.fillStyle='#fff9ee';g.fillRect(0,0,S,S);g.drawImage(im,r-fr*1.15,r-fr*1.15,fr*2.3,fr*2.3);g.restore();
      }
      const shine=g.createRadialGradient(r*.65,r*.5,1,r*.65,r*.5,r*.65);shine.addColorStop(0,'rgba(255,255,255,.55)');shine.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=shine;g.beginPath();g.arc(r,r,r-2,0,Math.PI*2);g.fill();
      BB.sprites[v]=c;
    }
    const rock=document.createElement('canvas');rock.width=rock.height=S;
    {const g=rock.getContext('2d'),r=S/2;const gr=g.createRadialGradient(r*.7,r*.6,2,r,r,r);gr.addColorStop(0,'#a9a59b');gr.addColorStop(1,'#5a564e');
      g.beginPath();g.arc(r,r,r-S*.025-.5,0,Math.PI*2);g.fillStyle=gr;g.fill();g.lineWidth=S*.05;g.strokeStyle='#37332c';g.stroke();
      g.strokeStyle='rgba(40,36,30,.6)';g.lineWidth=S*.03;g.beginPath();g.moveTo(r*.5,r*.7);g.lineTo(r*.95,r*1.05);g.lineTo(r*.8,r*1.5);g.moveTo(r*.95,r*1.05);g.lineTo(r*1.5,r*.95);g.stroke();}
    BB.sprites[B_ROCK]=rock;
    const bomb=document.createElement('canvas');bomb.width=bomb.height=S;
    {const g=bomb.getContext('2d'),r=S/2;const gr=g.createRadialGradient(r*.7,r*.6,2,r,r,r);gr.addColorStop(0,'#62626e');gr.addColorStop(1,'#14141c');
      g.beginPath();g.arc(r,r*1.05,r*.86,0,Math.PI*2);g.fillStyle=gr;g.fill();
      g.strokeStyle='#c98f3b';g.lineWidth=S*.07;g.beginPath();g.moveTo(r*1.2,r*.45);g.quadraticCurveTo(r*1.45,r*.1,r*1.75,r*.3);g.stroke();
      g.fillStyle='#ffd25a';g.beginPath();g.arc(r*1.75,r*.3,S*.07,0,Math.PI*2);g.fill();
      g.fillStyle='#fff';g.font=`${S*.34}px "HojaTitle",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('펑',r,r*1.1);}
    BB.sprites[B_BOMB]=bomb;
  }
  function bDrawBall(g,v,x,y,scale=1,alpha=1){
    const s=BB.sprites[v];if(!s)return;
    const S=B_D*scale;g.globalAlpha=alpha;g.drawImage(s,x-S/2,y-S/2,S,S);g.globalAlpha=1;
  }
  function bText(g,str,x,y,size,color){
    g.font=`${size}px "HojaTitle",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
    g.lineWidth=size*.22;g.strokeStyle='rgba(255,255,255,.96)';g.strokeText(str,x,y);g.fillStyle=color;g.fillText(str,x,y);
  }
  function bDrawField(f,now,dt){
    const g=bCtx[f.i],cv=bCanvases[f.i],k=cv.width/B_W;
    const sh=f.shake>.01&&!reducedMotion?(Math.random()-.5)*f.shake*16:0;
    f.shake=Math.max(0,f.shake-dt*1.6);
    g.setTransform(k,0,0,k,0,0);
    const bg=g.createLinearGradient(0,0,0,B_FH);
    if(f.i===0){bg.addColorStop(0,'#2d6f78');bg.addColorStop(.62,'#7fc3b8');bg.addColorStop(1,'#d8efe6');}
    else{bg.addColorStop(0,'#8a4f55');bg.addColorStop(.62,'#e3a792');bg.addColorStop(1,'#fbe6dc');}
    g.fillStyle=bg;g.fillRect(0,0,B_W,B_FH);
    g.translate(sh,0);
    // Deadline
    const low=bLowest(f),deadY=bY(B_DEAD)-B_R,danger=low>=B_DEAD-2;
    g.save();g.strokeStyle=danger?(Math.floor(now/180)%2?'#ff3b2f':'#ffffff'):'rgba(255,255,255,.75)';g.lineWidth=danger?8:4;g.setLineDash([22,16]);
    g.beginPath();g.moveTo(0,deadY);g.lineTo(B_W,deadY);g.stroke();g.restore();
    // Stack
    const slide=f.slide;
    for(let r=0;r<f.rows.length;r++){
      const row=f.rows[r];
      for(let c=0;c<B_COLS;c++)if(row[c])bDrawBall(g,row[c],bX(f,r,c),bY(r)-slide);
    }
    // Pops and falls
    for(let q=f.pops.length-1;q>=0;q--){
      const p=f.pops[q];p.t+=dt;if(p.t>=p.life){f.pops.splice(q,1);continue;}
      if(p.t<0){bDrawBall(g,p.v,p.x,p.y);continue;}
      const t=p.t/p.life;bDrawBall(g,p.v,p.x,p.y,1+.5*t,1-t);
      g.strokeStyle=p.v<=5?B_TINT[p.v-1]:'#ffd25a';g.lineWidth=7*(1-t)+1;g.globalAlpha=1-t;g.beginPath();g.arc(p.x,p.y,B_R*(1+t*1.3),0,Math.PI*2);g.stroke();g.globalAlpha=1;
    }
    for(let q=f.falls.length-1;q>=0;q--){
      const p=f.falls[q];p.vy+=1900*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.y>B_FH+B_D){f.falls.splice(q,1);continue;}
      bDrawBall(g,p.v,p.x,p.y);
    }
    // Aim guide and landing spot
    if(!f.lost&&BB.phase!=='over'&&!f.shot&&(f.pid!==null||BB.phase==='countdown'||!bIsAI(f.i))&&!bIsAI(f.i)){
      if(f.traceAng!==f.angle||!f.trace){f.trace=bTrace(f,f.angle);f.traceAng=f.angle;}
      const t=f.trace,alpha=f.pid!==null?1:.4;
      g.save();g.globalAlpha=alpha;g.fillStyle=f.i===0?'#0f4b45':'#a84e36';
      let carry=(now/28)%44;
      for(let n=1;n<t.pts.length;n++){
        const [ax,ay]=t.pts[n-1],[bx,by]=t.pts[n],L=Math.hypot(bx-ax,by-ay);
        let d=carry;while(d<L){const q=d/L;g.beginPath();g.arc(ax+(bx-ax)*q,ay+(by-ay)*q,7,0,Math.PI*2);g.fill();d+=44;}
        carry=d-L;
      }
      if(t.cell&&f.pid!==null){
        const x=bX(f,t.cell[0],t.cell[1]),y=bY(t.cell[0]);
        g.lineWidth=6;g.strokeStyle=f.cur<=5?B_TINT[f.cur-1]:'#ffd25a';g.setLineDash([12,9]);g.beginPath();g.arc(x,y,B_R-4,0,Math.PI*2);g.stroke();
      }
      g.restore();
    }
    if(f.shot)bDrawBall(g,f.shot.v,f.shot.x,f.shot.y);
    // Launcher
    g.save();g.translate(B_W/2,B_LY);
    const base=g.createRadialGradient(0,0,10,0,0,B_D*.95);base.addColorStop(0,f.i===0?'#2f9c8c':'#e0694f');base.addColorStop(1,f.i===0?'#14574f':'#94402d');
    g.fillStyle=base;g.beginPath();g.arc(0,0,B_D*.82,0,Math.PI*2);g.fill();g.lineWidth=6;g.strokeStyle='rgba(255,255,255,.7)';g.stroke();
    g.rotate(f.angle);g.fillStyle='#f3e5c0';g.strokeStyle='#4b3e35';g.lineWidth=5;g.beginPath();g.moveTo(-20,-B_D*.72);g.lineTo(0,-B_D*1.08);g.lineTo(20,-B_D*.72);g.closePath();g.fill();g.stroke();
    g.restore();
    if(!f.shot&&!f.lost)bDrawBall(g,f.cur,B_W/2,B_LY);
    // Next bubble: also the swap button
    const nx=B_W/2+B_D*2.1,ny=B_LY+B_D*.08;
    g.fillStyle='rgba(255,255,255,.72)';g.beginPath();g.arc(nx,ny,B_D*.66,0,Math.PI*2);g.fill();g.lineWidth=4;g.strokeStyle='#4b3e35';g.stroke();
    if(f.swapR>0)f.swapR=Math.max(0,f.swapR-dt*5);
    bDrawBall(g,f.next,nx,ny,.78+f.swapR*.2);
    if(!bIsAI(f.i)){
      g.font='22px "HojaBody",sans-serif';g.fillStyle='#3b3229';g.textAlign='center';g.textBaseline='middle';
      g.fillText('눌러서 바꾸기',nx,ny+B_D*.82);
      g.fillText('끌어서 조준, 떼면 발사',B_W/2-B_D*2.1,B_LY+B_D*.08);
    }
    if(f.pending>0){
      g.fillStyle='#c0392b';g.font='30px "HojaTitle",sans-serif';g.textAlign='center';
      g.fillText('▼'.repeat(Math.min(6,f.pending)),B_W/2,deadY+34);
    }
    for(let q=f.floats.length-1;q>=0;q--){
      const p=f.floats[q];p.ttl-=dt;if(p.ttl<=0){f.floats.splice(q,1);continue;}
      g.globalAlpha=Math.min(1,p.ttl*3);bText(g,p.text,clamp(p.x,160,B_W-160),clamp(p.y-(p.life-p.ttl)*40,50,B_FH-50),p.size,p.color);g.globalAlpha=1;
    }
    if(BB.phase==='countdown'){
      const n=Math.max(1,Math.ceil(BB.countdown/.8)),frac=(BB.countdown%.8)/.8;
      g.globalAlpha=.5+.5*frac;bText(g,String(n),B_W/2,B_LY*.62,190+70*frac,f.i===0?SIDE_COLOR[0]:SIDE_COLOR[1]);g.globalAlpha=1;
    }
    if(BB.phase==='over'&&BB.result!==null){
      bText(g,BB.result===f.i?'승리!':'아쉬워!',B_W/2,B_LY*.3,110,BB.result===f.i?'#c0532f':'#5c5243');
    }
    g.setTransform(1,0,0,1,0,0);
  }
  function bFrame(now){
    if(!BB.on)return;
    const dt=clamp((now-(BB.lastT||now))/1000,0,.05);BB.lastT=now;
    if(BB.phase!=='paused'){
      BB.acc=Math.min(.06,BB.acc+dt);
      while(BB.acc>=1/120){bStep(1/120);BB.acc-=1/120;}
    }
    BB.fields.forEach(f=>bDrawField(f,now,BB.phase==='paused'?0:dt));
    BB.raf=requestAnimationFrame(bFrame);
  }
  function bResize(){
    if(!BB.on)return;
    const r=$('bPlay').getBoundingClientRect();if(!r.height)return;
    const aspect=B_W/B_FH,portrait=r.height>r.width;
    const h=Math.floor(!TABLET?Math.min(r.height-6,(r.width*.36)/aspect):portrait?Math.min((r.height-24)/2,(r.width-190)/aspect):Math.min(r.height-12,(r.width-124)/2/aspect)),w=Math.floor(h*aspect);
    for(const cv of bCanvases){
      cv.style.width=w+'px';cv.style.height=h+'px';
      const px=Math.round(w*Math.min(window.devicePixelRatio||1,1.5,900/Math.max(1,w)));
      if(cv.width!==px){cv.width=px;cv.height=Math.round(px*B_FH/B_W);}
    }
    bBuildSprites();
    if(BB.fields.length)BB.fields.forEach(f=>bDrawField(f,performance.now(),0));
  }
  let bObserver=null;
  function enterBubble(){
    $('menuScreen').hidden=true;$('gameScreen').hidden=true;$('bubbleScreen').hidden=false;
    BB.on=true;BB.lastT=0;
    bObserver=new ResizeObserver(bResize);bObserver.observe($('bPlay'));
    bNewMatch();bResize();
    BB.raf=requestAnimationFrame(bFrame);
  }
  function leaveBubble(){roundClose();
    BB.on=false;BB.token++;cancelAnimationFrame(BB.raf);
    if(bObserver){bObserver.disconnect();bObserver=null;}
    $('bubbleScreen').hidden=true;$('bOverlay').hidden=true;BB.phase='idle';
  }
  $('bMenu').addEventListener('click',()=>{sfx('menu',.7);bOpenMenu();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&BB.on&&location.hash!=='#debug')bOpenMenu();});

