  /* Break deadline adapter. Only an authenticated dashboard parent can arm it.
     This is a staged source candidate: the dashboard must send the schedule
     and render the dismissal payload after closing the iframe. */
  const BREAK_CAST=[
    {id:'HOJA',mood:'surprised',animation:'fluster',lines:['나도 더 놀고 싶은데… 쫓겨났어!','한 판만 더! …안 된다고?','어? 벌써 시간이 다 됐어?','나만 두고 가는 거야?','빨리 가! 나까지 혼난단 말이야!','나도 게임 끄기 싫어!','내가 끈 거 아니야! 진짜야!','다음 쉬는 시간에 꼭 돌아와야 해!']},
    {id:'NAHANSANG',mood:'happy',animation:'laugh',lines:['허허허! 손님, 영업 끝났습니다.','한 판 더? 그런 서비스는 없습니다.','아쉽지? 나는 안 아쉬운데!','오늘도 코인 잘 먹었습니다~','게임 실력만큼 공부도 잘하시겠지요?','나가실 때 문은 안 닫으셔도 됩니다.','어허허! 연장 영업은 안 합니다.','다음 쉬는 시간까지 출입 금지입니다~']},
    {id:'SUMAKSAE',mood:'neutral',animation:'dignified',lines:['즐거운 시간이었습니다. 이제 자리로 돌아가시지요.','아쉬움은 다음을 위해 남겨 두시지요.','놀 때가 있으면 배울 때도 있는 법입니다.','슬슬 교과서를 준비하실 때입니다.','시간 약속을 지키는 것도 중요하지요.','이만 마무리하는 것이 좋겠습니다.','충분히 즐기셨기를 바랍니다.','품위 있게 퇴장하시지요.']},
    {id:'GWANGGAETO_KING',mood:'angry',animation:'impact',lines:['전원, 자리로 복귀하라!','네 이놈! 수업 시간이 다가온다!','미니게임 종료를 명하노라!','썩 교과서를 펼치거라!','한 판 더는 허락하지 않겠다!','당장 학업에 정진하라!','시간을 지키는 자가 진정한 승자다!','다음 쉬는 시간에 다시 도전하라!']},
    {id:'MURYEONG_KING',mood:'happy',animation:'gentle',lines:['즐거웠느냐? 이제 공부할 시간이구나.','모두 재미있게 놀았으니 되었구나.','자, 이제 자리로 돌아가렴.','다음 쉬는 시간에도 즐겁게 놀려무나.','아쉬워하지 말거라. 또 기회가 있단다.','오늘도 씩씩하게 공부하거라.','다치지 않고 잘 놀았으니 다행이구나.','이제 선생님을 맞이할 준비를 하렴.']},
    {id:'BANGASAYUSANG',mood:'neutral',animation:'float',lines:['한 판 더 하고 싶은 마음을 내려놓으세요.','집착을 버리면 마음이 편안해집니다.','승리도 패배도 모두 지나가는 것이지요.','잠시 게임과 이별할 시간입니다.','코인은 비웠으니 이제 지혜를 채워 봅시다.','게임을 향한 욕심은 잠시 접어 두세요.','다음 쉬는 시간은 반드시 찾아옵니다.','오늘은 교과서 속에서 깨달음을 얻어 보세요.']},
    {id:'CHILJIDO_ELDER',mood:'angry',animation:'doze',lines:['전원 복귀하라! …쿨쿨.','당장 게임을… 하암… 종료하라!','아직도 게임 중이냐? 나는 한숨 잤는데.','한 판 더는 안 된다! …드르렁.','시끄럽다! 이제 좀 자자!','내가 잠들기 전에 어서 나가라!','수업 시간이다! …뭐? 나도 깨라고?','다들 자리로! 나는 조금만 더 자겠다.']}
  ];
  function breakDismissal(random=Math.random){
    const c=BREAK_CAST[Math.floor(random()*BREAK_CAST.length)];
    return {id:c.id,mood:c.mood,animation:c.animation,line:c.lines[Math.floor(random()*c.lines.length)]};
  }
  function breakPhase(classStartAt,now){
    if(!Number.isFinite(classStartAt)||classStartAt<=0)return 'idle';
    const left=classStartAt-now;
    return left<=30000?'close':left<=60000?'warn':'idle';
  }
  function installBreakDeadline(){
    if(!EMBED)return;
    let classStartAt=null,revision=-1,timer=null,closed=false,overlay=null,fill=null,label=null,nextPulse=0,warning=false;
    function clearWarning(){
      if(overlay){overlay.remove();overlay=fill=label=null;}
      if(warning){warning=false;applySoundMode();}
      nextPulse=0;
    }
    function drawWarning(now){
      if(!overlay){
        overlay=document.createElement('div');
        overlay.id='hojaBreakWarning';
        overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;pointer-events:none;box-shadow:inset 0 0 25px #e55239;border:4px solid #e55239;display:flex;justify-content:center;align-items:flex-start;padding-top:10px;';
        const panel=document.createElement('div');
        panel.style.cssText='background:#30201e;color:white;border-radius:14px;padding:8px 16px;min-width:230px;text-align:center;font-size:clamp(14px,2vw,22px);box-shadow:0 2px 10px #0006;';
        label=document.createElement('div');label.setAttribute('role','status');label.setAttribute('aria-live','off');
        const fuse=document.createElement('div');fuse.style.cssText='height:8px;border-radius:6px;background:#66453a;margin-top:6px;overflow:hidden;';
        fill=document.createElement('div');fill.style.cssText='height:100%;background:linear-gradient(90deg,#f1bb53,#ff6836);border-radius:6px;';
        fuse.append(fill);panel.append(label,fuse);overlay.append(panel);document.body.append(overlay);
        warning=true;
      }
      const remaining=Math.max(0,classStartAt-30000-now),ratio=Math.min(1,remaining/30000);
      const message='게임 종료 '+Math.ceil(remaining/1000)+'초 전';
      if(label.textContent!==message)label.textContent=message;
      fill.style.width=(ratio*100)+'%';
      const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const period=1000+Math.round(ratio*1000);
      const pulse=reduce?1:.75+.25*Math.sin(now/period*Math.PI*2);
      overlay.style.borderColor='rgba(229,82,57,'+pulse+')';
      if(ac&&bgmBus&&soundMode==='all')bgmBus.gain.value=.14;
      if(now>=nextPulse){nextPulse=now+period;sfx('low',.35);}
    }
    function finish(){
      if(closed)return;
      closed=true;clearInterval(timer);timer=null;clearWarning();
      const dismissal=breakDismissal();
      // Match the established dashboard exit semantics, including pending payments.
      try{roundClose();}finally{
        try{cancelPendingPayment();}finally{
          try{stopBgm(.08);}finally{
            window.parent.postMessage({type:'hoja-close',reason:'class-start',classStartAt,dismissal},DASHBOARD_ORIGIN);
          }
        }
      }
    }
    function tick(){
      if(closed)return;
      const now=Date.now(),phase=breakPhase(classStartAt,now);
      if(phase==='close')finish();
      else if(phase==='warn')drawWarning(now);
      else clearWarning();
    }
    window.addEventListener('message',event=>{
      if(closed||event.source!==window.parent||event.origin!==DASHBOARD_ORIGIN)return;
      const m=event.data;
      if(!m||m.type!=='hoja-break-schedule'||!Number.isSafeInteger(m.revision)||m.revision<=revision)return;
      if(m.classStartAt!==null&&(!Number.isSafeInteger(m.classStartAt)||m.classStartAt<=0))return;
      revision=m.revision;classStartAt=m.classStartAt;
      if(timer===null&&classStartAt!==null)timer=setInterval(tick,200);
      if(classStartAt===null){clearInterval(timer);timer=null;}
      tick();
    });
    document.addEventListener('visibilitychange',tick);
    window.addEventListener('focus',tick);
    window.addEventListener('pagehide',()=>{clearInterval(timer);clearWarning();});
    window.parent.postMessage({type:'hoja-break-ready',version:1},DASHBOARD_ORIGIN);
  }
