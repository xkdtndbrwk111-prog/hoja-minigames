  /* ---------- Hoja volleyball ---------- */
  const VB_STAGES=[
    {id:'std',name:'기본',desc:'7점 먼저 내면 승리',target:7,br:50,g:1500,speed:1,net:300},
    {id:'big',name:'큰 공',desc:'크고 천천히 떨어지는 공 · 저학년에게 좋아요',target:7,br:68,g:1050,speed:.85,net:280},
    {id:'fast',name:'빠른 공',desc:'공이 빠르게 오가요',target:7,br:46,g:1900,speed:1.2,net:300},
    {id:'net',name:'높은 네트',desc:'네트가 높아 강타가 어려워요',target:7,br:50,g:1500,speed:1,net:400},
    {id:'long',name:'11점 승부',desc:'11점 먼저 내면 승리',target:11,br:50,g:1500,speed:1,net:300},
  ];
  let volleyStage='std';
  const VB_PR=84,VB_SPEED=640,VB_JUMP=1180,VB_PG=2350;
  const VB={on:false,raf:0,phase:'idle',resume:'play',stage:null,W:1920,H:1080,GY:760,players:[],ball:null,scores:[0,0],gauge:[0,0],cut:null,server:0,timer:0,freeze:0,shake:0,hits:[],pointers:new Map(),trail:[],sparks:[],floats:[],lastT:0,acc:0,bg:null,bgKey:'',touches:0,rallies:[],aiT:0,cShown:0,winner:-1};
  const vbCanvas=$('vbCanvas'),vbctx=vbCanvas.getContext('2d',{alpha:false});
  const vbNetX=()=>VB.W/2;
  function vbPlayer(side){
    return {side,x:side===0?VB.W*.22:VB.W*.78,y:VB.GY-VB_PR,vx:0,vy:0,left:false,right:false,armed:0,cool:0,air:false,land:0,mood:'neutral',moodT:0,tx:0,err:0};
  }
  function vbNew(){
    const st=VB_STAGES.find(s=>s.id===volleyStage);
    VB.stage=st;VB.scores=[0,0];VB.gauge=[0,0];VB.cut=null;VB.server=Math.random()<.5?0:1;VB.winner=-1;VB.pointers.clear();VB.rallies=[];
    VB.players=[vbPlayer(0),vbPlayer(1)];VB.floats=[];VB.sparks=[];VB.bgKey='';
    $('vbOverlay').hidden=true;
    vbServe(2.4);VB.phase='countdown';VB.cShown=0;
    playMood('action');setBgmTempo(1);
  }
  function vbServe(wait){
    VB.ball={x:VB.server===0?VB.W*.22:VB.W*.78,y:VB.GY-560,vx:0,vy:0,spin:0,hot:0};
    VB.players.forEach(p=>{p.x=p.side===0?VB.W*.22:VB.W*.78;p.y=VB.GY-VB_PR;p.vx=0;p.vy=0;p.air=false;p.armed=0;});
    VB.timer=wait;VB.touches=0;VB.trail=[];VB.phase='serve';VB.aiT=0;
  }
  const vbCutEl=document.createElement('div');vbCutEl.className='sx-host';vbCutEl.hidden=true;$('vbOverlay').before(vbCutEl);
  const VB_G_TOUCH=5,VB_G_SMASH=9,VB_G_LOST=10,VB_CUT=1.35;
  function vbCharge(side,n){
    const was=VB.gauge[side];VB.gauge[side]=Math.min(100,was+n);
    if(was<100&&VB.gauge[side]>=100){vbFloat(side?VB.W*.75:VB.W*.25,VB.GY*.3,'필살기 준비!','#c0532f',58,1.2);sfx('item',.9,1.2);}
  }
  function vbSetMood(p,mood,t=1.3){p.mood=mood;p.moodT=t;}
  function vbJumpPress(p){
    if(VB.phase!=='play'&&VB.phase!=='serve'&&VB.phase!=='countdown')return;
    if(VB.cut)return;
    if(!p.air){p.vy=-VB_JUMP;p.air=true;sfx('tap',.6,1.2);}
    // A press while airborne arms the smash for the next ball contact.
    else p.armed=.3;
  }
  function vbFloat(x,y,text,color,size=48,ttl=.9){VB.floats.push({x,y,text,color,size,ttl,life:ttl});}
  function vbSpark(x,y,n,colors,speed=420){
    for(let k=0;k<n&&VB.sparks.length<240;k++){
      const a=Math.random()*Math.PI*2,s=speed*(.3+Math.random()*.7);
      VB.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,ttl:.35+Math.random()*.4,c:colors[k%colors.length],sz:4+Math.random()*6});
    }
  }
  function vbScore(winner){
    VB.scores[winner]++;VB.rallies.push(VB.touches);vbCharge(1-winner,VB_G_LOST);
    const b=VB.ball;vbSpark(b.x,VB.GY,34,[SIDE_GLOW[winner],'#ffffff','#ffe08a'],720);VB.shake=1;
    sfx('goal',1);sfx('boom',.5);cheer(.7);
    vbSetMood(VB.players[winner],'happy',1.8);vbSetMood(VB.players[1-winner],'sad',1.8);
    VB.server=winner;
    const t=VB.stage.target;
    if(VB.scores[winner]>=t){vbFinish(winner);return;}
    if(Math.max(...VB.scores)===t-1)vbFloat(VB.W/2,VB.GY*.34,'매치 포인트!','#c0532f',66,1.5);
    VB.phase='point';VB.timer=1.6;
  }
  function vbFinish(w){
    VB.phase='over';VB.winner=w;VB.pointers.clear();
    const repeat=streak.side===w&&streak.id===choices[w];
    streak={side:w,id:choices[w],count:repeat?streak.count+1:1};
    hofWin('volley',w);
    cheer(1.2);sfx('goal',1.1);victoryJingle();
    vbSetMood(VB.players[w],'happy',99);vbSetMood(VB.players[1-w],'sad',99);
    const title=streak.count>=2?`${gamePlayerName(w)} ${streak.count}연승!`:`${gamePlayerName(w)} 승리!`;
    const next=button('다음 도전자 ▶','primary',()=>{leaveVolley();enterSelection();});
    const again=button('↻ 바로 재대결','',vbNew);
    const home=button('← 모음집','',vbHome);
    // Both players are mid-press when the last ball lands; hold the buttons off so nobody skips the result.
    [next,again,home].forEach(b=>{b.disabled=true;setTimeout(()=>{b.disabled=false;},2000);});
    setTimeout(()=>{
      if(!VB.on||VB.phase!=='over')return;
      $('vbOverlay').hidden=false;$('vbOverlayTitle').textContent=title;$('vbOverlayDetail').textContent=`${VB.scores[0]} : ${VB.scores[1]}`;$('vbOverlayActions').replaceChildren(next,again,home);
    },1100);
  }
  function vbHome(){streak={side:-1,id:null,count:0};leaveVolley();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});}
  function vbOpenMenu(){
    if(!VB.on||VB.phase==='over'||VB.phase==='paused')return;
    VB.resume=VB.phase;VB.phase='paused';VB.pointers.clear();VB.players.forEach(p=>{p.left=p.right=false;});
    const label=()=>soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';
    const sound=button(label(),'',()=>{cycleSound();sound.textContent=label();});
    $('vbOverlay').hidden=false;$('vbOverlayTitle').textContent='잠깐 쉬는 중';$('vbOverlayDetail').textContent='';
    $('vbOverlayActions').replaceChildren(button('▶ 계속','primary',()=>{$('vbOverlay').hidden=true;VB.phase=VB.resume;}),button('↻ 처음부터','',vbNew),button('인물 변경','',()=>{leaveVolley();enterSelection();}),button('← 모음집','',vbHome),sound);
  }
  /* ---------- Hoja volleyball: computer ---------- */
  const VB_AI=[null,{react:.3,err:120,jump:.35,smash:.12,speed:.6},{react:.15,err:36,jump:.8,smash:.5,speed:.85},{react:.05,err:8,jump:1,smash:1,speed:1.05}];
  function vbPredict(side){
    // Fast-forwards the ball (walls included, net ignored) to find where it comes down.
    const b=VB.ball,st=VB.stage,r=st.br;let x=b.x,y=b.y,vx=b.vx,vy=b.vy;
    for(let i=0;i<220;i++){
      const dt=1/60;vy+=st.g*dt;x+=vx*dt;y+=vy*dt;
      if(x<r){x=2*r-x;vx=-vx;}
      if(x>VB.W-r){x=2*(VB.W-r)-x;vx=-vx;}
      if(y>=VB.GY-VB_PR*1.5)return x;
    }
    return x;
  }
  function vbAi(p,dt){
    const lv=VB_AI[aiLevel],b=VB.ball,net=vbNetX(),home=VB.W*.74;
    VB.aiT-=dt;
    if(VB.aiT<=0){
      VB.aiT=lv.react;
      const land=vbPredict(1);
      const incoming=land>net;
      if(VB.lastTouch!==1||Math.abs(b.vx)>1)p.err=p.err||0;
      p.tx=incoming?land+22+(Math.random()*2-1)*lv.err:home;
    }
    const dx=p.tx-p.x;
    p.left=dx<-14;p.right=dx>14;
    p.aiSpeed=lv.speed;
    const near=Math.abs(b.x-p.x)<170,above=p.y-b.y;
    // Stronger levels time the jump to meet the ball; the easy one jumps early, like a beginner.
    const inWindow=aiLevel===1?(above>60&&above<520&&b.vy>-200):(above>150&&above<340&&b.vy>0);
    if(!p.air&&b.x>net&&near&&inWindow&&Math.random()<lv.jump*dt*12)vbJumpPress(p);
    if(p.air&&Math.hypot(b.x-p.x,b.y-p.y)<230&&Math.random()<lv.smash*dt*14)p.armed=.3;
  }
  /* ---------- Hoja volleyball: physics ---------- */
  function vbStepPlayer(p,dt){
    const human=!(aiLevel&&p.side===1);
    if(!human)vbAi(p,dt);
    const speed=VB_SPEED*(human?1:(p.aiSpeed||1)),dir=(p.right?1:0)-(p.left?1:0);
    p.vx=dir*speed;p.x+=p.vx*dt;
    const net=vbNetX();
    if(p.side===0)p.x=clamp(p.x,VB_PR,net-14-VB_PR*.6);else p.x=clamp(p.x,net+14+VB_PR*.6,VB.W-VB_PR);
    if(p.air){
      p.vy+=VB_PG*dt;p.y+=p.vy*dt;
      if(p.y>=VB.GY-VB_PR){p.y=VB.GY-VB_PR;p.vy=0;p.air=false;p.land=1;}
    }
    p.armed=Math.max(0,p.armed-dt);p.cool=Math.max(0,p.cool-dt);p.land=Math.max(0,p.land-dt*7);
    if(p.moodT>0){p.moodT-=dt;if(p.moodT<=0)p.mood='neutral';}
  }
  function vbHitBall(p){
    const b=VB.ball,st=VB.stage,dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy)||1,min=st.br+VB_PR,net=vbNetX();
    if(p.side===0?b.x>net:b.x<net)return;
    if(d>=min||p.cool>0)return;
    const nx=dx/d,ny=dy/d,f=p.side===0?1:-1;
    b.x=p.x+nx*(min+1);b.y=p.y+ny*(min+1);
    p.cool=.14;VB.touches++;VB.lastTouch=p.side;
    // Long rallies heat up, so a point always ends and a classroom queue keeps moving.
    const heat=1+Math.min(VB.touches*.05,1.1);
    if(p.air&&p.armed>0&&b.y<p.y+20){
      // Smash: aimed for the child. The held direction picks flat, normal or short; no precision needed.
      const fwd=f>0?p.right:p.left,back=f>0?p.left:p.right;
      const vx=fwd?1800:back?760:1380,vy=fwd?240:back?760:560;
      b.vx=f*vx*st.speed*heat;b.vy=vy*st.speed*heat;b.hot=1;p.armed=0;
      const sup=VB.gauge[p.side]>=100;
      if(sup){b.vx*=1.3;b.vy*=1.3;b.hot=2;b.sup=true;VB.gauge[p.side]=0;}else vbCharge(p.side,VB_G_SMASH);
      // A smash from deep in the court would fly straight into the net, so the downward angle is
      // limited to what still clears it. Children get the power without having to judge the arc.
      const dist=Math.abs(vbNetX()-b.x);
      if(dist>st.br*2){
        const t=dist/Math.abs(b.vx),clearY=VB.GY-st.net-st.br-26;
        b.vy=Math.min(b.vy,(clearY-b.y-.5*st.g*t*t)/t);
      }
      if(sup){
        // The world holds for the art, then the ball leaves on the last frame of the cut.
        VB.cut={t:VB_CUT,side:p.side,cues:[.25,.42]};vbCutEl.hidden=false;sxPlay(vbCutEl,p.side,{name:SPECIALS[choices[p.side]].name,tip:''},false);
        vbSetMood(p,'angry',VB_CUT+.7);vbSetMood(VB.players[1-p.side],'sad',VB_CUT+.7);
        sfx('charge',1);sfx('low',.7);
        return;
      }
      VB.freeze=.055;VB.shake=.8;vbSpark(b.x,b.y,20,[SIDE_GLOW[p.side],'#ffe08a','#ffffff'],620);
      vbFloat(b.x,b.y-90,'강타!',SIDE_COLOR[p.side],58,.7);sfx('smash',1.2);vbSetMood(p,'angry',.7);
      return;
    }
    b.sup=false;vbCharge(p.side,VB_G_TOUCH);
    const incoming=Math.hypot(b.vx,b.vy),speed=Math.max(incoming*.62,780);
    // Always helps the ball up and forward, otherwise young players just dribble it into their own net.
    b.vx=(nx*speed+p.vx*.32+f*(300+VB.touches*34))*st.speed*Math.min(heat,1.5);
    b.vy=Math.min(ny*speed,-760)*st.speed*(1-Math.min(VB.touches*.012,.22));
    b.hot=Math.max(0,b.hot-.5);
    vbSpark(b.x,b.y,6,[SIDE_GLOW[p.side],'#ffffff'],240);sfx('hit',.8);
  }
  function vbStepBall(dt){
    const b=VB.ball,st=VB.stage,r=st.br;
    const g=VB.touches===0?st.g*.55:st.g;
    b.vy+=g*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=b.vx*dt*.01;
    b.hot=Math.max(0,b.hot-dt*.9);
    if(b.x<r){b.x=r;b.vx=Math.abs(b.vx)*.92;sfx('rail',.5);}
    if(b.x>VB.W-r){b.x=VB.W-r;b.vx=-Math.abs(b.vx)*.92;sfx('rail',.5);}
    if(b.y<r){b.y=r;b.vy=Math.abs(b.vy)*.7;}
    // Net: a rectangle with a rounded cap, tested as closest point.
    const nw=12,top=VB.GY-st.net,net=vbNetX();
    const qx=clamp(b.x,net-nw,net+nw),qy=clamp(b.y,top,VB.GY),ddx=b.x-qx,ddy=b.y-qy,dist=Math.hypot(ddx,ddy);
    if(dist<r){
      const nx=dist>.01?ddx/dist:(b.x<net?-1:1),ny=dist>.01?ddy/dist:0,vn=b.vx*nx+b.vy*ny;
      b.x=qx+nx*(r+.5);b.y=qy+ny*(r+.5);
      if(vn<0){b.vx-=1.75*vn*nx;b.vy-=1.75*vn*ny;sfx('rail',.8,.8);}
    }
    if(b.y>=VB.GY-r){b.y=VB.GY-r;vbScore(b.x<net?1:0);}
  }
  function vbStep(dt){
    if(VB.phase==='countdown'||VB.phase==='serve'){
      if(VB.phase==='countdown'){const show=Math.ceil(VB.timer/.8);if(show!==VB.cShown&&show>0){VB.cShown=show;sfx('menu',1,1+(3-show)*.16);}}
      VB.timer-=dt;
      VB.players.forEach(p=>vbStepPlayer(p,dt));
      if(VB.timer<=0){VB.phase='play';if(VB.cShown>0){sfx('goal',.7);VB.cShown=0;}}
      return;
    }
    if(VB.phase==='point'){
      VB.players.forEach(p=>vbStepPlayer(p,dt));
      VB.timer-=dt;if(VB.timer<=0)vbServe(1);
      return;
    }
    if(VB.phase==='over'){VB.players.forEach(p=>{if(p.air)vbStepPlayer(p,dt);});return;}
    if(VB.phase!=='play')return;
    if(VB.cut){
      VB.cut.t-=dt;sxCue(vbCutEl,VB.cut.cues,VB_CUT-VB.cut.t);
      if(VB.cut.t<=0){const b=VB.ball,sd=VB.cut.side;VB.cut=null;VB.shake=1.4;vbSpark(b.x,b.y,44,[SIDE_GLOW[sd],'#ffe08a','#ffffff'],900);sfx('smash',1.3);sfx('shot',1.05);}
      return;
    }
    if(VB.freeze>0){VB.freeze-=dt;return;}
    VB.players.forEach(p=>vbStepPlayer(p,dt));
    vbStepBall(dt);
    if(VB.phase!=='play')return;
    VB.players.forEach(vbHitBall);
    const sp=Math.hypot(VB.ball.vx,VB.ball.vy);
    if(VB.ball.sup)vbSpark(VB.ball.x,VB.ball.y,2,['#ffd25a','#ff8a3c','#ffffff'],260);
    if(sp>900){VB.trail.push({x:VB.ball.x,y:VB.ball.y,ttl:.16,hot:VB.ball.hot>.2});if(VB.trail.length>22)VB.trail.shift();}
  }
  /* ---------- Hoja volleyball: touch ---------- */
  function vbLocal(e){const r=vbCanvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*VB.W,y:(e.clientY-r.top)/r.height*VB.H};}
  function vbRegion(p){
    for(let i=VB.hits.length-1;i>=0;i--){const h=VB.hits[i];if(p.x>=h.x&&p.y>=h.y&&p.x<=h.x+h.w&&p.y<=h.y+h.h)return h;}
    return null;
  }
  function vbSyncInput(){
    VB.players.forEach(p=>{
      if(aiLevel&&p.side===1)return;
      p.left=false;p.right=false;
    });
    for(const h of VB.pointers.values()){
      if(!h||h.btn==='jump'||h.btn==='menu')continue;
      const p=VB.players[h.side];if(aiLevel&&p.side===1)continue;
      if(h.btn==='left')p.left=true;
      if(h.btn==='right')p.right=true;
    }
    kbVolleyKeys();
  }
  vbCanvas.addEventListener('pointerdown',e=>{
    if(!VB.on||VB.phase==='paused'||VB.phase==='over')return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();
    const h=vbRegion(vbLocal(e));if(!h)return;
    if(h.btn==='menu'){sfx('menu',.7);vbOpenMenu();return;}
    if(aiLevel&&h.side===1)return;
    VB.pointers.set(e.pointerId,h);
    try{vbCanvas.setPointerCapture(e.pointerId);}catch{}
    if(h.btn==='jump')vbJumpPress(VB.players[h.side]);
    vbSyncInput();
  },{passive:false});
  vbCanvas.addEventListener('pointermove',e=>{
    const cur=VB.pointers.get(e.pointerId);if(!cur)return;
    // Sliding between left and right changes direction without lifting the finger.
    const h=vbRegion(vbLocal(e));
    if(h&&h.side===cur.side&&h.btn!==cur.btn&&h.btn!=='jump'&&h.btn!=='menu'&&cur.btn!=='jump'){VB.pointers.set(e.pointerId,h);vbSyncInput();}
  });
  function vbUp(e){if(VB.pointers.delete(e.pointerId))vbSyncInput();}
  vbCanvas.addEventListener('pointerup',vbUp);
  vbCanvas.addEventListener('pointercancel',vbUp);
  /* ---------- Hoja volleyball: drawing ---------- */
  function vbText(g,str,x,y,size,color,stroke){
    g.font=`${size}px "HojaTitle",sans-serif`;g.textAlign='center';g.textBaseline='middle';
    if(stroke){g.lineJoin='round';g.lineWidth=size*.2;g.strokeStyle=stroke;g.strokeText(str,x,y);}
    g.fillStyle=color;g.fillText(str,x,y);
  }
  function vbBuildBg(){
    const c=VB.bg||document.createElement('canvas'),k=vbCanvas.width/VB.W;
    c.width=vbCanvas.width;c.height=vbCanvas.height;
    const g=c.getContext('2d');g.setTransform(k,0,0,k,0,0);
    const {W,H,GY}=VB,st=VB.stage;
    const sky=g.createLinearGradient(0,0,0,GY);sky.addColorStop(0,'#8fd3ee');sky.addColorStop(1,'#e8f6ee');g.fillStyle=sky;g.fillRect(0,0,W,GY);
    g.fillStyle='rgba(255,255,255,.75)';
    for(const [x,y,s] of [[260,110,1],[760,70,.8],[1300,130,1.1],[1700,70,.8]]){g.beginPath();g.ellipse(x,y,110*s,34*s,0,0,Math.PI*2);g.ellipse(x+60*s,y-20*s,70*s,30*s,0,0,Math.PI*2);g.fill();}
    const sand=g.createLinearGradient(0,GY,0,H);sand.addColorStop(0,'#f1d79a');sand.addColorStop(1,'#d9b56b');g.fillStyle=sand;g.fillRect(0,GY,W,H-GY);
    g.fillStyle='rgba(47,156,140,.16)';g.fillRect(0,GY,W/2,16);g.fillStyle='rgba(224,105,79,.16)';g.fillRect(W/2,GY,W/2,16);
    g.strokeStyle='#fff';g.lineWidth=6;g.beginPath();g.moveTo(0,GY+2);g.lineTo(W,GY+2);g.stroke();
    // Net
    const top=GY-st.net,net=W/2;
    g.fillStyle='#fff';g.fillRect(net-12,top-10,24,18);
    g.strokeStyle='rgba(60,60,60,.55)';g.lineWidth=2;
    for(let y=top+10;y<GY;y+=26){g.beginPath();g.moveTo(net-10,y);g.lineTo(net+10,y);g.stroke();}
    for(let x=-10;x<=10;x+=10){g.beginPath();g.moveTo(net+x,top);g.lineTo(net+x,GY);g.stroke();}
    g.fillStyle='#7a5f33';g.fillRect(net-5,top-14,10,st.net+14);
    g.globalAlpha=.3;g.fillStyle='rgba(230,240,240,1)';g.fillRect(net-12,top,24,st.net);g.globalAlpha=1;
    // Control deck
    const wood=g.createLinearGradient(0,GY+16,0,H);wood.addColorStop(0,'#9c6b3f');wood.addColorStop(1,'#6e4726');g.fillStyle=wood;g.fillRect(0,GY+16,W,H-GY-16);
    VB.bg=c;VB.bgKey=vbCanvas.width+st.id;
  }
  function vbBtn(g,side,btn,x,y,w,h,base,edge,draw){
    const down=[...VB.pointers.values()].some(p=>p&&p.side===side&&p.btn===btn);
    g.save();if(down)g.translate(0,6);
    g.beginPath();g.roundRect(x,y,w,h,20);g.fillStyle=base;g.fill();g.lineWidth=5;g.strokeStyle=edge;g.stroke();
    if(down){g.fillStyle='rgba(255,255,255,.3)';g.fill();}
    draw(x+w/2,y+h/2);g.restore();
    VB.hits.push({side,btn,x,y,w,h});
  }
  function vbDraw(now,dt){
    if(!VB.bg||VB.bgKey!==vbCanvas.width+VB.stage.id)vbBuildBg();
    const g=vbctx,k=vbCanvas.width/VB.W,{W,H,GY}=VB;
    const sh=VB.shake>.01&&!reducedMotion?(Math.random()-.5)*VB.shake*18:0;VB.shake=Math.max(0,VB.shake-dt*3);
    g.setTransform(1,0,0,1,0,0);g.drawImage(VB.bg,sh*k,0);g.setTransform(k,0,0,k,0,0);
    // Score
    g.fillStyle='rgba(255,250,235,.9)';g.beginPath();g.roundRect(W/2-180,10,360,104,18);g.fill();g.lineWidth=4;g.strokeStyle='#3b3229';g.stroke();
    vbText(g,String(VB.scores[0]),W/2-92,64,84,SIDE_COLOR[0]);vbText(g,':',W/2,60,60,'#8a7a5a');vbText(g,String(VB.scores[1]),W/2+92,64,84,SIDE_COLOR[1]);
    vbText(g,gamePlayerName(0),W/2-330,60,40,SIDE_COLOR[0],'rgba(255,255,255,.9)');
    vbText(g,aiLevel?gamePlayerName(1)+' · '+AI_LEVELS[aiLevel].label:gamePlayerName(1),W/2+360,60,40,SIDE_COLOR[1],'rgba(255,255,255,.9)');
    // Special gauges fill toward the score box.
    for(const side of [0,1]){
      const v=VB.gauge[side],full=v>=100,gw=300,gx=side?W/2+200:W/2-200-gw,fw=(gw-6)*v/100;
      g.fillStyle='rgba(40,34,28,.7)';g.beginPath();g.roundRect(gx,88,gw,26,10);g.fill();
      g.fillStyle=full?(Math.floor(now/160)%2?'#ffe27a':'#ffb02e'):SIDE_COLOR[side];g.beginPath();g.roundRect(side?gx+3:gx+gw-3-fw,91,Math.max(0,fw),20,7);g.fill();
      if(full)vbText(g,'필살기 준비',gx+gw/2,101,20,'#3b2918');
    }
    // Players
    for(const p of VB.players){
      const im=shFace(choices[p.side],p.mood);
      const sq=p.land*.16,size=VB_PR*2.5,w=size*(1+sq),h=size*(1-sq);
      const shadow=clamp(1-(GY-VB_PR-p.y)/500,.35,1);
      g.fillStyle=`rgba(40,30,15,${.32*shadow})`;g.beginPath();g.ellipse(p.x,GY+6,VB_PR*shadow,18*shadow,0,0,Math.PI*2);g.fill();
      if(p.armed>0){g.strokeStyle='#ffd25a';g.lineWidth=8;g.beginPath();g.arc(p.x,p.y,VB_PR+16,0,Math.PI*2);g.stroke();}
      if(im.complete&&im.naturalWidth){
        g.save();g.translate(p.x,p.y+VB_PR*.05+(size-h)/2);if(p.side===1)g.scale(-1,1);g.drawImage(im,-w/2,-h/2,w,h);g.restore();
      }
    }
    // Ball
    for(let i=VB.trail.length-1;i>=0;i--){
      const t=VB.trail[i];t.ttl-=dt;if(t.ttl<=0){VB.trail.splice(i,1);continue;}
      g.globalAlpha=t.ttl/.16*.45;g.fillStyle=t.hot?'#ff8a3c':'#fff6c8';g.beginPath();g.arc(t.x,t.y,VB.stage.br*(.5+t.ttl*2),0,Math.PI*2);g.fill();
    }
    g.globalAlpha=1;
    const b=VB.ball,r=VB.stage.br;
    // Where the ball will land, so younger children have something to run to.
    if(VB.phase==='play'||VB.phase==='serve'||VB.phase==='countdown'){
      const land=vbPredict(0);g.fillStyle='rgba(192,57,43,.38)';g.beginPath();g.ellipse(land,GY+6,r*.85,13,0,0,Math.PI*2);g.fill();
    }
    g.save();g.translate(b.x,b.y);g.rotate(b.spin);
    g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fillStyle=b.hot>.2?'#ffcf7a':'#fff8e4';g.fill();g.lineWidth=5;g.strokeStyle='#4b3e35';g.stroke();
    g.lineWidth=4;g.strokeStyle='#d9573f';g.beginPath();g.arc(-r*.4,-r*.2,r*.9,-.6,.9);g.stroke();
    g.strokeStyle='#3f8ee0';g.beginPath();g.arc(r*.5,r*.25,r*.85,2.4,3.9);g.stroke();
    g.restore();
    for(let i=VB.sparks.length-1;i>=0;i--){
      const p=VB.sparks[i];p.ttl-=dt;if(p.ttl<=0){VB.sparks.splice(i,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;g.globalAlpha=Math.min(1,p.ttl*3);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.sz,0,Math.PI*2);g.fill();
    }
    g.globalAlpha=1;
    for(let i=VB.floats.length-1;i>=0;i--){
      const f=VB.floats[i];f.ttl-=dt;if(f.ttl<=0){VB.floats.splice(i,1);continue;}
      g.globalAlpha=Math.min(1,f.ttl*3);vbText(g,f.text,clamp(f.x,160,W-160),clamp(f.y-(f.life-f.ttl)*40,60,GY),f.size,f.color,'rgba(255,255,255,.95)');g.globalAlpha=1;
    }
    if(VB.phase==='countdown'){
      const n=Math.max(1,Math.ceil(VB.timer/.8)),frac=(VB.timer%.8)/.8;
      g.globalAlpha=.5+.5*frac;vbText(g,String(n),W/2,GY*.5,200+70*frac,'#c0532f','rgba(255,255,255,.95)');g.globalAlpha=1;
    }
    // Controls
    VB.hits=[];
    const y=GY+34,h=H-y-16,menuW=150,sideW=(W-menuW-60)/2,gap=12,mv=sideW*.3,jp=sideW-2*mv-2*gap;
    const arrow=(cx,cy,dir)=>stArrow(g,cx,cy,Math.min(h*.26,62),dir,'#3b2918');
    const jump=(cx,cy,p)=>{vbText(g,p.air?(VB.gauge[p.side]>=100?'필살기!':'강타!'):'점프',cx,cy,Math.min(h*.3,70),'#fff');};
    for(const side of [0,1]){
      const p=VB.players[side],x0=side===0?20:W-20-sideW,isAI=aiLevel&&side===1;
      if(isAI){
        g.fillStyle='rgba(255,248,232,.25)';g.beginPath();g.roundRect(x0,y,sideW,h,20);g.fill();
        vbText(g,'컴퓨터 쪽',x0+sideW/2,y+h/2,46,'rgba(255,248,232,.85)');
        continue;
      }
      // Mirrored, so each child's jump button sits on the inner side.
      const lx=side===0?x0:x0+jp+gap,rx=lx+mv+gap,jx=side===0?x0+2*mv+2*gap:x0;
      vbBtn(g,side,'left',lx,y,mv,h,'#f1c46e','#6e4726',(cx,cy)=>arrow(cx,cy,-1));
      vbBtn(g,side,'right',rx,y,mv,h,'#f1c46e','#6e4726',(cx,cy)=>arrow(cx,cy,1));
      vbBtn(g,side,'jump',jx,y,jp,h,p.air?(VB.gauge[side]>=100?'#e8960c':'#d9573f'):SIDE_COLOR[side],'#2d2622',(cx,cy)=>jump(cx,cy,p));
    }
    const mx=W/2-menuW/2;
    g.beginPath();g.roundRect(mx,y+h*.3,menuW,h*.4,14);g.fillStyle='#fff8e8';g.fill();g.lineWidth=3;g.strokeStyle='#3b3229';g.stroke();
    vbText(g,'메뉴',W/2,y+h*.5,30,'#3b2918');
    VB.hits.push({side:-1,btn:'menu',x:mx,y:y+h*.3,w:menuW,h:h*.4});
    vbCutEl.hidden=!VB.cut;
  }
  function vbFrame(now){
    if(!VB.on)return;
    const dt=clamp((now-(VB.lastT||now))/1000,0,.05);VB.lastT=now;
    if(VB.phase!=='paused'){VB.acc=Math.min(.1,VB.acc+dt);while(VB.acc>=1/120){vbStep(1/120);VB.acc-=1/120;}}
    vbDraw(now,VB.phase==='paused'?0:dt);
    VB.raf=requestAnimationFrame(vbFrame);
  }
  function vbResize(){
    if(!VB.on)return;
    const r=$('volleyScreen').getBoundingClientRect();if(!r.width||!r.height)return;
    VB.W=1920;VB.H=Math.round(1920*r.height/r.width);VB.GY=Math.round(VB.H*.72);
    vbCanvas.style.width=r.width+'px';vbCanvas.style.height=r.height+'px';
    const dpr=Math.min(window.devicePixelRatio||1,1.5,1500/Math.max(1,r.width)),px=Math.round(r.width*dpr);
    if(vbCanvas.width!==px){vbCanvas.width=px;vbCanvas.height=Math.round(r.height*dpr);}
    VB.bgKey='';if(VB.stage)vbDraw(performance.now(),0);
  }
  let vbObserver=null;
  function enterVolley(){
    $('menuScreen').hidden=true;$('gameScreen').hidden=true;$('volleyScreen').hidden=false;
    VB.on=true;VB.lastT=0;VB.acc=0;
    ['neutral','happy','sad','angry'].forEach(m=>{shFace(choices[0],m);shFace(choices[1],m);});
    vbObserver=new ResizeObserver(vbResize);vbObserver.observe($('volleyScreen'));
    const r=$('volleyScreen').getBoundingClientRect();VB.H=Math.round(1920*r.height/Math.max(1,r.width));VB.GY=Math.round(VB.H*.72);
    vbNew();vbResize();
    VB.raf=requestAnimationFrame(vbFrame);
  }
  function leaveVolley(){roundClose();
    VB.on=false;cancelAnimationFrame(VB.raf);
    if(vbObserver){vbObserver.disconnect();vbObserver=null;}
    $('volleyScreen').hidden=true;$('vbOverlay').hidden=true;VB.phase='idle';VB.pointers.clear();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&VB.on&&location.hash!=='#debug')vbOpenMenu();});

