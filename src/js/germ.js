  /* ---------- Germ war: rules ---------- */
  const X_STAGES=[
    {id:'mini',name:'작은 판 5×5',desc:'빨리 끝나요 · 저학년에게 좋아요',n:5},
    {id:'std',name:'정식 7×7',desc:'한 칸 가면 복제, 두 칸 가면 점프! 닿은 상대를 감염시켜요',n:7},
    {id:'holes',name:'구멍 판',desc:'구멍 칸에는 들어갈 수 없어요 · 점프로 넘어가요',n:7,walls:[[2,2],[4,2],[2,4],[4,4]]},
    {id:'cross',name:'십자 벽',desc:'가운데 벽을 넘어 점프해야 해요',n:7,walls:[[3,1],[3,2],[3,3],[3,4],[3,5],[1,3],[2,3],[4,3],[5,3]]},
    {id:'clock',name:'15초 승부',desc:'한 수에 15초 · 넘기면 자동으로 움직여요',n:7,clock:15},
  ];
  const X_WALL=-1;
  function xStart(stage){
    const n=stage.n,b=new Int8Array(n*n),last=n-1;
    b[0]=1;b[last*n+last]=1;b[last]=2;b[last*n]=2;
    for(const [x,y] of stage.walls||[])b[y*n+x]=X_WALL;
    return b;
  }
  function xGeo(n){
    // Clones and jumps per cell, computed once: move generation runs thousands of times per computer turn.
    const near=[],far=[];
    for(let c=0;c<n*n;c++){
      const x=c%n,y=Math.floor(c/n),a=[],d=[];
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        if(!dx&&!dy)continue;
        const i=x+dx,j=y+dy;if(i<0||j<0||i>=n||j>=n)continue;
        (Math.max(Math.abs(dx),Math.abs(dy))===1?a:d).push(j*n+i);
      }
      near.push(a);far.push(d);
    }
    return {n,near,far};
  }
  function xMoves(b,geo,p){
    // A clone is the same move from any neighbour, so it appears once with from=-1.
    const out=[];
    for(let t=0;t<b.length;t++){
      if(b[t]!==0)continue;
      if(geo.near[t].some(i=>b[i]===p))out.push({from:-1,to:t});
      for(const f of geo.far[t])if(b[f]===p)out.push({from:f,to:t});
    }
    return out;
  }
  function xHasMove(b,geo,p){
    for(let t=0;t<b.length;t++){
      if(b[t]!==0)continue;
      if(geo.near[t].some(i=>b[i]===p)||geo.far[t].some(i=>b[i]===p))return true;
    }
    return false;
  }
  function xApply(b,geo,m,p){
    const opp=3-p,flips=[];
    if(m.from>=0)b[m.from]=0;
    b[m.to]=p;
    for(const i of geo.near[m.to])if(b[i]===opp){b[i]=p;flips.push(i);}
    return flips;
  }
  function xRevert(b,m,p,flips){
    const opp=3-p;
    for(const i of flips)b[i]=opp;
    b[m.to]=0;if(m.from>=0)b[m.from]=p;
  }
  function xCount(b){let a=0,d=0;for(let i=0;i<b.length;i++){if(b[i]===1)a++;else if(b[i]===2)d++;}return [a,d];}
  /* ---------- Germ war: computer ---------- */
  function xGain(b,geo,m,p){
    let g=m.from<0?1:0;
    for(const i of geo.near[m.to])if(b[i]===3-p)g++;
    return g;
  }
  function xSearch(b,geo,me,maxDepth,budgetMs){
    const deadline=performance.now()+budgetMs,STOP={};let ticks=0;
    const score=p=>{const [a,d]=xCount(b);return (p===1?a-d:d-a);};
    const nega=(p,depth,alpha,beta)=>{
      if((++ticks&127)===0&&performance.now()>deadline)throw STOP;
      if(depth===0)return score(p);
      const ms=xMoves(b,geo,p);
      if(!ms.length)return -score(3-p);
      ms.sort((x,y)=>xGain(b,geo,y,p)-xGain(b,geo,x,p));
      let best=-Infinity;
      for(const m of ms.slice(0,14)){
        const fl=xApply(b,geo,m,p);const v=-nega(3-p,depth-1,-beta,-alpha);xRevert(b,m,p,fl);
        if(v>best)best=v;if(v>alpha)alpha=v;if(alpha>=beta)break;
      }
      return best;
    };
    let ms=xMoves(b,geo,me).sort((x,y)=>xGain(b,geo,y,me)-xGain(b,geo,x,me)),pick=ms[0];
    try{
      for(let d=1;d<=maxDepth;d++){
        let top=-Infinity,best=ms[0];
        for(const m of ms){
          const fl=xApply(b,geo,m,me);let v;
          try{v=-nega(3-me,d-1,-Infinity,-top);}finally{xRevert(b,m,me,fl);}
          if(v>top){top=v;best=m;}
        }
        pick=best;ms=[best,...ms.filter(x=>x!==best)];
      }
    }catch(e){if(e!==STOP)throw e;}
    return pick;
  }
  function xAiMove(b,geo,me,level){
    const ms=xMoves(b,geo,me);if(!ms.length)return null;
    if(level===1){
      // Beginner: likes a big capture, but only looks half the time.
      if(Math.random()<.55)return ms[Math.floor(Math.random()*ms.length)];
      return ms.reduce((x,y)=>xGain(b,geo,y,me)+Math.random()>xGain(b,geo,x,me)+Math.random()?y:x);
    }
    const work=Int8Array.from(b);
    return level===2?xSearch(work,geo,me,2,120):xSearch(work,geo,me,8,360);
  }

  /* ---------- Germ war: match ---------- */
  let germStage='std';
  const GX={on:false,raf:0,stage:null,geo:null,board:null,show:null,turn:1,phase:'idle',resume:'human',sel:-1,moves:[],hover:-1,pid:null,dragFrom:-1,hints:[2,2],undos:2,hint:null,hintUntil:0,timer:0,token:0,history:[],anim:[],hop:null,jumpRun:0,last:-1,banner:null,sparks:[],floats:[],sprites:[null,null],faces:[new Image(),new Image()],bg:null,bgDirty:true,px:{m:0,cell:0},lastT:0,displayed:[2,2],seed:Math.random()*100};
  const xCanvas=$('gxBoard'),xctx=xCanvas.getContext('2d',{alpha:false});
  GX.faces.forEach(im=>im.addEventListener('load',()=>xBuildSprites()));
  const xIsAI=p=>aiLevel>0&&p===2;
  function xMood(p,mood,note){
    const i=p-1;$('gxPortrait'+i).src=portraitFor(i,mood);
    const t=$('gxTeam'+i);t.classList.toggle('react',mood==='happy'||mood==='surprised');t.classList.toggle('sad',mood==='sad'||mood==='angry');
    if(note!==undefined)$('gxNote'+i).textContent=note;
  }
  function xSync(){
    for(let i=0;i<2;i++){
      const mine=GX.turn===i+1&&(GX.phase==='human'||GX.phase==='ai');
      $('gxSide'+i).classList.toggle('active',mine);$('gxTeam'+i).classList.toggle('turn',mine);
      $('gxScore'+i).textContent=GX.displayed[i];
      const human=!xIsAI(i+1),h=$('gxHint'+i),u=$('gxUndo'+i);
      h.hidden=!human;h.textContent='힌트 '+GX.hints[i];h.disabled=!(mine&&GX.phase==='human'&&GX.hints[i]>0);
      u.hidden=!(aiLevel>0&&human);u.textContent='무르기 '+GX.undos;u.disabled=!(GX.undos>0&&GX.history.length>0&&(GX.phase==='human'||GX.phase==='ai'));
      $('gxTurnLabel'+i).textContent=mine?(GX.phase==='ai'?'생각 중…':'내 차례!'):'';
      $('gxTip'+i).textContent=mine&&GX.phase==='human'?(GX.sel>=0?'초록 칸은 복제, 노란 칸은 점프':'내 세균을 눌러요'):'';
    }
    $('gxCaption').textContent='HOJA 세균전 · '+(GX.stage?GX.stage.name:'');
    $('gxTurnText').textContent=(GX.phase==='human'||GX.phase==='ai')?nameFor(GX.turn-1)+' 차례':'';
    $('gxTurnText').className='game-time o-turn side'+(GX.turn-1);
    const left=GX.board?GX.board.reduce((s,v)=>s+(v===0?1:0),0):0;
    $('gxLeft').textContent='빈칸 '+left;
  }
  function xNewMatch(){
    GX.token++;clearTimeout(GX.aiTimer);
    const st=X_STAGES.find(s=>s.id===germStage);
    GX.stage=st;GX.geo=xGeo(st.n);GX.board=xStart(st);GX.show=Int8Array.from(GX.board);
    GX.sel=-1;GX.hover=-1;GX.pid=null;GX.dragFrom=-1;GX.hints=[2,2];GX.undos=2;GX.hint=null;GX.history=[];GX.anim=[];GX.hop=null;GX.jumpRun=0;GX.last=-1;GX.banner=null;GX.sparks=[];GX.floats=[];
    GX.displayed=xCount(GX.board);GX.bgDirty=true;$('gxOverlay').hidden=true;
    for(let i=0;i<2;i++){
      $('gxName'+i).textContent=nameFor(i);GX.faces[i].src=portraitFor(i);
      $('gxLabel'+i).textContent=aiLevel&&i===1?'COMPUTER · '+AI_LEVELS[aiLevel].label:i?'PLAYER 2 · 오른쪽':'PLAYER 1 · 왼쪽';
      const champ=streak.side===i&&streak.id===choices[i]&&streak.count>0;
      $('gxStreak'+i).textContent=champ?(streak.count>=2?streak.count+'연승 중':'챔피언'):'';
      $('gxTeam'+i).classList.toggle('champion',champ);
      xMood(i+1,'neutral',aiLevel&&i===1?'컴퓨터 상대':'퍼뜨려 보자!');
    }
    xBuildSprites();
    const first=Math.random()<.5?1:2;GX.turn=first;GX.phase='opening';xSync();
    GX.banner={text:nameFor(first-1)+' 먼저!',color:SIDE_COLOR[first-1],until:performance.now()+1100,ms:1100};sfx('goal',.6);
    const tk=GX.token;setTimeout(()=>{if(GX.on&&tk===GX.token&&GX.phase==='opening')xBeginTurn(first);},1150);
    playMood('calm');
  }
  function xBeginTurn(p){
    GX.turn=p;GX.sel=-1;GX.hover=-1;GX.pid=null;GX.dragFrom=-1;GX.hint=null;
    GX.moves=xMoves(GX.board,GX.geo,p);
    GX.phase=xIsAI(p)?'ai':'human';
    GX.timer=GX.stage.clock&&GX.phase==='human'?GX.stage.clock:0;
    xSync();
    if(GX.phase==='ai'){
      const tk=GX.token;
      GX.aiTimer=setTimeout(()=>{
        if(!GX.on||tk!==GX.token||GX.phase!=='ai')return;
        const m=xAiMove(GX.board,GX.geo,p,aiLevel);if(m)xPlay(m);
      },650+Math.random()*300);
    }
  }
  function xPlay(m){
    const p=GX.turn,geo=GX.geo,now=performance.now();
    GX.history.push({board:Int8Array.from(GX.board),turn:p,last:GX.last,jumpRun:GX.jumpRun});
    const src=m.from>=0?m.from:geo.near[m.to].find(i=>GX.board[i]===p);
    const flips=xApply(GX.board,geo,m,p);
    GX.jumpRun=m.from>=0&&!flips.length?GX.jumpRun+1:0;
    GX.last=m.to;GX.sel=-1;GX.hover=-1;GX.pid=null;GX.dragFrom=-1;GX.hint=null;GX.timer=0;GX.phase='anim';
    GX.hop={from:src,to:m.to,p,t0:now,dur:m.from>=0?260:170,jump:m.from>=0};
    if(m.from>=0)GX.show[m.from]=0;
    sfx(m.from>=0?'zap':'tap',.8,m.from>=0?.9:1.1);
    const hopEnd=now+GX.hop.dur;
    GX.anim=flips.map((c,k)=>({c,t0:hopEnd+k*55,dur:240,to:p,started:false}));
    GX.animEnd=hopEnd+(flips.length?(flips.length-1)*55+240:30);
    GX.lastMove={to:m.to,p,flips:flips.length};
    xSync();
  }
  function xAfterMove(){
    const {to,p,flips}=GX.lastMove,opp=3-p,now=performance.now();
    GX.show=Int8Array.from(GX.board);GX.hop=null;GX.anim=[];GX.displayed=xCount(GX.board);
    if(flips>=3){
      GX.floats.push({c:to,text:flips+'마리 감염!',color:SIDE_COLOR[p-1],size:.62,ttl:1.1,life:1.1});
      xSpark(to,14+flips*2,[p===1?'#7ff0da':'#ffb59c','#ffe08a','#ffffff']);sfx('smash',.7);
      xMood(p,'happy',flips+'마리나!');xMood(opp,'surprised','으악!');
    }else if(flips>0){xMood(p,'neutral','');xMood(opp,'neutral','');}
    const [a,d]=GX.displayed;
    if(!a||!d){xEnd(a?1:2,'전멸!');return;}
    if(!GX.board.includes(0)){xEnd(0,'');return;}
    if(GX.jumpRun>=24){xEnd(0,'계속 점프만 해서 경기 끝');return;}
    if(xHasMove(GX.board,GX.geo,opp)){xBeginTurn(opp);return;}
    // No move left for one side: the other side takes the remaining room, so nobody waits through empty turns.
    GX.phase='fill';xSync();
    GX.banner={text:`${nameFor(opp-1)}는 움직일 곳이 없어요!`,color:'#7a5a2e',until:now+1300,ms:1300};sfx('soft',.9);
    const tk=GX.token,empt=[];GX.board.forEach((v,i)=>{if(v===0)empt.push(i);});
    empt.forEach((c,k)=>setTimeout(()=>{
      if(!GX.on||tk!==GX.token)return;
      GX.board[c]=p;GX.show[c]=p;GX.displayed[p-1]++;xSync();sfx('tap',.5,1+k*.02);
      if(k===empt.length-1)setTimeout(()=>{if(GX.on&&tk===GX.token)xEnd(0,'');},400);
    },700+k*Math.min(70,1500/empt.length)));
    if(!empt.length)xEnd(0,'');
  }
  function xEnd(forced,note){
    const [a,d]=xCount(GX.board);
    const w=forced?forced-1:a===d?-1:a>d?0:1;
    GX.phase='over';xSync();
    const line=`${a} : ${d}`+(note?'   ·   '+note:'');
    let title='무승부!';
    if(w>=0){
      const repeat=streak.side===w&&streak.id===choices[w];
      streak={side:w,id:choices[w],count:repeat?streak.count+1:1};
      hofWin('germ',w);
      title=streak.count>=2?`${nameFor(w)} ${streak.count}연승!`:`${nameFor(w)} 승리!`;
      xMood(w+1,'happy','판을 뒤덮었다!');xMood(2-w,'sad','아쉬워…');cheer(1.1);victoryJingle();
    }else{xMood(1,'surprised','똑같아!');xMood(2,'surprised','다시 붙자!');sfx('goal',.7);}
    const next=button('다음 도전자 ▶','primary',()=>{leaveGerm();enterSelection();});
    const again=button('↻ 바로 재대결','',xNewMatch);
    const home=button('← 모음집','',xHome);
    [next,again,home].forEach(b=>{b.disabled=true;setTimeout(()=>{b.disabled=false;},1400);});
    setTimeout(()=>{if(GX.on&&GX.phase==='over')xOverlay(title,line,[next,again,home]);},700);
  }
  function xHome(){streak={side:-1,id:null,count:0};leaveGerm();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});}
  function xOverlay(title,detail,actions){
    $('gxOverlay').hidden=false;$('gxOverlayTitle').textContent=title;$('gxOverlayDetail').textContent=detail;$('gxOverlayActions').replaceChildren(...actions);
  }
  function xOpenMenu(){
    if(!GX.on||GX.phase==='over'||GX.phase==='paused'||GX.phase==='fill'||GX.phase==='anim')return;
    GX.resume=GX.phase;GX.phase='paused';GX.token++;clearTimeout(GX.aiTimer);
    const label=()=>soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';
    const sound=button(label(),'',()=>{cycleSound();sound.textContent=label();});
    xOverlay('잠깐 쉬는 중','',[
      button('▶ 계속','primary',()=>{$('gxOverlay').hidden=true;const t=GX.timer,r=GX.resume;xBeginTurn(GX.turn);if(r==='human'&&t>0)GX.timer=t;}),
      button('↻ 다시 하기','',xNewMatch),button('인물 변경','',()=>{leaveGerm();enterSelection();}),button('← 모음집','',xHome),sound]);
    xSync();
  }
  function xUseHint(i){
    if(GX.phase!=='human'||GX.turn!==i+1||GX.hints[i]<=0)return;
    GX.hints[i]--;GX.hint=xSearch(Int8Array.from(GX.board),GX.geo,GX.turn,5,280);GX.hintUntil=performance.now()+3500;
    if(GX.hint){GX.sel=GX.hint.from>=0?GX.hint.from:GX.geo.near[GX.hint.to].find(c=>GX.board[c]===GX.turn);}
    sfx('item',.8);xMood(GX.turn,'happy','여기가 좋아 보여!');xSync();
  }
  function xUndo(){
    if(!aiLevel||GX.undos<=0||!GX.history.length||(GX.phase!=='human'&&GX.phase!=='ai'))return;
    let snap=null;
    while(GX.history.length){snap=GX.history.pop();if(snap.turn===1)break;}
    if(!snap||snap.turn!==1)return;
    GX.token++;clearTimeout(GX.aiTimer);GX.undos--;
    GX.board=Int8Array.from(snap.board);GX.show=Int8Array.from(GX.board);GX.last=snap.last;GX.jumpRun=snap.jumpRun;GX.anim=[];GX.hop=null;GX.displayed=xCount(GX.board);
    sfx('menu',.8,.8);xBeginTurn(1);
  }
  /* ---------- Germ war: touch ---------- */
  function xPick(e){
    const r=xCanvas.getBoundingClientRect(),k=xCanvas.width/r.width,n=GX.stage.n,{m,cell}=GX.px;
    const x=Math.floor(((e.clientX-r.left)*k-m)/cell),y=Math.floor(((e.clientY-r.top)*k-m)/cell);
    return x>=0&&y>=0&&x<n&&y<n?y*n+x:-1;
  }
  function xTargetsFrom(f){
    if(f<0)return [];
    const out=[];
    for(const t of GX.geo.near[f])if(GX.board[t]===0)out.push({to:t,move:{from:-1,to:t}});
    for(const t of GX.geo.far[f])if(GX.board[t]===0)out.push({to:t,move:{from:f,to:t}});
    return out;
  }
  function xHasFrom(f){return GX.board[f]===GX.turn&&xTargetsFrom(f).length>0;}
  // Both tap-tap and press-drag-release work, because children reach for either without being told.
  xCanvas.addEventListener('pointerdown',e=>{
    if(!GX.on||GX.phase!=='human')return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();
    const c=xPick(e);if(c<0)return;
    GX.pid=e.pointerId;GX.hover=c;GX.dragFrom=-1;
    if(GX.board[c]===GX.turn){
      if(xHasFrom(c)){GX.sel=c;GX.dragFrom=c;sfx('menu',.6,1.25);xSync();}
      else{sfx('soft',.7);$('gxTip'+(GX.turn-1)).textContent='이 세균은 갈 곳이 없어요';}
    }
    try{xCanvas.setPointerCapture(e.pointerId);}catch{}
  },{passive:false});
  xCanvas.addEventListener('pointermove',e=>{if(e.pointerId===GX.pid&&GX.phase==='human')GX.hover=xPick(e);});
  function xRelease(e,cancel){
    if(e.pointerId!==GX.pid)return;
    const c=GX.hover;GX.pid=null;GX.hover=-1;GX.dragFrom=-1;
    if(cancel||GX.phase!=='human'||c<0)return;
    if(GX.sel>=0&&c!==GX.sel){
      const t=xTargetsFrom(GX.sel).find(x=>x.to===c);
      if(t){xPlay(t.move);return;}
      if(GX.board[c]!==GX.turn){sfx('soft',.7);GX.sel=-1;xSync();}
    }
  }
  xCanvas.addEventListener('pointerup',e=>xRelease(e,false));
  xCanvas.addEventListener('pointercancel',e=>xRelease(e,true));
  /* ---------- Germ war: drawing ---------- */
  function xSpark(c,count,colors){
    const {x,y}=xCenter(c);
    for(let k=0;k<count&&GX.sparks.length<240;k++){
      const a=Math.random()*Math.PI*2,s=GX.px.cell*(1.2+Math.random()*3.2);
      GX.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,ttl:.4+Math.random()*.4,c:colors[k%colors.length],sz:GX.px.cell*(.03+Math.random()*.05)});
    }
  }
  function xCenter(c){const n=GX.stage.n,{m,cell}=GX.px;return {x:m+(c%n+.5)*cell,y:m+(Math.floor(c/n)+.5)*cell};}
  function xBuildSprites(){
    if(!GX.px.cell)return;
    const S=Math.ceil(GX.px.cell*.94),paints=[['#49b7a6','#0f4b45','#082a26'],['#fff0dc','#f29a78','#a84e36']];
    for(let i=0;i<2;i++){
      const c=document.createElement('canvas');c.width=c.height=S;
      const g=c.getContext('2d'),r=S/2,[hi,lo,rim]=paints[i],spikes=10,base=r*.8;
      // A spiky blob rather than a stone: it should read as alive from across the room.
      g.beginPath();
      for(let k=0;k<spikes*2;k++){const a=k/(spikes*2)*Math.PI*2,rad=k%2?base:r-1;const x=r+Math.cos(a)*rad,y=r+Math.sin(a)*rad;k?g.lineTo(x,y):g.moveTo(x,y);}
      g.closePath();
      const grad=g.createRadialGradient(r*.75,r*.65,r*.1,r,r,r);grad.addColorStop(0,hi);grad.addColorStop(1,lo);
      g.fillStyle=grad;g.fill();g.lineWidth=Math.max(1.5,S*.03);g.strokeStyle=rim;g.lineJoin='round';g.stroke();
      const im=GX.faces[i];
      if(im.complete&&im.naturalWidth){
        const fr=r*.56;g.save();g.beginPath();g.arc(r,r,fr,0,Math.PI*2);g.clip();g.fillStyle='#fffaf0';g.fillRect(0,0,S,S);g.drawImage(im,r-fr*1.2,r-fr*1.2,fr*2.4,fr*2.4);g.restore();
        g.beginPath();g.arc(r,r,fr,0,Math.PI*2);g.lineWidth=Math.max(1.5,S*.018);g.strokeStyle=rim;g.stroke();
      }
      GX.sprites[i]=c;
      const side=$('gxDisc'+i);side.width=side.height=S;side.getContext('2d').drawImage(c,0,0);
    }
  }
  function xBuildBg(){
    const w=xCanvas.width,n=GX.stage?GX.stage.n:7,m=Math.round(w*.03),cell=(w-2*m)/n;
    GX.px={m,cell};
    const c=GX.bg||document.createElement('canvas');c.width=c.height=w;
    const g=c.getContext('2d');
    g.fillStyle='#3d4a55';g.fillRect(0,0,w,w);
    const dish=g.createRadialGradient(w/2,w/2,w*.1,w/2,w/2,w*.72);dish.addColorStop(0,'#eef6e8');dish.addColorStop(1,'#cfe2cf');
    g.fillStyle=dish;g.fillRect(m,m,w-2*m,w-2*m);
    g.fillStyle='rgba(60,110,90,.07)';
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)if((x+y)%2===0)g.fillRect(m+x*cell,m+y*cell,cell,cell);
    g.strokeStyle='rgba(50,80,70,.55)';g.lineWidth=Math.max(1.5,w*.0025);g.beginPath();
    for(let i=0;i<=n;i++){g.moveTo(m+i*cell,m);g.lineTo(m+i*cell,w-m);g.moveTo(m,m+i*cell);g.lineTo(w-m,m+i*cell);}
    g.stroke();
    if(GX.stage)for(const [x,y] of GX.stage.walls||[]){
      const px=m+x*cell,py=m+y*cell;g.fillStyle='#4a5560';g.fillRect(px+1,py+1,cell-2,cell-2);
      g.fillStyle='rgba(255,255,255,.1)';g.fillRect(px+cell*.12,py+cell*.12,cell*.76,cell*.14);
    }
    GX.bg=c;GX.bgDirty=false;
  }
  function xDrawGerm(c,owner,now,scale=1,alpha=1){
    const spr=GX.sprites[owner-1];if(!spr)return;
    const {x,y}=xCenter(c),wob=1+.025*Math.sin(now/260+c*1.7),S=spr.width*scale*wob;
    xctx.save();xctx.globalAlpha=alpha;xctx.translate(x,y);xctx.rotate(Math.sin(now/900+c)*.07);xctx.drawImage(spr,-S/2,-S/2,S,S);xctx.restore();
  }
  function xDraw(now,dt){
    if(GX.bgDirty||!GX.bg){xBuildBg();xBuildSprites();}
    const g=xctx,w=xCanvas.width,{cell,m}=GX.px;
    g.setTransform(1,0,0,1,0,0);g.drawImage(GX.bg,0,0);
    // Targets of the selected germ
    if(GX.phase==='human'&&GX.sel>=0){
      for(const t of xTargetsFrom(GX.sel)){
        const n=GX.stage.n,x=m+(t.to%n)*cell,y=m+Math.floor(t.to/n)*cell;
        g.fillStyle=t.move.from<0?'rgba(63,209,120,.42)':'rgba(242,190,50,.42)';g.fillRect(x+2,y+2,cell-4,cell-4);
      }
      const {x,y}=xCenter(GX.sel),p=.5+.5*Math.sin(now/130);
      g.strokeStyle='#ffd25a';g.lineWidth=cell*.07;g.beginPath();g.arc(x,y,cell*(.46+.03*p),0,Math.PI*2);g.stroke();
    }
    const flipping=new Map(GX.anim.map(a=>[a.c,a]));
    for(let c=0;c<GX.show.length;c++){
      const v=GX.show[c];if(v<=0)continue;
      if(GX.hop&&GX.hop.to===c)continue;
      const a=flipping.get(c);
      if(a&&now>=a.t0){
        const t=clamp((now-a.t0)/a.dur,0,1);
        xDrawGerm(c,t<.5?3-a.to:a.to,now,1+.28*Math.sin(Math.PI*t)-.55*Math.abs(Math.cos(Math.PI*t)-(t<.5?1:-1))*.5);
      }else xDrawGerm(c,v,now);
    }
    if(GX.hop){
      const h=GX.hop,t=clamp((now-h.t0)/h.dur,0,1),a=xCenter(h.from),b=xCenter(h.to),spr=GX.sprites[h.p-1];
      if(spr){
        const e=1-(1-t)*(1-t),x=a.x+(b.x-a.x)*e,y=a.y+(b.y-a.y)*e-Math.sin(Math.PI*t)*cell*(h.jump?.7:.15),S=spr.width*(h.jump?1+.25*Math.sin(Math.PI*t):.45+.55*t);
        g.drawImage(spr,x-S/2,y-S/2,S,S);
      }
    }
    if(GX.last>=0&&GX.phase!=='anim'&&GX.phase!=='over'){
      const {x,y}=xCenter(GX.last);g.strokeStyle='rgba(255,210,90,.9)';g.lineWidth=Math.max(2,cell*.04);g.beginPath();g.arc(x,y,cell*.47,0,Math.PI*2);g.stroke();
    }
    // Preview of what the finger is over: which neighbours would catch it.
    if(GX.phase==='human'&&GX.sel>=0&&GX.hover>=0){
      const t=xTargetsFrom(GX.sel).find(q=>q.to===GX.hover);
      if(t){
        const opp=3-GX.turn,hits=GX.geo.near[t.to].filter(i=>GX.board[i]===opp),col=SIDE_COLOR[GX.turn-1];
        g.globalAlpha=.75;xDrawGerm(t.to,GX.turn,now);g.globalAlpha=1;
        g.lineWidth=Math.max(4,cell*.08);g.strokeStyle='#d4432a';
        for(const f of hits){const q=xCenter(f);g.beginPath();g.arc(q.x,q.y,cell*.45,0,Math.PI*2);g.stroke();}
        const {x,y}=xCenter(t.to),gain=hits.length+(t.move.from<0?1:0);
        const yy=y-cell*.95<cell*.4?y+cell*.95:y-cell*.95;
        g.font=`${cell*.42}px "HojaTitle",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=cell*.1;g.strokeStyle='#fff';
        const lab=`+${gain}`,tx=clamp(x,cell,w-cell);g.strokeText(lab,tx,yy);g.fillStyle=col;g.fillText(lab,tx,yy);
      }
    }
    if(GX.hint&&now<GX.hintUntil&&GX.phase==='human'){
      const {x,y}=xCenter(GX.hint.to),p=.5+.5*Math.sin(now/110);
      g.strokeStyle='#d4432a';g.lineWidth=cell*.1;g.beginPath();g.arc(x,y,cell*(.38+.07*p),0,Math.PI*2);g.stroke();
    }
    for(let k=GX.sparks.length-1;k>=0;k--){
      const p=GX.sparks[k];p.ttl-=dt;if(p.ttl<=0){GX.sparks.splice(k,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-2*dt;p.vy*=1-2*dt;g.globalAlpha=Math.min(1,p.ttl*3);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.sz,0,Math.PI*2);g.fill();
    }
    g.globalAlpha=1;
    for(let k=GX.floats.length-1;k>=0;k--){
      const f=GX.floats[k];f.ttl-=dt;if(f.ttl<=0){GX.floats.splice(k,1);continue;}
      const {x,y}=xCenter(f.c),size=cell*f.size;g.globalAlpha=Math.min(1,f.ttl*3);
      g.font=`${size}px "HojaTitle",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=size*.22;g.strokeStyle='#fff';
      const tx=clamp(x,cell*1.8,w-cell*1.8),ty=clamp(y-cell*.8-(f.life-f.ttl)*cell*.5,cell*.6,w-cell*.6);g.strokeText(f.text,tx,ty);g.fillStyle=f.color;g.fillText(f.text,tx,ty);g.globalAlpha=1;
    }
    if(GX.banner){
      const left=GX.banner.until-now;
      if(left<=0)GX.banner=null;
      else{
        g.save();g.globalAlpha=Math.min(1,left/180);g.fillStyle='rgba(255,248,230,.95)';const bh=w*.18;g.fillRect(0,w/2-bh/2,w,bh);
        g.font=`${w*.06}px "HojaTitle",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=GX.banner.color;g.fillText(GX.banner.text,w/2,w/2);g.restore();
      }
    }
    if(GX.phase==='human'&&GX.timer>0){g.fillStyle=GX.timer<5?'#d4432a':'#ffd25a';g.fillRect(m,m*.2,(w-2*m)*GX.timer/GX.stage.clock,m*.6);}
  }
  function xFrame(now){
    if(!GX.on)return;
    const dt=clamp((now-(GX.lastT||now))/1000,0,.05);GX.lastT=now;
    if(GX.anim.length){
      for(const a of GX.anim){
        if(!a.started&&now>=a.t0){a.started=true;sfx('flip',.7,1.1);}
        if(!a.done&&now>=a.t0+a.dur/2){a.done=true;GX.show[a.c]=a.to;GX.displayed[a.to-1]++;GX.displayed[2-a.to]--;xSync();}
      }
    }
    if(GX.hop&&now>=GX.hop.t0+GX.hop.dur&&GX.show[GX.hop.to]!==GX.hop.p){GX.show[GX.hop.to]=GX.hop.p;GX.displayed=[GX.displayed[0]+(GX.hop.jump?0:(GX.hop.p===1?1:0)),GX.displayed[1]+(GX.hop.jump?0:(GX.hop.p===2?1:0))];xSpark(GX.hop.to,6,['#ffffff',GX.hop.p===1?'#7ff0da':'#ffb59c']);sfx('wood',.7);xSync();}
    if(GX.phase==='anim'&&now>=GX.animEnd)xAfterMove();
    if(GX.phase==='human'&&GX.timer>0){
      const before=GX.timer;GX.timer=Math.max(0,GX.timer-dt);
      if(before>5&&GX.timer<=5)sfx('item',.5,.8);
      if(GX.timer<=0&&GX.moves.length){
        const m=GX.moves.reduce((x,y)=>xGain(GX.board,GX.geo,y,GX.turn)+Math.random()>xGain(GX.board,GX.geo,x,GX.turn)+Math.random()?y:x);xPlay(m);
      }
    }
    xDraw(now,dt);
    GX.raf=requestAnimationFrame(xFrame);
  }
  function xResize(){
    if(!GX.on)return;
    let size;
    if(TABLET){size=tabletBoardSize('germScreen');if(!size)return;}
    else{const r=$('gxPlay').getBoundingClientRect();if(!r.width||!r.height)return;size=Math.floor(Math.min(r.height-10,r.width*.52));}
    $('gxShell').style.width=size+'px';$('gxShell').style.height=size+'px';
    const px=Math.round(size*Math.min(window.devicePixelRatio||1,2,1400/Math.max(1,size)));
    if(xCanvas.width!==px){xCanvas.width=px;xCanvas.height=px;}
    xBuildBg();xBuildSprites();if(GX.board)xDraw(performance.now(),0);
  }
  let xObserver=null;
  function enterGerm(){
    $('menuScreen').hidden=true;$('gameScreen').hidden=true;$('germScreen').hidden=false;
    GX.on=true;GX.lastT=0;
    if(TABLET)for(let i=0;i<2;i++){const d=$('gxScore'+i);if(d)$('gxTeam'+i).querySelector('.team-text').append(d);}
    xObserver=new ResizeObserver(xResize);xObserver.observe($(TABLET?'germScreen':'gxPlay'));
    xNewMatch();xResize();
    GX.raf=requestAnimationFrame(xFrame);
  }
  function leaveGerm(){roundClose();
    GX.on=false;GX.token++;clearTimeout(GX.aiTimer);cancelAnimationFrame(GX.raf);
    if(xObserver){xObserver.disconnect();xObserver=null;}
    $('germScreen').hidden=true;$('gxOverlay').hidden=true;GX.phase='idle';
  }
  for(let i=0;i<2;i++){
    $('gxHint'+i).addEventListener('click',()=>xUseHint(i));
    $('gxUndo'+i).addEventListener('click',xUndo);
    $('gxMenu'+i).addEventListener('click',()=>{sfx('menu',.7);xOpenMenu();});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&GX.on&&location.hash!=='#debug')xOpenMenu();});

