  /* ---------- Selection screen ---------- */
  let introRunning=false;
  function stageSet(){
    if(PARTY_GAMES[currentGame]){const g=PARTY_GAMES[currentGame];return {all:g.stages,sel:g.sel,set:v=>{g.sel=v;},title:g.title};}
    if(currentGame==='othello')return {all:O_STAGES,sel:othelloStage,set:v=>{othelloStage=v;},title:'HOJA OTHELLO'};
    if(currentGame==='gomoku')return {all:G_STAGES,sel:gomokuStage,set:v=>{gomokuStage=v;},title:'HOJA 오목'};
    if(currentGame==='bubble')return {all:B_STAGES,sel:bubbleStage,set:v=>{bubbleStage=v;},title:'HOJA 퍼즐버블'};
    if(currentGame==='shop')return {all:TABLET?SH_STAGES.filter(st=>!(st.people>2)):SH_STAGES,sel:shopStage,set:v=>{shopStage=v;},title:'호자네 붕어빵'};
    if(currentGame==='ttt')return {all:T_STAGES,sel:tttStage,set:v=>{tttStage=v;},title:'HOJA 틱택토'};
    if(currentGame==='germ')return {all:X_STAGES,sel:germStage,set:v=>{germStage=v;},title:'HOJA 세균전'};
    if(currentGame==='stairs')return {all:TABLET?ST_STAGES.filter(st=>st.n<=2):ST_STAGES,sel:stairsStage,set:v=>{stairsStage=v;},title:'HOJA 무한 계단'};
    if(currentGame==='volley')return {all:VB_STAGES,sel:volleyStage,set:v=>{volleyStage=v;},title:'HOJA 배구'};
    return {all:STAGES,sel:activeStage,set:v=>{activeStage=v;},title:'HOJA AIR HOCKEY'};
  }
  function renderStages(){
    const list=$('stageList'),{all,sel,set,title}=stageSet();
    list.replaceChildren();
    all.forEach(st=>{
      const button=document.createElement('button');button.type='button';button.className='stage-card'+(sel===st.id?' selected':'');
      button.setAttribute('aria-pressed',sel===st.id?'true':'false');
      const label=document.createElement('span');label.className='stage-title';label.textContent=st.name;button.append(label);
      button.addEventListener('click',()=>{set(st.id);renderStages();sfx('menu',.6);});list.append(button);
    });
    $('stageDescription').textContent=all.find(s=>s.id===sel).desc;
    if(currentGame==='hockey')$('selectedStageLabel').textContent=all.find(s=>s.id===sel).name;
    $('vsTitle').textContent=title;
  }
  function clearIntro(){
    introTimeouts.forEach(clearTimeout);introTimeouts=[];introRunning=false;
    const screen=$('choiceScreen');screen.classList.remove('intro-active','taunt-on','depart');
    $('tauntLeft').hidden=true;$('tauntRight').hidden=true;$('skipIntro').hidden=true;
    $('choiceStart').disabled=false;
    $('previewLeft').src=portraitFor(0);$('previewRight').src=portraitFor(1);
  }
  function introDelay(fn,ms){introTimeouts.push(setTimeout(fn,ms));}
  function startBattleIntro(){
    if(introRunning)return;
    clearIntro();introRunning=true;
    for(let i=0;i<2;i++){
      $(i?'introNameRight':'introNameLeft').textContent=nameFor(i);
      $(i?'introLineRight':'introLineLeft').textContent=tauntFor(choices[i]);
    }
    $('previewLeft').src=portraitFor(0,'angry');$('previewRight').src=portraitFor(1,'angry');
    $('tauntLeft').hidden=false;$('tauntRight').hidden=false;
    $('choiceStart').disabled=true;$('skipIntro').hidden=false;
    const screen=$('choiceScreen');screen.classList.add('intro-active','taunt-on');
    sfx('goal',.7);sfx('charge',.6);stopBgm(.5);
    introDelay(()=>{launchSelected();screen.classList.add('depart');},1900);
    introDelay(finishBattleIntro,2780);
  }
  function finishBattleIntro(){
    if(!introRunning)return;
    clearIntro();$('choiceScreen').hidden=true;
    if(!inGame&&!O.on&&!GO.on&&!BB.on&&!SH.on&&!ST.on&&!VB.on&&!TT.on&&!GX.on&&!PS.on)launchSelected();
  }
  function launchSelected(){roundBegin();if(PARTY_GAMES[currentGame])enterParty();else if(currentGame==='othello')enterOthello();else if(currentGame==='gomoku')enterGomoku();else if(currentGame==='bubble')enterBubble();else if(currentGame==='shop')enterShop();else if(currentGame==='stairs')enterStairs();else if(currentGame==='volley')enterVolley();else if(currentGame==='ttt')enterTtt();else if(currentGame==='germ')enterGerm();else enterGame();}
  function nameFor(player){return CHARACTERS.find(c=>c.id===choices[player]).name;}
  function portraitFor(player,mood='neutral'){return EMBED_ASSETS['portraits/'+choices[player].toLowerCase()+'_'+(MOOD_FILE[mood]||MOOD_FILE.neutral)+'.webp'];}
  function characterPortrait(id,mood='neutral'){return EMBED_ASSETS['portraits/'+id.toLowerCase()+'_'+(MOOD_FILE[mood]||MOOD_FILE.neutral)+'.webp'];}
  function renderChoices(){
    for(let side=0;side<2;side++){
      const target=$(side?'choiceRight':'choiceLeft');
      target.replaceChildren();
      CHARACTERS.forEach(ch=>{
        const b=document.createElement('button');b.type='button';b.className='character-card'+(choices[side]===ch.id?' selected':'');
        b.dataset.id=ch.id;b.dataset.side=side;b.setAttribute('aria-pressed',choices[side]===ch.id?'true':'false');
        const im=document.createElement('img');im.src=characterPortrait(ch.id);im.alt='';
        const lab=document.createElement('span');lab.textContent=ch.name;
        b.append(im,lab);b.addEventListener('click',()=>{
          choices[side]=ch.id;renderChoices();sfx('menu',.6);
          const hero=$(side?'selectRightShowcase':'selectLeftShowcase');hero.classList.remove('portrait-pop');void hero.offsetWidth;hero.classList.add('portrait-pop');
        });target.append(b);
      });
    }
    $('previewLeft').src=portraitFor(0);$('previewRight').src=portraitFor(1);
    $('previewNameLeft').textContent=nameFor(0);$('previewNameRight').textContent=nameFor(1);
    for(let i=0;i<2;i++){
      const sp=SPECIALS[choices[i]];
      const skill=$(i?'skillRight':'skillLeft');skill.hidden=currentGame!=='hockey';skill.textContent=sp.name+' · '+sp.short;
    }
  }
  function syncSelectionHint(){
    const hint=$('selectionHint');
    if(streak.count>=1&&streak.side>=0&&choices[streak.side]===streak.id){
      hint.textContent=streak.count>=2?nameFor(streak.side)+' '+streak.count+'연승 중! 도전자 나와라':'챔피언 '+nameFor(streak.side)+'! 도전자 나와라';hint.classList.add('hot');
    }else{hint.textContent='각자 캐릭터와 경기장을 고르고 시작';hint.classList.remove('hot');}
    kbSyncGuide();
  }
  function enterSelection(){
    $('menuScreen').hidden=true;$('gameScreen').hidden=true;$('choiceScreen').hidden=false;
    renderChoices();renderStages();syncMode();$('modeButton').hidden=currentGame==='shop'||currentGame==='stairs'||Boolean(PARTY_GAMES[currentGame]);syncSelectionHint();playBgm('menu',{gain:.8});
  }
  function leaveSelection(){clearIntro();$('choiceScreen').hidden=true;$('menuScreen').hidden=false;}
  function syncCharacterUI(){
    $('teamNameLeft').textContent=nameFor(0);$('teamNameRight').textContent=nameFor(1);
    portraitEls.forEach((el,i)=>{el.alt=nameFor(i)+' 표정';});
    for(let i=0;i<2;i++)$(i?'gaugeNameRight':'gaugeNameLeft').textContent=SPECIALS[choices[i]].name;
  }

