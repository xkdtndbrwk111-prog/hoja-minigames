  /* ---------- Lightning missions ----------
     Short missions one after another, each named by one word. Both sides get the same mission with the same layout.
     A slow board is the norm, so missions ask for rubbing, turning, holding and dragging rather than split-second taps,
     and every mission gives several seconds. Everything is drawn inside the side's own play area (below the header). */
  const FL_FRUIT=['apple','orange','melon','grapes','strawberry','banana','kiwi','peach','pear','lemon'];
  const FL_ANIMALS=['bear','chick','cow','dog','elephant','frog','giraffe','monkey','panda','penguin','pig','rabbit'];
  const flPortraitCache={};
  function flPortrait(id){
    const key='portraits/'+id.toLowerCase()+'_'+MOOD_FILE.happy+'.webp';
    return flPortraitCache[key]||(flPortraitCache[key]=Object.assign(new Image(),{src:EMBED_ASSETS[key]}));
  }
  const flUnit=A=>Math.min(A.w,A.h);
  const flAt=(A,nx,ny)=>({x:A.x+nx*A.w,y:A.y+ny*A.h});
  const flDist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function flRing(g,x,y,r,frac,color,width){
    g.lineWidth=width;g.strokeStyle='rgba(0,0,0,.18)';g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();
    if(frac>0){g.strokeStyle=color;g.beginPath();g.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,frac));g.stroke();}
  }

  // Each mission: plan(lvl) picks the layout once for both sides; make(w,plan) returns the side's own state.
  const FL_MISSIONS={
    rub:{word:'문질러요!',hint:'흙을 문질러 털어 유물을 찾아요',
      plan(){return {who:CHARACTERS[paRand(CHARACTERS.length)].id,shade:Array.from({length:14*12},()=>paRand(3)),need:.88};},
      make(w,P){
        const COLS=14,ROWS=12,dirt=new Uint8Array(COLS*ROWS).fill(1),img=flPortrait(P.who);let left=COLS*ROWS,lastSound=0;
        const box=()=>{const s=Math.min(w.A.w*.82,w.A.h*.96);return {x:w.A.x+(w.A.w-s)/2,y:w.A.y+(w.A.h-s)/2,s};};
        const rub=p=>{
          const b=box(),r=b.s*.085,cw=b.s/COLS,ch=b.s/ROWS;let n=0;
          for(let i=0;i<COLS*ROWS;i++){
            if(!dirt[i])continue;
            const cx=b.x+(i%COLS+.5)*cw,cy=b.y+(Math.floor(i/COLS)+.5)*ch;
            if(Math.hypot(cx-p.x,cy-p.y)<r){dirt[i]=0;left--;n++;}
          }
          if(n&&performance.now()-lastSound>110){lastSound=performance.now();sfx('flip',.35,.8+Math.random()*.4);}
          if(1-left/(COLS*ROWS)>=P.need){m.done=true;dirt.fill(0);left=0;}
        };
        const m={done:false,down:rub,move:rub,
          progress:()=>Math.min(1,(1-left/(COLS*ROWS))/P.need),
          draw(g){
            const b=box(),cw=b.s/COLS,ch=b.s/ROWS;
            g.fillStyle='#f3e4c4';g.beginPath();g.roundRect(b.x,b.y,b.s,b.s,b.s*.06);g.fill();
            if(img.complete&&img.naturalWidth){const k=Math.min(b.s/img.naturalWidth,b.s/img.naturalHeight)*.92;g.drawImage(img,b.x+(b.s-img.naturalWidth*k)/2,b.y+(b.s-img.naturalHeight*k)/2,img.naturalWidth*k,img.naturalHeight*k);}
            const COL=['#8a5a32','#7a4e2b','#9d6b3d'];
            for(let i=0;i<COLS*ROWS;i++){
              if(!dirt[i])continue;
              g.fillStyle=COL[P.shade[i]];
              const x=b.x+(i%COLS)*cw,y=b.y+Math.floor(i/COLS)*ch;
              g.beginPath();g.roundRect(x-cw*.18,y-ch*.18,cw*1.36,ch*1.36,cw*.45);g.fill();
            }
          }};
        return m;
      }},
    crank:{word:'돌려요!',hint:'맷돌 손잡이를 빙글빙글 세 바퀴 돌려요',
      plan(lvl){return {turns:3+Math.min(1,lvl>>1)};},
      make(w,P){
        let total=0,quarter=0;const last=new Map();
        const ctr=()=>({x:w.A.x+w.A.w/2,y:w.A.y+w.A.h*.52,r:flUnit(w.A)*.36});
        const ang=p=>{const c=ctr();return Math.atan2(p.y-c.y,p.x-c.x);};
        const m={done:false,
          down(p,id){const c=ctr();if(flDist(p,c)>c.r*.2)last.set(id,ang(p));},
          move(p,id){
            const c=ctr();if(flDist(p,c)<c.r*.2){last.delete(id);return;}
            const a=ang(p);if(!last.has(id)){last.set(id,a);return;}
            let d=a-last.get(id);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;last.set(id,a);
            total+=d;
            const q=Math.floor(Math.abs(total)/(Math.PI/2));if(q>quarter){quarter=q;sfx('wood',.55,.8+q*.03);}
            if(Math.abs(total)>=P.turns*Math.PI*2)m.done=true;
          },
          up(p,id){last.delete(id);},
          progress:()=>Math.min(1,Math.abs(total)/(P.turns*Math.PI*2)),
          draw(g){
            const c=ctr();
            flRing(g,c.x,c.y,c.r*1.12,m.progress(),'#2f9c8c',c.r*.1);
            g.save();g.translate(c.x,c.y);g.rotate(total);
            g.fillStyle='#9a9a94';g.beginPath();g.arc(0,0,c.r,0,Math.PI*2);g.fill();
            g.strokeStyle='#6b6b66';g.lineWidth=c.r*.05;g.stroke();
            g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=c.r*.03;
            for(let i=0;i<8;i++){g.beginPath();g.moveTo(Math.cos(i*Math.PI/4)*c.r*.3,Math.sin(i*Math.PI/4)*c.r*.3);g.lineTo(Math.cos(i*Math.PI/4+.3)*c.r*.92,Math.sin(i*Math.PI/4+.3)*c.r*.92);g.stroke();}
            g.fillStyle='#5a4632';g.beginPath();g.arc(0,0,c.r*.16,0,Math.PI*2);g.fill();
            g.fillStyle='#b5793f';g.strokeStyle='#5a3a1c';g.lineWidth=c.r*.04;
            g.beginPath();g.arc(c.r*.74,0,c.r*.17,0,Math.PI*2);g.fill();g.stroke();
            g.restore();
            g.fillStyle='rgba(47,74,72,.75)';g.font='900 '+Math.round(c.r*.24)+'px "HojaBody",sans-serif';g.textAlign='center';g.textBaseline='middle';
            g.textAlign='left';g.fillText(Math.min(P.turns,Math.floor(Math.abs(total)/(Math.PI*2)))+' / '+P.turns+' 바퀴',w.A.x+w.A.w*.03,w.A.y+c.r*.2);
          }};
        return m;
      }},
    basket:{word:'담아요!',hint:'과일을 끌어서 바구니에 담아요',
      plan(lvl){
        const n=3+Math.min(2,lvl>>1),xs=paShuffle([.14,.32,.5,.68,.86]).slice(0,n);
        return {items:xs.map(x=>({x,y:.12+Math.random()*.3,pic:FL_FRUIT[paRand(FL_FRUIT.length)]}))};
      },
      make(w,P){
        const items=P.items.map(o=>({...o,in:false})),grab=new Map();
        const size=()=>flUnit(w.A)*.2;
        const bowl=()=>({x:w.A.x+w.A.w*.28,y:w.A.y+w.A.h*.66,w:w.A.w*.44,h:w.A.h*.32});
        const inBowl=it=>{const b=bowl(),p=flAt(w.A,it.x,it.y);return p.x>b.x&&p.x<b.x+b.w&&p.y>b.y-size()*.3&&p.y<b.y+b.h;};
        const m={done:false,
          down(p,id){
            const s=size();let best=null,bd=s*.75;
            for(const it of items){if(it.in||[...grab.values()].includes(it))continue;const d=flDist(p,flAt(w.A,it.x,it.y));if(d<bd){bd=d;best=it;}}
            if(best){grab.set(id,best);sfx('tap',.35);}
          },
          move(p,id){const it=grab.get(id);if(!it)return;it.x=clamp((p.x-w.A.x)/w.A.w,.04,.96);it.y=clamp((p.y-w.A.y)/w.A.h,.04,.96);},
          up(p,id){
            const it=grab.get(id);grab.delete(id);if(!it)return;
            if(inBowl(it)){it.in=true;const k=items.filter(o=>o.in).length;it.x=.36+((k-1)%3)*.14;it.y=.78-Math.floor((k-1)/3)*.08;sfx('coin',.45,1+k*.08);}
            if(items.every(o=>o.in))m.done=true;
          },
          progress:()=>items.filter(o=>o.in).length/items.length,
          draw(g){
            const b=bowl(),s=size();
            g.fillStyle='#b5793f';g.strokeStyle='#5a3a1c';g.lineWidth=Math.max(3,s*.05);
            g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x+b.w,b.y);g.quadraticCurveTo(b.x+b.w,b.y+b.h,b.x+b.w/2,b.y+b.h);g.quadraticCurveTo(b.x,b.y+b.h,b.x,b.y);g.closePath();g.fill();g.stroke();
            g.strokeStyle='rgba(90,58,28,.45)';g.lineWidth=Math.max(2,s*.025);
            for(let i=1;i<4;i++){g.beginPath();g.moveTo(b.x+b.w*.08*i,b.y+b.h*.24*i);g.lineTo(b.x+b.w-b.w*.08*i,b.y+b.h*.24*i);g.stroke();}
            for(const it of [...items].sort((a,c)=>(grab.has(a)?1:0)-(grab.has(c)?1:0))){
              const p=flAt(w.A,it.x,it.y),held=[...grab.values()].includes(it);
              paDraw(g,it.pic,p.x,p.y,s*(held?1.15:it.in?.8:1));
            }
          }};
        return m;
      }},
    plug:{word:'막아요!',hint:'물이 새는 구멍 세 개를 손가락으로 동시에 막아요',
      plan(){
        const sets=[[[.3,.42],[.7,.42],[.5,.74]],[[.28,.7],[.5,.38],[.72,.7]],[[.26,.46],[.5,.66],[.74,.46]],[[.3,.36],[.36,.74],[.7,.56]]];
        return {holes:sets[paRand(sets.length)]};
      },
      make(w,P){
        let hold=0,t=0;const NEED=.8;
        const tank=()=>{const s=Math.min(w.A.w*.86,w.A.h*.98);return {x:w.A.x+(w.A.w-s)/2,y:w.A.y+(w.A.h-s)/2,s};};
        const holeAt=h=>{const b=tank();return {x:b.x+h[0]*b.s,y:b.y+h[1]*b.s,r:b.s*.075};};
        const covered=()=>P.holes.map(h=>{const c=holeAt(h);for(const p of w.pointers.values())if(flDist(p,c)<c.r*1.9)return true;return false;});
        const m={done:false,
          progress:()=>hold/NEED,
          tick(dt){
            t+=dt;
            const cov=covered();
            if(cov.every(Boolean)){hold+=dt;if(hold>=NEED){m.done=true;}}
            else hold=Math.max(0,hold-dt*2);
          },
          draw(g){
            const b=tank(),cov=covered();
            g.fillStyle='#a8743f';g.strokeStyle='#5a3a1c';g.lineWidth=b.s*.02;
            g.beginPath();g.roundRect(b.x+b.s*.08,b.y+b.s*.1,b.s*.84,b.s*.86,b.s*.08);g.fill();g.stroke();
            g.strokeStyle='#6e4a28';g.lineWidth=b.s*.03;
            for(const y of [.3,.62,.88]){g.beginPath();g.moveTo(b.x+b.s*.09,b.y+b.s*y);g.lineTo(b.x+b.s*.91,b.y+b.s*y);g.stroke();}
            g.fillStyle='#4aa3d8';g.beginPath();g.ellipse(b.x+b.s*.5,b.y+b.s*.12,b.s*.4,b.s*.05,0,0,Math.PI*2);g.fill();
            P.holes.forEach((h,i)=>{
              const c=holeAt(h);
              if(!cov[i]){
                g.strokeStyle='rgba(74,163,216,.85)';g.lineCap='round';
                for(let k=0;k<3;k++){
                  const dir=h[0]<.5?-1:1,ph=(t*3+k/3)%1;
                  g.lineWidth=c.r*(.5-k*.1);g.beginPath();g.moveTo(c.x,c.y);
                  g.quadraticCurveTo(c.x+dir*c.r*(2+k),c.y-c.r*.4,c.x+dir*c.r*(2.6+k*.8),c.y+c.r*(1.6+ph*1.4));g.stroke();
                }
              }
              g.fillStyle=cov[i]?'#2f9c8c':'#2a1a0e';g.beginPath();g.arc(c.x,c.y,c.r,0,Math.PI*2);g.fill();
              g.strokeStyle='#fff6e0';g.lineWidth=c.r*.18;g.setLineDash([c.r*.35,c.r*.3]);g.beginPath();g.arc(c.x,c.y,c.r*1.9,0,Math.PI*2);g.stroke();g.setLineDash([]);
            });
            if(hold>0)flRing(g,b.x+b.s*.5,b.y+b.s*.5,b.s*.1,hold/NEED,'#ffd24a',b.s*.03);
          }};
        return m;
      }},
    balloon:{word:'멈춰요!',hint:'꾹 누르고 있다가 풍선이 초록 줄에 오면 떼요',
      plan(){return {lo:.66+Math.random()*.1};},
      make(w,P){
        let size=.25,popped=0;const hi=P.lo+.16,RATE=.3;let pressing=false;
        const ctr=()=>({x:w.A.x+w.A.w/2,y:w.A.y+w.A.h*.46,r:Math.min(w.A.w*.42,w.A.h*.46)});
        const m={done:false,
          down(){pressing=true;},
          up(){
            if(w.pointers.size>0)return;
            pressing=false;
            if(size>=P.lo&&size<=hi){m.done=true;sfx('goal',.5);}
            else if(size>.3){sfx('soft',.7);paFlash(w.box,'pa-bad');size=.25;}
          },
          progress:()=>clamp((size-.25)/(P.lo-.25),0,1),
          tick(dt){
            if(popped>0)popped-=dt;
            if(pressing&&w.pointers.size>0&&!m.done){
              size+=RATE*dt;
              if(Math.random()<dt*6)paTone(300+size*500,.08,.08,'sine');
              if(size>1){sfx('boom',.7);paFlash(w.box,'pa-bad');popped=.5;size=.25;pressing=false;w.pointers.clear();}
            }
          },
          draw(g){
            const c=ctr(),bandIn=c.r*P.lo,bandOut=c.r*hi;
            g.fillStyle='rgba(55,170,116,.28)';g.beginPath();g.arc(c.x,c.y,bandOut,0,Math.PI*2);g.arc(c.x,c.y,bandIn,0,Math.PI*2,true);g.fill();
            g.strokeStyle='#2b9a5e';g.lineWidth=Math.max(3,c.r*.025);g.setLineDash([c.r*.06,c.r*.04]);
            for(const r of [bandIn,bandOut]){g.beginPath();g.arc(c.x,c.y,r,0,Math.PI*2);g.stroke();}
            g.setLineDash([]);
            if(popped>0){paDraw(g,'burst',c.x,c.y,c.r*1.4);return;}
            g.strokeStyle='#6b5a48';g.lineWidth=2;g.beginPath();g.moveTo(c.x,c.y+c.r*size);g.quadraticCurveTo(c.x+12,c.y+c.r*(size+.25),c.x,c.y+c.r*1.1);g.stroke();
            paDraw(g,'balloon',c.x,c.y,c.r*size*2);
          }};
        return m;
      }},
    trace:{word:'그어요!',hint:'초록 별에서 시작해 점선을 따라 노란 별까지 그어요',
      plan(lvl){
        const per=1+Math.random()*.6+Math.min(.6,lvl*.15),ph=Math.random()*Math.PI*2,amp=.22+Math.random()*.08,N=60;
        return {pts:Array.from({length:N},(_,i)=>{const k=i/(N-1);return [.1+.8*k,.5+amp*Math.sin(ph+k*per*Math.PI*2)];})};
      },
      make(w,P){
        let prog=0,tracer=null,bad=0;
        const pt=i=>flAt(w.A,P.pts[i][0],P.pts[i][1]),tol=()=>flUnit(w.A)*.09;
        const m={done:false,
          down(p,id){if(tracer===null&&flDist(p,pt(prog))<tol()*1.6)tracer=id;},
          move(p,id){
            if(id!==tracer)return;
            let near=-1,nd=1e9;
            for(let i=prog;i<Math.min(P.pts.length,prog+7);i++){const d=flDist(p,pt(i));if(d<nd){nd=d;near=i;}}
            if(nd>tol()*1.5){tracer=null;bad=.4;prog=Math.max(0,prog-8);sfx('soft',.6);return;}
            if(near>prog)prog=near;
            if(prog>=P.pts.length-1)m.done=true;
          },
          up(p,id){if(id===tracer)tracer=null;},
          progress:()=>prog/(P.pts.length-1),
          tick(dt){if(bad>0)bad-=dt;},
          draw(g){
            const u=flUnit(w.A);g.lineCap='round';g.lineJoin='round';
            g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=tol()*1.6;g.beginPath();P.pts.forEach((_,i)=>{const q=pt(i);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);});g.stroke();
            g.strokeStyle='#6b5a48';g.lineWidth=u*.018;g.setLineDash([u*.03,u*.03]);g.beginPath();P.pts.forEach((_,i)=>{const q=pt(i);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);});g.stroke();g.setLineDash([]);
            if(prog>0){g.strokeStyle=bad>0?'#e0584a':'#2f9c8c';g.lineWidth=u*.05;g.beginPath();for(let i=0;i<=prog;i++){const q=pt(i);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);}g.stroke();}
            const s=pt(0),e=pt(P.pts.length-1),h=pt(prog);
            paDraw(g,'starGold',e.x,e.y,u*.17);
            g.fillStyle='#37aa74';g.beginPath();g.arc(s.x,s.y,u*.06,0,Math.PI*2);g.fill();
            if(tracer===null&&!m.done){g.strokeStyle='#37aa74';g.lineWidth=u*.012;g.beginPath();g.arc(h.x,h.y,u*.07+Math.sin(performance.now()/180)*u*.012,0,Math.PI*2);g.stroke();}
          }};
        return m;
      }},
    smash:{word:'깨요!',hint:'바위를 여러 번 두드려 깨고 보석을 꺼내요',
      plan(lvl){return {need:10+lvl*2,gem:['gem_red','gem_blue','gem_green','gem_yellow','gem_purple'][paRand(5)],cracks:Array.from({length:24},()=>[Math.random()*Math.PI*2,.3+Math.random()*.6,Math.random()*.6-.3])};},
      make(w,P){
        let hits=0,shake=0;
        const ctr=()=>({x:w.A.x+w.A.w/2,y:w.A.y+w.A.h*.52,r:flUnit(w.A)*.4});
        const m={done:false,
          down(p){
            const c=ctr();if(flDist(p,c)>c.r*1.15)return;
            hits++;shake=.15;sfx(hits%2?'hit':'smash',.6,.9+Math.random()*.3);
            if(hits>=P.need){m.done=true;sfx('glass',.7);}
          },
          progress:()=>hits/P.need,
          tick(dt){if(shake>0)shake-=dt;},
          draw(g){
            const c=ctr(),dx=shake>0?(Math.random()-.5)*c.r*.08:0;
            if(m.done){paDraw(g,P.gem,c.x,c.y,c.r*1.1);paDraw(g,'burst',c.x,c.y,c.r*2);return;}
            paDraw(g,'met2',c.x+dx,c.y,c.r*2);
            g.strokeStyle='#2a1a0e';g.lineWidth=Math.max(2,c.r*.025);g.lineCap='round';
            const n=Math.floor(hits/P.need*P.cracks.length);
            for(let i=0;i<n;i++){const [a,l,b]=P.cracks[i];g.beginPath();g.moveTo(c.x+dx,c.y);g.lineTo(c.x+dx+Math.cos(a)*c.r*l*.55,c.y+Math.sin(a)*c.r*l*.55);g.lineTo(c.x+dx+Math.cos(a+b)*c.r*l*.85,c.y+Math.sin(a+b)*c.r*l*.85);g.stroke();}
          }};
        return m;
      }},
    odd:{word:'찾아요!',hint:'혼자 다른 동물 하나를 찾아 눌러요',
      plan(lvl){
        const [a,b]=paShuffle(FL_ANIMALS),n=lvl>=2?4:3;
        return {a,b,n,at:paRand(n*n)};
      },
      make(w,P){
        let lock=0,wrong=-1;
        const cell=i=>{
          const s=Math.min(w.A.w*.9,w.A.h)/P.n,ox=w.A.x+(w.A.w-s*P.n)/2,oy=w.A.y+(w.A.h-s*P.n)/2;
          return {x:ox+(i%P.n+.5)*s,y:oy+(Math.floor(i/P.n)+.5)*s,s};
        };
        const m={done:false,
          down(p){
            if(lock>0)return;
            for(let i=0;i<P.n*P.n;i++){
              const c=cell(i);if(Math.abs(p.x-c.x)>c.s/2||Math.abs(p.y-c.y)>c.s/2)continue;
              if(i===P.at){m.done=true;sfx('goal',.6);}else{wrong=i;lock=.6;sfx('soft',.8);}
              return;
            }
          },
          progress:()=>m.done?1:0,
          tick(dt){if(lock>0)lock-=dt;},
          draw(g){
            for(let i=0;i<P.n*P.n;i++){
              const c=cell(i),bad=lock>0&&i===wrong,dx=bad?(Math.random()-.5)*c.s*.08:0;
              g.fillStyle=m.done&&i===P.at?'#ffe08a':bad?'#f3b0a2':'rgba(255,255,255,.55)';
              g.beginPath();g.roundRect(c.x-c.s*.45,c.y-c.s*.45,c.s*.9,c.s*.9,c.s*.14);g.fill();
              paDraw(g,'ani_'+(i===P.at?P.b:P.a),c.x+dx,c.y,c.s*.72);
            }
          }};
        return m;
      }}
  };
  const FL_KEYS=Object.keys(FL_MISSIONS);

  function makeFlash(stage,host){
    const solo=stage.people===1;
    const worlds=paEachSide(stage,host,(box,side)=>{
      box.classList.add('pa-flash-box');
      const v=paCanvas(box),w={v,box,side,A:{x:0,y:0,w:1,h:1},pointers:new Map(),m:null,state:'wait',burst:0};
      const live=()=>PS.live&&!PS.ended&&w.state==='play'&&w.m&&!w.m.done;
      v.c.addEventListener('pointerdown',e=>{
        e.preventDefault();if(!live())return;try{v.c.setPointerCapture(e.pointerId);}catch{}
        const p=paPos(v,e);w.pointers.set(e.pointerId,p);w.m.down&&w.m.down(p,e.pointerId);
      });
      v.c.addEventListener('pointermove',e=>{
        if(!w.pointers.has(e.pointerId)||!live())return;
        const p=paPos(v,e);w.pointers.set(e.pointerId,p);w.m.move&&w.m.move(p,e.pointerId);
      });
      const end=e=>{
        if(!w.pointers.has(e.pointerId))return;
        const p=paPos(v,e);w.pointers.delete(e.pointerId);
        if(live())w.m.up&&w.m.up(p,e.pointerId);
      };
      v.c.addEventListener('pointerup',end);v.c.addEventListener('pointercancel',end);v.c.addEventListener('lostpointercapture',end);
      return w;
    });
    const total=stage.rounds||0;
    const F={round:0,phase:'idle',t:0,limit:6,key:null,lives:3,cleared:0,first:-1,bag:[],speedNote:false,force:null,worlds,plan:null};
    PS.flash=F;
    const level=()=>solo?Math.floor(F.cleared/3):0;
    function pick(){
      if(F.force){const k=F.force;F.force=null;return k;}
      if(!F.bag.length)F.bag=paShuffle(FL_KEYS).filter(k=>k!==F.key);
      return F.bag.shift();
    }
    function next(){
      F.round++;F.key=pick();F.first=-1;
      const def=FL_MISSIONS[F.key],lvl=level(),plan=def.plan(lvl);F.plan=plan;
      const before=F.limit;
      F.limit=solo?Math.max(3.5,6.5-lvl*.5):Math.max(5,6.5-F.round*.15);
      F.speedNote=solo&&F.round>1&&F.limit<before;
      for(const w of worlds){w.pointers.clear();w.m=def.make(w,plan);w.state='intro';w.burst=0;}
      F.phase='intro';F.t=F.round===1?1.2:.95;
      paHint(def.hint);
      sfx('item',.6,1.2);
    }
    function status(){
      const sec=Math.max(0,Math.ceil(F.t));
      if(solo)paTime(F.phase==='play'?sec+'초':'');
      else paTime(F.round+' / '+total+'판'+(F.phase==='play'?' · '+sec+'초':''));
    }
    function settle(){
      F.phase='result';F.t=1.1;
      for(const w of worlds){
        if(w.state==='play'){w.state='fail';if(solo){F.lives--;sfx('low',.8);}else sfx('soft',.6);}
      }
      if(solo&&F.lives<=0){F.t=1.4;}
    }
    function layout(w){
      const {W,H}=w.v,top=Math.max(64,H*.2);
      w.A={x:W*.03,y:top,w:W*.94,h:H-top-H*.03};
      return top;
    }
    function drawWorld(w,dt){
      const v=w.v;v.fit();const {g,W,H}=v;const top=layout(w);
      g.clearRect(0,0,W,H);
      const def=F.key&&FL_MISSIONS[F.key];
      if(!def||!w.m)return;
      if(F.phase==='play'&&w.state==='play'&&w.m.tick)w.m.tick(dt);
      // Header strip of the side: the mission word and the time left.
      g.textAlign='center';g.textBaseline='middle';
      g.fillStyle='#2f4a48';g.font='900 '+Math.round(top*.5)+'px "HojaBody",sans-serif';
      g.fillText(def.word,W/2,top*.42);
      const frac=F.phase==='play'?clamp(F.t/F.limit,0,1):F.phase==='intro'?1:0;
      g.fillStyle='rgba(0,0,0,.14)';g.beginPath();g.roundRect(W*.08,top*.8,W*.84,top*.1,top*.05);g.fill();
      g.fillStyle=frac<.3?'#e0584a':'#f0bc3a';g.beginPath();g.roundRect(W*.08,top*.8,Math.max(top*.1,W*.84*frac),top*.1,top*.05);g.fill();
      if(solo){for(let i=0;i<3;i++){g.globalAlpha=i<F.lives?1:.25;paDraw(g,'heart',W*.06+i*top*.38,top*.4,top*.32);}g.globalAlpha=1;}
      g.save();g.beginPath();g.rect(0,top,W,H-top);g.clip();
      w.m.draw(g,dt);
      g.restore();
      // Big word before the mission starts, and the result after.
      if(F.phase==='intro'){
        g.fillStyle='rgba(47,74,72,.55)';g.fillRect(0,top,W,H-top);
        g.fillStyle='#fff6e0';g.font='900 '+Math.round(Math.min(W*.16,H*.2))+'px "HojaBody",sans-serif';
        g.fillText(def.word,W/2,top+(H-top)*.45);
        if(F.speedNote){g.font='900 '+Math.round(Math.min(W*.07,H*.08))+'px "HojaBody",sans-serif';g.fillStyle='#ffd24a';g.fillText('빨라져요!',W/2,top+(H-top)*.68);}
      }else if(w.state==='win'||w.state==='fail'){
        w.burst+=dt;
        const k=clamp(w.burst/.25,0,1),cy=top+(H-top)*.45;
        g.globalAlpha=k;
        g.font='900 '+Math.round(Math.min(W*.2,H*.26)*(.6+.4*k))+'px "HojaBody",sans-serif';
        g.lineWidth=Math.min(W,H)*.02;g.strokeStyle='#2a1a0e';
        const text=w.state==='win'?(w.side===F.first&&!solo?'번개!':'성공!'):'아쉽다!';
        g.strokeText(text,W/2,cy);g.fillStyle=w.state==='win'?'#ffe08a':'#f3b0a2';g.fillText(text,W/2,cy);
        g.globalAlpha=1;
      }
    }
    return {
      begin(){next();status();},
      frame(dt){
        if(F.phase==='intro'){
          F.t-=dt;if(F.t<=0){F.phase='play';F.t=F.limit;for(const w of worlds)w.state='play';sfx('goal',.45,1.3);}
        }else if(F.phase==='play'){
          F.t-=dt;
          for(const w of worlds){
            if(w.state==='play'&&w.m.done){
              w.state='win';w.burst=0;
              if(solo){F.cleared++;paScore(0,1);sfx('coin',.8);}
              else{const bonus=F.first<0;if(bonus)F.first=w.side;paScore(w.side,bonus?2:1);sfx('coin',.8,bonus?1.2:1);}
            }
          }
          if(F.t<=0||worlds.every(w=>w.state!=='play'))settle();
        }else if(F.phase==='result'){
          F.t-=dt;
          if(F.t<=0){
            if(solo&&F.lives<=0){paSoloEnd(F.cleared,'개','solo');return;}
            if(!solo&&F.round>=total){paWinnerByScore();return;}
            next();
          }
        }
        status();
        for(const w of worlds)drawWorld(w,dt);
      }
    };
  }

  PARTY_GAMES.flash={name:'번개 미션',title:'HOJA 번개 미션',sel:'r8',make:makeFlash,noCount:false,stages:[
    {id:'r8',name:'8판 대결',rounds:8,desc:'한 단어 미션을 먼저 끝내면 2점, 늦게 끝내도 1점 · 8판 승부'},
    {id:'r12',name:'12판 대결',rounds:12,desc:'미션 12판 · 점수를 많이 모으면 승리'},
    {id:'solo',name:'혼자 도전',people:1,desc:'목숨 3개 · 점점 빨라져요 · 몇 개까지 해낼까요'}]};
  $('openParty-flash').addEventListener('click',()=>{
    if(currentGame!=='flash')streak={side:-1,id:null,count:0};
    currentGame='flash';sfx('menu',.8);toggleFullscreen(true);enterSelection();
  });

