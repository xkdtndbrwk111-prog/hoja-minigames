  /* ---------- Touch party games, second page ---------- */
  // A canvas that fills its box and follows it when the window changes.
  function paCanvas(box){
    const c=paEl('canvas','pa-canvas');box.append(c);
    const v={c,g:c.getContext('2d'),W:0,H:0,fit(){
      const r=box.getBoundingClientRect();if(!r.width||!r.height)return false;
      if(Math.abs(r.width-v.W)<1&&Math.abs(r.height-v.H)<1)return false;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      v.W=r.width;v.H=r.height;c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);v.g.setTransform(dpr,0,0,dpr,0,0);
      return true;
    }};
    v.fit();return v;
  }
  function paPos(v,e){const r=v.c.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  function paEachSide(stage,host,make){
    const solo=stage.people===1,boxes=solo?[host]:paSides(host);
    return boxes.slice(0,solo?1:2).map((box,side)=>make(box,side));
  }

  /* Fruit slash */
  function makeSlash(stage,host){
    const FRUIT=['apple','orange','melon','grapes','strawberry','banana','kiwi'];
    const worlds=paEachSide(stage,host,(box,side)=>{
      box.classList.add('pa-slash-box');
      const v=paCanvas(box),w={v,side,items:[],trail:new Map(),wait:.2,cuts:[]};
      v.c.addEventListener('pointerdown',e=>{e.preventDefault();if(!PS.live||PS.ended)return;try{v.c.setPointerCapture(e.pointerId);}catch{}w.trail.set(e.pointerId,[paPos(v,e)]);});
      v.c.addEventListener('pointermove',e=>{
        const t=w.trail.get(e.pointerId);if(!t||!PS.live||PS.ended)return;
        const a=t[t.length-1],b=paPos(v,e);t.push(b);if(t.length>12)t.shift();
        for(const it of w.items){
          if(it.cut)continue;
          const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy||1,k=clamp(((it.x-a.x)*dx+(it.y-a.y)*dy)/l,0,1);
          if(Math.hypot(a.x+dx*k-it.x,a.y+dy*k-it.y)<it.r){
            it.cut=true;
            if(it.bomb){sfx('boom',.9);paScore(side,-3);paFlash(box,'pa-bad');}
            else{sfx('hit',.8,1+Math.random()*.5);paScore(side,it.gold?3:1);}
            w.cuts.push({x:it.x,y:it.y,age:0,text:it.bomb?'−3':it.gold?'+3':'+1'});
          }
        }
      });
      const end=e=>w.trail.delete(e.pointerId);
      v.c.addEventListener('pointerup',end);v.c.addEventListener('pointercancel',end);
      return w;
    });
    const seed=[];
    return {
      begin(){PS.limit=stage.limit;},
      frame(dt){
        for(const w of worlds){
          const {v,items}=w;v.fit();const {g,W,H}=v;
          w.wait-=dt;
          if(w.wait<=0){
            w.wait=Math.max(.42,.85-PS.elapsed*.012);
            const r=clamp(Math.min(W,H)*.075,26,62),roll=Math.random(),bomb=roll<.14,gold=!bomb&&roll<.22,x=r+Math.random()*(W-r*2);
            const vy=-(H*(1.35+Math.random()*.32));
            items.push({x,y:H+r,vx:(W/2-x)*(.25+Math.random()*.5),vy,r,bomb,gold,pic:bomb?'bomb':gold?'star':FRUIT[paRand(FRUIT.length)],spin:Math.random()*6,cut:false});
          }
          g.clearRect(0,0,W,H);
          g.textAlign='center';g.textBaseline='middle';
          const grav=H*1.25;
          for(const it of items){
            it.vy+=grav*dt;it.x+=it.vx*dt;it.y+=it.vy*dt;it.spin+=dt*3;
            if(it.cut)continue;
            g.save();g.translate(it.x,it.y);g.rotate(it.spin);paDraw(g,it.pic,0,0,it.r*2.2);g.restore();
          }
          w.items=items.filter(it=>!it.cut&&it.y<H+it.r*2);
          g.lineCap='round';
          for(const t of w.trail.values()){
            for(let i=1;i<t.length;i++){g.strokeStyle='rgba(255,255,255,'+(i/t.length)+')';g.lineWidth=2+i;g.beginPath();g.moveTo(t[i-1].x,t[i-1].y);g.lineTo(t[i].x,t[i].y);g.stroke();}
          }
          g.font='900 28px "HojaBody",sans-serif';
          for(const c of w.cuts){c.age+=dt;g.globalAlpha=clamp(1-c.age/.6,0,1);paDraw(g,'burst',c.x,c.y,90+c.age*220);g.fillStyle=c.text[0]==='−'?'#ffb0a0':'#fff4b8';g.fillText(c.text,c.x,c.y-c.age*50);}
          g.globalAlpha=1;w.cuts=w.cuts.filter(c=>c.age<.6);
        }
      },
      timeUp(){if(stage.people===1)paSoloEnd(PS.scores[0],'점',stage.id);else paWinnerByScore();}
    };
  }

  /* Hoja flies: tap to flap through the gaps */
  function makeFlap(stage,host){
    const worlds=paEachSide(stage,host,(box,side)=>{
      box.classList.add('pa-flap-box');
      const v=paCanvas(box),img=new Image();img.src=portraitFor(side,'surprised');
      const w={v,side,img,y:.5,vy:0,pipes:[],next:1.1,score:0,dead:false,tilt:0};
      v.c.addEventListener('pointerdown',e=>{e.preventDefault();if(!PS.live||PS.ended||w.dead)return;w.vy=-.72;sfx('flip',.5);});
      return w;
    });
    return {
      frame(dt){
        let alive=0;
        for(const w of worlds){
          const {v}=w;v.fit();const {g,W,H}=v;
          const speed=.42+Math.min(.25,PS.elapsed*.004),gap=clamp(.34-PS.elapsed*.0012,.25,.34),hx=W*.24,size=Math.min(H*.13,W*.14);
          if(!w.dead){
            alive++;
            w.vy+=1.9*dt;w.y+=w.vy*dt;w.next-=dt;
            if(w.next<=0){w.next=1.55;w.pipes.push({x:1.1,gapY:.22+Math.random()*.56,gap,done:false});}
            for(const p of w.pipes){
              p.x-=speed*dt*(H/W);
              if(!p.done&&p.x*W<hx){p.done=true;w.score++;paSetScore(w.side,w.score);sfx('coin',.6);}
              // The rocks taper to a point, so how close counts depends on how far into the rock Hoja is.
              const pw=W*.16,cx=p.x*W+pw/2,rad=size*.3,topY=(p.gapY-p.gap/2)*H,botY=(p.gapY+p.gap/2)*H,hy=w.y*H;
              const into=hy-rad<topY?(topY-hy+rad)/Math.max(1,topY):hy+rad>botY?(hy+rad-botY)/Math.max(1,H-botY):-1;
              if(into>=0&&Math.abs(hx-cx)<rad*.6+pw/2*Math.min(1,into))w.dead=true;
            }
            if(w.y<0||w.y>1)w.dead=true;
            if(w.dead)sfx('low',.9);
            w.pipes=w.pipes.filter(p=>p.x>-.2);
          }
          g.clearRect(0,0,W,H);
          // Far sky drifts at a fraction of the rocks' speed; the ground in front moves with them.
          if(!w.dead)w.scroll=(w.scroll||0)+speed*H*dt;
          const sky=paImg('sky');
          if(sky.complete&&sky.naturalWidth){
            const sh=H,sw=sh*sky.naturalWidth/sky.naturalHeight,off=(w.scroll*.14)%sw;
            for(let sx=-off;sx<W;sx+=sw-1)g.drawImage(sky,sx,0,sw,sh);
          }
          for(const p of w.pipes){
            const pw=W*.16,cx=p.x*W+pw/2,topY=(p.gapY-p.gap/2)*H,botY=(p.gapY+p.gap/2)*H;
            paDraw(g,'rockDown',cx,topY/2,pw,topY);paDraw(g,'rockUp',cx,(botY+H)/2,pw,H-botY);
          }
          const land=paImg('ground');
          if(land.complete&&land.naturalWidth){
            const lh=H*.11,lw=lh*land.naturalWidth/land.naturalHeight,off=w.scroll%lw;
            for(let lx=-off;lx<W;lx+=lw-1)g.drawImage(land,lx,H-lh,lw,lh);
          }
          if(w.img.complete){g.save();g.translate(hx,clamp(w.y,0,1)*H);g.rotate(clamp(w.vy*.7,-.5,.9));g.globalAlpha=w.dead?.5:1;g.drawImage(w.img,-size/2,-size/2,size,size);g.restore();}
          if(w.dead){g.fillStyle='#3a2418';g.textAlign='center';g.textBaseline='middle';g.font='900 '+Math.round(H*.07)+'px "HojaTitle","HojaBody",sans-serif';g.fillText('쿵! '+w.score+'칸',W/2,H/2);}
        }
        if(!alive){
          if(worlds.length===1)paSoloEnd(worlds[0].score,'칸',stage.id);
          else paWinnerByScore();
        }
      }
    };
  }

  /* Brick breaker */
  function makeBricks(stage,host){
    const GEMS=['gem_red','gem_yellow','gem_green','gem_blue','gem_purple'];
    const worlds=paEachSide(stage,host,(box,side)=>{
      box.classList.add('pa-bricks-box');
      const v=paCanvas(box),w={v,side,px:.5,balls:[],bricks:[],lives:0,serve:.5};
      for(let r=0;r<5;r++)for(let c=0;c<8;c++)w.bricks.push({r,c,alive:true});
      const move=e=>{if(PS.live&&!PS.ended)w.px=clamp(paPos(v,e).x/v.W,.08,.92);};
      v.c.addEventListener('pointerdown',e=>{e.preventDefault();try{v.c.setPointerCapture(e.pointerId);}catch{}move(e);});
      v.c.addEventListener('pointermove',move);
      return w;
    });
    return {
      begin(){PS.limit=stage.limit;},
      frame(dt){
        for(const w of worlds){
          const {v}=w;v.fit();const {g,W,H}=v;
          const pw=W*.2,ph=clamp(H*.03,10,18),py=H-ph-clamp(H*.035,14,30),r=clamp(Math.min(W,H)*.018,8,14),bw=W/8,bh=clamp(H*.05,16,34),top=H*.05;
          if(!w.balls.length){w.serve-=dt;if(w.serve<=0){w.balls.push({x:w.px*W,y:py-r-2,vx:(Math.random()<.5?-1:1)*W*.32,vy:-H*.62});}}
          for(const b of w.balls){
            const steps=2;
            for(let s=0;s<steps;s++){
              b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;
              if(b.x<r){b.x=r;b.vx=Math.abs(b.vx);sfx('wood',.25);}
              if(b.x>W-r){b.x=W-r;b.vx=-Math.abs(b.vx);sfx('wood',.25);}
              if(b.y<r){b.y=r;b.vy=Math.abs(b.vy);}
              if(b.vy>0&&b.y+r>=py&&b.y-r<=py+ph&&Math.abs(b.x-w.px*W)<=pw/2+r){
                b.vy=-Math.abs(b.vy);b.vx=((b.x-w.px*W)/(pw/2))*W*.48;b.y=py-r;sfx('hit',.55);
              }
              for(const k of w.bricks){
                if(!k.alive)continue;
                const kx=k.c*bw,ky=top+k.r*bh;
                if(b.x+r>kx&&b.x-r<kx+bw&&b.y+r>ky&&b.y-r<ky+bh){
                  k.alive=false;b.vy=-b.vy;sfx('glass',.5);paScore(w.side,1);
                  b.vy*=1.008;b.vx*=1.008;
                  break;
                }
              }
            }
          }
          const lost=w.balls.filter(b=>b.y>H+r);
          if(lost.length){w.balls=w.balls.filter(b=>b.y<=H+r);if(!w.balls.length){w.serve=.8;sfx('low',.8);PS.scores[w.side]=Math.max(0,PS.scores[w.side]-2);$('paScore'+w.side).textContent=PS.scores[w.side];}}
          g.clearRect(0,0,W,H);
          for(const k of w.bricks){
            if(!k.alive)continue;
            paDraw(g,GEMS[k.r%5],k.c*bw+bw/2,top+k.r*bh+bh/2,bw-4,bh-4);
          }
          paDraw(g,'paddle'+w.side,w.px*W,py+ph/2,pw,ph);
          for(const b of w.balls)paDraw(g,'ball0',b.x,b.y,r*2.6);
          if(w.bricks.every(k=>!k.alive)){
            if(worlds.length===1)paSoloEnd(Math.round(PS.elapsed),'초',stage.id,true);
            else paEnd(w.side,'벽돌을 모두 깼어요!');
            return;
          }
        }
      },
      timeUp(){if(stage.people===1)paEnd(null,PS.scores[0]+'개 깼어요');else paWinnerByScore();}
    };
  }

  /* Tower stack */
  function makeStack(stage,host){
    const GEMS=['gem_red','gem_yellow','gem_green','gem_blue','gem_purple'];
    const worlds=paEachSide(stage,host,(box,side)=>{
      box.classList.add('pa-stack-box');
      const v=paCanvas(box),w={v,side,blocks:[{x:.3,w:.4}],move:{x:0,w:.4,dir:1},speed:.45,dead:false,cut:null};(PS.stack=PS.stack||[])[side]=w;
      v.c.addEventListener('pointerdown',e=>{
        e.preventDefault();if(!PS.live||PS.ended||w.dead)return;
        const last=w.blocks[w.blocks.length-1],max=1-w.move.w;let bx=w.move.x-w.move.dir*w.speed*boardLag;if(bx<0)bx=-bx;if(bx>max)bx=2*max-bx;const m={x:clamp(bx,0,max),w:w.move.w},left=Math.max(last.x,m.x),right=Math.min(last.x+last.w,m.x+m.w),keep=right-left;
        if(keep<=.004){w.dead=true;sfx('low',.9);return;}
        const perfect=Math.abs(m.x-last.x)<.012;
        w.blocks.push(perfect?{x:last.x,w:last.w}:{x:left,w:keep});
        sfx(perfect?'goal':'wood',.7,.8+w.blocks.length*.02);
        paSetScore(side,w.blocks.length-1);
        w.speed=Math.min(1.15,w.speed+.022);
        w.move={x:w.blocks.length%2?0:1-w.blocks[w.blocks.length-1].w,w:w.blocks[w.blocks.length-1].w,dir:w.blocks.length%2?1:-1};
      });
      return w;
    });
    return {
      frame(dt){
        let alive=0;
        for(const w of worlds){
          const {v}=w;v.fit();const {g,W,H}=v;
          if(!w.dead){
            alive++;const m=w.move;m.x+=m.dir*w.speed*dt;
            if(m.x<0){m.x=0;m.dir=1;}if(m.x+m.w>1){m.x=1-m.w;m.dir=-1;}
          }
          const bh=clamp(H*.075,20,48),view=Math.max(0,w.blocks.length-Math.floor((H*.62)/bh));
          g.clearRect(0,0,W,H);
          w.blocks.forEach((b,i)=>{
            if(i<view)return;
            const y=H-(i-view+1)*bh;
            paDraw(g,GEMS[i%5],(b.x+b.w/2)*W,y+bh/2,b.w*W,bh-1);
          });
          if(!w.dead){
            const y=H-(w.blocks.length-view+1)*bh,i=w.blocks.length;
            paDraw(g,GEMS[i%5],(w.move.x+w.move.w/2)*W,y+bh/2,w.move.w*W,bh-1);
          }else{g.fillStyle='#3a2418';g.textAlign='center';g.textBaseline='middle';g.font='900 '+Math.round(H*.07)+'px "HojaTitle","HojaBody",sans-serif';g.fillText((w.blocks.length-1)+'층에서 끝!',W/2,H*.2);}
        }
        if(!alive){
          if(worlds.length===1)paSoloEnd(worlds[0].blocks.length-1,'층',stage.id);
          else paWinnerByScore();
        }
      }
    };
  }

  /* Paint war: a finger belongs to the side of the board where it first landed */
  function makePaint(stage,host){
    const box=paEl('div','pa-paint');host.append(box);
    const v=paCanvas(box),COLS=24,ROWS=12,cells=new Array(COLS*ROWS).fill(-1),owners=new Map();
    const count=[0,0];
    const paint=(x,y,team)=>{
      const cw=v.W/COLS,ch=v.H/ROWS,c=clamp(Math.floor(x/cw),0,COLS-1),r=clamp(Math.floor(y/ch),0,ROWS-1);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(Math.abs(dx)+Math.abs(dy)>1)continue;
        const nc=c+dx,nr=r+dy;if(nc<0||nr<0||nc>=COLS||nr>=ROWS)continue;
        const i=nr*COLS+nc,old=cells[i];if(old===team)continue;
        if(old>=0)count[old]--;cells[i]=team;count[team]++;
      }
    };
    v.c.addEventListener('pointerdown',e=>{e.preventDefault();if(!PS.live||PS.ended)return;try{v.c.setPointerCapture(e.pointerId);}catch{}const p=paPos(v,e),team=p.x<v.W/2?0:1;owners.set(e.pointerId,team);paint(p.x,p.y,team);sfx('soft',.3);});
    v.c.addEventListener('pointermove',e=>{const t=owners.get(e.pointerId);if(t===undefined||!PS.live||PS.ended)return;const p=paPos(v,e);paint(p.x,p.y,t);});
    const end=e=>owners.delete(e.pointerId);
    v.c.addEventListener('pointerup',end);v.c.addEventListener('pointercancel',end);
    PS.paint={v,cells};
    return {
      begin(){PS.limit=stage.limit;},
      frame(){
        v.fit();const {g,W,H}=v,cw=W/COLS,ch=H/ROWS;
        g.fillStyle='#fbf4df';g.fillRect(0,0,W,H);
        for(let i=0;i<cells.length;i++){
          if(cells[i]<0)continue;
          g.fillStyle=cells[i]?'#e57b66':'#3a9c8c';g.fillRect((i%COLS)*cw,Math.floor(i/COLS)*ch,cw+.5,ch+.5);
        }
        g.strokeStyle='rgba(58,36,24,.5)';g.setLineDash([8,8]);g.lineWidth=2;g.beginPath();g.moveTo(W/2,0);g.lineTo(W/2,H);g.stroke();g.setLineDash([]);
        const total=COLS*ROWS;
        paSetScore(0,Math.round(count[0]/total*100));paSetScore(1,Math.round(count[1]/total*100));
      },
      timeUp(){paWinnerByScore(PS.scores[0]+'% : '+PS.scores[1]+'%');}
    };
  }

  /* Dots and boxes */
  function makeDots(stage,host){
    const n=stage.n,grid=paEl('div','pa-dots');grid.style.setProperty('--n',n);host.append(grid);
    const svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','-0.5 -0.5 '+(n+1)+' '+(n+1));grid.append(svg);
    let turn=0;const lines=new Map(),boxes=new Map();
    const show=()=>{paHint(gamePlayerName(turn)+' 차례 · 선을 눌러요');$('partyScreen').dataset.turn=turn;};
    const keyH=(r,c)=>'h'+r+','+c,keyV=(r,c)=>'v'+r+','+c;
    function completed(r,c){return lines.has(keyH(r,c))&&lines.has(keyH(r+1,c))&&lines.has(keyV(r,c))&&lines.has(keyV(r,c+1));}
    function claim(key,el){
      if(lines.has(key)||!PS.live||PS.ended)return;
      lines.set(key,turn);el.classList.add('p'+turn,'set');sfx('wood',.7);
      const kind=key[0],[a,b]=key.slice(1).split(',').map(Number);
      const near=kind==='h'?[[a-1,b],[a,b]]:[[a,b-1],[a,b]];let got=0;
      for(const [r,c] of near){
        if(r<0||c<0||r>=n||c>=n||boxes.has(r+','+c)||!completed(r,c))continue;
        boxes.set(r+','+c,turn);got++;
        const rect=document.createElementNS(svgNS,'rect');rect.setAttribute('x',c+.06);rect.setAttribute('y',r+.06);rect.setAttribute('width',.88);rect.setAttribute('height',.88);rect.setAttribute('rx',.08);rect.setAttribute('class','pa-dot-box p'+turn);svg.insertBefore(rect,svg.firstChild);
        paScore(turn,1);
      }
      if(got)sfx('goal',.6);else turn=1-turn;
      if(boxes.size===n*n){paWinnerByScore();return;}
      show();
    }
    const addLine=(key,x1,y1,x2,y2)=>{
      const hit=document.createElementNS(svgNS,'line');hit.setAttribute('x1',x1);hit.setAttribute('y1',y1);hit.setAttribute('x2',x2);hit.setAttribute('y2',y2);hit.setAttribute('class','pa-dot-line');hit.dataset.key=key;
      hit.addEventListener('pointerdown',e=>{e.preventDefault();claim(key,hit);});svg.append(hit);
    };
    for(let r=0;r<=n;r++)for(let c=0;c<n;c++)addLine(keyH(r,c),c,r,c+1,r);
    for(let r=0;r<n;r++)for(let c=0;c<=n;c++)addLine(keyV(r,c),c,r,c,r+1);
    for(let r=0;r<=n;r++)for(let c=0;c<=n;c++){const d=document.createElementNS(svgNS,'circle');d.setAttribute('cx',c);d.setAttribute('cy',r);d.setAttribute('r',.09);d.setAttribute('class','pa-dot');svg.append(d);}
    show();
    return {};
  }

  /* Maths race */
  function makeCalc(stage,host){
    const solo=stage.people===1,goal=15;
    const ui=paEachSide(stage,host,(box,side)=>{
      const q=paEl('div','pa-question'),grid=paEl('div','pa-answers');box.append(q,grid);
      const u={q,grid,side,streak:0};
      return u;
    });
    function ask(u){
      let a,b,text,ans;const op=stage.op==='mix'?['+','−','×'][paRand(3)]:stage.op;
      if(op==='+'){a=2+paRand(48);b=2+paRand(48);ans=a+b;}
      else if(op==='−'){a=10+paRand(60);b=1+paRand(a-1);ans=a-b;}
      else{a=2+paRand(8);b=2+paRand(8);ans=a*b;}
      text=a+' '+op+' '+b;u.q.textContent=text;
      const opts=new Set([ans]);while(opts.size<4){const v=ans+(paRand(21)-10);if(v>=0)opts.add(v);}
      u.grid.replaceChildren(...paShuffle([...opts]).map(v=>paTap(paEl('button','pa-answer',v),()=>{
        if(v===ans){sfx('coin',.6);paScore(u.side,1);u.streak++;
          if(!solo&&PS.scores[u.side]>=goal){paEnd(u.side,PS.scores[0]+' : '+PS.scores[1]);return;}
        }else{sfx('soft',.9);paScore(u.side,-1);u.streak=0;}
        ask(u);
      })));
    }
    return {
      begin(){if(solo)PS.limit=stage.limit;ui.forEach(ask);},
      timeUp(){paSoloEnd(PS.scores[0],'점',stage.id);}
    };
  }

  /* Spot the same picture on two cards */
  function makeSpot(stage,host){
    const EMOJI=['apple','banana','grapes','strawberry','star','moon','ball','balloon','fish1','music','flower','fire','clover','rocket','turtle','icecream'];
    const goal=8;
    const spotButton=sym=>{const b=paEl('button','pa-spot');b.dataset.sym=sym;b.append(paPic(sym));return b;};
    const ui=paEachSide(stage,host,(box,side)=>{const a=paEl('div','pa-spot-card'),b=paEl('div','pa-spot-card');box.classList.add('pa-spot-box');box.append(a,b);return {a,b,side,lock:0};});
    let answer='',busy=false;
    function deal(){
      const pool=paShuffle(EMOJI),per=stage.per;answer=pool[0];busy=false;
      const left=paShuffle([answer,...pool.slice(1,per)]),right=paShuffle([answer,...pool.slice(per,per*2-1)]);
      for(const u of ui){
        const fill=(el,list)=>{
          el.style.setProperty('--cols',Math.ceil(Math.sqrt(per)));
          el.replaceChildren(...paShuffle(list).map(sym=>paTap(spotButton(sym),e=>{
            if(busy||u.lock>0)return;
            if(sym===answer){busy=true;sfx('goal',.7);paScore(u.side,1);
              e.currentTarget.classList.add('right');
              if(PS.scores[u.side]>=goal){paEnd(u.side,PS.scores[0]+' : '+PS.scores[1]);return;}
              paAfter(.7,deal);
            }else{sfx('soft',.9);paFlash(e.currentTarget,'pa-bad');u.lock=.7;}
          })));
        };
        fill(u.a,left);fill(u.b,right);
      }
    }
    PS.spot={get answer(){return answer;}};
    return {begin:deal,frame(dt){for(const u of ui)if(u.lock>0)u.lock-=dt;}};
  }

  Object.assign(PARTY_GAMES,{
    slash:{name:'과일 베기',title:'HOJA 과일 베기',sel:'duel',make:makeSlash,stages:[
      {id:'duel',name:'둘이 대결',desc:'손가락으로 그어 베요 · 별은 +3 · 폭탄은 −3 · 45초 승부',limit:45},
      {id:'solo',name:'혼자 도전',people:1,desc:'45초 동안 최고 기록 도전',limit:45}]},
    flap:{name:'호자 날개',title:'HOJA 날개',sel:'duel',make:makeFlap,stages:[
      {id:'duel',name:'둘이 대결',desc:'톡톡 눌러 틈으로 날아요 · 더 멀리 가면 승리'},
      {id:'solo',name:'혼자 도전',people:1,desc:'몇 칸까지 갈 수 있을까요'}]},
    bricks:{name:'벽돌 깨기',title:'HOJA 벽돌 깨기',sel:'duel',make:makeBricks,stages:[
      {id:'duel',name:'둘이 대결',desc:'받침대를 움직여 벽돌을 깨요 · 공을 놓치면 −2 · 90초 승부',limit:90},
      {id:'solo',name:'혼자 도전',people:1,desc:'벽돌을 모두 깨는 시간에 도전',limit:180}]},
    stack:{name:'탑 쌓기',title:'HOJA 탑 쌓기',sel:'duel',make:makeStack,stages:[
      {id:'duel',name:'둘이 대결',desc:'멈출 때 눌러요 · 어긋난 만큼 잘려요 · 더 높이 쌓으면 승리'},
      {id:'solo',name:'혼자 도전',people:1,desc:'몇 층까지 쌓을 수 있을까요'}]},
    paint:{name:'색칠 전쟁',title:'HOJA 색칠 전쟁',sel:'s20',make:makePaint,stages:[
      {id:'s20',name:'20초',desc:'왼쪽에서 시작한 손가락은 초록, 오른쪽은 빨강 · 많이 칠하면 승리',limit:20},
      {id:'s40',name:'40초',desc:'여러 손가락으로 끝까지 칠해요 · 많이 칠하면 승리',limit:40}]},
    dots:{name:'땅따먹기',title:'HOJA 땅따먹기',sel:'n4',make:makeDots,noCount:true,mood:'calm',stages:[
      {id:'n3',name:'3×3',desc:'선을 번갈아 그어요 · 네모를 닫으면 내 땅, 한 번 더',n:3},
      {id:'n4',name:'4×4',desc:'선을 번갈아 그어요 · 네모를 닫으면 내 땅, 한 번 더',n:4},
      {id:'n6',name:'6×6',desc:'넓은 판에서 오래 겨뤄요',n:6}]},
    calc:{name:'계산 레이스',title:'HOJA 계산 레이스',sel:'add',make:makeCalc,stages:[
      {id:'add',name:'덧셈',op:'+',desc:'먼저 15점 · 틀리면 −1'},
      {id:'sub',name:'뺄셈',op:'−',desc:'먼저 15점 · 틀리면 −1'},
      {id:'mul',name:'구구단',op:'×',desc:'먼저 15점 · 틀리면 −1'},
      {id:'mix',name:'뒤섞기',op:'mix',desc:'세 가지가 섞여 나와요 · 먼저 15점'},
      {id:'solo',name:'혼자 도전',people:1,op:'mix',limit:60,desc:'60초 동안 최고 기록 도전'}]},
    spot:{name:'같은 그림 찾기',title:'HOJA 같은 그림 찾기',sel:'p6',make:makeSpot,stages:[
      {id:'p4',name:'쉬움',per:4,desc:'두 카드에 같은 그림은 하나 · 먼저 8점'},
      {id:'p6',name:'보통',per:6,desc:'두 카드에 같은 그림은 하나 · 먼저 8점'},
      {id:'p9',name:'어려움',per:8,desc:'두 카드에 같은 그림은 하나 · 먼저 8점'}]}
  });
  for(const id of ['slash','flap','bricks','stack','paint','dots','calc','spot'])$('openParty-'+id).addEventListener('click',()=>{
    if(currentGame!==id)streak={side:-1,id:null,count:0};
    currentGame=id;sfx('menu',.8);toggleFullscreen(true);enterSelection();
  });

