  /* ---------- Hall of fame ---------- */
  // The server only ever sees a random class code, seat numbers and results. Names stay on the devices.
  const HOF_API='https://aolfbqfchzipyevtdhdy.supabase.co/rest/v1/rpc/',HOF_KEY='sb_publishable_5SFnvXsS7uWE376Iav97eQ_EFi5Nhg4';
  const HOF_HOME='https://xkdtndbrwk111-prog.github.io/hoja-minigames/';
  const HOF_GAMES=[
    {id:'stairs_solo',name:'무한 계단 · 1인',unit:'층',noPrize:true},
    {id:'stairs_race',name:'무한 계단 · 다인전',unit:'층',noPrize:true},
    {id:'jump_solo',name:'호자 점프 · 1인',unit:'층',noPrize:true},
    {id:'jump_duel',name:'호자 점프 · 2인',unit:'층',noPrize:true},
    {id:'stairs',name:'무한 계단 · 이전 기록',unit:'층',legacy:true},
    {id:'jump',name:'호자 점프 · 이전 기록',unit:'층',legacy:true},
    {id:'shop_solo',name:'붕어빵 1인 · 5일 총매출',unit:'원',noPrize:true},
    {id:'shop_vs2',name:'붕어빵 2인 대결',unit:'원',noPrize:true},
    {id:'shop_co2',name:'붕어빵 2인 협동',unit:'원',team:true,noPrize:true},
    {id:'shop_co4',name:'붕어빵 4인 협동',unit:'원',team:true,noPrize:true},
    {id:'shop',name:'붕어빵 이전 기록',unit:'원',legacy:true},
    {id:'hockey',name:'에어하키',unit:'승'},{id:'volley',name:'호자 배구',unit:'승'},{id:'bubble',name:'퍼즐버블',unit:'승'},
    {id:'othello',name:'오셀로',unit:'승'},{id:'gomoku',name:'오목',unit:'승'},{id:'ttt',name:'틱택토',unit:'승'},{id:'germ',name:'세균전',unit:'승'},{id:'rally',name:'파티 랠리',unit:'승'},
  ];
  const HOF_PERIODS=[['day','오늘'],['week','이번 주'],['lastweek','지난주'],['month','이번 달'],['year','올해']];
  // Weekly settlement prizes: 1st, 2nd, 3rd of each game last week.
  const HOF_PRIZE={1:1,2:.5,3:.5};
  const HOF_MAX=40;
  const HOF={cfg:null,pending:[],board:null,last:null,lastAt:0,period:'day',players:Array(6).fill(null),pollT:0,flushing:false,online:true,lastError:null};
  // Monday of last week on this PC's calendar, as YYYY-MM-DD.
  function hofLastMonday(now=new Date()){
    const d=new Date(now.getFullYear(),now.getMonth(),now.getDate());d.setDate(d.getDate()-((d.getDay()+6)%7)-7);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function hofLoad(){
    try{HOF.cfg=JSON.parse(preference('hof','null'));}catch{HOF.cfg=null;}
    try{HOF.pending=JSON.parse(preference('hof-pending','[]'));}catch{HOF.pending=[];}
    try{HOF.board=JSON.parse(preference('hof-board','null'));}catch{HOF.board=null;}
  }
  function hofSaveCfg(){remember('hof',JSON.stringify(HOF.cfg));}
  function hofForget(){try{localStorage.removeItem('hoja-airhockey-hof');localStorage.removeItem('hoja-airhockey-hof-board');}catch{}HOF.cfg=null;HOF.board=null;if(EMBED&&COIN.v2)window.parent.postMessage({type:'hoja-setup',hof:null},DASHBOARD_ORIGIN);}
  async function hofRpc(name,args={}){
    const r=await fetch(HOF_API+name,{method:'POST',headers:{apikey:HOF_KEY,'Content-Type':'application/json'},body:JSON.stringify(args)});
    const text=await r.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}
    if(!r.ok){const e=new Error((data&&data.message)||'request_failed');e.denied=r.status<500;throw e;}
    return data;
  }
  function hofToast(text){
    const t=$('hofToast');t.textContent=text;t.hidden=false;clearTimeout(t._h);t._h=setTimeout(()=>{t.hidden=true;},2600);
  }
  function hofName(seat){const n=HOF.cfg&&HOF.cfg.names&&HOF.cfg.names[seat-1];return n||seat+'번';}
  /* Links carry the names after the #, which browsers never send to any server. */
  function hofEncode(names){
    const bytes=new TextEncoder().encode(JSON.stringify(names));let bin='';bytes.forEach(b=>{bin+=String.fromCharCode(b);});
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function hofDecode(text){
    const bin=atob(text.replace(/-/g,'+').replace(/_/g,'/'));
    const list=JSON.parse(new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0))));
    return Array.isArray(list)?list.slice(0,HOF_MAX).map(n=>String(n||'').slice(0,12)):[];
  }
  function hofLink(){
    const base=/^https?:$/.test(location.protocol)?location.origin+location.pathname:HOF_HOME;
    return base+'#hof='+HOF.cfg.code+'.'+hofEncode(HOF.cfg.names);
  }
  function hofApplyLink(text){
    const m=/hof=([A-Za-z0-9]+)\.([\w-]+)/.exec(text||'');if(!m)return false;
    let names;try{names=hofDecode(m[2]);}catch{return false;}
    const code=m[1].toUpperCase(),same=HOF.cfg&&HOF.cfg.code===code;
    HOF.cfg={code,names,teacher:same?HOF.cfg.teacher:null,pin:same?HOF.cfg.pin:null};
    HOF.board=null;hofSaveCfg();
    return true;
  }
  /* Recording: kept on the device first, so a dropped connection never loses a result. */
  function hofRecord(game,side,score){
    roundClose();
    const seat=HOF.players[side];
    if(!HOF.cfg||!seat)return;
    if(HOF.pending.length>=300){hofToast('전송 대기 기록이 가득해요. 인터넷 연결을 확인해 주세요');return;}
    HOF.pending.push({code:HOF.cfg.code,seat,game,score:Math.round(score),at:new Date().toISOString()});
    remember('hof-pending',JSON.stringify(HOF.pending));
    hofToast(hofName(seat)+' 기록 전송 대기');
    hofFlush();
  }
  // A cooperative bakery result belongs to the complete team, never to each
  // member as if they had independently earned the whole revenue.
  function hofRecordTeam(game,seats,score){
    roundClose();
    const expected=game==='shop_co2'?2:game==='shop_co4'?4:0;
    if(!HOF.cfg||!expected||!Array.isArray(seats)||seats.length!==expected
      ||seats.some(n=>!Number.isInteger(n)||n<1||n>HOF_MAX)
      ||new Set(seats).size!==expected){
      if(HOF.cfg)hofToast('팀 전원의 학급 번호가 있어야 기록할 수 있어요');
      return;
    }
    const key=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,13);
    if(HOF.pending.length>=300){hofToast('전송 대기 기록이 가득해요. 인터넷 연결을 확인해 주세요');return;}
    HOF.pending.push({code:HOF.cfg.code,seats:[...seats].sort((a,b)=>a-b),game,
      score:Math.round(score),at:new Date().toISOString(),key,team:true});
    remember('hof-pending',JSON.stringify(HOF.pending));
    hofToast('팀 기록 전송 대기');
    hofFlush();
  }
  function hofWin(game,side){roundClose();if(!aiLevel)hofRecord(game,side,1);}
  async function hofFlush(){
    if(HOF.flushing||!HOF.pending.length)return;
    HOF.flushing=true;let retry=0;
    try{
      while(HOF.pending.length){
        const p=HOF.pending[0];
        const res=p.team
          ?await hofRpc('hof_add_team_record',{p_code:p.code,p_seats:p.seats,p_game:p.game,p_score:p.score,p_at:p.at,p_key:p.key})
          :await hofRpc('hof_add_record',{p_code:p.code,p_seat:p.seat,p_game:p.game,p_score:p.score,p_at:p.at});
        if(res!=='ok'){
          HOF.lastError=String(res);HOF.online=res==='too_fast';retry=res==='too_fast'?3500:30000;
          hofToast('기록 미전송: '+String(res)+' · 다시 시도해요');break;
        }
        HOF.pending.shift();HOF.lastError=null;remember('hof-pending',JSON.stringify(HOF.pending));
        hofToast('명예의 전당 기록 저장 완료');
      }
      if(!retry)HOF.online=true;
    }catch(e){HOF.online=false;HOF.lastError='연결 실패';retry=30000;hofToast('서버 연결 실패 · 기록을 보관 중이에요');}
    HOF.flushing=false;
    if(retry)setTimeout(hofFlush,retry);
    if(!$('hallScreen').hidden&&HOF.view==='main')hofRefresh();
  }
  window.addEventListener('online',hofFlush);
