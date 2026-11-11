  /* ---------- Touch party games, third page ---------- */
  // Two sides that are each out of the game: the leader wins as soon as nobody can catch up.
  function paOutcome(alive,score,solo,unit,key){
    if(solo){if(!alive[0])paSoloEnd(score[0],unit,key);return;}
    if(!alive[0]&&!alive[1])paWinnerByScore();
    else if(!alive[0]&&score[1]>score[0])paEnd(1,score[0]+' : '+score[1]);
    else if(!alive[1]&&score[0]>score[1])paEnd(0,score[0]+' : '+score[1]);
  }

  /* Rock paper scissors against the clock */
  function paShuffled(list){const out=[...list];for(let i=out.length-1;i>0;i--){const k=paRand(i+1);[out[i],out[k]]=[out[k],out[i]];}return out;}
  function makeRps(stage,host){
    const HANDS=['rock','scissors','paper'],NAMES=['바위','가위','보'],solo=stage.people===1,goal=15;
    const ui=paEachSide(stage,host,(box,side)=>{
      const cmd=paEl('div','pa-rps-cmd'),hand=paEl('div','pa-rps-hand'),grid=paEl('div','pa-answers pa-rps-grid');
      box.append(cmd,hand,grid);
      return {cmd,hand,grid,side,answer:0,els:[]};
    });
    PS.rps=ui;
    function ask(u){
      const h=paRand(3),order=stage.mode==='win'?'win':['win','lose','tie'][paRand(3)];
      u.answer=order==='win'?(h+2)%3:order==='lose'?(h+1)%3:h;
      u.cmd.textContent=order==='win'?'이겨라!':order==='lose'?'져라!':'비겨라!';
      u.cmd.dataset.order=order;u.hand.replaceChildren(paPic(HANDS[h],'pa-rps-pic'));
      u.els=HANDS.map((face,i)=>{
        const b=paTap(paEl('button','pa-answer pa-rps-btn'),()=>{
          if(i===u.answer){sfx('coin',.6);paScore(u.side,1);if(!solo&&PS.scores[u.side]>=goal){paEnd(u.side,PS.scores[0]+' : '+PS.scores[1]);return;}}
          else{sfx('soft',.9);paScore(u.side,-1);paFlash(u.grid,'pa-bad');}
          ask(u);
        });
        b.append(paPic(face,'pa-rps-face'),paEl('small','',NAMES[i]));
        return b;
      });
      u.grid.replaceChildren(...(PS.scores[u.side]>=10?paShuffled(u.els):u.els));
    }
    return {
      begin(){if(solo)PS.limit=stage.limit;ui.forEach(ask);},
      timeUp(){paSoloEnd(PS.scores[0],'점',stage.id);}
    };
  }

  /* Archery: the sight sways, and the moment of the tap decides the ring */
  function makeArchery(stage,host){
    const SHOTS=stage.shots||10;
    const worlds=paEachSide(stage,host,(box,side)=>{
      box.classList.add('pa-archery-box');
      const v=paCanvas(box),w={v,side,left:SHOTS,t:Math.random()*9,holes:[],pop:[],total:0,cool:0,x:0,y:0,R:0};
      v.c.addEventListener('pointerdown',e=>{
        e.preventDefault();if(!PS.live||PS.ended||!w.left||w.cool>0)return;
        const at=w.t-boardLag*stage.sway,sx=v.W/2+Math.sin(at*1.7)*w.R*.92,sy=v.H/2+Math.sin(at*2.31+1.1)*w.R*.92;
        const d=Math.hypot(sx-v.W/2,sy-v.H/2),pts=clamp(10-Math.floor(d/w.R*10),0,10);
        w.left--;w.cool=.35;w.total+=pts;paSetScore(side,w.total);
        w.holes.push({x:(sx-v.W/2)/w.R,y:(sy-v.H/2)/w.R});w.pop.push({x:sx,y:sy,age:0,text:pts?String(pts):'빗나감'});
        sfx(pts>=9?'coin':pts?'hit':'soft',.8);
        if(pts===10)paTone(1320,.25,.25);
        if(worlds.every(o=>!o.left))finish();
      });
      return w;
    });
    PS.archery=worlds;
    function finish(){
      if(worlds.length===1)paSoloEnd(worlds[0].total,'점',stage.id);
      else paWinnerByScore(PS.scores[0]+' : '+PS.scores[1]+' · 화살 '+SHOTS+'발');
    }
    return {
      begin(){PS.limit=SHOTS*7;},
      timeUp(){finish();},
      frame(dt){
        for(const w of worlds){
          const {v}=w;v.fit();const {g,W,H}=v;
          w.t+=dt*stage.sway;w.cool=Math.max(0,w.cool-dt);
          const R=w.R=Math.min(W,H)*.42,cx=W/2,cy=H/2;
          w.x=cx+Math.sin(w.t*1.7)*R*.92;w.y=cy+Math.sin(w.t*2.31+1.1)*R*.92;
          g.clearRect(0,0,W,H);
          paDraw(g,'target',cx,cy,R*2);
          for(const h of w.holes)paDraw(g,'shot',cx+h.x*R,cy+h.y*R,R*.11);
          if(w.left){
            g.globalAlpha=w.cool>0?.45:1;paDraw(g,'cross',w.x,w.y,R*.42);g.globalAlpha=1;
          }
          g.textAlign='center';g.textBaseline='middle';
          for(const p of w.pop){p.age+=dt;g.globalAlpha=clamp(1-p.age/.8,0,1);g.fillStyle='#3a2418';g.font='900 '+Math.round(R*.2)+'px "HojaTitle","HojaBody",sans-serif';g.fillText(p.text,p.x,p.y-R*.16-p.age*50);}
          g.globalAlpha=1;w.pop=w.pop.filter(p=>p.age<.8);
          g.textAlign='left';g.fillStyle='#3a2418';g.font='900 '+Math.round(Math.min(W,H)*.06)+'px "HojaBody",sans-serif';g.fillText('화살 '+w.left,12,Math.min(W,H)*.06);
        }
      }
    };
  }

  /* Balloon: blow for more points, stop before it bursts */
  function makeBalloon(stage,host){
    const ROUNDS=5,solo=stage.people===1;
    const ui=paEachSide(stage,host,(box,side)=>{
      const info=paEl('div','pa-bal-info'),wrap=paEl('div','pa-bal-wrap'),ball=paEl('div','pa-bal'),pot=paEl('b','pa-bal-pot'),btns=paEl('div','pa-answers pa-bal-btns');
      ball.append(paPic('balloon'),pot);wrap.append(ball);
      const blow=paEl('button','pa-answer pa-bal-blow','후! 불기'),stop=paEl('button','pa-answer pa-bal-stop','그만! 받기');
      btns.append(blow,stop);box.append(info,wrap,btns);
      const u={side,info,ball,potEl:pot,blow,stop,round:1,pot:0,limit:0,done:false};
      paTap(blow,()=>{
        if(u.done)return;
        u.pot++;paTone(280+u.pot*26,.1,.2);
        if(u.pot>=u.limit){sfx('boom',.9);paFlash(box,'pa-bad');u.ball.classList.add('pop');u.pot=0;setTimeout(()=>u.ball.classList.remove('pop'),260);next(u);return;}
        draw(u);
      });
      paTap(stop,()=>{
        if(u.done||!u.pot)return;
        sfx('coin',.8);paScore(side,u.pot);u.pot=0;next(u);
      });
      return u;
    });
    PS.balloon=ui;
    function draw(u){
      u.info.textContent=u.done?'다 불었어요':'풍선 '+u.round+' / '+ROUNDS;
      u.potEl.textContent=u.pot||'';
      u.ball.style.height=(22+u.pot*3.1)+'%';
    }
    function fresh(u){u.limit=stage.min+paRand(stage.span);draw(u);}
    function next(u){
      if(u.round>=ROUNDS){
        u.done=true;u.blow.disabled=u.stop.disabled=true;draw(u);
        if(ui.every(o=>o.done)){
          if(solo)paSoloEnd(PS.scores[0],'점',stage.id);else paWinnerByScore();
        }
        return;
      }
      u.round++;fresh(u);
    }
    return {begin(){ui.forEach(fresh);}};
  }

  /* Dodge the falling meteors */
  function dodgeBurst(w,x,y,colors,count,speed,text){
    const {W,H}=w.v,unit=Math.min(W,H);
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=speed*(.35+Math.random()*.75);w.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-speed*.25,grav:H*1.1,r:unit*(.007+Math.random()*.012),color:colors[i%colors.length],age:0,life:.45+Math.random()*.35});}
    if(text)w.fx.push({text,x,y:y-unit*.05,vy:unit*.14,size:unit*.1,color:text==='+3'?'#ffd24a':'#ff6b57',age:0,life:.75});
    if(w.fx.length>120)w.fx.splice(0,w.fx.length-120);
  }
  function makeDodge(stage,host){
    const worlds=paEachSide(stage,host,(box,side)=>{
      box.classList.add('pa-dodge-box');
      const v=paCanvas(box),img=new Image(),sad=new Image();img.src=portraitFor(side);sad.src=portraitFor(side,'sad');
      const w={v,side,img,sad,x:.5,items:[],wait:.5,hearts:3,pts:0,hurt:0,dead:false,fx:[],shake:0};
      const move=e=>{if(!PS.live||PS.ended||w.dead)return;e.preventDefault();w.x=clamp(paPos(v,e).x/(v.W||1),.04,.96);};
      v.c.addEventListener('pointerdown',move);v.c.addEventListener('pointermove',move);
      return w;
    });
    PS.dodge=worlds;
    const check=()=>paOutcome(worlds.map(w=>!w.dead),worlds.map(w=>Math.floor(w.pts)),worlds.length===1,'점',stage.id);
    return {
      frame(dt){
        for(const w of worlds){
          const {v}=w;v.fit();const {g,W,H}=v;
          const size=Math.min(H*.17,W*.2),py=H-size*.72,px=w.x*W;
          if(!w.dead){
            w.pts+=dt;paSetScore(w.side,Math.floor(w.pts));
            w.wait-=dt;w.hurt=Math.max(0,w.hurt-dt);
            if(w.wait<=0){
              w.wait=Math.max(.2,.72-PS.elapsed*.012);
              const star=Math.random()<.14,r=Math.min(W,H)*(star?.05:.04+Math.random()*.035);
              w.items.push({x:r+Math.random()*(W-r*2),y:-r,r,star,pic:star?'starGold':'met'+paRand(4),v:H*(.42+Math.random()*.25+Math.min(.5,PS.elapsed*.011)),spin:Math.random()*6});
            }
            for(const it of w.items){
              it.y+=it.v*dt;it.spin+=dt*3;
              if(Math.hypot(it.x-px,it.y-py)<it.r+size*.36){
                it.gone=true;
                if(it.star){w.pts+=3;sfx('coin',.8);dodgeBurst(w,it.x,it.y,['#ffd24a','#fff3b0','#ffb32c'],16,H*.55,'+3');}
                else if(w.hurt<=0){w.hearts--;w.hurt=.8;w.shake=.32;sfx('boom',.9);paFlash(v.c.parentNode,'pa-bad');dodgeBurst(w,(it.x+px)/2,(it.y+py)/2,['#8a6a4f','#5e4634','#ff8a3c','#ffd24a'],26,H*.8,'쾅!');if(w.hearts<=0){w.dead=true;check();}}
                else dodgeBurst(w,it.x,it.y,['#8a6a4f','#5e4634'],8,H*.4);
              }
            }
            w.items=w.items.filter(it=>!it.gone&&it.y<H+it.r*2);
          }
          g.clearRect(0,0,W,H);
          g.textAlign='center';g.textBaseline='middle';
          w.shake=Math.max(0,w.shake-dt);
          g.save();
          if(w.shake>0){const k=Math.min(W,H)*.035*w.shake/.32;g.translate((Math.random()-.5)*k*2,(Math.random()-.5)*k*2);}
          for(const it of w.items){g.save();g.translate(it.x,it.y);g.rotate(it.spin);paDraw(g,it.pic,0,0,it.r*2.3);g.restore();}
          const pic=w.dead?w.sad:w.img;
          if(pic.complete&&pic.naturalWidth&&!(w.hurt>0&&Math.floor(w.hurt*12)%2)){g.globalAlpha=w.dead?.55:1;g.drawImage(pic,px-size/2,py-size/2,size,size);g.globalAlpha=1;}
          for(const f of w.fx){
            f.age+=dt;const t=f.age/f.life;if(t>=1)continue;
            g.globalAlpha=1-t;
            if(f.text){g.fillStyle=f.color;g.strokeStyle='#3a2418';g.lineWidth=Math.max(3,f.size*.12);g.font='900 '+Math.round(f.size)+'px "HojaTitle","HojaBody",sans-serif';g.strokeText(f.text,f.x,f.y-f.vy*t);g.fillText(f.text,f.x,f.y-f.vy*t);}
            else{f.vy+=f.grav*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;g.fillStyle=f.color;g.beginPath();g.arc(f.x,f.y,f.r*(1-t*.5),0,Math.PI*2);g.fill();}
            g.globalAlpha=1;
          }
          w.fx=w.fx.filter(f=>f.age<f.life);
          g.restore();
          const hs=Math.min(W,H)*.09;for(let i=0;i<w.hearts;i++)paDraw(g,'heart',hs*(.7+i*1.05),hs*.7,hs);
          if(w.dead){g.fillStyle='#fff8e4';g.textAlign='center';g.font='900 '+Math.round(H*.08)+'px "HojaTitle","HojaBody",sans-serif';g.fillText('끝! '+Math.floor(w.pts)+'점',W/2,H/2);}
        }
      }
    };
  }

  /* Sort it to the correct side */
  function makeSort(stage,host){
    const ANIMALS=['bear','chick','cow','dog','elephant','frog','giraffe','monkey','panda','penguin','pig','rabbit'].map(a=>'ani_'+a),FRUITS=['apple','banana','cherry','grapes','orange','lemon','melon','pineapple','peach','strawberry','kiwi','pear'];
    const solo=stage.people===1,goal=20;
    const ROUND={
      odd:()=>{const n=1+paRand(99);return {text:n,left:'짝수',right:'홀수',answer:n%2};},
      big:()=>{let n=1+paRand(99);if(n===50)n=51;return {text:n,left:'50보다 작아요',right:'50보다 커요',answer:n>50?1:0};},
      kind:()=>{const k=paRand(2);return {pic:(k?FRUITS:ANIMALS)[paRand(12)],left:'동물',right:'과일',answer:k};},
      mul:()=>{const n=2+paRand(60);return {text:n,left:'3의 배수',right:'아니에요',answer:n%3===0?0:1};}
    };
    const ui=paEachSide(stage,host,(box,side)=>{
      const q=paEl('div','pa-question pa-sort-item'),grid=paEl('div','pa-answers pa-sort-bins');box.append(q,grid);
      return {q,grid,side,answer:0,els:[]};
    });
    PS.sort=ui;
    function ask(u){
      const kinds=stage.mode==='mix'?Object.keys(ROUND):[stage.mode],r=ROUND[kinds[paRand(kinds.length)]]();
      u.answer=r.answer;u.q.replaceChildren(r.pic?paPic(r.pic,'pa-sort-pic'):String(r.text));
      u.els=[r.left,r.right].map((label,i)=>paTap(paEl('button','pa-answer pa-sort-bin'+i,label),()=>{
        if(i===u.answer){sfx('coin',.6);paScore(u.side,1);if(!solo&&PS.scores[u.side]>=goal){paEnd(u.side,PS.scores[0]+' : '+PS.scores[1]);return;}}
        else{sfx('soft',.9);paScore(u.side,-1);paFlash(u.grid,'pa-bad');}
        ask(u);
      }));
      u.grid.replaceChildren(...u.els);
    }
    return {
      begin(){if(solo)PS.limit=stage.limit;ui.forEach(ask);},
      timeUp(){paSoloEnd(PS.scores[0],'점',stage.id);}
    };
  }

  /* Light trails: the first to hit a wall or a line gives up the round */
  function makeTron(stage,host){
    const COLS=64,ROWS=34,GOAL=3,MAX_ROUNDS=7,DIRS=[[1,0],[0,1],[-1,0],[0,-1]],COLORS=['#17756a','#d65f48'],solo=stage.people===1;
    host.classList.add('pa-tron');
    const col=()=>paEl('div','pa-tron-col'),left=col(),right=col(),arena=paEl('div','pa-tron-arena');
    host.append(left,arena,right);
    const v=paCanvas(arena),st={grid:new Uint8Array(COLS*ROWS),bikes:[],acc:0,wait:false,rounds:0,msg:'',btns:[[],[]]};
    PS.tron=st;
    const turn=(i,by)=>{const b=st.bikes[i];if(!b||b.q.length>=2||st.wait)return;b.q.push(by);sfx('flip',.35);};
    const pad=(side,by,label)=>{const b=paTap(paEl('button','pa-tron-btn pa-tron-s'+side,label),()=>turn(side,by));st.btns[side].push(b);return b;};
    if(solo){left.append(pad(0,-1,'↺'));right.append(pad(0,1,'↻'));}
    else{left.append(pad(0,-1,'↺'),pad(0,1,'↻'));right.append(pad(1,-1,'↺'),pad(1,1,'↻'));}
    const at=(x,y)=>x<0||y<0||x>=COLS||y>=ROWS?1:st.grid[y*COLS+x];
    function round(){
      st.grid.fill(0);st.acc=0;st.wait=false;st.msg='';st.rounds++;
      st.bikes=[{x:10,y:ROWS>>1,d:0,q:[],dead:false},{x:COLS-11,y:ROWS>>1,d:2,q:[],dead:false}];
      st.bikes.forEach((b,i)=>{st.grid[b.y*COLS+b.x]=i+1;});
    }
    function run(d,x,y){let n=0;while(n<30&&!at(x+DIRS[d][0]*(n+1),y+DIRS[d][1]*(n+1)))n++;return n;}
    function think(b){
      const ahead=run(b.d,b.x,b.y);
      if(ahead>4&&Math.random()>.03)return;
      const l=(b.d+3)%4,r=(b.d+1)%4,dl=run(l,b.x,b.y),dr=run(r,b.x,b.y);
      if(ahead>Math.max(dl,dr))return;
      if(Math.random()<stage.slip)return;
      b.d=dl>dr?l:dr>dl?r:(Math.random()<.5?l:r);
    }
    function step(){
      const [a,b]=st.bikes;
      if(solo)think(b);
      for(const k of st.bikes){if(k.q.length)k.d=(k.d+k.q.shift()+4)%4;k.x+=DIRS[k.d][0];k.y+=DIRS[k.d][1];}
      a.dead=!!at(a.x,a.y);b.dead=!!at(b.x,b.y);
      if(a.x===b.x&&a.y===b.y)a.dead=b.dead=true;
      if(!a.dead)st.grid[a.y*COLS+a.x]=1;
      if(!b.dead)st.grid[b.y*COLS+b.x]=2;
      if(!a.dead&&!b.dead)return;
      st.wait=true;sfx('boom',.8);
      if(a.dead&&b.dead)st.msg='둘 다 쿵!';
      else{const win=a.dead?1:0;if(win===0||!solo)paScore(win,1);else st.cpu=(st.cpu||0)+1;st.msg=solo?(win?'컴퓨터 승':'내가 이겼어요!'):(win?'오른쪽':'왼쪽')+' 1점!';}
      paAfter(1.3,()=>{
        const cpu=solo?st.cpu||0:PS.scores[1],me=PS.scores[0];
        if(me>=GOAL||cpu>=GOAL||st.rounds>=MAX_ROUNDS){
          if(solo)paEnd(null,(me===cpu?'비겼어요':me>cpu?'내가 이겼어요':'컴퓨터가 이겼어요')+' · '+me+' : '+cpu);
          else paWinnerByScore();
          return;
        }
        round();
      });
    }
    round();
    return {
      frame(dt){
        v.fit();const {g,W,H}=v;
        if(!st.wait){st.acc+=dt;while(st.acc>=stage.step&&!st.wait){st.acc-=stage.step;step();}}
        const cell=Math.min(W/COLS,H/ROWS),ox=(W-cell*COLS)/2,oy=(H-cell*ROWS)/2;
        g.clearRect(0,0,W,H);g.fillStyle='#fbf4df';g.fillRect(ox,oy,cell*COLS,cell*ROWS);g.strokeStyle='#3a2418';g.lineWidth=4;g.strokeRect(ox,oy,cell*COLS,cell*ROWS);g.strokeStyle='rgba(58,36,24,.08)';g.lineWidth=1;g.beginPath();for(let x=0;x<=COLS;x+=4){g.moveTo(ox+x*cell,oy);g.lineTo(ox+x*cell,oy+cell*ROWS);}for(let y=0;y<=ROWS;y+=4){g.moveTo(ox,oy+y*cell);g.lineTo(ox+cell*COLS,oy+y*cell);}g.stroke();
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const c=st.grid[y*COLS+x];if(c){g.fillStyle=COLORS[c-1];g.fillRect(ox+x*cell,oy+y*cell,cell+.5,cell+.5);}}
        st.bikes.forEach((b,i)=>{g.fillStyle='#fffaf0';g.beginPath();g.arc(ox+(clamp(b.x,0,COLS-1)+.5)*cell,oy+(clamp(b.y,0,ROWS-1)+.5)*cell,cell*.9,0,Math.PI*2);g.fill();g.lineWidth=3;g.strokeStyle=COLORS[i];g.stroke();});
        if(st.msg){g.fillStyle='#3a2418';g.textAlign='center';g.textBaseline='middle';g.font='900 '+Math.round(H*.14)+'px "HojaTitle","HojaBody",sans-serif';g.fillText(st.msg,W/2,H/2);}
      }
    };
  }

  /* Remember which tiles lit up */
  function makeTiles(stage,host){
    const n=stage.n,solo=stage.people===1;
    const ui=paEachSide(stage,host,(box,side)=>{
      const info=paEl('div','pa-tiles-info','잘 봐요'),grid=paEl('div','pa-tiles');grid.style.setProperty('--n',n);
      const u={side,info,grid,seq:[],found:new Set(),input:false,level:1,out:false,els:[]};
      for(let i=0;i<n*n;i++){
        u.els.push(paTap(paEl('button','pa-tile'),()=>press(u,i)));
      }
      grid.append(...u.els);box.append(info,grid);
      return u;
    });
    PS.tiles=ui;
    function show(u){
      u.input=false;u.found=new Set();u.els.forEach(el=>{el.className='pa-tile';});
      const count=Math.min(u.level+2,n*n-2);u.seq=paShuffle([...Array(n*n).keys()]).slice(0,count);
      u.info.textContent=u.level+'단계 · '+count+'칸을 기억해요';
      u.seq.forEach(i=>u.els[i].classList.add('lit'));sfx('menu',.5);
      paAfter(.8+count*.12,()=>{
        u.seq.forEach(i=>u.els[i].classList.remove('lit'));u.input=true;u.info.textContent='어디였을까요?';
      });
    }
    function press(u,i){
      if(!u.input||u.out||u.found.has(i))return;
      if(u.seq.includes(i)){
        u.found.add(i);u.els[i].classList.add('ok');paTone(520+u.found.size*50,.14,.25);
        if(u.found.size===u.seq.length){
          u.input=false;paSetScore(u.side,u.level);u.level++;sfx('coin',.7);u.info.textContent='성공!';
          paAfter(.7,()=>show(u));
        }
        return;
      }
      u.out=true;u.input=false;sfx('low',.9);u.els[i].classList.add('bad');u.seq.forEach(k=>u.els[k].classList.add('lit'));
      u.info.textContent='여기까지! '+(u.level-1)+'단계';
      paOutcome(ui.map(o=>!o.out),ui.map(o=>o.level-1),solo,'단계',stage.id);
    }
    return {begin(){ui.forEach(show);}};
  }

  const PARTY3_IDS=['rps','archery','balloon','dodge','sort','tron','tiles','rally'];
  Object.assign(PARTY_GAMES,{
    rps:{name:'가위바위보 순발력',title:'HOJA 가위바위보',sel:'win',make:makeRps,stages:[
      {id:'win',name:'이겨라',mode:'win',desc:'나온 손을 이기는 손을 눌러요 · 먼저 15점 · 틀리면 −1'},
      {id:'mix',name:'뒤섞기',mode:'mix',desc:'이겨라 · 져라 · 비겨라를 잘 읽어요 · 먼저 15점'},
      {id:'solo',name:'혼자 도전',mode:'mix',people:1,limit:60,desc:'60초 동안 최고 기록 도전'}]},
    archery:{name:'호자 양궁',title:'HOJA 양궁',sel:'duel',make:makeArchery,mood:'calm',stages:[
      {id:'duel',name:'둘이 대결',sway:.8,desc:'흔들리는 조준이 과녁 가운데에 올 때 톡 · 화살 10발'},
      {id:'hard',name:'바람 부는 날',sway:1.25,desc:'조준이 더 빨라요 · 화살 10발'},
      {id:'solo',name:'혼자 도전',people:1,sway:.9,desc:'화살 10발로 100점에 도전'}]},
    balloon:{name:'풍선 불기',title:'HOJA 풍선 불기',sel:'duel',make:makeBalloon,mood:'bright',stages:[
      {id:'duel',name:'둘이 대결',min:5,span:18,desc:'불수록 점수가 늘어요 · 터지면 0점 · 풍선 5개'},
      {id:'risk',name:'조마조마',min:2,span:24,desc:'언제 터질지 더 몰라요 · 풍선 5개'},
      {id:'solo',name:'혼자 도전',people:1,min:5,span:18,desc:'풍선 5개로 최고 기록 도전'}]},
    dodge:{name:'별똥별 피하기',title:'HOJA 별똥별 피하기',sel:'duel',make:makeDodge,stages:[
      {id:'duel',name:'둘이 대결',desc:'손가락으로 끌어서 피해요 · 하트 3개 · 별은 +3 · 오래 버티면 승리'},
      {id:'solo',name:'혼자 도전',people:1,desc:'얼마나 오래 버틸 수 있을까요'}]},
    sort:{name:'척척 분류',title:'HOJA 척척 분류',sel:'odd',make:makeSort,stages:[
      {id:'odd',name:'짝수 홀수',mode:'odd',desc:'맞는 쪽을 눌러요 · 먼저 20점 · 틀리면 −1'},
      {id:'kind',name:'동물 과일',mode:'kind',desc:'맞는 쪽을 눌러요 · 먼저 20점 · 틀리면 −1'},
      {id:'big',name:'50보다',mode:'big',desc:'50보다 큰지 작은지 · 먼저 20점 · 틀리면 −1'},
      {id:'mul',name:'3의 배수',mode:'mul',desc:'3의 배수를 찾아요 · 먼저 20점 · 틀리면 −1'},
      {id:'solo',name:'혼자 도전',mode:'mix',people:1,limit:60,desc:'네 가지가 섞여 나와요 · 60초 도전'}]},
    tron:{name:'빛의 선 대결',title:'HOJA 빛의 선',sel:'duel',make:makeTron,noCount:false,stages:[
      {id:'duel',name:'둘이 대결',step:.075,desc:'↺ ↻ 로 방향을 틀어요 · 벽이나 선에 부딪히면 져요 · 먼저 3점'},
      {id:'fast',name:'빠르게',step:.05,desc:'더 빠른 대결 · 먼저 3점'},
      {id:'solo',name:'컴퓨터와',people:1,step:.08,slip:.08,desc:'왼쪽 ↺ · 오른쪽 ↻ · 컴퓨터보다 먼저 3점'}]},
    tiles:{name:'반짝 기억',title:'HOJA 반짝 기억',sel:'n4',make:makeTiles,mood:'calm',stages:[
      {id:'n4',name:'4×4',n:4,desc:'반짝인 칸을 기억해서 눌러요 · 한 번 틀리면 끝'},
      {id:'n5',name:'5×5',n:5,desc:'칸이 더 많아요 · 한 번 틀리면 끝'},
      {id:'solo',name:'혼자 도전',people:1,n:5,desc:'몇 단계까지 갈 수 있을까요'}]},
    rally:{name:'파티 랠리',title:'HOJA 파티 랠리',sel:'five',stages:[
      {id:'five',name:'5판 승부',desc:'무작위 파티 게임 5판 · 많이 이긴 사람이 승리 · 한 명당 0.5코인'}]}
  });
  for(const id of PARTY3_IDS)$('openParty-'+id).addEventListener('click',()=>{
    if(currentGame!==id)streak={side:-1,id:null,count:0};
    currentGame=id;sfx('menu',.8);toggleFullscreen(true);enterSelection();
  });

