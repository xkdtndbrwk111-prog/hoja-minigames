  /* ---------- Othello: rules ---------- */
  const O_STAGES=[
    {id:'mini',name:'미니 6×6',desc:'빨리 끝나는 작은 판',n:6},
    {id:'std',name:'정식 8×8',desc:'기본 오셀로',n:8},
    {id:'holes',name:'구멍 판',desc:'구멍에는 둘 수 없고 줄도 거기서 끊겨요',n:8,holes:true},
    {id:'clock',name:'20초 승부',desc:'한 수에 20초 · 넘기면 자동으로 둬요',n:8,clock:20},
    {id:'misere',name:'거꾸로',desc:'돌이 더 적은 사람이 이겨요',n:8,misere:true},
  ];
  const HOLE=-1,DIRS=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  function oGeometry(n,holes=[]){
    const isHole=new Set(holes),rays=[];
    for(let c=0;c<n*n;c++){
      const x=c%n,y=Math.floor(c/n),list=[];
      for(const [dx,dy] of DIRS){
        const ray=[];let i=x+dx,j=y+dy;
        // A hole ends the line: discs on the far side of it cannot be captured through it.
        while(i>=0&&j>=0&&i<n&&j<n&&!isHole.has(j*n+i)){ray.push(j*n+i);i+=dx;j+=dy;}
        if(ray.length>=2)list.push(ray);
      }
      rays.push(list);
    }
    return {n,rays,holes:isHole};
  }
  function oStart(geo){
    const n=geo.n,b=new Int8Array(n*n),m=n/2;
    for(const h of geo.holes)b[h]=HOLE;
    b[(m-1)*n+m-1]=2;b[m*n+m]=2;b[(m-1)*n+m]=1;b[m*n+m-1]=1;
    return b;
  }
  function oFlips(b,geo,c,me){
    const out=[],opp=3-me;
    for(const ray of geo.rays[c]){
      let i=0;while(i<ray.length&&b[ray[i]]===opp)i++;
      if(i>0&&i<ray.length&&b[ray[i]]===me)for(let k=0;k<i;k++)out.push(ray[k]);
    }
    return out;
  }
  function oCanMove(b,geo,c,me){
    const opp=3-me;
    for(const ray of geo.rays[c]){
      if(b[ray[0]]!==opp)continue;
      let i=1;while(i<ray.length&&b[ray[i]]===opp)i++;
      if(i<ray.length&&b[ray[i]]===me)return true;
    }
    return false;
  }
  function oMoves(b,geo,me){
    const out=[];
    for(let c=0;c<b.length;c++)if(b[c]===0&&oCanMove(b,geo,c,me))out.push(c);
    return out;
  }
  function oCount(b){let a=0,d=0;for(let i=0;i<b.length;i++){if(b[i]===1)a++;else if(b[i]===2)d++;}return [a,d];}
  function oRandomHoles(n){
    // Mirrored so neither player's side of the board is luckier; never next to the opening four.
    const m=n/2,picks=new Set();
    const pool=[];
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const corner=(x===0||x===n-1)&&(y===0||y===n-1),near=Math.abs(x-m+.5)<2&&Math.abs(y-m+.5)<2;
      if(!corner&&!near)pool.push([x,y]);
    }
    while(picks.size<4){
      const [x,y]=pool[Math.floor(Math.random()*pool.length)];
      picks.add(y*n+x);picks.add((n-1-y)*n+(n-1-x));
    }
    return [...picks];
  }

  /* ---------- Othello: computer player ---------- */
  function oWeights(n){
    const w=new Int16Array(n*n),last=n-1;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const ex=x===0||x===last,ey=y===0||y===last,nx=x===1||x===last-1,ny=y===1||y===last-1;
      let v=1;
      if(ex&&ey)v=100;else if(nx&&ny)v=-40;else if((ex&&ny)||(ey&&nx))v=-18;else if(ex||ey)v=8;
      w[y*n+x]=v;
    }
    return w;
  }
  const O_TIMEOUT={};
  function oSearch(b,geo,me,misere,maxDepth,budgetMs){
    const w=oWeights(geo.n),deadline=performance.now()+budgetMs;let ticks=0;
    const final=(p)=>{const [a,d]=oCount(b),diff=(p===1?a-d:d-a)*(misere?-1:1);return diff*1000;};
    const evalPos=(p)=>{
      let s=0;const opp=3-p;
      for(let i=0;i<b.length;i++){if(b[i]===p)s+=w[i];else if(b[i]===opp)s-=w[i];}
      if(misere)s=-s;
      return s+6*(oMoves(b,geo,p).length-oMoves(b,geo,opp).length);
    };
    const nega=(p,depth,alpha,beta,passed)=>{
      if((++ticks&255)===0&&performance.now()>deadline)throw O_TIMEOUT;
      if(depth<=0)return evalPos(p);
      const moves=oMoves(b,geo,p),opp=3-p;
      if(!moves.length){if(passed)return final(p);return -nega(opp,depth-1,-beta,-alpha,true);}
      moves.sort((x,y)=>w[y]-w[x]);
      let best=-Infinity;
      for(const c of moves){
        const fl=oFlips(b,geo,c,p);
        b[c]=p;for(const f of fl)b[f]=p;
        const v=-nega(opp,depth-1,-beta,-alpha,false);
        b[c]=0;for(const f of fl)b[f]=opp;
        if(v>best)best=v;
        if(v>alpha)alpha=v;
        if(alpha>=beta)break;
      }
      return best;
    };
    let moves=oMoves(b,geo,me).sort((x,y)=>w[y]-w[x]),bestMove=moves[0];
    try{
      for(let d=1;d<=maxDepth;d++){
        let top=-Infinity,pick=moves[0];
        for(const c of moves){
          const fl=oFlips(b,geo,c,me),opp=3-me;
          b[c]=me;for(const f of fl)b[f]=me;
          let v;
          try{v=-nega(opp,d-1,-Infinity,-top,false);}
          finally{b[c]=0;for(const f of fl)b[f]=opp;}
          if(v>top){top=v;pick=c;}
        }
        bestMove=pick;moves=[pick,...moves.filter(c=>c!==pick)];
      }
    }catch(e){if(e!==O_TIMEOUT)throw e;}
    return bestMove;
  }
  function oAiMove(b,geo,me,level,misere){
    const moves=oMoves(b,geo,me);
    if(moves.length===1)return moves[0];
    if(level===1){
      // Plays like a beginner: grabs the most discs half the time, otherwise anything.
      if(Math.random()<.5)return moves[Math.floor(Math.random()*moves.length)];
      const score=c=>oFlips(b,geo,c,me).length*(misere?-1:1)+Math.random()*1.5;
      return moves.reduce((x,y)=>score(y)>score(x)?y:x);
    }
    const work=Int8Array.from(b);
    return level===2?oSearch(work,geo,me,misere,3,200):oSearch(work,geo,me,misere,12,380);
  }

  /* ---------- Othello: match ---------- */
  let othelloStage='std';
  const O={on:false,raf:0,stage:null,geo:null,board:null,turn:1,moves:[],flipsAt:new Map(),phase:'idle',resume:'human',
    show:null,anim:[],pop:null,last:-1,hover:-1,pid:null,history:[],hints:[2,2],undos:2,hintCell:-1,hintUntil:0,
    timer:0,token:0,banner:null,sprites:[null,null],bg:null,bgDirty:true,size:0,px:{m:0,cell:0},
    floats:[],sparks:[],shake:0,flashAt:0,counted:null,displayed:[2,2],faces:[new Image(),new Image()],lastT:0};
  const oCanvas=$('oBoard'),octx=oCanvas.getContext('2d',{alpha:false}),oShell=$('oShell');
  O.faces.forEach(im=>im.addEventListener('load',()=>{oBuildSprites();}));
  const oSide=p=>p-1;
  const oIsAI=p=>aiLevel>0&&p===2;
  const oName=p=>nameFor(oSide(p));
  function oMood(p,mood,note){
    const i=oSide(p),img=$('oPortrait'+i);
    img.src=portraitFor(i,mood);
    const t=$('oTeam'+i);
    t.classList.toggle('react',mood==='happy'||mood==='surprised');
    t.classList.toggle('sad',mood==='sad'||mood==='angry');
    if(note!==undefined)$('oNote'+i).textContent=note;
  }
  function oSyncScore(){
    $('oScore0').textContent=O.displayed[0];$('oScore1').textContent=O.displayed[1];
    const empties=O.board?O.board.reduce((s,v)=>s+(v===0?1:0),0):0;
    $('oLeft').textContent='빈칸 '+empties;
  }
  function oSyncTurnUI(){
    for(let i=0;i<2;i++){
      const mine=O.turn===i+1&&(O.phase==='human'||O.phase==='ai'||O.phase==='anim');
      $('oSide'+i).classList.toggle('active',mine);
      $('oTeam'+i).classList.toggle('turn',mine);
      const human=!oIsAI(i+1);
      const hint=$('oHint'+i),undo=$('oUndo'+i);
      hint.hidden=!human;hint.textContent='힌트 '+O.hints[i];
      hint.disabled=!(mine&&O.phase==='human'&&O.hints[i]>0);
      // Taking a move back only makes sense against the computer; between two children it starts arguments.
      undo.hidden=!(aiLevel>0&&human);undo.textContent='무르기 '+O.undos;
      undo.disabled=!(O.undos>0&&O.history.length>0&&(O.phase==='human'||O.phase==='ai'));
      let line='';
      if(mine)line=O.phase==='ai'?'생각 중…':'내 차례!';
      $('oTurnLabel'+i).textContent=line;
      const tip=$('oTip'+i);
      tip.textContent=mine&&O.phase==='human'?(O.stage&&O.stage.misere?'적게 뒤집는 쪽이 유리해요':'점 찍힌 칸을 눌러요'):'';
    }
    $('oCaption').textContent='HOJA OTHELLO · '+(O.stage?O.stage.name:'');
    const txt=O.phase==='ai'||O.phase==='human'||O.phase==='anim'?oName(O.turn)+' 차례':'';
    $('oTurnText').textContent=txt;
    $('oTurnText').className='game-time o-turn side'+(O.turn-1);
  }
  function oBanner(text,color,ms=1300){O.banner={text,color,until:performance.now()+ms,ms};}
  function oFloat(c,text,color,size=.5,ttl=1.1){O.floats.push({c,text,color,size,ttl,life:ttl});}
  function oBurst(c,n,colors,speed=1){
    const {x,y}=oCellCenter(c);
    for(let k=0;k<n&&O.sparks.length<260;k++){
      const a=Math.random()*Math.PI*2,s=O.px.cell*(1.2+Math.random()*3.4)*speed;
      O.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,ttl:.45+Math.random()*.45,c:colors[k%colors.length],sz:O.px.cell*(.04+Math.random()*.06)});
    }
  }
  function oConfetti(colors){
    const w=oCanvas.width;
    for(let k=0;k<150&&O.sparks.length<320;k++){
      O.sparks.push({x:Math.random()*w,y:-Math.random()*w*.3,vx:(Math.random()-.5)*w*.12,vy:w*(.15+Math.random()*.25),ttl:1.5+Math.random()*1.4,c:colors[k%colors.length],sz:w*(.006+Math.random()*.007),conf:true,rot:Math.random()*6});
    }
  }
  function oNewMatch(){
    O.token++;clearTimeout(O.aiTimer);
    const st=O_STAGES.find(s=>s.id===othelloStage);
    O.stage=st;O.geo=oGeometry(st.n,st.holes?oRandomHoles(st.n):[]);
    O.board=oStart(O.geo);O.show=Int8Array.from(O.board);
    O.anim=[];O.pop=null;O.last=-1;O.hover=-1;O.pid=null;O.history=[];O.hints=[2,2];O.undos=2;O.hintCell=-1;
    O.floats=[];O.sparks=[];O.counted=null;O.banner=null;O.displayed=oCount(O.board);
    O.bgDirty=true;$('oOverlay').hidden=true;
    for(let i=0;i<2;i++){
      $('oName'+i).textContent=nameFor(i);
      O.faces[i].src=portraitFor(i);
      $('oLabel'+i).textContent=aiLevel&&i===1?'COMPUTER · '+AI_LEVELS[aiLevel].label:i?'PLAYER 2 · 오른쪽':'PLAYER 1 · 왼쪽';
      oMood(i+1,'neutral',aiLevel&&i===1?'컴퓨터 상대':'한 판 해볼까?');
      const champ=streak.side===i&&streak.id===choices[i]&&streak.count>0;
      $('oStreak'+i).textContent=champ?(streak.count>=2?streak.count+'연승 중':'챔피언'):'';
      $('oTeam'+i).classList.toggle('champion',champ);
    }
    oBuildSprites();
    const first=Math.random()<.5?1:2;
    O.turn=first;O.phase='opening';oSyncScore();oSyncTurnUI();
    oBanner(oName(first)+' 먼저!',first===1?SIDE_COLOR[0]:SIDE_COLOR[1],1200);sfx('goal',.6);
    const tk=O.token;setTimeout(()=>{if(O.on&&tk===O.token&&O.phase==='opening')oBeginTurn(first);},1250);
    playMood('calm');
  }
  function oBeginTurn(p){
    O.turn=p;O.moves=oMoves(O.board,O.geo,p);O.flipsAt=new Map(O.moves.map(c=>[c,oFlips(O.board,O.geo,c,p)]));
    O.hintCell=-1;O.hover=-1;O.pid=null;
    O.phase=oIsAI(p)?'ai':'human';
    O.timer=(O.stage.clock&&O.phase==='human')?O.stage.clock:0;
    oSyncTurnUI();
    if(O.phase==='ai'){
      const tk=O.token;
      O.aiTimer=setTimeout(()=>{
        if(!O.on||tk!==O.token||O.phase!=='ai')return;
        oPlace(oAiMove(O.board,O.geo,p,aiLevel,!!O.stage.misere));
      },700+Math.random()*350);
    }
  }
  function oPlace(c){
    const p=O.turn,fl=O.flipsAt.get(c)||oFlips(O.board,O.geo,c,p);
    O.history.push({board:Int8Array.from(O.board),turn:p,last:O.last});
    O.board[c]=p;for(const f of fl)O.board[f]=p;
    O.last=c;O.hover=-1;O.pid=null;O.phase='anim';O.hintCell=-1;O.timer=0;
    const n=O.geo.n,cx=c%n,cy=Math.floor(c/n),now=performance.now();
    O.show[c]=p;O.pop={c,t0:now};
    O.displayed[oSide(p)]++;
    sfx('wood',1);
    O.anim=fl.map(f=>{
      const d=Math.max(Math.abs(f%n-cx),Math.abs(Math.floor(f/n)-cy));
      return {c:f,t0:now+90+(d-1)*75,dur:280,to:p,started:false};
    });
    O.animCount=0;O.animTotal=fl.length;O.animEnd=now+90+(O.anim.length?Math.max(...O.anim.map(a=>a.t0-now-90))+280:120);
    O.lastPlaced={c,p,flips:fl.length};
    oSyncScore();oSyncTurnUI();
  }
  function oAfterMove(){
    const {c,p,flips}=O.lastPlaced,opp=3-p,n=O.geo.n,last=n-1,x=c%n,y=Math.floor(c/n);
    const isCorner=(x===0||x===last)&&(y===0||y===last);
    if(isCorner){
      oFloat(c,O.stage.misere?'모서리…!':'모서리 점령!',SIDE_COLOR[oSide(p)],.62,1.3);oBurst(c,22,['#ffe08a','#ffffff',SIDE_GLOW[oSide(p)]]);
      sfx('goal',.8);O.shake=Math.max(O.shake,.1);
      oMood(p,'happy',O.stage.misere?'이건 위험한데?':'모서리는 내 거야!');oMood(opp,'surprised','앗, 모서리!');
    }else if(flips>=6){
      oFloat(c,flips+'개 뒤집기!',SIDE_COLOR[oSide(p)],.7,1.3);oBurst(c,18+flips,[SIDE_GLOW[oSide(p)],'#ffffff','#ffe08a']);
      sfx('smash',.8);cheer(.45);O.shake=Math.max(O.shake,.14);
      oMood(p,O.stage.misere?'surprised':'happy',O.stage.misere?'너무 많이 뒤집었어!':'한 번에 '+flips+'개!');oMood(opp,O.stage.misere?'happy':'sad',O.stage.misere?'좋았어!':'으악!');
    }else{
      oMood(p,'neutral','');oMood(opp,'neutral','');
      $('oNote'+oSide(p)).textContent=flips>=3?flips+'개 뒤집었다!':'';$('oNote'+oSide(opp)).textContent='';
    }
    const nextMoves=oMoves(O.board,O.geo,opp);
    if(nextMoves.length){oBeginTurn(opp);return;}
    const mine=oMoves(O.board,O.geo,p);
    if(mine.length){
      O.phase='pass';oSyncTurnUI();
      oBanner(oName(opp)+'는 둘 곳이 없어요!','#7a5a2e',1500);sfx('soft',.9);oMood(opp,'sad','둘 곳이 없어…');
      const tk=O.token;setTimeout(()=>{if(O.on&&tk===O.token&&O.phase==='pass')oBeginTurn(p);},1550);
      return;
    }
    oEndGame();
  }
  function oEndGame(){
    // Count the discs out one by one: the final score reveal is the best moment of the game for the room.
    O.phase='count';oSyncTurnUI();stopBgm(.8);
    const cells=[[],[]];
    O.board.forEach((v,i)=>{if(v===1)cells[0].push(i);else if(v===2)cells[1].push(i);});
    const seq=[];
    for(let i=0;i<Math.max(cells[0].length,cells[1].length);i++){if(i<cells[0].length)seq.push([0,cells[0][i]]);if(i<cells[1].length)seq.push([1,cells[1][i]]);}
    O.counted=new Set();O.displayed=[0,0];oSyncScore();
    const step=Math.min(70,2600/Math.max(1,seq.length));
    O.countSeq=seq;O.countIdx=0;O.countStep=step;O.countNext=performance.now()+500;
    const [a,d]=oCount(O.board);
    $('oNote0').textContent='';$('oNote1').textContent='';
    O.finalCounts=[a,d];
  }
  function oFinish(){
    const [a,d]=O.finalCounts;let winner=a===d?-1:(a>d?0:1);
    if(O.stage.misere&&winner>=0)winner=1-winner;
    O.phase='over';
    const line=`${a} : ${d}`+(O.stage.misere?'   ·   거꾸로 판: 적은 쪽 승리':'');
    let title;
    if(winner<0){
      title='무승부!';oMood(1,'surprised','똑같네!');oMood(2,'surprised','다시 붙자!');sfx('goal',.7);
    }else{
      const repeat=streak.side===winner&&streak.id===choices[winner];
      streak={side:winner,id:choices[winner],count:repeat?streak.count+1:1};
      hofWin('othello',winner);
      title=streak.count>=2?`${nameFor(winner)} ${streak.count}연승!`:`${nameFor(winner)} 승리!`;
      oMood(winner+1,'happy','이겼다!');oMood(2-winner,'sad','아쉬워…');
      sfx('goal',1.1);cheer(1.1);
      oConfetti([SIDE_COLOR[winner],SIDE_GLOW[winner],'#ffe08a','#ffffff']);
      victoryJingle();
    }
    const next=button('다음 도전자 ▶','primary',()=>{leaveOthello();enterSelection();});
    const again=button('↻ 바로 재대결','',()=>{oNewMatch();});
    const home=button('← 모음집','',()=>{streak={side:-1,id:null,count:0};leaveOthello();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});});
    [next,again,home].forEach(b=>{b.disabled=true;setTimeout(()=>{b.disabled=false;},900);});
    setTimeout(()=>{if(O.on&&O.phase==='over')oOverlay(title,line,[next,again,home]);},winner<0?300:1100);
    oSyncTurnUI();
  }
  function oOverlay(title,detail,actions){
    $('oOverlay').hidden=false;$('oOverlayTitle').textContent=title;$('oOverlayDetail').textContent=detail;
    $('oOverlayActions').replaceChildren(...actions);
  }
  function oOpenMenu(){
    if(O.phase==='over'||O.phase==='count'||O.phase==='paused')return;
    O.resume=O.phase;O.phase='paused';O.token++;clearTimeout(O.aiTimer);
    const sound=button(soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔','',()=>{cycleSound();sound.textContent=soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';});
    oOverlay('잠깐 쉬는 중','',[
      button('▶ 계속','primary',oCloseMenu),
      button('↻ 다시 하기','',()=>{oNewMatch();}),
      button('인물 변경','',()=>{leaveOthello();enterSelection();}),
      button('← 모음집','',()=>{leaveOthello();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});}),
      sound,
    ]);
    oSyncTurnUI();
  }
  function oCloseMenu(){
    $('oOverlay').hidden=true;
    const r=O.resume;
    if(r==='human'||r==='ai'||r==='opening'||r==='pass'){const t=O.timer;oBeginTurn(O.turn);if(r==='human'&&t>0)O.timer=t;}
    else{O.phase=r;oSyncTurnUI();}
  }
  function oUseHint(i){
    if(O.phase!=='human'||O.turn!==i+1||O.hints[i]<=0)return;
    O.hints[i]--;
    O.hintCell=oSearch(Int8Array.from(O.board),O.geo,O.turn,!!O.stage.misere,6,300);O.hintUntil=performance.now()+3500;
    sfx('item',.8);oMood(O.turn,'happy','여기가 좋아 보여!');oSyncTurnUI();
  }
  function oUndo(){
    if(!aiLevel||O.undos<=0||!O.history.length||(O.phase!=='human'&&O.phase!=='ai'))return;
    // Rewind to the child's last decision, past the computer's reply.
    let snap=null;
    while(O.history.length){snap=O.history.pop();if(snap.turn===1)break;}
    if(!snap||snap.turn!==1)return;
    O.token++;clearTimeout(O.aiTimer);O.undos--;
    O.board=Int8Array.from(snap.board);O.show=Int8Array.from(O.board);O.last=snap.last;O.anim=[];O.pop=null;
    O.displayed=oCount(O.board);oSyncScore();sfx('menu',.8,.8);oBeginTurn(1);
  }

  /* ---------- Othello: touch ---------- */
  function oCellCenter(c){const n=O.geo.n,{m,cell}=O.px;return {x:m+(c%n+.5)*cell,y:m+(Math.floor(c/n)+.5)*cell};}
  function oPick(e){
    const r=oCanvas.getBoundingClientRect(),k=oCanvas.width/r.width,n=O.geo.n,{m,cell}=O.px;
    const fx=((e.clientX-r.left)*k-m)/cell,fy=((e.clientY-r.top)*k-m)/cell;
    const x=Math.floor(fx),y=Math.floor(fy);
    const direct=(x>=0&&y>=0&&x<n&&y<n)?y*n+x:-1;
    if(direct>=0&&O.flipsAt.has(direct))return direct;
    // Board touch isn't precise under a child's finger: a near miss snaps to the closest legal square.
    let best=-1,bd=.8;
    for(const c of O.moves){
      const d=Math.hypot(c%n+.5-fx,Math.floor(c/n)+.5-fy);
      if(d<bd){bd=d;best=c;}
    }
    return best;
  }
  oCanvas.addEventListener('pointerdown',e=>{
    if(!O.on||O.phase!=='human')return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();
    O.pid=e.pointerId;O.hover=oPick(e);
    if(O.hover>=0)sfx('menu',.45,1.3);
    try{oCanvas.setPointerCapture(e.pointerId);}catch{}
  },{passive:false});
  oCanvas.addEventListener('pointermove',e=>{
    if(e.pointerId!==O.pid||O.phase!=='human')return;
    const c=oPick(e);
    if(c!==O.hover){O.hover=c;if(c>=0)sfx('menu',.35,1.3);}
  });
  function oRelease(e,cancel){
    if(e.pointerId!==O.pid)return;
    const c=O.hover;O.pid=null;O.hover=-1;
    if(cancel||O.phase!=='human')return;
    if(c>=0&&O.flipsAt.has(c))oPlace(c);
    else{sfx('soft',.8);O.flashAt=performance.now();$('oTip'+oSide(O.turn)).textContent='점 찍힌 칸에만 둘 수 있어요';}
  }
  oCanvas.addEventListener('pointerup',e=>oRelease(e,false));
  oCanvas.addEventListener('pointercancel',e=>oRelease(e,true));

  /* ---------- Othello: drawing ---------- */
  function oBuildSprites(){
    if(!O.px.cell)return;
    const S=Math.ceil(O.px.cell*.86);
    const paints=[['#3a9c90','#0f4b45','#0a2f2b'],['#fff4e8','#f5ad8c','#b4583e']];
    for(let i=0;i<2;i++){
      const c=document.createElement('canvas');c.width=c.height=S;
      const g=c.getContext('2d'),r=S/2,[hi,lo,rim]=paints[i];
      const grad=g.createRadialGradient(r*.75,r*.65,r*.1,r,r,r);grad.addColorStop(0,hi);grad.addColorStop(1,lo);
      const rimW=Math.max(2,S*.045);
      g.beginPath();g.arc(r,r,r-rimW/2-.5,0,Math.PI*2);g.fillStyle=grad;g.fill();
      g.lineWidth=rimW;g.strokeStyle=rim;g.stroke();
      const im=O.faces[i];
      if(im.complete&&im.naturalWidth){
        const fr=r*.62;
        g.save();g.beginPath();g.arc(r,r,fr,0,Math.PI*2);g.clip();
        g.fillStyle='#fffaf0';g.fillRect(0,0,S,S);
        g.drawImage(im,r-fr*1.2,r-fr*1.2,fr*2.4,fr*2.4);g.restore();
        g.beginPath();g.arc(r,r,fr,0,Math.PI*2);g.lineWidth=Math.max(1.5,S*.02);g.strokeStyle=rim;g.stroke();
      }
      O.sprites[i]=c;
      const side=$('oDisc'+i);side.width=side.height=S;side.getContext('2d').drawImage(c,0,0);
    }
  }
  function oBuildBg(){
    const w=oCanvas.width,n=O.geo?O.geo.n:8,m=Math.round(w*.038),cell=(w-2*m)/n;
    O.px={m,cell};
    const c=O.bg||document.createElement('canvas');c.width=c.height=w;
    const g=c.getContext('2d');
    const wood=g.createLinearGradient(0,0,w,w);wood.addColorStop(0,'#8a5f3c');wood.addColorStop(.5,'#6f4a2d');wood.addColorStop(1,'#573821');
    g.fillStyle=wood;g.fillRect(0,0,w,w);
    g.strokeStyle='rgba(255,235,200,.25)';g.lineWidth=w*.004;g.strokeRect(w*.006,w*.006,w*.988,w*.988);
    const felt=g.createLinearGradient(0,m,0,w-m);felt.addColorStop(0,'#5fb39a');felt.addColorStop(1,'#3f9580');
    g.fillStyle=felt;g.fillRect(m,m,w-2*m,w-2*m);
    // Checkered felt keeps rows readable from across the room.
    g.fillStyle='rgba(255,255,255,.055)';
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)if((x+y)%2===0)g.fillRect(m+x*cell,m+y*cell,cell,cell);
    g.strokeStyle='rgba(20,55,48,.65)';g.lineWidth=Math.max(1.5,w*.0028);
    g.beginPath();
    for(let i=0;i<=n;i++){g.moveTo(m+i*cell,m);g.lineTo(m+i*cell,w-m);g.moveTo(m,m+i*cell);g.lineTo(w-m,m+i*cell);}
    g.stroke();
    if(n===8){
      g.fillStyle='rgba(20,55,48,.8)';
      for(const [x,y] of [[2,2],[6,2],[2,6],[6,6]]){g.beginPath();g.arc(m+x*cell,m+y*cell,w*.0065,0,Math.PI*2);g.fill();}
    }
    // Corners are the strategic heart of the game, so they get a quiet marker children can learn to want.
    g.strokeStyle='rgba(255,224,138,.7)';g.lineWidth=w*.004;
    for(const [x,y] of [[0,0],[n-1,0],[0,n-1],[n-1,n-1]])g.strokeRect(m+x*cell+cell*.09,m+y*cell+cell*.09,cell*.82,cell*.82);
    if(O.geo)for(const h of O.geo.holes){
      const x=m+(h%n)*cell,y=m+Math.floor(h/n)*cell;
      g.fillStyle='#22302c';g.fillRect(x+1,y+1,cell-2,cell-2);
      g.beginPath();g.arc(x+cell/2,y+cell/2,cell*.3,0,Math.PI*2);g.fillStyle='#121b19';g.fill();
      g.strokeStyle='#44524d';g.lineWidth=w*.003;g.beginPath();
      g.moveTo(x+cell*.32,y+cell*.32);g.lineTo(x+cell*.68,y+cell*.68);g.moveTo(x+cell*.68,y+cell*.32);g.lineTo(x+cell*.32,y+cell*.68);g.stroke();
    }
    O.bg=c;O.bgDirty=false;
  }
  function oDrawDisc(c,owner,scale=1,alpha=1,flipT=null,fromOwner=0){
    const spr=O.sprites[owner-1];if(!spr)return;
    const {x,y}=oCellCenter(c),S=spr.width*scale;
    octx.save();octx.globalAlpha=alpha;
    octx.fillStyle='rgba(15,35,30,.32)';octx.beginPath();octx.ellipse(x+S*.03,y+S*.05,S*.5,S*.5,0,0,Math.PI*2);
    if(flipT===null)octx.fill();
    if(flipT!==null){
      const t=flipT,sx=Math.abs(Math.cos(Math.PI*t)),lift=1+.22*Math.sin(Math.PI*t);
      const s=O.sprites[(t<.5?fromOwner:owner)-1];
      octx.translate(x,y);octx.scale(sx*lift,lift);octx.drawImage(s,-spr.width/2,-spr.width/2);
    }else octx.drawImage(spr,x-S/2,y-S/2,S,S);
    octx.restore();
  }
  function oText(str,x,y,size,color){
    octx.font=`${size}px "HojaTitle",sans-serif`;octx.textAlign='center';octx.textBaseline='middle';
    octx.lineJoin='round';octx.lineWidth=size*.22;octx.strokeStyle='rgba(255,255,255,.95)';octx.strokeText(str,x,y);
    octx.fillStyle=color;octx.fillText(str,x,y);
  }
  function oDraw(now,dt){
    if(O.bgDirty||!O.bg){oBuildBg();oBuildSprites();}
    const w=oCanvas.width,{cell}=O.px,n=O.geo.n;
    const sh=O.shake>.01&&!reducedMotion?(Math.random()-.5)*O.shake*cell:0;
    octx.setTransform(1,0,0,1,0,0);octx.drawImage(O.bg,sh,sh);
    const myCol=SIDE_COLOR[oSide(O.turn)];
    // Legal squares, drawn in the colour of whoever is to play.
    if(O.phase==='human'){
      const pulse=.5+.5*Math.sin(now/260),boost=now-O.flashAt<700?1.6:1;
      for(const c of O.moves){
        const {x,y}=oCellCenter(c);
        octx.beginPath();octx.arc(x,y,cell*(.13+.03*pulse)*boost,0,Math.PI*2);
        octx.fillStyle=O.turn===1?'rgba(10,47,43,.82)':'rgba(255,240,226,.95)';octx.fill();
        octx.lineWidth=Math.max(2,cell*.03);octx.strokeStyle=O.turn===1?'rgba(255,255,255,.75)':'rgba(180,88,62,.9)';octx.stroke();
      }
    }
    // Discs
    const animating=new Map();
    for(const a of O.anim)animating.set(a.c,a);
    for(let c=0;c<O.show.length;c++){
      const v=O.show[c];if(v<=0)continue;
      const a=animating.get(c);
      if(a&&now>=a.t0)oDrawDisc(c,a.to,1,1,clamp((now-a.t0)/a.dur,0,1),3-a.to);
      else if(O.pop&&O.pop.c===c){
        const t=clamp((now-O.pop.t0)/170,0,1);oDrawDisc(c,v,1.45-.45*t*t,.5+.5*t);
      }else if(O.counted){oDrawDisc(c,v,O.counted.has(c)?1:.92,O.counted.has(c)?1:.42);}
      else oDrawDisc(c,v);
    }
    if(O.last>=0&&O.phase!=='count'&&O.phase!=='over'){
      const {x,y}=oCellCenter(O.last);
      octx.strokeStyle='#ffd25a';octx.lineWidth=Math.max(3,cell*.05);octx.beginPath();octx.arc(x,y,cell*.45,0,Math.PI*2);octx.stroke();
    }
    // Press-and-hold preview: shows exactly what this move would flip before the finger lifts.
    if(O.phase==='human'&&O.hover>=0){
      const fl=O.flipsAt.get(O.hover)||[];
      const {x,y}=oCellCenter(O.hover);
      oDrawDisc(O.hover,O.turn,1,.8);
      octx.lineWidth=Math.max(4,cell*.07);octx.strokeStyle=myCol;
      for(const f of fl){
        const q=oCellCenter(f),wob=1+.05*Math.sin(now/70);
        octx.beginPath();octx.arc(q.x,q.y,cell*.46*wob,0,Math.PI*2);octx.stroke();
      }
      oText(fl.length+'개 뒤집기',clamp(x,cell*1.3,w-cell*1.3),y-cell*1.05<cell*.4?y+cell*1.05:y-cell*1.05,cell*.42,myCol);
    }
    if(O.hintCell>=0&&now<O.hintUntil&&O.phase==='human'){
      const {x,y}=oCellCenter(O.hintCell),p=.5+.5*Math.sin(now/110);
      octx.strokeStyle='#ffd25a';octx.lineWidth=cell*.09;octx.beginPath();octx.arc(x,y,cell*(.34+.08*p),0,Math.PI*2);octx.stroke();
    }
    // Sparks
    for(let k=O.sparks.length-1;k>=0;k--){
      const p=O.sparks[k];p.ttl-=dt;if(p.ttl<=0){O.sparks.splice(k,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.conf){p.rot+=dt*7;}else{p.vx*=1-2*dt;p.vy*=1-2*dt;}
      octx.globalAlpha=Math.min(1,p.ttl*3);octx.fillStyle=p.c;
      if(p.conf){octx.save();octx.translate(p.x,p.y);octx.rotate(p.rot);octx.fillRect(-p.sz,-p.sz/2,p.sz*2,p.sz);octx.restore();}
      else{octx.beginPath();octx.arc(p.x,p.y,p.sz,0,Math.PI*2);octx.fill();}
    }
    octx.globalAlpha=1;
    for(let k=O.floats.length-1;k>=0;k--){
      const f=O.floats[k];f.ttl-=dt;if(f.ttl<=0){O.floats.splice(k,1);continue;}
      const {x,y}=oCellCenter(f.c);
      octx.globalAlpha=Math.min(1,f.ttl*3);
      oText(f.text,clamp(x,cell*2.4,w-cell*2.4),clamp(y-cell*.8-(f.life-f.ttl)*cell*.5,cell*.7,w-cell*.7),cell*f.size,f.color);
    }
    octx.globalAlpha=1;
    if(O.banner){
      const left=O.banner.until-now;
      if(left<=0)O.banner=null;
      else{
        const t=O.banner.ms-left,sc=Math.min(1,t/140),fade=Math.min(1,left/180);
        octx.save();octx.globalAlpha=fade;octx.fillStyle='rgba(255,248,230,.94)';
        const bh=cell*1.7;octx.fillRect(0,w/2-bh/2,w,bh);
        oText(O.banner.text,w/2,w/2,cell*.8*(.7+.3*sc)*(n===6?.8:1),O.banner.color);
        octx.restore();
      }
    }
    if(O.phase==='human'&&O.timer>0){
      const frac=O.timer/O.stage.clock;
      octx.fillStyle=O.timer<5?'#d4432a':'#ffd25a';
      octx.fillRect(O.px.m,O.px.m*.25,(w-2*O.px.m)*frac,O.px.m*.5);
    }
  }
  function oFrame(now){
    if(!O.on)return;
    const dt=clamp((now-(O.lastT||now))/1000,0,.05);O.lastT=now;
    O.shake=Math.max(0,O.shake-dt*.6);
    if(O.anim.length){
      for(const a of O.anim){
        if(!a.started&&now>=a.t0){a.started=true;O.animCount++;sfx('flip',.7,1+O.animCount*.045);}
        if(!a.done&&now>=a.t0+a.dur/2){a.done=true;O.show[a.c]=a.to;const p=a.to-1;O.displayed[p]++;O.displayed[1-p]--;oSyncScore();}
      }
    }
    if(O.phase==='anim'&&now>=O.animEnd){O.anim=[];O.pop=null;oAfterMove();}
    if(O.phase==='human'&&O.timer>0){
      const before=O.timer;O.timer=Math.max(0,O.timer-dt);
      if(before>5&&O.timer<=5)sfx('item',.5,.8);
      if(O.timer<=0&&O.moves.length){
        oFloat(O.moves[0],'시간 끝!','#d4432a',.6,1);oPlace(O.moves[Math.floor(Math.random()*O.moves.length)]);
      }
    }
    if(O.phase==='count'&&O.countIdx<O.countSeq.length&&now>=O.countNext){
      const [side,c]=O.countSeq[O.countIdx++];
      O.counted.add(c);O.displayed[side]++;oSyncScore();
      sfx('flip',.55,.9+O.countIdx*.012);O.countNext=now+O.countStep;
      if(O.countIdx>=O.countSeq.length)setTimeout(()=>{if(O.on&&O.phase==='count')oFinish();},450);
    }
    oDraw(now,dt);
    O.raf=requestAnimationFrame(oFrame);
  }
  const O_TABLET_SIDE=158,O_TABLET_ROWS=214;
  function tabletBoardSize(screen){
    const r=$(screen).getBoundingClientRect();if(!r.width||!r.height)return 0;
    return Math.floor(r.width>=r.height?Math.min(r.height-20,r.width-2*O_TABLET_SIDE-40):Math.min(r.width-20,r.height-O_TABLET_ROWS-30));
  }
  function oResize(){
    if(!O.on)return;
    let size;
    if(TABLET){
      // No view-only strip on a tablet: the board takes the short side, the two panels share what is left.
      size=tabletBoardSize('othelloScreen');if(!size)return;
    }else{
      const r=$('oPlay').getBoundingClientRect();if(!r.width||!r.height)return;
      size=Math.floor(Math.min(r.height-10,r.width*.52));
    }
    oShell.style.width=size+'px';oShell.style.height=size+'px';
    const dpr=Math.min(window.devicePixelRatio||1,2,1400/Math.max(1,size));
    const px=Math.round(size*dpr);
    if(oCanvas.width!==px){oCanvas.width=px;oCanvas.height=px;O.bgDirty=true;}
    oBuildBg();oBuildSprites();
    if(O.geo)oDraw(performance.now(),0);
  }
  let oObserver=null;
  function enterOthello(){
    $('menuScreen').hidden=true;$('gameScreen').hidden=true;$('othelloScreen').hidden=false;
    O.on=true;O.lastT=0;
    // Each child keeps their own score beside their own panel, since the centre strip is gone on a tablet.
    if(TABLET)for(let i=0;i<2;i++)$('oTeam'+i).querySelector('.team-text').append($('oScore'+i));
    oObserver=new ResizeObserver(oResize);oObserver.observe($(TABLET?'othelloScreen':'oPlay'));
    oNewMatch();oResize();
    O.raf=requestAnimationFrame(oFrame);
  }
  function leaveOthello(){roundClose();
    O.on=false;O.token++;clearTimeout(O.aiTimer);cancelAnimationFrame(O.raf);
    if(oObserver){oObserver.disconnect();oObserver=null;}
    $('othelloScreen').hidden=true;$('oOverlay').hidden=true;O.phase='idle';
  }
  for(let i=0;i<2;i++){
    $('oHint'+i).addEventListener('click',()=>oUseHint(i));
    $('oUndo'+i).addEventListener('click',oUndo);
    $('oMenu'+i).addEventListener('click',()=>{sfx('menu',.7);oOpenMenu();});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&O.on&&location.hash!=='#debug')oOpenMenu();});

