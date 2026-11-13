  /* ---------- Tic-tac-toe: rules ---------- */
  const T_STAGES=[
    {id:'std',name:'기본 3×3',desc:'세 줄을 잇고 3점 먼저 · 5판째부터는 2점이면 승리',n:3,k:3},
    {id:'fade',name:'사라지는 말',desc:'말은 3개까지 · 새로 두면 가장 오래된 말이 사라져요',n:3,k:3,fade:3},
    {id:'b4',name:'4×4',desc:'네 줄을 이어요 · 3점 먼저',n:4,k:4},
    {id:'b5',name:'5×5',desc:'네 줄을 이어요 · 3점 먼저',n:5,k:4},
    {id:'mis',name:'거꾸로',desc:'세 줄을 만들면 지는 판이에요',n:3,k:3,misere:true},
  ];
  function tLines(n,k){
    const out=[];
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){
      const ex=x+dx*(k-1),ey=y+dy*(k-1);
      if(ex<0||ey<0||ex>=n||ey>=n)continue;
      const line=[];for(let i=0;i<k;i++)line.push((y+dy*i)*n+x+dx*i);
      out.push(line);
    }
    return out;
  }
  function tGeo(n,k){
    const lines=tLines(n,k),byCell=[];
    for(let c=0;c<n*n;c++)byCell.push(lines.filter(l=>l.includes(c)));
    return {n,k,lines,byCell};
  }
  function tLineAt(b,geo,c,p){return geo.byCell[c].find(l=>l.every(i=>b[i]===p))||null;}
  /* Moves mutate b and queues in place and return an undo record, so the search needs no copying. */
  function tDo(b,qs,c,p,fade){
    let gone=-1;
    if(fade&&qs[p-1].length>=fade){gone=qs[p-1].shift();b[gone]=0;}
    b[c]=p;if(fade)qs[p-1].push(c);
    return gone;
  }
  function tUndo(b,qs,c,p,fade,gone){
    b[c]=0;if(fade)qs[p-1].pop();
    if(gone>=0){b[gone]=p;qs[p-1].unshift(gone);}
  }
  function tSearch(b,qs,geo,me,stage,maxDepth,budgetMs){
    const deadline=performance.now()+budgetMs,STOP={},sign=stage.misere?-1:1,fade=stage.fade||0;
    const heur=p=>{
      // Open lines each side still has: only used when the search is cut off on the larger boards.
      let s=0;const o=3-p;
      for(const l of geo.lines){let m=0,t=0;for(const i of l){if(b[i]===p)m++;else if(b[i]===o)t++;}if(m&&!t)s+=m*m;else if(t&&!m)s-=t*t;}
      return s*sign;
    };
    const nega=(p,depth,alpha,beta)=>{
      if(performance.now()>deadline)throw STOP;
      let best=-Infinity,any=false;
      for(let c=0;c<b.length;c++){
        if(b[c])continue;
        any=true;
        const gone=tDo(b,qs,c,p,fade);let v;
        if(tLineAt(b,geo,c,p))v=(1000+depth)*sign;
        else if(depth<=1)v=-heur(3-p);
        else v=-nega(3-p,depth-1,-beta,-alpha);
        tUndo(b,qs,c,p,fade,gone);
        if(v>best)best=v;if(v>alpha)alpha=v;if(alpha>=beta)break;
      }
      return any?best:0;
    };
    const empties=[];for(let c=0;c<b.length;c++)if(!b[c])empties.push(c);
    let pick=empties[0];
    try{
      for(let d=1;d<=maxDepth;d++){
        let top=-Infinity,cand=[];
        for(const c of empties){
          const gone=tDo(b,qs,c,me,fade);let v;
          try{v=tLineAt(b,geo,c,me)?(1000+d)*sign:d<=1?-heur(3-me):-nega(3-me,d-1,-Infinity,Infinity);}
          finally{tUndo(b,qs,c,me,fade,gone);}
          if(v>top){top=v;cand=[c];}else if(v===top)cand.push(c);
        }
        pick=cand[Math.floor(Math.random()*cand.length)];
      }
    }catch(e){if(e!==STOP)throw e;}
    return pick;
  }
  function tAiMove(b,qs,geo,me,level,stage){
    const work=Int8Array.from(b),q=qs.map(x=>x.slice());
    if(level===3)return tSearch(work,q,geo,me,stage,stage.fade?8:geo.n===3?9:7,280);
    if(level===2&&Math.random()<.8)return tSearch(work,q,geo,me,stage,3,120);
    // Beginner: takes an obvious win often and spots a block sometimes.
    const empties=[];for(let c=0;c<b.length;c++)if(!b[c])empties.push(c);
    if(!stage.misere){
      for(const [p,chance] of [[me,.75],[3-me,.5]]){
        if(Math.random()>chance)continue;
        for(const c of empties){const g=tDo(work,q,c,p,stage.fade||0),w=tLineAt(work,geo,c,p);tUndo(work,q,c,p,stage.fade||0,g);if(w)return c;}
      }
    }
    return empties[Math.floor(Math.random()*empties.length)];
  }

  /* ---------- Tic-tac-toe: match ---------- */
  let tttStage='std';
  const TT={on:false,raf:0,stage:null,geo:null,board:null,queues:[[],[]],turn:1,first:1,phase:'idle',resume:'human',scores:[0,0],hover:-1,pid:null,token:0,win:null,marks:new Map(),banner:null,sparks:[],lastT:0,bg:null,bgDirty:true,px:{m:0,cell:0},draws:0};
  const tCanvas=$('ttBoard'),tctx=tCanvas.getContext('2d',{alpha:false});
  const tIsAI=p=>aiLevel>0&&p===2;
  function tMood(p,mood,note){
    const i=p-1;$('ttPortrait'+i).src=portraitFor(i,mood);
    const t=$('ttTeam'+i);t.classList.toggle('react',mood==='happy'||mood==='surprised');t.classList.toggle('sad',mood==='sad'||mood==='angry');
    if(note!==undefined)$('ttNote'+i).textContent=note;
  }
  function tSync(){
    for(let i=0;i<2;i++){
      const mine=TT.turn===i+1&&(TT.phase==='human'||TT.phase==='ai');
      $('ttSide'+i).classList.toggle('active',mine);$('ttTeam'+i).classList.toggle('turn',mine);
      $('ttTurnLabel'+i).textContent=mine?(TT.phase==='ai'?'생각 중…':'내 차례!'):'';
      $('ttScore'+i).textContent=TT.scores[i];
      const mark=$('ttDisc'+i),g=mark.getContext('2d');mark.width=mark.height=120;g.clearRect(0,0,120,120);
      tMark(g,60,60,44,i+1,1);
    }
    $('ttCaption').textContent='HOJA 틱택토 · '+(TT.stage?TT.stage.name:'');
    $('ttTurnText').textContent=(TT.phase==='human'||TT.phase==='ai')?gamePlayerName(TT.turn-1)+' 차례':'';
    $('ttTurnText').className='game-time o-turn side'+(TT.turn-1);
    const rn=Math.min(7,(TT.round||0)+1);
    $('ttLeft').textContent=`${rn}판째 · ${rn>=7?'마지막 판':tNeed(rn)+'점 먼저'}`;
  }
  function tNewMatch(){
    TT.token++;clearTimeout(TT.aiTimer);
    TT.stage=T_STAGES.find(s=>s.id===tttStage);TT.geo=tGeo(TT.stage.n,TT.stage.k);
    TT.scores=[0,0];TT.round=0;TT.first=Math.random()<.5?1:2;TT.bgDirty=true;$('ttOverlay').hidden=true;
    for(let i=0;i<2;i++){
      $('ttName'+i).textContent=gamePlayerName(i);
      $('ttLabel'+i).textContent=aiLevel&&i===1?'COMPUTER · '+AI_LEVELS[aiLevel].label:i?'PLAYER 2 · 오른쪽':'PLAYER 1 · 왼쪽';
      const champ=streak.side===i&&streak.id===choices[i]&&streak.count>0;
      $('ttStreak'+i).textContent=champ?(streak.count>=2?streak.count+'연승 중':'챔피언'):'';
      $('ttTeam'+i).classList.toggle('champion',champ);
      tMood(i+1,'neutral',aiLevel&&i===1?'컴퓨터 상대':'');
    }
    tNewRound();
    playMood('calm');
  }
  function tNewRound(){
    const n=TT.stage.n;
    TT.board=new Int8Array(n*n);TT.queues=[[],[]];TT.win=null;TT.marks=new Map();TT.hover=-1;TT.pid=null;TT.sparks=[];TT.banner=null;
    tBeginTurn(TT.first);
  }
  function tBeginTurn(p){
    TT.turn=p;TT.phase=tIsAI(p)?'ai':'human';TT.hover=-1;TT.pid=null;tSync();
    if(TT.phase==='ai'){
      const tk=TT.token;
      TT.aiTimer=setTimeout(()=>{if(TT.on&&tk===TT.token&&TT.phase==='ai')tPlace(tAiMove(TT.board,TT.queues,TT.geo,p,aiLevel,TT.stage));},450+Math.random()*300);
    }
  }
  function tPlace(c){
    const p=TT.turn,now=performance.now();
    const gone=tDo(TT.board,TT.queues,c,p,TT.stage.fade||0);
    if(gone>=0){TT.marks.delete(gone);sfx('soft',.7);}
    TT.marks.set(c,now);sfx('wood',1);tSpark(c,8,[p===1?'#7ff0da':'#ffb59c','#ffffff'],.6);
    const line=tLineAt(TT.board,TT.geo,c,p);
    if(line){tRoundEnd(TT.stage.misere?3-p:p,line,p);return;}
    if(!TT.board.includes(0)){tRoundEnd(0,null,p);return;}
    tBeginTurn(3-p);
  }
  // 3×3 is a forced draw with perfect play: from the fifth round on, two points (and the lead) are enough.
  function tNeed(round){return TT.geo&&TT.geo.n===3&&round>=5?2:3;}
  function tRoundEnd(winner,line,mover){
    TT.phase='round';TT.round++;tSync();
    // A match also ends on rounds played; a tied score after the seventh is a draw.
    const lastRound=TT.round>=7;
    const tk=TT.token,now=performance.now();
    if(winner){
      TT.win={line,t0:now,p:mover};TT.scores[winner-1]++;tSync();
      sfx('goal',.9);cheer(.55);
      tMood(winner,'happy','한 줄 완성!');tMood(3-winner,'sad','아쉬워!');
      line.forEach((c,k)=>setTimeout(()=>{if(TT.on&&tk===TT.token)tSpark(c,14,[winner===1?'#7ff0da':'#ffb59c','#ffe08a','#ffffff']);},k*90));
      TT.banner={text:TT.stage.misere?`${gamePlayerName(mover-1)}이(가) 줄을 만들었어요!`:`${gamePlayerName(winner-1)} 1점!`,color:winner===1?SIDE_COLOR[0]:SIDE_COLOR[1],until:now+1900,ms:1900};
      TT.first=3-winner;
    }else{
      sfx('soft',1);tMood(1,'surprised','비겼다!');tMood(2,'surprised','비겼다!');
      TT.banner={text:'비겼어요! 다시 한 판',color:'#7a5a2e',until:now+1300,ms:1300};
      TT.first=3-TT.first;
    }
    // A draw in round five can also settle it, when the leader already has two.
    const [s0,s1]=TT.scores,lead=s0>s1?0:s1>s0?1:-1;
    if(lead>=0&&TT.scores[lead]>=tNeed(TT.round)){setTimeout(()=>{if(TT.on&&tk===TT.token)tFinish(lead);},winner?1800:1300);return;}
    if(lastRound){
      const [a,b]=TT.scores;
      setTimeout(()=>{if(TT.on&&tk===TT.token)tFinish(a===b?-1:a>b?0:1);},1300);
      return;
    }
    setTimeout(()=>{if(TT.on&&tk===TT.token&&TT.phase==='round'){tMood(1,'neutral','');tMood(2,'neutral','');tNewRound();}},1950);
  }
  function tFinish(w){
    TT.phase='over';tSync();
    let title='무승부!';
    if(w>=0){
      const repeat=streak.side===w&&streak.id===choices[w];
      streak={side:w,id:choices[w],count:repeat?streak.count+1:1};
      hofWin('ttt',w);
      tMood(w+1,'happy','이겼다!');tMood(2-w,'sad','아쉬워…');cheer(1.1);victoryJingle();
      title=streak.count>=2?`${gamePlayerName(w)} ${streak.count}연승!`:`${gamePlayerName(w)} 승리!`;
    }else{tMood(1,'surprised','막상막하!');tMood(2,'surprised','막상막하!');sfx('goal',.7);}
    const next=button('다음 도전자 ▶','primary',()=>{leaveTtt();enterSelection();});
    const again=button('↻ 바로 재대결','',tNewMatch);
    const home=button('← 모음집','',tHome);
    [next,again,home].forEach(b=>{b.disabled=true;setTimeout(()=>{b.disabled=false;},700);});
    tOverlay(title,`${TT.scores[0]} : ${TT.scores[1]}`,[next,again,home]);
  }
  function tHome(){streak={side:-1,id:null,count:0};leaveTtt();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});}
  function tOverlay(title,detail,actions){
    $('ttOverlay').hidden=false;$('ttOverlayTitle').textContent=title;$('ttOverlayDetail').textContent=detail;$('ttOverlayActions').replaceChildren(...actions);
  }
  function tOpenMenu(){
    if(TT.phase==='over'||TT.phase==='paused'||!TT.on)return;
    TT.resume=TT.phase;TT.phase='paused';TT.token++;clearTimeout(TT.aiTimer);
    const label=()=>soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';
    const sound=button(label(),'',()=>{cycleSound();sound.textContent=label();});
    tOverlay('잠깐 쉬는 중','',[
      button('▶ 계속','primary',()=>{$('ttOverlay').hidden=true;if(TT.resume==='round')tNewRound();else tBeginTurn(TT.turn);}),
      button('↻ 다시 하기','',tNewMatch),button('인물 변경','',()=>{leaveTtt();enterSelection();}),button('← 모음집','',tHome),sound]);
    tSync();
  }
  /* ---------- Tic-tac-toe: touch and drawing ---------- */
  function tPick(e){
    const r=tCanvas.getBoundingClientRect(),k=tCanvas.width/r.width,n=TT.stage.n,{m,cell}=TT.px;
    const x=Math.floor(((e.clientX-r.left)*k-m)/cell),y=Math.floor(((e.clientY-r.top)*k-m)/cell);
    return x>=0&&y>=0&&x<n&&y<n?y*n+x:-1;
  }
  tCanvas.addEventListener('pointerdown',e=>{
    if(!TT.on||TT.phase!=='human')return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();TT.pid=e.pointerId;TT.hover=tPick(e);
    try{tCanvas.setPointerCapture(e.pointerId);}catch{}
  },{passive:false});
  tCanvas.addEventListener('pointermove',e=>{if(e.pointerId===TT.pid&&TT.phase==='human')TT.hover=tPick(e);});
  function tRelease(e,cancel){
    if(e.pointerId!==TT.pid)return;
    const c=TT.hover;TT.pid=null;TT.hover=-1;
    if(cancel||TT.phase!=='human'||c<0)return;
    if(TT.board[c]){sfx('soft',.7);return;}
    tPlace(c);
  }
  tCanvas.addEventListener('pointerup',e=>tRelease(e,false));
  tCanvas.addEventListener('pointercancel',e=>tRelease(e,true));
  function tMark(g,x,y,r,p,t){
    g.save();g.lineCap='round';g.lineWidth=r*.34;
    if(p===1){
      g.strokeStyle='#17756a';g.beginPath();g.arc(x,y,r*.82,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,t));g.stroke();
    }else{
      g.strokeStyle='#d9573f';const s=r*.72,a=Math.min(1,t*2),b=clamp(t*2-1,0,1);
      g.beginPath();g.moveTo(x-s,y-s);g.lineTo(x-s+2*s*a,y-s+2*s*a);g.stroke();
      if(b>0){g.beginPath();g.moveTo(x+s,y-s);g.lineTo(x+s-2*s*b,y-s+2*s*b);g.stroke();}
    }
    g.restore();
  }
  function tCenter(c){const n=TT.stage.n,{m,cell}=TT.px;return {x:m+(c%n+.5)*cell,y:m+(Math.floor(c/n)+.5)*cell};}
  function tSpark(c,count,colors,speed=1){
    const {x,y}=tCenter(c);
    for(let k=0;k<count&&TT.sparks.length<200;k++){
      const a=Math.random()*Math.PI*2,s=TT.px.cell*(1+Math.random()*2.6)*speed;
      TT.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,ttl:.4+Math.random()*.4,c:colors[k%colors.length],sz:TT.px.cell*(.02+Math.random()*.03)});
    }
  }
  function tBuildBg(){
    const w=tCanvas.width,n=TT.stage?TT.stage.n:3,m=w*.05,cell=(w-2*m)/n;
    TT.px={m,cell};
    const c=TT.bg||document.createElement('canvas');c.width=c.height=w;
    const g=c.getContext('2d');
    g.fillStyle='#fff8e4';g.fillRect(0,0,w,w);
    g.strokeStyle='rgba(120,160,190,.25)';g.lineWidth=Math.max(1,w*.002);
    for(let y=w*.04;y<w;y+=w*.04){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
    g.strokeStyle='#4b3e35';g.lineCap='round';g.lineWidth=w*.016;g.beginPath();
    for(let i=1;i<n;i++){g.moveTo(m+i*cell,m*.8);g.lineTo(m+i*cell,w-m*.8);g.moveTo(m*.8,m+i*cell);g.lineTo(w-m*.8,m+i*cell);}
    g.stroke();
    TT.bg=c;TT.bgDirty=false;
  }
  function tDraw(now,dt){
    if(TT.bgDirty||!TT.bg)tBuildBg();
    const w=tCanvas.width,{cell}=TT.px,g=tctx;
    g.setTransform(1,0,0,1,0,0);g.drawImage(TT.bg,0,0);
    // The oldest mark blinks when placing again would remove it.
    const blink=[-1,-1];
    if(TT.stage.fade&&TT.phase==='human'||TT.stage.fade&&TT.phase==='ai'){const q=TT.queues[TT.turn-1];if(q.length>=TT.stage.fade)blink[TT.turn-1]=q[0];}
    for(let c=0;c<TT.board.length;c++){
      const v=TT.board[c];if(!v)continue;
      const {x,y}=tCenter(c),t=clamp((now-(TT.marks.get(c)||0))/240,0,1);
      g.globalAlpha=blink[v-1]===c?.35+.45*Math.abs(Math.sin(now/190)):1;
      tMark(g,x,y,cell*.36,v,t);g.globalAlpha=1;
    }
    if(TT.phase==='human'&&TT.hover>=0&&!TT.board[TT.hover]){
      const {x,y}=tCenter(TT.hover);g.globalAlpha=.32;tMark(g,x,y,cell*.36,TT.turn,1);g.globalAlpha=1;
    }
    if(TT.win){
      const l=TT.win.line,a=tCenter(l[0]),b=tCenter(l[l.length-1]),t=clamp((now-TT.win.t0)/320,0,1);
      g.save();g.strokeStyle='#f2b01e';g.lineCap='round';g.lineWidth=cell*.13;g.globalAlpha=.92;
      g.beginPath();g.moveTo(a.x,a.y);g.lineTo(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);g.stroke();g.restore();
    }
    for(let k=TT.sparks.length-1;k>=0;k--){
      const p=TT.sparks[k];p.ttl-=dt;if(p.ttl<=0){TT.sparks.splice(k,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;g.globalAlpha=Math.min(1,p.ttl*3);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.sz,0,Math.PI*2);g.fill();
    }
    g.globalAlpha=1;
    if(TT.banner){
      const left=TT.banner.until-now;
      if(left<=0)TT.banner=null;
      else if(left<TT.banner.ms-650){
        // Held back a moment so the winning line is seen being struck before anything covers it.
        g.save();g.globalAlpha=Math.min(1,left/180);g.fillStyle='rgba(255,248,230,.95)';const bh=w*.18;g.fillRect(0,w/2-bh/2,w,bh);
        const size=w*.066;g.font=`${size}px "HojaTitle",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=TT.banner.color;g.fillText(TT.banner.text,w/2,w/2);g.restore();
      }
    }
  }
  function tFrame(now){
    if(!TT.on)return;
    const dt=clamp((now-(TT.lastT||now))/1000,0,.05);TT.lastT=now;
    tDraw(now,dt);
    TT.raf=requestAnimationFrame(tFrame);
  }
  function tResize(){
    if(!TT.on)return;
    let size;
    if(TABLET){size=tabletBoardSize('tttScreen');if(!size)return;}
    else{const r=$('ttPlay').getBoundingClientRect();if(!r.width||!r.height)return;size=Math.floor(Math.min(r.height-10,r.width*.52));}
    $('ttShell').style.width=size+'px';$('ttShell').style.height=size+'px';
    const px=Math.round(size*Math.min(window.devicePixelRatio||1,2,1400/Math.max(1,size)));
    if(tCanvas.width!==px){tCanvas.width=px;tCanvas.height=px;}
    tBuildBg();if(TT.board)tDraw(performance.now(),0);
  }
  let tObserver=null;
  function enterTtt(){
    $('menuScreen').hidden=true;$('gameScreen').hidden=true;$('tttScreen').hidden=false;
    TT.on=true;TT.lastT=0;
    if(TABLET)for(let i=0;i<2;i++){const d=$('ttScore'+i);if(d)$('ttTeam'+i).querySelector('.team-text').append(d);}
    tObserver=new ResizeObserver(tResize);tObserver.observe($(TABLET?'tttScreen':'ttPlay'));
    tNewMatch();tResize();
    TT.raf=requestAnimationFrame(tFrame);
  }
  function leaveTtt(){roundClose();
    TT.on=false;TT.token++;clearTimeout(TT.aiTimer);cancelAnimationFrame(TT.raf);
    if(tObserver){tObserver.disconnect();tObserver=null;}
    $('tttScreen').hidden=true;$('ttOverlay').hidden=true;TT.phase='idle';
  }
  for(let i=0;i<2;i++)$('ttMenu'+i).addEventListener('click',()=>{sfx('menu',.7);tOpenMenu();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&TT.on&&location.hash!=='#debug')tOpenMenu();});

