  /* ---------- Play limits ----------
     Inside the dashboard, games cost coins from the ledger on that PC.
     On a device opened through a class link, the limit is five plays a day, kept in this browser.
     Anywhere else nothing changes. */
  const COIN={on:false,students:[],everyone:[],v2:false,mapped:true,chosen:true,className:'',dismissed:false,pending:new Map(),seq:0,lastIds:[]};
  const TRY_PLAN={flap:5,stack:5,tiles:5,simon:5,stairs:5,jump:5,dodge:3,draw:3,bomb:3,tron:3,rush:3};
  const TRY={game:null,left:0};
  function tryStart(){const n=TRY_PLAN[currentGame]||0;TRY.game=currentGame;TRY.left=n?n-1:0;return n>0;}
  const tryOpen=()=>TRY.left>0&&TRY.game===currentGame&&((EMBED&&COIN.on)||limited());
  const STUDENT_KEY='student-device',DAY_LIMIT=5,REFUND_MS=10000;
  let round=null;
  const isStudentDevice=()=>preference(STUDENT_KEY,'')==='1';
  const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
  function playsToday(){try{const v=JSON.parse(preference('plays','null'));return v&&v.day===dayKey()?v.count:0;}catch{return 0;}}
  function setPlays(n){remember('plays',JSON.stringify({day:dayKey(),count:Math.max(0,n)}));}
  const limited=()=>!EMBED&&isStudentDevice();
  // A round starts when play really starts (the first touch on the play area, or a game's own start),
  // not when the game screen opens, so waiting on a ready screen and leaving costs nothing.
  function roundBegin(){if(round&&!round.t0)round.t0=Date.now();}
  document.addEventListener('pointerdown',e=>{
    if(!round||round.t0||!e.target.closest)return;
    const screen=e.target.closest('.screen-game');
    if(!screen||screen.hidden||e.target.closest('button,a,input,.o-overlay,.pa-overlay,#boardOverlay,.display-zone,#hofPicker'))return;
    roundBegin();
  },true);
  // Called when a game ends or is left. Not started, or under ten seconds of play, costs nothing.
  function roundClose(){
    if(!round)return;
    const r=round;round=null;
    if(r.tries)return;
    if(r.t0&&Date.now()-r.t0>=REFUND_MS)return;
    const why=r.t0?'10초 안에 끝나서':'시작하기 전에 나가서';
    if(r.charge){window.parent.postMessage({type:'hoja-coin-refund',charge:r.charge},DASHBOARD_ORIGIN);hofToast(why+' 코인을 돌려줬어요');COIN.lastIds.forEach(id=>{const st=COIN.students.find(x=>x.id===id);if(st)st.balance+=r.price;});}
    else if(r.day){setPlays(playsToday()-1);hofToast(why+' 횟수를 돌려줬어요');}
  }
  function playersNeeded(){
    if(PARTY_GAMES[currentGame]){const g=PARTY_GAMES[currentGame];return (g.stages.find(st=>st.id===g.sel)||{}).people||2;}
    if(currentGame==='stairs')return ST_STAGES.find(st=>st.id===stairsStage).n;
    if(currentGame==='shop'){const st=SH_STAGES.find(x=>x.id===shopStage);return st?(st.people||(shopStage==='versus'?2:1)):1;}
    return aiLevel?1:2;
  }
  function coinSpend(ids,done,fail){
    const req=++COIN.seq;
    const timer=setTimeout(()=>{COIN.pending.delete(req);fail('대시보드 응답이 없어요. 다시 해 주세요.');},5000);
    COIN.pending.set(req,msg=>{
      clearTimeout(timer);
      if(!msg.ok){fail(msg.message||'시작하지 못했어요.');return;}
      for(const [id,balance] of Object.entries(msg.balances||{})){const st=COIN.students.find(x=>x.id===id);if(st)st.balance=balance;}
      COIN.lastIds=ids;
      round={charge:msg.charge,price:msg.price,t0:null,tries:tryStart()};
      done(msg);
    });
    const game=currentGame==='shop'?'붕어빵 가게':(HOF_GAMES.find(g=>g.id===currentGame)||{}).name||(PARTY_GAMES[currentGame]||{}).name||currentGame;
    window.parent.postMessage({type:'hoja-coin-spend',req,game,ids},DASHBOARD_ORIGIN);
  }
  const coinText=v=>Number.isInteger(v)?String(v):v.toFixed(1);
  function coinPick(n,done){
    const box=$('hofPicker'),picked=[];
    HOF.players=Array(6).fill(null);
    const price=n>1?0.5:1;
    const draw=(note)=>{
      const head=document.createElement('div');head.className='hof-pick-title';
      head.textContent=note||(n===1?'누가 하나요? (1코인)':`${picked.length+1}번째 사람, 이름을 골라요 (${n}명 · 한 명당 ${coinText(price)}코인)`);
      const grid=document.createElement('div');grid.className='hof-seats';
      for(const st of COIN.students){
        const b=document.createElement('button');b.type='button';b.className='hof-seat';b.dataset.student=st.id;
        const small=document.createElement('small');small.textContent=coinText(st.balance)+'코인';
        b.append(small,document.createTextNode(st.name));
        b.disabled=picked.includes(st.id)||st.balance-price<COIN.floor;
        b.addEventListener('click',()=>{sfx('menu',.7);picked.push(st.id);if(picked.length<n)draw();else start();});
        grid.append(b);
      }
      const cancel=document.createElement('button');cancel.type='button';cancel.className='hof-seat guest';cancel.textContent='취소';
      cancel.addEventListener('click',()=>{box.hidden=true;});
      grid.append(cancel);
      box.replaceChildren(head,grid);
    };
    const start=()=>{
      const head=document.createElement('div');head.className='hof-pick-title';head.textContent='코인을 확인하는 중이에요';
      box.replaceChildren(head);
      coinSpend(picked,msg=>{
        picked.slice(0,6).forEach((id,i)=>{const st=COIN.students.find(x=>x.id===id);HOF.players[i]=HOF.cfg&&COIN.mapped&&st&&st.number>=1&&st.number<=HOF_MAX?st.number:null;});
        box.hidden=true;
        const names=picked.map(id=>COIN.students.find(x=>x.id===id));
        hofToast(names.map(x=>x.name+' '+coinText(x.balance)+'코인').join(' · '));
        done();
      },text=>{picked.length=0;draw(text);});
    };
    box.hidden=false;draw();
  }
  function dayLimitReached(){
    hofToast(`오늘 플레이 횟수(${DAY_LIMIT}회)를 다 썼어요`);
  }
  // Every new game goes through here.
  function playGate(n,hofCount,done){
    if(EMBED&&COIN.on){coinPick(n,done);return;}
    if(limited()){
      if(playsToday()>=DAY_LIMIT){dayLimitReached();return;}
      hofPick(hofCount,()=>{setPlays(playsToday()+1);round={day:true,t0:null,tries:tryStart()};done();});
      return;
    }
    hofPick(hofCount,done);
  }
  // "Play again" inside a game is a new round with the same players.
  function replayGate(fn){
    roundClose();
    if(tryOpen()){TRY.left--;round={tries:true,t0:Date.now()};hofToast(TRY.left?`남은 판 ${TRY.left}`:'마지막 판이에요');fn();return;}
    if(EMBED&&COIN.on){
      coinSpend(COIN.lastIds,fn,text=>hofToast(text));
      return;
    }
    if(limited()){
      if(playsToday()>=DAY_LIMIT){dayLimitReached();return;}
      setPlays(playsToday()+1);round={day:true,t0:null,tries:tryStart()};
    }
    fn();
  }
  window.addEventListener('message',event=>{
    if(!EMBED||event.origin!==DASHBOARD_ORIGIN||event.source!==window.parent||!event.data)return;
    const msg=event.data;
    if(msg.type==='hoja-roster'){
      COIN.students=msg.students||[];COIN.floor=typeof msg.floor==='number'?msg.floor:-3;
      COIN.on=Boolean(msg.enabled)&&COIN.students.length>0;COIN.enabled=Boolean(msg.enabled);
      COIN.hofWeeks=Array.isArray(msg.hofWeeks)?msg.hofWeeks:null;
      setTimeout(hofSyncDue,0);
      if(msg.version>=2)hofUseRoster(msg);
      else if(HOF.cfg&&COIN.students.length){
        const names=Array(20).fill('');
        for(const st of COIN.students)if(st.number>=1&&st.number<=20)names[st.number-1]=String(st.name).slice(0,12);
        HOF.cfg.names=names;hofSaveCfg();
      }
    }else if(msg.type==='hoja-coin-result'||msg.type==='hoja-hof-week-result'){
      const cb=COIN.pending.get(msg.req);if(cb){COIN.pending.delete(msg.req);cb(msg);}
    }
  });
  /* Dashboards from V1.16 keep each class's link and fixed seats on the PC. */
  function hofUseRoster(msg){
    COIN.v2=true;COIN.everyone=msg.everyone||[];COIN.chosen=Boolean(msg.chosen);COIN.className=msg.className||'';COIN.mapped=Boolean(msg.hof);
    if(msg.hof){
      if(!HOF.cfg||HOF.cfg.code!==msg.hof.code)HOF.board=null;
      HOF.cfg={code:msg.hof.code,teacher:msg.hof.teacher,pin:msg.hof.pin,names:msg.names||[],linked:true};hofSaveCfg();
      if(hofQrStale())hofToast('명단이 바뀌었어요. 태블릿 QR을 다시 나눠 주세요.');
      return;
    }
    // Another class is open, so the last class's link no longer applies.
    if(HOF.cfg&&HOF.cfg.linked){HOF.cfg=null;HOF.board=null;try{localStorage.removeItem('hoja-airhockey-hof');localStorage.removeItem('hoja-airhockey-hof-board');}catch{}}
    if(COIN.dismissed||!COIN.everyone.length||$('menuScreen').hidden)return;
    if(HOF.cfg||!COIN.chosen)hofFirstRun();
  }
  function hofQrStale(){
    const shared=preference('hof-qr-names','');
    return Boolean(shared&&HOF.cfg&&shared!==JSON.stringify(HOF.cfg.names));
  }
  function hofSetup(data){window.parent.postMessage({type:'hoja-setup',...data},DASHBOARD_ORIGIN);}
  function hofPinInput(){
    const pin=hofEl('input','hof-input');pin.id='hofFirstPin';pin.inputMode='numeric';pin.maxLength=4;pin.placeholder='잠금 숫자 4자리';pin.autocomplete='off';
    return pin;
  }
  function hofFirstRun(){
    COIN.dismissed=true;
    $('menuScreen').hidden=true;$('hallScreen').hidden=false;HOF.view='first';clearInterval(HOF.pollT);
    const local=HOF.cfg;
    const note=hofEl('p','hof-note',`${COIN.className||'우리 반'} 명단 ${COIN.everyone.length}명을 받았어요. 어떻게 쓸까요?`+(local?' 이 기기에 있는 학급과 대조합니다.':''));
    const pin=hofPinInput(),msg=hofEl('p','hof-error'),row=hofEl('div','hof-row hof-first-row');
    const pinOk=()=>{
      if(!/^\d{4}$/.test(pin.value)){msg.textContent='잠금 숫자 4자리를 넣어 주세요.';return false;}
      if(local&&local.pin&&local.pin!==pin.value){msg.textContent='잠금 숫자가 달라요.';return false;}
      return true;
    };
    const go=enabled=>()=>{if(!pinOk())return;if(local)hofShowMatch(enabled,pin.value);else hofCreateFromList(enabled,pin.value,msg);};
    const coinBtn=hofBtn('코인 사용','primary',go(true));coinBtn.id='hofFirstCoin';
    const freeBtn=hofBtn('코인 없이 자유롭게','',go(false));freeBtn.id='hofFirstFree';
    row.append(coinBtn,freeBtn);
    if(!local){const con=hofBtn('기존 학급에 연결','',()=>{if(!pinOk())return;COIN.connect=true;hofShowConnect();});con.id='hofFirstConnect';row.append(con);}
    const later=hofBtn('나중에','',hofHome);later.id='hofFirstLater';row.append(later);
    hofSet('우리 반 명단',hofEl('div','hof-push'),note,pin,msg,row);
  }
  async function hofCreateFromList(enabled,pin,msg){
    msg.textContent='만드는 중…';
    try{
      const made=await hofRpc('hof_create_class');
      remember('hof-qr-names','');
      HOF.cfg={code:made.code,teacher:made.teacher,pin,names:[],linked:true};HOF.board=null;hofSaveCfg();
      hofSetup({enabled,hof:{code:made.code,teacher:made.teacher,pin,seats:{},keep:{}}});
      hofShowCodes();
    }catch{
      hofSetup({enabled});hofHome();
      hofToast('명예의 전당은 인터넷이 연결되면 만들 수 있어요');
    }
  }
  function hofAfterConnect(){
    if(COIN.connect){COIN.connect=false;hofFirstRun();return;}
    hofShowMain();
  }
  /* A hand-made class meets the class list: exact names link themselves, the rest are chosen, and records stay on their seats. */
  function hofShowMatch(enabled,pin){
    HOF.view='match';
    const cfg=HOF.cfg,people=COIN.everyone,names=cfg.names||[];
    const rows=[],list=hofEl('div','hof-match');
    names.forEach((name,i)=>{if(name)rows.push({seat:i+1,name});});
    const taken=new Set();
    for(const r of rows){
      const same=people.filter(p=>p.name===r.name);
      if(same.length===1&&!taken.has(same[0].id)){r.id=same[0].id;taken.add(r.id);}
    }
    const selects=[];
    for(const r of rows){
      const line=hofEl('label','hof-match-line');line.append(hofEl('b','',r.seat+'번 '+r.name));
      const sel=document.createElement('select');sel.className='hof-input';sel.dataset.seat=r.seat;
      sel.add(new Option('명단에 없음 (보관)',''));
      for(const p of people)sel.add(new Option(p.name,p.id));
      sel.value=r.id||'';
      sel.addEventListener('change',()=>{if(sel.value)for(const other of selects)if(other!==sel&&other.value===sel.value)other.value='';});
      selects.push(sel);line.append(sel);list.append(line);
    }
    if(!rows.length)list.append(hofEl('p','hof-note','이 기기에는 이름이 없어요. 명단 학생에게 빈 번호를 차례로 줍니다.'));
    const msg=hofEl('p','hof-error'),row=hofEl('div','hof-row');
    const apply=hofBtn('이대로 연결','primary',()=>{
      const seats={},keep={};
      for(const sel of selects){if(sel.value)seats[sel.value]=Number(sel.dataset.seat);else keep[sel.dataset.seat]=names[sel.dataset.seat-1];}
      const data={enabled,hof:{code:cfg.code,teacher:cfg.teacher||null,pin,seats,keep}};
      remember('hof-qr-names',JSON.stringify(names));
      hofSetup(data);hofHome();hofToast('명단을 연결했어요. 기록은 그대로예요');
    });apply.id='hofMatchApply';
    const fresh=hofBtn('새 학급으로 시작','',()=>{hofForgetLocal();hofCreateFromList(enabled,pin,msg);});fresh.id='hofMatchNew';
    const later=hofBtn('나중에','',hofHome);later.id='hofMatchLater';
    row.append(apply,fresh,later);
    hofSet('명단 대조',hofEl('p','hof-note','이름이 똑같으면 자동으로 이었어요. 나머지를 골라 주세요. 기록은 그 번호에 그대로 남아요.'),list,msg,row);
  }
  function hofForgetLocal(){try{localStorage.removeItem('hoja-airhockey-hof');localStorage.removeItem('hoja-airhockey-hof-board');}catch{}HOF.cfg=null;HOF.board=null;}
  function blockIfStudentAddress(){
    if(EMBED||!isStudentDevice()||/hof=/.test(location.hash))return;
    const wall=document.createElement('div');wall.id='studentWall';
    wall.style.cssText='position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:#24322d;color:#fff8e8;font:800 clamp(22px,3vw,38px)/1.5 "HojaBody",sans-serif;text-align:center';
    const box=document.createElement('div'),line=document.createElement('div'),note=document.createElement('div');
    line.textContent='선생님께 받은 링크로 접속하세요.';
    note.style.cssText='margin:14px 0 26px;font-size:clamp(15px,1.5vw,22px);font-weight:600;opacity:.8';
    box.append(line,note);
    if(HOF.cfg){
      const open=document.createElement('button');open.type='button';open.id='studentWallTeacher';open.textContent='선생님 입장';
      open.style.cssText='min-height:64px;padding:0 32px;border:3px solid #fff8e8;border-radius:14px;background:none;color:#fff8e8;font:800 clamp(17px,1.6vw,24px) "HojaBody",sans-serif';
      note.textContent='학생 기기로 등록된 기기예요. 선생님은 코드를 넣고 교사 메뉴에서 해제해 주세요.';
      open.addEventListener('click',()=>{wall.remove();HOF.fromWall=true;$('menuScreen').hidden=true;$('hallScreen').hidden=false;hofGate();});
      box.append(open);
    }else note.textContent='선생님은 학급 링크로 들어가 교사 메뉴에서 해제해 주세요.';
    wall.append(box);
    document.body.append(wall);
  }
  /* Who is playing */
  function hofNeeded(){
    if(!HOF.cfg)return 0;if(currentGame==='rally')return 2;if(PARTY_GAMES[currentGame])return 0;
    if(currentGame==='stairs'){const st=ST_STAGES.find(s=>s.id===stairsStage);return st.n;}
    if(currentGame==='shop')return shopStage==='solo'?1:shopStage==='versus'||shopStage==='co2'?2:shopStage==='co4'?4:0;
    return aiLevel?0:2;
  }
  function hofPick(n,done){
    HOF.players=Array(6).fill(null);
    if(!HOF.cfg||!n){done();return;}
    const box=$('hofPicker');let side=0;
    const finish=()=>{box.hidden=true;done();};
    const draw=()=>{
      const title=n===1?'누가 하나요?':n>2?`${side+1}번째 팀원 (총 ${n}명)`:side===0?'왼쪽(아래쪽) 사람, 이름을 골라요':'오른쪽(위쪽) 사람, 이름을 골라요';
      const grid=document.createElement('div');grid.className='hof-seats';
      for(let seat=1;seat<=HOF_MAX;seat++){
        const given=HOF.cfg.names[seat-1];if(!given)continue;
        const b=document.createElement('button');b.type='button';b.className='hof-seat';const num=document.createElement('small');num.textContent=seat+'번';b.append(num,document.createTextNode(given));
        b.disabled=HOF.players.includes(seat);
        b.addEventListener('click',()=>{sfx('menu',.7);HOF.players[side]=seat;next();});
        grid.append(b);
      }
      const guest=document.createElement('button');guest.type='button';guest.className='hof-seat guest';guest.textContent='손님 (기록 없음)';
      guest.addEventListener('click',()=>{sfx('menu',.7);HOF.players[side]=null;next();});
      grid.append(guest);
      const head=document.createElement('div');head.className='hof-pick-title';head.textContent=title;
      box.replaceChildren(head,grid);
    };
    const next=()=>{side++;if(side>=n)finish();else draw();};
    box.hidden=false;draw();
  }
  /* Ranking */
  function hofRank(rows,game){
    // Rows from a finished week carry 'reached': equal values are then ordered by who got there first.
    const strict=rows.some(r=>r.reached);
    const list=rows.filter(r=>r.game===game&&r.value>0).sort((a,b)=>b.value-a.value||(strict?String(a.reached).localeCompare(String(b.reached)):0));
    let place=0,last=null;
    list.forEach((r,i)=>{if(strict||r.value!==last){place=i+1;last=r.value;}r.place=place;});
    return list;
  }
  function hofChampion(rows){
    const points=new Map();
    for(const g of HOF_GAMES)if(g.id!=='rally'&&!g.legacy)
      for(const r of hofRank(rows,g.id))if(r.place<=3)
        for(const seat of hofEntrySeats(r))points.set(seat,(points.get(seat)||0)+4-r.place);
    let best=0;for(const v of points.values())best=Math.max(best,v);
    return {best,seats:[...points.entries()].filter(([,v])=>v===best&&best>0).map(([s])=>s)};
  }
  function hofEntrySeats(r){return Array.isArray(r.members)&&r.members.length?r.members:[r.seat];}
  function hofEntryName(r){return hofEntrySeats(r).map(hofName).join(' · ');}
  function hofValue(g,v){return g.id==='shop'||g.id.startsWith('shop_')?shWon(v):v+g.unit;}
  /* Height markers: each student's best of this week, and the year's top climb, placed on the floor they reached. */
  let hofMarkCache={};
  function hofMarks(game){
    const board=HOF.board;
    if(!HOF.cfg||!board||!board.periods)return null;
    const memo=hofMarkCache[game];
    if(memo&&memo.board===board&&memo.names===HOF.cfg.names)return memo.marks;
    const floors=new Map();
    const spot=f=>{if(!floors.has(f))floors.set(f,{seats:[],year:false});return floors.get(f);};
    for(const r of board.periods.week||[])if(r.game===game&&r.value>0)spot(r.value).seats.push(r.seat);
    const year=(board.periods.year||[]).filter(r=>r.game===game&&r.value>0);
    const top=year.reduce((m,r)=>Math.max(m,r.value),0);
    if(top){
      const m=spot(top);m.year=true;
      for(const r of year)if(r.value===top&&!m.seats.includes(r.seat))m.seats.push(r.seat);
    }
    const marks=new Map();
    for(const [floor,m] of floors){
      m.seats.sort((a,b)=>a-b);
      const shown=m.seats.slice(0,3).map(hofName).join('·')+(m.seats.length>3?` 외 ${m.seats.length-3}명`:'');
      marks.set(floor,{year:m.year,text:(m.year?'올해 최고 ':'')+shown});
    }
    hofMarkCache[game]={board,names:HOF.cfg.names,marks};
    return marks;
  }
  /* Screens */
  function hofEl(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function hofBtn(text,cls,fn){const b=hofEl('button','control '+(cls||''),text);b.type='button';b.addEventListener('click',()=>{sfx('menu',.7);fn();});return b;}
  function hofSet(title,...body){
    $('hofTitle').textContent=title;$('hofChampion').replaceChildren();
    $('hofBody').replaceChildren(...body);
  }
  function hofHome(){
    clearInterval(HOF.pollT);HOF.pollT=0;$('hallScreen').hidden=true;$('menuScreen').hidden=false;
  }
  function hofOpen(){
    sfx('menu',.8);toggleFullscreen(true);
    $('menuScreen').hidden=true;$('hallScreen').hidden=false;hofFlush();
    if(HOF.cfg)hofShowMain();else hofShowStart();
  }
  function hofShowStart(){
    HOF.view='start';
    const note=hofEl('p','hof-note','서버에는 이름 없이 학급 코드, 번호, 게임 기록만 저장해요. 이름은 이 기기와 연결한 기기에만 남아요.');
    const row=hofEl('div','hof-row');row.append(hofBtn('우리 반 만들기','primary',()=>hofShowSetup()),hofBtn('학급에 연결하기','',hofShowConnect),hofBtn('← 모음집','',hofHome));
    hofSet('명예의 전당',note,row);
  }
  function hofSeatInputs(names){
    const inputs=[];
    for(let i=0;i<HOF_MAX;i++){
      const input=hofEl('input','hof-input');
      input.value=(names&&names[i])||'';input.maxLength=12;input.placeholder='비어 있음';input.enterKeyHint='next';
      input.setAttribute('aria-label',(i+1)+'번 이름');
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();const n=inputs[i+1];if(n)n.focus();else input.blur();}});
      input.addEventListener('paste',e=>{
        const text=(e.clipboardData&&e.clipboardData.getData('text'))||'';
        if(!/[\n\t]/.test(text.trim()))return;
        e.preventDefault();
        text.trim().split(/[\r\n\t]+/).forEach((v,k)=>{if(inputs[i+k])inputs[i+k].value=v.trim().slice(0,12);});
      });
      inputs.push(input);
    }
    return inputs;
  }
  const hofInputNames=inputs=>inputs.map(x=>x.value.trim().slice(0,12));
  function hofShowSetup(){
    HOF.view='setup';
    const inputs=hofSeatInputs((()=>{const names=Array(HOF_MAX).fill('');for(const st of COIN.students)if(st.number>=1&&st.number<=HOF_MAX)names[st.number-1]=String(st.name).slice(0,12);return names;})()),grid=hofEl('div','hof-seat-grid'),pin=hofEl('input','hof-input hof-pin');pin.inputMode='numeric';pin.maxLength=4;pin.placeholder='교사 메뉴 잠금 숫자 4자리';
    inputs.forEach((input,i)=>{const cell=hofEl('label','hof-seat-cell');cell.append(hofEl('i','',(i+1)+''),input);grid.append(cell);});
    const msg=hofEl('p','hof-error');
    const row=hofEl('div','hof-row');
    row.append(hofBtn('만들기','primary',async()=>{
      const list=hofInputNames(inputs);
      if(!list.some(Boolean)){msg.textContent='이름을 한 명 이상 적어 주세요.';return;}
      if(!/^\d{4}$/.test(pin.value)){msg.textContent='잠금 숫자 4자리를 넣어 주세요.';return;}
      msg.textContent='만드는 중…';
      try{
        const made=await hofRpc('hof_create_class');
        HOF.cfg={code:made.code,teacher:made.teacher,names:list,pin:pin.value};HOF.board=null;hofSaveCfg();
        if(EMBED&&COIN.v2)window.parent.postMessage({type:'hoja-setup',enabled:coin.checked,hof:{code:made.code,teacher:made.teacher,pin:pin.value,seats:{},keep:{}}},DASHBOARD_ORIGIN);
        hofShowCodes();
      }catch{msg.textContent='만들지 못했어요. 인터넷 연결을 확인해 주세요.';}
    }),hofBtn('취소','',hofShowStart));
    const guide=hofEl('p','hof-note','출석 번호 칸에 이름을 적어 주세요. 빈 번호는 비워 두면 돼요. 명렬표를 첫 칸에 붙여 넣으면 차례대로 들어가요.');
    const coin=document.createElement('input');coin.type='checkbox';coin.id='hofSetupCoin';coin.checked=COIN.chosen?COIN.enabled:true;
    const coinRow=hofEl('label','hof-note hof-coin-pick');coinRow.append(coin,' 미니게임에 코인 사용');coinRow.hidden=!(EMBED&&COIN.v2);
    hofSet('우리 반 만들기',guide,grid,pin,coinRow,msg,row);
  }
  async function hofSaveCodes(){
    const cfg=HOF.cfg;
    if(!cfg.teacher){hofToast('이 기기에는 선생님 코드가 없어요');return;}
    try{if(document.fonts&&document.fonts.load)await Promise.all([document.fonts.load('60px HojaTitle','가·←♪⚔✓↻'),document.fonts.load('30px HojaBody','가·←♪⚔✓↻')]);}catch{}
    const c=document.createElement('canvas');c.width=1200;c.height=800;
    const g=c.getContext('2d');
    g.fillStyle='#f3ecd8';g.fillRect(0,0,1200,800);
    g.fillStyle='#2f4a48';g.fillRect(0,0,1200,170);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#ffe27a';g.font='76px HojaTitle,sans-serif';g.fillText('호자 미니게임 명예의 전당',600,88);
    const box=(y,label,code,color)=>{
      g.fillStyle='#fffaf0';g.strokeStyle='#3a2418';g.lineWidth=5;g.beginPath();g.roundRect(120,y,960,190,20);g.fill();g.stroke();
      g.fillStyle='#6a5e50';g.font='32px HojaBody,sans-serif';g.fillText(label,600,y+48);
      g.fillStyle=color;g.font='84px HojaTitle,sans-serif';g.fillText(code.split('').join(' '),600,y+122);
    };
    box(205,'학급 코드 (학생 기기 연결)',cfg.code,'#3f6a64');
    box(420,'선생님 코드 (교사 메뉴, 다른 사람에게 보이지 마세요)',cfg.teacher,'#b4432a');
    const d=new Date();
    g.fillStyle='#5e5647';g.font='30px HojaBody,sans-serif';
    g.fillText('선생님 코드는 잃어버리면 다시 찾을 수 없어요. 안전한 곳에 보관하세요.',600,665);
    g.fillText(`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 만듦`,600,715);
    c.toBlob(blob=>{
      if(!blob){hofToast('이미지를 만들지 못했어요');return;}
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`호자미니게임-학급코드-${cfg.code}.jpg`;document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      hofToast('코드 이미지를 저장했어요');
    },'image/jpeg',.92);
  }
  function hofShowCodes(){
    HOF.view='codes';
    const a=hofEl('div','hof-code'),b=hofEl('div','hof-code');
    a.append(hofEl('small','','학급 코드'),hofEl('strong','',HOF.cfg.code));
    b.append(hofEl('small','','선생님 코드'),hofEl('strong','',HOF.cfg.teacher));
    const codes=hofEl('div','hof-row');codes.append(a,b);
    const note=hofEl('p','hof-note','선생님 코드는 잃어버리면 다시 찾을 수 없어요. 사진을 찍거나 적어 두세요.');
    const row=hofEl('div','hof-row');row.append(hofBtn('코드 이미지 저장 (JPG)','primary',hofSaveCodes),hofBtn('기기 연결 QR','',hofShowQr),hofBtn('명예의 전당으로','',hofShowMain));
    hofSet('우리 반이 만들어졌어요',codes,note,row);
  }
  function hofShowQr(){
    HOF.view='qr';
    const link=hofLink(),qr=qrcode(0,'L');qr.addData(link);qr.make();
    const n=qr.getModuleCount(),c=document.createElement('canvas'),q=Math.max(4,Math.floor(1040/(n+8)));remember('hof-qr-names',JSON.stringify(HOF.cfg.names));c.width=c.height=(n+8)*q;
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#000';
    for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(qr.isDark(r,k))g.fillRect((k+4)*q,(r+4)*q,q,q);
    c.className='hof-qr';
    const side=hofEl('div','hof-qr-side');
    const copy=hofBtn('링크 복사','',async()=>{try{await navigator.clipboard.writeText(link);hofToast('링크를 복사했어요');}catch{hofToast('복사하지 못했어요');}});
    side.append(hofEl('p','hof-note','태블릿 카메라로 찍으면 우리 반에 연결돼요. 이 안에 이름이 들어 있으니 반 밖으로 보내지 마세요.'),copy,hofBtn('돌아가기','primary',hofShowMain));
    const wrap=hofEl('div','hof-qr-wrap');wrap.append(c,side);
    hofSet('기기 연결',wrap);
  }
  function hofShowConnect(){
    HOF.view='connect';
    const input=hofEl('input','hof-input');input.placeholder='연결 링크 또는 학급 코드';input.autocapitalize='characters';
    const msg=hofEl('p','hof-error');
    const row=hofEl('div','hof-row');
    row.append(hofBtn('연결','primary',async()=>{
      const v=input.value.trim();if(!v)return;
      if(hofApplyLink(v)){hofAfterConnect();return;}
      msg.textContent='확인하는 중…';
      try{
        const res=await hofRpc('hof_board',{p_code:v});
        if(res&&res.error){msg.textContent='이 코드의 학급이 없어요.';return;}
        HOF.cfg={code:v.toUpperCase(),names:Array(HOF_MAX).fill(''),teacher:null,pin:null};HOF.board=null;hofSaveCfg();hofAfterConnect();
      }catch{msg.textContent='확인하지 못했어요. 인터넷 연결을 봐 주세요.';}
    }),hofBtn('취소','',()=>HOF.cfg?hofShowMain():hofShowStart()));
    hofSet('학급에 연결하기',input,hofEl('p','hof-note','QR을 찍지 못하는 기기는 링크를 붙여 넣으세요. 코드만 넣으면 이름 대신 번호로 보여요.'),msg,row);
  }
  function hofDrawMain(){
    const rows=HOF.period==='lastweek'?(HOF.last&&HOF.last.week===hofLastMonday()?HOF.last.rows||[]:[]):(HOF.board&&HOF.board.periods&&HOF.board.periods[HOF.period])||[];
    const label=HOF_PERIODS.find(p=>p[0]===HOF.period)[1],champ=hofChampion(rows);
    const head=$('hofChampion');head.replaceChildren();
    head.append(hofEl('small','',label+' 챔피언'),hofEl('strong','',champ.seats.length?champ.seats.map(hofName).join(' · '):'아직 기록이 없어요'));
    if(champ.seats.length)head.append(hofEl('small','',champ.best+'점'));
    const tabs=hofEl('div','hof-tabs');
    HOF_PERIODS.forEach(([id,name])=>{const b=hofEl('button','hof-tab'+(HOF.period===id?' on':''),name);b.type='button';b.addEventListener('click',()=>{sfx('menu',.6);HOF.period=id;hofDrawMain();if(id==='lastweek')hofLoadLastWeek();});tabs.append(b);});
    const grid=hofEl('div','hof-grid');
    for(const g of HOF_GAMES){
      const card=hofEl('div','hof-card');card.append(hofEl('b','',g.name));
      const top=hofRank(rows,g.id).slice(0,3);
      if(!top.length)card.append(hofEl('span','hof-empty','-'));
      for(const r of top){
        const line=hofEl('div','hof-line'+(g.team?' hof-team-line':''));line.title=hofEntryName(r);
        line.append(hofEl('i','',r.place+''),hofEl('span','',hofEntryName(r)),hofEl('em','',hofValue(g,r.value)));card.append(line);
      }
      grid.append(card);
    }
    const row=hofEl('div','hof-row');
    const status=hofEl('span','hof-status',hofQrStale()?'명단이 바뀌었어요. QR을 다시 나눠 주세요.':!HOF.online?'연결이 끊겼어요. 기록은 기기에 보관 중이에요.':(HOF.board&&HOF.board.recording===false)?'기록 꺼짐':'학급 코드 '+HOF.cfg.code);
    const teach=hofEl('button','control','교사 메뉴 (길게 누르기)');teach.type='button';
    let hold=0;const stop=()=>clearTimeout(hold);
    teach.addEventListener('pointerdown',()=>{stop();hold=setTimeout(()=>{sfx('menu',.8);hofGate();},800);});
    ['pointerup','pointerleave','pointercancel'].forEach(n=>teach.addEventListener(n,stop));
    row.append(status);
    if(hofSettleReady())row.append(hofBtn('🏆 지난주 결산','primary hof-settle',hofSettle));
    row.append(hofBtn('기기 연결 QR','',hofShowQr),teach,hofBtn('← 모음집','primary',hofHome));
    $('hofTitle').textContent='명예의 전당';
    $('hofBody').replaceChildren(tabs,grid,row);
  }
  async function hofRefresh(){
    if(!HOF.cfg)return;
    try{
      const res=await hofRpc('hof_board',{p_code:HOF.cfg.code});
      if(res&&res.error==='no_class'){hofForget();if(HOF.view==='main')hofShowStart();hofToast('삭제된 학급이에요');return;}
      HOF.board=res;HOF.online=true;remember('hof-board',JSON.stringify(res));
    }catch{HOF.online=false;}
    if(HOF.view==='main'&&!$('hallScreen').hidden)hofDrawMain();
  }
  async function hofLoadLastWeek(force){
    if(!HOF.cfg)return null;
    const week=hofLastMonday();
    if(!force&&HOF.last&&HOF.last.week===week&&Date.now()-HOF.lastAt<60000)return HOF.last;
    try{
      const res=await hofRpc('hof_week',{p_code:HOF.cfg.code,p_start:week});
      if(res&&res.rows){HOF.last={week,rows:res.rows};HOF.lastAt=Date.now();}
    }catch{HOF.online=false;}
    if(HOF.view==='main'&&!$('hallScreen').hidden&&HOF.period==='lastweek')hofDrawMain();
    return HOF.last&&HOF.last.week===week?HOF.last:null;
  }
  /* Weekly settlement: from Monday, last week's top three of each game get bonus coins, once per week.
     Only inside the dashboard, which keeps the coins and remembers which weeks it has paid. */
  function hofSettleReady(){
    return EMBED&&COIN.v2&&COIN.on&&COIN.mapped&&HOF.cfg&&Array.isArray(COIN.hofWeeks)&&!COIN.hofWeeks.includes(hofLastMonday());
  }
  // The menu's hall of fame button flashes while a settlement is waiting (checked again each minute for Monday).
  function hofSyncDue(){const b=$('openHall');if(b)b.classList.toggle('hof-due',Boolean(hofSettleReady()));}
  setInterval(hofSyncDue,60000);
  function hofWeekText(week){const [y,m,d]=week.split('-').map(Number);const e=new Date(y,m-1,d+6);return `${m}월 ${d}일 ~ ${e.getMonth()+1}월 ${e.getDate()}일`;}
  async function hofSettle(){
    HOF.view='settle';clearInterval(HOF.pollT);
    const week=hofLastMonday(),msg=hofEl('p','hof-note','지난주 기록을 불러오는 중이에요…');
    hofSet('지난주 결산',msg,hofEl('div','hof-row'));
    const last=await hofLoadLastWeek(true);
    if(!last){msg.textContent='지난주 기록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.';$('hofBody').append(hofBtn('← 명예의 전당','primary',hofShowMain));return;}
    const person=seat=>COIN.everyone.find(s=>s.number===seat);
    const awards=[],wins=[];
    for(const g of HOF_GAMES){
      if(g.noPrize)continue; // New modes have no automatic coin award policy yet.
      for(const r of hofRank(last.rows,g.id).slice(0,3)){
        const sts=hofEntrySeats(r).map(person);
        wins.push({g,r,sts});
        for(const st of sts)if(st)awards.push({id:st.id,game:g.id,place:r.place});
      }
    }
    msg.textContent='코인을 주는 중이에요…';
    const req=++COIN.seq;
    const reply=await new Promise(res=>{
      const timer=setTimeout(()=>{COIN.pending.delete(req);res(null);},8000);
      COIN.pending.set(req,m=>{clearTimeout(timer);res(m);});
      window.parent.postMessage({type:'hoja-hof-week',req,week,awards},DASHBOARD_ORIGIN);
    });
    if(!reply||!reply.ok){msg.textContent=(reply&&reply.message)||'대시보드 응답이 없어요. 다시 해 주세요.';$('hofBody').append(hofBtn('← 명예의 전당','primary',hofShowMain));return;}
    for(const [id,b] of Object.entries(reply.balances||{})){const st=COIN.students.find(x=>x.id===id);if(st)st.balance=b;}
    if(Array.isArray(reply.hofWeeks))COIN.hofWeeks=reply.hofWeeks;else if(COIN.hofWeeks)COIN.hofWeeks.push(week);
    hofSyncDue();
    hofShowSettled(week,wins,reply);
  }
  function hofShowSettled(week,wins,reply){
    HOF.view='settled';
    const given=new Map((reply.given||[]).map(x=>[x.id,x]));
    const head=hofEl('p','hof-note',reply.already?`${hofWeekText(week)} 결산은 이미 했어요. 결과만 보여 줄게요.`:`${hofWeekText(week)} · 게임마다 1등 1코인, 2등·3등 0.5코인`);
    const grid=hofEl('div','hof-grid');
    for(const g of HOF_GAMES){
      if(g.noPrize)continue;
      const card=hofEl('div','hof-card');card.append(hofEl('b','',g.name));
      const mine=wins.filter(w=>w.g===g);
      if(!mine.length)card.append(hofEl('span','hof-empty','-'));
      for(const {r,sts} of mine){
        const line=hofEl('div','hof-line');
        line.append(hofEl('i','',r.place+''),hofEl('span','',hofEntryName(r)),
          hofEl('em','',hofValue(g,r.value)),
          hofEl('small','hof-plus',sts.filter(Boolean).length?'각 +'+coinText(HOF_PRIZE[r.place]):''));
        card.append(line);
      }
      grid.append(card);
    }
    const sum=hofEl('p','hof-note hof-sum');
    const totals=[...given.values()].filter(x=>x.given>0).map(x=>`${x.name} +${coinText(x.given)}${x.capped?'(상한)':''}`);
    sum.textContent=reply.already?'':totals.length?'받은 코인: '+totals.join(' · '):'지난주에는 받을 사람이 없어요.';
    const row=hofEl('div','hof-row');row.append(hofBtn('← 명예의 전당','primary',hofShowMain));
    hofSet('🏆 지난주 결산',head,grid,sum,row);
    if(!reply.already){sfx('coin',1);cheer(.6);}
  }
  function hofShowMain(){
    HOF.view='main';hofDrawMain();hofRefresh();
    clearInterval(HOF.pollT);HOF.pollT=setInterval(()=>{if(!document.hidden)hofRefresh();},10000);
  }
  /* Teacher: a four digit lock keeps curious hands out; the real authority is the teacher code on the server. */
  const GATE_TRIES=3,GATE_WAIT=300000;
  const gateState=()=>{try{return JSON.parse(preference('teacher-lock','null'))||{n:0,until:0};}catch{return {n:0,until:0};}};
  // Returns the words to show for a wrong try, and starts the wait on the last one.
  function gateWrong(text){
    const st=gateState();st.n++;
    if(st.n>=GATE_TRIES){st.n=0;st.until=Date.now()+GATE_WAIT;}
    remember('teacher-lock',JSON.stringify(st));
    return st.until>Date.now()?text:text+' (남은 기회 '+(GATE_TRIES-st.n)+'번)';
  }
  function gateBack(){
    if(!HOF.fromWall){hofShowMain();return;}
    HOF.fromWall=false;$('hallScreen').hidden=true;$('menuScreen').hidden=false;blockIfStudentAddress();
  }
  // Keeps the buttons shut and counts down while the wait lasts. Cancel stays open.
  function gateWatch(msg,buttons){
    const tick=()=>{
      if(HOF.view!=='gate'){clearInterval(timer);return;}
      const left=gateState().until-Date.now(),shut=left>0;
      buttons.forEach(b=>{b.disabled=shut;});
      if(shut){const sec=Math.ceil(left/1000);msg.textContent='3번 틀렸어요. '+Math.floor(sec/60)+'분 '+String(sec%60).padStart(2,'0')+'초 뒤에 다시 넣을 수 있어요.';}
      else if(msg.dataset.shut==='1')msg.textContent='';
      msg.dataset.shut=shut?'1':'';
    };
    const timer=setInterval(tick,500);tick();
  }
  function hofGate(){
    HOF.view='gate';clearInterval(HOF.pollT);
    const cfg=HOF.cfg,msg=hofEl('p','hof-error'),input=hofEl('input','hof-input'),row=hofEl('div','hof-row');
    if(cfg.teacher&&cfg.pin){
      input.inputMode='numeric';input.maxLength=4;input.type='password';input.placeholder='잠금 숫자 4자리';
      const openBtn=hofBtn('열기','primary',()=>{if(gateState().until>Date.now())return;if(input.value===cfg.pin){remember('teacher-lock','null');HOF.fromWall=false;hofShowTeacher();}else{msg.textContent=gateWrong('숫자가 맞지 않아요.');input.value='';}});
      row.append(openBtn,hofBtn('취소','',gateBack));
      hofSet('교사 메뉴',input,msg,row);gateWatch(msg,[openBtn]);
      return;
    }
    input.placeholder='선생님 코드';input.autocapitalize='characters';
    const pin=hofEl('input','hof-input');pin.inputMode='numeric';pin.maxLength=4;pin.placeholder='이 기기의 잠금 숫자 4자리';
    const keepLabel=hofEl('label','hof-check'),keep=document.createElement('input');keep.type='checkbox';keepLabel.append(keep,hofEl('span','','이 기기에 저장 (학생용 기기에는 저장하지 마세요)'));
    const checkBtn=hofBtn('확인','primary',async()=>{
      if(gateState().until>Date.now())return;
      msg.textContent='확인하는 중…';
      try{
        const ok=await hofRpc('hof_teacher_check',{p_code:cfg.code,p_teacher:input.value.trim()});
        if(!ok){msg.textContent=gateWrong('선생님 코드가 맞지 않아요.');input.value='';return;}
        remember('teacher-lock','null');HOF.fromWall=false;
        if(keep.checked){
          if(!/^\d{4}$/.test(pin.value)){msg.textContent='저장하려면 잠금 숫자 4자리를 넣어 주세요.';return;}
          cfg.teacher=input.value.trim().toUpperCase();cfg.pin=pin.value;hofSaveCfg();hofShowTeacher();
        }else hofShowTeacher(input.value.trim().toUpperCase());
      }catch{msg.textContent='확인하지 못했어요. 인터넷 연결을 봐 주세요.';}
    });
    row.append(checkBtn,hofBtn('취소','',gateBack));
    hofSet('교사 메뉴',input,keepLabel,pin,msg,row);gateWatch(msg,[checkBtn]);
  }
  function hofShowTeacher(oneTime){
    HOF.view='teacher';
    const cfg=HOF.cfg,teacher=oneTime||cfg.teacher,msg=hofEl('p','hof-error');
    const call=(name,args)=>hofRpc(name,{p_code:cfg.code,p_teacher:teacher,...args});
    const seats=hofEl('div','hof-seat-edit'),seatInputs=hofSeatInputs(cfg.names);
    for(let i=0;i<20;i++){
      const line=hofEl('div','hof-seat-row'),input=seatInputs[i];
      const clear=hofEl('button','hof-del','기록 지우기');clear.type='button';
      clear.addEventListener('click',async()=>{
        if(clear.dataset.arm!=='1'){clear.dataset.arm='1';clear.textContent='한 번 더';setTimeout(()=>{clear.dataset.arm='';clear.textContent='기록 지우기';},3000);return;}
        try{const n=await call('hof_clear_seat',{p_seat:i+1});hofToast((i+1)+'번 기록 '+n+'개를 지웠어요');clear.dataset.arm='';clear.textContent='기록 지우기';loadRecent();}catch{msg.textContent='지우지 못했어요.';}
      });
      line.append(hofEl('i','',(i+1)+''),input,clear);seats.append(line);
    }
    const saved=hofBtn('이름 저장','primary',()=>{cfg.names=hofInputNames(seatInputs);hofSaveCfg();hofToast('저장했어요. 다른 기기는 새 QR을 찍어야 바뀌어요');});
    const file=hofBtn('이름 파일로 받기','',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([cfg.names.join('\n')],{type:'text/plain;charset=utf-8'}));a.download='우리반-이름.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);});
    const record=hofBtn(HOF.board&&HOF.board.recording===false?'기록 켜기':'기록 끄기','',async()=>{
      try{const on=await call('hof_set_recording',{p_on:!(HOF.board&&HOF.board.recording===false)});if(HOF.board)HOF.board.recording=on;record.textContent=on?'기록 끄기':'기록 켜기';hofToast(on?'기록을 켰어요':'기록을 껐어요');}catch{msg.textContent='바꾸지 못했어요.';}
    });
    const list=hofEl('div','hof-recent');
    const loadRecent=async()=>{
      list.replaceChildren(hofEl('span','hof-empty','불러오는 중…'));
      try{
        const rows=await call('hof_recent',{});list.replaceChildren();
        if(!rows.length)list.append(hofEl('span','hof-empty','기록이 없어요'));
        for(const r of rows){
          const g=HOF_GAMES.find(x=>x.id===r.game),line=hofEl('div','hof-line');
          const when=new Date(r.played_at);
          line.append(hofEl('span','',`${when.getMonth()+1}/${when.getDate()} ${String(when.getHours()).padStart(2,'0')}:${String(when.getMinutes()).padStart(2,'0')}`),hofEl('span','',hofEntryName(r)),hofEl('span','',g?g.name:r.game),hofEl('em','',g?hofValue(g,r.score):r.score));
          const del=hofEl('button','hof-del','삭제');del.type='button';del.addEventListener('click',async()=>{try{await call('hof_delete_record',{p_id:r.id});line.remove();}catch{msg.textContent='삭제하지 못했어요.';}});
          line.append(del);list.append(line);
        }
      }catch{list.replaceChildren(hofEl('span','hof-error','기록을 불러오지 못했어요.'));}
    };
    loadRecent();
    const row1=hofEl('div','hof-row');row1.append(saved,file,hofBtn('기기 연결 QR','',hofShowQr),record);
    const row2=hofEl('div','hof-row');
    row2.append(
      hofBtn('코드 보기','',hofShowCodes),
      hofBtn('이 기기에서 코드 지우기','',()=>{cfg.teacher=null;cfg.pin=null;hofSaveCfg();hofShowMain();}),
      hofBtn('이 기기 연결 끊기','',()=>{hofForget();hofShowStart();}),
      hofBtn('학생 기기 표시 해제','',()=>{try{localStorage.removeItem('hoja-airhockey-'+STUDENT_KEY);}catch{}hofToast('이 기기의 제한을 풀었어요');}),
      hofBtn('학급 삭제','',async()=>{
        if(msg.dataset.arm!=='1'){msg.dataset.arm='1';msg.textContent='학급과 모든 기록이 지워져요. 다시 누르면 삭제합니다.';return;}
        try{await call('hof_delete_class',{});hofForget();hofShowStart();hofToast('학급을 삭제했어요');}catch{msg.textContent='삭제하지 못했어요.';}
      }),
      hofBtn('돌아가기','primary',hofShowMain));
    const cols=hofEl('div','hof-cols'),left=hofEl('div'),right=hofEl('div');
    left.append(hofEl('b','','학생 이름 (추가: 빈칸에 입력, 삭제: 이름 지우기)'),seats,hofEl('small','hof-hint','새 학생을 예전 번호에 넣을 때는 그 번호의 기록을 먼저 지우세요.'));right.append(hofEl('b','','최근 기록'),list);cols.append(left,right);
    hofSet('교사 메뉴',cols,row1,msg,row2);
  }
  hofLoad();
  if(!EMBED&&hofApplyLink(location.hash)){
    if(!isStudentDevice()&&!HOF.cfg.teacher){remember(STUDENT_KEY,'1');setTimeout(()=>hofToast('우리 반에 연결했어요'),600);}
  }
  blockIfStudentAddress();
  if(location.hash==='#debug')window.__v48={SH,shSpawn,shServe};
  if(location.hash==='#debug')window.__v37={RALLY,TRY,paEnd,paSetScore,RH,offset:()=>boardLag};
  const calBtn=$('openCalibrate'),calLabel=()=>{calBtn.textContent='전자칠판 보정 · '+boardLag.toFixed(2)+'초';};calLabel();
  calBtn.addEventListener('click',()=>{sfx('menu',.8);boardCalibrate(calLabel);});
  setTimeout(hofFlush,1500);
