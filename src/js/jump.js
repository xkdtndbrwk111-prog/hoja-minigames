  /* ---------- Hoja Jump ---------- */
  const CJ=(()=>{
const A={"frames": [12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24], "img": {"HOJA": "data:image/png;base64,@@B64:assets/images/jump/HOJA.png@@", "BRICK_BASE": "data:image/png;base64,@@B64:assets/images/jump/BRICK_BASE.png@@", "BRICK_D1": "data:image/png;base64,@@B64:assets/images/jump/BRICK_D1.png@@", "BRICK_D2": "data:image/png;base64,@@B64:assets/images/jump/BRICK_D2.png@@", "BRICK_D3": "data:image/png;base64,@@B64:assets/images/jump/BRICK_D3.png@@", "WINDOW_NORMAL": "data:image/png;base64,@@B64:assets/images/jump/WINDOW_NORMAL.png@@", "WINDOW_CURTAIN": "data:image/png;base64,@@B64:assets/images/jump/WINDOW_CURTAIN.png@@", "WINDOW_OPEN": "data:image/png;base64,@@B64:assets/images/jump/WINDOW_OPEN.png@@", "WINDOW_LIT": "data:image/png;base64,@@B64:assets/images/jump/WINDOW_LIT.png@@", "DOOR": "data:image/png;base64,@@B64:assets/images/jump/DOOR.png@@", "AC": "data:image/png;base64,@@B64:assets/images/jump/AC.png@@", "VENT": "data:image/png;base64,@@B64:assets/images/jump/VENT.png@@", "PIPE": "data:image/png;base64,@@B64:assets/images/jump/PIPE.png@@", "SKY": "data:image/png;base64,@@B64:assets/images/jump/SKY.png@@", "CITY": "data:image/png;base64,@@B64:assets/images/jump/CITY.png@@"}};
const cv=$('cjCanvas');let g=cv.getContext('2d');
// Solo: 640 art px at 3x (128/384/128). Duel: 960 art px at 2x (128/288/64|64/288/128), so hand-drawn tiles stay uncut.
const TILE=64,CELL=64,FOOT=61,HALF=27,TOUCH_TOP=.34,FLOOR=128,DUEL_TIME=60,BOOST_NEED=5;
const SPEED=115,GRAV=900,JV=[335,315,295],FALL_MAX=520;
let W=640,H=360;
const IMG={};
const hash=(a,b)=>{let h=Math.imul(a*73856093^b*19349663,0x5bd1e995);h^=h>>>13;h=Math.imul(h,0x5bd1e995);return ((h^h>>>15)>>>0)/4294967296;};
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

// ---------- Placeholder far towers (replaced later by hand-dotted parallax tiles) ----------
function tower(w,seed,base,dark,lit,pLit){
  const h=96,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  x.fillStyle=base;x.fillRect(0,0,w,h);x.fillStyle=dark;x.fillRect(0,0,2,h);x.fillRect(w-2,0,2,h);
  let n=seed;const rnd=()=>{n=(n*16807)%2147483647;return n/2147483647;};
  for(let y=4;y<h;y+=16){x.fillStyle=dark;x.fillRect(2,y+12,w-4,1);for(let k=6;k<w-8;k+=12){x.fillStyle=rnd()<pLit?lit:dark;x.fillRect(k,y,7,9);}}
  return c;
}
const TW={};
function buildTowers(){
  TW.farD=tower(54,7,'#a9c3cc','#98b5bf','#bcd2d8',.25);TW.farS=tower(54,7,'#dcb3a0','#d0a392','#e8c6b2',.25);TW.farN=tower(54,7,'#27284f','#1f2044','#d9b86a',.3);
  TW.midD=tower(78,31,'#86a4b0','#6f909d','#a6c0c8',.28);TW.midS=tower(78,31,'#ba8c84','#a67670','#cfa598',.28);TW.midN=tower(78,31,'#1b1c3c','#141531','#f2d98a',.35);
}

// ---------- Small code-dotted sprites (stand-ins until hand-drawn ones arrive) ----------
function dot(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw((col,a,b,cw,ch)=>{x.fillStyle=col;x.fillRect(a,b,cw,ch);});return c;}
const SPR={};
function buildSprites(){
  SPR.fish=dot(22,14,r=>{
    r('#3a2418',4,2,10,10);r('#3a2418',2,4,2,6);r('#3a2418',14,3,2,8);r('#3a2418',15,5,2,4);r('#3a2418',17,1,4,12);
    r('#ff9a4a',5,3,8,8);r('#ff9a4a',3,5,2,4);r('#ff9a4a',13,4,2,6);r('#ff9a4a',15,6,2,2);r('#ff9a4a',18,2,2,10);
    r('#ffd08a',6,8,6,2);r('#fff8e8',5,4,3,3);r('#3a2418',6,5,1,1);r('#d96a24',10,4,1,3);
  });
  const pig=(up)=>dot(28,20,r=>{
    r('#3f4556',6,8,16,8);r('#3f4556',2,6,6,5);r('#9aa3b5',7,9,14,6);r('#c3cad6',3,7,4,3);r('#23262e',3,8,1,1);r('#f0a23c',0,8,2,2);r('#7f8a9f',20,11,6,3);
    if(up){r('#3f4556',10,1,8,8);r('#7f8a9f',11,2,6,7);}else{r('#3f4556',10,14,8,6);r('#7f8a9f',11,14,6,5);}
  });
  SPR.pigeon=[pig(true),pig(false)];
}

// ---------- Sky: colour follows altitude ----------
const SKY=[[0,[176,218,234],[232,240,232]],[1200,[176,218,234],[232,240,232]],[2400,[198,206,194],[250,228,184]],[3600,[232,162,130],[252,210,162]],[4800,[116,84,134],[228,134,126]],[6000,[40,40,94],[108,70,118]],[7500,[10,12,38],[34,30,74]]];
function skyAt(alt){
  for(let k=SKY.length-2;k>=0;k--)if(alt>=SKY[k][0]){const a=SKY[k],b=SKY[k+1],u=Math.min(1,(alt-a[0])/(b[0]-a[0])),t=u*u*(3-2*u);return [a[1].map((v,i)=>lerp(v,b[1][i],t)),a[2].map((v,i)=>lerp(v,b[2][i],t))];}
  return [SKY[0][1],SKY[0][2]];
}
const nightOf=a=>clamp((a-4000)/3000,0,1);
// Walls catch the sunset too, peaking with the sky.
const warmOf=a=>a<3600?clamp((a-2000)/1600,0,1):clamp((4800-a)/1200,0,1);

// ---------- Game state ----------
// G: one match. Each player owns a lane: its own camera, ledges and Hoja over the same layout seed.
const G={mode:'menu',phase:'menu',time:0,count:0,overT:0,lanes:[],seed:0,lastSec:0,rush:false,best:0,resume:'play'};
function makeLane(id,vx,vw,lc,rc,shared){
  const LX=vx+lc*TILE,RX=vx+vw-rc*TILE;
  const L={id,vx,vw,lc,rc,LX,RX,sw:RX-LX,shared,started:false,cam:-(H-26),scroll:0,maxAlt:0,plats:[],fish:[],pots:[],birds:[],fx:[],nextY:0,gen:0,trailGen:0,prev:null,seed:G.seed,
    potN:0,potT:8,birdN:0,birdT:14,shake:0,out:0,gauge:0,nextMile:10,beatBest:false,
    p:{x:(LX+RX)/2,y:0,vy:0,dir:id?1:-1,on:null,left:3,lock:0,blink:0,anim:0,landT:0,sx:1,sy:1,boost:0},el:{}};
  const g0={x:LX,y:0,w:L.sw,wall:0,ground:true,type:'n'};
  L.plats.push(g0);L.p.on=g0;L.prev=g0;
  return L;
}
function laneUi(){
  const box=$('cjLaneUi');box.innerHTML='';
  for(const L of G.lanes){
    const left=L.vx/W*100,width=L.vw/W*100,facing=TABLET&&G.mode==='duel';
    let host=box;
    if(facing){host=document.createElement('div');host.className='cj-lane'+(L.id?' turned':'');host.style.left=left+'%';host.style.width=width+'%';box.append(host);}
    const add=(cls,txt)=>{const d=document.createElement('div');d.className='cj-t cj-'+cls;d.style.left=facing?'0':left+'%';d.style.width=facing?'100%':width+'%';d.textContent=txt||'';host.append(d);return d;};
    L.el.hud=add('hud','0층');L.el.best=add('best');L.el.banner=add('banner');
    L.el.hint=add('hint',G.mode==='duel'?(TABLET?'내 쪽을 터치하면 점프':L.id?'오른쪽 터치로 점프':'왼쪽 터치로 점프'):'아래쪽 어디든 터치하면 점프! 공중에서 두 번 더');
    if(G.mode==='menu'){L.el.hud.style.display='none';L.el.hint.style.display='none';}
  }
}
function setMode(mode){
  if(mode!=='menu')roundBegin();
  G.mode=mode;G.seed=Math.floor(Math.random()*1e6);G.rush=false;$('cjTimer').style.color='';G.best=+preference('jump-best','0');$('jumpOverlay').hidden=true;setBgmTempo(1);
  W=mode==='duel'?960:640;resize();
  G.lanes=mode==='duel'?[makeLane(0,0,480,2,1),makeLane(1,480,480,1,2)]:[makeLane(0,0,640,2,2)];
  for(const L of G.lanes)fillPlats(L);
  laneUi();
  $('cjTitle').style.display=mode==='menu'?'':'none';
  $('cjMenu').style.display=mode==='menu'?'flex':'none';
  $('cjAgain').style.display='none';$('cjResult').style.display='none';
  $('cjTimer').style.display='none';$('cjCount').style.display='none';
  $('cjKeys').style.display=mode==='menu'?'flex':'none';const pb=$('cjPause');pb.style.display=mode==='menu'?'none':'block';pb.classList.toggle('duel',mode==='duel');
  if(mode!=='menu')hofRefresh();
  if(mode==='menu'){G.phase='menu';playBgm('menu',{gain:.8});}
  else if(mode==='solo'){G.phase='play';showBest();playMood('bright');setBgmTempo(1);}
  else{G.phase='count';G.count=3;G.time=DUEL_TIME;G.lastSec=0;$('cjCount').style.display='block';$('cjTimer').style.display='block';$('cjTimer').textContent=DUEL_TIME;playMood('action');setBgmTempo(1);}
}
function readBest(){return G.best;}
function showBest(){const b=readBest();G.lanes[0].el.best.textContent=b?'최고 '+b+'층':'';}

// Ledge kinds unlock with height so a round keeps changing.
function fillPlats(L){
  while(L.nextY>L.cam-260){
    const i=++L.gen,r=(k)=>hash(L.seed+i*17,k*131+i),f=-L.nextY/FLOOR,duel=L.sw<300,hard=clamp((f-40)/40,0,1);
    L.nextY-=Math.round(lerp(58+24*hard,(f>12?124:108)+8*hard,r(1))/4)*4;
    const y=L.nextY,minW=(duel?80:96)-Math.round(hard*3)*8,maxW=(duel?144:176)-(f>30?32:0)-48*hard;
    const kind=r(7);
    let type='n';
    if(f>=4&&kind<.16)type='move';else if(f>=9&&kind<.3)type='crumble';else if(f>=6&&kind<.38)type='spring';
    let w=type==='spring'?64:type==='move'?minW:Math.round(lerp(minW,maxW,r(2))/16)*16;
    const prev=L.prev,reach=duel?70:84,range=type==='move'?Math.min(44,(L.sw-w)/2-8):0;
    let lo=Math.max(L.LX+range,prev.x-w-reach),hi=Math.min(L.RX-w-range,prev.x+prev.w+reach);
    if(prev.ground||lo>hi){lo=L.LX+range;hi=L.RX-w-range;}
    let x=Math.round(lerp(lo,hi,r(3))/4)*4,wall=0;
    if(type!=='move'){if(x-L.LX<32){x=L.LX;wall=-1;}else if(L.RX-x-w<32){x=L.RX-w;wall=1;}}
    const pl={x,y,w,wall,type,x0:x,range,ph:r(11)*6,t:0,fall:false,sq:0};
    L.plats.push(pl);L.prev=pl;
    if(r(4)<(duel?.4:.6)-.4*hard){
      const w2=Math.round(lerp(minW,duel?112:128,r(5))/16)*16,left=x-L.LX,right=L.RX-x-w,y2=y+Math.round(lerp(-12,28,r(6))/4)*4;
      const mk=(nx,wl)=>L.plats.push({x:nx,y:y2,w:w2,wall:wl,type:'n',x0:nx,range:0,ph:0,t:0,fall:false,sq:0});
      if(left>=right&&left>=w2+40)mk(L.LX,-1);else if(right>=w2+40)mk(L.RX-w2,1);
    }
    // Fish trail: an arc from the last ledge to this one, so it also shows where to jump next.
    if(type!=='move'&&prev.type!=='move'&&!prev.ground&&i-L.trailGen>2&&r(8)<.34*(1-.5*hard)){
      L.trailGen=i;
      const ex=x+w/2,a0=prev.x+16,a1=prev.x+prev.w-16,near=clamp(ex,a0,a1),sx=Math.abs(near-ex)<48?clamp(ex+(ex<(L.LX+L.RX)/2?56:-56),a0,a1):near,n=r(9)<.5?3:4;
      for(let k=0;k<n;k++){const t=k/(n-1);L.fish.push({x:clamp(lerp(sx,ex,t),L.LX+HALF,L.RX-HALF),y:lerp(prev.y,y,t)-26-34*Math.sin(t*Math.PI),got:false});}
    }
  }
  const lim=L.cam+H+160;
  L.plats=L.plats.filter(q=>q.y<lim);L.fish=L.fish.filter(o=>o.y<lim&&!o.got);
}
function burst(L,x,y,n,col,sp,up){for(let i=0;i<n;i++){const a=Math.random()*6.283,s=sp*(.4+Math.random()*.6);L.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(up||0),t:0,life:.3+Math.random()*.25,c:col,s:2+Math.floor(Math.random()*3)});}if(L.fx.length>160)L.fx.splice(0,L.fx.length-160);}
function banner(L,txt){const e=L.el.banner;if(!e)return;e.textContent=txt;e.classList.remove('on');void e.offsetWidth;e.classList.add('on');}
function jump(L){
  const p=L.p;
  if(G.phase!=='play'||L.out>0||p.lock>0||p.left<=0||p.boost>0)return;
  if(!L.started){L.started=true;L.el.hint.style.display='none';}
  const n=3-p.left;p.vy=-JV[n];p.left--;p.on=null;p.landT=0;p.sx=.78;p.sy=1.28;
  burst(L,p.x,p.y,n===2?12:6,n===2?'#ffe27a':'#fff8e8',70+n*30);
  beep(420+n*170,.09,'square',.05);if(n===2)beep(1040,.14,'triangle',.05);
}
function landRange(L,q){return q.ground?[L.LX+HALF,L.RX-HALF]:[Math.max(L.LX+HALF,q.x+10),Math.min(L.RX-HALF,q.x+q.w-10)];}
function hitHoja(L){
  const p=L.p;p.blink=1.1;p.lock=.45;L.shake=.25;L.gauge=Math.max(0,L.gauge-1);
  if(p.on)p.left=3;else{p.left=0;p.vy=Math.max(p.vy,170);}
  burst(L,p.x,p.y-24,10,'#ff7a5c',110);beep(150,.2,'sawtooth',.07);
}
function stepFx(L,dt){
  for(const f of L.fx){f.t+=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=220*dt;}
  L.fx=L.fx.filter(f=>f.t<f.life);L.shake=Math.max(0,L.shake-dt);
}
function stepLane(L,dt,live){
  stepFx(L,dt);
  const p=L.p;p.anim+=dt;p.sx=lerp(p.sx,1,Math.min(1,dt*12));p.sy=lerp(p.sy,1,Math.min(1,dt*12));
  if(L.out>0){L.out-=dt;if(L.out<=0)respawn(L);return;}
  p.lock=Math.max(0,p.lock-dt);p.blink=Math.max(0,p.blink-dt);p.landT=Math.max(0,p.landT-dt);
  for(const q of L.plats){
    q.sq=Math.max(0,q.sq-dt);
    if(q.type==='move'){q.ph+=dt*1.4;const nx=q.x0+Math.sin(q.ph)*q.range,d=nx-q.x;q.x=nx;if(p.on===q)p.x+=d;}
    if(q.type==='crumble'&&q.t>0&&!q.fall){q.t-=dt;if(q.t<=0){q.fall=true;burst(L,q.x+q.w/2,q.y,10,'#8a6a4f',70);beep(110,.14,'square',.05);if(p.on===q){p.on=null;p.vy=30;}}}
    if(q.fall)q.y+=170*dt;
  }
  p.x+=p.dir*SPEED*dt;
  if(p.boost>0){
    p.boost-=dt;p.vy=-430;p.y+=p.vy*dt;
    if(p.x<L.LX+HALF){p.x=L.LX+HALF;p.dir=1;}else if(p.x>L.RX-HALF){p.x=L.RX-HALF;p.dir=-1;}
    burst(L,p.x,p.y-8,1,Math.random()<.5?'#ffe27a':'#ff9a4a',50);
    if(p.boost<=0){p.vy=-180;p.left=3;p.blink=.5;const nx=clamp(Math.round(p.x+p.dir*33-56),L.LX,L.RX-112);L.plats.push({x:nx,y:Math.round(p.y+44),w:112,wall:0,type:'n',x0:nx,range:0,ph:0,t:0,fall:false,sq:0});burst(L,p.x,p.y+44,10,'#ffe27a',90);}
  }else if(p.on){
    const [lo,hi]=landRange(L,p.on);
    if(p.x<lo){p.x=lo;p.dir=1;}else if(p.x>hi){p.x=hi;p.dir=-1;}
    p.y=p.on.y;
  }else{
    if(p.x<L.LX+HALF){p.x=L.LX+HALF;p.dir=1;}else if(p.x>L.RX-HALF){p.x=L.RX-HALF;p.dir=-1;}
    const y0=p.y;p.vy=Math.min(FALL_MAX,p.vy+GRAV*dt);p.y+=p.vy*dt;
    if(p.vy>0)for(const q of L.plats){
      if(!q.fall&&y0<=q.y&&p.y>=q.y&&p.x>=q.x-10&&p.x<=q.x+q.w+10){
        p.y=q.y;p.left=3;
        if(q.type==='spring'){p.vy=-560;q.sq=.22;p.sx=.8;p.sy=1.3;burst(L,p.x,p.y,8,'#ff6b5c',90);beep(520,.18,'triangle',.08);beep(780,.2,'triangle',.05);break;}
        p.vy=0;p.on=q;p.landT=.12;p.sx=1.28;p.sy=.74;const [lo,hi]=landRange(L,q);p.x=clamp(p.x,lo,hi);
        if(q.type==='crumble'&&q.t<=0){q.t=.85;beep(190,.08,'square',.04);}
        burst(L,p.x,p.y,5,'#efe6d0',55,30);beep(190,.05,'triangle',.05);
        break;
      }
    }
  }
  if(!live)return;
  // Fish fill the boost gauge; the fifth one launches Hoja.
  for(const o of L.fish){
    if(!o.got&&Math.abs(o.x-p.x)<30&&o.y>p.y-52&&o.y<p.y+8){
      o.got=true;L.gauge+=G.rush?2:1;burst(L,o.x,o.y,6,'#bfeaf7',70);beep(740+L.gauge*110,.08,'square',.05);
      if(L.gauge>=BOOST_NEED){L.gauge-=BOOST_NEED;p.boost=.95;p.on=null;p.lock=0;L.shake=.2;banner(L,'슈퍼 점프!');beep(600,.5,'sawtooth',.05);beep(900,.5,'square',.03);break;}
    }
  }
  const alt=-p.y;
  if(alt>L.maxAlt){
    L.maxAlt=alt;const n=Math.floor(alt/FLOOR);L.el.hud.textContent=n+'층';
    if(n>=L.nextMile){banner(L,L.nextMile+'층 돌파!');L.nextMile+=10;burst(L,p.x,p.y-30,18,'#ffe27a',150);beep(880,.1,'square',.05);beep(1175,.2,'square',.05);}
    if(G.mode==='solo'&&!L.beatBest){const b=readBest();if(b>0&&n>b){L.beatBest=true;banner(L,'최고 기록 돌파!');beep(1320,.3,'triangle',.07);}}
  }
  if(L.maxAlt>60)L.scroll=Math.min(26,Math.max(4,L.scroll+dt*.14));
  L.cam-=L.scroll*dt;
  const want=p.y-H*.58;if(want<L.cam)L.cam=lerp(L.cam,want,Math.min(1,dt*(p.boost>0?9:5)));
  L.cam=Math.min(L.cam,-(H-26));
  fillPlats(L);
  // Hazards: both lanes draw from the same seeded schedule, so a duel stays fair.
  L.potT-=dt;
  if(L.potT<=0&&L.maxAlt>200){const k=++L.potN,r=j=>hash(L.seed+k*29,j+7);L.potT=lerp(7,3.6,Math.min(1,L.maxAlt/3000))+r(1)*2;L.pots.push({x:L.LX+24+r(2)*(L.sw-48),warn:.9,y:0,vy:0});}
  L.birdT-=dt;
  if(L.birdT<=0&&L.maxAlt>1000){const k=++L.birdN,r=j=>hash(L.seed+k*43,j+3),dir=r(1)<.5?1:-1;L.birdT=lerp(9,5,Math.min(1,L.maxAlt/5000))+r(2)*3;L.birds.push({dir,x:dir>0?L.LX-30:L.RX+30,y:p.y-24,warn:1,fl:0});}
  for(const o of L.pots){
    if(o.warn>0){o.warn-=dt;if(o.warn<=0){o.y=L.cam-24;o.vy=150;}continue;}
    o.vy+=240*dt;o.y+=o.vy*dt;
    if(Math.abs(o.x-p.x)<26&&o.y>p.y-44&&o.y<p.y+4){
      if(p.boost>0){burst(L,o.x,o.y,10,'#c76b3a',120);o.y=1e9;beep(300,.1,'square',.05);}
      else if(p.blink<=0){o.y=1e9;hitHoja(L);}
    }
  }
  L.pots=L.pots.filter(o=>o.warn>0||o.y<L.cam+H+60);
  for(const o of L.birds){
    o.fl+=dt;if(o.warn>0){o.warn-=dt;continue;}
    o.x+=o.dir*135*dt;
    if(Math.abs(o.x-p.x)<30&&o.y>p.y-50&&o.y<p.y+6){
      if(p.boost>0){burst(L,o.x,o.y,10,'#c3cad6',120);o.x=1e9;beep(300,.1,'square',.05);}
      else if(p.blink<=0){o.x=1e9;hitHoja(L);}
    }
  }
  L.birds=L.birds.filter(o=>o.x>L.LX-60&&o.x<L.RX+60&&o.y<L.cam+H+60);
  if(p.y>L.cam+H+90)fell(L);
}
function fell(L){
  L.shake=.3;beep(240,.3,'triangle',.08);
  if(G.mode==='solo'){endSolo(L);return;}
  // Duel: lose time and the gauge instead of the match.
  L.out=1;L.gauge=0;banner(L,'다시 올라가요!');
}
function respawn(L){
  const p=L.p,top=L.cam+H*.3,bot=L.cam+H*.8;
  const c=L.plats.filter(q=>!q.fall&&q.type==='n'&&q.y>top&&q.y<bot).sort((a,b)=>b.y-a.y)[0];
  p.boost=0;p.left=3;p.blink=2;p.lock=0;
  if(c){p.on=c;p.y=c.y;p.x=c.x+c.w/2;p.vy=0;p.x=clamp(p.x,L.LX+HALF,L.RX-HALF);}
  else{p.on=null;p.y=L.cam+70;p.vy=0;p.x=(L.LX+L.RX)/2;}
}
function endSolo(L){
  G.phase='over';G.overT=0;const n=Math.floor(L.maxAlt/FLOOR),b=readBest();
  if(n>b){remember('jump-best',String(n));G.best=n;}
  hofRecord('jump',0,n);
  showResult(n+'층까지 올라갔어요!',n>b&&b>0?'새 기록!':(b?'최고 기록 '+Math.max(n,b)+'층':''));
  beep(200,.3,'triangle',.08);stopBgm(.4);
}
function endDuel(){
  G.phase='over';G.overT=0;$('cjTimer').style.display='none';
  const [a,b]=G.lanes,na=Math.floor(a.maxAlt/FLOOR),nb=Math.floor(b.maxAlt/FLOOR);
  hofRecord('jump',0,na);hofRecord('jump',1,nb);
  showResult(na===nb?'무승부!':(na>nb?'왼쪽 승리!':'오른쪽 승리!'),na+'층 : '+nb+'층');
  victoryJingle();
}
function showResult(t,s){$('cjPause').style.display='none';const e=$('cjResult');e.innerHTML=t+(s?'<small>'+s+'</small>':'');e.style.display='block';for(const L of G.lanes)L.el.banner.classList.remove('on');}
function step(dt){
  if(G.phase==='menu'){for(const L of G.lanes)stepLane(L,dt,false);return;}
  if(G.phase==='count'){
    G.count-=dt;const n=Math.ceil(G.count);$('cjCount').textContent=n>0?n:'시작!';
    if(n!==G.lastSec){G.lastSec=n;beep(n>0?520:880,.12,'square',.06);}
    if(G.count<=0){G.phase='play';setTimeout(()=>{$('cjCount').style.display='none';},450);}
    for(const L of G.lanes)stepLane(L,dt,false);
    return;
  }
  if(G.phase==='over'){
    G.overT+=dt;for(const L of G.lanes)stepFx(L,dt);
    if(G.overT>.7)$('cjAgain').style.display='flex';
    return;
  }
  for(const L of G.lanes)if(G.phase==='play')stepLane(L,dt,true);
  if(G.mode==='duel'&&G.phase==='play'){
    const before=Math.ceil(G.time);G.time-=dt;const s=Math.ceil(G.time);
    if(s!==before){$('cjTimer').textContent=Math.max(0,s);if(s<=10&&s>0)beep(760,.07,'square',.05);}
    if(s<=10&&!G.rush){G.rush=true;$('cjTimer').style.color='#ff7a5c';for(const L of G.lanes)banner(L,'막판! 생선 2배');beep(990,.3,'square',.06);setBgmTempo(1.12);}
    const [a,b]=G.lanes,na=Math.floor(a.maxAlt/FLOOR),nb=Math.floor(b.maxAlt/FLOOR);
    a.el.hud.style.color=na>nb?'#ffe27a':'';b.el.hud.style.color=nb>na?'#ffe27a':'';
    if(G.time<=0)endDuel();
  }
}

// ---------- Drawing ----------
const WIN=['WINDOW_NORMAL','WINDOW_CURTAIN','WINDOW_OPEN','WINDOW_LIT'];
const DMG=['BRICK_D1','BRICK_D2','BRICK_D3'];
function tile(n,x,y){g.drawImage(IMG[n],x,y);}
function drawWall(L,side,cam,night,warm){
  if(!(side?L.rc:L.lc))return;
  const x0=side?L.RX:L.vx,cols=side?L.rc:L.lc,r0=Math.max(0,Math.floor(-(cam+H)/TILE)),r1=Math.floor(-cam/TILE),sd=side+L.id*4;
  const piped=!side&&cols===2&&L.id===0,door=!side&&cols===2&&L.id===0;
  for(let r=r0;r<=r1;r++){
    const y=Math.round(-TILE*(r+1)-cam);
    for(let c=0;c<cols;c++){
      const h=hash(sd*2+c+11,r);
      tile(h<.2?DMG[Math.floor(h*15)]:'BRICK_BASE',x0+c*TILE,y);
    }
    if(warm>0){g.fillStyle=`rgba(255,140,70,${(warm*.16).toFixed(3)})`;g.fillRect(x0,y,cols*TILE,TILE);}
    if(night>0){g.fillStyle=`rgba(18,18,58,${(night*.55).toFixed(3)})`;g.fillRect(x0,y,cols*TILE,TILE);}
    // The outer left wall keeps one unbroken drainpipe until an end piece exists.
    if(piped)tile('PIPE',x0,y);
    if(r<2&&door)continue;
    if(r===0){tile('AC',x0,y);if(cols>1)tile('VENT',x0+TILE,y);continue;}
    for(let c=piped?1:0;c<cols;c++){
      if(r%2===1){if(r>1){const a=hash(sd*5+c+40,r);if(a<.16)tile('AC',x0+c*TILE,y);else if(a<.26)tile('VENT',x0+c*TILE,y);}continue;}
      const a=hash(sd*3+c+70,r);let n=a<.5?WIN[0]:a<.72?WIN[1]:a<.9?WIN[2]:WIN[3];
      if(hash(sd*7+c+90,r)<night*.8)n=WIN[3];
      tile(n,x0+c*TILE,y);
    }
  }
  if(door&&r0===0)g.drawImage(IMG.DOOR,x0+TILE,Math.round(-128-cam));
  // Inner corner line so the wall reads as the edge of the play shaft.
  const ex=side?L.RX:L.LX;
  g.fillStyle='#2e1a16';g.fillRect(side?ex:ex-2,0,2,H);
  g.fillStyle='rgba(30,16,14,.28)';g.fillRect(side?ex-5:ex,0,5,H);
}
function drawBack(L,cam,alt,night){
  const [top,bot]=skyAt(alt),LX=L.LX,RX=L.RX;
  for(let y=0;y<H;y+=6){const t=y/H,col=top.map((v,i)=>Math.round(lerp(v,bot[i],t)));g.fillStyle=`rgb(${col})`;g.fillRect(LX,y,RX-LX,6);}
  const base=-cam-H; // altitude of the bottom of the screen
  // Pack clouds fade out as the climb passes them.
  const skyA=clamp(1-base/700,0,1),cityX=Math.round((LX+RX)/2-192);
  if(skyA>0){g.globalAlpha=skyA;const y=Math.round(H-448-26+base*.16);for(let x=cityX;x<RX;x+=224)g.drawImage(IMG.SKY,x,y,224,448);g.globalAlpha=1;}
  const sunT=clamp((alt-2000)/1600,0,1),wS=sunT*(1-night),wD=1-night-wS;
  const stack=(d,s,n,x,sp,a)=>{
    const o=Math.floor(base*sp)%96;
    for(let y=H-96+o;y>-96;y-=96)for(const f of [[d,a*wD],[s,a*wS],[n,a*night]]){if(f[1]<=.002)continue;g.globalAlpha=f[1];g.drawImage(f[0],x,y);}
    g.globalAlpha=1;
  };
  // Towers rise out of the ground band of the city: only show once the band sinks.
  const towerA=clamp((base-40)/260,0,1);
  if(towerA>0){stack(TW.farD,TW.farS,TW.farN,LX+44,.22,.8*towerA);stack(TW.farD,TW.farS,TW.farN,RX-120,.22,.8*towerA);}
  if(base*.3<H+60){const y=Math.round(H-258-20+base*.3);g.drawImage(IMG.CITY,cityX,y,384,258);}
  if(towerA>0){stack(TW.midD,TW.midS,TW.midN,LX,.45,towerA);stack(TW.midD,TW.midS,TW.midN,RX-78,.45,towerA);}
}
function drawGround(L,cam){
  const y=Math.round(-cam);if(y>H)return;
  g.fillStyle='#b7b5a6';g.fillRect(L.vx,y,L.vw,3);g.fillStyle='#928f83';g.fillRect(L.vx,y+3,L.vw,H);
  g.fillStyle='#74726a';for(let x=L.vx;x<L.vx+L.vw;x+=48)g.fillRect(x,y+3,2,23);g.fillRect(L.vx,y+13,L.vw,1);
}
function drawPlat(q,cam){
  if(q.ground)return;
  const shake=q.type==='crumble'&&q.t>0&&!q.fall?(Math.floor(q.t*30)%2?1:-1):0;
  const y=Math.round(q.y-cam),x=Math.round(q.x)+shake,w=q.w;if(y<-30||y>H+30)return;
  if(q.type==='spring'){
    // Striped awning: bounces Hoja high.
    const d=q.sq>0?3:0;
    g.fillStyle='#3a2418';g.fillRect(x,y-1+d,w,12-d);
    for(let k=0;k<w-2;k+=10){g.fillStyle=(k/10)%2?'#fff0d8':'#e8483c';g.fillRect(x+1+k,y+d,Math.min(10,w-2-k),9-d);}
    g.fillStyle='#3a2418';g.fillRect(x+6,y+11,3,6);g.fillRect(x+w-9,y+11,3,6);
    return;
  }
  if(q.type==='crumble'){
    g.fillStyle='#2e1a16';g.fillRect(x,y-1,w,12);
    g.fillStyle='#b98a56';g.fillRect(x+1,y,w-2,3);g.fillStyle='#8a6240';g.fillRect(x+1,y+3,w-2,6);
    g.fillStyle='#2e1a16';for(let k=x+14;k<x+w-6;k+=22){g.fillRect(k,y,1,5);g.fillRect(k+1,y+4,1,3);g.fillRect(k+2,y+6,1,3);}
    return;
  }
  g.fillStyle='#35373d';g.fillRect(x,y-1,w,14);
  g.fillStyle=q.type==='move'?'#ffd24a':'#d8d6c4';g.fillRect(x+1,y,w-2,3);
  g.fillStyle='#a2a396';g.fillRect(x+1,y+3,w-2,6);
  g.fillStyle='#6d6f6c';g.fillRect(x+1,y+9,w-2,3);
  g.fillStyle='#4a4c50';for(let k=x+8;k<x+w-4;k+=16)g.fillRect(k,y+5,2,2);
  g.fillStyle='#35373d';
  if(q.type==='move'){g.fillStyle='#3a2418';for(let k=0;k<3;k++){g.fillRect(x+2+k*6,y+3,3,6);g.fillRect(x+w-5-k*6,y+3,3,6);}return;}
  // Wall-mounted ledges get a bracket; free ones hang like a steel beam end cap.
  if(q.wall){const bx=q.wall<0?x:x+w;for(let i=0;i<14;i++){const l=14-i;g.fillRect(q.wall<0?bx:bx-l,y+13+i,l,1);}
    g.fillStyle='#6d6f6c';for(let i=0;i<10;i++){const l=10-i;g.fillRect(q.wall<0?bx:bx-l,y+13+i,l,1);}}
  else{g.fillRect(x+3,y+13,4,3);g.fillRect(x+w-7,y+13,4,3);}
}
function drawPot(o,cam){
  if(o.warn>0){if(Math.floor(o.warn*8)%2===0)warnMark(Math.round(o.x),Math.round(H*.27));return;}
  const x=Math.round(o.x)-12,y=Math.round(o.y-cam)-12;
  g.fillStyle='#3f8a44';g.fillRect(x+8,y,8,4);g.fillRect(x+4,y+3,16,5);
  g.fillStyle='#2c6a33';g.fillRect(x+10,y+5,4,4);
  g.fillStyle='#4a2414';g.fillRect(x+2,y+8,20,4);g.fillRect(x+4,y+12,16,12);
  g.fillStyle='#c76b3a';g.fillRect(x+3,y+9,18,2);g.fillRect(x+5,y+12,14,11);
  g.fillStyle='#e19a62';g.fillRect(x+7,y+13,3,8);
}
function warnMark(x,y){g.fillStyle='#d8322a';g.fillRect(x-4,y,8,18);g.fillRect(x-4,y+22,8,8);g.fillStyle='#fff8e8';g.fillRect(x-2,y+2,4,14);g.fillRect(x-2,y+24,4,4);}
function drawBird(L,o,cam){
  const y=Math.round(o.y-cam);
  if(o.warn>0){if(Math.floor(o.warn*8)%2===0)warnMark(o.dir>0?L.LX+10:L.RX-10,y-16);return;}
  const s=SPR.pigeon[Math.floor(o.fl*8)%2];
  g.save();g.translate(Math.round(o.x),y);if(o.dir>0)g.scale(-1,1);g.drawImage(s,-14,-10);g.restore();
}
function frameOf(p){
  if(p.boost>0)return 21;
  if(p.on){if(p.landT>0)return 24;return 12+Math.floor(p.anim*14)%8;}
  if(p.vy<-60)return 21;if(p.vy<70)return 22;return 23;
}
function drawHoja(L,cam){
  const p=L.p;if(L.out>0)return;
  const blink=p.blink>0&&Math.floor(p.blink*14)%2===0;
  const f=A.frames.indexOf(frameOf(p)),x=Math.round(p.x),feet=Math.round(p.y-cam)+(p.on?0:-2);
  if(!blink){
    g.save();g.translate(x,feet);g.scale((p.dir>0?-1:1)*p.sx,p.sy);
    g.drawImage(IMG.HOJA,f*CELL,0,CELL,CELL,-CELL/2,-FOOT,CELL,CELL);g.restore();
  }
  // Jump charges above the head.
  const py=feet-FOOT+2;for(let i=0;i<3;i++){const on=i<p.left;g.fillStyle='#3a2418';g.fillRect(x-14+i*10,py,8,8);g.fillStyle=on?'#ffd24a':'#7d6a5a';g.fillRect(x-13+i*10,py+1,6,6);}
}
function drawGauge(L){
  const n=BOOST_NEED,w=26,x0=Math.round((L.LX+L.RX)/2-n*w/2),y=Math.round(H*(G.mode==='solo'?.185:.135));
  g.fillStyle='rgba(40,24,18,.55)';g.fillRect(x0-4,y-4,n*w+6,22);
  for(let i=0;i<n;i++){
    if(i<L.gauge)g.drawImage(SPR.fish,x0+i*w,y);
    else{g.fillStyle='rgba(255,248,232,.25)';g.fillRect(x0+i*w+6,y+4,10,6);}
  }
  if(G.rush){g.fillStyle='#3a2418';g.fillRect(x0+n*w+2,y-4,32,22);g.fillStyle='#ffe27a';g.font='18px HojaBody,sans-serif';g.textAlign='left';g.fillText('×2',x0+n*w+6,y+13);}
}
function drawBestLine(L,cam){
  const marks=hofMarks('jump');
  if(marks){
    g.font='13px HojaBody,sans-serif';g.textAlign='center';g.textBaseline='alphabetic';
    for(const [floor,m] of marks){
      const y=Math.round(-floor*FLOOR-cam);if(y<-24||y>H+24)continue;
      g.fillStyle=m.year?'#ffd24a':'#bfeaf7';
      for(let x=L.LX;x<L.RX;x+=16)g.fillRect(x,y,9,m.year?3:2);
      const label=m.text+' '+floor+'층',w=Math.min(L.sw-8,Math.ceil(g.measureText(label).width)+10);
      g.fillStyle='rgba(30,20,14,.82)';g.fillRect(L.RX-w-4,y-18,w,17);
      g.fillStyle=m.year?'#ffe27a':'#e8f8ff';g.fillText(label,L.RX-4-w/2,y-5,w-4);
    }
    return;
  }
  if(G.mode!=='solo')return;const b=readBest();if(!b)return;
  const y=Math.round(-b*FLOOR-cam);if(y<0||y>H)return;
  g.fillStyle='#ffd24a';for(let x=L.LX;x<L.RX;x+=16)g.fillRect(x,y,9,2);
  g.fillStyle='#3a2418';g.fillRect(L.RX-54,y-16,50,15);g.fillStyle='#ffe27a';g.font='12px HojaBody,sans-serif';g.textAlign='center';g.fillText('최고 '+b+'층',L.RX-29,y-4);
}
function renderLane(L){
  const shakeY=L.shake>0?(Math.floor(L.shake*40)%2?2:-2):0,cam=Math.round(L.cam)+shakeY,base=-cam-H,alt=Math.max(0,base+H*.5),night=nightOf(alt),warm=warmOf(alt);
  g.save();g.beginPath();g.rect(L.vx,0,L.vw,H);g.clip();
  if(TABLET&&G.mode==='duel'&&L.id){g.translate(L.vx*2+L.vw,H);g.rotate(Math.PI);}
  g.save();g.beginPath();g.rect(L.LX,0,L.sw,H);g.clip();
  drawBack(L,cam,alt,night);
  for(const q of L.plats)drawPlat(q,cam);
  drawBestLine(L,cam);
  for(const o of L.fish){if(o.got)continue;const bob=Math.round(Math.sin(performance.now()/260+o.x)*2);g.drawImage(SPR.fish,Math.round(o.x)-11,Math.round(o.y-cam)-7+bob);}
  drawHoja(L,cam);
  for(const f of L.fx){g.globalAlpha=1-f.t/f.life;g.fillStyle=f.c;g.fillRect(Math.round(f.x),Math.round(f.y-cam),f.s,f.s);}g.globalAlpha=1;
  for(const o of L.pots)drawPot(o,cam);
  for(const o of L.birds)drawBird(L,o,cam);
  g.restore();
  drawWall(L,0,cam,night,warm);drawWall(L,1,cam,night,warm);
  // Pavement runs in front of both buildings.
  drawGround(L,cam);
  if(G.phase!=='menu')drawGauge(L);
  g.restore();
}
function render(){
  g.imageSmoothingEnabled=false;
  for(const L of G.lanes)renderLane(L);
  if(G.lanes.length>1){g.fillStyle='#1c1014';g.fillRect(W/2-3,0,6,H);}
}

// ---------- Input / audio / loop ----------
let beep=function(f,d,type,v){
  if(!ac||soundMode==='off'||ac.state!=='running')return;
  const o=ac.createOscillator(),e=ac.createGain(),t=ac.currentTime;
  o.type=type;o.frequency.value=f;e.gain.setValueAtTime(v*3,t);e.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(e);e.connect(sfxBus);o.start(t);o.stop(t+d+.02);
};
const screen=$('jumpScreen'),lastTap=[0,0];
screen.addEventListener('pointerdown',e=>{
  if(e.target.closest&&e.target.closest('button'))return;
  e.preventDefault();
  const r=cv.getBoundingClientRect();
  if(!TABLET&&(e.clientY-r.top)/r.height<TOUCH_TOP)return;   // top third stays view-only for the children's reach
  const i=G.lanes.length>1&&e.clientX-r.left>r.width/2?1:0,n=performance.now();
  if(n-lastTap[i]<90)return;lastTap[i]=n;
  if(G.lanes[i])jump(G.lanes[i]);
},{passive:false});
function press(id,fn){$(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();sfx('menu',.7);fn();});}
function resize(){
  const r=screen.getBoundingClientRect();if(!r.width||!r.height)return;
  H=Math.max(270,Math.round(W*r.height/r.width));cv.width=W;cv.height=H;
  for(const L of G.lanes)if(!L.started)L.cam=-(H-26);
}
let on=false,raf=0,last=0,acc=0,observer=null;const FIX=1/120;
function loop(t){
  if(!on)return;
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(G.phase!=='paused'){acc+=dt;while(acc>=FIX){step(FIX);acc-=FIX;}}
  render();raf=requestAnimationFrame(loop);
}
function openMenu(){
  if(!on||(G.phase!=='play'&&G.phase!=='count'))return;
  G.resume=G.phase;G.phase='paused';
  const label=()=>soundMode==='all'?'♪ 소리 전체':soundMode==='sfx'?'♪ 효과음만':'소리 끔';
  const sound=button(label(),'',()=>{cycleSound();sound.textContent=label();});
  $('jumpOverlay').hidden=false;$('jumpOverlayTitle').textContent='잠깐 쉬는 중';
  $('jumpOverlayActions').replaceChildren(button('▶ 계속','primary',()=>{$('jumpOverlay').hidden=true;G.phase=G.resume;}),button('↻ 처음부터','',()=>setMode(G.mode)),button('게임 방식 고르기','',()=>setMode('menu')),button('← 모음집','',home),sound);
}
function leave(){
  roundClose();
  on=false;cancelAnimationFrame(raf);setBgmTempo(1);
  if(observer){observer.disconnect();observer=null;}
  screen.hidden=true;$('jumpOverlay').hidden=true;
}
function home(){streak={side:-1,id:null,count:0};leave();$('menuScreen').hidden=false;playBgm('menu',{gain:.8});}
const load=(k,s)=>new Promise(r=>{const i=new Image();i.onload=()=>{IMG[k]=i;r();};i.src=s;});
const ready=Promise.all(Object.entries(A.img).map(([k,s])=>load(k,s))).then(()=>{
  buildTowers();buildSprites();
  const ic=$('cjIcon').getContext('2d');ic.imageSmoothingEnabled=false;ic.drawImage(IMG.HOJA,A.frames.indexOf(21)*CELL,0,CELL,CELL,0,0,CELL,CELL);
});
press('cjBSolo',()=>playGate(1,HOF.cfg?1:0,()=>setMode('solo')));press('cjBDuo',()=>playGate(2,HOF.cfg?2:0,()=>setMode('duel')));
press('cjBAgain',()=>replayGate(()=>setMode(G.mode)));press('cjBBack',()=>setMode('menu'));
press('cjHome',home);press('cjPause',openMenu);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&location.hash!=='#debug')openMenu();});
function enter(){
  $('menuScreen').hidden=true;$('gameScreen').hidden=true;screen.hidden=false;on=true;
  observer=new ResizeObserver(resize);observer.observe(screen);
  ready.then(()=>{if(!on)return;last=0;acc=0;setMode('menu');raf=requestAnimationFrame(loop);});
}
// Paints the scenery into a column of another game's canvas, in that canvas's own units.
function scene(ctx,o){
  if(!IMG.BRICK_BASE||!TW.farD)return false;
  const S=o.S,aw=o.w/S,sg=g,sH=H,L={id:o.id,vx:0,vw:aw,lc:o.lc,rc:o.rc,LX:o.lc*TILE,RX:aw-o.rc*TILE,sw:aw-(o.lc+o.rc)*TILE};
  ctx.save();ctx.beginPath();ctx.rect(o.x,0,o.w,o.viewH);ctx.clip();ctx.translate(o.x,0);ctx.scale(S,S);
  const smooth=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
  g=ctx;H=o.viewH/S;
  const cam=-Math.round((o.groundY+o.rise)/S),night=nightOf(o.alt),warm=warmOf(o.alt);
  drawBack(L,cam,o.alt,night);
  // A veil of sky keeps far windows from competing with the steps in narrow columns.
  if(o.veil){ctx.fillStyle=`rgba(${skyAt(o.alt)[0].map(Math.round)},${o.veil})`;ctx.fillRect(L.LX,0,L.sw,H);}
  drawWall(L,0,cam,night,warm);drawWall(L,1,cam,night,warm);drawGround(L,cam);
  g=sg;H=sH;ctx.imageSmoothingEnabled=smooth;ctx.restore();
  return true;
}
function key(side){if(!G.lanes.length)return;jump(G.lanes[G.mode==='duel'?side:0]);}
return {enter,scene,key,openMenu,get on(){return on;},debug:{G,step,render,jump,setMode,leave,openMenu,get H(){return H;},
  warp(a,i){const L=G.lanes[i||0],p=L.p;L.started=true;L.el.hint.style.display='none';L.nextY=-a;L.prev={x:L.LX,w:L.sw,ground:true};L.cam=-a-H*.5;L.plats=[{x:L.LX+70,y:-a+40,w:150,wall:0,type:'n',x0:L.LX+70,range:0,ph:0,t:0,fall:false,sq:0}];L.fish=[];p.on=L.plats[0];p.x=L.LX+120;p.y=L.plats[0].y;L.maxAlt=a;L.nextMile=Math.floor(a/FLOOR/10+1)*10;L.scroll=0;fillPlats(L);}}};
})();
