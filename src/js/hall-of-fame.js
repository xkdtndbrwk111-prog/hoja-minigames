  /* ---------- Hall of fame ---------- */
  // The server only ever sees a random class code, seat numbers and results. Names stay on the devices.
  const HOF_API='https://aolfbqfchzipyevtdhdy.supabase.co/rest/v1/rpc/',HOF_KEY='sb_publishable_5SFnvXsS7uWE376Iav97eQ_EFi5Nhg4';
  const HOF_HOME='https://xkdtndbrwk111-prog.github.io/hoja-minigames/';
  const HOF_GAMES=[
    {id:'stairs',name:'무한 계단',unit:'층'},{id:'jump',name:'호자 점프',unit:'층'},{id:'shop',name:'붕어빵 가게',unit:'원'},
    {id:'hockey',name:'에어하키',unit:'승'},{id:'volley',name:'호자 배구',unit:'승'},{id:'bubble',name:'퍼즐버블',unit:'승'},
    {id:'othello',name:'오셀로',unit:'승'},{id:'gomoku',name:'오목',unit:'승'},{id:'ttt',name:'틱택토',unit:'승'},{id:'germ',name:'세균전',unit:'승'},{id:'rally',name:'파티 랠리',unit:'승'},
  ];
  const HOF_PERIODS=[['day','오늘'],['week','이번 주'],['month','이번 달'],['year','올해']];
  const HOF_MAX=40;
  const HOF={cfg:null,pending:[],board:null,period:'day',players:[null,null],pollT:0,flushing:false,online:true};
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
    HOF.pending.push({code:HOF.cfg.code,seat,game,score:Math.round(score),at:new Date().toISOString()});
    if(HOF.pending.length>300)HOF.pending.shift();
    remember('hof-pending',JSON.stringify(HOF.pending));
    hofToast(hofName(seat)+' 기록 저장!');
    hofFlush();
  }
  function hofWin(game,side){roundClose();if(!aiLevel)hofRecord(game,side,1);}
  async function hofFlush(){
    if(HOF.flushing||!HOF.pending.length)return;
    HOF.flushing=true;let retry=0;
    try{
      while(HOF.pending.length){
        const p=HOF.pending[0];
        const res=await hofRpc('hof_add_record',{p_code:p.code,p_seat:p.seat,p_game:p.game,p_score:p.score,p_at:p.at});
        if(res==='too_fast'){retry=3500;break;}
        HOF.pending.shift();remember('hof-pending',JSON.stringify(HOF.pending));
      }
      HOF.online=true;
    }catch(e){HOF.online=false;retry=30000;}
    HOF.flushing=false;
    if(retry)setTimeout(hofFlush,retry);
    if(!$('hallScreen').hidden&&HOF.view==='main')hofRefresh();
  }
  window.addEventListener('online',hofFlush);
