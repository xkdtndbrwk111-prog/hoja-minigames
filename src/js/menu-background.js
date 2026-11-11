  const MENU_SCENES={"spring":{"focus":155,"layers":[{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/spring-layer.webp@@","x":0,"y":0,"f":1.1},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/spring-layer-2.webp@@","x":0,"y":0,"f":3.3},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/spring-layer-3.webp@@","x":0,"y":0,"f":6.16},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/spring-layer-4.webp@@","x":0,"y":0,"f":6.16},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/spring-layer-5.webp@@","x":0,"y":0,"f":15.84},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/spring-layer-6.webp@@","x":0,"y":0,"f":15.84},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/spring-layer-7.webp@@","x":-186,"y":0,"f":22}]},"summer":{"focus":172,"layers":[{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/summer-layer.webp@@","x":0,"y":-54,"f":1.1},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/summer-layer-2.webp@@","x":0,"y":-63,"f":3.3},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/summer-layer-3.webp@@","x":0,"y":-19,"f":6.16},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/summer-layer-4.webp@@","x":0,"y":11,"f":6.16},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/summer-layer-5.webp@@","x":0,"y":-3,"f":15.84},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/summer-layer-6.webp@@","x":3,"y":29,"f":15.84},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/summer-layer-7.webp@@","x":0,"y":-3,"f":22.0}]},"autumn":{"focus":140,"layers":[{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/autumn-layer.webp@@","x":-123,"y":-192,"f":0.96},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/autumn-layer-2.webp@@","x":-123,"y":-192,"f":2.87},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/autumn-layer-3.webp@@","x":-123,"y":-192,"f":5.36},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/autumn-layer-4.webp@@","x":-123,"y":-192,"f":5.36},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/autumn-layer-5.webp@@","x":-123,"y":-192,"f":8.61},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/autumn-layer-6.webp@@","x":-123,"y":-192,"f":13.39},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/autumn-layer-7.webp@@","x":-123,"y":-192,"f":13.39},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/autumn-layer-8.webp@@","x":-123,"y":-192,"f":19.13},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/autumn-layer-9.webp@@","x":-123,"y":-192,"f":22.0}]},"winter":{"focus":112,"layers":[{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/winter-layer.webp@@","x":0,"y":-66,"f":0.0},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/winter-layer-2.webp@@","x":-151,"y":35,"f":3.79},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/winter-layer-3.webp@@","x":-329,"y":140,"f":8.34},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/winter-layer-4.webp@@","x":-507,"y":72,"f":14.41},{"pic":"data:image/webp;base64,@@B64:assets/images/menu-background/winter-layer-5.webp@@","x":-685,"y":180,"f":22.0}]}};
  /* ---------- Menu background: the season's museum scene ----------
     Drawn small on one canvas and enlarged by a whole number, so pixels stay even and only a changed
     position costs a redraw. On a slow board this stays far cheaper than stacking big layers. */
  const MB={c:0,tilt:0,seen:-1e9,base:null,drawn:'',scene:null,imgs:[],k:0,on:false};
  const MB_STILL=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function mbSeason(){
    const asked=new URLSearchParams(location.search).get('season');
    if(MENU_SCENES[asked])return asked;
    const m=new Date().getMonth()+1;
    return m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':m>=9&&m<=11?'autumn':'winter';
  }
  function mbFit(){
    const can=$('menuBg'),box=can.parentNode.getBoundingClientRect();
    if(!box.width||!box.height||!MB.scene)return;
    // 720 keeps the swing and the scene's clipped edges outside the view.
    const k=Math.max(1,Math.ceil(Math.max(box.width/720,box.height/256)));
    const top=clamp(MB.scene.focus-box.height/k/2,0,256-box.height/k);
    can.style.width=768*k+'px';can.style.height=256*k+'px';
    can.style.left=Math.round((box.width-768*k)/2)+'px';can.style.top=-Math.round(top*k)+'px';
    MB.k=k;
  }
  function mbDraw(){
    if(!MB.on)return;
    const offs=MB.scene.layers.map(l=>Math.round(-MB.c*l.f)),key=offs.join();
    if(key===MB.drawn)return;
    MB.drawn=key;
    const g=$('menuBg').getContext('2d');g.imageSmoothingEnabled=false;
    g.clearRect(0,0,768,256);
    MB.scene.layers.forEach((l,i)=>g.drawImage(MB.imgs[i],l.x+offs[i],l.y));
  }
  function mbTick(){
    if($('menuScreen').hidden||document.hidden||!MB.on)return;
    let goal=0;
    if(!MB_STILL){
      if(performance.now()-MB.seen<1500)goal=clamp(MB.tilt/14,-1,1);
      else goal=Math.sin(performance.now()/1000*Math.PI*2/24);
    }
    MB.c+=(goal-MB.c)*.14;
    mbDraw();
  }
  // Which way is "across the screen" depends on how the tablet is turned.
  function mbOrient(e){
    if(e.gamma===null||e.beta===null||MB_STILL)return;
    const turn=(screen.orientation&&screen.orientation.angle)||window.orientation||0;
    const a=((turn%360)+360)%360,v=a===90?e.beta:a===270?-e.beta:a===180?-e.gamma:e.gamma;
    if(MB.base===null){MB.base=v;MB.seen=performance.now();}
    // The middle follows slowly, so any comfortable way of holding it comes back to centre.
    const now=performance.now();
    MB.base+=(v-MB.base)*Math.min(1,(now-MB.seen)/5000);
    MB.tilt=v-MB.base;MB.seen=now;
  }
  function mbStart(){
    MB.scene=MENU_SCENES[mbSeason()];
    let left=MB.scene.layers.length;
    MB.imgs=MB.scene.layers.map(l=>{const i=new Image();i.onload=()=>{if(--left)return;MB.on=true;mbFit();mbDraw();$('menuBg').classList.add('ready');};i.src=l.pic;return i;});
    mbFit();addEventListener('resize',mbFit);setInterval(mbTick,66);
    const sensor=TABLET&&!MB_STILL&&typeof DeviceOrientationEvent!=='undefined';
    if(!sensor)return;
    addEventListener('deviceorientation',mbOrient);
    // Most tablets just start sending. An iPad stays silent until asked, once per visit and only after a tap, so the button shows only then.
    if(typeof DeviceOrientationEvent.requestPermission!=='function')return;
    setTimeout(()=>{
      if(MB.base!==null)return;
      const b=$('tiltButton');b.hidden=false;
      b.addEventListener('click',()=>{
        sfx('menu',.7);
        DeviceOrientationEvent.requestPermission().then(r=>{
          b.textContent=r==='granted'?'기울이기 켜짐':'기울이기 꺼짐';b.disabled=r==='granted';
        }).catch(()=>{b.textContent='기울이기 꺼짐';});
      });
    },1200);
  }
  mbStart();

  const PORTRAIT_SEAT={"gwanggaeto_king_09_sparkling":[199,362.81],"bangasayusang_01_neutral":[213.57,355.26],"bangasayusang_09_sparkling":[203.81,353.25],"nahansang_09_sparkling":[181.3,323.4],"sumaksae_03_angry":[204.3,310],"bangasayusang_03_angry":[209.37,356.32],"gwanggaeto_king_01_neutral":[192.81,342.91],"sumaksae_09_sparkling":[205.4,313.4],"chiljido_elder_02_surprised":[196,375],"nahansang_06_sad":[184.4,321],"muryeong_king_09_sparkling":[195.2,363.2],"hoja_01_neutral":[130.1,338.4],"gwanggaeto_king_06_sad":[189.32,348.37],"hoja_03_angry":[124.8,339.6],"sumaksae_01_neutral":[198,309.9],"hoja_02_surprised":[141.4,340.3],"sumaksae_02_surprised":[192.2,310.4],"chiljido_elder_03_angry":[186,375],"nahansang_03_angry":[178.1,322.8],"muryeong_king_06_sad":[195.1,361.4],"nahansang_01_neutral":[179.6,322.3],"bangasayusang_02_surprised":[208.15,356.81],"chiljido_elder_06_sad":[192,375],"chiljido_elder_09_sparkling":[191,375],"nahansang_02_surprised":[182.4,324],"hoja_06_sad":[135.6,346.1],"hoja_09_sparkling":[142.6,344.3],"muryeong_king_03_angry":[198.2,363.1],"muryeong_king_01_neutral":[188.4,364.3],"chiljido_elder_01_neutral":[195,375],"sumaksae_06_sad":[197.6,313.6],"gwanggaeto_king_03_angry":[185.65,340.24],"gwanggaeto_king_02_surprised":[190.32,343.62],"muryeong_king_02_surprised":[197.7,364.6],"bangasayusang_06_sad":[212.63,354.28]};
  /* ---------- Characters lean on what is in front of them ----------
     Every portrait has a point under its hands. Lining that point up with the edge below puts the hands over the edge,
     so the character seems to rest on the panel. Purely a picture: touches pass through. */
  function seatOf(img){
    if(!seatOf.map){seatOf.map=new Map();for(const k of Object.keys(PORTRAIT_SEAT)){const rest=PORTRAIT_SEAT[k.replace(/_\d\d_[a-z]+$/,'_01_neutral')];seatOf.map.set(EMBED_ASSETS['portraits/'+k+'.webp'],[PORTRAIT_SEAT[k][0]-rest[0],PORTRAIT_SEAT[k][1]]);}}
    return seatOf.map.get(img.src);
  }
  function seatPortrait(img){
    const wrap=img.closest('.avatar-wrap'),head=img.closest('.game-header');
    if(!wrap||!head)return;
    wrap.style.transform='';
    const seat=seatOf(img);
    if(!seat||img.closest('.rh-full')||(TABLET&&!img.closest('#partyScreen')))return;
    const w=wrap.getBoundingClientRect(),h=head.getBoundingClientRect();
    if(!w.height||!h.height)return;
    const line=h.bottom-parseFloat(getComputedStyle(head).borderBottomWidth||0),size=Math.min(w.width,w.height),top=w.top+(w.height-size)/2;
    // Sideways only as far as this face differs from the calm one, so changing expression does not make the character jump.
    wrap.style.transform='translate('+Math.round(-seat[0]/384*size)+'px,'+Math.round(line-(top+seat[1]/384*size))+'px)';
  }
  function seatMascots(){
    const zone=document.querySelector('#menuScreen .display-zone'),screenBox=$('menuScreen').getBoundingClientRect();
    if(!screenBox.height)return;
    const z=zone.getBoundingClientRect(),size=z.height*.8;
    for(const [cls,key] of [['left','hoja_01_neutral'],['right','nahansang_09_sparkling']]){
      const m=document.querySelector('.menu-mascot.'+cls);
      m.style.height=size+'px';m.style.top=Math.round(z.bottom-screenBox.top-PORTRAIT_SEAT[key][1]/384*size)+'px';
    }
  }
  document.addEventListener('load',e=>{if(e.target.matches&&e.target.matches('.game-header .avatar-wrap img'))seatPortrait(e.target);},true);
  const seatWatch=new ResizeObserver(entries=>{for(const en of entries)for(const i of en.target.querySelectorAll('.avatar-wrap img'))seatPortrait(i);});
  document.querySelectorAll('.game-header').forEach(h=>seatWatch.observe(h));
  addEventListener('resize',()=>{seatMascots();document.querySelectorAll('.game-header .avatar-wrap img').forEach(seatPortrait);});
  new ResizeObserver(seatMascots).observe($('menuScreen'));
  seatMascots();

