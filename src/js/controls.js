  /* ---------- Controls ---------- */
  function openGame(g){if(currentGame!==g)streak={side:-1,id:null,count:0};currentGame=g;sfx('menu',.8);toggleFullscreen(true);enterSelection();}
  $('openHockey').addEventListener('click',()=>openGame('hockey'));
  $('openOthello').addEventListener('click',()=>openGame('othello'));
  $('openGomoku').addEventListener('click',()=>openGame('gomoku'));
  $('openBubble').addEventListener('click',()=>openGame('bubble'));
  $('openShop').addEventListener('click',()=>openGame('shop'));
  $('openStairs').addEventListener('click',()=>openGame('stairs'));
  $('openVolley').addEventListener('click',()=>openGame('volley'));
  $('openTtt').addEventListener('click',()=>openGame('ttt'));
  $('openGerm').addEventListener('click',()=>openGame('germ'));
  // Only Hoja has pixel frames, so this game skips the character screen and opens on its own mode choice.
  $('openJump').addEventListener('click',()=>{if(currentGame!=='jump')streak={side:-1,id:null,count:0};currentGame='jump';sfx('menu',.8);toggleFullscreen(true);CJ.enter();});
  $('fullscreenButton').addEventListener('click',()=>{sfx('menu',.7);toggleFullscreen();});
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
  // A forced address (the classroom dashboard) never offers the switch.
  $('deviceButton').hidden=!!FORCED_MODE;
  $('deviceButton').textContent=TABLET?'칠판 화면으로':'태블릿 화면으로';
  if(TABLET)$('touchNote').textContent='✓ 태블릿 화면 · 에어하키는 마주 보고';
  if(IOS_WEBKIT){
    $('fullscreenButton').hidden=true;
    if(!STANDALONE)$('touchNote').textContent='✓ 공유 → 홈 화면에 추가하면 주소창 없이 전체 화면';
  }
  if(EMBED){
    $('fullscreenButton').hidden=true;
    $('dashboardBack').hidden=false;
    $('dashboardBack').addEventListener('click',()=>{sfx('menu',.7);window.parent.postMessage({type:'hoja-close'},DASHBOARD_ORIGIN);});
    window.parent.postMessage({type:'hoja-ready'},DASHBOARD_ORIGIN);
  }
  $('deviceButton').addEventListener('click',()=>{remember('device',TABLET?'board':'tablet');location.reload();});
  $('choiceBack').addEventListener('click',()=>{sfx('menu',.7);streak={side:-1,id:null,count:0};leaveSelection();});
  $('choiceStart').addEventListener('click',()=>playGate(playersNeeded(),hofNeeded(),startBattleIntro));
  $('openHall').addEventListener('click',hofOpen);
  $('skipIntro').addEventListener('click',finishBattleIntro);
  $('modeButton').addEventListener('click',()=>{aiLevel=(aiLevel+1)%4;streak={side:-1,id:null,count:0};sfx('menu',.7);syncMode();syncSelectionHint();});
  $('soundButton').addEventListener('click',cycleSound);
  section.addEventListener('pointerdown',onPointerDown,{passive:false});
  section.addEventListener('pointermove',onPointerMove,{passive:false});
  section.addEventListener('pointerup',onPointerUp);
  section.addEventListener('pointercancel',onPointerUp);
  section.addEventListener('lostpointercapture',onPointerUp);
  // Pause needs a deliberate hold: this strip sits right below where children are swinging.
  const hold=$('holdPause');let holdTimer=0;
  hold.addEventListener('pointerdown',e=>{
    e.stopPropagation();
    if(phase==='ready'){startCountdown();sfx('menu',.8);return;}
    hold.classList.add('holding');clearTimeout(holdTimer);holdTimer=setTimeout(()=>{hold.classList.remove('holding');sfx('menu',.8);pause();},650);
  });
  ['pointerup','pointerleave','pointercancel'].forEach(n=>hold.addEventListener(n,()=>{clearTimeout(holdTimer);hold.classList.remove('holding');}));
  // Press-and-hold on a touch screen would otherwise open a context menu and kill the touch.
  const hofTyping=e=>e.target&&e.target.closest&&e.target.closest('input,textarea');
  document.addEventListener('contextmenu',e=>{if(!hofTyping(e))e.preventDefault();});
  ['gesturestart','gesturechange','gestureend'].forEach(n=>document.addEventListener(n,e=>e.preventDefault(),{passive:false}));
  document.addEventListener('dragstart',e=>e.preventDefault());
  document.addEventListener('selectstart',e=>{if(!hofTyping(e))e.preventDefault();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&inGame&&phase!=='paused'&&phase!=='finished'&&phase!=='ready'&&location.hash!=='#debug')pause();
  });
  syncMode();
  if(location.hash==='#debug'){
    window.__hoja={
      bakery:{SH,SH_DAYS,SH_UP,SH_SP,shStep,shTapMold,shServe,shBuy,shNextDay,shCovers,shCookTime,shTarget,shNewGame,shSpecial,shTrayCap,shGold,shBurn,setStage(v){shopStage=v;},setChoice(i,id){choices[i]=id;}},
      menuBg:MB,
      items:{ITEMS,ITEM_KINDS,GOOD_ITEMS,applyItem,placeLunch,fieldRate,goalHalfFor,wallPosts,get lunch(){return lunch;},get twin(){return twin;},get goalWide(){return goalWide;},get walls(){return walls;},get iceTime(){return iceTime;},get cannonWide(){return cannonWide;},get landR(){return LAND_R;},landedOn,get midX(){return midX;}},
      party:{PS,PARTY_GAMES,paStart,fourAi,RH},
      step,draw,mallets,puck,get phase(){return phase;},get scores(){return scores;},get gauge(){return gauge;},set gauge(v){gauge=v;syncGauge();},
      get clock(){return clock;},set clock(v){clock=v;},get serve(){return serve;},get shot(){return shot;},get ghosts(){return ghosts;},get shields(){return shields;},
      get slowField(){return slowField;},get conquer(){return conquer;},get midX(){return midX;},get golden(){return golden;},get rally(){return rallyHits;},get stats(){return stats;},
      get lastHitBy(){return lastHitBy;},get streak(){return streak;},get drop(){return drop;},possession,get freeze(){return freeze;},
      get buffers(){return buffers;},get ac(){return ac;},get canvasSize(){return [canvas.width,canvas.height];},
      setChoices(a,b){choices=[a,b];},setStage(s){activeStage=s;},setAI(l){aiLevel=l;},startSpecial,field:{W,H,R,MALLET_R,GOAL_HALF,RM,LW,LH},
      get aiLevel(){return aiLevel;},
      tt:{TT,tGeo,tLineAt,tDo,tUndo,tAiMove,tSearch,tPlace,tBeginTurn,tFrame,T_STAGES,setStage(v){tttStage=v;}},
      gx:{GX,xGeo,xStart,xMoves,xApply,xRevert,xCount,xAiMove,xPlay,xFrame,xAfterMove,xUseHint,xUndo,xHasMove,X_STAGES,setStage(v){germStage=v;}},
      music:{BGM_POOLS,bgmTurn,playMood,victoryJingle,get bgmName(){return bgmName;},get wantBgm(){return wantBgm;}},
      jump:CJ.debug,kb:{kbHeld},hof:{HOF,hofMarks,hofRecord,hofWin,hofPick,hofFlush,hofRefresh,hofShowMain,hofChampion},DEVICE,TABLET,IOS_WEBKIT,STANDALONE,getPoint,get fsWanted(){return fsWanted;},fsRestore,setGaugeValue(i,v){gauge[i]=v;},layoutTablet,get tabletTurn(){return tabletTurn;},installRoundRect,get audioBuffers(){return buffers;},
      st:{ST,stStep,stFrame,stMove,stNew,stNextDir,setStage(v){stairsStage=v;}},
      vb:{VB,vbHitBall,vbStep,vbFrame,vbJumpPress,vbNew,VB_AI,setStage(v){volleyStage=v;},setAI(v){aiLevel=v;}},
      shop:{SH,shStep,shFrame,shHit,shTapMold,shServe,shCoPrep,shCoPack,shCoPay,shCovers,shBuy,shNextDay,shNewGame,SH_DAYS,SH_UP,setStage(v){shopStage=v;},setChoices(a,b){choices=[a,b];}},
      gom:{GO,gFrame,gRun,gWinLine,gIsDoubleThree,gAiMove,gPlace,gBeginTurn,gOpenMenu,gUseHint,gUndo,G_STAGES,setStage(s){gomokuStage=s;}},
      bub:{BB,bEvaluate,bFrame,bStep,bTrace,bCluster,bFloating,bNeighbors,bMakeField,bSettle,bFire,bPushRow,bLowest,bX,bY,B_STAGES,B_LY,B_W,B_FH,B_DEAD,setStage(s){bubbleStage=s;},setCurrent(g){currentGame=g;}},
      oth:{O,oFrame,oAfterMove,oEndGame,oGeometry,oStart,oFlips,oMoves,oCount,oAiMove,oRandomHoles,O_STAGES,oPlace,oBeginTurn,oOpenMenu,oCloseMenu,oUseHint,oUndo,setStage(s){othelloStage=s;},get streak(){return streak;}}
    };
  }
})();