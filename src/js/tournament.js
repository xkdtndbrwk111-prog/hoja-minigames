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
    for(let r=0;r<rounds.length;r++)rounds[r].forEach((m,i)=>{if(m.fa&&m.fb){const f=x=>x.id??rounds[x.ref[0]][x.ref[1]].winner;m.a=f(m.fa);m.b=f(m.fb);}else if(r>0){m.a=rounds[r-1][i*2].winner;m.b=rounds[r-1][i*2+1].winner;}});
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

  // Compact single elimination: store only played matches. Direct seeds are
  // carried into the next round, not represented as fake wins or empty cards.
  function tmSize(n){return n>32?40:n>24?32:n>16?24:2**Math.ceil(Math.log2(n));}
  function tmCompact(ids,rng=Math.random){
    if(!Array.isArray(ids)||ids.length<2||ids.length>40||new Set(ids).size!==ids.length)throw Error('invalid entrants');
    const p=2**Math.floor(Math.log2(ids.length)),extra=ids.length-p,sh=tmShuffle(ids,rng);
    const prelim=[],slots=[],rounds=[];
    // Spread prelim winners across opposite main matches before filling both sides.
    const positions=tmShuffle(Array.from({length:p/2},(_,i)=>i),rng).map(i=>i*2+(rng()<.5?0:1));
    const candidates=positions.concat(tmShuffle(positions.map(i=>i^1),rng));
    const chosen=new Set(candidates.slice(0,extra));
    for(let i=0;i<p;i++){
      if(chosen.has(i)){const j=prelim.length;prelim.push({a:sh.shift(),b:sh.shift(),winner:null,slot:i});slots.push({ref:[0,j]});}
      else slots.push({id:sh.shift()});
    }
    if(extra)rounds.push(prelim);
    let feeds=slots;
    while(feeds.length>=2){
      const ri=rounds.length,ms=[];
      for(let i=0;i<feeds.length;i+=2){const [fa,fb]=feeds.slice(i,i+2);ms.push({a:fa.id??null,b:fb.id??null,fa,fb,winner:null});}
      rounds.push(ms);feeds=ms.map((_,i)=>({ref:[ri,i]}));
    }
    tmPropagate(rounds);return rounds;
  }
  const tmDualAllowed=n=>n>=3&&n!==5;
  function tmPoolMatches(ids){return [{a:ids[0],b:ids[1],winner:null},{a:ids[1],b:ids[2],winner:null},{a:ids[2],b:ids[0],winner:null}];}
  function tmGroups(ids,rng=Math.random){
    if(!tmDualAllowed(ids.length))throw Error('dual unavailable');
    const sh=tmShuffle(ids,rng),count=Math.ceil(ids.length/4),small=Math.floor(ids.length/count),big=ids.length%count;
    return Array.from({length:count},(_,i)=>{const members=sh.splice(0,small+(i<big?1:0));return {members,qualified:[],matches:members.length===4?[{a:members[0],b:members[1],winner:null},{a:members[2],b:members[3],winner:null},{a:null,b:null,winner:null},{a:null,b:null,winner:null},{a:null,b:null,winner:null}]:tmPoolMatches(members)};});
  }
  const tmLoser=m=>m.winner?(m.winner===m.a?m.b:m.a):null;
  function tmAdvanceGroup(g){
    const m=g.matches;
    if(g.members.length===4){
      if(m[0].winner&&m[1].winner){m[2].a=m[0].winner;m[2].b=m[1].winner;m[3].a=tmLoser(m[0]);m[3].b=tmLoser(m[1]);}
      if(m[2].winner&&m[3].winner){m[4].a=tmLoser(m[2]);m[4].b=m[3].winner;}
      if(m[4].winner)g.qualified=[m[2].winner,m[4].winner];
    }else if(m.every(x=>x.winner)){
      // A 3-person circular 1-1 tie plays another full pool; no lottery.
      const last=m.slice(-3),scores=g.members.map(id=>({id,n:last.filter(x=>x.winner===id).length})).sort((a,b)=>b.n-a.n);
      if(scores.every(x=>x.n===1))m.push(...tmPoolMatches(g.members));
      else g.qualified=scores.slice(0,2).map(x=>x.id);
    }
  }
  function tmPlan(ids,format,rng=Math.random){return format==='dual'?{groups:tmGroups(ids,rng),rounds:[]}:{groups:[],rounds:tmCompact(ids,rng)};}
  function tmPlanNext(t){
    for(let g=0;g<(t.groups||[]).length;g++){
      const ms=t.groups[g].matches;for(let i=0;i<ms.length;i++)if(ms[i].a&&ms[i].b&&!ms[i].winner)return {g,i,m:ms[i],key:'g'+g+':'+i};
      if(!t.groups[g].qualified.length)return null;
    }
    const n=tmNext(t.rounds);return n?{...n,key:'r'+n.r+':'+n.i}:null;
  }
  function tmPlanResolve(t,next,id,rng=Math.random){
    const n=tmPlanNext(t);if(!n||n.key!==next.key||![n.m.a,n.m.b].includes(id))return false;
    if(n.g!=null){n.m.winner=id;tmAdvanceGroup(t.groups[n.g]);if(t.groups.every(g=>g.qualified.length===2)&&!t.rounds.length)t.rounds=tmCompact(t.groups.flatMap(g=>g.qualified),rng);}
    else if(!tmResolve(t.rounds,n.r,n.i,id))return false;
    t.completed++;return true;
  }
  function tmTotal(t){return (t.groups||[]).length?t.groups.reduce((n,g)=>n+g.matches.length,0)+2*t.groups.length-1:t.players.length-1;}
  const tmChampion=t=>t?.rounds?.at(-1)?.[0]?.winner||null;
  const tmClone=o=>JSON.parse(JSON.stringify(o));
  function tmSnapshot(t){return tmClone({rounds:t.rounds,groups:t.groups||[],completed:t.completed,lastResult:t.lastResult||null});}
  function tmCheckpoint(t){const snap=tmSnapshot(t);t.journal=(t.journal||[]).concat([{at:Date.now(),...snap}]).slice(-100);}
  function tmRollback(t){
    const j=t.journal||[];if(j.length<2)return false;
    j.pop();const old=tmClone(j.at(-1));Object.assign(t,{rounds:old.rounds,groups:old.groups,completed:old.completed,lastResult:old.lastResult,active:null});
    // Restoring a bracket never restores the initial purchase's refund eligibility.
    t.refundLocked=true;return true;
  }
  function tmDrawFaces(t,next,ids,rng=Math.random){
    const key=next.key+':'+JSON.stringify([next.m.a,next.m.b]);t.faces=t.faces||{};
    if(!t.faces[key]){const face=ids.includes(t.character)?t.character:ids[Math.floor(rng()*ids.length)];t.faces[key]=[face,face];}
    return t.faces[key].slice();
  }

  /* UI / host adapters (pure bracket helpers above are separately tested). */
  const TM={screen:null,t:null,running:false,begun:false,match:null,auth:false,busy:false,ready:null,bridge:false,pin:false,notice:'',restore:null};
  const tmKey=cls=>'hoja-tournament-v1:'+cls,tmHistoryKey=cls=>'hoja-tournament-history-v1:'+cls;
  function tmRead(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
  function tmWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
  function tmClear(cls){try{localStorage.removeItem(tmKey(cls));}catch{}}
  function tmStore(){if(!TM.t)return false;TM.t.savedAt=Date.now();return tmWrite(tmKey(TM.t.classId),TM.t);}
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
    const t=tmRead(tmKey(COIN.classId));if(!t||![1,2].includes(t.version)||t.classId!==COIN.classId||!['normal','world'].includes(t.mode)||!tmGame(t.game)?.stages.some(s=>s.id===t.stage)||!Array.isArray(t.players)||!Array.isArray(t.rounds)||(!t.rounds.length&&!t.groups?.length))return null;
    if(t.version===1){t.version=2;t.format='single';t.groups=[];t.faces={};t.legacy=true;tmCheckpoint(t);}return t;
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
      body.append(tmEl('p','tm-notice',!EMBED?'호자보드 안에서 실행해 주세요.':!COIN.ready?'호자보드와 연결 중이에요.':!COIN.classId?'학급 명단을 연결해 주세요.':'학급은 연결됐지만 토너먼트 지원 버전이 아니에요. 호자보드 업데이트 후 다시 열어 주세요.'));
      if(EMBED)foot.append(tmButton('연결 확인',()=>tmFresh(()=>tmHome())));
    }else{
      const saved=tmSaved();
      if(saved){body.append(tmEl('h3','','진행 중인 토너먼트'),tmButton((saved.mode==='world'?'교실 월드컵':'일반 토너먼트')+' · '+tmGame(saved.game).name+' 이어하기',()=>tmResume(saved),true));body.append(tmEl('p','tm-note',(saved.format==='dual'?'듀얼':'싱글')+' · '+saved.completed+'/'+tmTotal(saved)+'경기 · '+(saved.savedAt?new Date(saved.savedAt).toLocaleString('ko-KR'):'저장된 대회')+(saved.active?' · 중단 경기 재시작':'')));}
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
    const game=tmEl('select','tm-select'),stage=tmEl('select','tm-select'),song=tmEl('select','tm-select'),face=tmEl('select','tm-select'),format=tmEl('select','tm-select');
    game.setAttribute('aria-label','게임');stage.setAttribute('aria-label','스테이지');song.setAttribute('aria-label','공통 곡');face.setAttribute('aria-label','공통 캐릭터');
    const option=(sel,id,label)=>{const o=tmEl('option','',label);o.value=id;sel.append(o);};
    for(const g of games)option(game,g.id,g.name);
    for(const s of RH_SONGS)option(song,s.id,s.name);
    option(format,'single','싱글 토너먼트 · 1패 탈락');option(format,'dual','듀얼 토너먼트 · 조별 예선');format.setAttribute('aria-label','경기 방식');
    option(face,'random','캐릭터 · 경기별 랜덤 (공통)');for(const ch of CHARACTERS)option(face,ch.id,'공통 캐릭터 · '+ch.name);face.value='random';
    const updateStage=()=>{stage.replaceChildren();const g=tmGame(game.value);for(const s of g.stages)option(stage,s.id,s.name);song.hidden=!g.rhythm;face.hidden=g.id==='jump';};
    game.onchange=updateStage;updateStage();
    settings.append(format,game,stage,song,face);body.append(settings);
    const roster=tmEl('div','tm-roster'),status=tmEl('p','tm-note');
    const draw=()=>{
      roster.replaceChildren();const students=mode==='world'?COIN.everyone:COIN.students;const n=mode==='world'?students.length:count;format.options[1].disabled=!tmDualAllowed(n);if(format.options[1].disabled)format.value='single';
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
      const wanted=mode==='world'?COIN.everyone.map(p=>p.id):[...selected],g=tmGame(game.value),st=stage.value,track=song.value,character=face.value,method=format.value;
      tmFresh(ok=>{
        if(!ok||COIN.classId!==cls||!TM.bridge||mode==='world'&&(!TM.auth||!TM.pin))return tmHome();
        const list=mode==='world'?COIN.everyone:COIN.students;
        if(mode==='world'&&(list.length!==wanted.length||list.some(p=>!wanted.includes(p.id)))||wanted.some(id=>!list.some(p=>p.id===id))){hofToast('명단이 변경됐어요. 다시 선택해 주세요.');return tmSetup(mode);}
        if(mode==='normal'&&(wanted.length!==count||!COIN.on||COIN.refunds.size))return tmHome();
        const players=wanted.map(id=>{const p=list.find(s=>s.id===id);return {id:p.id,name:p.name,number:p.number??null};});
        const t={version:2,classId:cls,mode,format:method,game:g.id,stage:st,song:g.rhythm?track:null,character,players,...tmPlan(wanted,method),charge:null,firstStart:null,firstEnd:null,refundLocked:false,completed:0,created:Date.now(),faces:{},journal:[],active:null};
        tmCheckpoint(t);
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
      const resume=()=>{const t=tmSaved();if(!t)return tmHome();const ids=new Set(COIN.everyone.map(p=>p.id));if(t.players.some(p=>!ids.has(p.id)))TM.notice='참가 명단이 변경되어 경기를 시작할 수 없어요. 대진표를 확인하고 종료해 주세요.';TM.t=t;if(t.active)TM.notice='직전 경기가 중단됐어요. 같은 참가자·캐릭터로 다시 시작합니다.';tmBoard();};
      if(saved.mode==='world')tmAuth(resume);else resume();
    });
  }
  function tmName(id){return id?TM.t?.players.find(p=>p.id===id)?.name||'학생':'미정';}
  function tmRoundName(rounds,r){const t=TM.t;if(r===0&&rounds[0]?.some(m=>m.slot!=null))return tmSize(t.format==='dual'?2*t.groups.length:t.players.length)+'강 · 예선';const n=rounds[r].length*2;return n===2?'결승':n===4?'준결승':n+'강';}
  function tmLabel(t,n){return n.g!=null?String.fromCharCode(65+n.g)+'조 · '+(t.groups[n.g].members.length===4?['1경기','2경기','승자전','패자전','최종 진출전'][n.i]:(n.i>=3?'동률 재경기 ':'순위전 ')+(n.i%3+1)):tmRoundName(t.rounds,n.r)+' · '+(n.i+1)+'경기';}
  function tmBoard(){
    const t=TM.t;if(!t)return tmHome();
    if(t.mode==='world'&&!TM.auth)return tmHome();
    const next=tmPlanNext(t),winner=tmChampion(t);
    const {body,foot}=tmLayout((t.mode==='world'?'교실 월드컵':'일반 토너먼트')+' · '+tmGame(t.game).name,t.players.length+'명 · '+t.completed+'/'+tmTotal(t)+'경기 완료 · '+(t.format==='dual'?'듀얼':'싱글'));
    if(TM.notice){body.append(tmEl('p','tm-notice',TM.notice));TM.notice='';}
    if(winner){
      body.append(tmEl('h3','tm-champion','🏆 '+tmName(winner)+' 우승!'));
      foot.append(tmButton('우승 기록 저장 · 완료',()=>{if(tmSaveWinner()){tmClear(t.classId);tmHome();}},true));
    }else if(next){
      const now=tmEl('div','tm-now');now.append(tmEl('small','',tmLabel(t,next)),tmEl('strong','',tmName(next.m.a)+'  VS  '+tmName(next.m.b)));body.append(now);
      foot.append(tmButton('경기 시작',()=>tmLaunch(next),true));
    }
    if(t.lastResult)body.append(tmEl('p','tm-last','직전 경기 · '+t.lastResult));
    if(t.savedAt)body.append(tmEl('small','tm-saved','자동 저장 · '+new Date(t.savedAt).toLocaleTimeString('ko-KR')));
    const cardFor=(m,key,label,group=false)=>{
      const card=tmEl('div','tm-match'+(next?.key===key?' tm-current':''));
      if(label)card.append(tmEl('small','tm-match-label',label));
      for(const [side,id] of [m.a,m.b].entries()){
        const state=id&&m.winner===id?'tm-winner':id&&m.winner?'tm-loser':'';
        card.append(tmEl('div',state,!id&&m.bye&&side===1?'부전승':tmName(id)));
      }
      return card;
    };
    if(t.groups?.length){
      const groups=tmEl('div','tm-groups');
      t.groups.forEach((g,i)=>{
        const panel=tmEl('section','tm-group');panel.append(tmEl('h3','',String.fromCharCode(65+i)+'조'));
        const people=tmEl('div','tm-group-people');
        for(const id of g.members){
          const losses=g.matches.filter(m=>m.winner&&[m.a,m.b].includes(id)&&m.winner!==id).length;
          const cls=g.qualified.includes(id)?'tm-winner':g.qualified.length||g.members.length===4&&losses>=2?'tm-loser':losses?'tm-alive':'';
          people.append(tmEl('span',cls,tmName(id)+(g.qualified.includes(id)?' · 진출':'')));
        }
        panel.append(people);
        g.matches.forEach((m,j)=>panel.append(cardFor(m,'g'+i+':'+j,g.members.length===4?['1경기','2경기','승자전','패자전','최종전'][j]:'순위전 '+(j+1),true)));
        groups.append(panel);
      });
      if(!t.rounds.length)body.append(groups);
      else {const d=tmEl('details','tm-group-history');d.append(tmEl('summary','','조별 예선 결과 보기'),groups);body.append(d);}
    }
    if(t.rounds.length){
      if(t.groups?.length)body.append(tmEl('h3','','본선 토너먼트'));
      const scroll=tmEl('div','tm-bracket'),tree=tmEl('div','tm-tree');
      const rs=t.rounds,pre=rs[0].some(m=>m.slot!=null),p=pre?rs[1].length*2:rs[0].length*2;
      const minWidth=Math.max(320,p*64),height=rs.length*86+26;
      tree.style.minWidth=minWidth+'px';tree.style.height=height+'px';scroll.append(tree);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1000 '+height);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('tm-lines');tree.append(svg);
      const pos=(r,i)=>{
        const y=(rs.length-1-r)*86+18;
        if(pre&&r===0)return {x:(rs[0][i].slot+.5)/p*1000,y,w:1000/p};
        const len=rs[r].length;return {x:(i+.5)/len*1000,y,w:1000/len};
      };
      rs.forEach((row,r)=>row.forEach((m,i)=>{
        const q=pos(r,i);let feeds=m.fa&&m.fb?[m.fa,m.fb].filter(f=>f.ref).map(f=>f.ref):r>0?[[r-1,2*i],[r-1,2*i+1]]:[];
        for(const [fr,fi] of feeds){const v=pos(fr,fi),line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('d','M'+v.x+' '+v.y+' V'+(q.y+72)+' H'+q.x+' V'+(q.y+62));svg.append(line);}
        const card=cardFor(m,'r'+r+':'+i,tmRoundName(rs,r)+(row.length>1?' · '+(i+1):''));
        card.style.left=(q.x/10)+'%';card.style.top=q.y+'px';card.style.width='min(260px, '+(q.w/10-0.5)+'%)';tree.append(card);
      }));
      body.append(scroll);
    }
    if((t.journal||[]).length>1&&TM.pin)foot.append(tmButton('이전 경기로 복구 🔒',()=>tmAuth(()=>{if(!confirm('직전 경기 결과를 취소하고 이전 상태로 돌아갈까요? 코인은 변경되지 않아요.'))return;const before=tmClone(t);if(tmRollback(t)&&tmStore()){TM.notice='이전 경기 상태로 복구했어요.';tmBoard();}else{TM.t=before;hofToast('복구 저장에 실패했어요.');}})));
    if(!winner){
      if(tmRefundable(t))foot.append(tmButton('환불하고 토너먼트 취소',()=>tmCancel(true)));
      foot.append(tmButton('저장하고 나가기',()=>{if(tmStore())tmHome();else hofToast('대진표 저장을 확인해 주세요.');}));
      if(!tmRefundable(t))foot.append(tmButton('토너먼트 종료',()=>tmCancel(false)));
    }
  }
  function tmSaveWinner(){
    const t=TM.t,w=tmChampion(t);if(!w)return false;
    const hist=tmRead(tmHistoryKey(t.classId),[]);if(!Array.isArray(hist))return false;
    const old=hist.findIndex(x=>x.created===t.created);if(old>=0)hist.splice(old,1);hist.unshift({mode:t.mode,game:tmGame(t.game).name,stage:tmGame(t.game).stages.find(s=>s.id===t.stage)?.name,winner:tmName(w),count:t.players.length,created:t.created,ended:Date.now()});
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
      const live=tmPlanNext(t);if(!live||live.key!==next.key)return tmBoard();
      const faces=tmDrawFaces(t,live,CHARACTERS.map(ch=>ch.id));t.active={key:live.key,faces,at:Date.now()};if(!tmStore()){hofToast('경기 시작 상태를 저장하지 못했어요.');return tmBoard();}
      TM.match=live;TM.running=true;TM.begun=false;TM.restore=null;streak={side:-1,id:null,count:0};round=null;tryReset();
      const previous={game:currentGame,ai:aiLevel,choices:[...choices],players:[...HOF.players],names:[...HOF.playerNames]};currentGame=t.game;aiLevel=0;
      if(t.game!=='jump'){const stages=stageSet();const oldStage=stages.sel;TM.restore=()=>{stages.set(oldStage);currentGame=previous.game;aiLevel=previous.ai;choices=previous.choices;HOF.players=previous.players;HOF.playerNames=previous.names;};stages.set(t.stage);}
      else TM.restore=()=>{currentGame=previous.game;aiLevel=previous.ai;choices=previous.choices;HOF.players=previous.players;HOF.playerNames=previous.names;};
      HOF.players=Array(6).fill(null);HOF.playerNames=[tmName(live.m.a),tmName(live.m.b),null,null,null,null];
      choices=faces;
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
    const t=TM.t,next=TM.match,{m}=next;tournamentFinishClock();const before=tmClone(t);
    if(winner===0||winner===1){
      const id=winner===0?m.a:m.b;if(tmPlanResolve(t,next,id)){t.lastResult=tmName(id)+' 승리! · '+tmName(id===m.a?m.b:m.a)+' 패배';TM.notice=t.lastResult;t.active=null;tmCheckpoint(t);}
    }else{TM.notice='무승부! 같은 경기에서 다시 겨뤄요.';t.lastResult=TM.notice;}
    tmStopMatch();if(!tmStore()){TM.t=before;TM.notice='결과 저장 실패 · 해당 경기를 다시 진행해 주세요.';tmBoard();return true;}
    if(tmChampion(t)){victoryJingle();cheer(1.2);}else sfx('goal',.8);
    tmBoard();return true;
  }
  function tournamentSong(){return TM.running&&TM.t?.song?RH_SONGS.find(s=>s.id===TM.t.song):null;}
  function tournamentInit(){
    const style=tmEl('style');style.textContent=
      '#tmScreen{position:fixed;inset:0;z-index:80;background:#f4e9d4;color:#493523;font-family:inherit;display:flex;flex-direction:column;padding:clamp(12px,2vw,32px);gap:12px;overflow:hidden}#tmScreen[hidden],#tmScreen [hidden]{display:none!important}#tmScreen h2,#tmScreen h3,#tmScreen p{margin:0}.tm-head{text-align:center}.tm-head h2{font-size:clamp(24px,3vw,50px)}.tm-head p,.tm-note{font-size:clamp(14px,1.35vw,23px)}.tm-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;align-items:stretch}.tm-foot,.tm-settings{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center}.tm-foot{flex:none}.tm-roster{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px}.tm-person,.tm-match,.tm-now,.tm-notice{padding:10px;border:1px solid #baa98c;background:#fff9ec;border-radius:10px}.tm-chosen{outline:3px solid #278571;background:#d0e9dd!important}.tm-select{font:inherit;font-size:clamp(16px,1.6vw,26px);padding:10px;border:1px solid #baa98c;border-radius:10px;background:#fff9ec;color:#493523;max-width:95%}.tm-now{text-align:center;display:grid;gap:4px;background:#fff1ce}.tm-now strong,.tm-champion{font-size:clamp(24px,3vw,46px);text-align:center}.tm-bracket{display:flex;gap:12px;overflow:auto;align-items:stretch;min-height:0}.tm-round{flex:1;min-width:140px;display:flex;flex-direction:column;gap:6px}.tm-round h3{text-align:center}.tm-matches{display:flex;flex:1;flex-direction:column;justify-content:space-around;gap:6px}.tm-match{position:relative;padding:6px;display:grid;gap:3px}.tm-match div{padding:4px;overflow-wrap:anywhere}.tm-winner{background:#d1e9d8;font-weight:bold;border-radius:4px}.tm-round:not(:last-child) .tm-match::after{content:"";position:absolute;right:-13px;top:50%;width:12px;border-top:1px solid #baa98c}.tm-current{border:3px solid #c58b25}.tm-notice{text-align:center;font-weight:800}.tm-note{text-align:center}';
    style.textContent+=' .tm-bracket{display:block;flex:none;overflow:auto;min-height:0;padding-bottom:5px}.tm-tree{position:relative;width:100%;}.tm-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;fill:none;stroke:#a99472;stroke-width:1.6;vector-effect:non-scaling-stroke}.tm-tree .tm-match{position:absolute;transform:translateX(-50%);height:65px;padding:3px;display:flex;flex-direction:column;justify-content:center;gap:1px;text-align:center;box-sizing:border-box;font-size:clamp(11px,1.1vw,18px);overflow:hidden}.tm-match-label{font-size:10px;line-height:1.05;white-space:nowrap;color:#806c51;overflow:hidden;text-overflow:ellipsis}.tm-tree .tm-match div{padding:1px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tm-loser{color:#777;background:#dedbd5;opacity:.72;border-radius:4px}.tm-alive{background:#ffedb2;border-radius:4px}.tm-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.tm-group{padding:8px;background:#fdf6e8;border:1px solid #baa98c;border-radius:10px;display:grid;gap:5px}.tm-group-people{display:flex;flex-wrap:wrap;gap:4px}.tm-group-people span{padding:4px 6px}.tm-group .tm-match{display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:4px}.tm-group .tm-match-label{grid-column:1/-1}.tm-last,.tm-saved{text-align:center}.tm-saved{color:#77644f}.tm-current{border:3px solid #c58b25!important}.tm-head h2{font-size:clamp(20px,2.3vw,38px)}.tm-now strong{font-size:clamp(20px,2vw,35px)}.tm-body{gap:7px}';
    document.head.append(style);TM.screen=tmEl('section','');TM.screen.id='tmScreen';TM.screen.hidden=true;document.body.append(TM.screen);
    const b=tmButton('🏆 토너먼트',tmOpen,true);b.id='openTournament';$('openHall').before(b);
  }
