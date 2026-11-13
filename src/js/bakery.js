  /* ---------- Bungeoppang shop: setup ---------- */
  const SH_STAGES=[
    {id:'solo',name:'혼자 장사',desc:'5일 동안 장사하고 번 돈으로 가게를 키워요'},
    {id:'versus',name:'장사 대결',desc:'90초 동안 누가 더 많이 버는지 겨뤄요'},
    {id:'co2',name:'2인 협동',desc:'둘이서 굽고 포장하고 계산해요',people:2},
    {id:'co4',name:'4인 협동',desc:'넷이서 반죽 · 굽기 · 포장 · 계산을 맡아요',people:4},
  ];
  const SH_FILL=[{n:'팥',c:'#7a2b33',t:'#fff'},{n:'슈크림',c:'#f2cf5c',t:'#4a3a10'},{n:'고구마',c:'#9b59c4',t:'#fff'},{n:'초코',c:'#5a3a22',t:'#fff'}];
  const SH_DAYS=[{target:8000,fills:1,gap:4.6,max:2},{target:11000,fills:2,gap:3.8,max:3},{target:13000,fills:3,gap:3.2,max:3},{target:15000,fills:3,gap:2.6,max:3},{target:17000,fills:4,gap:2.2,max:3}];
  const SH_UP=[
    {id:'molds',name:'붕어빵 틀 +2',desc:'한 번에 더 많이 구워요',costs:[6000,10000]},
    {id:'fire',name:'센 불',desc:'더 빨리 익어요',costs:[5000,9000]},
    {id:'price',name:'가격 +100원',desc:'한 개당 더 벌어요',costs:[4000,7000,11000]},
    {id:'patience',name:'친절 교육',desc:'손님이 더 오래 기다려요',costs:[4000,7000]},
    {id:'tray',name:'넓은 완성대',desc:'붕어빵을 2개 더 놓아요',costs:[5000,9000]},
    {id:'gold',name:'황금 손맛',desc:'황금 타이밍 +0.5초',costs:[5000,9000]},
    {id:'burn',name:'약한 불 조절',desc:'타기 전 여유 +0.5초',costs:[4000,7000]},
    {id:'special',name:'필살기 강화',desc:'',costs:[10000,16000]},
  ];
  // Each character's special in the bakery. lv holds the strength at upgrade levels 0, 1 and 2; up says what the next level adds.
  const SH_SP={
    HOJA:{kind:'welcome',name:'사랑의 손님맞이',tip:'모든 손님 기다림이 가득!',lv:[4,7,10],up:['가득 + 4초 멈춤','가득 + 7초 멈춤','가득 + 10초 멈춤']},
    NAHANSANG:{kind:'feast',name:'급식 세 판',tip:'굽던 붕어빵이 한 번에 완성!',lv:[0,1,2],up:['굽던 빵 바로 완성','하나는 황금으로','모두 황금으로']},
    SUMAKSAE:{kind:'tile',name:'기와 미소',tip:'안 타고 모두 황금빛!',lv:[10,11,12],up:['10초 황금빛','11초 황금빛','12초 황금빛']},
    CHILJIDO_ELDER:{kind:'blaze',name:'일곱 갈래 불길',tip:'빈 틀 가득, 두 배로 빨리, 안 타요!',lv:[8,9,10],up:['빈 틀 채우고 8초 두 배','빈 틀 채우고 9초 두 배','빈 틀 채우고 10초 두 배']},
    MURYEONG_KING:{kind:'royal',name:'왕의 하사',tip:'다음 손님들은 황금 값!',lv:[3,4,5],up:['3명 황금 값','4명 황금 값','5명 황금 값']},
    BANGASAYUSANG:{kind:'calm',name:'사유의 시간',tip:'손님 기다림이 멈춰요!',lv:[14,16,18],up:['14초 기다림 멈춤','16초 기다림 멈춤','18초 기다림 멈춤']},
    GWANGGAETO_KING:{kind:'conquer',name:'영토 정복',tip:'줄 수 있는 손님 모두 판매!',lv:[0,.2,.4],up:['줄 수 있는 손님 모두','모두 + 20% 더','모두 + 40% 더']},
  };
  const SH_SP_FULL=5;
  const SH_COOK=3.2,SH_BURN=3,SH_GOLD=1,SH_TRAY=6,SH_CUT=1.05,SH_CO_TRAY=8,SH_RUSH_AT=5,SH_RUSH_TIME=10,SH_FAST=.55,SH_FAST_PAY=150;
  // Customers have habits. They arrive a few at a time over the five days, so each day adds one new thing to learn.
  const SH_KIND={
    CHILJIDO_ELDER:{wait:1.5,tip:.5,tag:'느긋해요'},
    HOJA:{wait:.7,tip:2.5,tag:'급해요 · 팁 듬뿍'},
    NAHANSANG:{wait:1,tip:1,tag:'많이 사요',bulk:true},
    SUMAKSAE:{wait:1,tip:1.5,tag:'노릇노릇만',minQ:2},
    BANGASAYUSANG:{wait:1.2,tip:1,tag:'주문이 바뀌어요',changes:true},
    MURYEONG_KING:{wait:1.1,tip:1,tag:'황금이면 +300원',goldFan:true},
    GWANGGAETO_KING:{wait:1.3,tip:1.5,tag:'단체 손님',group:true}
  };
  const SH_KIND_DAYS=['CHILJIDO_ELDER','HOJA','NAHANSANG','SUMAKSAE','BANGASAYUSANG','MURYEONG_KING','GWANGGAETO_KING'];
  const SH_SAY={
    HOJA:{come:['빨리빨리!','사랑을 주세요!'],hurry:['아직이야?!','내 친절이 식어요!'],good:['사랑해요!','최고예요!'],gold:['반짝반짝!'],gone:['나 먼저 갈게요!'],cut:['내가 먼저예요!','새치기예요?!'],fast:['벌써요? 사랑해요!']},
    NAHANSANG:{come:['많이 주세요!','급식은 곱빼기!'],hurry:['줄이 너무 길어요','배가 고파져요…'],good:['오늘 간식 완성!','든든해요!'],gold:['황금 반찬이다!'],gone:['쫄쫄 굶었어요…'],cut:['제가 먼저 왔어요!','줄 서세요!'],fast:['우와, 빠르다!']},
    SUMAKSAE:{come:['노릇하게 부탁해요','먼저 인사할게요!'],hurry:['웃는 얼굴이 굳어요','아직인가요?'],good:['방긋!','정말 노릇해요!'],gold:['함박웃음!'],gone:['다음에 웃을게요…'],cut:['웃음이 사라졌어요!','순서를 지켜요!'],fast:['빨라서 방긋!']},
    CHILJIDO_ELDER:{come:['천천히 하게나','일곱 개도 좋네'],hurry:['허허, 아직인가','눈썹이 희어지겠네'],good:['일곱 번 고맙네!','맛이 좋구먼'],gold:['귀한 것을 보았네!'],gone:['다음에 오겠네'],cut:['어허, 내가 먼저일세!','순서를 지키게!'],fast:['허허, 빠르구먼!']},
    BANGASAYUSANG:{come:['음… 고민되네요','무엇을 먹을까요'],change:['아니, 이걸로!','다시 생각했어요!'],hurry:['생각이 길어져요','음…'],good:['깨달았어요!','마음이 편해요'],gold:['황금빛 깨달음!'],gone:['더 생각해 볼게요'],cut:['제 차례였는데요!','마음이 어지러워요!'],fast:['생각보다 빨라요!']},
    MURYEONG_KING:{come:['황금이 좋겠군','왕의 간식을 다오'],hurry:['왕이 기다리노라','왕관이 무겁구나'],good:['상을 내리마!','훌륭하도다'],gold:['이것이 황금이로다!'],gone:['돌아가겠노라'],cut:['감히 왕을 건너뛰느냐!','순서를 지켜라!'],fast:['참으로 빠르도다!']},
    GWANGGAETO_KING:{come:['부대원 몫까지!','단체로 주문한다!'],hurry:['진격이 늦어진다!','서둘러라!'],good:['승전 간식이다!','전군, 맛있게!'],gold:['황금 승전보!'],gone:['퇴각하라!'],cut:['전군, 분노하라!','내가 먼저다!'],fast:['전광석화로다!']}
  };
  function shSay(t,kind){
    const list=(SH_SAY[t.face]||{})[kind];if(!list)return;
    t.say={text:list[Math.floor(Math.random()*list.length)],ttl:kind==='come'?1.7:2};
  }
  const SH_FACES=['HOJA','NAHANSANG','SUMAKSAE','CHILJIDO_ELDER','MURYEONG_KING','BANGASAYUSANG','GWANGGAETO_KING'];
  const SH={on:false,raf:0,mode:'solo',phase:'idle',resume:'day',shops:[],W:1920,H:1080,TZ:367,time:0,dayLen:60,day:0,countdown:0,cShown:0,
    money:0,earned:0,up:{},hits:[],floats:[],sparks:[],flashes:new Map(),lastHit:new Map(),lastT:0,acc:0,bg:null,bgKey:'',best:0,stars:0,co:null,seq:0};
  const shCanvas=$('shCanvas'),sctx=shCanvas.getContext('2d',{alpha:false});
  const shImages=new Map();
  function shFace(id,mood='neutral'){
    const k=id+mood;let im=shImages.get(k);
    if(!im){im=new Image();im.src=characterPortrait(id,mood);shImages.set(k,im);}
    return im;
  }
  const shWon=n=>n.toLocaleString('ko-KR')+'원';
  function shCookTime(){return SH_COOK*Math.pow(.85,SH.mode==='solo'?SH.up.fire:0);}
  function shPrice(){return 500+(SH.mode==='solo'?SH.up.price*100:0);}
  function shPatienceMul(){return SH.mode==='solo'?1+SH.up.patience*.25:1;}
  function shGold(){return SH_GOLD+(SH.mode==='solo'?SH.up.gold*.5:0);}
  function shBurn(){return SH_BURN+(SH.mode==='solo'?SH.up.burn*.5:0);}
  // Upgrades are for the five-day game; a race starts everyone level.
  function shSpLevel(){return SH.mode==='solo'?SH.up.special:0;}
  function shSpOf(s){return SH_SP[choices[s.who]]||SH_SP.HOJA;}
  function shMakeShop(x,w,nMolds,slots,color,label){
    const molds=[];for(let i=0;i<nMolds;i++)molds.push({state:0,t:0,fill:0,q1:2,shake:0,flip:0});
    return {x,w,molds,slots,color,label,tray:[],tickets:[],selected:0,earned:0,served:0,lost:0,combo:0,spawnT:1,id:SH.seq++,face:0,rush:0,sp:0,fx:null,royal:0,who:0,specials:0};
  }
  /* ---------- Bungeoppang shop: flow ---------- */
  function shNewGame(){
    const st=SH_STAGES.find(s=>s.id===shopStage);
    // A removed selection must never launch an undefined stage.
    SH.mode=st?st.id:'solo';SH.people=st?st.people||0:0;
    SH.money=0;SH.totalEarned=0;SH.day=0;SH.retries=0;SH.up=Object.fromEntries(SH_UP.map(u=>[u.id,0]));
    SH.floats=[];SH.sparks=[];SH.bgKey='';$('shOverlay').hidden=true;
    shStartRound();
    playMood('bright');
  }
  function shStartRound(){
    const W=SH.W;SH.earned=0;SH.time=0;SH.co=null;SH.hits=[];SH.floats=[];
    $('shopScreen').querySelectorAll('.sx-stage').forEach(e=>e.remove());
    if(SH.mode==='solo'){
      SH.dayLen=60;
      SH.shops=[shMakeShop(0,W,4+SH.up.molds*2,4,SIDE_COLOR[0],'')];
    }else if(SH.mode==='versus'){
      SH.dayLen=90;
      SH.shops=[shMakeShop(0,W/2,4,3,SIDE_COLOR[0],'1P'),shMakeShop(W/2,W/2,4,3,SIDE_COLOR[1],'2P')];SH.shops[1].who=1;
    }else{
      SH.dayLen=120;
      const shop=shMakeShop(0,W,4,4,'#2f9c8c','');
      SH.shops=[shop];
      SH.co={raw:[],cooked:[],bags:[],prep:[0,0,0],packing:null,targets:{2:[10000,20000,32000],4:[10000,22000,38000]}[SH.people]};
    }
    SH.phase='countdown';SH.countdown=2.4;SH.cShown=0;SH.bgKey='';
  }
  // Each failed try at a day eases its target, so a young child is never stuck replaying it forever.
  function shTarget(){return Math.round(SH_DAYS[SH.day].target*Math.pow(.85,SH.retries||0)/100)*100;}
  function shDayInfo(){
    if(SH.mode==='solo')return SH_DAYS[SH.day];
    if(SH.mode==='versus')return {fills:3,gap:2.4,max:3};
    return {fills:3,gap:{2:4.2,4:2.6}[SH.people],max:3};
  }
  function shFloat(x,y,text,color,size=40,ttl=1){SH.floats.push({x,y,text,color,size,ttl,life:ttl});}
  function shSpark(x,y,n,colors,speed=320){
    for(let k=0;k<n&&SH.sparks.length<260;k++){
      const a=Math.random()*Math.PI*2,s=speed*(.3+Math.random()*.7);
      SH.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,ttl:.4+Math.random()*.4,c:colors[k%colors.length],sz:4+Math.random()*5});
    }
  }
  function shSpawn(s){
    const free=[];for(let i=0;i<s.slots;i++)if(!s.tickets.some(t=>t.slot===i))free.push(i);
    if(!free.length)return;
    const d=shDayInfo(),slot=free[Math.floor(Math.random()*free.length)],items={};
    const open=SH.mode==='solo'?SH_KIND_DAYS.slice(0,3+SH.day):SH_KIND_DAYS,face=open[Math.floor(Math.random()*open.length)],k=SH_KIND[face];
    let total=k.bulk?d.max+1+Math.floor(Math.random()*2):k.group?4:1+Math.floor(Math.random()*d.max),left=total;
    const one=Math.floor(Math.random()*d.fills);
    while(left-->0){const f=k.bulk?one:Math.floor(Math.random()*d.fills);items[f]=(items[f]||0)+1;}
    const p=(11+total*4)*k.wait*shPatienceMul()*(SH.people?1.5:1);
    const newcomer={slot,items,total,patience:p,maxP:p,face,kind:k,shake:0,enter:0,packed:false,id:SH.seq++};
    shSay(newcomer,'come');s.tickets.push(newcomer);newcomer.row=shRank(s,newcomer)-1;
    sfx('menu',.55,1.5);
  }
  // Place in the queue: 1 is whoever has waited longest.
  function shRank(s,t){return s.tickets.filter(o=>!o.done&&o.id<=t.id).length;}
  // Everyone moves up when the first customer is served; the slide keeps the eye on who moved.
  function shQueueStep(s){
    for(const t of s.tickets){
      if(t.done)continue;
      const place=shRank(s,t)-1;
      t.row=t.row===undefined?place:(Math.abs(place-t.row)<.01?place:t.row+(place-t.row)*.28);
    }
  }
  function shCovers(s,t){
    const pool=SH.co?SH.co.cooked:s.tray;
    const min=t.kind.minQ||0;
    return Object.entries(t.items).every(([f,n])=>pool.filter(b=>b.f===+f&&b.q>=min).length>=n);
  }
  function shTake(s,t){
    // Best-cooked buns go out first, so a burnt-looking leftover never spoils a good order.
    const pool=SH.co?SH.co.cooked:s.tray;let bonus=0;
    const royal=s.royal>0;if(royal)s.royal--;
    for(const [f,n] of Object.entries(t.items)){
      for(let k=0;k<n;k++){
        let best=-1;
        pool.forEach((b,i)=>{if(b.f===+f&&(best<0||b.q>pool[best].q))best=i;});
        // A golden bun sells for half as much again.
        if(pool[best].q===3||royal)bonus+=Math.round(shPrice()*.5)+(t.kind.goldFan?300:0);
        else if(pool[best].q===2)bonus+=100;
        pool.splice(best,1);
      }
    }
    return bonus;
  }
  // Everyone passed over gets angry, and the streak and any rush end, as when a customer walks out.
  function shQueueJump(s,t,x,y){
    for(const o of s.tickets)if(!o.done&&o.id<t.id){o.angry=2.2;o.shake=.6;shSay(o,'cut');}
    s.combo=0;
    if(s.rush>0){s.rush=0;shRushTempo();}
    shFloat(x,y-56,'순서가 틀렸어요! 연속 끊김','#c0321f',34,1.3);
    sfx('boom',.4,1.3);
  }
  // conquer: a sale made by the conquest special, which may take customers out of turn and pays extra.
  function shSale(s,t,bonus,x,y,conquer){
    const base=t.total*shPrice(),tip=Math.round(200*t.kind.tip*t.patience/t.maxP/50)*50;
    const inTurn=conquer!==undefined||shRank(s,t)===1;
    if(inTurn)s.combo++;else shQueueJump(s,t,x,y);
    if(conquer===undefined&&!SH.co&&s.sp<SH_SP_FULL){s.sp++;if(s.sp===SH_SP_FULL){sfx('item',.8,1.1);shSpark(x,y,24,['#ffe14d','#ffffff'],380);}}
    // Green on the patience bar is the speed bonus; a skipped queue earns none.
    const fast=inTurn&&t.patience/t.maxP>=SH_FAST,fastTip=fast?t.total*SH_FAST_PAY:0;
    const comboTip=Math.max(0,Math.min(s.combo-1,5))*50,rushing=s.rush>0,gain=Math.round((base+bonus+tip+comboTip+fastTip)*(rushing?2:1)*(1+(conquer||0))/10)*10;
    s.earned+=gain;s.served++;SH.earned+=gain;SH.money+=gain;
    shFloat(x,y,'+'+shWon(gain)+(rushing?' ×2':''),rushing?'#d6860c':s.color,rushing?54:44,1.1);
    if(s.combo>=3&&!rushing)shFloat(x,y-56,s.combo+'연속 손님!','#c0532f',36,1);
    if(fast)shFloat(x,y+56,'빠른 완료 +'+shWon(fastTip*(rushing?2:1)),'#167a40',34,1.1);
    if(!rushing&&s.combo>=SH_RUSH_AT){
      s.rush=SH_RUSH_TIME;sfx('goal',.8);sfx('item',.7,1.3);cheer(.4);setBgmTempo(1.12);
      shSpark(s.x+s.w/2,SH.TZ,50,['#ffd25a','#fff3c2','#ff9a3d'],520);
    }
    shSpark(x,y,16,['#ffd25a','#fff3c2','#ffffff']);
    sfx('coin',.95);if(bonus>0)sfx('menu',.5,1.6);
    t.done=true;t.leave=0;t.happy=true;shSay(t,bonus>=Math.round(shPrice()*.5)?'gold':fast?'fast':'good');
  }
  function shServe(s,t,x,y){
    if(t.done||SH.co)return;
    if(!shCovers(s,t)){t.shake=.35;sfx('soft',.7);return;}
    shSale(s,t,shTake(s,t),x,y);
  }
  function shTapMold(s,m,x,y){
    if(m.state===0){
      if(SH.co){
        if(!SH.co.raw.length){m.shake=.3;sfx('soft',.6);shFloat(x,y-60,'반죽이 없어요','#8a6a3a',26,.7);return;}
        m.fill=SH.co.raw.shift();
      }else m.fill=s.selected;
      m.state=1;m.t=0;sfx('soft',.8,1.2);shSpark(x,y,6,['#f6e3b0','#ffffff'],160);
      return;
    }
    const cook=shCookTime();
    if(m.state===3){m.state=0;m.t=0;sfx('soft',.8,.7);shFloat(x,y-50,'버렸어요','#6a5e50',26,.6);return;}
    if(m.t<cook*.55){m.shake=.25;sfx('soft',.45);return;}
    const q=m.t<cook?1:m.t<=cook+shGold()?3:2;
    if(m.state===1){m.q1=q;m.state=2;m.t=0;m.flip=.28;sfx('flip',.9);return;}
    // A full tray leaves the bun on the fire, where it keeps cooking.
    const pool=SH.co?SH.co.cooked:s.tray;
    if(pool.length>=shTrayCap()){m.shake=.3;sfx('soft',.7);shFloat(x,y-50,'완성대가 가득!','#c0532f',28,.8);return;}
    const out=Math.min(m.q1,q);
    pool.push({f:m.fill,q:out});
    m.state=0;m.t=0;sfx('wood',.8);
    shFloat(x,y-50,out===3?'황금 붕어빵!':out===2?'노릇노릇!':'조금 덜 익었어요',out===3?'#d6860c':out===2?'#b8701c':'#8a7a5a',out===3?40:out===2?32:24,.8);
    if(out>=2)shSpark(x,y,out===3?20:8,out===3?['#ffd21f','#fff3c2','#ffffff']:['#ffd25a','#ffffff'],out===3?320:220);
    if(out===3)sfx('coin',.7,1.4);
  }
  function shTrayCap(){return SH.co?SH_CO_TRAY:SH_TRAY+(SH.mode==='solo'?SH.up.tray*2:0);}
  function shRushTempo(){setBgmTempo(SH.shops.some(o=>o.rush>0)?1.12:1);}
  // A tray full of the wrong buns must not end the day, so one can be thrown away.
  function shThrow(pool,f,x,y){
    let worst=-1;pool.forEach((b,i)=>{if(b.f===f&&(worst<0||b.q<pool[worst].q))worst=i;});
    if(worst<0)return;
    pool.splice(worst,1);sfx('soft',.7,.7);shFloat(x,y,'버렸어요','#6a5e50',24,.6);
  }
  function shSpecial(s){
    if(SH.phase!=='day'||SH.co||s.sp<SH_SP_FULL)return;
    const sp=shSpOf(s),v=sp.lv[shSpLevel()],cook=shCookTime(),cx=s.x+s.w/2,cy=SH.TZ+(SH.H-SH.TZ)*.45;
    s.sp=0;s.specials++;
    if(sp.kind==='welcome'){
      for(const t of s.tickets)if(!t.done){t.patience=t.maxP;t.hurried=false;}
      if(v)s.fx={kind:'calm',time:v,max:v};
    }else if(sp.kind==='feast'){
      // Every bun on the fire comes out at once, even past the tray's limit; the tray takes no more until it is sold down.
      let golds=v>=2?99:v;
      for(const m of s.molds){
        if(m.state!==1&&m.state!==2)continue;
        s.tray.push({f:m.fill,q:golds-->0?3:2});
        m.state=0;m.t=0;
      }
    }else if(sp.kind==='tile')s.fx={kind:'tile',time:v,max:v};
    else if(sp.kind==='blaze'){
      // Empty molds take what the waiting customers still lack, then the chosen filling.
      const need={};
      for(const t of s.tickets)if(!t.done)for(const [f,n] of Object.entries(t.items))need[f]=(need[f]||0)+n;
      for(const b of s.tray)need[b.f]=(need[b.f]||0)-1;
      for(const m of s.molds)if(m.state===1||m.state===2)need[m.fill]=(need[m.fill]||0)-1;
      for(const m of s.molds)if(m.state===0){
        const f=+(Object.keys(need).filter(k=>need[k]>0).sort((a,b)=>need[b]-need[a])[0]??s.selected);
        need[f]=(need[f]||0)-1;m.fill=f;m.state=1;m.t=0;
      }
      s.fx={kind:'blaze',time:v,max:v};
    }
    else if(sp.kind==='royal')s.royal=v;
    else if(sp.kind==='calm')s.fx={kind:'calm',time:v,max:v};
    else if(sp.kind==='conquer'){
      for(const t of s.tickets.filter(o=>!o.done).sort((a,b)=>a.id-b.id))
        if(shCovers(s,t))shSale(s,t,shTake(s,t),cx,cy,v);
    }
    shSpark(cx,cy,60,['#ffe14d','#fff3c2','#ff9a3d'],560);
    // Time stands still while the cut-in plays.
    sxPlay($('shopScreen'),s.who,sp,shFaced());
    SH.cut={time:SH_CUT,cues:[.08,.3]};SH.phase='cut';
  }
  function shStepShop(s,dt){
    const d=shDayInfo(),cook=shCookTime();
    s.spawnT-=dt;
    if(s.spawnT<=0){shSpawn(s);s.spawnT=d.gap*(.85+Math.random()*.3);}
    if(s.rush>0){s.rush-=dt;if(s.rush<=0){s.rush=0;s.combo=0;shRushTempo();}}
    if(s.fx){s.fx.time-=dt;if(s.fx.time<=0)s.fx=null;}
    for(const m of s.molds){
      m.shake=Math.max(0,m.shake-dt);m.flip=Math.max(0,m.flip-dt);
      if(m.state===1||m.state===2){
        m.t+=dt*(s.fx&&s.fx.kind==='blaze'?2:1);
        // The tile smile holds a ready bun in its golden moment.
        if(s.fx&&s.fx.kind==='tile'&&m.t>cook+shGold()*.9)m.t=cook+shGold()*.9;
        // Under the seven-branch fire nothing burns: a slow hand must not lose what the fire hurried.
        if(s.fx&&s.fx.kind==='blaze'&&m.t>cook+shGold())m.t=cook+shGold()+.01;
        if(m.t>cook+shBurn()){m.state=3;m.t=0;sfx('boom',.35);}
      }
    }
    for(let i=s.tickets.length-1;i>=0;i--){
      const t=s.tickets[i];
      t.enter=Math.min(1,t.enter+dt*3);t.shake=Math.max(0,t.shake-dt);t.angry=Math.max(0,(t.angry||0)-dt);
      if(t.done){if(t.say){t.say.ttl-=dt;if(t.say.ttl<=0)t.say=null;}t.leave+=dt*.9;if(t.leave>=1)s.tickets.splice(i,1);continue;}
      if(t.say){t.say.ttl-=dt;if(t.say.ttl<=0)t.say=null;}
      if(!(s.fx&&s.fx.kind==='calm'))t.patience-=dt;
      if(!t.hurried&&t.patience<t.maxP*.3){t.hurried=true;shSay(t,'hurry');}
      if(t.kind.changes&&!t.changed&&!t.packed&&d.fills>1&&t.patience<t.maxP*.55){
        // Halfway through the wait they think again, and give a little more time for it.
        t.changed=true;t.shake=.45;t.patience+=4;
        const had=+Object.keys(t.items)[0],next=(had+1+Math.floor(Math.random()*(d.fills-1)))%d.fills;
        t.items={[next]:t.total};sfx('menu',.7,.8);shSay(t,'change');
      }
      if(t.patience<=0){
        t.done=true;t.leave=0;t.happy=false;s.lost++;s.combo=0;sfx('soft',.9,.7);
        if(s.rush>0){s.rush=0;shRushTempo();}
        shSay(t,'gone');
        if(SH.co)SH.co.bags=SH.co.bags.filter(b=>b.t!==t);
      }
    }
  }
  /* ---------- Bungeoppang shop: co-op stations ---------- */
  function shCoPrep(f){
    const c=SH.co;
    if(c.prep[f]>0)return;
    if(c.raw.length+c.prep.filter(p=>p>0).length>=5){sfx('soft',.6);shFloat(240,SH.TZ+70,'반죽이 가득해요','#8a6a3a',26,.7);return;}
    c.prep[f]=.55;sfx('tap',.6);
  }
  function shCoPack(s,t,x,y){
    const c=SH.co;
    if(t.done||t.packed||c.packing)return;
    if(!shCovers(s,t)){t.shake=.35;sfx('soft',.7);return;}
    t.bonus=shTake(s,t);t.packed=true;c.packing={t,time:.5};sfx('flip',.7,.8);
  }
  function shMakeBag(t){
    const due=t.total*500;
    const paid=due%1000===0?due+1000:Math.ceil(due/1000)*1000;
    const change=paid-due,wrong=new Set();
    for(const v of [change+500,change-500,change+1000,change+200])if(v>0&&v!==change&&wrong.size<2)wrong.add(v);
    const opts=[change,...wrong].sort(()=>Math.random()-.5);
    return {t,due,paid,change,opts,shake:0};
  }
  function shCoPay(bag,v,x,y){
    const c=SH.co;
    if(v!==bag.change){
      // A wrong answer only costs time: nobody should be punished for arithmetic in front of the class.
      bag.shake=.35;sfx('soft',.9);shFloat(x,y-50,'다시 세어 봐요','#b8531f',28,.8);return;
    }
    c.bags=c.bags.filter(b=>b!==bag);
    shSale(SH.shops[0],bag.t,bag.t.bonus||0,x,y);
  }
  function shStepCo(dt){
    const c=SH.co;
    c.prep.forEach((p,f)=>{if(p>0){c.prep[f]=p-dt;if(c.prep[f]<=0){c.prep[f]=0;c.raw.push(f);sfx('tap',.5,1.3);}}});
    if(c.packing){c.packing.time-=dt;if(c.packing.time<=0){const t=c.packing.t;c.packing=null;if(!t.done)c.bags.push(shMakeBag(t));}}
    for(const b of c.bags)b.shake=Math.max(0,b.shake-dt);
  }
  function shEndRound(){
    SH.phase='over';setBgmTempo(1);$('shopScreen').querySelectorAll('.sx-stage').forEach(e=>e.remove());
    SH.shops.forEach(s=>{s.rush=0;s.tickets.forEach(t=>{if(!t.done){t.done=true;t.leave=0;t.happy=false;}});});
    if(SH.mode==='solo'){
      const ok=SH.earned>=shTarget(),last=SH.day===SH_DAYS.length-1;
      if(ok)SH.totalEarned+=SH.earned;
      if(ok&&last){shFinishSolo();return;}
      SH.dayOk=ok;SH.phase='shopping';
      sfx(ok?'goal':'soft',ok?1:.9);if(ok)cheer(.6);
      return;
    }
    if(SH.mode==='versus'){
      const [a,b]=SH.shops.map(s=>s.earned),w=a===b?-1:(a>b?0:1);
      hofRecord('shop_vs2',0,a);hofRecord('shop_vs2',1,b);
      let title='무승부!';
      if(w>=0){
        const repeat=streak.side===w&&streak.id===choices[w];
        streak={side:w,id:choices[w],count:repeat?streak.count+1:1};
        title=streak.count>=2?`${nameFor(w)} ${streak.count}연승!`:`${nameFor(w)} 승리!`;
      }
      SH.winner=w;sfx('goal',1.1);cheer(1);victoryJingle();
      shResult(title,`${shWon(a)} : ${shWon(b)}`,[['다음 도전자 ▶','primary',()=>{leaveShop();enterSelection();}],['↻ 바로 재대결','',shNewGame],['← 모음집','',shHome]]);
      return;
    }
    const tg=SH.co.targets,stars=tg.filter(v=>SH.earned>=v).length;
    SH.stars=stars;
    hofRecordTeam(SH.people===2?'shop_co2':'shop_co4',HOF.players.slice(0,SH.people),SH.earned);
    sfx('goal',1);cheer(.5+stars*.25);victoryJingle();
    shResult(['조금 아쉬워요','잘했어요!','훌륭해요!','최고의 팀!'][stars]+'  '+'★'.repeat(stars)+'☆'.repeat(3-stars),`매출 ${shWon(SH.earned)} · 손님 ${SH.shops[0].served}명 · 다음 별 ${stars<3?shWon(tg[stars]):'완성!'}`,[['↻ 한 번 더','primary',()=>replayGate(shNewGame)],['인물 변경','',()=>{leaveShop();enterSelection();}],['← 모음집','',shHome]]);
  }
  function shFinishSolo(){
    SH.phase='over';
    hofRecord('shop_solo',0,SH.totalEarned);
    const prev=+preference('shop-best','0');const record=SH.money>prev;
    if(record)remember('shop-best',String(SH.money));
    sfx('goal',1.1);cheer(1.2);victoryJingle();
    shResult('5일 장사 대성공!',`5일 총매출 ${shWon(SH.totalEarned)} · 남은 돈 ${shWon(SH.money)}`+(record?' · 기기 최고 기록!':` · 기기 최고 기록 ${shWon(prev)}`),[['↻ 처음부터','primary',shNewGame],['인물 변경','',()=>{leaveShop();enterSelection();}],['← 모음집','',shHome]]);
  }
  function shHome(){streak={side:-1,id:null,count:0};leaveShop();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});}
  function shResult(title,detail,list){
    const bs=list.map(([l,c,f])=>button(l,c,f));
    bs.forEach(b=>{b.disabled=true;setTimeout(()=>{b.disabled=false;},1000);});
    setTimeout(()=>{if(SH.on&&SH.phase==='over')shOverlay(title,detail,bs);},500);
  }
  function shOverlay(title,detail,actions){
    $('shOverlay').hidden=false;$('shOverlayTitle').textContent=title;$('shOverlayDetail').textContent=detail;$('shOverlayActions').replaceChildren(...actions);
  }
  function shOpenMenu(){
    if(!SH.on||SH.phase==='over'||SH.phase==='paused'||SH.phase==='cut')return;
    SH.resume=SH.phase;SH.phase='paused';
    const label=()=>soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';
    const sound=button(label(),'',()=>{cycleSound();sound.textContent=label();});
    shOverlay('잠깐 쉬는 중','',[
      button('▶ 계속','primary',()=>{$('shOverlay').hidden=true;SH.phase=SH.resume;}),
      button('↻ 처음부터','',shNewGame),
      button('인물 변경','',()=>{leaveShop();enterSelection();}),
      button('← 모음집','',shHome),
      sound,
    ]);
  }
  function shBuy(u){
    const lvl=SH.up[u.id];if(lvl>=u.costs.length)return;
    const cost=u.costs[lvl];
    if(SH.money<cost){sfx('soft',.8);return;}
    SH.money-=cost;SH.up[u.id]++;sfx('coin',1);sfx('item',.6,1.2);
  }
  function shNextDay(){
    if(SH.dayOk){SH.day++;SH.retries=0;}else SH.retries=(SH.retries||0)+1;
    sfx('menu',.9);shStartRound();
  }
  function shStep(dt){
    if(SH.phase==='countdown'){
      SH.countdown-=dt;
      const show=Math.ceil(SH.countdown/.8);
      if(show!==SH.cShown&&show>0){SH.cShown=show;sfx('menu',1,1+(3-show)*.16);}
      if(SH.countdown<=0){SH.phase='day';sfx('goal',.8);}
      return;
    }
    if(SH.phase==='cut'){
      SH.cut.time-=dt;sxCue($('shopScreen'),SH.cut.cues,SH_CUT-SH.cut.time);
      if(SH.cut.time<=0){SH.phase='day';$('shopScreen').classList.add('sx-done');}
      return;
    }
    if(SH.phase!=='day')return;
    SH.time+=dt;
    for(const s of SH.shops)shStepShop(s,dt);
    if(SH.co)shStepCo(dt);
    if(SH.time>=SH.dayLen)shEndRound();
  }
  /* ---------- Bungeoppang shop: touch ---------- */
  function shPoint(e){
    const r=shCanvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)/r.width*SH.W,y:(e.clientY-r.top)/r.height*SH.H};
  }
  function shHit(x,y){
    // Latest-drawn region wins. Acts on touch-down, so several children can work at the same instant.
    for(let i=SH.hits.length-1;i>=0;i--){
      const h=SH.hits[i];
      if(x>=h.x-8&&y>=h.y-8&&x<=h.x+h.w+8&&y<=h.y+h.h+8)return h;
    }
    return null;
  }
  shCanvas.addEventListener('pointerdown',e=>{
    if(!SH.on||(SH.phase!=='day'&&SH.phase!=='shopping'&&SH.phase!=='countdown'))return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();
    const p=shPoint(e);
    // A touch on the turned half is turned back before it meets the game; the shared time and menu strip stays put.
    if(shFaced()&&p.x>=SH.W/2&&!(p.y>=SH.H-64&&p.x<=SH.W/2+156)){p.x=SH.W*1.5-p.x;p.y=SH.H-p.y;}
    const h=shHit(p.x,p.y);if(!h)return;
    // Infrared boards can report one finger twice in quick succession.
    const now=performance.now();if(now-(SH.lastHit.get(h.key)||0)<90)return;
    SH.lastHit.set(h.key,now);SH.flashes.set(h.key,now);
    h.fn(h.x+h.w/2,h.y+h.h/2);
  },{passive:false});
  /* ---------- Bungeoppang shop: drawing ---------- */
  function shFish(g,x,y,s,base,alpha=1,mirror=false){
    g.save();g.translate(x,y);if(mirror)g.scale(-1,1);g.scale(s,s);g.globalAlpha*=alpha;
    g.fillStyle=base;g.strokeStyle='rgba(70,40,10,.75)';g.lineWidth=3;
    g.beginPath();g.moveTo(-50,0);g.bezierCurveTo(-38,-34,20,-40,44,-8);g.lineTo(70,-28);g.bezierCurveTo(62,-8,62,8,70,28);g.lineTo(44,8);g.bezierCurveTo(20,40,-38,34,-50,0);g.closePath();g.fill();g.stroke();
    g.strokeStyle='rgba(70,40,10,.32)';g.lineWidth=2.5;
    for(let i=0;i<3;i++)for(let j=-1;j<=1;j++){g.beginPath();g.arc(-6+i*16,j*14,8,-1.1,1.1);g.stroke();}
    g.fillStyle='rgba(50,28,8,.85)';g.beginPath();g.arc(-30,-7,5,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.ellipse(-8,-20,24,6,-.15,0,Math.PI*2);g.fill();
    g.restore();
  }
  function shBunColor(state,t,cook){
    const raw=[244,224,170],gold=[222,152,60],burnt=[56,38,28];
    if(state===3)return `rgb(${burnt})`;
    const k=clamp(t/cook,0,1),over=clamp((t-cook)/shBurn(),0,1);
    const mix=(a,b,q)=>a.map((v,i)=>Math.round(v+(b[i]-v)*q));
    const c=over>0?mix(gold,burnt,over*over*.8):mix(raw,gold,k);
    return `rgb(${c})`;
  }
  function shText(g,str,x,y,size,color,font='"HojaTitle",sans-serif',stroke=null){
    g.font=`${size}px ${font}`;g.textAlign='center';g.textBaseline='middle';
    if(stroke){g.lineJoin='round';g.lineWidth=size*.2;g.strokeStyle=stroke;g.strokeText(str,x,y);}
    g.fillStyle=color;g.fillText(str,x,y);
  }
  function shRound(g,x,y,w,h,r,fill,stroke,lw=3){
    g.beginPath();g.roundRect(x,y,w,h,r);if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}
  }
  function shBuildBg(){
    const c=SH.bg||document.createElement('canvas'),k=shCanvas.width/SH.W;
    c.width=shCanvas.width;c.height=shCanvas.height;
    const g=c.getContext('2d');g.setTransform(k,0,0,k,0,0);
    const {W,H,TZ}=SH;
    const sky=g.createLinearGradient(0,0,0,TZ);sky.addColorStop(0,'#bfe3ee');sky.addColorStop(1,'#f4ecd8');
    g.fillStyle=sky;g.fillRect(0,0,W,TZ);
    g.fillStyle='#d9d0ba';g.fillRect(0,TZ-46,W,46);
    // Awning across the counter
    const sw=W/24;
    for(let i=0;i<24;i++){
      g.fillStyle=i%2?'#fff6e3':'#d9573f';
      g.beginPath();g.moveTo(i*sw,TZ-34);g.lineTo((i+1)*sw,TZ-34);g.lineTo((i+1)*sw,TZ-6);g.arc((i+.5)*sw,TZ-6,sw/2,0,Math.PI);g.closePath();g.fill();
    }
    const wood=g.createLinearGradient(0,TZ,0,H);wood.addColorStop(0,'#9c6b3f');wood.addColorStop(1,'#6e4726');
    g.fillStyle=wood;g.fillRect(0,TZ,W,H-TZ);
    g.strokeStyle='rgba(60,35,15,.25)';g.lineWidth=2;
    for(let y=TZ+40;y<H;y+=46){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
    SH.bg=c;SH.bgKey=SH.mode+shCanvas.width;
  }
  function shHitAdd(key,x,y,w,h,fn){SH.hits.push({key,x,y,w,h,fn});}
  function shFlash(key,now){return Math.max(0,1-(now-(SH.flashes.get(key)||0))/140);}
  function shDrawMold(g,s,m,i,x,y,w,h,now){
    const cook=shCookTime(),sx=m.shake>0?Math.sin(now/20)*6:0,key='m'+s.id+'_'+i,cx=x+w/2+sx,cy=y+h/2;
    shRound(g,x+sx,y,w,h,18,'#33302e','#171514',4);
    shRound(g,x+10+sx,y+10,w-20,h-20,14,'#46413d',null);
    const size=Math.min(w/150,h/110);
    if(m.state===0){
      shFish(g,cx,cy,size,'#2a2725',.9);
      shText(g,SH.co?(SH.co.raw.length?'붓기':'반죽 대기'):'붓기',cx,cy,Math.max(22,Math.min(h*.17,w*.19)),SH.co&&!SH.co.raw.length?'#7f7a72':'#ffe6a8');
    }else{
      const lift=m.flip>0?1+Math.sin(m.flip/.28*Math.PI)*.2:1;
      shFish(g,cx,cy,size*lift,shBunColor(m.state,m.t,cook));
      g.fillStyle=SH_FILL[m.fill].c;g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(x+w-26+sx,y+26,13,0,Math.PI*2);g.fill();g.stroke();
      if(m.state!==3){
        const prog=clamp(m.t/cook,0,1),ready=m.t>=cook,gold=ready&&m.t<=cook+shGold(),danger=m.t>cook+shBurn()*.55&&!(s.fx&&(s.fx.kind==='tile'||s.fx.kind==='blaze'));
        const col=danger?'#e83a24':gold?'#ffd21f':ready?'#3fd178':'#9fb7c9';
        g.fillStyle='rgba(0,0,0,.5)';g.fillRect(x+14+sx,y+h-22,w-28,10);
        g.fillStyle=col;g.fillRect(x+14+sx,y+h-22,(w-28)*(ready?clamp(1-(m.t-cook)/shBurn(),0,1):prog),10);
        if(ready){
          const p=.5+.5*Math.sin(now/120);
          g.strokeStyle=col;g.lineWidth=6+p*4;g.beginPath();g.roundRect(x+3+sx,y+3,w-6,h-6,16);g.stroke();
          shText(g,gold?(m.q1===3||m.state===1?'황금 타이밍!':'꺼내!'):(m.state===1?'뒤집어!':'꺼내!'),cx,y+Math.max(24,h*.17),Math.max(26,h*(gold?.17:.2)),gold?'#ffe44d':'#fff',undefined,'rgba(0,0,0,.7)');
        }else if(Math.random()<.04)SH.sparks.push({x:cx+(Math.random()-.5)*w*.5,y:cy,vx:0,vy:-70,ttl:.6,c:'rgba(255,255,255,.55)',sz:6});
      }else{
        shText(g,'탔어요! 버리기',cx,y+Math.max(24,h*.17),Math.max(20,h*.15),'#ffb29c',undefined,'rgba(0,0,0,.7)');
      }
    }
    const fl=shFlash(key,now);if(fl>0){g.fillStyle=`rgba(255,255,255,${fl*.3})`;g.beginPath();g.roundRect(x,y,w,h,18);g.fill();}
    shHitAdd(key,x,y,w,h,()=>shTapMold(s,m,cx,cy));
  }
  function shDrawSpecial(g,s,x,y,w,h,now){
    const sp=shSpOf(s),full=s.sp>=SH_SP_FULL,key='sp'+s.id,p=.5+.5*Math.sin(now/130),fx=s.fx||(s.royal>0?{kind:'royal'}:null);
    shRound(g,x,y,w,h,16,full?'#ffe14d':'#4a3a2c',full?'#fff':'#2a1f16',full?6+p*4:3);
    if(full){
      g.save();g.globalAlpha=.35+p*.35;g.strokeStyle='#ff9a3d';g.lineWidth=14;g.beginPath();g.roundRect(x-6,y-6,w+12,h+12,20);g.stroke();g.restore();
      shText(g,'필살기!',x+w/2,y+h*.3,Math.min(40,w*.24),'#7a2a1b');
      shText(g,sp.name,x+w/2,y+h*.6,Math.min(24,w*.13),'#5a3a1f','"HojaBody",sans-serif');
      shText(g,'누르기',x+w/2,y+h*.84,Math.min(22,w*.13),'#7a2a1b','"HojaBody",sans-serif');
    }else{
      shText(g,'필살기',x+w/2,y+h*.24,Math.min(30,w*.18),'#ffe6a8');
      const n=SH_SP_FULL,r=Math.min(w/(n*2.6),h*.09),gx=x+w/2-(n-1)*r*1.3;
      for(let i=0;i<n;i++){g.fillStyle=i<s.sp?'#ffd21f':'rgba(255,255,255,.18)';g.beginPath();g.arc(gx+i*r*2.6,y+h*.5,r,0,Math.PI*2);g.fill();}
      const left=fx&&fx.time?Math.ceil(fx.time)+'초':s.royal>0?s.royal+'명 남음':'팔 때마다 참';
      shText(g,left,x+w/2,y+h*.78,Math.min(20,w*.12),fx?'#ffe14d':'#c9b89a','"HojaBody",sans-serif');
    }
    if(fx&&fx.time){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+12,y+h-12,w-24,6);g.fillStyle='#ffe14d';g.fillRect(x+12,y+h-12,(w-24)*fx.time/fx.max,6);}
    const fl=shFlash(key,now);if(fl>0){g.fillStyle=`rgba(255,255,255,${fl*.4})`;g.beginPath();g.roundRect(x,y,w,h,16);g.fill();}
    if(full)shHitAdd(key,x,y,w,h,()=>shSpecial(s));
  }
  function shMoldGrid(g,s,x,y,w,h,now){
    const n=s.molds.length,cols=n<=4?(w>h*1.6?4:2):n<=6?3:4,rows=Math.ceil(n/cols),gap=12;
    const cw=(w-gap*(cols-1))/cols,ch=(h-gap*(rows-1))/rows;
    s.molds.forEach((m,i)=>shDrawMold(g,s,m,i,x+(i%cols)*(cw+gap),y+Math.floor(i/cols)*(ch+gap),cw,ch,now));
  }
  function shItemIcons(g,items,x,y,size){
    let cx=x;
    for(const [f,n] of Object.entries(items)){
      const c=SH_FILL[+f];
      g.fillStyle=c.c;g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=2;g.beginPath();g.arc(cx+size/2,y,size/2,0,Math.PI*2);g.fill();g.stroke();
      shText(g,String(n),cx+size/2,y+1,size*.62,c.t);
      shText(g,c.n,cx+size/2,y+size*.78,size*.42,'#3b3229','"HojaBody",sans-serif');
      cx+=size*1.5;
    }
  }
  function shDrawCustomers(g,now){
    const {TZ}=SH;
    for(const s of SH.shops){
      const slotW=s.w/s.slots;
      shQueueStep(s);
      for(const t of s.tickets){
        const rush=clamp(t.patience/t.maxP,0,1);
        const mad=!t.done&&t.angry>0,mood=t.done?(t.happy?'happy':'sad'):mad||rush<.3?'angry':rush<SH_FAST?'surprised':'neutral';
        const cx=s.x+slotW*(t.row+.5)+(mad?Math.sin(now/30)*9:0),off=(1-t.enter)*-120+(t.done?t.leave*-160:0);
        const size=TZ*.66,im=shFace(t.face,mood);
        g.save();g.globalAlpha=t.done?1-t.leave:t.enter;
        if(im.complete&&im.naturalWidth)g.drawImage(im,cx-size/2,TZ-46-size+6-off*-.2+(t.done?t.leave*30:0),size,size);
        if(!t.done){
          const bw=Math.min(slotW*.8,230),bh=62,by=10;
          const rank=shRank(s,t);
          shRound(g,cx-bw/2,by,bw,bh,14,mad?'#ffe3dc':'#fffaf0',mad?'#d8321f':rank===1?'#e0a20c':'#3b3229',mad||rank===1?5:3);
          const ic=Object.keys(t.items).length,sz=30;
          shItemIcons(g,t.items,cx-(ic*sz*1.5-sz*.5)/2,by+22,sz);
        }
        if(t.say){
          // Under the order while waiting, in its place once the order is finished.
          const fs=26,by=t.done?12:78;
          g.font=`${fs}px "HojaBody",sans-serif`;
          const tw=Math.min(g.measureText(t.say.text).width+30,slotW*.96),bh=44;
          g.globalAlpha=(t.done?Math.min(1,(1-t.leave)*2.5):1)*Math.min(1,t.say.ttl*4);
          shRound(g,cx-tw/2,by,tw,bh,14,'#ffffff','#3b3229',3);
          g.fillStyle='#ffffff';g.strokeStyle='#3b3229';g.lineWidth=3;g.beginPath();g.moveTo(cx-10,by+bh-1);g.lineTo(cx+10,by+bh-1);g.lineTo(cx,by+bh+12);g.closePath();g.fill();g.stroke();
          g.fillStyle='#ffffff';g.fillRect(cx-11,by+bh-4,22,4);
          shText(g,t.say.text,cx,by+bh/2+1,fs,'#3b3229','"HojaBody",sans-serif');
        }
        g.restore();
      }
    }
  }
  function shTicket(g,s,t,x,y,w,h,now,label,ready,fn){
    const sx=t.shake>0?Math.sin(now/18)*7:0,key='t'+t.id,rush=clamp(t.patience/t.maxP,0,1);
    const rank=shRank(s,t);
    const mad=t.angry>0;
    shRound(g,x+sx,y,w,h,14,mad?'#ffe3dc':ready?'#d7f5da':'#fff8e8',mad?'#d8321f':rank===1?'#e0a20c':ready?'#2ea85c':'#7a6a54',mad||rank===1?7:ready?6:3);
    const im=shFace(t.face,mad?'angry':'neutral');
    const fs=Math.min(h-10,70);
    if(im.complete&&im.naturalWidth)g.drawImage(im,x+8+sx,y+(h-fs-14)/2,fs,fs);
    shItemIcons(g,t.items,x+fs+22+sx,y+h*.36,Math.min(42,h*.42));
    if(label)shText(g,label,x+w-Math.min(84,w*.2)+sx,y+h*.56,Math.min(30,h*.3),ready?'#167a40':'#9a8a70');
    if(t.kind.tag)shText(g,t.kind.tag,x+w-Math.min(120,w*.3)+sx,y+h*.2,Math.min(20,h*.2),'#a2552a','"HojaBody",sans-serif');
    g.fillStyle='rgba(0,0,0,.14)';g.fillRect(x+10+sx,y+h-14,w-20,8);
    g.fillStyle=s.fx&&s.fx.kind==='calm'?'#4ab8ff':rush<.3?'#e83a24':rush<SH_FAST?'#f2a93b':'#3fbf74';g.fillRect(x+10+sx,y+h-14,(w-20)*rush,8);
    const fl=shFlash(key,now);if(fl>0){g.fillStyle=`rgba(255,255,255,${fl*.4})`;g.beginPath();g.roundRect(x,y,w,h,14);g.fill();}
    shHitAdd(key,x,y,w,h,()=>fn(x+w/2,y+h/2));
  }
  function shDrawClassicShop(g,s,now){
    const {TZ,H}=SH,pad=14,top=TZ+10,bot=H-72,x0=s.x+pad,w=s.w-2*pad,h=bot-top;
    const d=shDayInfo(),fw=Math.max(112,w*.105),gridW=w*.5,rightX=x0+fw+gridW+24,rightW=w-fw-gridW-24;
    // Filling picker, with the special button below it
    const spH=SH.co?0:Math.min(170,h*.3),fh=(h-spH-(spH?12:0)-10*(d.fills-1))/d.fills;
    if(spH)shDrawSpecial(g,s,x0,bot-spH,fw,spH,now);
    for(let f=0;f<d.fills;f++){
      const c=SH_FILL[f],y=top+f*(fh+10),sel=s.selected===f,key='f'+s.id+'_'+f;
      shRound(g,x0,y,fw,fh,16,c.c,sel?'#fff':'rgba(0,0,0,.4)',sel?8:3);
      shText(g,c.n,x0+fw/2,y+fh/2,Math.min(38,fw*.3,fh*.34),c.t);
      if(sel)shText(g,'선택',x0+fw/2,y+fh/2+Math.min(34,fh*.28),Math.min(22,fw*.18),c.t,'"HojaBody",sans-serif');
      const fl=shFlash(key,now);if(fl>0){g.fillStyle=`rgba(255,255,255,${fl*.4})`;g.beginPath();g.roundRect(x0,y,fw,fh,16);g.fill();}
      shHitAdd(key,x0,y,fw,fh,()=>{s.selected=f;sfx('menu',.6,1.2);});
    }
    shMoldGrid(g,s,x0+fw+12,top,gridW,h,now);
    // Tray
    const trayH=Math.min(112,h*.2);
    shRound(g,rightX,top,rightW,trayH,14,'#f7ecd3','#7a6a54',3);
    const cap=shTrayCap(),full=s.tray.length>=cap;
    shText(g,'완성',rightX+44,top+trayH*.3,26,'#7a5f33');
    shText(g,s.tray.length+'/'+cap,rightX+44,top+trayH*.6,24,full?'#d4432a':'#7a5f33');
    shText(g,'눌러서 버리기',rightX+44,top+trayH*.86,Math.min(15,rightW*.04),'#9a7f55','"HojaBody",sans-serif');
    const counts={};s.tray.forEach(b=>{counts[b.f]=(counts[b.f]||0)+1;});
    let tx=rightX+84;
    for(let f=0;f<d.fills;f++){
      const size=Math.min(rightW*.13,trayH*.42);
      shFish(g,tx+size*.75,top+trayH*.4,size/70,'#de983c',counts[f]?1:.25);
      g.fillStyle=SH_FILL[f].c;g.beginPath();g.arc(tx+size*.75,top+trayH*.4,size*.3,0,Math.PI*2);g.fill();
      shText(g,'×'+(counts[f]||0),tx+size*.75,top+trayH*.82,Math.min(26,trayH*.26),'#3b3229');
      if(s.tray.some(b=>b.f===f&&b.q===3))shText(g,'★',tx+size*1.45,top+trayH*.2,Math.min(30,trayH*.3),'#e0a20c');
      const cell=(rightW-96)/d.fills,fx=tx+size*.75;
      if(counts[f])shHitAdd('tray'+s.id+'_'+f,tx-4,top,cell,trayH,()=>shThrow(s.tray,f,fx,top+trayH*.2));
      tx+=cell;
    }
    // Orders in arrival order: the top one is always next.
    const ty=top+trayH+10,th=(bot-ty-8*(s.slots-1))/s.slots;
    for(const t of s.tickets){
      if(t.done)continue;
      const y=ty+t.row*(th+8),ready=shCovers(s,t);
      shTicket(g,s,t,rightX,y,rightW,th,now,ready?'주기!':'',ready,(cx,cy)=>shServe(s,t,cx,cy));
    }
  }
  const SH_CO_COLORS={2:['#2f9c8c','#2f9c8c','#e0694f','#e0694f'],4:['#2f9c8c','#3f8ee0','#d6a01f','#e0694f']};
  function shDrawCo(g,now){
    const {TZ,H,W}=SH,c=SH.co,s=SH.shops[0],colors=SH_CO_COLORS[SH.people],names=['① 반죽','② 굽기','③ 포장','④ 계산'];
    const pad=10,top=TZ+8,bot=H-72,cw=(W-pad*5)/4,head=46;
    for(let i=0;i<4;i++){
      const x=pad+i*(cw+pad);
      shRound(g,x,top,cw,bot-top,16,'rgba(255,248,232,.92)',colors[i],5);
      shRound(g,x,top,cw,head,{tl:14,tr:14,bl:0,br:0},colors[i],null);
      shText(g,names[i],x+cw/2,top+head/2+1,28,'#fff');
    }
    const body=top+head+8,bh=bot-body-8;
    // ① Batter station
    {
      const x=pad+8,w=cw-16,rowH=(bh-96)/3;
      for(let f=0;f<3;f++){
        const y=body+f*(rowH+6),fc=SH_FILL[f],key='p'+f;
        shRound(g,x,y,w,rowH-2,14,fc.c,'rgba(0,0,0,.4)',3);
        shText(g,fc.n+' 반죽',x+w/2,y+rowH/2,Math.min(36,rowH*.34),fc.t);
        if(c.prep[f]>0){g.fillStyle='rgba(255,255,255,.55)';g.fillRect(x+8,y+rowH-18,(w-16)*(1-c.prep[f]/.55),8);}
        const fl=shFlash(key,now);if(fl>0){g.fillStyle=`rgba(255,255,255,${fl*.4})`;g.beginPath();g.roundRect(x,y,w,rowH-2,14);g.fill();}
        shHitAdd(key,x,y,w,rowH-2,()=>shCoPrep(f));
      }
      const qy=bot-86;
      shText(g,'굽기로 ▶',x+w-56,qy-2+36,22,'#7a5f33','"HojaBody",sans-serif');
      c.raw.forEach((f,i)=>{g.fillStyle=SH_FILL[f].c;g.strokeStyle='#3b3229';g.lineWidth=3;g.beginPath();g.arc(x+30+i*50,qy+36,21,0,Math.PI*2);g.fill();g.stroke();});
    }
    // ② Grill
    shMoldGrid(g,s,pad+(cw+pad)+8,body,cw-16,bh,now);
    // ③ Packing: cooked buns and the order cards
    {
      const x=pad+2*(cw+pad)+8,w=cw-16,tray=Math.min(92,bh*.2);
      shRound(g,x,body,w,tray,12,'#f7ecd3','#7a6a54',2);
      const counts={};c.cooked.forEach(b=>{counts[b.f]=(counts[b.f]||0)+1;});
      for(let f=0;f<3;f++){
        const ix=x+w*(f+.5)/3;
        g.fillStyle=SH_FILL[f].c;g.beginPath();g.arc(ix-22,body+tray/2,17,0,Math.PI*2);g.fill();
        shText(g,'×'+(counts[f]||0),ix+14,body+tray/2,28,'#3b3229');
        if(c.cooked.some(b=>b.f===f&&b.q===3))shText(g,'★',ix+44,body+tray*.28,22,'#e0a20c');
        if(counts[f])shHitAdd('coTray'+f,x+w*f/3,body,w/3,tray,()=>shThrow(c.cooked,f,ix,body));
      }
      const ty=body+tray+8,th=(bh-tray-8-6*3)/4;
      for(const t of s.tickets){
        if(t.done)continue;
        const y=ty+t.row*(th+6);
        if(t.packed){shRound(g,x,y,w,th,12,'#e8e3d6','#a59a85',2);shText(g,'포장 끝 ▶ 계산으로',x+w/2,y+th/2,Math.min(24,th*.28),'#7a6a54','"HojaBody",sans-serif');continue;}
        const ready=shCovers(s,t);
        shTicket(g,s,t,x,y,w,th,now,ready?'포장!':'',ready,(cx,cy)=>shCoPack(s,t,cx,cy));
      }
      if(c.packing){shText(g,'포장 중…',x+w/2,body+tray/2-30,26,'#c0532f');}
    }
    // ④ Till: work out the change
    {
      const x=pad+3*(cw+pad)+8,w=cw-16,rows=3,rowH=(bh-6*(rows-1))/rows;
      c.bags.slice(0,rows).forEach((b,i)=>{
        const y=body+i*(rowH+6),sx=b.shake>0?Math.sin(now/18)*7:0;
        shRound(g,x+sx,y,w,rowH,12,'#fff8e8','#7a6a54',3);
        const im=shFace(b.t.face);
        if(im.complete&&im.naturalWidth)g.drawImage(im,x+6+sx,y+4,Math.min(56,rowH*.34),Math.min(56,rowH*.34));
        shText(g,`${shWon(b.due)} / ${shWon(b.paid)} 받음`,x+w/2+24+sx,y+Math.min(30,rowH*.17),Math.min(24,rowH*.14),'#3b3229','"HojaBody",sans-serif');
        shText(g,'거스름돈은?',x+w/2+24+sx,y+Math.min(62,rowH*.36),Math.min(22,rowH*.13),'#8a6a3a','"HojaBody",sans-serif');
        const ow=(w-12*2-8*2)/3,oh=Math.min(rowH*.42,70),oy=y+rowH-oh-8;
        b.opts.forEach((v,k)=>{
          const ox=x+12+k*(ow+8),key='o'+b.t.id+'_'+k;
          shRound(g,ox,oy,ow,oh,10,'#f1c46e','#6e4726',3);
          shText(g,v.toLocaleString('ko-KR'),ox+ow/2,oy+oh/2,Math.min(26,ow*.26),'#3b2918');
          const fl=shFlash(key,now);if(fl>0){g.fillStyle=`rgba(255,255,255,${fl*.5})`;g.beginPath();g.roundRect(ox,oy,ow,oh,10);g.fill();}
          shHitAdd(key,ox,oy,ow,oh,()=>shCoPay(b,v,ox+ow/2,oy));
        });
      });
      if(!c.bags.length)shText(g,'포장이 오면 계산해요',x+w/2,body+bh/2,24,'#a59a85','"HojaBody",sans-serif');
    }
  }
  const shFaced=()=>false;
  function shTurnRightHalf(g){
    const w=shCanvas.width,h=shCanvas.height,half=Math.round(w/2);
    g.save();g.setTransform(1,0,0,1,0,0);g.translate(w+half,h);g.rotate(Math.PI);
    g.drawImage(shCanvas,half,0,w-half,h,half,0,w-half,h);
    g.restore();
  }
  // Time and menu sit on the centre line, once for each child.
  function shFacedHud(g){
    const {W,H}=SH,left=Math.max(0,SH.dayLen-SH.time),warn=left<=10&&SH.phase==='day';
    const timeText=`${Math.floor(Math.ceil(left)/60)}:${String(Math.ceil(left)%60).padStart(2,'0')}`;
    const one=()=>{
      shRound(g,W/2-150,H-64,190,56,12,warn?'#ffd9cd':'#fff8e8','#3b3229',3);
      shText(g,timeText,W/2-55,H-36,36,warn?'#d4432a':'#3b3229');
      shRound(g,W/2+46,H-64,110,56,12,'#f1c46e','#6e4726',3);shText(g,'메뉴',W/2+101,H-36,26,'#3b2918');
    };
    one();
    g.save();g.translate(W,H);g.rotate(Math.PI);one();g.restore();
    const open=()=>{sfx('menu',.7);shOpenMenu();};
    shHitAdd('menu',W/2+46,H-64,110,56,open);
    shHitAdd('menu2',W/2-156,8,110,56,open);
  }
  function shDrawHud(g,now){
    const {W,H,TZ}=SH;
    const left=Math.max(0,SH.dayLen-SH.time),warn=left<=10&&SH.phase==='day';
    const timeText=`${Math.floor(Math.ceil(left)/60)}:${String(Math.ceil(left)%60).padStart(2,'0')}`;
    const panel=(cx,w,label,value,color)=>{
      shRound(g,cx-w/2,H-64,w,56,12,'#fff8e8','#3b3229',3);
      shText(g,label,cx-w/2+Math.min(72,w*.24),H-36,22,'#7a6a54','"HojaBody",sans-serif');
      shText(g,value,cx+Math.min(46,w*.14),H-36,30,color);
    };
    if(SH.mode==='versus'){
      panel(W*.25,430,nameFor(0),shWon(SH.shops[0].earned),SIDE_COLOR[0]);
      panel(W*.75,430,nameFor(1),shWon(SH.shops[1].earned),SIDE_COLOR[1]);
    }else if(SH.mode==='solo'){
      const tg=shTarget();
      panel(W*.2,500,(SH.day+1)+'일째',`${shWon(SH.earned)} / ${shWon(tg)}`,SH.earned>=tg?'#1f8a58':'#3b3229');
      panel(W*.8,430,'내 돈',shWon(SH.money),'#3b3229');
    }else{
      const tg=SH.co.targets,stars=tg.filter(v=>SH.earned>=v).length;
      panel(W*.2,500,'매출',shWon(SH.earned),'#3b3229');
      panel(W*.8,430,'목표','★'.repeat(stars)+'☆'.repeat(3-stars)+(stars<3?' '+shWon(tg[stars]):''),'#c98a12');
    }
    if(!shFaced()){
      shRound(g,W/2-150,H-64,190,56,12,warn?'#ffd9cd':'#fff8e8','#3b3229',3);
      shText(g,timeText,W/2-55,H-36,36,warn?'#d4432a':'#3b3229');
      const mx=W/2+46,key='menu';
      shRound(g,mx,H-64,110,56,12,'#f1c46e','#6e4726',3);shText(g,'메뉴',mx+55,H-36,26,'#3b2918');
      shHitAdd(key,mx,H-64,110,56,()=>{sfx('menu',.7);shOpenMenu();});
    }
    // Sign above the customers
    if(SH.mode!=='versus'&&!shFaced()){
      shRound(g,W/2-118,8,236,48,12,'#d9573f','#7a2a1b',4);
      shText(g,'호자네 붕어빵',W/2,33,28,'#fff6e3');
    }
  }
  function shDrawUpgrades(g,now){
    const {W,H,TZ}=SH;
    g.fillStyle='rgba(32,46,42,.82)';g.fillRect(0,TZ,W,H-TZ);
    const ok=SH.dayOk;
    shText(g,ok?`${SH.day+1}일째 성공! 매출 ${shWon(SH.earned)}`:`아쉬워요! 매출 ${shWon(SH.earned)} / 목표 ${shWon(shTarget())}`,W/2,TZ+52,46,ok?'#ffe08a':'#ffb29c');
    shText(g,`내 돈 ${shWon(SH.money)} · 가게를 키워요`,W/2,TZ+106,32,'#fffbe7','"HojaBody",sans-serif');
    const cols=4,rows=Math.ceil(SH_UP.length/cols),gap=20,cw=(W-80-gap*(cols-1))/cols,top=TZ+136,ch=(H-top-126-gap*(rows-1))/rows;
    SH_UP.forEach((u,i)=>{
      const x=40+(i%cols)*(cw+gap),cy=top+Math.floor(i/cols)*(ch+gap),lvl=SH.up[u.id],maxed=lvl>=u.costs.length,cost=u.costs[lvl],can=!maxed&&SH.money>=cost,key='u'+u.id;
      const desc=u.id==='special'?shSpOf(SH.shops[0]).name+' · '+shSpOf(SH.shops[0]).up[Math.min(lvl+1,2)]:u.desc;
      shRound(g,x,cy,cw,ch,18,maxed?'#d9d3c4':can?'#fff4d4':'#eee4cf',can?'#d6a01f':'#8a7a5a',can?6:3);
      shText(g,u.name,x+cw/2,cy+ch*.2,Math.min(36,ch*.17),'#3b3229');
      shText(g,desc,x+cw/2,cy+ch*.43,Math.min(24,ch*.12,cw*.95/Math.max(1,desc.length)*1.6),'#6a5e50','"HojaBody",sans-serif');
      shText(g,maxed?'최고 단계':shWon(cost),x+cw/2,cy+ch*.67,Math.min(36,ch*.17),maxed?'#8a7a5a':can?'#b4661f':'#a59a85');
      shText(g,'단계 '+lvl+' / '+u.costs.length,x+cw/2,cy+ch*.87,Math.min(22,ch*.11),'#8a7a5a','"HojaBody",sans-serif');
      const fl=shFlash(key,now);if(fl>0){g.fillStyle=`rgba(255,255,255,${fl*.5})`;g.beginPath();g.roundRect(x,cy,cw,ch,18);g.fill();}
      shHitAdd(key,x,cy,cw,ch,()=>shBuy(u));
    });
    const bw=460,bx=W/2-bw/2,by=H-104;
    shRound(g,bx,by,bw,90,18,'#f1c46e','#6e4726',4);
    shText(g,ok?`${SH.day+2}일째 장사 시작 ▶`:`${SH.day+1}일째 다시 도전 ▶`,W/2,by+46,38,'#3b2918');
    shHitAdd('next',bx,by,bw,90,shNextDay);
  }
  function shDraw(now,dt){
    if(!shCanvas.width)return;
    const k=shCanvas.width/SH.W;
    if(!SH.bg||SH.bgKey!==SH.mode+shCanvas.width)shBuildBg();
    const g=sctx;g.setTransform(1,0,0,1,0,0);g.drawImage(SH.bg,0,0);g.setTransform(k,0,0,k,0,0);
    SH.hits=[];
    shDrawCustomers(g,now);
    if(SH.mode==='versus'){g.fillStyle='#3b2918';g.fillRect(SH.W/2-3,SH.TZ,6,SH.H-SH.TZ);}
    if(SH.co)shDrawCo(g,now);else SH.shops.forEach(s=>shDrawClassicShop(g,s,now));
    for(const s of SH.shops){
      if(s.rush<=0&&SH.phase==='day'){
        const pw=250,px=s.x+s.w-pw-12,py=SH.TZ-92,n=Math.min(s.combo,SH_RUSH_AT);
        shRound(g,px,py,pw,46,12,'rgba(255,250,235,.92)',n?'#e0a20c':'#8a7a5a',3);
        shText(g,'순서대로',px+58,py+24,22,'#6a5e50','"HojaBody",sans-serif');
        for(let i=0;i<SH_RUSH_AT;i++){g.fillStyle=i<n?'#e0a20c':'rgba(0,0,0,.14)';g.beginPath();g.arc(px+128+i*24,py+23,9,0,Math.PI*2);g.fill();}
      }
      if(s.rush<=0)continue;
      // The whole counter lights up, and the banner counts down where everyone can see it.
      const p=.5+.5*Math.sin(now/110),bw=Math.min(s.w*.62,620),bx=s.x+s.w/2-bw/2,by=SH.TZ-92;
      g.strokeStyle='#ffc21f';g.globalAlpha=.55+p*.45;g.lineWidth=10;g.strokeRect(s.x+6,SH.TZ+2,s.w-12,SH.H-SH.TZ-74);g.globalAlpha=1;
      shRound(g,bx,by,bw,58,16,'#d9573f','#7a2a1b',4);
      shText(g,'대박 시간! 매출 ×2',s.x+s.w/2,by+25,Math.min(32,bw*.07),'#fff6c8');
      g.fillStyle='rgba(0,0,0,.3)';g.fillRect(bx+16,by+45,bw-32,7);g.fillStyle='#ffe44d';g.fillRect(bx+16,by+45,(bw-32)*s.rush/SH_RUSH_TIME,7);
    }
    shDrawHud(g,now);
    if(SH.phase==='shopping'){SH.hits=[];shDrawUpgrades(g,now);}
    for(let i=SH.sparks.length-1;i>=0;i--){
      const p=SH.sparks[i];p.ttl-=dt;if(p.ttl<=0){SH.sparks.splice(i,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      g.globalAlpha=Math.min(1,p.ttl*3);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.sz,0,Math.PI*2);g.fill();
    }
    g.globalAlpha=1;
    for(let i=SH.floats.length-1;i>=0;i--){
      const f=SH.floats[i];f.ttl-=dt;if(f.ttl<=0){SH.floats.splice(i,1);continue;}
      g.globalAlpha=Math.min(1,f.ttl*3);shText(g,f.text,clamp(f.x,120,SH.W-120),f.y-(f.life-f.ttl)*40,f.size,f.color,undefined,'rgba(255,255,255,.95)');
    }
    g.globalAlpha=1;
    if(shFaced()){
      shTurnRightHalf(g);
      shFacedHud(g);
      if(SH.phase==='countdown'){
        const n=Math.max(1,Math.ceil(SH.countdown/.8)),frac=(SH.countdown%.8)/.8,title=SH.mode==='versus'?'90초 장사 대결':'2인 협동 · 120초';
        g.fillStyle='rgba(32,46,42,.45)';g.fillRect(0,0,SH.W,SH.H);
        for(const turned of [false,true]){
          g.save();
          if(turned){g.translate(SH.W,SH.H);g.rotate(Math.PI);}
          shText(g,title,SH.W*.25,SH.H*.3,50,'#fffbe7',undefined,'rgba(0,0,0,.5)');
          g.globalAlpha=.5+.5*frac;shText(g,String(n),SH.W*.25,SH.H*.6,170+60*frac,'#ffe08a',undefined,'rgba(0,0,0,.5)');
          g.restore();
        }
      }
      return;
    }
    if(SH.phase==='countdown'){
      const n=Math.max(1,Math.ceil(SH.countdown/.8)),frac=(SH.countdown%.8)/.8;
      g.fillStyle='rgba(32,46,42,.45)';g.fillRect(0,SH.TZ,SH.W,SH.H-SH.TZ);
      const title=SH.mode==='solo'?`${SH.day+1}일째 · 목표 ${shWon(shTarget())}`:SH.mode==='versus'?'90초 장사 대결':`${SH.people}인 협동 · 120초`;
      shText(g,title,SH.W/2,SH.TZ+110,54,'#fffbe7',undefined,'rgba(0,0,0,.5)');
      if(SH.mode==='solo'){
        const face=SH_KIND_DAYS[2+SH.day],k=SH_KIND[face],who=CHARACTERS.find(c=>c.id===face).name;
        shText(g,SH.day?`새 손님 ${who} · ${k.tag}`:'노란 불이 켜졌을 때 누르면 황금 붕어빵!',SH.W/2,SH.TZ+178,34,'#ffe08a','"HojaBody",sans-serif','rgba(0,0,0,.5)');
        if(!SH.day)shText(g,'맨 위 손님부터 주면 콤보, 5명이면 대박 시간! 초록 막대일 때 주면 빠른 보너스!',SH.W/2,SH.TZ+226,30,'#fffbe7','"HojaBody",sans-serif','rgba(0,0,0,.5)');
      }
      g.globalAlpha=.5+.5*frac;shText(g,String(n),SH.W/2,SH.TZ+(SH.H-SH.TZ)*.58,200+70*frac,'#ffe08a',undefined,'rgba(0,0,0,.5)');g.globalAlpha=1;
    }
  }
  function shFrame(now){
    if(!SH.on)return;
    const dt=clamp((now-(SH.lastT||now))/1000,0,.05);SH.lastT=now;
    if(SH.phase!=='paused'){
      SH.acc=Math.min(.1,SH.acc+dt);
      while(SH.acc>=1/60){shStep(1/60);SH.acc-=1/60;}
    }
    shDraw(now,SH.phase==='paused'?0:dt);
    SH.raf=requestAnimationFrame(shFrame);
  }
  function shResize(){
    if(!SH.on)return;
    const r=$('shopScreen').getBoundingClientRect();if(!r.width||!r.height)return;
    SH.W=1920;SH.H=Math.round(1920*r.height/r.width);SH.TZ=Math.round(SH.H*(TABLET?.2:.34));
    shCanvas.style.width=r.width+'px';shCanvas.style.height=r.height+'px';
    const dpr=Math.min(window.devicePixelRatio||1,1.5,1600/Math.max(1,r.width));
    const px=Math.round(r.width*dpr);
    if(shCanvas.width!==px){shCanvas.width=px;shCanvas.height=Math.round(r.height*dpr);}
    SH.bgKey='';shDraw(performance.now(),0);
  }
  let shObserver=null;
  function enterShop(){
    $('menuScreen').hidden=true;$('gameScreen').hidden=true;$('shopScreen').hidden=false;
    SH.on=true;SH.lastT=0;SH.acc=0;
    // Decode every customer mood up front: a face must not pop in blank the first time someone walks up.
    SH_FACES.forEach(id=>['neutral','surprised','angry','sad','happy'].forEach(m=>shFace(id,m)));
    shObserver=new ResizeObserver(shResize);shObserver.observe($('shopScreen'));
    shNewGame();shResize();
    SH.raf=requestAnimationFrame(shFrame);
  }
  function leaveShop(){roundClose();
    SH.on=false;cancelAnimationFrame(SH.raf);
    if(shObserver){shObserver.disconnect();shObserver=null;}
    $('shopScreen').hidden=true;$('shOverlay').hidden=true;SH.phase='idle';
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&SH.on&&location.hash!=='#debug')shOpenMenu();});

