
  /* ---------- 호자와 나한상의 춤 ----------
     Original 2D orbital rhythm/cooperation game: single music timeline, alternating
     physical players, continuous circular motion, independent of the other rhythm engines.
     Existing boardLag is applied to event time, never to the animation timeline. */
  const DA_LEAD=1.8,DA_PERFECT=.075,DA_GOOD=.15,DA_TAU=Math.PI*2;
  const DA_STAGES=[
    {id:'s-easy',name:'1인 · 쉬움',people:1,difficulty:'easy',steps:36,desc:'혼자 두 친구를 움직여요 · 일정한 박자'},
    {id:'s-normal',name:'1인 · 보통',people:1,difficulty:'normal',steps:48,desc:'혼자 누르기 · 꺾이는 발판과 변하는 박자'},
    {id:'s-hard',name:'1인 · 어려움',people:1,difficulty:'hard',steps:64,desc:'혼자 누르기 · 빠른 박자에 도전'},
    {id:'d-easy',name:'2인 협동 · 쉬움',people:2,difficulty:'easy',steps:36,desc:'호자와 나한상 차례에 각각 한 번씩 눌러요'},
    {id:'d-normal',name:'2인 협동 · 보통',people:2,difficulty:'normal',steps:48,desc:'서로 박자를 맞추며 꺾이는 발판 통과'},
    {id:'d-hard',name:'2인 협동 · 어려움',people:2,difficulty:'hard',steps:64,desc:'둘이 번갈아 빠르고 정확하게 터치'}
  ];
  // Pure chart generator. One fixed orb is at path[j], the other rotates from
  // path[j-1] to path[j+1]; alternating the fixed orb on each target.
  function daChart(song,stage){
    const rand=rhSeed(song.seed+(stage.difficulty==='hard'?307:stage.difficulty==='normal'?101:17));
    const p=[{x:-1,y:0},{x:0,y:0}],ev=[],visited=new Set(['-1,0','0,0']);
    let heading=0,time=DA_LEAD;
    // Motion and generated audio must share the exact song tempo.
    const stepLen=60/song.bpm;
    for(let j=1;j<=stage.steps;j++){
      // Keep the board readable: progress mostly rightward, allow quarter-turns.
      const candidates=stage.difficulty==='easy'?[0,0,0,0,1,-1]:
        stage.difficulty==='normal'?[0,0,1,-1,1,-1]:[0,1,1,-1,-1,0];
      let next=heading,dest=null;
      for(let tries=0;tries<12;tries++){
        const delta=candidates[Math.floor(rand()*candidates.length)];
        const h=Math.max(-2,Math.min(2,heading+delta));
        const pt={x:p[j].x+Math.cos(h*Math.PI/4),y:p[j].y+Math.sin(h*Math.PI/4)};
        const key=Math.round(pt.x*100)+','+Math.round(pt.y*100);
        if(!visited.has(key)||tries===11){next=h;dest=pt;visited.add(key);break;}
      }
      if(!dest)dest={x:p[j].x+1,y:p[j].y};
      heading=next;p.push(dest);
      const from=Math.atan2(p[j-1].y-p[j].y,p[j-1].x-p[j].x);
      const to=Math.atan2(dest.y-p[j].y,dest.x-p[j].x);
      let arc=((to-from)%DA_TAU+DA_TAU)%DA_TAU;
      if(arc<.00001)arc=DA_TAU;
      // A half revolution is one beat; turns change the time naturally.
      const duration=stepLen*arc/Math.PI;
      time+=duration;
      ev.push({j,at:time,from,arc,duration,owner:(j-1)%2});
    }
    return {path:p,events:ev,beat:stepLen,end:time};
  }
  // Event timestamp -> monotonic time. Browser pointer timestamps are normally
  // performance-relative; old epoch-based implementations get normalized.
  function daEventStamp(e){
    let t=Number(e.timeStamp);
    if(!Number.isFinite(t)||t<=0)return performance.now();
    if(t>100000000000)t-=performance.timeOrigin||0;
    return t>=0&&Math.abs(t-performance.now())<60000?t:performance.now();
  }
  function daMake(stage,host){
    host.classList.add('da-stage');
    const solo=stage.people===1;
    const canvas=paEl('canvas','da-canvas');
    canvas.setAttribute('aria-label','호자와 나한상이 발판을 회전하며 건너가는 2D 리듬게임');
    const g=canvas.getContext('2d');
    const keys=paEl('div','da-keys'+(solo?' da-one':''));
    const picker=paEl('div','da-picker');
    host.append(canvas,keys,picker);
    const portraits=['HOJA','NAHANSANG'].map(id=>{
      const im=new Image();im.src=characterPortrait(id,'neutral');return im;
    });
    const colors=['#31b69e','#e69a58'];
    let active=null,cam={x:0,y:0},lastWidth=0,lastHeight=0,stopped=false;
    const left=paEl('button','da-key da-key-a');
    const right=paEl('button','da-key da-key-b');
    left.type='button';right.type='button';
    keys.append(left);
    if(!solo)keys.append(right);
    function labels(){
      left.textContent=solo?'터치해서 회전 · SPACE':gamePlayerName(0)+' · 호자 차례 (A)';
      right.textContent=gamePlayerName(1)+' · 나한상 차례 (L)';
    }
    labels();
    function resize(){
      const r=host.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
      if(r.width<1||r.height<1)return;
      if(Math.abs(r.width-lastWidth)<1&&Math.abs(r.height-lastHeight)<1)return;
      lastWidth=r.width;lastHeight=r.height;
      canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
      canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';
      g.setTransform(dpr,0,0,dpr,0,0);
    }
    function clockNow(perf=performance.now()){
      if(!active)return 0;
      if(active.audio&&ac&&ac.state==='running')
        return ac.currentTime-active.startAudio+(perf-performance.now())/1000;
      return (perf-active.startPerf)/1000;
    }
    function feedback(str,side){
      if(!active)return;
      active.message=str;active.messageUntil=clockNow()+.7;
      const b=side===1?right:left;
      b.classList.remove('da-hit');void b.offsetWidth;b.classList.add('da-hit');
    }
    function press(side,e){
      if(!active||active.done||!PS.live||PS.ended)return;
      if(e){e.preventDefault();e.stopPropagation();}
      const ev=active.chart.events[active.next];
      if(!ev)return;
      if(!solo&&side!==ev.owner){feedback((ev.owner===0?gamePlayerName(0):gamePlayerName(1))+' 차례!',side);return;}
      const hitAt=clockNow(e?daEventStamp(e):performance.now())-boardLag;
      const error=hitAt-ev.at,abs=Math.abs(error);
      if(abs>DA_GOOD){
        if(error>DA_GOOD)feedback('늦었어요!',side);
        else feedback('조금 기다려요',side);
        return;
      }
      active.next++;
      const perfect=abs<=DA_PERFECT;
      active.score+=perfect?3:1;
      active.hits[ev.owner]+=perfect?3:1;
      active.combo++;active.best=Math.max(active.best,active.combo);
      if(perfect)active.perfect++;else active.good++;
      active.fx.push({j:ev.j,age:0,perfect});
      if(active.fx.length>8)active.fx.shift();
      paSetScore(0,solo?active.score:active.hits[0]);
      if(!solo)paSetScore(1,active.hits[1]);
      feedback(perfect?'PERFECT!':'GREAT!',ev.owner);
      if(rhAudioOk())rhTone(perfect?84:76,ac.currentTime,.10,'triangle',.12);
      const following=active.chart.events[active.next];
      paHint(following?(solo?'다음 발판에 맞춰 눌러요':gamePlayerName(following.owner)+' 차례!'):'마지막 발판 통과!');
    }
    left.addEventListener('pointerdown',e=>press(0,e),{passive:false});
    if(!solo)right.addEventListener('pointerdown',e=>press(1,e),{passive:false});
    const keydown=e=>{
      if(currentGame!=='dance'||!PS.on||!active||active.done||e.repeat||PS.paused||!PS.live)return;
      if(solo&&['Space','Enter','KeyA','KeyL'].includes(e.code)){e.preventDefault();press(0,e);}
      else if(!solo&&(e.code==='KeyA'||e.code==='KeyL')){e.preventDefault();press(e.code==='KeyA'?0:1,e);}
    };
    document.addEventListener('keydown',keydown);
    function schedule(){
      if(!active||!active.audio||!rhAudioOk())return;
      const until=ac.currentTime+.17;
      while(active.cue<active.cues.length){
        const cue=active.cues[active.cue],at=active.startAudio+cue.time;
        if(at>until)break;
        active.cue++;
        if(at<=ac.currentTime+.008)continue;
        if(cue.kind==='drum')rhBlip(cue.sound,at);
        else if(cue.kind==='tone')rhTone(cue.midi,at,cue.len,cue.wave,cue.vol);
      }
    }
    function finish(){
      if(!active||active.done)return;
      active.done=true;
      const d=active;
      if(HOF.cfg){
        if(solo)hofRecord('dance_solo',0,d.score);
        else hofRecordTeam('dance_duo',HOF.players.slice(0,2),d.score);
      }
      const people=solo?gamePlayerName(0):gamePlayerName(0)+' · '+gamePlayerName(1);
      const detail=people+' · 팀 점수 '+d.score+'점 · PERFECT '+d.perfect+' · GREAT '+d.good+
        ' · MISS '+d.miss+' · 최고 콤보 '+d.best;
      paEnd(null,detail);
      $('paOverlayTitle').textContent=solo?'혼자 완주!':'둘이서 완주!';
    }
    function drawOrb(x,y,id,r,g){
      const color=colors[id];g.save();g.translate(x,y);
      g.fillStyle=color;g.strokeStyle='#32251f';g.lineWidth=.065;
      g.beginPath();g.arc(0,0,r,0,DA_TAU);g.fill();g.stroke();
      const im=portraits[id];
      if(im.complete&&im.naturalWidth)g.drawImage(im,-r*.84,-r*.84,r*1.68,r*1.68);
      else{g.fillStyle='#fff';g.font='bold '+r+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(id?'나':'호',0,0);}
      g.restore();
    }
    function draw(t,dt){
      resize();const W=lastWidth,H=lastHeight;
      if(!W||!H)return;
      g.clearRect(0,0,W,H);
      const bg=g.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#122b39');bg.addColorStop(1,'#0b1727');
      g.fillStyle=bg;g.fillRect(0,0,W,H);
      if(!active)return;
      const d=active,chart=d.chart,events=chart.events;
      let at=events.findIndex(e=>t<e.at);
      if(at<0)at=events.length-1;
      const ev=events[at],begin=at?events[at-1].at:DA_LEAD;
      const fraction=clamp((t-begin)/ev.duration,0,1);
      const center=chart.path[ev.j],angle=ev.from+ev.arc*fraction;
      const moving={x:center.x+Math.cos(angle),y:center.y+Math.sin(angle)};
      const ease=clamp(dt*4,0,1);
      cam.x+=(center.x-cam.x)*ease;cam.y+=(center.y-cam.y)*ease;
      const scale=Math.min(W/7.7,H/4.7,125);
      g.save();g.translate(W*.5,H*.42);g.scale(scale,scale);g.translate(-cam.x,-cam.y);
      g.lineCap='round';g.lineJoin='round';
      g.strokeStyle='#294e5e';g.lineWidth=.12;g.beginPath();
      chart.path.forEach((p,i)=>{if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);});g.stroke();
      for(let i=1;i<chart.path.length;i++){
        const p=chart.path[i],next=i===ev.j+1;
        g.fillStyle=i<ev.j?'#28575b':next?'#ffdf77':'#91b4b3';
        g.strokeStyle=next?'#fff5d5':'#2d414a';g.lineWidth=.045;
        g.beginPath();g.arc(p.x,p.y,next?.30:.235,0,DA_TAU);g.fill();g.stroke();
      }
      g.strokeStyle='rgba(255,234,174,.42)';g.lineWidth=.065;
      g.beginPath();g.arc(center.x,center.y,1,ev.from,angle);g.stroke();
      drawOrb(center.x,center.y,ev.j%2?1:0,.35,g);
      drawOrb(moving.x,moving.y,ev.j%2?0:1,.35,g);
      for(const f of d.fx){
        f.age+=dt;const k=clamp(f.age/.42,0,1),p=chart.path[f.j+1];
        g.strokeStyle=f.perfect?'#ffeb83':'#7cecd9';g.globalAlpha=1-k;g.lineWidth=.08;
        g.beginPath();g.arc(p.x,p.y,.34+.5*k,0,DA_TAU);g.stroke();g.globalAlpha=1;
      }
      d.fx=d.fx.filter(f=>f.age<.42);
      g.restore();
      g.textAlign='center';g.textBaseline='middle';
      const font=Math.round(clamp(Math.min(W*.026,H*.065),15,33));
      g.font='900 '+font+'px "HojaBody",sans-serif';g.fillStyle='#e8e6d7';
      g.fillText((solo?'1인':'2인 협동')+' · '+d.song.name+' · '+(d.next)+' / '+events.length,W*.5,H*.075);
      g.font='900 '+Math.round(font*1.32)+'px "HojaTitle","HojaBody",sans-serif';g.fillStyle='#ffdf77';
      g.fillText('팀 점수 '+d.score+'   콤보 '+d.combo,W*.5,H*.16);
      if(t<DA_LEAD){
        const count=Math.max(1,Math.ceil((DA_LEAD-t)/chart.beat));
        g.font='900 '+Math.round(Math.min(H*.22,W*.14))+'px "HojaTitle","HojaBody",sans-serif';
        g.fillStyle='#fff6d4';g.fillText('준비 '+count,W*.5,H*.36);
      }
      if(d.messageUntil>t){
        g.font='900 '+Math.round(font*1.28)+'px "HojaBody",sans-serif';
        g.fillStyle='#ffdf77';g.fillText(d.message,W*.5,H*.72);
      }
      const next=events[d.next];
      for(let i=0;i<keys.children.length;i++)
        keys.children[i].classList.toggle('da-turn',Boolean(next)&&(solo||next.owner===i));
    }
    function start(song){
      picker.remove();
      const chart=daChart(song,stage),music=rhCompose(song),end=chart.end+.85;
      const cues=[];
      const add=(time,kind,more)=>{if(time<=end)cues.push(Object.assign({time,kind},more));};
      for(let i=0;i<=Math.ceil(end/chart.beat);i++)add(DA_LEAD+i*chart.beat,'drum',{sound:'kick'});
      for(const n of music.drums)add(DA_LEAD+n.step*music.stepLen,'drum',{sound:n.kind});
      for(const n of music.bass)add(DA_LEAD+n.step*music.stepLen,'tone',{midi:n.midi,len:n.len*music.stepLen,wave:'triangle',vol:.11});
      for(const n of music.notes)add(DA_LEAD+n.step*music.stepLen,'tone',{midi:n.midi,len:Math.min(n.len,4)*music.stepLen,wave:song.lead,vol:.09});
      cues.sort((a,b)=>a.time-b.time);
      const audio=rhAudioOk();
      active={song,chart,cues,cue:0,score:0,hits:[0,0],next:0,combo:0,best:0,perfect:0,good:0,miss:0,
        fx:[],message:'',messageUntil:0,done:false,audio,startAudio:ac?ac.currentTime:0,startPerf:performance.now(),
        lastTick:performance.now(),lastCtx:ac?ac.currentTime:0};
      cam={x:0,y:0};
      paHint(solo?'하나의 버튼으로 두 캐릭터를 차례로 회전시켜요':gamePlayerName(0)+' / '+gamePlayerName(1)+' · 서로 번갈아 누르세요');
      paTime('전자칠판 보정 '+Math.round(boardLag*1000)+'ms');
      sfx('goal',.45);
    }
    const headline=paEl('h2','da-picker-title','호자와 나한상의 춤');
    const desc=paEl('p','da-picker-desc',stage.name+' · '+stage.desc+' · 기존 전자칠판 보정값 사용');
    const songs=paEl('div','da-song-grid');
    const featured=RH_SONGS.filter(s=>['march','break','run','fish','star','king'].includes(s.id));
    for(const song of featured){
      const b=paEl('button','da-song',song.name+' · '+song.bpm+' BPM');
      b.type='button';b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();start(song);},{passive:false});
      songs.append(b);
    }
    picker.append(headline,desc,songs);
    return {
      pause(){
        if(!active||active.done||active.pausedAt)return;
        active.pausedAt=performance.now();
        active.pauseAudio=ac?ac.currentTime:0;
      },
      resume(){
        if(!active||!active.pausedAt)return;
        const now=performance.now();
        active.startPerf+=now-active.pausedAt;
        if(active.audio&&ac)active.startAudio+=ac.currentTime-active.pauseAudio;
        active.lastTick=now;active.lastCtx=ac?ac.currentTime:0;
        active.pausedAt=0;
      },
      frame(dt){
        if(stopped||!active)return;
        const now=performance.now(),gap=now-active.lastTick;
        // The shared party pause screen stops frame callbacks. Resume the same
        // musical instant instead of silently skipping beats during that pause.
        if(gap>800){
          const skip=gap/1000-Math.min(dt,.05);
          active.startPerf+=skip*1000;
          if(active.audio&&ac)active.startAudio+=Math.max(0,ac.currentTime-active.lastCtx-Math.min(dt,.05));
        }
        active.lastTick=now;active.lastCtx=ac?ac.currentTime:0;
        const t=clockNow(now);
        schedule();
        while(active.next<active.chart.events.length&&t>active.chart.events[active.next].at+DA_GOOD){
          const missed=active.chart.events[active.next];
          active.miss++;active.combo=0;active.next++;
          feedback('MISS',missed.owner);
          paHint(solo?'다음 발판을 노려요':gamePlayerName((missed.owner+1)%2)+' 차례!');
        }
        draw(t,dt);
        if(active.next===active.chart.events.length&&t>=active.chart.end+.65)finish();
      },
      stop(){stopped=true;document.removeEventListener('keydown',keydown);},
      // For local test harnesses; no gameplay side effects.
      get state(){return active;}
    };
  }
  PARTY_GAMES.dance={
    name:'호자와 나한상의 춤',title:'호자와 나한상의 춤',sel:'d-easy',
    stages:DA_STAGES,noCount:true,mood:'none',rhythm:true,make:daMake
  };
  const daCard=paEl('button','game-card pa-mcard da-menu-card');
  daCard.type='button';daCard.id='openParty-dance';
  daCard.setAttribute('aria-label','호자와 나한상의 춤 시작 화면으로 이동');
  daCard.innerHTML='<div class="game-icon" aria-hidden="true"><span class="da-orbit-icon"><i></i><i></i></span></div><div class="game-name">호자와 나한상의 춤</div><div class="game-desc">1인 · 2인 협동 · 교대 회전 리듬</div>';
  $('rhythmGrid').append(daCard);
  daCard.addEventListener('click',()=>{
    if(currentGame!=='dance')streak={side:-1,id:null,count:0};
    currentGame='dance';sfx('menu',.8);toggleFullscreen(true);enterSelection();
  });
