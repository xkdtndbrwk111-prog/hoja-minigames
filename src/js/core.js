(() => {
  'use strict';
  function installRoundRect(){
    if(!window.CanvasRenderingContext2D||CanvasRenderingContext2D.prototype.roundRect)return;
    CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
      const q=Math.max(0,Math.min(Array.isArray(r)?(r[0]||0):(r||0),Math.abs(w)/2,Math.abs(h)/2));
      this.moveTo(x+q,y);this.arcTo(x+w,y,x+w,y+h,q);this.arcTo(x+w,y+h,x,y+h,q);this.arcTo(x,y+h,x,y,q);this.arcTo(x,y,x+w,y,q);this.closePath();
    };
  }
  installRoundRect();
  const $ = id => document.getElementById(id);
  // Field coordinates are the actual play surface. Rails are drawn in the RM margin outside it,
  // so what the children see and what the puck bounces off are the same line.
  // Inside the classroom dashboard, which owns the screen: fullscreen is its job, and it hears when to close.
  const EMBED=(()=>{try{return window.parent!==window&&new URLSearchParams(location.search).get('embed')==='dashboard';}catch{return false;}})();
  const DASHBOARD_ORIGIN='http://127.0.0.1:17439';
  const FORCED_MODE=(()=>{try{const q=new URLSearchParams(location.search).get('mode');return q==='board'||q==='tablet'?q:null;}catch{return null;}})();
  const DEVICE=(()=>{
    if(FORCED_MODE)return FORCED_MODE;
    try{const v=localStorage.getItem('hoja-airhockey-device');if(v==='board'||v==='tablet')return v;}catch{}
    const ua=navigator.userAgent,touch=navigator.maxTouchPoints>1;
    if(/iPad/.test(ua)||(/Macintosh/.test(ua)&&touch))return 'tablet';
    if(/Android/.test(ua)&&touch&&Math.min(screen.width,screen.height)<900)return 'tablet';
    return 'board';
  })();
  const TABLET=DEVICE==='tablet';
  document.documentElement.dataset.device=DEVICE;
  // On a tablet the rink fills the screen, so it is cut to the screen's shape instead of the board's long strip.
  const TABLET_H=Math.round(Math.max(640,Math.min(1040,(1440+72)/(Math.max(innerWidth,innerHeight)/Math.max(1,Math.min(innerWidth,innerHeight)))-72)));
  const W = 1440, H = TABLET?TABLET_H:500, RM = TABLET?36:26, LW = W+RM*2, LH = H+RM*2, R = TABLET?26:20, MALLET_R = TABLET?54:42, GOAL_HALF = TABLET?Math.round(H*.2):92;
  const POST_SPREAD=TABLET?H/500*.72:1;
  // Each child sits at their own end, so writing on a half is turned to read from that end.
  const FACE=[Math.PI/2,-Math.PI/2];
  let MAX_CANVAS_W = 2200; // 4K boards run at a capped buffer so weak SoCs keep 60fps.

  const CHARACTERS=[
    {id:'HOJA',name:'호자'},
    {id:'NAHANSANG',name:'나한상'},
    {id:'SUMAKSAE',name:'수막새'},
    {id:'CHILJIDO_ELDER',name:'칠지도 장로'},
    {id:'MURYEONG_KING',name:'무령왕'},
    {id:'BANGASAYUSANG',name:'반가사유상'},
    {id:'GWANGGAETO_KING',name:'광개토대왕'}
  ];
  const EMBED_ASSETS={'portraits/gwanggaeto_king_09_sparkling.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/gwanggaeto_king_09_sparkling.webp@@','portraits/bangasayusang_01_neutral.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/bangasayusang_01_neutral.webp@@','portraits/bangasayusang_09_sparkling.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/bangasayusang_09_sparkling.webp@@','portraits/nahansang_09_sparkling.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/nahansang_09_sparkling.webp@@','portraits/sumaksae_03_angry.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/sumaksae_03_angry.webp@@','portraits/bangasayusang_03_angry.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/bangasayusang_03_angry.webp@@','portraits/gwanggaeto_king_01_neutral.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/gwanggaeto_king_01_neutral.webp@@','portraits/sumaksae_09_sparkling.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/sumaksae_09_sparkling.webp@@','portraits/chiljido_elder_02_surprised.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/chiljido_elder_02_surprised.webp@@','portraits/nahansang_06_sad.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/nahansang_06_sad.webp@@','portraits/muryeong_king_09_sparkling.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/muryeong_king_09_sparkling.webp@@','portraits/hoja_01_neutral.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/hoja_01_neutral.webp@@','portraits/gwanggaeto_king_06_sad.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/gwanggaeto_king_06_sad.webp@@','portraits/hoja_03_angry.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/hoja_03_angry.webp@@','portraits/sumaksae_01_neutral.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/sumaksae_01_neutral.webp@@','portraits/hoja_02_surprised.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/hoja_02_surprised.webp@@','portraits/sumaksae_02_surprised.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/sumaksae_02_surprised.webp@@','portraits/chiljido_elder_03_angry.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/chiljido_elder_03_angry.webp@@','portraits/nahansang_03_angry.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/nahansang_03_angry.webp@@','portraits/muryeong_king_06_sad.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/muryeong_king_06_sad.webp@@','portraits/nahansang_01_neutral.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/nahansang_01_neutral.webp@@','portraits/bangasayusang_02_surprised.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/bangasayusang_02_surprised.webp@@','portraits/chiljido_elder_06_sad.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/chiljido_elder_06_sad.webp@@','portraits/chiljido_elder_09_sparkling.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/chiljido_elder_09_sparkling.webp@@','portraits/nahansang_02_surprised.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/nahansang_02_surprised.webp@@','portraits/hoja_06_sad.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/hoja_06_sad.webp@@','portraits/hoja_09_sparkling.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/hoja_09_sparkling.webp@@','portraits/muryeong_king_03_angry.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/muryeong_king_03_angry.webp@@','portraits/muryeong_king_01_neutral.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/muryeong_king_01_neutral.webp@@','portraits/chiljido_elder_01_neutral.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/chiljido_elder_01_neutral.webp@@','portraits/sumaksae_06_sad.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/sumaksae_06_sad.webp@@','portraits/gwanggaeto_king_03_angry.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/gwanggaeto_king_03_angry.webp@@','portraits/gwanggaeto_king_02_surprised.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/gwanggaeto_king_02_surprised.webp@@','portraits/muryeong_king_02_surprised.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/muryeong_king_02_surprised.webp@@','portraits/bangasayusang_06_sad.webp':'data:image/webp;base64,@@B64:assets/images/core/portraits/bangasayusang_06_sad.webp@@','art/obstacle.webp':'data:image/webp;base64,@@B64:assets/images/core/art/obstacle.webp@@','art/mallet_hoja.webp':'data:image/webp;base64,@@B64:assets/images/core/art/mallet_hoja.webp@@','art/item_box.webp':'data:image/webp;base64,@@B64:assets/images/core/art/item_box.webp@@','art/mallet_nahan.webp':'data:image/webp;base64,@@B64:assets/images/core/art/mallet_nahan.webp@@','art/arena.webp':'data:image/webp;base64,@@B64:assets/images/core/art/arena.webp@@','art/puck.webp':'data:image/webp;base64,@@B64:assets/images/core/art/puck.webp@@','kenney/green_button.png':'data:image/png;base64,@@B64:assets/images/css/image-2.png@@','kenney/yellow_button.png':'data:image/png;base64,@@B64:assets/images/css/image.png@@'};
  const AUDIO_DATA={"coin0":"@@B64:assets/audio/coin0.ogg@@","coin1":"@@B64:assets/audio/coin1.ogg@@","wood0":"@@B64:assets/audio/wood0.ogg@@","wood1":"@@B64:assets/audio/wood1.ogg@@","flip0":"@@B64:assets/audio/flip0.ogg@@","flip1":"@@B64:assets/audio/flip1.ogg@@","flip2":"@@B64:assets/audio/flip2.ogg@@","think":"@@B64:assets/audio/think.mp3@@","hit0":"@@B64:assets/audio/hit0.ogg@@","hit1":"@@B64:assets/audio/hit1.ogg@@","hit2":"@@B64:assets/audio/hit2.ogg@@","tap0":"@@B64:assets/audio/tap0.ogg@@","tap1":"@@B64:assets/audio/tap1.ogg@@","smash0":"@@B64:assets/audio/smash0.ogg@@","smash1":"@@B64:assets/audio/smash1.ogg@@","rail0":"@@B64:assets/audio/rail0.ogg@@","soft":"@@B64:assets/audio/soft.ogg@@","bell":"@@B64:assets/audio/bell.ogg@@","click":"@@B64:assets/audio/click.ogg@@","glass":"@@B64:assets/audio/glass.ogg@@","force0":"@@B64:assets/audio/force0.ogg@@","force1":"@@B64:assets/audio/force1.ogg@@","laserL":"@@B64:assets/audio/laserL.ogg@@","retro":"@@B64:assets/audio/retro.ogg@@","laserS":"@@B64:assets/audio/laserS.ogg@@","crunch":"@@B64:assets/audio/crunch.ogg@@","low":"@@B64:assets/audio/low.ogg@@","battle":"@@B64:assets/audio/battle.ogg@@","menu":"@@B64:assets/audio/menu.mp3@@",};
  const AUDIO_ALT={"coin0": "@@B64:assets/audio/backup/coin0.mp3@@", "coin1": "@@B64:assets/audio/backup/coin1.mp3@@", "wood0": "@@B64:assets/audio/backup/wood0.mp3@@", "wood1": "@@B64:assets/audio/backup/wood1.mp3@@", "flip0": "@@B64:assets/audio/backup/flip0.mp3@@", "flip1": "@@B64:assets/audio/backup/flip1.mp3@@", "flip2": "@@B64:assets/audio/backup/flip2.mp3@@", "hit0": "@@B64:assets/audio/backup/hit0.mp3@@", "hit1": "@@B64:assets/audio/backup/hit1.mp3@@", "hit2": "@@B64:assets/audio/backup/hit2.mp3@@", "tap0": "@@B64:assets/audio/backup/tap0.mp3@@", "tap1": "@@B64:assets/audio/backup/tap1.mp3@@", "smash0": "@@B64:assets/audio/backup/smash0.mp3@@", "smash1": "@@B64:assets/audio/backup/smash1.mp3@@", "rail0": "@@B64:assets/audio/backup/rail0.mp3@@", "soft": "@@B64:assets/audio/backup/soft.mp3@@", "bell": "@@B64:assets/audio/backup/bell.mp3@@", "click": "@@B64:assets/audio/backup/click.mp3@@", "glass": "@@B64:assets/audio/backup/glass.mp3@@", "force0": "@@B64:assets/audio/backup/force0.mp3@@", "force1": "@@B64:assets/audio/backup/force1.mp3@@", "laserL": "@@B64:assets/audio/backup/laserL.mp3@@", "retro": "@@B64:assets/audio/backup/retro.mp3@@", "laserS": "@@B64:assets/audio/backup/laserS.mp3@@", "crunch": "@@B64:assets/audio/backup/crunch.mp3@@", "low": "@@B64:assets/audio/backup/low.mp3@@", "battle": "@@B64:assets/audio/backup/battle.mp3@@"};
  const MOOD_FILE={neutral:'01_neutral',surprised:'02_surprised',angry:'03_angry',sad:'06_sad',happy:'09_sparkling'};
  const SIDE_COLOR=['#2f9c8c','#e0694f'], SIDE_GLOW=['#7ff0da','#ffb59c'];
  // Every character gets one special. Attack shots test the defender; support ones change the field.
  const SPECIALS={
    HOJA:{kind:'cannon',name:'사랑의 캐논',tip:'가이드선 없이 날아온다!',short:'경로를 미리 보여주지 않는 가장 빠른 슛'},
    NAHANSANG:{kind:'ghost',name:'급식 세 판',tip:'진짜 퍽은 하나뿐!',short:'가짜 퍽 둘과 함께 골대로 날아가는 슛'},
    SUMAKSAE:{kind:'curve',name:'기와 커브',tip:'휘어 오는 길을 읽어!',short:'물결처럼 휘어 골대로 가는 슛'},
    CHILJIDO_ELDER:{kind:'zig',name:'일곱 갈래 번개',tip:'튕길수록 빨라져!',short:'벽을 튕기며 빨라져 골대로 가는 슛'},
    MURYEONG_KING:{kind:'shield',name:'왕관 방패',tip:'왕의 골대는 8초간 무적!',short:'8초 동안 내 골대를 막는 방패'},
    BANGASAYUSANG:{kind:'slow',name:'사유의 시간',tip:'우리 진영의 시간이 느려져!',short:'8초 동안 내 진영에서 퍽이 느려짐'},
    GWANGGAETO_KING:{kind:'conquer',name:'영토 정복',tip:'중앙선이 밀려난다!',short:'8초 동안 중앙선을 상대 쪽으로 밀어냄'}
  };
  let choices=['HOJA','NAHANSANG'];
  const STAGES=[
    {id:'basic',name:'기본',desc:'장애물 없는 기본 경기장'},
    {id:'posts',name:'장애물 1',desc:'중앙의 작은 고정 원형 기둥 4개'},
    {id:'patrol',name:'장애물 2',desc:'중앙에서 왕복하는 작은 기둥 2개'},
    {id:'speed',name:'스피드',desc:'4개 스피드존 · 지나가면 속도 2배'},
    {id:'items',name:'아이템',desc:'마지막으로 친 사람이 물음표 효과를 받아요'},
  ];
  const TAUNTS={
    HOJA:['사랑을 해주마!','내 친절을 받아라!','오늘은 내가 청소할 거야!'],
    NAHANSANG:['오늘 급식 반찬은 다 내 거야!','네 고민을 끝까지 들어주마!','급식 줄에서 양보해주마!'],
    SUMAKSAE:['실내화를 가지런히 정리해주마!','오늘도 웃게 해주마!','내가 먼저 인사하겠다!'],
    CHILJIDO_ELDER:['일곱 번 칭찬해주마!','네 연필을 깎아주겠네!','최고로 친절하게 대해주마!'],
    MURYEONG_KING:['오늘부터 넌 내 단짝이다!','왕의 간식을 나눠주마!','너에게 왕관을 씌워주겠다!'],
    BANGASAYUSANG:['네 고민을 끝까지 들어주마!','생각할 시간을 주겠다!','내가 널 응원하겠다!'],
    GWANGGAETO_KING:['네 책상까지 깨끗하게 정복하겠다!','복도 질서를 정복하겠다!','쉬는 시간을 행복하게 만들겠다!']
  };
  let shopStage='solo',activeStage='basic',currentGame='hockey',introTimeouts=[],lastTaunts={};
  function tauntFor(id){const all=TAUNTS[id]||TAUNTS.HOJA;let i=Math.floor(Math.random()*all.length);if(all.length>1&&i===lastTaunts[id])i=(i+1)%all.length;lastTaunts[id]=i;return all[i];}
  function preference(key,fallback){try{return localStorage.getItem('hoja-airhockey-'+key)||fallback;}catch{return fallback;}}
  function remember(key,v){try{localStorage.setItem('hoja-airhockey-'+key,v);}catch{}}
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;

