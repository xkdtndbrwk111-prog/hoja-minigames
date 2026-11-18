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
  function tmSeeded(seed){let x=(seed|0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
  function tmPlanResolve(t,next,id,rng=tmSeeded(t.drawSeed??t.created??1)){
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

  // One atomic, class-scoped collection. Legacy single saves are imported
  // without changing their brackets, charges or checkpoints.
  function tmCollection(raw,cls){
    if(raw==null)return [];
    const entries=raw.schema===3&&Array.isArray(raw.tournaments)?raw.tournaments:[raw];
    if(entries.some(t=>!t||t.classId!==cls||![1,2].includes(t.version)))throw Error('invalid tournament storage');
    return entries.map(t=>({...t,id:t.id||'legacy-'+String(t.created)+'-'+String(t.charge||t.game)}));
  }
  function tmUpsert(items,t){const i=items.findIndex(x=>x.id===t.id);if(i<0)return [...items,t];return items.map((x,j)=>j===i?t:x);}
  function tmRemove(items,id){return items.filter(x=>x.id!==id);}
  function tmWorldEntrants(roster,excluded){return roster.filter(p=>!excluded.has(p.id)).map(p=>p.id);}
  function tmWorldRosterSame(roster,original){return roster.length===original.length&&new Set(roster.map(p=>p.id)).size===original.length&&roster.every(p=>original.includes(p.id));}
  /* UI / host adapters (pure bracket helpers above are separately tested). */
  const TM={screen:null,t:null,running:false,begun:false,match:null,auth:false,busy:false,ready:null,bridge:false,pin:false,notice:'',restore:null,intro:null};
  const tmKey=cls=>'hoja-tournament-v1:'+cls,tmHistoryKey=cls=>'hoja-tournament-history-v1:'+cls;
  function tmRead(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
  function tmWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
  function tmLoadAll(cls){return tmCollection(JSON.parse(localStorage.getItem(tmKey(cls))||'null'),cls);}
  function tmWriteAll(cls,items){return tmWrite(tmKey(cls),{schema:3,tournaments:items});}
  function tmClear(t){try{return tmWriteAll(t.classId,tmRemove(tmLoadAll(t.classId),t.id));}catch{return false;}}
  function tmStore(){if(!TM.t)return false;const t=TM.t;t.savedAt=Date.now();try{return tmWriteAll(t.classId,tmUpsert(tmLoadAll(t.classId),t));}catch{return false;}}
  function tmEl(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
  function tmButton(label,fn,primary=false){const b=tmEl('button','control big '+(primary?'primary':''),label);b.type='button';b.onclick=()=>{if(!TM.busy){sfx('menu',.65);fn();}};return b;}
  function tmLayout(title,detail=''){
    const s=TM.screen;s.classList.remove('tm-setup-screen');TM.view=title;s.hidden=false;$('menuScreen').hidden=true;
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
  function tmSavedList(){
    let items;try{items=tmLoadAll(COIN.classId);}catch{throw Error('저장된 대회 데이터를 확인해 주세요. 기존 데이터는 변경하지 않았어요.');}
    const valid=[];
    for(const t of items){
      if(t.cancelled){if(t.cancelled.refund&&t.charge)queueRefund(t.charge,t.classId,'중단된 토너먼트 취소 복구');tmClear(t);continue;}
      if(!['normal','world'].includes(t.mode)||!tmGame(t.game)?.stages.some(s=>s.id===t.stage)||!Array.isArray(t.players)||!Array.isArray(t.rounds)||(!t.rounds.length&&!t.groups?.length))continue;
      if(t.version===1){t.version=2;t.format='single';t.groups=[];t.faces={};t.legacy=true;tmCheckpoint(t);}
      valid.push(t);
    }
    return valid.sort((a,b)=>(b.savedAt||b.created)-(a.savedAt||a.created));
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
    tmIntroClear();
    TM.t=null;TM.auth=false;TM.match=null;TM.running=false;
    const {body,foot}=tmLayout('토너먼트','참가자를 추첨하고 한 경기씩 진행해요.');
    body.classList.add('tm-home-body');foot.classList.add('tm-home-foot');
    const nav=tmEl('div','tm-home-nav');
    const back=tmButton('← 게임 모음집 돌아가기',()=>{TM.screen.hidden=true;$('menuScreen').hidden=false;});
    nav.append(back);
    if(TM.notice){body.append(tmEl('p','tm-notice',TM.notice));TM.notice='';}
    if(!EMBED||!COIN.classId||!TM.bridge){
      body.append(tmEl('p','tm-notice',!EMBED?'호자보드 안에서 실행해 주세요.':!COIN.ready?'호자보드와 연결 중이에요.':!COIN.classId?'학급 명단을 연결해 주세요.':'학급은 연결됐지만 토너먼트 지원 버전이 아니에요. 호자보드 업데이트 후 다시 열어 주세요.'));
      if(EMBED)foot.append(tmButton('연결 확인',()=>tmFresh(()=>tmHome())));
    }else{
      let saved;
      try{saved=tmSavedList();}catch(e){body.append(tmEl('p','tm-notice',e.message));foot.append(nav);return;}
      const actions=tmEl('div','tm-new-actions');
      const normal=tmButton('일반 토너먼트 대회 시작',()=>tmSetup('normal'));normal.classList.add('tm-start-normal');normal.disabled=!COIN.on||COIN.refunds.size>0;
      const world=tmButton('교실 월드컵 시작 🔒',()=>tmFresh(ok=>{if(ok)tmAuth(()=>tmSetup('world'));}));world.classList.add('tm-start-world');world.disabled=!TM.pin;
      actions.append(normal,world);
      if(!COIN.on)body.append(tmEl('p','tm-note','일반 토너먼트는 코인 사용이 켜져 있어야 해요.'));
      if(!TM.pin)body.append(tmEl('p','tm-note','교실 월드컵은 공통 교사 인증번호 설정이 필요해요.'));
      if(saved.length){
        const section=tmEl('section','tm-resume-section');section.append(tmEl('h3','tm-saved-heading','진행 중인 토너먼트 · '+saved.length+'개'));
        const list=tmEl('div','tm-saved-list');
        for(const t of saved){
          const card=tmEl('article','tm-save-card'),info=tmEl('div','tm-save-info');
          info.append(tmEl('strong','',(t.mode==='world'?'교실 월드컵':'일반 토너먼트')+' · '+tmGame(t.game).name),
            tmEl('p','',(t.format==='dual'?'듀얼':'싱글')+' · '+t.players.length+'명 · '+t.completed+'/'+tmTotal(t)+'경기'+(t.active?' · 중단 경기 재시작':'')),
            tmEl('small','',(t.savedAt?new Date(t.savedAt).toLocaleString('ko-KR'):'저장된 대회')));
          const resume=tmButton('이어하기'+(t.mode==='world'?' 🔒':''),()=>tmResume(t),true);resume.disabled=t.mode==='world'&&!TM.pin;
          card.append(info,resume);list.append(card);
        }
        section.append(list);body.append(section);
      }
      foot.append(actions);
      nav.append(tmButton('토너먼트 우승 기록',()=>tmHistory('all')));
    }
    foot.append(nav);
  }
  function tmOpen(){tmHome();if(EMBED)tmFresh(()=>tmHome());}
  function tmSetup(mode){
    if(mode==='world'&&!TM.auth)return;
    const cls=COIN.classId,games=tmCatalog(),selected=new Set(),excluded=new Set(),original=COIN.everyone.map(p=>p.id);
    let count=4;
    const {body,foot}=tmLayout(mode==='world'?'교실 월드컵':'일반 토너먼트',(COIN.className||'우리 반')+(mode==='normal'?' · 싱글 토너먼트 (1패 탈락)':''));
    TM.screen.classList.add('tm-setup-screen');body.classList.add('tm-setup-body');foot.classList.add('tm-setup-foot');
    const settings=tmEl('div','tm-settings');
    const game=tmEl('select','tm-select'),stage=tmEl('select','tm-select'),song=tmEl('select','tm-select'),face=tmEl('select','tm-select'),format=tmEl('select','tm-select');
    game.setAttribute('aria-label','게임');stage.setAttribute('aria-label','스테이지');song.setAttribute('aria-label','공통 곡');face.setAttribute('aria-label','공통 캐릭터');
    const option=(sel,id,label)=>{const o=tmEl('option','',label);o.value=id;sel.append(o);};
    for(const g of games)option(game,g.id,g.name);
    for(const s of RH_SONGS)option(song,s.id,s.name);
    option(format,'single','싱글 토너먼트 · 1패 탈락');if(mode==='world')option(format,'dual','듀얼 토너먼트 · 조별 예선');format.setAttribute('aria-label','경기 방식');
    option(face,'random','캐릭터 · 경기별 랜덤 (공통)');for(const ch of CHARACTERS)option(face,ch.id,'공통 캐릭터 · '+ch.name);face.value='random';
    const updateStage=()=>{stage.replaceChildren();const g=tmGame(game.value);for(const s of g.stages)option(stage,s.id,s.name);song.hidden=!g.rhythm;face.hidden=g.id==='jump';};
    game.onchange=updateStage;updateStage();
    if(mode==='world')settings.append(format);settings.append(game,stage,song,face);body.append(settings);
    const roster=tmEl('div','tm-roster'),status=tmEl('p','tm-note');
    const draw=()=>{
      roster.replaceChildren();const students=mode==='world'?COIN.everyone:COIN.students;const n=mode==='world'?tmWorldEntrants(students,excluded).length:count;if(mode==='world'){format.options[1].disabled=!tmDualAllowed(n);if(format.options[1].disabled){format.value='single';format.options[1].textContent='듀얼 · 3명 또는 4명 또는 6명 이상 필요';}else format.options[1].textContent='듀얼 토너먼트 · 조별 예선';}
      if(mode==='world'){
        status.textContent=(n===students.length?students.length+'명 전원 참가':n+'/'+students.length+'명 참가 · '+(students.length-n)+'명 제외')+' · 최소 2명';
        for(const st of students){
          const included=!excluded.has(st.id),b=tmButton('',()=>{if(excluded.has(st.id))excluded.delete(st.id);else excluded.add(st.id);draw();});
          b.classList.add('tm-student','tm-world-student',included?'tm-included':'tm-excluded');
          b.append(tmEl('strong','tm-student-name',st.name),tmEl('small','tm-world-state',included?'✓ 참가':'제외'));
          b.setAttribute('aria-pressed',String(included));b.setAttribute('aria-label',st.name+' · '+(included?'참가 중, 누르면 제외':'제외 중, 누르면 참가'));roster.append(b);
        }
        reset.disabled=excluded.size===0;
      }
      else{status.textContent=selected.size+'/'+count+'명 선택 · 모두 '+coinText(coinPrice(count))+'코인씩';
        for(const st of students){const b=tmButton('',()=>{if(selected.has(st.id))selected.delete(st.id);else if(selected.size<count)selected.add(st.id);draw();});b.classList.add('tm-student');b.append(tmEl('strong','tm-student-name',st.name),tmEl('small','tm-student-balance','코인 '+coinText(st.balance)));b.setAttribute('aria-pressed',String(selected.has(st.id)));b.classList.toggle('tm-chosen',selected.has(st.id));b.disabled=!selected.has(st.id)&&(selected.size>=count||st.balance-coinPrice(count)<COIN.floor);roster.append(b);}
      }
      start.disabled=mode==='world'?n<2||n>40:selected.size!==count;
    };
    if(mode==='normal'){
      const row=tmEl('div','tm-settings tm-count-settings');for(const n of [4,8]){const b=tmButton(n+'인전',()=>{count=n;selected.clear();for(const item of row.children)item.classList.toggle('tm-chosen',item===b);draw();});b.classList.toggle('tm-chosen',n===count);row.append(b);}body.append(row);
    }
    const reset=tmButton('전원 참가로 되돌리기',()=>{excluded.clear();draw();});reset.classList.add('tm-world-reset');
    if(mode==='world'){const bar=tmEl('div','tm-world-selection-bar');bar.append(status,reset);body.append(tmEl('p','tm-note','학생을 누르면 제외하거나 다시 참가시킬 수 있어요.'),bar,roster);}
    else body.append(status,roster);
    const start=tmButton('대진표 추첨 · 시작',()=>{
      const wanted=mode==='world'?tmWorldEntrants(COIN.everyone,excluded):[...selected],g=tmGame(game.value),st=stage.value,track=song.value,character=face.value,method=mode==='normal'?'single':format.value;
      tmFresh(ok=>{
        if(!ok||COIN.classId!==cls||!TM.bridge||mode==='world'&&(!TM.auth||!TM.pin))return tmHome();
        const list=mode==='world'?COIN.everyone:COIN.students;
        if(mode==='world'&&!tmWorldRosterSame(list,original)||wanted.some(id=>!list.some(p=>p.id===id))){hofToast('명단이 변경됐어요. 다시 선택해 주세요.');return tmSetup(mode);}
        if(mode==='world'&&(wanted.length<2||wanted.length>40||!['single','dual'].includes(method)||method==='dual'&&!tmDualAllowed(wanted.length))){hofToast('참가 인원과 경기 방식을 다시 확인해 주세요.');return;}
        if(mode==='normal'&&(wanted.length!==count||!COIN.on||COIN.refunds.size))return tmHome();
        const players=wanted.map(id=>{const p=list.find(s=>s.id===id);return {id:p.id,name:p.name,number:p.number??null};});
        const t={version:2,id:crypto.randomUUID(),classId:cls,mode,format:method,game:g.id,stage:st,song:g.rhythm?track:null,character,players,...tmPlan(wanted,method),charge:null,firstStart:null,firstEnd:null,refundLocked:false,completed:0,created:Date.now(),drawSeed:Math.floor(Math.random()*4294967296),faces:{},journal:[],active:null};
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
      const resume=()=>{let t;try{t=tmSavedList().find(x=>x.id===saved.id);}catch(e){hofToast(e.message);return tmHome();}if(!t)return tmHome();const ids=new Set(COIN.everyone.map(p=>p.id));if(t.players.some(p=>!ids.has(p.id)))TM.notice='참가 명단이 변경되어 경기를 시작할 수 없어요. 대진표를 확인하고 종료해 주세요.';TM.t=t;if(t.active)TM.notice='직전 경기가 중단됐어요. 같은 참가자·캐릭터로 다시 시작합니다.';tmBoard();};
      if(saved.mode==='world')tmAuth(resume);else resume();
    });
  }
  function tmName(id){return id?TM.t?.players.find(p=>p.id===id)?.name||'학생':'미정';}
  function tmRoundName(rounds,r){const t=TM.t;if(r===0&&rounds[0]?.some(m=>m.slot!=null))return tmSize(t.format==='dual'?2*t.groups.length:t.players.length)+'강 · 예선';const n=rounds[r].length*2;return n===2?'결승':n===4?'준결승':n+'강';}
  function tmLabel(t,n){return n.g!=null?String.fromCharCode(65+n.g)+'조 · '+(t.groups[n.g].members.length===4?['1경기','2경기','승자전','패자전','최종 진출전'][n.i]:(n.i>=3?'동률 재경기 ':'순위전 ')+(n.i%3+1)):tmRoundName(t.rounds,n.r)+' · '+(n.i+1)+'경기';}
  function tmBoard(){
    tmIntroClear();
    const t=TM.t;if(!t)return tmHome();
    if(t.mode==='world'&&!TM.auth)return tmHome();
    const next=tmPlanNext(t),winner=tmChampion(t);
    const {body,foot}=tmLayout((t.mode==='world'?'교실 월드컵':'일반 토너먼트')+' · '+tmGame(t.game).name,t.players.length+'명 · '+t.completed+'/'+tmTotal(t)+'경기 완료 · '+(t.format==='dual'?'듀얼':'싱글'));
    if(TM.notice){body.append(tmEl('p','tm-notice',TM.notice));TM.notice='';}
    if(winner){
      body.append(tmEl('h3','tm-champion','🏆 '+tmName(winner)+' 우승!'));
      foot.append(tmButton('우승 기록 저장 · 완료',()=>{if(tmSaveWinner()&&tmClear(t)){tmHome();}else hofToast('우승 기록 또는 완료 상태 저장에 실패했어요. 다시 시도해 주세요.');},true));
    }else if(next){
      const now=tmEl('div','tm-now');now.append(tmEl('small','',tmLabel(t,next)),tmEl('strong','',tmName(next.m.a)+'  VS  '+tmName(next.m.b)));body.append(now);
      foot.append(tmButton('경기 시작',()=>tmLaunch(next),true));
    }
    if(t.lastResult&&!body.querySelector('.tm-notice'))body.append(tmEl('p','tm-last','직전 경기 · '+t.lastResult));
    if(t.savedAt)body.append(tmEl('small','tm-saved','자동 저장 · '+new Date(t.savedAt).toLocaleTimeString('ko-KR')));
    const cardFor=(m,key,label)=>tmMatchCard(m,key,label,next);
    if(t.groups?.length){
      const groups=tmEl('div','tm-groups');
      t.groups.forEach((g,i)=>groups.append(tmGroupPanel(g,i,next)));
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
    const old=hist.findIndex(x=>x.id===t.id||(!x.id&&x.created===t.created));if(old>=0)hist.splice(old,1);hist.unshift({id:t.id,mode:t.mode,game:tmGame(t.game).name,stage:tmGame(t.game).stages.find(s=>s.id===t.stage)?.name,winner:tmName(w),count:t.players.length,created:t.created,ended:Date.now()});
    return tmWrite(tmHistoryKey(t.classId),hist.slice(0,100));
  }
  function tmHistory(filter='all'){
    TM.auth=false;
    const {body,foot}=tmLayout('토너먼트 우승 기록','우리 반의 우승 기록 · 누구나 볼 수 있어요.');
    const tabs=tmEl('div','tm-history-tabs');
    for(const [key,label] of [['all','전체'],['normal','일반 토너먼트'],['world','교실 월드컵']]){
      const b=tmButton(label,()=>tmHistory(key),filter===key);b.setAttribute('aria-pressed',String(filter===key));tabs.append(b);
    }
    body.append(tabs);
    const hist=tmRead(tmHistoryKey(COIN.classId),[]),items=(Array.isArray(hist)?hist:[]).filter(h=>filter==='all'||h.mode===filter);
    if(!items.length)body.append(tmEl('p','tm-note','아직 우승 기록이 없어요.'));
    for(const h of items){const row=tmEl('div','tm-history-row');row.append(tmEl('span','',(h.mode==='world'?'교실 월드컵':'일반')+' · '+h.game+' · '+h.count+'명'),tmEl('strong','','🏆 '+h.winner),tmEl('small','',new Date(h.ended).toLocaleDateString('ko-KR')));body.append(row);}
    foot.append(tmButton('← 토너먼트',tmHome));
  }
  function tmCancel(refund){
    const t=TM.t;if(!t)return;
    if(refund&&!tmRefundable(t))return tmBoard();
    if(!confirm(refund?'토너먼트를 취소하고 참가비를 돌려줄까요?':'토너먼트를 종료할까요? 참가비는 반환되지 않아요.'))return;
    t.cancelled={refund:Boolean(refund),at:Date.now()};if(!tmStore()){delete t.cancelled;hofToast('취소 상태를 저장하지 못했어요. 다시 시도해 주세요.');return;}
    if(refund)queueRefund(t.charge,t.classId,'토너먼트를 취소해서');
    if(tmClear(t))tmHome();else{hofToast('종료 상태가 저장됐어요. 목록으로 돌아가 다시 확인해 주세요.');tmHome();}
  }
  function tmGroupLabel(g,j){return g.members.length===4?['1경기','2경기','승자전','패자전','최종전'][j]:(j>=3?'동률 재경기 ':'순위전 ')+(j%3+1);}
  function tmMatchCard(m,key,label,next,group=false){
    const current=next?.key===key,card=tmEl('div','tm-match'+(current?' tm-current':'')+(m.winner?' tm-played':''));
    if(label){const title=tmEl('small','tm-match-label',label);if(group)title.append(tmEl('span','tm-match-status',current?'현재 경기':m.winner?'완료':m.a&&m.b?'대기':'예정'));card.append(title);}
    const line=(id,side)=>{const state=id&&m.winner===id?'tm-winner':id&&m.winner?'tm-loser':!id?'tm-unknown':'';return tmEl('div','tm-seat '+state,!id&&m.bye&&side===1?'부전승':tmName(id));};
    if(group){const pair=tmEl('div','tm-pair');pair.append(line(m.a,0),tmEl('span','tm-vs-mini','VS'),line(m.b,1));card.append(pair);}
    else card.append(line(m.a,0),line(m.b,1));
    return card;
  }
  function tmGroupPanel(g,i,next,focus=false){
    const active=next?.g===i,done=g.matches.filter(m=>m.winner).length;
    const panel=tmEl('section','tm-group'+(active?' tm-group-active':'')+(g.qualified.length?' tm-group-done':''));
    const head=tmEl('header','tm-group-head');head.append(tmEl('h3','',String.fromCharCode(65+i)+'조'),tmEl('span','tm-group-progress',done+'/'+g.matches.length+'경기'+(g.qualified.length?' · 진출 확정':active?' · 진행 중':'')));panel.append(head);
    const people=tmEl('div','tm-group-people');
    for(const id of g.members){
      const wins=g.matches.filter(m=>m.winner===id).length,losses=g.matches.filter(m=>m.winner&&[m.a,m.b].includes(id)&&m.winner!==id).length;
      const cls=g.qualified.includes(id)?'tm-winner':g.qualified.length||g.members.length===4&&losses>=2?'tm-loser':losses?'tm-alive':'';
      const chip=tmEl('div','tm-member '+cls);chip.append(tmEl('strong','',tmName(id)),tmEl('small','',g.qualified.includes(id)?'진출':cls==='tm-loser'?'탈락':wins+'승 '+losses+'패'));people.append(chip);
    }
    panel.append(people);
    const matches=tmEl('div','tm-group-matches');
    // On the overview retain the two newest pool blocks at most; an unusually
    // long sequence of circular ties must not bury the current match.
    const start=g.members.length===3?Math.max(0,g.matches.length-6):0;
    if(start)matches.append(tmEl('small','tm-older','이전 순위전 '+start+'경기 완료'));
    for(let j=start;j<g.matches.length;j++)matches.append(tmMatchCard(g.matches[j],'g'+i+':'+j,tmGroupLabel(g,j),next,true));
    panel.append(matches);return panel;
  }
  function tmIntroClear(){const x=TM.intro;if(x){clearTimeout(x.timer);TM.intro=null;}}
  function tmIntroValid(x){return TM.intro===x&&TM.t===x.t&&!TM.screen.hidden&&COIN.classId===x.t.classId&&TM.bridge&&(x.t.mode!=='world'||TM.auth&&TM.pin)&&!TM.running;}
  function tmIntroCancel(x){
    if(TM.intro!==x)return;tmIntroClear();
    // The draw is preserved for a retry; only the unplayed active marker is cleared.
    x.t.active=null;tmStore();TM.notice='경기 시작을 취소했어요.';tmBoard();
  }
  function tmIntroBegin(t,live,faces){
    tmIntroClear();const x={t,live,faces,timer:null,phase:'group'};TM.intro=x;
    const launch=()=>{
      if(!tmIntroValid(x))return;
      if(document.hidden){tmIntroCancel(x);return;}
      tmIntroClear();tmEnterMatch(t,live,faces);
    };
    const tools=foot=>{foot.append(tmButton('← 대진표로',()=>tmIntroCancel(x)),tmButton('연출 건너뛰기',launch));};
    const vs=()=>{
      if(!tmIntroValid(x))return;
      if(document.hidden){tmIntroCancel(x);return;}
      clearTimeout(x.timer);x.phase='vs';
      const {body,foot}=tmLayout(tmGame(t.game).name+' · 대결!',tmLabel(t,live));
      body.classList.add('tm-intro-body','tm-intro-vs-body');
      const stage=tmEl('div','tm-intro-vs');
      for(let side=0;side<2;side++){
        if(side)stage.append(tmEl('strong','tm-vs-bolt','VS'));
        const id=side?live.m.b:live.m.a,ch=CHARACTERS.find(c=>c.id===faces[side]);
        const fighter=tmEl('div','tm-fighter tm-fighter-'+side);
        fighter.append(tmEl('span','tm-player-tag',side?'PLAYER 2':'PLAYER 1'));
        const img=tmEl('img','tm-fighter-img');img.alt='';img.src=characterPortrait(ch?.id||'HOJA','angry');
        fighter.append(img,tmEl('strong','tm-fighter-name',tmName(id)),tmEl('small','tm-character-name',ch?.name||'호자'));stage.append(fighter);
      }
      body.append(stage,tmEl('p','tm-intro-ready','잠시 후 경기가 시작됩니다!'));tools(foot);
      sfx('goal',.7);sfx('charge',.6);x.timer=setTimeout(launch,2400);
    };
    if(live.g==null){vs();return;}
    const {body,foot}=tmLayout(String.fromCharCode(65+live.g)+'조 · 경기 안내',tmGame(t.game).name+' · '+tmLabel(t,live));
    body.classList.add('tm-intro-body','tm-intro-group-body');
    const wrap=tmEl('div','tm-focus-group');wrap.append(tmGroupPanel(t.groups[live.g],live.g,live,true));body.append(wrap,tmEl('p','tm-intro-ready','현재 경기의 상대를 확인하세요.'));
    tools(foot);sfx('menu',.65);x.timer=setTimeout(vs,2200);
  }
  function tmEnterMatch(t,live,faces){
    if(TM.t!==t||TM.running||COIN.classId!==t.classId||!TM.bridge||t.mode==='world'&&(!TM.auth||!TM.pin))return tmBoard();
    const next=tmPlanNext(t);if(!next||next.key!==live.key)return tmBoard();
    TM.match=next;TM.running=true;TM.begun=false;TM.restore=null;streak={side:-1,id:null,count:0};round=null;tryReset();
    const previous={game:currentGame,ai:aiLevel,choices:[...choices],players:[...HOF.players],names:[...HOF.playerNames]};currentGame=t.game;aiLevel=0;
    if(t.game!=='jump'){const stages=stageSet();const oldStage=stages.sel;TM.restore=()=>{stages.set(oldStage);currentGame=previous.game;aiLevel=previous.ai;choices=previous.choices;HOF.players=previous.players;HOF.playerNames=previous.names;};stages.set(t.stage);}
    else TM.restore=()=>{currentGame=previous.game;aiLevel=previous.ai;choices=previous.choices;HOF.players=previous.players;HOF.playerNames=previous.names;};
    HOF.players=Array(6).fill(null);HOF.playerNames=[tmName(next.m.a),tmName(next.m.b),null,null,null,null];
    choices=faces;TM.screen.hidden=true;$('menuScreen').hidden=true;
    if(t.game==='jump')CJ.enter('duel');else launchSelected();
  }
  function tmLaunch(next){
    const t=TM.t;
    tmFresh(ok=>{
      if(!ok||TM.t!==t||t.classId!==COIN.classId||!TM.bridge||t.mode==='world'&&(!TM.auth||!TM.pin))return tmHome();
      const roster=new Set(COIN.everyone.map(p=>p.id));if(t.players.some(p=>!roster.has(p.id))){hofToast('참가 명단이 변경됐어요.');return;}
      const live=tmPlanNext(t);if(!live||live.key!==next.key)return tmBoard();
      if(TM.intro||TM.running)return;
      const faces=t.game==='jump'?['HOJA','HOJA']:tmDrawFaces(t,live,CHARACTERS.map(ch=>ch.id));
      t.active={key:live.key,faces,at:Date.now()};if(!tmStore()){hofToast('경기 시작 상태를 저장하지 못했어요.');return tmBoard();}
      tmIntroBegin(t,live,faces);
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
    style.textContent+=" \n#tmScreen{padding:clamp(8px,1.2vh,18px) clamp(8px,1.2vw,24px);gap:clamp(5px,.8vh,10px);height:100%;width:100%;box-sizing:border-box}\n#tmScreen .tm-head{flex:none;display:grid;gap:3px}\n#tmScreen .tm-body{min-height:0;flex:1 1 0;overscroll-behavior:contain;touch-action:pan-y}\n#tmScreen .tm-foot{flex:0 0 auto;padding:2px 0 4px}\n#tmScreen .tm-foot .control.big{min-height:clamp(44px,7vh,80px);min-width:clamp(112px,12vw,230px);font-size:clamp(15px,1.35vw,26px)}\n#tmScreen .tm-now{padding:clamp(5px,.8vh,10px)}\n#tmScreen .tm-groups{grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));align-items:start;gap:9px}\n#tmScreen .tm-group{display:flex;flex-direction:column;min-width:0;gap:7px;padding:8px;border:2px solid #c5b395;background:#fdf6e8;box-shadow:0 2px 0 #d9c7ac}\n#tmScreen .tm-group-active{border-color:#b98120;background:#fff1ce;box-shadow:0 0 0 1px #d9a441}\n#tmScreen .tm-group-done{border-color:#81a690}\n#tmScreen .tm-group-head{display:flex;align-items:center;justify-content:space-between;gap:4px;border-bottom:1px solid #d8c9ac;padding:2px 3px 6px}\n#tmScreen .tm-group-head h3{font-size:clamp(18px,1.5vw,26px);white-space:nowrap}\n#tmScreen .tm-group-progress{font-size:clamp(10px,.82vw,14px);color:#645036;text-align:right}\n#tmScreen .tm-group-people{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}\n#tmScreen .tm-member{display:flex;flex-direction:column;text-align:center;align-items:center;justify-content:center;min-width:0;padding:4px;border:1px solid #dfcfb2;border-radius:6px;background:#fffdf7}\n#tmScreen .tm-member strong{font-size:clamp(13px,1.03vw,18px);line-height:1.25;overflow-wrap:anywhere}\n#tmScreen .tm-member small{font-size:clamp(10px,.74vw,13px);line-height:1.2;color:#6e5a45}\n#tmScreen .tm-group-matches{display:flex;flex-direction:column;gap:5px}\n#tmScreen .tm-group .tm-match{display:flex;flex-direction:column;gap:3px;padding:4px 5px;min-height:0;background:#fffaf0}\n#tmScreen .tm-group .tm-match-label{display:flex;justify-content:space-between;align-items:center;gap:3px;font-size:clamp(11px,.85vw,15px);line-height:1.2;color:#695337}\n#tmScreen .tm-match-status{font-size:.9em;color:#695337}\n#tmScreen .tm-group .tm-pair{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:4px;padding:0}\n#tmScreen .tm-group .tm-seat{display:flex;align-items:center;justify-content:center;text-align:center;padding:5px 2px;min-width:0;min-height:26px;font-size:clamp(13px,1.1vw,20px);line-height:1.15;overflow-wrap:anywhere;border-radius:5px}\n#tmScreen .tm-vs-mini{align-self:center;font-size:clamp(10px,.8vw,14px);color:#8e7654}\n#tmScreen .tm-unknown{color:#9a8d7d}\n#tmScreen .tm-winner{background:#cce6d5;color:#245e45}\n#tmScreen .tm-loser{background:#dfddd8;color:#696660;opacity:1}\n#tmScreen .tm-alive{background:#ffedb2;color:#634915}\n#tmScreen .tm-group .tm-current{border:2px solid #b98120!important;background:#ffedb8;box-shadow:0 1px 0 #c38b23}\n#tmScreen .tm-current .tm-match-status{color:#875700;font-weight:bold}\n#tmScreen .tm-intro-body{justify-content:center;align-items:center;gap:clamp(5px,1vh,14px);overflow:auto}\n#tmScreen .tm-focus-group{width:min(92%,820px);min-height:0;overflow:auto}\n#tmScreen .tm-focus-group .tm-group{padding:clamp(8px,1.2vh,18px);gap:clamp(4px,.7vh,9px)}\n#tmScreen .tm-focus-group .tm-group-head h3{font-size:clamp(24px,3.3vh,40px)}\n#tmScreen .tm-focus-group .tm-group-progress{font-size:clamp(14px,1.8vh,23px)}\n#tmScreen .tm-focus-group .tm-group-people{grid-template-columns:repeat(auto-fit,minmax(100px,1fr))}\n#tmScreen .tm-focus-group .tm-member strong{font-size:clamp(20px,2.6vh,34px)}\n#tmScreen .tm-focus-group .tm-member small{font-size:clamp(13px,1.65vh,20px)}\n#tmScreen .tm-focus-group .tm-match-label{font-size:clamp(13px,1.7vh,21px)}\n#tmScreen .tm-focus-group .tm-seat{font-size:clamp(19px,2.5vh,31px);padding:clamp(3px,.65vh,9px)}\n#tmScreen .tm-focus-group .tm-vs-mini{font-size:clamp(14px,1.9vh,23px)}\n#tmScreen .tm-intro-ready{flex:none;text-align:center;font-size:clamp(15px,1.8vw,28px);color:#705633}\n#tmScreen .tm-intro-vs{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:clamp(10px,2.3vw,44px);width:min(96%,1320px);flex:1 1 auto;min-height:0;max-height:75vh}\n#tmScreen .tm-fighter{height:100%;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(3px,.6vh,9px);overflow:hidden;border-radius:clamp(12px,2vw,30px);border:3px solid #2f9c8c;background:linear-gradient(145deg,#eaf6ee,#b6dfcd);animation:tmFighterIn .37s ease-out both}\n#tmScreen .tm-fighter-1{border-color:#e0694f;background:linear-gradient(215deg,#fff2e6,#f6c2a8);animation-name:tmFighterInRight}\n#tmScreen .tm-fighter-img{display:block;object-fit:contain;width:min(85%,330px);height:min(42vh,330px);min-height:0;flex:0 1 auto;filter:drop-shadow(0 7px 0 #66513b25)}\n#tmScreen .tm-player-tag{font-size:clamp(13px,1.4vw,23px);color:#3e6255;letter-spacing:.1em}\n#tmScreen .tm-fighter-1 .tm-player-tag{color:#9a4b38}\n#tmScreen .tm-fighter-name{font-size:clamp(25px,5.2vw,88px);text-align:center;line-height:1.1;overflow-wrap:anywhere;max-width:98%}\n#tmScreen .tm-character-name{font-size:clamp(14px,1.8vw,28px);color:#705633}\n#tmScreen .tm-vs-bolt{font-size:clamp(32px,8vw,120px);color:#af7320;animation:tmVsIn .38s .12s ease-out both;text-shadow:0 4px 0 #e7c77a}\n@keyframes tmFighterIn{from{transform:translateX(-12%);opacity:.2}to{transform:none;opacity:1}}\n@keyframes tmFighterInRight{from{transform:translateX(12%);opacity:.2}to{transform:none;opacity:1}}\n@keyframes tmVsIn{from{transform:scale(.45);opacity:0}to{transform:scale(1);opacity:1}}\n@media(prefers-reduced-motion:reduce){#tmScreen .tm-fighter,#tmScreen .tm-vs-bolt{animation:none}}\n";
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&TM.intro)tmIntroCancel(TM.intro);});
    window.addEventListener('pagehide',tmIntroClear);
    document.head.append(style);TM.screen=tmEl('section','');TM.screen.id='tmScreen';TM.screen.hidden=true;document.body.append(TM.screen);
    const b=tmButton('토너먼트 대회',tmOpen);b.className='control tm-menu-tab';b.id='openTournament';const tag=tmEl('span','tm-new-tag','NEW');tag.setAttribute('aria-hidden','true');b.append(tag);document.querySelector('.menu-pages').append(b);
  }
