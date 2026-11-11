  /* ---------- Keyboard ---------- */
  // Touch stays the main input everywhere; keys are an extra path into the same game functions.
  const kbHeld=new Set();
  const KB_ICON='<svg class="kb-icon" viewBox="0 0 24 16" aria-hidden="true"><rect x="1" y="1" width="22" height="14" rx="2.5" fill="#fffbe9" stroke="currentColor" stroke-width="2"/><path d="M5 5.5h1.5M9.2 5.5h1.5M13.3 5.5h1.5M17.5 5.5H19M7 11h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function kbGuideText(){
    const both=aiLevel>0;
    switch(currentGame){
      case 'bubble':return both?'A D 또는 ← → 조준 · W 또는 ↑ 발사 · S 또는 ↓ 바꾸기':'왼쪽 A D 조준, W 발사, S 바꾸기 · 오른쪽 ← → 조준, ↑ 발사, ↓ 바꾸기';
      case 'stairs':return '혼자와 2인만 · 왼쪽 A 돌기, D 오르기 · 오른쪽 ← 돌기, → 오르기';
      case 'volley':return both?'A D 또는 ← → 이동 · W 또는 ↑ 점프와 강타':'왼쪽 A D 이동, W 점프와 강타 · 오른쪽 ← → 이동, ↑ 점프와 강타';
      default:return '';
    }
  }
  function kbSyncGuide(){
    const t=kbGuideText(),e=$('kbGuide');
    e.hidden=!t;e.innerHTML=t?KB_ICON+'<span>'+t+' · Esc 메뉴</span>':'';
  }
  function kbVolleyKeys(){
    const P=VB.players,arrowSide=aiLevel?0:1;
    if(kbHeld.has('KeyA'))P[0].left=true;
    if(kbHeld.has('KeyD'))P[0].right=true;
    if(kbHeld.has('ArrowLeft'))P[arrowSide].left=true;
    if(kbHeld.has('ArrowRight'))P[arrowSide].right=true;
  }
  /* Bubble aim turns while a key is held. */
  let kbRaf=0,kbLast=0;
  function kbAimLoop(t){
    kbRaf=0;
    if(!BB.on||BB.phase!=='playing')return;
    const dt=clamp((t-(kbLast||t))/1000,0,.05);kbLast=t;
    const turn=(f,d)=>{if(d&&f&&f.pid===null){f.angle=clamp(f.angle+d*.9*dt,-B_MAXANG,B_MAXANG);f.trace=null;f.lastMove=performance.now();}};
    const dir=(a,b)=>(kbHeld.has(b)?1:0)-(kbHeld.has(a)?1:0);
    if(aiLevel)turn(BB.fields[0],dir('KeyA','KeyD')+dir('ArrowLeft','ArrowRight'));
    else{turn(BB.fields[0],dir('KeyA','KeyD'));turn(BB.fields[1],dir('ArrowLeft','ArrowRight'));}
    if(['KeyA','KeyD','ArrowLeft','ArrowRight'].some(c=>kbHeld.has(c)))kbRaf=requestAnimationFrame(kbAimLoop);else kbLast=0;
  }
  const KB_STEER=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  // Each entry answers one key press and returns true when the game used it.
  function kbStairs(code){
    if(ST.n>2||ST.phase!=='run')return false;
    const hit=(i,turn)=>{const p=ST.players[i];if(!p)return;const now=performance.now();ST.flash.set((turn?'t':'c')+i,now);stMove(p,turn);};
    const right=ST.n===1?0:1;
    if(code==='KeyA'){hit(0,true);return true;}
    if(code==='KeyD'){hit(0,false);return true;}
    if(code==='ArrowLeft'){hit(right,true);return true;}
    if(code==='ArrowRight'){hit(right,false);return true;}
    return false;
  }
  function kbBubble(code,repeat){
    if(BB.phase!=='playing'&&BB.phase!=='countdown')return false;
    const left=BB.fields[0],right=aiLevel?BB.fields[0]:BB.fields[1];
    if(code==='KeyW'){bFire(left);return true;}
    if(code==='ArrowUp'){bFire(right);return true;}
    if(code==='KeyS'){bSwap(left);return true;}
    if(code==='ArrowDown'){bSwap(right);return true;}
    if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(code)){
      // One short tap always nudges the aim, for lining up a shot exactly.
      if(!repeat&&BB.phase==='playing'){const f=code==='KeyA'||code==='KeyD'?left:right,d=code==='KeyA'||code==='ArrowLeft'?-1:1;if(f.pid===null){f.angle=clamp(f.angle+d*.018,-B_MAXANG,B_MAXANG);f.trace=null;f.lastMove=performance.now();}}
      if(!kbRaf){kbLast=0;kbRaf=requestAnimationFrame(kbAimLoop);}
      return true;
    }
    return false;
  }
  function kbVolley(code,repeat){
    if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(code)){vbSyncInput();return true;}
    if(repeat)return true;
    if(code==='KeyW'){vbJumpPress(VB.players[0]);return true;}
    if(code==='ArrowUp'){vbJumpPress(VB.players[aiLevel?0:1]);return true;}
    return false;
  }
  function kbOpenMenu(){
    if(BB.on)bOpenMenu();else if(ST.on)stOpenMenu();else if(VB.on)vbOpenMenu();else if(CJ.on)CJ.openMenu();
  }
  window.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    const code=e.code;
    if(!(BB.on||ST.on||VB.on||CJ.on))return;
    // An open pause or result panel takes Enter and Esc for its first button; the game underneath waits.
    const panel=document.querySelector('.screen:not([hidden]) .b-overlay:not([hidden])');
    if(panel){
      if(!e.repeat&&(code==='Enter'||code==='Escape')){const b=panel.querySelector('button:not([disabled])');if(b){e.preventDefault();b.click();}}
      return;
    }
    if(code==='Escape'){e.preventDefault();if(!e.repeat)kbOpenMenu();return;}
    let used=false;
    if(KB_STEER.has(code))kbHeld.add(code);
    if(ST.on){if(!e.repeat)used=kbStairs(code);else used=KB_STEER.has(code);}
    else if(BB.on){if(!e.repeat||['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(code))used=kbBubble(code,e.repeat);else used=KB_STEER.has(code);}
    else if(VB.on)used=kbVolley(code,e.repeat);
    else if(CJ.on){
      if(!e.repeat){
        if(code==='KeyW'||code==='Space'){CJ.key(0);used=true;}
        else if(code==='ArrowUp'){CJ.key(1);used=true;}
      }else used=code==='KeyW'||code==='Space'||code==='ArrowUp';
    }
    if(used){e.preventDefault();if(document.activeElement&&document.activeElement!==document.body)document.activeElement.blur();}
  });
  window.addEventListener('keyup',e=>{if(kbHeld.delete(e.code)&&VB.on)vbSyncInput();});
  window.addEventListener('blur',()=>{kbHeld.clear();if(VB.on)vbSyncInput();});
  // Fullscreen can only be asked for during a press, so a game that lost it (a stray edge swipe, a held Esc) asks at the next lift.
  function fsRestore(){
    if(!fsWanted||document.fullscreenElement||document.webkitFullscreenElement)return;
    if(!(inGame||O.on||GO.on||BB.on||SH.on||ST.on||VB.on||TT.on||GX.on||CJ.on))return;
    const now=performance.now();if(now-fsTried<2000)return;fsTried=now;
    toggleFullscreen(true);
  }
  ['pointerup','click'].forEach(n=>document.addEventListener(n,fsRestore,{capture:true,passive:true}));
  window.addEventListener('keydown',e=>{if(e.code!=='Escape')fsRestore();},{capture:true,passive:true});
