  /* ---------- Gomoku: rules ---------- */
  const G_STAGES=[
    {id:'mini',name:'작은 판 11×11',desc:'칸이 커서 저학년에게 좋아요',n:11},
    {id:'std',name:'정식 15×15',desc:'다섯 개 이상 이으면 승리',n:15},
    {id:'no33',name:'쌍삼 금지',desc:'열린 3을 두 줄 동시에 만드는 수는 둘 수 없어요',n:15,no33:true},
    {id:'clock',name:'20초 승부',desc:'한 수에 20초 · 넘기면 자동으로 둬요',n:15,clock:20},
    {id:'fade',name:'사라지는 돌',desc:'각자 돌은 10개까지 · 오래된 돌부터 사라져요',n:11,fade:10},
  ];
  const G_DIRS=[[1,0],[0,1],[1,1],[1,-1]];
  function gRun(b,n,c,p,dx,dy){
    // Assumes c holds (or will hold) p; walks both ways and reports the run and whether each end is free.
    const x=c%n,y=Math.floor(c/n),cells=[c];
    let i=x+dx,j=y+dy;
    while(i>=0&&j>=0&&i<n&&j<n&&b[j*n+i]===p){cells.push(j*n+i);i+=dx;j+=dy;}
    const openA=i>=0&&j>=0&&i<n&&j<n&&b[j*n+i]===0;
    i=x-dx;j=y-dy;
    while(i>=0&&j>=0&&i<n&&j<n&&b[j*n+i]===p){cells.push(j*n+i);i-=dx;j-=dy;}
    const openB=i>=0&&j>=0&&i<n&&j<n&&b[j*n+i]===0;
    return {count:cells.length,cells,open:(openA?1:0)+(openB?1:0)};
  }
  function gWinLine(b,n,c,p){
    for(const [dx,dy] of G_DIRS){const r=gRun(b,n,c,p,dx,dy);if(r.count>=5)return r.cells;}
    return null;
  }
  function gOpenThreeDir(b,n,c,p,dx,dy){
    // An open three is exactly a line that one more stone turns into an open four.
    const x=c%n,y=Math.floor(c/n);
    for(let k=-4;k<=4;k++){
      if(k===0)continue;
      const i=x+dx*k,j=y+dy*k;
      if(i<0||j<0||i>=n||j>=n)continue;
      const e=j*n+i;if(b[e]!==0)continue;
      b[e]=p;
      const r=gRun(b,n,c,p,dx,dy),hit=r.count===4&&r.open===2&&r.cells.includes(e);
      b[e]=0;
      if(hit)return true;
    }
    return false;
  }
  function gIsDoubleThree(b,n,c,p){
    if(b[c]!==0)return false;
    b[c]=p;
    let threes=0,wins=false;
    for(const [dx,dy] of G_DIRS){
      if(gRun(b,n,c,p,dx,dy).count>=5)wins=true;
      if(gOpenThreeDir(b,n,c,p,dx,dy))threes++;
    }
    b[c]=0;
    return !wins&&threes>=2;
  }
  /* ---------- Gomoku: computer player ---------- */
  function gDirValue(b,n,c,p,dx,dy){
    const r=gRun(b,n,c,p,dx,dy);
    let run=r.count,open=r.open;
    if(run>=5)return 1e6;
    // A one-stone gap still threatens: X X _ X reads as a three to any child who has played twice.
    const x=c%n,y=Math.floor(c/n);
    let split=0;
    for(const s of [1,-1]){
      let i=x+dx*s,j=y+dy*s;
      while(i>=0&&j>=0&&i<n&&j<n&&b[j*n+i]===p){i+=dx*s;j+=dy*s;}
      if(i<0||j<0||i>=n||j>=n||b[j*n+i]!==0)continue;
      i+=dx*s;j+=dy*s;let m=0;
      while(i>=0&&j>=0&&i<n&&j<n&&b[j*n+i]===p){m++;i+=dx*s;j+=dy*s;}
      split=Math.max(split,m);
    }
    if(split&&run+split>=4)return open===2?9000:4000;
    if(split&&run+split===3&&open===2)return 2500;
    if(run===4)return open===2?1e5:open===1?8000:0;
    if(run===3)return open===2?6000:open===1?500:0;
    if(run===2)return open===2?200:open===1?40:0;
    return open===2?10:open===1?2:0;
  }
  function gAttack(b,n,c,p){
    b[c]=p;let s=0;
    for(const [dx,dy] of G_DIRS)s+=gDirValue(b,n,c,p,dx,dy);
    b[c]=0;return s;
  }
  function gCandidates(b,n){
    const out=[],seen=new Uint8Array(n*n);let any=false;
    for(let c=0;c<b.length;c++){
      if(b[c]===0)continue;any=true;
      const x=c%n,y=Math.floor(c/n);
      for(let j=Math.max(0,y-2);j<=Math.min(n-1,y+2);j++)for(let i=Math.max(0,x-2);i<=Math.min(n-1,x+2);i++){
        const e=j*n+i;if(b[e]===0&&!seen[e]){seen[e]=1;out.push(e);}
      }
    }
    if(!any)out.push(Math.floor(n/2)*n+Math.floor(n/2));
    return out;
  }
  function gRanked(b,n,p,no33){
    const opp=3-p,list=[];
    for(const c of gCandidates(b,n)){
      if(no33&&gIsDoubleThree(b,n,c,p))continue;
      const a=gAttack(b,n,c,p),d=gAttack(b,n,c,opp);
      // Finishing first always beats blocking; otherwise a block is worth almost as much as the same attack.
      list.push({c,a,d,s:a>=1e6?1e8:d>=1e6?1e7:a+d*.85});
    }
    return list.sort((x,y)=>y.s-x.s);
  }
  function gSearch(b,n,p,no33,budgetMs){
    const deadline=performance.now()+budgetMs,STOP={};
    const leaf=(q)=>{
      const r=gRanked(b,n,q,no33);if(!r.length)return 0;
      const mine=r.reduce((m,e)=>Math.max(m,e.a),0),theirs=r.reduce((m,e)=>Math.max(m,e.d),0);
      return mine*1.1-theirs;
    };
    const nega=(q,depth,alpha,beta)=>{
      if(performance.now()>deadline)throw STOP;
      if(depth===0)return leaf(q);
      const r=gRanked(b,n,q,no33).slice(0,7);if(!r.length)return 0;
      let best=-Infinity;
      for(const e of r){
        if(e.a>=1e6)return 1e7+depth;
        b[e.c]=q;const v=-nega(3-q,depth-1,-beta,-alpha);b[e.c]=0;
        if(v>best)best=v;if(v>alpha)alpha=v;if(alpha>=beta)break;
      }
      return best;
    };
    const top=gRanked(b,n,p,no33).slice(0,9);
    if(!top.length)return -1;
    if(top[0].a>=1e6||top[0].d>=1e6)return top[0].c;
    let bestMove=top[0].c;
    try{
      for(let d=2;d<=6;d+=2){
        let bv=-Infinity,pick=bestMove;
        for(const e of top){
          b[e.c]=p;let v;
          try{v=-nega(3-p,d-1,-Infinity,-bv);}finally{b[e.c]=0;}
          if(v>bv){bv=v;pick=e.c;}
        }
        bestMove=pick;
      }
    }catch(e){if(e!==STOP)throw e;}
    return bestMove;
  }
  function gAiMove(b,n,p,level,no33){
    const work=Int8Array.from(b),r=gRanked(work,n,p,no33);
    if(!r.length)return -1;
    if(level===1){
      if(r[0].a>=1e6)return r[0].c;
      // A beginner sees a four coming most of the time, and little else.
      if(r[0].d>=1e6&&Math.random()<.7)return r[0].c;
      const pool=r.slice(0,Math.min(8,r.length));
      return pool[Math.floor(Math.random()*pool.length)].c;
    }
    if(level===2)return r[0].c;
    return gSearch(work,n,p,no33,320);
  }

  /* ---------- Gomoku: match ---------- */
  let gomokuStage='mini';
  const GO={on:false,raf:0,stage:null,n:15,board:null,turn:1,phase:'idle',resume:'human',hover:-1,pid:null,last:-1,win:null,winT:0,
    moves:0,timer:0,token:0,hints:[2,2],undos:2,hintCell:-1,hintUntil:0,queues:[[],[]],history:[],banner:null,
    bg:null,bgDirty:true,px:{m:0,cell:0},sprites:[null,null],floats:[],sparks:[],pop:null,fading:[],lastT:0,shake:0};
  const gCanvas=$('gBoard'),gctx=gCanvas.getContext('2d',{alpha:false}),gShell=$('gShell');
  const gIsAI=p=>aiLevel>0&&p===2;
  function gMood(p,mood,note){
    const i=p-1;$('gPortrait'+i).src=portraitFor(i,mood);
    const t=$('gTeam'+i);t.classList.toggle('react',mood==='happy'||mood==='surprised');t.classList.toggle('sad',mood==='sad'||mood==='angry');
    if(note!==undefined)$('gNote'+i).textContent=note;
  }
  function gSyncUI(){
    const stage=GO.stage;
    for(let i=0;i<2;i++){
      const mine=GO.turn===i+1&&(GO.phase==='human'||GO.phase==='ai');
      $('gSide'+i).classList.toggle('active',mine);$('gTeam'+i).classList.toggle('turn',mine);
      const human=!gIsAI(i+1),h=$('gHint'+i),u=$('gUndo'+i);
      h.hidden=!human;h.textContent='힌트 '+GO.hints[i];h.disabled=!(mine&&GO.phase==='human'&&GO.hints[i]>0);
      u.hidden=!(aiLevel>0&&human);u.textContent='무르기 '+GO.undos;u.disabled=!(GO.undos>0&&GO.history.length>0&&(GO.phase==='human'||GO.phase==='ai'));
      $('gTurnLabel'+i).textContent=mine?(GO.phase==='ai'?'생각 중…':'내 차례!'):'';
      $('gTip'+i).textContent=mine&&GO.phase==='human'?'줄이 만나는 곳을 눌러요':'';
    }
    $('gCaption').textContent='HOJA 오목 · '+(stage?stage.name:'');
    $('gTurnText').textContent=(GO.phase==='human'||GO.phase==='ai')?nameFor(GO.turn-1)+' 차례':'';
    $('gTurnText').className='game-time o-turn side'+(GO.turn-1);
    $('gLeft').textContent=GO.moves+'수째';
  }
  function gFloat(c,text,color,size=.9,ttl=1.1){GO.floats.push({c,text,color,size,ttl,life:ttl});}
  function gCenter(c){const n=GO.n,{m,cell}=GO.px;return {x:m+(c%n)*cell,y:m+Math.floor(c/n)*cell};}
  function gBurst(c,count,colors,speed=1){
    const {x,y}=gCenter(c);
    for(let k=0;k<count&&GO.sparks.length<260;k++){
      const a=Math.random()*Math.PI*2,s=GO.px.cell*(1.5+Math.random()*4.5)*speed;
      GO.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,ttl:.45+Math.random()*.45,c:colors[k%colors.length],sz:GO.px.cell*(.05+Math.random()*.08)});
    }
  }
  function gNewMatch(){
    GO.token++;clearTimeout(GO.aiTimer);
    const st=G_STAGES.find(s=>s.id===gomokuStage);
    GO.stage=st;GO.n=st.n;GO.board=new Int8Array(st.n*st.n);GO.hover=-1;GO.pid=null;GO.last=-1;GO.win=null;GO.moves=0;GO.timer=0;
    GO.hints=[2,2];GO.undos=2;GO.hintCell=-1;GO.queues=[[],[]];GO.history=[];GO.floats=[];GO.sparks=[];GO.pop=null;GO.fading=[];GO.banner=null;
    GO.bgDirty=true;$('gOverlay').hidden=true;
    for(let i=0;i<2;i++){
      $('gName'+i).textContent=nameFor(i);
      $('gLabel'+i).textContent=aiLevel&&i===1?'COMPUTER · '+AI_LEVELS[aiLevel].label:i?'PLAYER 2 · 오른쪽':'PLAYER 1 · 왼쪽';
      gMood(i+1,'neutral',aiLevel&&i===1?'컴퓨터 상대':'다섯 줄, 간다!');
      const champ=streak.side===i&&streak.id===choices[i]&&streak.count>0;
      $('gStreak'+i).textContent=champ?(streak.count>=2?streak.count+'연승 중':'챔피언'):'';
      $('gTeam'+i).classList.toggle('champion',champ);
    }
    const first=Math.random()<.5?1:2;
    GO.turn=first;GO.phase='opening';gSyncUI();
    GO.banner={text:nameFor(first-1)+' 먼저!',color:SIDE_COLOR[first-1],until:performance.now()+1200,ms:1200};sfx('goal',.6);
    const tk=GO.token;setTimeout(()=>{if(GO.on&&tk===GO.token&&GO.phase==='opening')gBeginTurn(first);},1250);
    playMood('calm');
  }
  function gBeginTurn(p){
    GO.turn=p;GO.hintCell=-1;GO.hover=-1;GO.pid=null;
    GO.phase=gIsAI(p)?'ai':'human';
    GO.timer=GO.stage.clock&&GO.phase==='human'?GO.stage.clock:0;
    gSyncUI();
    if(GO.phase==='ai'){
      const tk=GO.token;
      GO.aiTimer=setTimeout(()=>{
        if(!GO.on||tk!==GO.token||GO.phase!=='ai')return;
        const c=gAiMove(GO.board,GO.n,p,aiLevel,!!GO.stage.no33);
        if(c>=0)gPlace(c);else gEndDraw();
      },600+Math.random()*350);
    }
  }
  function gLegal(c){return c>=0&&GO.board[c]===0&&!(GO.stage.no33&&gIsDoubleThree(GO.board,GO.n,c,GO.turn));}
  function gPlace(c){
    const p=GO.turn,n=GO.n;
    GO.history.push({board:Int8Array.from(GO.board),turn:p,last:GO.last,queues:GO.queues.map(q=>q.slice()),moves:GO.moves});
    GO.board[c]=p;GO.last=c;GO.moves++;GO.hover=-1;GO.pid=null;GO.hintCell=-1;GO.timer=0;
    GO.pop={c,t0:performance.now()};
    sfx('wood',1);gBurst(c,5,[SIDE_GLOW[p-1],'#ffffff'],.45);
    const line=gWinLine(GO.board,n,c,p);
    if(line){gWin(p,line,c);return;}
    if(GO.stage.fade){
      const q=GO.queues[p-1];q.push(c);
      if(q.length>GO.stage.fade){
        const old=q.shift();GO.board[old]=0;GO.fading.push({c:old,p,t0:performance.now()});sfx('soft',.8);
      }
    }
    // Call out threats out loud: most children lose by simply not noticing a four.
    let best=0,open=0;
    for(const [dx,dy] of G_DIRS){const r=gRun(GO.board,n,c,p,dx,dy);if(r.count>best||(r.count===best&&r.open>open)){best=r.count;open=r.open;}}
    const opp=3-p;
    if(best===4&&open>0){gFloat(c,open===2?'막을 수 없는 4!':'4목! 막아!',SIDE_COLOR[p-1],open===2?1.1:1);sfx('item',.9);GO.shake=.1;gMood(p,'happy','넷이다!');gMood(opp,'surprised','막아야 해!');}
    else if(best===3&&open===2){gFloat(c,'열린 3!',SIDE_COLOR[p-1],.9);sfx('menu',.8,1.4);gMood(p,'neutral','셋이다!');gMood(opp,'surprised','조심!');}
    else{gMood(p,'neutral','');gMood(opp,'neutral','');}
    if(!GO.board.includes(0)){gEndDraw();return;}
    gBeginTurn(opp);
  }
  function gEndDraw(){
    GO.phase='over';gSyncUI();stopBgm(.6);sfx('goal',.7);gMood(1,'surprised','판이 꽉 찼어!');gMood(2,'surprised','다시 붙자!');
    gResult('무승부!',GO.moves+'수 · 판이 가득 찼어요',600);
  }
  function gWin(p,line,c){
    GO.phase='over';GO.win={line,t0:performance.now(),p};
    const w=p-1;
    const repeat=streak.side===w&&streak.id===choices[w];
    streak={side:w,id:choices[w],count:repeat?streak.count+1:1};
    hofWin('gomoku',w);
    gMood(p,'happy','다섯 줄!');gMood(3-p,'sad','아쉬워…');gSyncUI();
    sfx('goal',1.1);sfx('smash',1);cheer(1.1);stopBgm(.4);GO.shake=.2;
    line.forEach((l,k)=>setTimeout(()=>{if(GO.on&&GO.win)gBurst(l,14,[SIDE_GLOW[w],'#ffe08a','#ffffff']);},k*90));
    const W=gCanvas.width;
    for(let k=0;k<150&&GO.sparks.length<320;k++)GO.sparks.push({x:Math.random()*W,y:-Math.random()*W*.3,vx:(Math.random()-.5)*W*.12,vy:W*(.15+Math.random()*.25),ttl:1.5+Math.random()*1.4,c:[SIDE_COLOR[w],SIDE_GLOW[w],'#ffe08a','#ffffff'][k%4],sz:W*(.006+Math.random()*.007),conf:true,rot:Math.random()*6});
    victoryJingle();
    gResult(streak.count>=2?`${nameFor(w)} ${streak.count}연승!`:`${nameFor(w)} 승리!`,GO.moves+'수 만에 다섯 줄 완성',1500);
  }
  function gResult(title,detail,delay){
    const next=button('다음 도전자 ▶','primary',()=>{leaveGomoku();enterSelection();});
    const again=button('↻ 바로 재대결','',()=>{gNewMatch();});
    const home=button('← 모음집','',()=>{streak={side:-1,id:null,count:0};leaveGomoku();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});});
    [next,again,home].forEach(b=>{b.disabled=true;setTimeout(()=>{b.disabled=false;},delay+800);});
    setTimeout(()=>{if(GO.on&&GO.phase==='over')gOverlay(title,detail,[next,again,home]);},delay);
  }
  function gOverlay(title,detail,actions){
    $('gOverlay').hidden=false;$('gOverlayTitle').textContent=title;$('gOverlayDetail').textContent=detail;
    $('gOverlayActions').replaceChildren(...actions);
  }
  function gOpenMenu(){
    if(GO.phase==='over'||GO.phase==='paused')return;
    GO.resume=GO.phase;GO.phase='paused';GO.token++;clearTimeout(GO.aiTimer);
    const label=()=>soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';
    const sound=button(label(),'',()=>{cycleSound();sound.textContent=label();});
    gOverlay('잠깐 쉬는 중','',[
      button('▶ 계속','primary',gCloseMenu),
      button('↻ 다시 하기','',()=>{gNewMatch();}),
      button('인물 변경','',()=>{leaveGomoku();enterSelection();}),
      button('← 모음집','',()=>{leaveGomoku();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});}),
      sound,
    ]);
    gSyncUI();
  }
  function gCloseMenu(){
    $('gOverlay').hidden=true;
    const t=GO.timer,r=GO.resume;gBeginTurn(GO.turn);if(r==='human'&&t>0)GO.timer=t;
  }
  function gUseHint(i){
    if(GO.phase!=='human'||GO.turn!==i+1||GO.hints[i]<=0)return;
    GO.hints[i]--;
    GO.hintCell=gSearch(Int8Array.from(GO.board),GO.n,GO.turn,!!GO.stage.no33,250);GO.hintUntil=performance.now()+3500;
    sfx('item',.8);gMood(GO.turn,'happy','여기가 좋아 보여!');gSyncUI();
  }
  function gUndo(){
    if(!aiLevel||GO.undos<=0||!GO.history.length||(GO.phase!=='human'&&GO.phase!=='ai'))return;
    let snap=null;
    while(GO.history.length){snap=GO.history.pop();if(snap.turn===1)break;}
    if(!snap||snap.turn!==1)return;
    GO.token++;clearTimeout(GO.aiTimer);GO.undos--;
    GO.board=Int8Array.from(snap.board);GO.last=snap.last;GO.queues=snap.queues;GO.moves=snap.moves;GO.pop=null;GO.fading=[];
    sfx('menu',.8,.8);gBeginTurn(1);
  }
  /* ---------- Gomoku: touch ---------- */
  function gPick(e){
    const r=gCanvas.getBoundingClientRect(),k=gCanvas.width/r.width,n=GO.n,{m,cell}=GO.px;
    const fx=((e.clientX-r.left)*k-m)/cell,fy=((e.clientY-r.top)*k-m)/cell;
    if(fx<-.6||fy<-.6||fx>n-.4||fy>n-.4)return -1;
    return clamp(Math.round(fy),0,n-1)*n+clamp(Math.round(fx),0,n-1);
  }
  gCanvas.addEventListener('pointerdown',e=>{
    if(!GO.on||GO.phase!=='human')return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();GO.pid=e.pointerId;GO.hover=gPick(e);
    try{gCanvas.setPointerCapture(e.pointerId);}catch{}
  },{passive:false});
  gCanvas.addEventListener('pointermove',e=>{
    if(e.pointerId!==GO.pid||GO.phase!=='human')return;
    const c=gPick(e);if(c!==GO.hover){GO.hover=c;if(c>=0&&GO.board[c]===0)sfx('menu',.3,1.5);}
  });
  function gRelease(e,cancel){
    if(e.pointerId!==GO.pid)return;
    const c=GO.hover;GO.pid=null;GO.hover=-1;
    if(cancel||GO.phase!=='human'||c<0)return;
    if(GO.board[c]!==0){sfx('soft',.8);return;}
    if(!gLegal(c)){sfx('soft',.9);gFloat(c,'쌍삼 금지!','#c0392b',.9);$('gTip'+(GO.turn-1)).textContent='열린 3이 두 줄 생기는 수예요';return;}
    gPlace(c);
  }
  gCanvas.addEventListener('pointerup',e=>gRelease(e,false));
  gCanvas.addEventListener('pointercancel',e=>gRelease(e,true));
  /* ---------- Gomoku: drawing ---------- */
  function gBuildSprites(){
    const S=Math.ceil(GO.px.cell*.92);
    const paints=[['#4cb3a5','#0f4b45','#082a26'],['#fff8ef','#f7bb9c','#a84e36']];
    for(let i=0;i<2;i++){
      const c=document.createElement('canvas');c.width=c.height=S;
      const g=c.getContext('2d'),r=S/2,[hi,lo,rim]=paints[i];
      const grad=g.createRadialGradient(r*.68,r*.6,r*.05,r,r,r);grad.addColorStop(0,hi);grad.addColorStop(1,lo);
      const rimW=Math.max(1.5,S*.05);
      g.beginPath();g.arc(r,r,r-rimW/2-.5,0,Math.PI*2);g.fillStyle=grad;g.fill();
      g.lineWidth=rimW;g.strokeStyle=rim;g.stroke();
      GO.sprites[i]=c;
      const d=$('gDisc'+i),D=120;d.width=d.height=D;d.getContext('2d').drawImage(c,0,0,D,D);
    }
  }
  function gBuildBg(){
    const w=gCanvas.width,n=GO.n,rail=w*.022,cell=(w-2*rail)/n,m=rail+cell/2;
    GO.px={m,cell};
    const c=GO.bg||document.createElement('canvas');c.width=c.height=w;
    const g=c.getContext('2d');
    const rim=g.createLinearGradient(0,0,w,w);rim.addColorStop(0,'#7b5230');rim.addColorStop(1,'#553619');
    g.fillStyle=rim;g.fillRect(0,0,w,w);
    const wood=g.createLinearGradient(0,0,w,w);wood.addColorStop(0,'#eccb8f');wood.addColorStop(.55,'#e2b673');wood.addColorStop(1,'#d7a763');
    g.fillStyle=wood;g.fillRect(rail,rail,w-2*rail,w-2*rail);
    g.strokeStyle='rgba(120,78,30,.09)';g.lineWidth=Math.max(1,w*.002);
    for(let y=rail;y<w-rail;y+=w*.018){g.beginPath();g.moveTo(rail,y);g.bezierCurveTo(w*.3,y+w*.006,w*.6,y-w*.006,w-rail,y);g.stroke();}
    g.strokeStyle='#46311a';g.lineWidth=Math.max(1.5,w*.0026);g.beginPath();
    for(let i=0;i<n;i++){g.moveTo(m+i*cell,m);g.lineTo(m+i*cell,m+(n-1)*cell);g.moveTo(m,m+i*cell);g.lineTo(m+(n-1)*cell,m+i*cell);}
    g.stroke();
    const stars=n===15?[3,7,11]:[2,5,8];
    g.fillStyle='#46311a';
    for(const a of stars)for(const b of stars){g.beginPath();g.arc(m+a*cell,m+b*cell,Math.max(3,cell*.1),0,Math.PI*2);g.fill();}
    GO.bg=c;GO.bgDirty=false;
  }
  function gDrawStone(c,p,scale=1,alpha=1){
    const spr=GO.sprites[p-1];if(!spr)return;
    const {x,y}=gCenter(c),S=spr.width*scale;
    gctx.save();gctx.globalAlpha=alpha;
    gctx.fillStyle='rgba(50,30,10,.3)';gctx.beginPath();gctx.arc(x+S*.04,y+S*.07,S*.5,0,Math.PI*2);gctx.fill();
    gctx.drawImage(spr,x-S/2,y-S/2,S,S);gctx.restore();
  }
  function gText(str,x,y,size,color){
    gctx.font=`${size}px "HojaTitle",sans-serif`;gctx.textAlign='center';gctx.textBaseline='middle';gctx.lineJoin='round';
    gctx.lineWidth=size*.22;gctx.strokeStyle='rgba(255,255,255,.96)';gctx.strokeText(str,x,y);gctx.fillStyle=color;gctx.fillText(str,x,y);
  }
  function gDraw(now,dt){
    if(GO.bgDirty||!GO.bg){gBuildBg();gBuildSprites();}
    const w=gCanvas.width,{cell}=GO.px,n=GO.n,sh=GO.shake>.01&&!reducedMotion?(Math.random()-.5)*GO.shake*cell*2:0;
    gctx.setTransform(1,0,0,1,0,0);gctx.drawImage(GO.bg,sh,sh);
    if(GO.stage.no33&&GO.phase==='human'){
      // Marked up front so nobody has to discover the rule by being refused.
      gctx.strokeStyle='rgba(192,57,43,.8)';gctx.lineWidth=Math.max(2,cell*.08);
      for(const c of gCandidates(GO.board,n))if(gIsDoubleThree(GO.board,n,c,GO.turn)){
        const {x,y}=gCenter(c),q=cell*.2;gctx.beginPath();gctx.moveTo(x-q,y-q);gctx.lineTo(x+q,y+q);gctx.moveTo(x+q,y-q);gctx.lineTo(x-q,y+q);gctx.stroke();
      }
    }
    for(let c=0;c<GO.board.length;c++){
      const v=GO.board[c];if(!v)continue;
      if(GO.pop&&GO.pop.c===c){const t=clamp((now-GO.pop.t0)/170,0,1);gDrawStone(c,v,1.5-.5*t*t,.5+.5*t);}
      else gDrawStone(c,v);
    }
    for(let k=GO.fading.length-1;k>=0;k--){
      const f=GO.fading[k],t=(now-f.t0)/420;if(t>=1){GO.fading.splice(k,1);continue;}
      gDrawStone(f.c,f.p,1+.25*t,1-t);
    }
    if(GO.stage.fade&&GO.phase!=='over'){
      // The stone about to vanish blinks, so its loss is a plan rather than a surprise.
      const a=.45+.45*Math.sin(now/170);
      for(let i=0;i<2;i++){
        const q=GO.queues[i];if(q.length<GO.stage.fade)continue;
        const {x,y}=gCenter(q[0]);gctx.save();gctx.globalAlpha=a;gctx.strokeStyle='#c0392b';gctx.lineWidth=Math.max(3,cell*.1);gctx.setLineDash([cell*.18,cell*.14]);
        gctx.beginPath();gctx.arc(x,y,cell*.5,0,Math.PI*2);gctx.stroke();gctx.restore();
      }
    }
    if(GO.last>=0&&!GO.win){
      const {x,y}=gCenter(GO.last);gctx.fillStyle='#ffd25a';gctx.strokeStyle='#5b3d10';gctx.lineWidth=Math.max(1.5,cell*.03);
      gctx.beginPath();gctx.arc(x,y,cell*.14,0,Math.PI*2);gctx.fill();gctx.stroke();
    }
    if(GO.win){
      const t=now-GO.win.t0,col='#ffd25a';
      GO.win.line.forEach((c,k)=>{
        if(t<k*90)return;
        const {x,y}=gCenter(c),p=.5+.5*Math.sin(now/110);
        gctx.strokeStyle=col;gctx.lineWidth=cell*.14;gctx.beginPath();gctx.arc(x,y,cell*(.5+.06*p),0,Math.PI*2);gctx.stroke();
      });
    }
    if(GO.phase==='human'&&GO.hover>=0&&GO.board[GO.hover]===0){
      // Fingers hide the point being chosen, so the row and column light up edge to edge.
      const {x,y}=gCenter(GO.hover),col=SIDE_COLOR[GO.turn-1],m=GO.px.m,far=m+(n-1)*cell;
      gctx.save();gctx.strokeStyle=col;gctx.lineWidth=Math.max(3,cell*.09);gctx.globalAlpha=.75;
      gctx.beginPath();gctx.moveTo(m,y);gctx.lineTo(far,y);gctx.moveTo(x,m);gctx.lineTo(x,far);gctx.stroke();gctx.restore();
      gDrawStone(GO.hover,GO.turn,1.1,.78);
      if(GO.stage.no33&&gIsDoubleThree(GO.board,n,GO.hover,GO.turn))gText('금지',x,y-cell*1.5<cell?y+cell*1.5:y-cell*1.5,cell*.9,'#c0392b');
    }
    if(GO.hintCell>=0&&now<GO.hintUntil&&GO.phase==='human'){
      const {x,y}=gCenter(GO.hintCell),p=.5+.5*Math.sin(now/110);
      gctx.strokeStyle='#d4432a';gctx.lineWidth=cell*.13;gctx.beginPath();gctx.arc(x,y,cell*(.46+.1*p),0,Math.PI*2);gctx.stroke();
    }
    for(let k=GO.sparks.length-1;k>=0;k--){
      const p=GO.sparks[k];p.ttl-=dt;if(p.ttl<=0){GO.sparks.splice(k,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.conf)p.rot+=dt*7;else{p.vx*=1-2*dt;p.vy*=1-2*dt;}
      gctx.globalAlpha=Math.min(1,p.ttl*3);gctx.fillStyle=p.c;
      if(p.conf){gctx.save();gctx.translate(p.x,p.y);gctx.rotate(p.rot);gctx.fillRect(-p.sz,-p.sz/2,p.sz*2,p.sz);gctx.restore();}
      else{gctx.beginPath();gctx.arc(p.x,p.y,p.sz,0,Math.PI*2);gctx.fill();}
    }
    gctx.globalAlpha=1;
    for(let k=GO.floats.length-1;k>=0;k--){
      const f=GO.floats[k];f.ttl-=dt;if(f.ttl<=0){GO.floats.splice(k,1);continue;}
      const {x,y}=gCenter(f.c);gctx.globalAlpha=Math.min(1,f.ttl*3);
      gText(f.text,clamp(x,w*.2,w*.8),clamp(y-cell*1.2-(f.life-f.ttl)*cell*.6,cell,w-cell),cell*f.size*(n===15?1.15:1),f.color);
    }
    gctx.globalAlpha=1;
    if(GO.banner){
      const left=GO.banner.until-now;
      if(left<=0)GO.banner=null;
      else{
        gctx.save();gctx.globalAlpha=Math.min(1,left/180);gctx.fillStyle='rgba(255,248,230,.94)';
        const bh=w*.2;gctx.fillRect(0,w/2-bh/2,w,bh);gText(GO.banner.text,w/2,w/2,w*.09,GO.banner.color);gctx.restore();
      }
    }
    if(GO.phase==='human'&&GO.timer>0){
      gctx.fillStyle=GO.timer<5?'#d4432a':'#ffd25a';gctx.fillRect(0,0,w*GO.timer/GO.stage.clock,w*.016);
    }
  }
  function gFrame(now){
    if(!GO.on)return;
    const dt=clamp((now-(GO.lastT||now))/1000,0,.05);GO.lastT=now;
    GO.shake=Math.max(0,GO.shake-dt*.6);
    if(GO.phase==='human'&&GO.timer>0){
      const before=GO.timer;GO.timer=Math.max(0,GO.timer-dt);
      if(before>5&&GO.timer<=5)sfx('item',.5,.8);
      if(GO.timer<=0){
        const c=gAiMove(GO.board,GO.n,GO.turn,2,!!GO.stage.no33);
        if(c>=0){gFloat(c,'시간 끝!','#d4432a',.9);gPlace(c);}
      }
    }
    gDraw(now,dt);
    GO.raf=requestAnimationFrame(gFrame);
  }
  function gResize(){
    if(!GO.on)return;
    let size;
    if(TABLET){size=tabletBoardSize('gomokuScreen');if(!size)return;}
    else{const r=$('gPlay').getBoundingClientRect();if(!r.width||!r.height)return;size=Math.floor(Math.min(r.height-10,r.width*.52));}
    gShell.style.width=size+'px';gShell.style.height=size+'px';
    const px=Math.round(size*Math.min(window.devicePixelRatio||1,2,1400/Math.max(1,size)));
    if(gCanvas.width!==px){gCanvas.width=px;gCanvas.height=px;}
    gBuildBg();gBuildSprites();
    if(GO.board)gDraw(performance.now(),0);
  }
  let gObserver=null;
  function enterGomoku(){
    $('menuScreen').hidden=true;$('gameScreen').hidden=true;$('gomokuScreen').hidden=false;
    GO.on=true;GO.lastT=0;
    if(TABLET)for(let i=0;i<2;i++){const d=$('gScore'+i);if(d)$('gTeam'+i).querySelector('.team-text').append(d);}
    gObserver=new ResizeObserver(gResize);gObserver.observe($(TABLET?'gomokuScreen':'gPlay'));
    gNewMatch();gResize();
    GO.raf=requestAnimationFrame(gFrame);
  }
  function leaveGomoku(){roundClose();
    GO.on=false;GO.token++;clearTimeout(GO.aiTimer);cancelAnimationFrame(GO.raf);
    if(gObserver){gObserver.disconnect();gObserver=null;}
    $('gomokuScreen').hidden=true;$('gOverlay').hidden=true;GO.phase='idle';
  }
  for(let i=0;i<2;i++){
    $('gHint'+i).addEventListener('click',()=>gUseHint(i));
    $('gUndo'+i).addEventListener('click',gUndo);
    $('gMenu'+i).addEventListener('click',()=>{sfx('menu',.7);gOpenMenu();});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&GO.on&&location.hash!=='#debug')gOpenMenu();});

