  /* ---------- Game state ---------- */
  const canvas=$('rink'),ctx=canvas.getContext('2d',{alpha:false});
  const shell=$('rinkFrame'),section=$('playSection');
  const overlay=$('boardOverlay'),overlayTitle=$('overlayTitle'),overlayDetail=$('overlayDetail'),overlayActions=$('overlayActions');
  const teamEls=[$('teamLeft'),$('teamRight')],portraitEls=[$('portraitLeft'),$('portraitRight')],noteEls=[$('noteLeft'),$('noteRight')];
  const scoreEls=[$('scoreLeft'),$('scoreRight')],timeEl=$('timeText'),comic=$('cannonCut');
  const gaugeEls=[$('gaugeLeft'),$('gaugeRight')];
  let inGame=false,raf=0,lastT=0,accumulator=0,clock=90,phase='ready',resumePhase='playing';
  let scores=[0,0],aiLevel=0,golden=false,matchPointShown=false;
  let countdown=0,countdownShown=0,goalSeconds=0,freeze=0,lastScored=0,serve=null,serveFirst=0,puckHidden=false;
  let rallyHits=0,lastHitBy=-1,bestRally=0,stats=[{smash:0,special:0},{smash:0,special:0}];
  let streak={side:-1,id:null,count:0};
  const mk=(x)=>({x,y:H/2,tx:x,ty:H/2,vx:0,vy:0,svx:0,svy:0,id:null,lastMove:0,grab:0,r:MALLET_R,big:0,small:0,frozen:0,sticky:0,hitT:0,idle:0});
  const mallets=[mk(170),mk(W-170)];
  const puck={x:W/2,y:H/2,vx:0,vy:0,stall:0};
  const SPEED_CAP=1750,SMASH_SWIPE=850,SPECIAL_SWIPE=380,GAUGE_MAX=100;
  const possession={side:-1,time:0,warned:false};let lastPossSide=-1;
  // Small center-only penalty box (the decorative goal arc is intentionally ignored).
  const GOAL_CAMP_SECONDS=3,GOAL_PENALTY_SCALE=1.5;
  const GOAL_CAMP_DEPTH=MALLET_R*3,GOAL_CAMP_HALF=GOAL_HALF*.7;
  const goalCamp=[{time:0,penalty:false},{time:0,penalty:false}];
  const goalHalfFor=side=>GOAL_HALF*(goalCamp[side].penalty||goalWide[side]>0||cannonWide===side?GOAL_PENALTY_SCALE:1);
  function resetGoalCamp(){goalCamp.forEach(c=>{c.time=0;c.penalty=false;});}
  function updateGoalCamp(dt){
    for(let i=0;i<2;i++){
      const m=mallets[i],c=goalCamp[i];
      const inBox=(i===0?m.x<=GOAL_CAMP_DEPTH:m.x>=W-GOAL_CAMP_DEPTH)
        &&Math.abs(m.y-H/2)<=GOAL_CAMP_HALF;
      if(!inBox){c.time=0;c.penalty=false;continue;}
      c.time+=dt;
      if(!c.penalty&&c.time>GOAL_CAMP_SECONDS){
        c.penalty=true;
        floatText(i===0?190:W-190,H/2-GOAL_HALF-55,'골대 지키기 경고!','#ef5848',30,1.2);
        sfx('item',.8,.8);
      }
    }
  }
  let gauge=[0,0],specialCut={time:0,attacker:-1,aim:null};
  const CUT_TIME=1.5,CANNON_SPEED=1750,CANNON_PERFECT=38,TIMED_SPECIAL_DURATION=8;
  const shot={cannon:null,curve:null,zig:null};
  let ghosts=[],shields=[0,0],slowField={side:-1,time:0},conquer={side:-1,time:0},midX=W/2;
  // 광개토대왕's landing: the half-circle in front of the other side's goal becomes his ground,
  // so the defender's mallet is kept out of it and cannot stand guard there.
  const LAND_R=GOAL_HALF+58,SLOW_OWN=.45,SLOW_FOE=1.5;
  const landedOn=()=>conquer.time>0?1-conquer.side:-1;
  function keepOffLanding(i,o,xk,yk){
    if(landedOn()!==i)return;
    const gx=i===0?0:W,dx=o[xk]-gx,dy=o[yk]-H/2,d=Math.hypot(dx,dy),min=LAND_R+mallets[i].r+2;
    if(d>=min)return;
    const k=d>.001?min/d:1;o[xk]=gx+(d>.001?dx*k:(i===0?min:-min));o[yk]=H/2+(d>.001?dy*k:0);
  }
  // Item effects that last a while. goalWide: that side's goal is wider; walls: posts in front of that side's goal.
  let goalWide=[0,0],walls=[0,0],iceTime=0,twin=null,cannonWide=-1,lunch=[];
  // Stage state
  let stageTime=0,boosted=false,zoneContact=false,drop=null,dropCooldown=4,darkTime=0,darkSide=-1,smashSide=-1;
  // Pure visuals
  let particles=[],floats=[],trail=[],rings=[],shake=0,flash=null;
  const puckSprite=new Image(),malletSprites=[new Image(),new Image()],obstacleSprite=new Image(),itemBoxSprite=new Image();
  malletSprites[0].src=EMBED_ASSETS['art/mallet_hoja.webp'];malletSprites[1].src=EMBED_ASSETS['art/mallet_nahan.webp'];
  puckSprite.src=EMBED_ASSETS['art/puck.webp'];obstacleSprite.src=EMBED_ASSETS['art/obstacle.webp'];itemBoxSprite.src=EMBED_ASSETS['art/item_box.webp'];
  const faceImages=[new Image(),new Image()];
  let arenaCache=null,arenaDirty=true;
  faceImages.forEach(im=>im.addEventListener('load',()=>{arenaDirty=true;}));

  function resetShots(){shot.cannon=null;shot.curve=null;shot.zig=null;ghosts=[];twin=null;cannonWide=-1;}
  function setMood(player,mood='neutral',note=''){
    portraitEls[player].src=portraitFor(player,mood);
    teamEls[player].classList.toggle('react',mood==='happy'||mood==='surprised');
    teamEls[player].classList.toggle('sad',mood==='sad'||mood==='angry');
    noteEls[player].textContent=note||nameFor(player);
  }
  function neutralMoods(){setMood(0,'neutral','집중 중!');setMood(1,'neutral',aiLevel?'컴퓨터 상대':'집중 중!');}
  function button(label,cls,fn){
    if(/다시 하기|재대결/.test(label)){const run=fn;fn=()=>replayGate(run);if(tryOpen())label+=' · 남은 '+TRY.left+'판';}
    const b=document.createElement('button');b.type='button';b.className='control big '+cls;b.textContent=label;
    b.addEventListener('click',()=>{sfx('menu',.7);fn();});return b;
  }
  function showOverlay(title,detail,actions=[]){
    overlay.hidden=false;overlayTitle.textContent=title;overlayDetail.textContent=detail;
    if(TABLET){$('overlayTitle2').textContent=title;$('overlayDetail2').textContent=detail;}
    overlayActions.replaceChildren(...actions);overlayActions.hidden=!actions.length;
  }
  function hideOverlay(){overlay.hidden=true;overlayActions.replaceChildren();}
  function syncStrip(){
    const p=$('holdPause');
    p.classList.remove('holding');
    if(phase==='ready'){p.textContent='바로 시작';p.classList.add('tapstart');}
    else{p.textContent='길게 눌러 멈춤';p.classList.remove('tapstart');}
    p.style.visibility=(phase==='paused'||phase==='finished')?'hidden':'visible';
    $('rightLabel').textContent=aiLevel?'COMPUTER · '+AI_LEVELS[aiLevel].label:'PLAYER 2 · 오른쪽';
  }
  function syncMode(){
    const label=aiLevel?'혼자 연습 · '+AI_LEVELS[aiLevel].label:'2인 대전';
    $('modeButton').textContent=label;
    $('modeButton').setAttribute('aria-label','현재 '+label+'. 누르면 다음 방식으로 바뀝니다');
    const s=soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';
    $('soundButton').textContent=s;
  }
  function cycleSound(){soundMode=soundMode==='all'?'sfx':soundMode==='sfx'?'off':'all';remember('soundmode',soundMode);applySoundMode();syncMode();sfx('menu',.8);}
  function updateRally(){
    $('rallyCount').textContent='RALLY '+rallyHits;
    $('rallySpeed').textContent='×'+(puckCap()/1000).toFixed(2);
    $('rallyMeter').classList.toggle('hot',rallyHits>=8);
  }
  function puckCap(){return Math.min(SPEED_CAP,1000*Math.pow(1.05,Math.max(0,rallyHits)));}
  function addGauge(i,n){
    if(phase==='finished')return;
    if(aiLevel&&i===1)n*=AI_LEVELS[aiLevel].charge;
    const was=gauge[i];gauge[i]=clamp(gauge[i]+n,0,GAUGE_MAX);
    if(was<GAUGE_MAX&&gauge[i]>=GAUGE_MAX){
      floatText(mallets[i].x,mallets[i].y-74,'기술 준비! 세게 쳐!',SIDE_COLOR[i],30,1.4);
      sfx('item',.8,1.2);setMood(i,'happy','기술 준비!');
    }
    syncGauge();
  }
  function syncGauge(){
    gaugeEls.forEach((el,i)=>{
      el.style.setProperty('--fill',gauge[i]+'%');
      el.classList.toggle('full',gauge[i]>=GAUGE_MAX);
    });
  }

  /* ---------- Match flow ---------- */
  function resetPositions(){
    Object.assign(puck,{x:W/2,y:H/2,vx:0,vy:0,stall:0});
    mallets.forEach((m,i)=>{
      const x=i===0?170:W-170;
      Object.assign(m,{x,y:H/2,tx:x,ty:H/2,vx:0,vy:0,svx:0,svy:0,r:MALLET_R,big:0,small:0,frozen:0,sticky:0,idle:0});
    });
  }
  function resetStage(){stageTime=0;boosted=false;zoneContact=false;drop=null;dropCooldown=4;darkTime=0;darkSide=-1;smashSide=-1;goalWide=[0,0];walls=[0,0];iceTime=0;twin=null;cannonWide=-1;lunch=[];}
  function resetMatch(){
    resetStage();resetShots();closeCut();
    scores=[0,0];scoreEls[0].textContent='0';scoreEls[1].textContent='0';
    clock=90;goalSeconds=0;golden=false;matchPointShown=false;serve=null;freeze=0;puckHidden=false;
    serveFirst=Math.random()<.5?0:1;
    rallyHits=0;lastHitBy=-1;bestRally=0;stats=[{smash:0,special:0},{smash:0,special:0}];
    gauge=[0,0];shields=[0,0];slowField={side:-1,time:0};conquer={side:-1,time:0};midX=W/2;
    trail=[];particles=[];floats=[];rings=[];flash=null;shake=0;updateRally();syncGauge();
    resetPositions();resetGoalCamp();phase='ready';updateClock();
    syncCharacterUI();
    setMood(0,'neutral','손가락을 올려!');setMood(1,'neutral',aiLevel?'컴퓨터 상대':'손가락을 올려!');
    for(let i=0;i<2;i++)teamEls[i].classList.toggle('champion',streak.side===i&&streak.id===choices[i]&&streak.count>0);
    for(let i=0;i<2;i++)$(i?'streakRight':'streakLeft').textContent=(streak.side===i&&streak.id===choices[i]&&streak.count>0)?(streak.count>=2?streak.count+'연승 중':'챔피언'):'';
    hideOverlay();hideGoalBanner();syncStrip();
    faceImages[0].src=portraitFor(0);faceImages[1].src=portraitFor(1);arenaDirty=true;
    setBgmTempo(1);
    playMood('action');
  }
  function startCountdown(){
    if(phase!=='ready')return;
    phase='countdown';countdown=2.4;countdownShown=0;syncStrip();neutralMoods();
  }
  function setupServe(side){
    // Conceding player gets the puck and the first swing, like a real table.
    resetShots();boosted=false;zoneContact=false;resetGoalCamp();
    rallyHits=0;lastHitBy=-1;trail=[];updateRally();
    Object.assign(puck,{x:W/2+(side===0?-300:300),y:H/2,vx:0,vy:0,stall:0});
    possession.side=side;possession.time=0;possession.warned=false;
    puckHidden=false;serve={side,time:4.5};
    phase='playing';neutralMoods();hideOverlay();syncStrip();
    floatText(puck.x,puck.y-70,aiLevel&&side===1?'컴퓨터 서브':nameFor(side)+' 서브!',SIDE_COLOR[side],28,1.3);
    rings.push({x:puck.x,y:puck.y,r:28,grow:150,ttl:.5,life:.5,color:SIDE_COLOR[side],w:6});
  }
  function launchServe(){
    if(!serve)return;
    const dir=serve.side===0?1:-1;
    puck.vx=dir*440;puck.vy=(Math.random()*.7-.35)*440;
    lastHitBy=serve.side;serve=null;
    floatText(puck.x,puck.y-60,'자동 서브',"#6a5e50",22,.8);sfx('tap',.7);
  }
  function pause(){
    if(phase==='paused'||phase==='finished')return;
    resumePhase=phase==='ready'?'ready':phase;phase='paused';releaseTouches();syncStrip();
    showOverlay('잠깐 쉬는 중','',[
      button('▶ 계속','primary',resume),
      button('↻ 다시 하기','',()=>{resetMatch();}),
      button('인물 변경','',()=>{leaveGame();enterSelection();}),
      button('← 모음집','',()=>{leaveGame();$('menuScreen').hidden=false;$('gameScreen').hidden=true;}),
    ]);
    if(ac&&bgmNode)setBgmTempo(.0001);
  }
  function resume(){
    if(phase!=='paused')return;
    phase=resumePhase;hideOverlay();syncStrip();setBgmTempo(clock<=15?1.05:1);
  }
  function finish(){
    resetShots();closeCut();hideGoalBanner();floats=[];resetGoalCamp();phase='finished';releaseTouches();
    const winner=scores[0]>scores[1]?0:1;
    const repeat=streak.side===winner&&streak.id===choices[winner];
    streak={side:winner,id:choices[winner],count:repeat?streak.count+1:1};
    hofWin('hockey',winner);
    setMood(winner,'happy','이겼다!');setMood(1-winner,'sad','아쉬워…');
    const line=`${scores[0]} : ${scores[1]}   ·   최고 랠리 ${bestRally}   ·   강타 ${stats[0].smash} : ${stats[1].smash}`;
    const crown=streak.count>=2?`${nameFor(winner)} ${streak.count}연승!`:`${nameFor(winner)} 승리!`;
    const next=button('다음 도전자 ▶','primary',()=>{leaveGame();enterSelection();});
    const again=button('↻ 바로 재대결','',()=>{resetMatch();});
    const home=button('← 모음집','',()=>{streak={side:-1,id:null,count:0};leaveGame();$('menuScreen').hidden=false;$('gameScreen').hidden=true;});
    // Fingers are still on the glass when the match ends; hold the buttons off so nobody skips the result.
    [next,again,home].forEach(b=>{b.disabled=true;setTimeout(()=>{b.disabled=false;},1300);});
    showOverlay(crown,line,[next,again,home]);
    burst(winner===0?W*.25:W*.75,H/2,70,[SIDE_COLOR[winner],'#ffe08a','#ffffff'],520,true);
    syncStrip();sfx('goal',1.1);cheer(1.2);
    victoryJingle();
  }
  function scoreGoal(scorer){
    if(phase!=='playing')return;
    resetShots();serve=null;resetGoalCamp();
    scores[scorer]++;lastScored=scorer;scoreEls[scorer].textContent=String(scores[scorer]);
    const el=scoreEls[scorer];el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
    const goalX=scorer===0?W:0;
    burst(goalX,clamp(puck.y,H/2-GOAL_HALF,H/2+GOAL_HALF),60,[SIDE_COLOR[scorer],'#ffe08a','#ffffff'],640,true);
    rings.push({x:goalX,y:H/2,r:40,grow:900,ttl:.55,life:.55,color:SIDE_GLOW[scorer],w:14});
    flash={color:SIDE_GLOW[scorer],ttl:.28,life:.28};kick(18);
    sfx('goal',1);sfx('boom',.7);cheer(1);
    addGauge(1-scorer,28);
    if(golden||scores[scorer]>=5){puckHidden=true;finish();return;}
    phase='goal';goalSeconds=1.7;puckHidden=true;syncStrip();
    setMood(scorer,'happy','해냈다!');
    setMood(1-scorer,scores[scorer]%2===0?'angry':'sad',scores[scorer]%2===0?'이번엔 막겠어!':'아깝다!');
    showGoalBanner(scorer);
    if(!matchPointShown&&Math.max(...scores)===4){matchPointShown=true;}
  }
  function showGoalBanner(scorer){
    if(TABLET){
      const line=Math.max(...scores)===4?'매치 포인트!':nameFor(scorer)+' 득점!';
      floatText(W*.3,H/2,line,SIDE_COLOR[scorer],64,1.3);floatText(W*.7,H/2,line,SIDE_COLOR[scorer],64,1.3);
      return;
    }
    const b=$('goalBanner');
    b.hidden=false;b.className='goal-banner side'+scorer;
    $('goalPortrait').src=portraitFor(scorer,'happy');
    $('goalText').textContent=Math.max(...scores)===4?'매치 포인트!':'득점!';
    $('goalScore').textContent=scores[0]+' : '+scores[1];
    void b.offsetWidth;b.classList.add('in');
  }
  function hideGoalBanner(){$('goalBanner').hidden=true;}
  function updateClock(){
    if(golden){timeEl.textContent='골든골!';timeEl.classList.add('warning');return;}
    const t=Math.ceil(Math.max(0,clock));
    timeEl.textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
    timeEl.classList.toggle('warning',t<=15);
  }

  /* ---------- Touch input ---------- */
  let tabletTurn=0;
  function layoutTablet(){
    if(!TABLET)return;
    const vw=innerWidth,vh=innerHeight,portrait=vh>vw,raw=screen.orientation&&typeof screen.orientation.angle==='number'?screen.orientation.angle:(window.orientation||0);
    let a=((raw%360)+360)%360;
    // Some tablets count from landscape; line their angle up with the portrait-first ones.
    if(portrait!==(a%180===0))a=(a+270)%360;
    tabletTurn=(((-90-a)%360)+360)%360;
    const el=$('gameScreen'),sideways=tabletTurn===90||tabletTurn===270;
    el.style.width=(sideways?vh:vw)+'px';el.style.height=(sideways?vw:vh)+'px';
    el.style.transform=tabletTurn===270?`translateY(${vh}px) rotate(-90deg)`:tabletTurn===90?`translateX(${vw}px) rotate(90deg)`:tabletTurn===180?`translate(${vw}px,${vh}px) rotate(180deg)`:'none';
  }
  function getPoint(e){
    const rect=canvas.getBoundingClientRect();
    let nx=(e.clientX-rect.left)/rect.width,ny=(e.clientY-rect.top)/rect.height;
    if(tabletTurn===270){const t=nx;nx=1-ny;ny=t;}
    else if(tabletTurn===90){const t=nx;nx=ny;ny=1-t;}
    else if(tabletTurn===180){nx=1-nx;ny=1-ny;}
    return {x:nx*LW-RM,y:ny*LH-RM};
  }
  function clampTarget(i){
    const m=mallets[i],pad=m.r+4;
    m.tx=clamp(m.tx,i===0?pad:midX+m.r+2,i===0?midX-m.r-2:W-pad);
    m.ty=clamp(m.ty,pad,H-pad);
    keepOffLanding(i,m,'tx','ty');
  }
  function setTarget(i,p){const m=mallets[i];m.tx=p.x;m.ty=p.y;clampTarget(i);m.lastMove=performance.now();m.idle=0;}
  const acceptsInput=()=>inGame&&phase!=='paused'&&phase!=='finished';
  function onPointerDown(e){
    if(!acceptsInput()||e.target.closest('button'))return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    const p=getPoint(e),i=p.x<midX?0:1;
    if(aiLevel&&i===1)return;
    const m=mallets[i];
    // A resting palm or a touch the board dropped must not lock a side: a new finger replaces
    // any owner that has stopped moving, but cannot steal from a finger in active play.
    if(m.id!==null&&performance.now()-m.lastMove<160)return;
    e.preventDefault();
    m.id=e.pointerId;m.grab=.14;setTarget(i,p);
    try{section.setPointerCapture(e.pointerId);}catch{}
  }
  function onPointerMove(e){
    const i=mallets.findIndex(m=>m.id===e.pointerId);
    if(i<0||!acceptsInput())return;
    e.preventDefault();
    const list=e.getCoalescedEvents?e.getCoalescedEvents():null;
    setTarget(i,getPoint(list&&list.length?list[list.length-1]:e));
  }
  function onPointerUp(e){
    const i=mallets.findIndex(m=>m.id===e.pointerId);
    if(i<0)return;
    mallets[i].id=null;
    try{if(section.hasPointerCapture(e.pointerId))section.releasePointerCapture(e.pointerId);}catch{}
  }
  function releaseTouches(){
    mallets.forEach(m=>{
      if(m.id!==null){try{if(section.hasPointerCapture(m.id))section.releasePointerCapture(m.id);}catch{}}
      m.id=null;
    });
  }

  /* ---------- Computer player ---------- */
  const AI_LEVELS=[null,{label:'쉬움',speed:460,err:115,swing:.3,charge:.5},{label:'보통',speed:900,err:42,swing:.7,charge:.8},{label:'어려움',speed:1650,err:10,swing:1.1,charge:1}];
  let aiErr=0,aiLastSide=-1,aiRetarget=0;
  function predictY(atX){
    if(Math.abs(puck.vx)<1)return puck.y;
    const t=(atX-puck.x)/puck.vx;if(t<0)return puck.y;
    let y=puck.y+puck.vy*t;const span=H-2*R;
    y=((y-R)%(2*span)+2*span)%(2*span);
    return R+(y>span?2*span-y:y);
  }
  function updateAI(dt){
    if(!aiLevel)return;
    const lv=AI_LEVELS[aiLevel],m=mallets[1];
    if(lastHitBy!==aiLastSide){aiLastSide=lastHitBy;if(lastHitBy===0)aiErr=(Math.random()*2-1)*lv.err;}
    const home=W-210;
    if(phase==='ready'||phase==='countdown'||phase==='goal'){m.tx=home;m.ty=H/2;clampTarget(1);return;}
    const speed=Math.hypot(puck.vx,puck.vy),mine=puck.x>midX;
    if(shot.cannon||specialCut.time>0&&specialCut.aim&&specialCut.time<=CANNON_TELL){
      const aim=shot.cannon||specialCut.aim;
      const lineX=W-130,t=(lineX-aim.x0)/aim.vx;
      m.tx=lineX;m.ty=aim.y0+aim.vy*t+aiErr*.5;
    }else if(mine&&(speed<420||puck.vx<40)){
      // Slow ball on my side: step behind it, then swing through at the player's goal.
      const aimY=H/2+(Math.random()<.5?1:1)*(puck.y-H/2)*-.2;
      const dx=-1,dy=(aimY-puck.y)/700,len=Math.hypot(dx,dy);
      const bx=puck.x-dx/len*(R+m.r+18),by=puck.y-dy/len*(R+m.r+18);
      if(m.x>puck.x+R+m.r*.7&&Math.abs(m.y-by)<26){m.tx=puck.x-90*lv.swing;m.ty=puck.y;}
      else if(m.x<puck.x+R+m.r*.7){
        // Puck is behind the mallet: go around it instead of knocking it into my own goal.
        const off=R+m.r+26,upper=puck.y-off>m.r+6;
        m.ty=(m.y<puck.y&&upper)||puck.y+off>H-m.r-6?puck.y-off:puck.y+off;m.tx=puck.x+R+m.r+22;
      }
      else{m.tx=Math.max(bx,puck.x+R+m.r+12);m.ty=by;}
    }else if(puck.vx>0&&puck.x>W*.3){
      const blockX=W-170,y=predictY(blockX);
      const close=puck.x>blockX-250*lv.swing&&speed<1100;
      m.tx=close?blockX-100*lv.swing:blockX;m.ty=y+aiErr;
    }else{
      m.tx=home;m.ty=H/2+(puck.y-H/2)*.45;
    }
    clampTarget(1);
  }

  const SX_ART={"flame":"data:image/webp;base64,@@B64:assets/images/hockey/flame.webp@@","core":"data:image/webp;base64,@@B64:assets/images/hockey/core.webp@@","slash":"data:image/webp;base64,@@B64:assets/images/hockey/slash.webp@@","star":"data:image/webp;base64,@@B64:assets/images/hockey/star.webp@@"};
  /* ---------- Special cut-in: portrait, then slash, then the name stamped letter by letter, then a flash ----------
     No separate special art. Only the portrait and a few light sprites move, so it stays cheap on a slow board.
     It clears before the shot, leaving the rink in view for the last moment before firing. */
  const SX_COLOR={HOJA:'#ff9a3d',NAHANSANG:'#ffc24a',SUMAKSAE:'#ff5a4a',CHILJIDO_ELDER:'#4ad2ff',MURYEONG_KING:'#b77dff',BANGASAYUSANG:'#ffe14d',GWANGGAETO_KING:'#ff7a3d'};
  const SX_SHOW=1.05,CANNON_TELL=.4;
  const sxImgs={},sxTinted={};
  for(const k of Object.keys(SX_ART)){sxImgs[k]=new Image();sxImgs[k].src=SX_ART[k];}
  function sxTint(name,color){
    const key=name+color;if(sxTinted[key])return sxTinted[key];
    const img=sxImgs[name];if(!img.complete||!img.naturalWidth)return SX_ART[name];
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    const g=c.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);
    return sxTinted[key]=c.toDataURL('image/png');
  }
  function sxPic(cls,src){const i=document.createElement('img');i.className=cls;i.src=src;i.alt='';return i;}
  function sxBox(cls,text){const d=document.createElement('div');d.className=cls;if(text!==undefined)d.textContent=text;return d;}
  // face: the cut-in turns toward the attacker's end of a tablet, where each child sits at their own end of the rink.
  function sxPlay(host,i,sp,face){
    const color=SX_COLOR[choices[i]]||'#ff9a3d',stage=sxBox('sx-stage'+(i?' atk1':''));
    stage.style.setProperty('--sx',color);
    const w=host.clientWidth,h=host.clientHeight;
    let sw=w,sh=h;
    if(face){
      sw=h;sh=w/2;
      stage.style.cssText+=`;width:${sw}px;height:${sh}px;left:${(i?.75:.25)*w-sw/2}px;top:${h/2-sh/2}px;transform:rotate(${i?-90:90}deg)`;
    }
    const side=sxBox('sx-side');
    side.append(
      sxPic('sx-glow',sxTint('core',color)),
      sxPic('sx-flame f1',sxTint('flame',color)),sxPic('sx-flame f2',sxTint('flame','#fff0b0')),sxPic('sx-flame f3',sxTint('flame',color)),
      sxPic('sx-face',portraitFor(i,'angry')));
    const name=sxBox('sx-name'),band=sxBox('sx-band'),title=sxBox('sx-title');
    const chars=[...sp.name],size=Math.min(sw*.56/Math.max(4,chars.length),sh*.2);
    title.style.fontSize=Math.round(size)+'px';
    chars.forEach((ch,k)=>{const s=document.createElement('span');s.textContent=ch===' '?' ':ch;s.style.animationDelay=(.25+k*.055)+'s';title.append(s);});
    name.append(band,title,sxBox('sx-sweep'),sxPic('sx-star',sxTint('star','#ffffff')),sxBox('sx-tip',sp.tip));
    stage.append(sxBox('sx-dim'),side,sxPic('sx-slash',sxTint('slash','#ffffff')),name);
    host.querySelectorAll('.sx-stage').forEach(e=>e.remove());
    host.classList.remove('sx-done');
    host.append(stage);
  }
  // Driven by the game clock, so pausing during the cut-in keeps it in step.
  function sxCue(host,c,shown){
    if(c.length&&shown>=c[0]){if(c.length===2)sfx('hit',1,.85);else sfx('boom',.75);c.shift();}
    if(shown>=SX_SHOW)host.classList.add('sx-done');
  }
  function sxTick(){
    sxCue(comic,specialCut.cues,CUT_TIME-specialCut.time);
    if(specialCut.aim&&!specialCut.told&&specialCut.time<=CANNON_TELL){specialCut.told=true;sfx('zap',.8,1.3);}
  }
  function aimTime(dist,speed){
    // Air drag slows the puck, so the flight takes a little longer than distance over speed.
    const k=-Math.log(.88),q=1-dist*k/speed;
    return q>0?-Math.log(q)/k:dist/speed;
  }
  const mouthY=()=>H/2+(Math.random()*2-1)*(GOAL_HALF-R*1.4);
  // The mouth is judged where the puck meets the end wall, one radius inside the rink.
  const goalDist=dir=>Math.max(1,dir>0?W-R-puck.x:puck.x-R);
  function zigAim(){
    // Bounces unfold into a straight line: aim at the target's mirror image beyond the walls still to come.
    const z=shot.zig,S=H-2*R,u0=puck.y-R,uT=z.ty-R,n=z.left,s=puck.vy>=0?1:-1;
    const img=n===0?uT:s>0?(n%2?(n+1)*S-uT:n*S+uT):(n%2?-(n-1)*S-uT:-n*S+uT);
    puck.vy=(img-u0)/aimTime(goalDist(Math.sign(puck.vx)),Math.abs(puck.vx));
  }

  /* ---------- Specials ---------- */
  function startSpecial(i){
    const sp=SPECIALS[choices[i]],dir=i===0?1:-1;
    gauge[i]=0;syncGauge();stats[i].special++;resetShots();
    specialCut={time:CUT_TIME,attacker:i,aim:null};
    puck.vx=0;puck.vy=0;phase='special';
    if(sp.kind==='cannon'){
      // The defender's goal opens as wide as the goal-camping penalty, and the shot picks a random line
      // into that wider mouth, off the centre, so standing in the middle is not a sure block.
      cannonWide=1-i;
      const half=GOAL_HALF*GOAL_PENALTY_SCALE-R*1.4,off=half*(.35+Math.random()*.65)*(Math.random()<.5?-1:1);
      const gx=dir>0?W+R:-R,gy=H/2+off;
      const dx=gx-puck.x,dy=gy-puck.y,len=Math.hypot(dx,dy);
      specialCut.aim={x0:puck.x,y0:puck.y,vx:dx/len*CANNON_SPEED,vy:dy/len*CANNON_SPEED};
    }
    $('comicAttacker').src=portraitFor(i,'angry');$('comicDefender').src=portraitFor(1-i,'surprised');
    $('comicAttackName').textContent=nameFor(i);$('comicDefendName').textContent=nameFor(1-i);
    $('comicAttacker').closest('.comic-panel').style.order=String(i===0?0:2);
    $('comicDefender').closest('.comic-panel').style.order=String(i===0?2:0);
    $('comicName').textContent=sp.name;$('comicTip').textContent=sp.tip;
    // All the art punches toward the left, so the left attacker is mirrored to face the rink.
    comic.classList.toggle('atk1',i===1);
    comic.hidden=false;comic.classList.remove('burst');sxPlay(comic,i,sp,TABLET);specialCut.cues=[.25,.42];
    setMood(i,'angry',sp.name+'!');setMood(1-i,'surprised','온다!');
    sfx('charge',1);sfx('low',.7);kick(8);
    rings.push({x:puck.x,y:puck.y,r:30,grow:240,ttl:.6,life:.6,color:SIDE_GLOW[i],w:10});
  }
  function closeCut(){specialCut={time:0,attacker:-1,aim:null};comic.hidden=true;comic.classList.remove('burst');}
  function fireSpecial(){
    const i=specialCut.attacker,dir=i===0?1:-1,sp=SPECIALS[choices[i]],aim=specialCut.aim;
    closeCut();phase='playing';lastHitBy=i;kick(10);
    burst(puck.x,puck.y,26,[SIDE_GLOW[i],'#fff5b0'],520);
    sfx('shot',1.05);
    const launch=(vx,vy)=>{puck.vx=vx;puck.vy=vy;};
    if(sp.kind==='cannon'){shot.cannon={...aim,attacker:i,broken:false};launch(aim.vx,aim.vy);}
    else if(sp.kind==='lunch'){
      launch(dir*1120,(mouthY()-puck.y)/aimTime(goalDist(dir),1120));
      placeLunch(i);sfx('item',1,1.3);
      for(const b of lunch)rings.push({x:b.x,y:b.y,r:20,grow:160,ttl:.5,life:.5,color:SIDE_GLOW[i],w:8});
    }
    else if(sp.kind==='curve'){const T=aimTime(goalDist(dir),980),ty=mouthY();
      // One full wave that returns to the straight line just as it reaches the goal, kept clear of the walls.
      // Line plus wave peaks at a quarter and three quarters of the way: leave room for both, and take the side with the bigger swing if only one fits.
      const y1=puck.y+(ty-puck.y)*.25,y2=puck.y+(ty-puck.y)*.75,fit=sg=>Math.min(sg>0?H-R-y1:y1-R,sg>0?y2-R:H-R-y2)*.9,wide=H*.3;
      const a1=fit(1),a2=fit(-1),sign=a1>=wide&&a2>=wide?(Math.random()<.5?1:-1):a1>a2?1:-1;
      shot.curve={t:0,T,base:(ty-puck.y)/T,amp:Math.min(wide,Math.max(0,sign>0?a1:a2)),sign};launch(dir*980,shot.curve.base);}
    else if(sp.kind==='zig'){const s=puck.y<H/2?1:-1,S=H-2*R;launch(dir*760,s);shot.zig={n:0,ty:mouthY(),left:clamp(Math.round(goalDist(dir)/S),1,4)};zigAim();sfx('zap',1);}
    else{
      launch(dir*1120,(mouthY()-puck.y)/aimTime(goalDist(dir),1120));
      if(sp.kind==='shield'){shields[i]=TIMED_SPECIAL_DURATION;sfx('shield',1);}
      if(sp.kind==='slow'){slowField={side:i,time:TIMED_SPECIAL_DURATION};sfx('shield',.8,.7);}
      if(sp.kind==='conquer'){conquer={side:i,time:TIMED_SPECIAL_DURATION};sfx('boom',.8);}
    }
    floatText(i===0?W*.3:W*.7,70,sp.name+'!',SIDE_COLOR[i],40,1.3);
    updateControlsAfterSpecial();
  }
  function updateControlsAfterSpecial(){syncStrip();}
  function cannonStep(oldX,oldY){
    // Swept check against the shot line: at this speed a frame-based overlap test can miss.
    const c=shot.cannon,def=1-c.attacker,m=mallets[def];
    if(c.broken)return false;
    const sx=puck.x-oldX,sy=puck.y-oldY,len2=sx*sx+sy*sy||1;
    const t=clamp(((m.x-oldX)*sx+(m.y-oldY)*sy)/len2,0,1);
    const cx=oldX+sx*t,cy=oldY+sy*t,dist=Math.hypot(m.x-cx,m.y-cy);
    if(dist>=R+m.r)return false;
    // First contact always reads near full radius, so judge the block by how far the mallet sits off the line.
    const offset=Math.abs((m.x-oldX)*sy-(m.y-oldY)*sx)/Math.sqrt(len2);
    if(offset<=CANNON_PERFECT){
      const nx=(cx-m.x)/(dist||1),ny=(cy-m.y)/(dist||1),dirX=c.attacker===0?-1:1;
      shot.cannon=null;
      puck.x=m.x+dirX*(R+m.r+3);puck.y=m.y+ny*(R+m.r+3)*.5;
      puck.vx=dirX*1200;puck.vy=clamp(m.svy*.3+ny*200+nx*0,-420,420);
      lastHitBy=def;rallyHits++;updateRally();
      burst(puck.x,puck.y,28,['#b6fff1','#ffffff'],560);kick(10);freeze=.06;
      rings.push({x:m.x,y:m.y,r:m.r,grow:220,ttl:.4,life:.4,color:'#b6fff1',w:10});
      sfx('smash',1.2);floatText(m.x,m.y-80,'완벽 방어!',SIDE_COLOR[def],36,1.2);
      setMood(def,'happy','완벽 방어!');setMood(1-def,'surprised','막았다고?!');addGauge(def,40);
      return true;
    }
    c.broken=true;burst(m.x,m.y,16,['#ffb38b','#ffffff'],380);sfx('rail',1.2);kick(8);
    floatText(m.x,m.y-80,'가드 브레이크!','#b85240',30,1);setMood(def,'sad','가드 브레이크!');
    return false;
  }

  /* ---------- Stage ---------- */
  function getPosts(){
    if(activeStage==='posts')return [
      {x:W/2-110,y:H/2-115*POST_SPREAD,r:24,vy:0},{x:W/2+110,y:H/2-115*POST_SPREAD,r:24,vy:0},
      {x:W/2-110,y:H/2+115*POST_SPREAD,r:24,vy:0},{x:W/2+110,y:H/2+115*POST_SPREAD,r:24,vy:0}];
    if(activeStage==='patrol')return [
      {x:W/2-105,y:H/2+130*POST_SPREAD*Math.sin(stageTime*1.23),r:24,vy:160*POST_SPREAD*Math.cos(stageTime*1.23)},
      {x:W/2+105,y:H/2-130*POST_SPREAD*Math.sin(stageTime*1.23),r:24,vy:-160*POST_SPREAD*Math.cos(stageTime*1.23)}];
    return [];
  }
  const ZONES=[{x:W/2-250,y:72},{x:W/2+250,y:72},{x:W/2-250,y:H-72},{x:W/2+250,y:H-72}];
  function cancelZoneBoost(){if(boosted){puck.vx*=.6;puck.vy*=.6;boosted=false;}}
  // Item mode: a ? box appears; the puck touching it gives a random effect to whoever hit the puck last.
  // good: helps the side that gets it, so 나한상's lunch boxes draw only from these.
  const ITEMS={
    speed:{text:'퍽 가속!'},
    half:{text:'상대 쪽 암전!',good:true},
    smash:{text:'다음 타격 강타!',good:true},
    big:{text:'큰 말렛 7초!',good:true},
    gauge:{text:'기세 +50!',good:true},
    small:{text:'상대 말렛 작게!',good:true},
    wide:{text:'상대 골대 넓게!',good:true},
    wall:{text:'수비벽!',good:true},
    ice:{text:'얼음판!'},
    freeze:{text:'상대 꽁꽁!',good:true},
    twin:{text:'쌍둥이 퍽!'},
    sticky:{text:'상대 끈끈이!',good:true},
    warp:{text:'순간이동!'}
  };
  const ITEM_KINDS=Object.keys(ITEMS),GOOD_ITEMS=ITEM_KINDS.filter(k=>ITEMS[k].good);
  function applyItem(kind,owner,x,y){
    const foe=1-owner;
    if(kind==='speed'){puck.vx*=1.4;puck.vy*=1.4;}
    if(kind==='half'){darkTime=2.4;darkSide=foe;}
    if(kind==='smash'){smashSide=owner;}
    if(kind==='big'){mallets[owner].big=7;}
    if(kind==='gauge'){addGauge(owner,50);}
    if(kind==='small'){mallets[foe].small=6;}
    if(kind==='wide'){goalWide[foe]=6;}
    if(kind==='wall'){walls[owner]=6;}
    if(kind==='ice'){iceTime=6;}
    // Short on purpose: a slow board already makes a frozen hand feel long.
    if(kind==='freeze'){mallets[foe].frozen=1.2;}
    if(kind==='sticky'){mallets[foe].sticky=5;}
    if(kind==='twin'){
      const a=Math.atan2(puck.vy,puck.vx)+(Math.random()<.5?-1:1)*.45,s=Math.max(520,Math.hypot(puck.vx,puck.vy));
      twin={x:puck.x,y:puck.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,ttl:6};
    }
    if(kind==='warp'){
      const toLeft=puck.x>=W/2;
      puck.x=toLeft?W*.12+Math.random()*W*.3:W*.58+Math.random()*W*.3;puck.y=R+40+Math.random()*(H-2*R-80);
      puck.vx*=.6;puck.vy*=.6;rings.push({x:puck.x,y:puck.y,r:R,grow:220,ttl:.4,life:.4,color:'#ffffff',w:8});
    }
    burst(x,y,22,['#ffe69b','#ffffff'],420);sfx('item',1);
    const text=ITEMS[kind].text;
    floatText(x,y-46,text,SIDE_COLOR[owner],32,1.3);noteEls[owner].textContent=text;
  }
  function itemHit(){
    const kind=ITEM_KINDS[Math.floor(Math.random()*ITEM_KINDS.length)];
    const owner=lastHitBy>=0?lastHitBy:(drop.x<W/2?0:1);
    const x=drop.x,y=drop.y;
    drop=null;dropCooldown=5+Math.random()*3;
    applyItem(kind,owner,x,y);
  }
  // 나한상's lunch: three different boxes on 나한상's own half that stay until the puck reaches them.
  function placeLunch(owner){
    const kinds=GOOD_ITEMS.slice().sort(()=>Math.random()-.5).slice(0,3),ys=[.22,.5,.78].sort(()=>Math.random()-.5);
    lunch=kinds.map((kind,k)=>({kind,owner,x:owner===0?W*(.14+Math.random()*.24):W*(.62+Math.random()*.24),y:H*ys[k]+(Math.random()-.5)*H*.08,born:stageTime}));
  }
  function wallPosts(i){
    if(walls[i]<=0)return [];
    const x=i===0?72:W-72,d=GOAL_HALF*.55;
    return [{x,y:H/2-d,r:22,vy:0},{x,y:H/2+d,r:22,vy:0}];
  }
  function bounceOffPosts(b,list){
    for(const o of list){
      const dx=b.x-o.x,dy=b.y-o.y,dist=Math.hypot(dx,dy),min=R+o.r;
      if(dist>=min)continue;
      const nx=dist>.001?dx/dist:1,ny=dist>.001?dy/dist:0;
      b.x=o.x+nx*(min+.6);b.y=o.y+ny*(min+.6);
      const proj=b.vx*nx+(b.vy-o.vy)*ny;
      if(proj<0){b.vx=(b.vx-2*proj*nx)*.97;b.vy=(b.vy-2*proj*ny+o.vy*.08)*.97;sfx('rail',.8);burst(b.x,b.y,5,['#ffeeab'],220);}
    }
  }
  function stageStep(dt){
    stageTime+=dt;
    if(darkTime>0)darkTime=Math.max(0,darkTime-dt);
    if(activeStage==='posts'||activeStage==='patrol')bounceOffPosts(puck,getPosts());
    bounceOffPosts(puck,[...wallPosts(0),...wallPosts(1)]);
    for(let k=lunch.length-1;k>=0;k--){
      const b=lunch[k];
      if(Math.hypot(puck.x-b.x,puck.y-b.y)<R+30){lunch.splice(k,1);applyItem(b.kind,b.owner,b.x,b.y);}
    }
    if(activeStage==='speed'){
      const inside=ZONES.some(z=>Math.abs(puck.x-z.x)<62&&Math.abs(puck.y-z.y)<38);
      if(inside&&!zoneContact&&!boosted&&Math.hypot(puck.vx,puck.vy)>40){
        const s=Math.hypot(puck.vx,puck.vy),k=Math.min(2,1900/Math.max(1,s));
        puck.vx*=k;puck.vy*=k;boosted=true;burst(puck.x,puck.y,12,['#8fefff','#ffffff'],420);sfx('zap',.9);
      }
      zoneContact=inside;
    }
    if(activeStage==='items'){
      if(drop){drop.ttl-=dt;if(drop.ttl<=0)drop=null;else if(Math.hypot(puck.x-drop.x,puck.y-drop.y)<R+30)itemHit();}
      else if((dropCooldown-=dt)<=0){
        const side=Math.random()<.5?0:1;
        drop={x:side?W-200-Math.random()*360:200+Math.random()*360,y:80+Math.random()*(H-160),ttl:7};
      }
    }
  }

  /* ---------- Simulation ---------- */
  function stepMallet(i,dt){
    const m=mallets[i],human=!(aiLevel&&i===1);
    m.grab=Math.max(0,m.grab-dt);m.hitT=Math.max(0,m.hitT-dt);m.pinned=Math.max(0,(m.pinned||0)-dt);m.noHit=Math.max(0,(m.noHit||0)-dt);
    if(m.big>0){m.big-=dt;}
    if(m.small>0)m.small-=dt;if(m.frozen>0)m.frozen-=dt;if(m.sticky>0)m.sticky-=dt;
    const targetR=MALLET_R*(m.big>0?1.4:1)*(m.small>0?.65:1);m.r+=(targetR-m.r)*Math.min(1,dt*10);
    if(m.id===null)m.idle+=dt;
    clampTarget(i);
    // Touchdown glides instead of teleporting, so tapping cannot replace actually moving.
    const speed=(human?(m.grab>0?1700:3000):AI_LEVELS[aiLevel].speed)*(m.sticky>0?.35:1);
    const ox=m.x,oy=m.y,dx=m.tx-ox,dy=m.ty-oy,dist=Math.hypot(dx,dy);
    if(dist>.0001&&!(m.frozen>0)){const s=Math.min(dist,speed*dt);m.x+=dx/dist*s;m.y+=dy/dist*s;}
    keepOffLanding(i,m,'x','y');
    m.vx=(m.x-ox)/dt;m.vy=(m.y-oy)/dt;
    // Board touch samples arrive unevenly, so swing power reads a smoothed velocity.
    const a=1-Math.exp(-dt/.04);m.svx+=(m.vx-m.svx)*a;m.svy+=(m.vy-m.svy)*a;
  }
  function collideMallet(i){
    if(phase!=='playing'||mallets[i].noHit>0)return;
    const m=mallets[i],dx=puck.x-m.x,dy=puck.y-m.y,dist=Math.hypot(dx,dy),min=R+m.r;
    if(dist>=min)return;
    cancelZoneBoost();
    const nx=dist>.0001?dx/dist:(i===0?1:-1),ny=dist>.0001?dy/dist:0,tx=-ny,ty=nx;
    puck.x=m.x+nx*(min+.35);puck.y=m.y+ny*(min+.35);
    // Pinned against a rail: move the mallet back instead of letting the puck jitter in place.
    const py=clamp(puck.y,R,H-R),px=clamp(puck.x,R,W-R);
    if(py!==puck.y||(px!==puck.x&&Math.abs(puck.y-H/2)>=GOAL_HALF)){
      if(Math.abs(puck.y-H/2)>=GOAL_HALF||py!==puck.y){
        puck.y=py;puck.x=px;
        const ddx=puck.x-m.x,ddy=puck.y-m.y,dd=Math.hypot(ddx,ddy)||1;
        if(dd<min){m.x=puck.x-ddx/dd*(min+1);m.y=puck.y-ddy/dd*(min+1);m.svx=0;m.svy=0;m.pinned=.2;}
      }
    }
    const vInc=puck.vx*nx+puck.vy*ny,fwd=m.pinned>0?0:Math.max(0,m.svx*nx+m.svy*ny);
    const relative=(puck.vx-m.svx)*nx+(puck.vy-m.svy)*ny;
    if(relative>=0&&!serve)return;

    const first=lastHitBy!==i;
    if(first){rallyHits++;lastHitBy=i;bestRally=Math.max(bestRally,rallyHits);updateRally();}
    const wasServe=!!serve;serve=null;
    shot.curve=null;shot.zig=null;shot.cannon=null;
    const guaranteed=smashSide===i;if(guaranteed)smashSide=-1;
    const isSmash=guaranteed||fwd>=SMASH_SWIPE;
    // Real rebound: a still mallet only blocks, and the power comes from swinging through the puck.
    let vn=Math.max(0,-vInc)*.8+Math.min(fwd,1500)*1.2;
    const vt=(puck.vx*tx+puck.vy*ty)*.88+(m.svx*tx+m.svy*ty)*.24;
    vn=Math.max(vn,250);
    let ovx=nx*vn+tx*vt,ovy=ny*vn+ty*vt,out=Math.hypot(ovx,ovy);
    let cap=puckCap();if(isSmash)cap=Math.min(SPEED_CAP,cap*1.22);
    const targetOut=guaranteed?SPEED_CAP:Math.min(out*(isSmash?1.1:1),cap);
    ovx*=targetOut/out;ovy*=targetOut/out;out=targetOut;
    // A near-vertical shot makes a dead rally that bounces up and down; keep some forward travel.
    const fdir=i===0?1:-1;
    if(Math.abs(ovx)<out*.2){const sgn=ovx===0?fdir:Math.sign(ovx);ovx=sgn*out*.2;ovy=Math.sign(ovy||1)*out*.98;}
    puck.vx=ovx;puck.vy=ovy;puck.stall=0;

    if(gauge[i]>=GAUGE_MAX&&(fwd>=SPECIAL_SWIPE||(aiLevel&&i===1&&fwd>120))){
      startSpecial(i);return;
    }
    const col=i===0?SIDE_GLOW[0]:SIDE_GLOW[1];
    if(m.hitT<=0){
      if(isSmash){
        stats[i].smash++;freeze=.045;kick(9);
        burst(puck.x,puck.y,20,[col,'#ffffff','#ffe08a'],560);
        rings.push({x:puck.x,y:puck.y,r:R,grow:260,ttl:.3,life:.3,color:'#ffffff',w:9});
        floatText(puck.x,puck.y-58,'강타!',SIDE_COLOR[i],34,.7);
        sfx('smash',1.1);if(first||wasServe)addGauge(i,23);
      }else{
        burst(puck.x,puck.y,5+Math.min(8,fwd/90),[col,'#ffffff'],260);
        sfx(out>800?'hit':'tap',.55+out/2200);
        if(first||wasServe)addGauge(i,9);
      }
      m.hitT=.16;
    }
    if(rallyHits===8&&first){floatText(W/2,60,'뜨거운 랠리!','#c0532f',34,1.1);setMood(i,'surprised','뜨거운 랠리!');}
    if(rallyHits===14&&first){floatText(W/2,60,'전설의 랠리!!','#c0532f',40,1.2);setMood(i,'happy','멈출 수 없어!');}
  }
  function wallFx(x,y,s){
    if(s<160)return;
    burst(x,y,Math.min(6,s/220),['#ffffff','#bfe9df'],200);
    sfx('rail',.3+Math.min(.6,s/1800));
  }
  // 반가사유상: time runs slow on the owner's half and fast on the other half.
  function fieldRate(x){
    if(slowField.time<=0)return 1;
    const own=slowField.side===0?x<W/2:x>=W/2;
    return own?SLOW_OWN:SLOW_FOE;
  }
  // The second puck from the twin item: real (it scores), simpler physics, gone after a few seconds.
  function stepTwin(dt){
    const b=twin,bdt=dt*fieldRate(b.x);
    b.ttl-=dt;
    if(b.ttl<=0){burst(b.x,b.y,12,['#ffffff','#d9d2bf'],300);sfx('soft',.6);twin=null;return false;}
    b.x+=b.vx*bdt;b.y+=b.vy*bdt;
    const drag=Math.pow(iceTime>0?.985:.88,bdt);b.vx*=drag;b.vy*=drag;
    if(b.y<R||b.y>H-R){b.y=clamp(b.y,R,H-R);b.vy*=-.96;}
    bounceOffPosts(b,[...wallPosts(0),...wallPosts(1),...(activeStage==='posts'||activeStage==='patrol'?getPosts():[])]);
    for(let i=0;i<2;i++){
      const m=mallets[i],dx=b.x-m.x,dy=b.y-m.y,dist=Math.hypot(dx,dy),min=R+m.r;
      if(dist>=min||m.noHit>0)continue;
      const nx=dist>.0001?dx/dist:(i===0?1:-1),ny=dist>.0001?dy/dist:0;
      b.x=m.x+nx*(min+.35);b.y=m.y+ny*(min+.35);
      const rel=(b.vx-m.svx)*nx+(b.vy-m.svy)*ny;
      if(rel<0){const fwd=Math.max(0,m.svx*nx+m.svy*ny),vn=Math.min(SPEED_CAP,Math.max(300,-rel*.8+fwd*1.1));
        const tx=-ny,ty=nx,vt=b.vx*tx+b.vy*ty;b.vx=nx*vn+tx*vt*.8;b.vy=ny*vn+ty*vt*.8;sfx('tap',.6);}
    }
    for(const side of [0,1]){
      const out=side===0?b.x<R:b.x>W-R;if(!out)continue;
      if(Math.abs(b.y-H/2)<goalHalfFor(side)&&!(shields[side]>0)){
        if(side===0?b.x<-R*.4:b.x>W+R*.4){const x=b.x,y=b.y;twin=null;puck.x=clamp(x,0,W);puck.y=y;scoreGoal(1-side);return true;}
      }else{b.x=side===0?R:W-R;b.vx=-b.vx*.96;}
    }
    return false;
  }
  function stepPlaying(dt){
    if(freeze>0){freeze-=dt;return;}
    if(serve){serve.time-=dt;if(serve.time<=0)launchServe();}
    else{
      if(!golden){
        const before=clock;clock-=dt;
        if(before>15&&clock<=15){floatText(W/2,H/2-40,'마지막 15초!','#c0532f',46,1.3);sfx('item',1,.8);setBgmTempo(1.05);}
        if(clock<=0){
          clock=0;
          if(scores[0]===scores[1]){
            golden=true;updateClock();floatText(W/2,H/2-40,'동점! 골든골!','#c0532f',52,1.6);sfx('goal',1);cheer(.7);
          }else{updateClock();finish();return;}
        }
      }
    }
    for(let i=0;i<2;i++)if(shields[i]>0)shields[i]=Math.max(0,shields[i]-dt);
    if(slowField.time>0)slowField.time=Math.max(0,slowField.time-dt);
    if(conquer.time>0)conquer.time=Math.max(0,conquer.time-dt);
    for(let i=0;i<2;i++){if(goalWide[i]>0)goalWide[i]=Math.max(0,goalWide[i]-dt);if(walls[i]>0)walls[i]=Math.max(0,walls[i]-dt);}
    if(iceTime>0)iceTime=Math.max(0,iceTime-dt);
    if(cannonWide>=0&&!shot.cannon)cannonWide=-1;

    const pdt=dt*fieldRate(puck.x);
    const ox=puck.x,oy=puck.y;
    puck.x+=puck.vx*pdt;puck.y+=puck.vy*pdt;

    if(shot.cannon){
      if(cannonStep(ox,oy))return;
      const atk=shot.cannon.attacker,gone=atk===0?puck.x>W+R*.2:puck.x<-R*.2;
      if(shot.cannon&&gone){
        if(shields[1-atk]>0){shot.cannon=null;bounceShield(1-atk);}
        else{scoreGoal(atk);return;}
      }
      if(shot.cannon){
        trail.push({x:puck.x,y:puck.y,ttl:.2,c:'#fff3a8'});
        return;
      }
    }
    if(shot.curve){
      const c=shot.curve;c.t+=pdt;
      const wave=Math.PI*2/c.T;puck.vy=c.base+c.sign*c.amp*wave*Math.cos(wave*c.t);
      if(c.t>c.T*1.3)shot.curve=null;
    }
    // Light air drag: a soft shot slows down enough to be wound up on, a hard one still crosses the rink.
    const drag=Math.pow(iceTime>0?.985:.88,pdt);puck.vx*=drag;puck.vy*=drag;
    stageStep(dt);
    if(twin&&stepTwin(dt))return;

    const speed=Math.hypot(puck.vx,puck.vy);
    if(puck.y<R||puck.y>H-R){
      cancelZoneBoost();
      puck.y=puck.y<R?R:H-R;
      puck.vy=(puck.y===R?1:-1)*Math.abs(puck.vy)*.96;puck.vx*=.985;
      if(shot.curve)shot.curve=null;
      if(shot.zig){
        const z=shot.zig;z.n++;
        if(z.left>0){z.left--;puck.vx*=1.07;burst(puck.x,puck.y,10,['#fff27a','#ffffff'],360);sfx('zap',.8,1+z.n*.08);zigAim();}
        else shot.zig=null;
      }else wallFx(puck.x,puck.y,speed);
    }
    const inLeftMouth=Math.abs(puck.y-H/2)<goalHalfFor(0);
    const inRightMouth=Math.abs(puck.y-H/2)<goalHalfFor(1);
    if(puck.x<R&&(!inLeftMouth||shields[0]>0)){
      if(inLeftMouth)bounceShield(0);else{cancelZoneBoost();puck.x=R;puck.vx=Math.abs(puck.vx)*.96;puck.vy*=.985;wallFx(puck.x,puck.y,speed);}
    }
    if(puck.x>W-R&&(!inRightMouth||shields[1]>0)){
      if(inRightMouth)bounceShield(1);else{cancelZoneBoost();puck.x=W-R;puck.vx=-Math.abs(puck.vx)*.96;puck.vy*=.985;wallFx(puck.x,puck.y,speed);}
    }
    if(puck.x<-R*.4){scoreGoal(1);return;}
    if(puck.x>W+R*.4){scoreGoal(0);return;}

    collideMallet(0);if(phase!=='playing')return;
    collideMallet(1);if(phase!=='playing')return;

    for(let k=ghosts.length-1;k>=0;k--){
      const g=ghosts[k];
      // The decoys survive launch next to the attacker's mallet, and follow the real puck's air drag.
      const gdt=dt*fieldRate(g.x);
      g.x+=g.vx*gdt;g.y+=g.vy*gdt;g.ttl-=dt;g.grace=Math.max(0,g.grace-dt);
      const drag=Math.pow(.88,gdt);g.vx*=drag;g.vy*=drag;
      if(g.y<R||g.y>H-R){g.y=clamp(g.y,R,H-R);g.vy*=-1;}
      const defender=mallets[1-g.attacker];
      const touched=g.grace<=0&&Math.hypot(g.x-defender.x,g.y-defender.y)<R+defender.r;
      if(g.ttl<=0||touched||g.x<R||g.x>W-R){
        burst(g.x,g.y,12,['#ffffff','#d9d2bf'],300);floatText(g.x,g.y-34,'가짜!','#8a7f6a',24,.6);sfx('soft',.7);ghosts.splice(k,1);
      }
    }
    if(!serve){
      // Fairness net: nobody can win by leaving a dead puck parked.
      // Measured from real travel: a puck wedged in a corner under a mallet still has "velocity".
      const moved=Math.hypot(puck.x-ox,puck.y-oy)/Math.max(pdt,1e-4);
      puck.stall=moved<70?puck.stall+dt:0;
      const side=puck.x<W/2?0:1;
      if(side!==possession.side){possession.side=side;possession.time=0;}else possession.time+=dt;
      if(possession.time>5&&!possession.warned){possession.warned=true;floatText(side===0?W*.25:W*.75,60,'7초 안에 넘겨요!','#b4661f',28,1);}
      if(puck.stall>1.5||possession.time>7){
        const rule=possession.time>7;
        ejectPuck(side);
        floatText(puck.x,puck.y-50,rule?'7초 룰! 상대에게':'퍽이 움직여요',"#6a5e50",24,.9);
        if(rule)sfx('item',.7,.7);
      }
      if(side!==lastPossSide){lastPossSide=side;possession.warned=false;}
    }
    if(speed>620)trail.push({x:puck.x,y:puck.y,ttl:.16,c:lastHitBy>=0?SIDE_GLOW[lastHitBy]:'#fff7d4'});
    if(trail.length>26)trail.splice(0,trail.length-26);
  }
  function ejectPuck(side){
    const toward=side===0?1:-1;
    puck.x=clamp(puck.x,R+50,W-R-50);puck.y=clamp(puck.y,R+50,H-R-50);
    puck.vx=toward*560;puck.vy=(H/2-puck.y)*.6+(Math.random()-.5)*160;
    puck.stall=0;possession.time=0;possession.warned=false;
    mallets.forEach(m=>{m.noHit=.45;});
    boosted=false;
  }
  function bounceShield(side){
    puck.x=side===0?R:W-R;puck.vx=(side===0?1:-1)*Math.max(620,Math.abs(puck.vx));
    burst(puck.x,puck.y,18,['#ffe08a','#ffffff'],440);sfx('shield',1);kick(8);
    floatText(puck.x+(side===0?90:-90),puck.y-40,'방패!','#b8860b',32,.8);
  }
  function step(dt){
    updateAI(dt);
    stepMallet(0,dt);stepMallet(1,dt);
    if(phase==='ready'){
      const ok0=mallets[0].id!==null,ok1=aiLevel?true:mallets[1].id!==null;
      if(ok0&&ok1)startCountdown();
      return;
    }
    if(phase==='countdown'){
      countdown-=dt;
      const show=Math.ceil(countdown/.8);
      if(show!==countdownShown&&show>0){countdownShown=show;sfx('menu',1,1+(3-show)*.16);}
      if(countdown<=0){sfx('goal',.9);floatText(W/2,H/2-30,'시작!','#c0532f',70,.7);setupServe(serveFirst);}
      return;
    }
    if(phase==='goal'){
      goalSeconds-=dt;
      if(goalSeconds<=0){hideGoalBanner();setupServe(1-lastScored);}
      return;
    }
    if(phase==='special'){
      specialCut.time-=dt;
      sxTick();
      if(specialCut.time<=0)fireSpecial();
      return;
    }
    if(phase==='playing'){
      if(!serve)updateGoalCamp(dt);else resetGoalCamp();
      stepPlaying(dt);
    }
  }

  /* ---------- Visual effects ---------- */
  function kick(n){if(!reducedMotion)shake=Math.max(shake,n);}
  function burst(x,y,n,colors,speed,confetti=false){
    n=Math.round(n);
    for(let k=0;k<n&&particles.length<320;k++){
      const a=Math.random()*Math.PI*2,s=speed*(.25+Math.random()*.75);
      particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,ttl:(confetti?.9:.34)+Math.random()*.3,life:1,c:colors[k%colors.length],sz:confetti?6+Math.random()*7:2.5+Math.random()*3.5,g:confetti?620:0,conf:confetti,rot:Math.random()*6});
    }
  }
  function floatText(x,y,text,color,size=28,ttl=1){floats.push({x:clamp(x,TABLET?60:110,W-(TABLET?60:110)),y:clamp(y,TABLET?170:44,H-(TABLET?170:40)),text,color,size,ttl,life:ttl});}
  function updateFx(dt){
    for(let k=particles.length-1;k>=0;k--){
      const p=particles[k];p.ttl-=dt;
      if(p.ttl<=0){particles[k]=particles[particles.length-1];particles.pop();continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.vx*=1-1.6*dt;p.rot+=dt*8;
    }
    for(let k=floats.length-1;k>=0;k--){const f=floats[k];f.ttl-=dt;f.y-=dt*26;if(f.ttl<=0)floats.splice(k,1);}
    for(let k=rings.length-1;k>=0;k--){const r=rings[k];r.ttl-=dt;r.r+=r.grow*dt;if(r.ttl<=0)rings.splice(k,1);}
    for(let k=trail.length-1;k>=0;k--){trail[k].ttl-=dt;if(trail[k].ttl<=0)trail.splice(k,1);}
    if(flash){flash.ttl-=dt;if(flash.ttl<=0)flash=null;}
    shake=Math.max(0,shake-dt*70);
  }

  /* ---------- Arena (pre-rendered once per size/stage so play frames stay cheap) ---------- */
  const STAGE_TINT={basic:['#dff3ea','#fbe6dc'],posts:['#e4f0db','#f8e7d0'],patrol:['#dcecf2','#f3e2ea'],speed:['#d5f1f5','#fde3d3'],items:['#ece6f6','#fbe9c9']};
  function buildArena(){
    const c=arenaCache||document.createElement('canvas');
    c.width=canvas.width;c.height=canvas.height;
    const g=c.getContext('2d');
    g.setTransform(canvas.width/LW,0,0,canvas.height/LH,0,0);
    const tint=STAGE_TINT[activeStage]||STAGE_TINT.basic;
    // Rails
    g.fillStyle='#2f4a48';g.fillRect(0,0,LW,LH);
    const rail=g.createLinearGradient(0,0,0,LH);rail.addColorStop(0,'#6fb3a8');rail.addColorStop(.5,'#4f8f86');rail.addColorStop(1,'#3a716b');
    g.fillStyle=rail;g.beginPath();g.roundRect(2,2,LW-4,LH-4,26);g.fill();
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=3;g.beginPath();g.roundRect(6,6,LW-12,LH-12,22);g.stroke();
    g.translate(RM,RM);
    // Surface, tinted for each side so a child can tell at a glance whose half the puck is in.
    g.save();g.beginPath();g.roundRect(0,0,W,H,14);g.clip();
    const lg=g.createLinearGradient(0,0,W/2,0);lg.addColorStop(0,tint[0]);lg.addColorStop(1,'#f4f7f0');
    g.fillStyle=lg;g.fillRect(0,0,W/2,H);
    const rg=g.createLinearGradient(W/2,0,W,0);rg.addColorStop(0,'#f8f4ec');rg.addColorStop(1,tint[1]);
    g.fillStyle=rg;g.fillRect(W/2,0,W/2,H);
    // Character watermarks
    if(!TABLET)faceImages.forEach((im,i)=>{
      if(!im.complete||!im.naturalWidth)return;
      const s=H*.72,cx=i===0?W*.27:W*.73;
      g.save();g.globalAlpha=.1;g.translate(cx,H/2);if(i===1)g.scale(-1,1);g.drawImage(im,-s/2,-s/2,s,s);g.restore();
    });
    // Air holes
    g.fillStyle='rgba(60,90,84,.11)';
    for(let y=22;y<H;y+=36)for(let x=22+(Math.floor(y/36)%2)*18;x<W;x+=36){g.beginPath();g.arc(x,y,1.9,0,Math.PI*2);g.fill();}
    // Markings
    g.lineWidth=5;g.strokeStyle='rgba(205,83,88,.65)';
    g.beginPath();g.moveTo(W/2,0);g.lineTo(W/2,H);g.stroke();
    g.beginPath();g.arc(W/2,H/2,92,0,Math.PI*2);g.stroke();
    g.fillStyle='rgba(205,83,88,.65)';g.beginPath();g.arc(W/2,H/2,9,0,Math.PI*2);g.fill();
    [0,1].forEach(i=>{
      const gx=i?W:0;
      g.strokeStyle=SIDE_COLOR[i]+'aa';g.fillStyle=SIDE_COLOR[i]+'22';g.lineWidth=5;
      g.beginPath();g.arc(gx,H/2,GOAL_HALF+58,0,Math.PI*2);g.fill();g.stroke();
      g.beginPath();g.moveTo(i?W-310:310,0);g.lineTo(i?W-310:310,H);g.strokeStyle='rgba(70,120,160,.28)';g.lineWidth=4;g.stroke();
    });
    g.restore();
    // Inner shadow from the rail
    g.save();g.beginPath();g.roundRect(0,0,W,H,14);g.lineWidth=6;g.strokeStyle='rgba(20,50,48,.55)';g.stroke();g.restore();
    // Goal mouths cut through the rail and lit with the defending side's colour.
    [0,1].forEach(i=>{
      const x=i?W-5:-RM+1,w=RM+4;
      g.fillStyle='#14211f';g.beginPath();g.roundRect(x,H/2-GOAL_HALF,w,GOAL_HALF*2,5);g.fill();
      g.fillStyle=SIDE_COLOR[i];g.fillRect(i?W-1:-5,H/2-GOAL_HALF,6,GOAL_HALF*2);
      g.fillStyle='#f1cf7c';
      g.beginPath();g.arc(i?W:0,H/2-GOAL_HALF,9,0,Math.PI*2);g.arc(i?W:0,H/2+GOAL_HALF,9,0,Math.PI*2);g.fill();
    });
    arenaCache=c;arenaDirty=false;
  }

  function drawGoalCamp(){
    for(let i=0;i<2;i++){
      const half=goalHalfFor(i),x=i===0?0:W;
      if(half<=GOAL_HALF+.5)continue;
      // Widened by an item or Hoja's cannon rather than by camping: same mouth, gold edge, no penalty lines.
      if(!goalCamp[i].penalty){
        ctx.save();ctx.fillStyle='#14211f';ctx.fillRect(i===0?-RM:x-5,H/2-half,RM+5,half*2);
        ctx.fillStyle=Math.floor(performance.now()/180)%2?'#ffd25a':'#ffb02e';ctx.fillRect(i===0?-5:W-1,H/2-half,6,half*2);
        ctx.fillStyle='#ffe1a3';for(const yy of [H/2-half,H/2+half]){ctx.beginPath();ctx.arc(x,yy,9,0,Math.PI*2);ctx.fill();}
        ctx.restore();continue;
      }
      ctx.save();
      ctx.fillStyle='#14211f';
      ctx.fillRect(i===0?-RM:x-5,H/2-half,RM+5,half*2);
      ctx.fillStyle='#ef5848';
      ctx.fillRect(i===0?-5:W-1,H/2-half,6,half*2);
      ctx.fillStyle='#ffe1a3';
      for(const yy of [H/2-half,H/2+half]){
        ctx.beginPath();ctx.arc(x,yy,9,0,Math.PI*2);ctx.fill();
      }
      ctx.strokeStyle='#ef5848';ctx.lineWidth=4;ctx.setLineDash([12,9]);ctx.globalAlpha=.85;
      ctx.beginPath();ctx.moveTo(x,H/2-half);ctx.lineTo(i===0?GOAL_CAMP_DEPTH:W-GOAL_CAMP_DEPTH,H/2-half);
      ctx.moveTo(x,H/2+half);ctx.lineTo(i===0?GOAL_CAMP_DEPTH:W-GOAL_CAMP_DEPTH,H/2+half);ctx.stroke();
      ctx.restore();
    }
  }
  function drawStage(){
    if(activeStage==='posts'||activeStage==='patrol'){
      for(const o of getPosts()){
        const sz=(o.r+7)*2;
        if(obstacleSprite.complete&&obstacleSprite.naturalWidth)ctx.drawImage(obstacleSprite,o.x-sz/2,o.y-sz/2,sz,sz);
        else{ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fillStyle='#f1cc7a';ctx.fill();}
      }
    }
    if(activeStage==='speed'){
      const spacing=29,scroll=(stageTime*62)%spacing;
      ZONES.forEach(z=>{
        const dir=z.x<W/2?1:-1,x=z.x-62,y=z.y-34,w=124,h=68;
        ctx.save();
        ctx.fillStyle='#1f8497';roundRect(x,y,w,h,10);ctx.fill();
        ctx.strokeStyle='#c2f9ff';ctx.lineWidth=3;ctx.stroke();
        ctx.beginPath();ctx.roundRect(x+7,y+9,w-14,h-18,5);ctx.clip();
        ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#d5fcff';ctx.lineWidth=6;
        for(let k=-3;k<=5;k++){
          const cx=z.x+dir*(-62+k*spacing+scroll);
          ctx.beginPath();ctx.moveTo(cx-dir*9,z.y-15);ctx.lineTo(cx+dir*6,z.y);ctx.lineTo(cx-dir*9,z.y+15);ctx.stroke();
        }
        ctx.restore();
      });
    }
    for(let i=0;i<2;i++)for(const o of wallPosts(i)){
      const sz=(o.r+7)*2,blink=walls[i]<1.5&&Math.floor(walls[i]*8)%2;
      ctx.save();ctx.globalAlpha=blink?.4:1;
      if(obstacleSprite.complete&&obstacleSprite.naturalWidth)ctx.drawImage(obstacleSprite,o.x-sz/2,o.y-sz/2,sz,sz);
      else{ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fillStyle='#f1cc7a';ctx.fill();}
      ctx.strokeStyle=SIDE_COLOR[i];ctx.lineWidth=4;ctx.beginPath();ctx.arc(o.x,o.y,o.r+4,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    for(const b of lunch){
      const bob=Math.sin(stageTime*4+b.x)*3;
      ctx.save();ctx.translate(b.x,b.y+bob);
      ctx.globalAlpha=.5+.3*Math.sin(stageTime*5+b.y);ctx.fillStyle=SIDE_GLOW[b.owner];ctx.beginPath();ctx.arc(0,0,42,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      if(itemBoxSprite.complete&&itemBoxSprite.naturalWidth)ctx.drawImage(itemBoxSprite,-34,-34,68,68);
      else{ctx.fillStyle='#e9a64d';ctx.fillRect(-24,-24,48,48);}
      ctx.strokeStyle=SIDE_COLOR[b.owner];ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,40,0,Math.PI*2);ctx.stroke();
      ctx.font='32px "HojaTitle",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=5;ctx.strokeStyle='#4c3432';ctx.strokeText('?',0,-2);ctx.fillStyle='#fff4cb';ctx.fillText('?',0,-2);
      ctx.restore();
    }
    if(iceTime>0){
      const blink=iceTime<1.5&&Math.floor(iceTime*8)%2;
      ctx.save();ctx.globalAlpha=blink?.08:.2;ctx.fillStyle='#bfefff';ctx.fillRect(0,0,W,H);
      ctx.globalAlpha=blink?.15:.35;ctx.strokeStyle='#ffffff';ctx.lineWidth=6;
      for(let k=0;k<7;k++){const x=((k*230+stageTime*40)%(W+300))-150;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+140,H);ctx.stroke();}
      ctx.restore();
    }
    if(activeStage==='items'&&drop){
      const bob=Math.sin(stageTime*4)*3,warn=drop.ttl<1.6&&Math.floor(stageTime*8)%2;
      ctx.save();ctx.translate(drop.x,drop.y+bob);ctx.globalAlpha=warn?.45:1;
      if(itemBoxSprite.complete&&itemBoxSprite.naturalWidth)ctx.drawImage(itemBoxSprite,-34,-34,68,68);
      else{ctx.fillStyle='#e9a64d';ctx.fillRect(-24,-24,48,48);}
      ctx.font='32px "HojaTitle",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=5;ctx.strokeStyle='#4c3432';ctx.strokeText('?',0,-2);ctx.fillStyle='#fff4cb';ctx.fillText('?',0,-2);
      ctx.restore();
    }
    if(slowField.time>0){
      const i=slowField.side,x=i===0?0:W/2,fx=i===0?W/2:0,dir=i===0?1:-1;
      ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#6f7fd8';ctx.fillRect(x,0,W/2,H);
      ctx.globalAlpha=.3;ctx.strokeStyle='#5a6bd0';ctx.lineWidth=3;
      for(let k=0;k<3;k++){const r=((stageTime*50+k*90)%270)+20;ctx.beginPath();ctx.arc(i===0?W/4:W*.75,H/2,r,0,Math.PI*2);ctx.stroke();}
      // The other half runs fast: warm tint and streaks rushing toward that side's goal.
      ctx.globalAlpha=.13;ctx.fillStyle='#ff9a3d';ctx.fillRect(fx,0,W/2,H);
      ctx.globalAlpha=.35;ctx.strokeStyle='#ff8a2a';ctx.lineWidth=5;ctx.lineCap='round';
      for(let k=0;k<9;k++){const y=H*(k+.5)/9,len=90,base=fx+((stageTime*520+k*137)%(W/2));const sx=dir>0?base:fx+W/2-(base-fx);
        ctx.beginPath();ctx.moveTo(sx,y);ctx.lineTo(sx-dir*len,y);ctx.stroke();}
      ctx.restore();
    }
    if(conquer.time>0){
      const c=conquer.side,gx=c===0?W:0,blink=conquer.time<1.5&&Math.floor(conquer.time*8)%2;
      ctx.save();ctx.globalAlpha=blink?.2:.45;ctx.fillStyle=SIDE_COLOR[c];
      ctx.beginPath();ctx.arc(gx,H/2,LAND_R,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.95;ctx.strokeStyle=SIDE_COLOR[c];ctx.lineWidth=8;ctx.setLineDash([18,12]);ctx.lineDashOffset=-stageTime*40;
      ctx.beginPath();ctx.arc(gx,H/2,LAND_R,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      // A small flag planted on the far side of the half-circle.
      const fx=c===0?W-LAND_R*.55:LAND_R*.55,fy=H/2-LAND_R*.55;
      ctx.globalAlpha=blink?.4:1;ctx.strokeStyle='#4c3432';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(fx,fy+34);ctx.lineTo(fx,fy-30);ctx.stroke();
      ctx.fillStyle=SIDE_COLOR[c];ctx.beginPath();ctx.moveTo(fx,fy-30);ctx.lineTo(fx+(c===0?-40:40),fy-18);ctx.lineTo(fx,fy-6);ctx.closePath();ctx.fill();
      ctx.restore();
      text('우리 땅!',fx,fy+62,28,SIDE_COLOR[c]);
    }
    for(let i=0;i<2;i++)if(shields[i]>0){
      const gx=i===0?2:W-2,blink=shields[i]<1.5&&Math.floor(shields[i]*8)%2;
      ctx.save();ctx.globalAlpha=blink?.35:.95;ctx.lineCap='round';
      ctx.strokeStyle='#ffd25a';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(gx,H/2-goalHalfFor(i));ctx.lineTo(gx,H/2+goalHalfFor(i));ctx.stroke();
      ctx.strokeStyle='#fff7cf';ctx.lineWidth=4;ctx.stroke();ctx.restore();
    }
    if(darkTime>0){
      ctx.save();ctx.fillStyle='rgba(3,10,18,.86)';ctx.fillRect(darkSide===0?0:W/2,0,W/2,H);ctx.restore();
    }
  }
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function drawMallet(m,i){
    const r=m.r,full=gauge[i]>=GAUGE_MAX,t=performance.now()/1000;
    ctx.beginPath();ctx.ellipse(m.x+5,m.y+9,r+5,r*.8,0,0,Math.PI*2);ctx.fillStyle='rgba(17,26,25,.28)';ctx.fill();
    if(full){
      const pulse=.5+.5*Math.sin(t*9);
      ctx.save();ctx.globalAlpha=.3+.35*pulse;ctx.fillStyle=SIDE_GLOW[i];
      ctx.beginPath();ctx.arc(m.x,m.y,r+16+pulse*10,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    const spr=malletSprites[i],pad=r*.17;
    if(spr.complete&&spr.naturalWidth)ctx.drawImage(spr,m.x-r-pad,m.y-r-pad,(r+pad)*2,(r+pad)*2);
    else{ctx.beginPath();ctx.arc(m.x,m.y,r,0,Math.PI*2);ctx.fillStyle=SIDE_COLOR[i];ctx.fill();}
    const im=faceImages[i];
    if(im.complete&&im.naturalWidth){
      const fr=r*.5;
      ctx.save();ctx.beginPath();ctx.arc(m.x,m.y-1,fr,0,Math.PI*2);ctx.clip();
      ctx.fillStyle='#fff9ea';ctx.fillRect(m.x-fr,m.y-1-fr,fr*2,fr*2);
      if(TABLET){ctx.translate(m.x,m.y-1);ctx.rotate(FACE[i]);ctx.drawImage(im,-fr*1.25,-fr*1.25,fr*2.5,fr*2.5);}
      else ctx.drawImage(im,m.x-fr*1.25,m.y-1-fr*1.25,fr*2.5,fr*2.5);
      ctx.restore();
    }
    if(m.frozen>0){
      ctx.save();ctx.globalAlpha=.55;ctx.fillStyle='#bfefff';ctx.beginPath();ctx.arc(m.x,m.y,r+10,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;ctx.strokeStyle='#6fd0f0';ctx.lineWidth=5;ctx.stroke();ctx.restore();
    }
    if(m.sticky>0){
      ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle='#8bc34a';ctx.lineWidth=8;ctx.setLineDash([6,10]);
      ctx.beginPath();ctx.arc(m.x,m.y,r+12,stageTime,stageTime+Math.PI*2);ctx.stroke();ctx.restore();
    }
    // Gauge at the child's fingertip, where they are actually looking.
    ctx.save();ctx.lineCap='round';ctx.lineWidth=TABLET?10:6;
    ctx.strokeStyle='rgba(30,40,38,.28)';ctx.beginPath();ctx.arc(m.x,m.y,r+7,0,Math.PI*2);ctx.stroke();
    if(gauge[i]>0){
      ctx.strokeStyle=full?'#ffd25a':SIDE_COLOR[i];
      ctx.beginPath();ctx.arc(m.x,m.y,r+7,-Math.PI/2,-Math.PI/2+Math.PI*2*gauge[i]/GAUGE_MAX);ctx.stroke();
    }
    ctx.restore();
    if(m.id===null&&!(aiLevel&&i===1)&&m.idle>1.6&&(phase==='playing')){
      const a=.5+.5*Math.sin(t*5);
      ctx.save();ctx.globalAlpha=.35+.5*a;ctx.strokeStyle=SIDE_COLOR[i];ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(m.x,m.y,r+18+a*8,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
  function drawPuck(x,y,owner=-1){
    // Keep real and fake puck pixels, owner rings and opacity identical.
    if(owner>=0&&!serve){
      ctx.save();ctx.globalAlpha=.85;ctx.strokeStyle=SIDE_COLOR[owner];ctx.lineWidth=6;
      ctx.beginPath();ctx.arc(x,y,R+7,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    ctx.save();
    ctx.beginPath();ctx.ellipse(x+5,y+7,R+3,R*.78,0,0,Math.PI*2);ctx.fillStyle='rgba(22,28,24,.3)';ctx.fill();
    if(puckSprite.complete&&puckSprite.naturalWidth)ctx.drawImage(puckSprite,x-R-4,y-R-4,(R+4)*2,(R+4)*2);
    else{ctx.beginPath();ctx.arc(x,y,R,0,Math.PI*2);ctx.fillStyle='#efdaab';ctx.fill();}
    // The sprite is pale on a pale table; a dark edge keeps it readable from the back of the room.
    ctx.strokeStyle='#2b2320';ctx.lineWidth=4.5;ctx.beginPath();ctx.arc(x,y,R,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  function text(str,x,y,size,color,stroke,font){
    if(!TABLET){drawText(str,x,y,size,color,stroke,font);return;}
    ctx.save();ctx.translate(x,y);ctx.rotate(FACE[x<W/2?0:1]);drawText(str,0,0,size,color,stroke,font);ctx.restore();
  }
  // The same line for both children, each reading it from their own end.
  function textBoth(str,gap,size,color,stroke,font){text(str,W/2-gap,H/2,size,color,stroke,font);text(str,W/2+gap,H/2,size,color,stroke,font);}
  function drawText(str,x,y,size,color,stroke='rgba(255,255,255,.92)',font='"HojaTitle",sans-serif'){
    ctx.font=`${size}px ${font}`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineJoin='round';ctx.lineWidth=Math.max(5,size*.2);ctx.strokeStyle=stroke;ctx.strokeText(str,x,y);
    ctx.fillStyle=color;ctx.fillText(str,x,y);
  }
  function drawReady(){
    const t=performance.now()/1000;
    for(let i=0;i<2;i++){
      if(aiLevel&&i===1)continue;
      const m=mallets[i],held=m.id!==null,a=.5+.5*Math.sin(t*5);
      ctx.save();ctx.strokeStyle=held?'#37b98a':SIDE_COLOR[i];ctx.lineWidth=held?10:7;ctx.globalAlpha=held?1:.5+.5*a;
      ctx.beginPath();ctx.arc(m.x,m.y,m.r+22+(held?0:a*14),0,Math.PI*2);ctx.stroke();ctx.restore();
      if(TABLET)text(held?'준비 완료!':'여기를 꾹!',m.x+(i?-1:1)*(m.r+52),m.y,34,held?'#1f8a64':SIDE_COLOR[i]);
      else text(held?'준비 완료!':'여기를 꾹!',m.x,m.y-m.r-52,34,held?'#1f8a64':SIDE_COLOR[i]);
    }
    if(TABLET){
      textBoth(aiLevel?'말렛에 손가락을 올리면 시작해요':'둘 다 말렛에 손가락을 올리면 시작해요',150,34,'#3c3229');
      textBoth('세게 치면 강타 · 기세가 차면 필살기!',96,24,'#7a6c58','rgba(255,255,255,.9)','"HojaBody",sans-serif');
      return;
    }
    text(aiLevel?'말렛에 손가락을 올리면 시작해요':'둘 다 말렛에 손가락을 올리면 시작해요',W/2,H/2,38,'#3c3229');
    text('세게 치면 강타 · 기세가 차면 필살기!',W/2,H/2+56,26,'#7a6c58','rgba(255,255,255,.9)','"HojaBody",sans-serif');
  }
  function drawTabletHud(){
    const time=$('timeText').textContent;
    for(const i of [0,1]){
      const dir=i?1:-1,cx=W/2+dir*W*.25,im=portraitEls[i],s=Math.min(H*.56,W*.3);
      if(im.complete&&im.naturalWidth){ctx.save();ctx.globalAlpha=.17;ctx.translate(cx,H/2);ctx.rotate(FACE[i]);ctx.drawImage(im,-s/2,-s/2,s,s);ctx.restore();}
      if(phase!=='ready'){ctx.save();ctx.globalAlpha=.62;text(String(scores[i]),W/2+dir*92,H/2,150,SIDE_COLOR[i]);ctx.restore();}
      ctx.save();ctx.globalAlpha=.75;
      text(time,W/2+dir*204,H/2,38,clock<=15?'#c0532f':'#4a4037');
      text(nameFor(i),W/2+dir*256,H/2,30,SIDE_COLOR[i]);
      ctx.restore();
      // Fills from the child's own end toward the centre line, on both rails so either hand can see it.
      const full=gauge[i]>=GAUGE_MAX,pulse=.5+.5*Math.sin(performance.now()/140),t=RM-14,span=W/2-110;
      for(const y of [-RM+7,H+7]){
        const x0=i?W-30-span:30;
        ctx.fillStyle='rgba(18,38,36,.6)';ctx.beginPath();ctx.roundRect(x0,y,span,t,t/2);ctx.fill();
        const fill=(span-4)*gauge[i]/GAUGE_MAX;
        ctx.fillStyle=full?(pulse>.5?'#ffd25a':'#ffb02e'):SIDE_GLOW[i];ctx.beginPath();ctx.roundRect(i?W-30-2-fill:32,y+2,Math.max(0,fill),t-4,(t-4)/2);ctx.fill();
      }
    }
  }
  function draw(){
    if(!inGame)return;
    if(arenaDirty||!arenaCache)buildArena();
    ctx.setTransform(1,0,0,1,0,0);
    const sc=canvas.width/LW;
    const sx=shake>.2?(Math.random()-.5)*shake*sc:0,sy=shake>.2?(Math.random()-.5)*shake*sc:0;
    ctx.drawImage(arenaCache,sx,sy);
    ctx.setTransform(sc,0,0,canvas.height/LH,RM*sc+sx,RM*(canvas.height/LH)+sy);
    if(TABLET)drawTabletHud();
    drawGoalCamp();
    drawStage();

    for(const tr of trail){
      ctx.globalAlpha=Math.max(0,tr.ttl/.18)*.5;ctx.fillStyle=tr.c;
      ctx.beginPath();ctx.arc(tr.x,tr.y,R*(.45+.5*tr.ttl/.18),0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    const aim=specialCut.aim&&specialCut.time<=CANNON_TELL&&choices[specialCut.attacker]!=='HOJA'?specialCut.aim:null;
    if(aim){
      const atk=specialCut.attacker>=0?specialCut.attacker:shot.cannon.attacker;
      const endX=atk===0?W:0,t=(endX-aim.x0)/aim.vx,ey=aim.y0+aim.vy*t;
      ctx.save();ctx.lineCap='round';
      ctx.globalAlpha=.32;ctx.strokeStyle='#ffcf4a';ctx.lineWidth=CANNON_PERFECT*2;ctx.beginPath();ctx.moveTo(aim.x0,aim.y0);ctx.lineTo(endX,ey);ctx.stroke();
      ctx.globalAlpha=1;ctx.strokeStyle='#e89c1c';ctx.lineWidth=5;ctx.setLineDash([22,16]);ctx.lineDashOffset=-performance.now()/14;
      ctx.beginPath();ctx.moveTo(aim.x0,aim.y0);ctx.lineTo(endX,ey);ctx.stroke();ctx.restore();
    }
    if(serve){
      const a=.5+.5*Math.sin(performance.now()/130);
      ctx.save();ctx.strokeStyle=SIDE_COLOR[serve.side];ctx.lineWidth=5;ctx.globalAlpha=.4+.6*a;
      ctx.beginPath();ctx.arc(puck.x,puck.y,R+14+a*10,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.9;ctx.lineWidth=7;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(puck.x,puck.y,R+38,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(serve.time/4.5,0,1));ctx.stroke();ctx.restore();
    }
    mallets.forEach(drawMallet);
    for(const g of ghosts)drawPuck(g.x,g.y,g.attacker);
    if(twin&&!(twin.ttl<1.5&&Math.floor(twin.ttl*8)%2))drawPuck(twin.x,twin.y,lastHitBy);
    if(!puckHidden){
      drawPuck(puck.x,puck.y,lastHitBy);
      if(smashSide>=0&&!serve){
        ctx.save();ctx.strokeStyle=SIDE_COLOR[smashSide];ctx.lineWidth=3;ctx.globalAlpha=.8;
        ctx.beginPath();ctx.arc(mallets[smashSide].x,mallets[smashSide].y,mallets[smashSide].r+14,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
    }
    if(phase==='special'){
      const pr=1-Math.max(0,specialCut.time)/CUT_TIME;
      ctx.save();ctx.translate(puck.x,puck.y);
      for(let j=0;j<3;j++){
        ctx.beginPath();ctx.arc(0,0,36+j*16+pr*30,0,Math.PI*2);
        ctx.strokeStyle=['#fff7bd','#ffbd62','#382e29'][j];ctx.lineWidth=(j===0?7:3)*(1-pr*.38);ctx.stroke();
      }
      for(let j=0;j<16;j++){
        const a=j*Math.PI/8+pr*.8,d=86+Math.sin(pr*18+j)*8;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);ctx.lineTo(Math.cos(a)*(d+34),Math.sin(a)*(d+34));
        ctx.strokeStyle=j%3?'#ffc54d':'#44332b';ctx.lineWidth=j%3?5:7;ctx.stroke();
      }
      ctx.restore();
    }
    for(const r of rings){
      ctx.save();ctx.globalAlpha=Math.max(0,r.ttl/r.life);ctx.strokeStyle=r.color;ctx.lineWidth=r.w*(r.ttl/r.life)+1;
      ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    for(const p of particles){
      ctx.globalAlpha=Math.min(1,p.ttl*3);ctx.fillStyle=p.c;
      if(p.conf){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillRect(-p.sz/2,-p.sz/4,p.sz,p.sz/2);ctx.restore();}
      else{ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fill();}
    }
    ctx.globalAlpha=1;
    if(flash){ctx.save();ctx.globalAlpha=.5*flash.ttl/flash.life;ctx.fillStyle=flash.color;ctx.fillRect(-RM,-RM,LW,LH);ctx.restore();}
    for(const f of floats){ctx.save();ctx.globalAlpha=Math.min(1,f.ttl*3);text(f.text,f.x,f.y,f.size,f.color);ctx.restore();}
    if(phase==='ready')drawReady();
    if(phase==='countdown'){
      const n=Math.max(1,Math.ceil(countdown/.8)),frac=(countdown%.8)/.8;
      ctx.save();ctx.globalAlpha=.4+.6*frac;if(TABLET)textBoth(String(n),190,150+70*frac,'#c0532f');else text(String(n),W/2,H/2,150+70*frac,'#c0532f');ctx.restore();
    }
  }
  let frameCounter=0,slowFrames=0;
  function frame(t){
    if(!inGame)return;
    if(!lastT)lastT=t;
    const elapsed=Math.min((t-lastT)/1000,.05);lastT=t;
    if(phase!=='paused'){
      accumulator=Math.min(.06,accumulator+elapsed);
      while(accumulator>=1/120){step(1/120);accumulator-=1/120;}
      if((frameCounter++%6)===0)updateClock();
    }else accumulator=0;
    updateFx(elapsed);
    draw();
    // Weak board: drop the buffer once rather than make every child play at a stutter.
    slowFrames=elapsed>.03?slowFrames+1:Math.max(0,slowFrames-1);
    if(slowFrames>90&&MAX_CANVAS_W>1400){MAX_CANVAS_W=1400;slowFrames=0;resizeRink();}
    raf=requestAnimationFrame(frame);
  }
  function resizeRink(){
    if(!inGame)return;
    layoutTablet();
    // Layout sizes, not screen boxes: on a turned tablet the screen box has width and height swapped.
    const avail=$('rinkAvailable'),r={width:avail.offsetWidth,height:avail.offsetHeight};
    if(!r.width||!r.height)return;
    const ratio=LW/LH;
    const width=Math.max(180,Math.floor(TABLET?Math.min(r.width,r.height*ratio):Math.min(r.width*.985,(r.height-14)*ratio))),height=Math.floor(width/ratio);
    shell.style.width=width+'px';shell.style.height=height+'px';
    const cr={width:canvas.offsetWidth,height:canvas.offsetHeight};
    const dpr=Math.min(window.devicePixelRatio||1,2,MAX_CANVAS_W/Math.max(1,cr.width));
    canvas.width=Math.round(cr.width*dpr);canvas.height=Math.round(cr.height*dpr);
    arenaDirty=true;draw();
  }
  let resizeObserver=null;
  function enterGame(){
    
    $('menuScreen').hidden=true;$('gameScreen').hidden=false;
    $('selectedStageLabel').textContent=STAGES.find(s=>s.id===activeStage).name;
    inGame=true;resetMatch();
    resizeRink();resizeObserver=new ResizeObserver(()=>resizeRink());resizeObserver.observe($('rinkAvailable'));
    window.addEventListener('resize',resizeRink);window.addEventListener('orientationchange',resizeRink);
    lastT=0;accumulator=0;raf=requestAnimationFrame(frame);
  }
  function leaveGame(){roundClose();
    releaseTouches();closeCut();resetShots();hideGoalBanner();hideOverlay();inGame=false;cancelAnimationFrame(raf);raf=0;
    if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}
    window.removeEventListener('resize',resizeRink);window.removeEventListener('orientationchange',resizeRink);
    $('gameScreen').hidden=true;$('menuScreen').hidden=false;
    phase='ready';lastT=0;accumulator=0;
    playBgm('menu',{gain:.8});
  }
  const IOS_WEBKIT=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
  const STANDALONE=navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
  let fsWanted=false,fsTried=0;
  function fsLockEsc(){try{if(navigator.keyboard&&navigator.keyboard.lock)navigator.keyboard.lock(['Escape']).catch(()=>{});}catch{}}
  function toggleFullscreen(force){
    if(IOS_WEBKIT||EMBED)return;
    const d=document,el=d.documentElement;
    try{
      const on=d.fullscreenElement||d.webkitFullscreenElement,enter=el.requestFullscreen||el.webkitRequestFullscreen,leave=d.exitFullscreen||d.webkitExitFullscreen;
      if(!on&&force!==false&&enter){fsWanted=true;const r=enter.call(el);if(r&&r.then)r.then(fsLockEsc,()=>{});}
      else if(on&&force!==true&&leave){fsWanted=false;leave.call(d);}
    }catch{}
  }
