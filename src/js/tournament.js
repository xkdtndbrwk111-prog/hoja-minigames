  /* ---------- Tournament: one bracket, one charge, existing 2P games ---------- */
  function tmShuffle(list,rng=Math.random){
    const out=list.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
  }
  function tmBracket(ids,rng=Math.random){
    if(!Array.isArray(ids)||ids.length<2||ids.length>40||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error('invalid entrants');
    const size=2**Math.ceil(Math.log2(ids.length)),half=size/2,shuffled=tmShuffle(ids,rng),extra=tmShuffle(Array.from({length:half},(_,i)=>i),rng);
    const first=shuffled.slice(0,half).map(a=>({a,b:null,winner:a,bye:true}));
    extra.slice(0,ids.length-half).forEach((slot,i)=>{const m=first[slot];m.b=shuffled[half+i];if(rng()<.5)[m.a,m.b]=[m.b,m.a];m.winner=null;m.bye=false;});
    const rounds=[first];for(let n=half/2;n>=1;n/=2)rounds.push(Array.from({length:n},()=>({a:null,b:null,winner:null,bye:false})));
    tmPropagate(rounds);return rounds;
  }
  function tmPropagate(rounds){
    for(let r=1;r<rounds.length;r++)rounds[r].forEach((m,i)=>{m.a=rounds[r-1][i*2].winner;m.b=rounds[r-1][i*2+1].winner;});
  }
  function tmNext(rounds){
    for(let r=0;r<rounds.length;r++)for(let i=0;i<rounds[r].length;i++){const m=rounds[r][i];if(m.a&&m.b&&!m.winner)return {r,i,m};}
    return null;
  }
  function tmResolve(rounds,r,i,winner){
    const next=tmNext(rounds);if(!next||next.r!==r||next.i!==i||![next.m.a,next.m.b].includes(winner))return false;
    next.m.winner=winner;tmPropagate(rounds);return true;
  }
  function tmRefundable(t,now=Date.now()){
    return Boolean(t&&t.charge&&!t.refundLocked&&(t.firstStart==null||(t.firstEnd??now)-t.firstStart<10000));
  }
  /* UI / host adapters (pure bracket helpers above are separately tested). */
  const TM={screen:null,t:null,running:false,begun:false,match:null,auth:false,busy:false,ready:null,bridge:false,pin:false,notice:'',restore:null};
  const tmKey=cls=>'hoja-tournament-v1:'+cls,tmHistoryKey=cls=>'hoja-tournament-history-v1:'+cls;
  function tmRead(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
  function tmWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
  function tmClear(cls){try{localStorage.removeItem(tmKey(cls));}catch{}}
  function tmStore(){return Boolean(TM.t&&tmWrite(tmKey(TM.t.classId),TM.t));}
  function tmEl(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
  function tmButton(label,fn,primary=false){const b=tmEl('button','control big '+(primary?'primary':''),label);b.type='button';b.onclick=()=>{if(!TM.busy){sfx('menu',.65);fn();}};return b;}
  function tmLayout(title,detail=''){
    const s=TM.screen;TM.view=title;s.hidden=false;$('menuScreen').hidden=true;
    s.replaceChildren();const head=tmEl('header','tm-head');head.append(tmEl('h2','',title),tmEl('p','',detail));
    const body=tmEl('div','tm-body'),foot=tmEl('footer','tm-foot');s.append(head,body,foot);return {body,foot};
  }
  function tmCatalog(){
    const classic=[
      ['hockey','에어하키',STAGES],['volley','호자 배구',VB_STAGES],['othello','오셀로',O_STAGES],
      ['gomoku','오목',G_STAGES],['bubble','퍼즐버블',B_STAGES],['ttt','틱택토',T_STAGES],['germ','세균전',X_STAGES],
      ['stairs','무한의 계단',ST_STAGES.filter(s=>s.n===2)],['shop','붕어빵 대결',SH_STAGES.filter(s=>s.id==='versus')],
      ['jump','호자 점프',[{id:'duel',name:'2인 대전'}]]
    ].map(([id,name,stages])=>({id,name,stages}));
    return classic.concat(Object.entries(PARTY_GAMES).filter(([id])=>id!=='rally'&&id!=='dance'&&id!=='rband').map(([id,g])=>({
      id,name:g.name,rhythm:Boolean(g.rhythm),stages:g.stages.filter(s=>(s.people??2)===2&&!s.coop&&!s.ai)
    })).filter(g=>g.stages.length));
  }
  function tmGame(id){return tmCatalog().find(g=>g.id===id);}
  function tmSaved(){
    const t=tmRead(tmKey(COIN.classId));if(!t||t.version!==1||t.classId!==COIN.classId||!['normal','world'].includes(t.mode)||!tmGame(t.game)?.stages.some(s=>s.id===t.stage)||!Array.isArray(t.players)||!Array.isArray(t.rounds)||!t.rounds.length)return null;
    return t;
  }
  function tmRoster(msg){
    TM.bridge=msg.tournamentV1===true;TM.pin=msg.teacherPinConfigured===true;
    if(TM.t&&TM.t.classId!==COIN.classId){tmStopMatch();TM.t=null;TM.auth=false;TM.notice='학급이 변경됐어요.';tmHome();}
    if(TM.ready&&msg.readyReq===TM.ready.req){const p=TM.ready;TM.ready=null;clearTimeout(p.timer);TM.busy=false;p.done(p.cls===''||p.cls===COIN.classId);}
  }
  function tmFresh(done){
    if(!EMBED||TM.busy||COIN.paying)return;
    TM.busy=true;const req=++COIN.seq,cls=COIN.classId;
    const timer=setTimeout(()=>{if(TM.ready?.req===req){TM.ready=null;TM.busy=false;hofToast('학급 연결을 다시 확인해 주세요.');done(false);}},8000);
    TM.ready={req,cls,timer,done};coinPost({type:'hoja-ready',readyReq:req});
  }
  function tmAuth(done){
    if(!TM.bridge||!TM.pin||!COIN.classId){hofToast('호자보드의 공통 교사 인증번호를 먼저 설정해 주세요.');return;}
    if(TM.busy)return;TM.busy=true;const req=++COIN.seq,cls=COIN.classId;
    const timer=setTimeout(()=>{COIN.pending.delete(req);TM.busy=false;hofToast('교사 인증을 다시 시도해 주세요.');},180000);
    COIN.pending.set(req,msg=>{clearTimeout(timer);TM.busy=false;if(!msg.ok||msg.classId!==cls||COIN.classId!==cls){hofToast(msg.message||'교사 인증이 필요해요.');return;}TM.auth=true;done();});
    coinPost({type:'hoja-tournament-auth',req,classId:cls});
  }
  function tournamentRefundAck(){if(TM.screen&&!TM.screen.hidden&&TM.view==='토너먼트'&&!TM.t)tmHome();}
  function tmHome(){
    TM.t=null;TM.auth=false;TM.match=null;TM.running=false;
    const {body,foot}=tmLayout('토너먼트','참가자를 추첨하고 한 경기씩 진행해요.');
    if(TM.notice){body.append(tmEl('p','tm-notice',TM.notice));TM.notice='';}
    if(!EMBED||!COIN.classId||!TM.bridge){
      body.append(tmEl('p','tm-notice','최신 호자보드에서 학급을 연결한 후 이용할 수 있어요.'));
      if(EMBED)foot.append(tmButton('연결 확인',()=>tmFresh(()=>tmHome())));
    }else{
      const saved=tmSaved();
      if(saved){body.append(tmEl('h3','','진행 중인 토너먼트'),tmButton((saved.mode==='world'?'교실 월드컵':'일반 토너먼트')+' · '+tmGame(saved.game).name+' 이어하기',()=>tmResume(saved),true));}
      else{
        const normal=tmButton('일반 토너먼트 · 4인 / 8인 · 1인 0.5코인',()=>tmSetup('normal'),true);normal.disabled=!COIN.on||COIN.refunds.size>0;
        const world=tmButton('교실 월드컵 · 학급 전체 · 무료 🔒',()=>tmFresh(ok=>{if(ok)tmAuth(()=>tmSetup('world'));}));world.disabled=!TM.pin;
        body.append(normal,world);
        if(!COIN.on)body.append(tmEl('p','tm-note','일반 토너먼트는 코인 사용이 켜져 있어야 해요.'));
        if(!TM.pin)body.append(tmEl('p','tm-note','교실 월드컵은 공통 교사 인증번호 설정이 필요해요.'));
      }
      body.append(tmButton('토너먼트 우승 기록',()=>tmHistory(false)));
    }
    foot.append(tmButton('← 게임 모음집',()=>{TM.screen.hidden=true;$('menuScreen').hidden=false;}));
  }
  function tmOpen(){tmHome();if(EMBED)tmFresh(()=>tmHome());}
  function tmSetup(mode){
    if(mode==='world'&&!TM.auth)return;
    const cls=COIN.classId,games=tmCatalog(),selected=new Set();
    let count=4;
    const {body,foot}=tmLayout(mode==='world'?'교실 월드컵':'일반 토너먼트',COIN.className||'우리 반');
    const settings=tmEl('div','tm-settings');
    const game=tmEl('select','tm-select'),stage=tmEl('select','tm-select'),song=tmEl('select','tm-select'),face=tmEl('select','tm-select');
    game.setAttribute('aria-label','게임');stage.setAttribute('aria-label','스테이지');song.setAttribute('aria-label','공통 곡');face.setAttribute('aria-label','공통 캐릭터');
    const option=(sel,id,label)=>{const o=tmEl('option','',label);o.value=id;sel.append(o);};
    for(const g of games)option(game,g.id,g.name);
    for(const s of RH_SONGS)option(song,s.id,s.name);
    for(const ch of CHARACTERS)option(face,ch.id,'공통 캐릭터 · '+ch.name);face.value='HOJA';
    const updateStage=()=>{stage.replaceChildren();const g=tmGame(game.value);for(const s of g.stages)option(stage,s.id,s.name);song.hidden=!g.rhythm;face.hidden=g.id==='jump';};
    game.onchange=updateStage;updateStage();
    settings.append(game,stage,song,face);body.append(settings);
    const roster=tmEl('div','tm-roster'),status=tmEl('p','tm-note');
    const draw=()=>{
      roster.replaceChildren();const students=mode==='world'?COIN.everyone:COIN.students;
      if(mode==='world'){status.textContent=students.length+'명 전원 참가 · 부전승 자동 추첨';for(const st of students)roster.append(tmEl('span','tm-person',st.name));}
      else{status.textContent=selected.size+'/'+count+'명 선택 · 모두 0.5코인씩';
        for(const st of students){const b=tmButton(st.name+' · '+coinText(st.balance),()=>{if(selected.has(st.id))selected.delete(st.id);else if(selected.size<count)selected.add(st.id);draw();});b.classList.toggle('tm-chosen',selected.has(st.id));b.disabled=!selected.has(st.id)&&(selected.size>=count||st.balance-.5<COIN.floor);roster.append(b);}
      }
      start.disabled=mode==='world'?students.length<2||students.length>40:selected.size!==count;
    };
    if(mode==='normal'){
      const row=tmEl('div','tm-settings');for(const n of [4,8]){const b=tmButton(n+'인전',()=>{count=n;selected.clear();for(const item of row.children)item.classList.toggle('tm-chosen',item===b);draw();});b.classList.toggle('tm-chosen',n===count);row.append(b);}body.append(row);
    }
    body.append(status,roster);
    const start=tmButton('대진표 추첨 · 시작',()=>{
      const wanted=mode==='world'?COIN.everyone.map(p=>p.id):[...selected],g=tmGame(game.value),st=stage.value,track=song.value,character=face.value;
      tmFresh(ok=>{
        if(!ok||COIN.classId!==cls||!TM.bridge||mode==='world'&&(!TM.auth||!TM.pin))return tmHome();
        const list=mode==='world'?COIN.everyone:COIN.students;
        if(mode==='world'&&(list.length!==wanted.length||list.some(p=>!wanted.includes(p.id)))||wanted.some(id=>!list.some(p=>p.id===id))){hofToast('명단이 변경됐어요. 다시 선택해 주세요.');return tmSetup(mode);}
        if(mode==='normal'&&(wanted.length!==count||!COIN.on||COIN.refunds.size))return tmHome();
        const players=wanted.map(id=>{const p=list.find(s=>s.id===id);return {id:p.id,name:p.name,number:p.number??null};});
        const t={version:1,classId:cls,mode,game:g.id,stage:st,song:g.rhythm?track:null,character,players,rounds:tmBracket(wanted),charge:null,firstStart:null,firstEnd:null,refundLocked:false,completed:0,created:Date.now()};
        if(mode==='world'){TM.t=t;if(!tmStore()){TM.t=null;hofToast('대진표를 저장할 수 없어요.');return;}tmBoard();}
        else{
          TM.busy=true;
          coinSpend(wanted,()=>{
            TM.busy=false;t.charge=round?.charge;round=null;tryReset();TM.t=t;
            if(!t.charge||!tmStore()){if(t.charge)queueRefund(t.charge,cls,'대진표를 저장하지 못해');TM.t=null;hofToast('대진표를 저장하지 못했어요.');return tmHome();}
            tmBoard();
          },reason=>{TM.busy=false;hofToast(reason);},'토너먼트 · '+g.name);
        }
      });
    },true);
    foot.append(tmButton('← 돌아가기',tmHome),start);draw();
  }
  function tmResume(saved){
    tmFresh(ok=>{
      if(!ok||saved.classId!==COIN.classId||!TM.bridge)return tmHome();
      const resume=()=>{const t=tmSaved();if(!t)return tmHome();const ids=new Set(COIN.everyone.map(p=>p.id));if(t.players.some(p=>!ids.has(p.id)))TM.notice='참가 명단이 변경되어 경기를 시작할 수 없어요. 대진표를 확인하고 종료해 주세요.';TM.t=t;tmBoard();};
      if(saved.mode==='world')tmAuth(resume);else resume();
    });
  }
  function tmName(id){return id?TM.t?.players.find(p=>p.id===id)?.name||'학생':'미정';}
  function tmRoundName(rounds,r){const n=rounds[r].length*2;return n===2?'결승':n===4?'준결승':n+'강';}
  function tmBoard(){
    const t=TM.t;if(!t)return tmHome();
    if(t.mode==='world'&&!TM.auth)return tmHome();
    const next=tmNext(t.rounds),winner=t.rounds.at(-1)[0].winner;
    const {body,foot}=tmLayout((t.mode==='world'?'교실 월드컵':'일반 토너먼트')+' · '+tmGame(t.game).name,t.players.length+'명 · '+t.completed+'/'+(t.players.length-1)+'경기 완료');
    if(TM.notice){body.append(tmEl('p','tm-notice',TM.notice));TM.notice='';}
    if(winner){
      body.append(tmEl('h3','tm-champion','🏆 '+tmName(winner)+' 우승!'));
      foot.append(tmButton('우승 기록 저장 · 완료',()=>{if(tmSaveWinner()){tmClear(t.classId);tmHome();}},true));
    }else if(next){
      const now=tmEl('div','tm-now');now.append(tmEl('small','',tmRoundName(t.rounds,next.r)+' · '+(next.i+1)+'경기'),tmEl('strong','',tmName(next.m.a)+'  VS  '+tmName(next.m.b)));body.append(now);
      foot.append(tmButton('경기 시작',()=>tmLaunch(next),true));
    }
    const columns=tmEl('div','tm-bracket');
    for(let r=0;r<t.rounds.length;r++){const col=tmEl('div','tm-round'),matches=tmEl('div','tm-matches');col.append(tmEl('h3','',tmRoundName(t.rounds,r)),matches);t.rounds[r].forEach((m,i)=>{
      const card=tmEl('div','tm-match'+(next?.r===r&&next.i===i?' tm-current':''));
      const line=(id,bye=false)=>{const e=tmEl('div',id&&m.winner===id?'tm-winner':'',bye?'부전승':tmName(id));card.append(e);};
      line(m.a);line(m.b,m.bye);matches.append(card);
    });columns.append(col);}
    body.append(columns);
    if(!winner){
      if(tmRefundable(t))foot.append(tmButton('환불하고 토너먼트 취소',()=>tmCancel(true)));
      foot.append(tmButton('저장하고 나가기',()=>{if(tmStore())tmHome();else hofToast('대진표 저장을 확인해 주세요.');}));
      if(!tmRefundable(t))foot.append(tmButton('토너먼트 종료',()=>tmCancel(false)));
    }
  }
  function tmSaveWinner(){
    const t=TM.t,w=t?.rounds.at(-1)[0].winner;if(!w)return false;
    const hist=tmRead(tmHistoryKey(t.classId),[]);if(!Array.isArray(hist))return false;
    if(!hist.some(x=>x.created===t.created))hist.unshift({mode:t.mode,game:tmGame(t.game).name,stage:tmGame(t.game).stages.find(s=>s.id===t.stage)?.name,winner:tmName(w),count:t.players.length,created:t.created,ended:Date.now()});
    return tmWrite(tmHistoryKey(t.classId),hist.slice(0,100));
  }
  function tmHistory(world){
    const {body,foot}=tmLayout('토너먼트 우승 기록','일반 명예의 전당 및 주간 코인 보상과 분리됩니다.');
    const hist=tmRead(tmHistoryKey(COIN.classId),[]);
    for(const h of Array.isArray(hist)?hist:[]){if(h.mode==='world'&&!world)continue;body.append(tmEl('p','tm-person',new Date(h.ended).toLocaleDateString('ko-KR')+' · '+h.game+' · '+h.count+'명 · 🏆 '+h.winner));}
    if(!world&&TM.pin)foot.append(tmButton('교실 월드컵 기록 🔒',()=>tmAuth(()=>tmHistory(true))));
    foot.append(tmButton('← 토너먼트',tmHome));
  }
  function tmCancel(refund){
    const t=TM.t;if(!t)return;
    if(refund&&!tmRefundable(t))return tmBoard();
    if(!confirm(refund?'토너먼트를 취소하고 참가비를 돌려줄까요?':'토너먼트를 종료할까요? 참가비는 반환되지 않아요.'))return;
    if(refund)queueRefund(t.charge,t.classId,'토너먼트를 취소해서');
    tmClear(t.classId);tmHome();
  }
  function tmLaunch(next){
    const t=TM.t;
    tmFresh(ok=>{
      if(!ok||TM.t!==t||t.classId!==COIN.classId||!TM.bridge||t.mode==='world'&&(!TM.auth||!TM.pin))return tmHome();
      const roster=new Set(COIN.everyone.map(p=>p.id));if(t.players.some(p=>!roster.has(p.id))){hofToast('참가 명단이 변경됐어요.');return;}
      const live=tmNext(t.rounds);if(!live||live.r!==next.r||live.i!==next.i)return tmBoard();
      TM.match=live;TM.running=true;TM.begun=false;TM.restore=null;streak={side:-1,id:null,count:0};round=null;tryReset();
      const previous={game:currentGame,ai:aiLevel,choices:[...choices],players:[...HOF.players],names:[...HOF.playerNames]};currentGame=t.game;aiLevel=0;
      if(t.game!=='jump'){const stages=stageSet();const oldStage=stages.sel;TM.restore=()=>{stages.set(oldStage);currentGame=previous.game;aiLevel=previous.ai;choices=previous.choices;HOF.players=previous.players;HOF.playerNames=previous.names;};stages.set(t.stage);}
      else TM.restore=()=>{currentGame=previous.game;aiLevel=previous.ai;choices=previous.choices;HOF.players=previous.players;HOF.playerNames=previous.names;};
      HOF.players=Array(6).fill(null);HOF.playerNames=[tmName(live.m.a),tmName(live.m.b),null,null,null,null];
      const face=CHARACTERS.some(ch=>ch.id===t.character)?t.character:'HOJA';choices=[face,face];
      TM.screen.hidden=true;$('menuScreen').hidden=true;
      if(t.game==='jump')CJ.enter('duel');else launchSelected();
    });
  }
  function tournamentBegin(){
    const t=TM.t;if(!TM.running||!t||TM.begun)return;
    TM.begun=true;
    if(t.firstStart==null)t.firstStart=Date.now();else t.refundLocked=true;
    if(!tmStore())hofToast('대진표 저장에 문제가 있어요.');
  }
  function tournamentFinishClock(){
    const t=TM.t;if(TM.running&&t&&t.firstStart!=null&&t.firstEnd==null){t.firstEnd=Date.now();tmStore();}
  }
  function tmStopMatch(){
    if(!TM.running)return;
    TM.running=false;TM.begun=false;TM.match=null;
    refundExitToMenu();TM.restore?.();TM.restore=null;
  }
  function tournamentSuspend(){
    if(!TM.running)return false;
    const t=TM.t;tournamentFinishClock();tmStopMatch();tmStore();TM.notice='중단한 경기는 다시 시작할 수 있어요.';tmBoard();return true;
  }
  function tournamentResult(winner){
    if(!TM.running||!TM.t||!TM.match)return false;
    const t=TM.t,{r,i,m}=TM.match;tournamentFinishClock();
    if(winner===0||winner===1){
      const id=winner===0?m.a:m.b;if(tmResolve(t.rounds,r,i,id)){t.completed++;TM.notice=tmName(id)+' 승리!';}
    }else TM.notice='무승부! 같은 경기에서 다시 겨뤄요.';
    tmStopMatch();if(!tmStore())hofToast('대진표 저장에 문제가 있어요.');
    if(t.rounds.at(-1)[0].winner){tmSaveWinner();victoryJingle();cheer(1.2);}else sfx('goal',.8);
    tmBoard();return true;
  }
  function tournamentSong(){return TM.running&&TM.t?.song?RH_SONGS.find(s=>s.id===TM.t.song):null;}
  function tournamentInit(){
    const style=tmEl('style');style.textContent=
      '#tmScreen{position:fixed;inset:0;z-index:80;background:#f4e9d4;color:#493523;font-family:inherit;display:flex;flex-direction:column;padding:clamp(12px,2vw,32px);gap:12px;overflow:hidden}#tmScreen[hidden],#tmScreen [hidden]{display:none!important}#tmScreen h2,#tmScreen h3,#tmScreen p{margin:0}.tm-head{text-align:center}.tm-head h2{font-size:clamp(24px,3vw,50px)}.tm-head p,.tm-note{font-size:clamp(14px,1.35vw,23px)}.tm-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;align-items:stretch}.tm-foot,.tm-settings{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center}.tm-foot{flex:none}.tm-roster{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px}.tm-person,.tm-match,.tm-now,.tm-notice{padding:10px;border:1px solid #baa98c;background:#fff9ec;border-radius:10px}.tm-chosen{outline:3px solid #278571;background:#d0e9dd!important}.tm-select{font:inherit;font-size:clamp(16px,1.6vw,26px);padding:10px;border:1px solid #baa98c;border-radius:10px;background:#fff9ec;color:#493523;max-width:95%}.tm-now{text-align:center;display:grid;gap:4px;background:#fff1ce}.tm-now strong,.tm-champion{font-size:clamp(24px,3vw,46px);text-align:center}.tm-bracket{display:flex;gap:12px;overflow:auto;align-items:stretch;min-height:0}.tm-round{flex:1;min-width:140px;display:flex;flex-direction:column;gap:6px}.tm-round h3{text-align:center}.tm-matches{display:flex;flex:1;flex-direction:column;justify-content:space-around;gap:6px}.tm-match{position:relative;padding:6px;display:grid;gap:3px}.tm-match div{padding:4px;overflow-wrap:anywhere}.tm-winner{background:#d1e9d8;font-weight:bold;border-radius:4px}.tm-round:not(:last-child) .tm-match::after{content:"";position:absolute;right:-13px;top:50%;width:12px;border-top:1px solid #baa98c}.tm-current{border:3px solid #c58b25}.tm-notice{text-align:center;font-weight:800}.tm-note{text-align:center}';
    document.head.append(style);TM.screen=tmEl('section','');TM.screen.id='tmScreen';TM.screen.hidden=true;document.body.append(TM.screen);
    const b=tmButton('🏆 토너먼트',tmOpen,true);b.id='openTournament';$('openHall').before(b);
  }
