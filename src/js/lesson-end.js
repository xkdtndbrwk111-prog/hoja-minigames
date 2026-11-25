  /* Dashboard lesson guard: host owns timetable, unmount and re-entry policy.
     Requires exact origin, iframe source and existing coin session handshake.
     A null/disabled schedule cancels a warning; standalone games are unaffected. */
  const LESSON_LINES={
  "HOJA": [
    "surprised",
    "scurry",
    "나도 더 놀고 싶은데… 쫓겨났어!",
    "한 판만 더! …안 된다고?",
    "어? 벌써 시간이 다 됐어?",
    "나만 두고 가는 거야?",
    "빨리 가! 나까지 혼난단 말이야!",
    "나도 게임 끄기 싫어!",
    "내가 끈 거 아니야! 진짜야!",
    "다음 쉬는 시간에 꼭 돌아와야 해!"
  ],
  "NAHANSANG": [
    "happy",
    "laugh",
    "허허허! 손님, 영업 끝났습니다.",
    "한 판 더? 그런 서비스는 없습니다.",
    "아쉽지? 나는 안 아쉬운데!",
    "오늘도 코인 잘 먹었습니다~",
    "게임 실력만큼 공부도 잘하시겠지요?",
    "나가실 때 문은 안 닫으셔도 됩니다.",
    "어허허! 연장 영업은 안 합니다.",
    "다음 쉬는 시간까지 출입 금지입니다~"
  ],
  "SUMAKSAE": [
    "neutral",
    "dignified",
    "즐거운 시간이었습니다. 이제 자리로 돌아가시지요.",
    "아쉬움은 다음을 위해 남겨 두시지요.",
    "놀 때가 있으면 배울 때도 있는 법입니다.",
    "슬슬 교과서를 준비하실 때입니다.",
    "시간 약속을 지키는 것도 중요하지요.",
    "이만 마무리하는 것이 좋겠습니다.",
    "충분히 즐기셨기를 바랍니다.",
    "품위 있게 퇴장하시지요."
  ],
  "GWANGGAETO_KING": [
    "angry",
    "stomp",
    "전원, 자리로 복귀하라!",
    "네 이놈! 수업 시간이 다가온다!",
    "미니게임 종료를 명하노라!",
    "썩 교과서를 펼치거라!",
    "한 판 더는 허락하지 않겠다!",
    "당장 학업에 정진하라!",
    "시간을 지키는 자가 진정한 승자다!",
    "다음 쉬는 시간에 다시 도전하라!"
  ],
  "MURYEONG_KING": [
    "happy",
    "gentle",
    "즐거웠느냐? 이제 공부할 시간이구나.",
    "모두 재미있게 놀았으니 되었구나.",
    "자, 이제 자리로 돌아가렴.",
    "다음 쉬는 시간에도 즐겁게 놀려무나.",
    "아쉬워하지 말거라. 또 기회가 있단다.",
    "오늘도 씩씩하게 공부하거라.",
    "다치지 않고 잘 놀았으니 다행이구나.",
    "이제 선생님을 맞이할 준비를 하렴."
  ],
  "BANGASAYUSANG": [
    "neutral",
    "float",
    "한 판 더 하고 싶은 마음을 내려놓으세요.",
    "집착을 버리면 마음이 편안해집니다.",
    "승리도 패배도 모두 지나가는 것이지요.",
    "잠시 게임과 이별할 시간입니다.",
    "코인은 비웠으니 이제 지혜를 채워 봅시다.",
    "게임을 향한 욕심은 잠시 접어 두세요.",
    "다음 쉬는 시간은 반드시 찾아옵니다.",
    "오늘은 교과서 속에서 깨달음을 얻어 보세요."
  ],
  "CHILJIDO_ELDER": [
    "angry",
    "doze",
    "전원 복귀하라! …쿨쿨.",
    "당장 게임을… 하암… 종료하라!",
    "아직도 게임 중이냐? 나는 한숨 잤는데.",
    "한 판 더는 안 된다! …드르렁.",
    "시끄럽다! 이제 좀 자자!",
    "내가 잠들기 전에 어서 나가라!",
    "수업 시간이다! …뭐? 나도 깨라고?",
    "다들 자리로! 나는 조금만 더 자겠다."
  ]
};
  const lessonPhase=function phase(start,now){if(!Number.isFinite(start))return "idle";const left=start-now;return left<=30000?"close":left<=60000?"warn":"idle";};
  const lessonPick=function pick(table,rng=Math.random){const keys=Object.keys(table);const id=keys[Math.floor(rng()*keys.length)];const [mood,motion,...lines]=table[id];return {id,mood,motion,line:lines[Math.floor(rng()*lines.length)]};};
  let lessonStart=null,lessonRevision=-1,lessonClosed=false,lessonWarning=false,lessonEffects=true,lessonAudioAllowed=true;
  let lessonOverlay=null,lessonFuse=null,lessonCount=null,lessonPulseAt=0,lessonFlashUntil=0,lessonNoise=null,lessonNoiseGain=null;
  function lessonDuck(){
    if(!ac||!sfxBus||!bgmBus)return;
    sfxBus.gain.value=soundMode==='off'?0:.9*.2;
    bgmBus.gain.value=soundMode==='all'?.34*.2:0;
  }
  function lessonTone(){
    if(!lessonAudioAllowed||!ac||ac.state!=='running'||soundMode==='off')return;
    const t=ac.currentTime;
    for(const [offset,amp] of [[0,.30],[.13,.19]]){
      const o=ac.createOscillator(),g=ac.createGain(),at=t+offset;
      o.type='sine';o.frequency.setValueAtTime(72,at);o.frequency.exponentialRampToValueAtTime(42,at+.14);
      g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(amp,at+.025);g.gain.exponentialRampToValueAtTime(.001,at+.18);
      o.connect(g);g.connect(ac.destination);o.start(at);o.stop(at+.20);
    }
  }
  function lessonHiss(){
    if(!lessonAudioAllowed||!ac||ac.state!=='running'||soundMode==='off'){lessonStopHiss();return;}
    if(lessonNoise)return;
    const len=ac.sampleRate,buf=ac.createBuffer(1,len,ac.sampleRate),samples=buf.getChannelData(0);
    for(let i=0;i<len;i++)samples[i]=(Math.random()*2-1)*(.45+.55*Math.random());
    const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    s.buffer=buf;s.loop=true;f.type='bandpass';f.frequency.value=3000;f.Q.value=.7;g.gain.value=.065;
    s.connect(f);f.connect(g);g.connect(ac.destination);s.start();lessonNoise=s;lessonNoiseGain=g;
  }
  function lessonStopHiss(){
    if(lessonNoise){try{lessonNoise.stop();lessonNoise.disconnect();lessonNoiseGain.disconnect();}catch{}}
    lessonNoise=null;lessonNoiseGain=null;
  }
  // Pixel fuse renderer and original art from Teacher Tools dashboard blob 6b38c540.
  const lessonFuseArt={"spark":{"frames":[[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null],[null,null,null,null,null,null,"#f64e12",null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,"#f64e12",null,null,null,null,"#f64e12",null,null,"#f66312",null,"#f64e12",null,null,null],["#f64e12",null,null,null,null,"#f66312",null,"#f66312",null,null,null,"#f66312",null,null,null,"#ede423",null,null,null,null],[null,null,null,null,null,"#f66312",null,null,"#f66312","#ede423","#f66312","#ede423","#f66312","#f66312",null,"#ede423",null,null,null,null],[null,null,null,null,null,null,"#f66312",null,"#f66312","#ede423",null,"#ede423","#f66312","#ede423","#f66312",null,"#f66312",null,null,null],[null,"#fffcb4",null,null,null,null,null,"#f66312","#f66312","#ede423","#ede423","#ede423","#ede423","#ede423","#ede423","#ede423",null,"#f66312","#f66312",null],[null,null,null,null,null,"#f64e12",null,"#ede423","#ede423","#f66312","#ede423","#ede423","#ede423",null,"#ede423",null,null,null,null,null],[null,null,null,null,null,null,"#f66312",null,null,"#ede423","#fffcb4","#ede423",null,"#ede423",null,null,null,null,null,null],[null,null,null,null,null,null,"#f66312","#f66312","#ede423","#ede423","#ede423","#ede423","#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,"#f66312",null,null,"#f64e12","#f66312",null,"#ede423","#f66312",null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,"#f66312",null,null,"#fffcb4",null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,"#f66312",null,null,null,null,null,null,null],[null,null,null,"#fffcb4",null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]],[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,"#fffcb4",null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#f64e12",null,null,"#f64e12",null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,"#f64e12",null,null,"#f66312",null,null,null,null,null,"#f64e12",null,null,null],[null,null,null,null,null,null,"#f66312","#f64e12",null,null,"#f66312",null,"#f66312",null,null,null,"#f64e12",null,null,null],[null,null,null,null,"#fffcb4",null,"#f64e12","#ede423","#ede423",null,"#f66312",null,null,null,"#ede423","#f66312",null,null,null,null],[null,null,null,null,null,null,"#ede423","#f66312",null,"#f66312","#f66312",null,"#ede423","#fffcb4","#f66312",null,"#f66312","#f66312",null,null],[null,null,null,null,null,null,null,null,null,null,"#f66312","#f66312","#ede423","#ede423","#f66312","#ede423","#ede423",null,null,null],[null,null,null,null,null,null,null,"#f66312","#f66312","#f66312","#ede423","#ede423","#ede423",null,"#ede423","#f66312",null,null,null,null],[null,null,"#f64e12",null,null,"#f66312","#f66312",null,"#fffcb4",null,"#ede423","#fffcb4","#ede423","#ede423",null,null,null,null,null,null],[null,null,"#fffcb4",null,null,null,"#ede423","#f66312","#ede423","#ede423",null,"#ede423",null,"#ede423","#ede423",null,null,null,null,null],[null,null,null,null,null,"#f64e12",null,null,null,null,null,"#f66312",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f64e12","#ede423","#ede423",null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f66312","#f66312","#f66312","#f66312",null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null,null]],[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12",null,"#f64e12","#f66312",null,null,"#fffcb4",null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12",null,"#f64e12","#f66312",null,"#f64e12",null,null,null,"#f66312",null,null],[null,null,null,null,null,null,null,null,"#f64e12","#f66312","#f66312",null,"#f66312",null,null,null,null,null,null,null],[null,null,null,null,null,null,"#f64e12","#ede423","#ede423","#f66312",null,null,null,"#ede423",null,null,"#f64e12",null,null,null],[null,null,null,null,null,"#f64e12",null,null,"#f66312","#ede423","#f66312","#ede423","#ede423","#f66312","#f66312",null,"#f64e12",null,null,null],[null,"#fffcb4",null,null,null,"#f64e12",null,"#f66312","#ede423",null,"#f66312","#ede423",null,"#ede423","#ede423","#f66312",null,null,null,null],[null,null,null,null,"#f66312",null,"#fffcb4","#ede423","#f66312","#ede423","#ede423","#ede423","#fffcb4","#ede423",null,null,"#ede423",null,null,null],[null,null,null,null,"#f66312","#f66312","#f66312","#f66312","#f66312",null,null,null,"#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12","#ede423","#ede423","#ede423","#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,"#f64e12",null,"#f64e12","#ede423",null,null,"#ede423",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f66312",null,null,"#f66312",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,"#f66312",null,"#f66312","#f66312",null,"#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,null,"#f66312",null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null],[null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null]],[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null],[null,null,null,null,null,null,"#f64e12",null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,"#f64e12",null,null,null,null,"#f64e12",null,null,"#f66312",null,"#f64e12",null,null,null],["#f64e12",null,null,null,null,"#f66312",null,"#f66312",null,null,null,"#f66312",null,null,null,"#ede423",null,null,null,null],[null,null,null,null,null,"#f66312",null,null,"#f66312","#ede423","#f66312","#ede423","#f66312","#f66312",null,"#ede423",null,null,null,null],[null,null,null,null,null,null,"#f66312",null,"#f66312","#ede423",null,"#ede423","#f66312","#ede423","#f66312",null,"#f66312",null,null,null],[null,"#fffcb4",null,null,null,null,null,"#f66312","#f66312","#ede423","#ede423","#ede423","#ede423","#ede423","#ede423","#ede423",null,"#f66312","#f66312",null],[null,null,null,null,null,"#f64e12",null,"#ede423","#ede423","#f66312","#ede423","#ede423","#ede423",null,"#ede423",null,null,null,null,null],[null,null,null,null,null,null,"#f66312",null,null,"#ede423","#fffcb4","#ede423",null,"#ede423",null,null,null,null,null,null],[null,null,null,null,null,null,"#f66312","#f66312","#ede423","#ede423","#ede423","#ede423","#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,"#f66312",null,null,"#f64e12","#f66312",null,"#ede423","#f66312",null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,"#f66312",null,null,"#fffcb4",null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,"#f66312",null,null,null,null,null,null,null],[null,null,null,"#fffcb4",null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]],[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,"#fffcb4",null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#f64e12",null,null,"#f64e12",null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,"#f64e12",null,null,"#f66312",null,null,null,null,null,"#f64e12",null,null,null],[null,null,null,null,null,null,"#f66312","#f64e12",null,null,"#f66312",null,"#f66312",null,null,null,"#f64e12",null,null,null],[null,null,null,null,"#fffcb4",null,"#f64e12","#ede423","#ede423",null,"#f66312",null,null,null,"#ede423","#f66312",null,null,null,null],[null,null,null,null,null,null,"#ede423","#f66312",null,"#f66312","#f66312",null,"#ede423","#fffcb4","#f66312",null,"#f66312","#f66312",null,null],[null,null,null,null,null,null,null,null,null,null,"#f66312","#f66312","#ede423","#ede423","#f66312","#ede423","#ede423",null,null,null],[null,null,null,null,null,null,null,"#f66312","#f66312","#f66312","#ede423","#ede423","#ede423",null,"#ede423","#f66312",null,null,null,null],[null,null,"#f64e12",null,null,"#f66312","#f66312",null,"#fffcb4",null,"#ede423","#fffcb4","#ede423","#ede423",null,null,null,null,null,null],[null,null,"#fffcb4",null,null,null,"#ede423","#f66312","#ede423","#ede423",null,"#ede423",null,"#ede423","#ede423",null,null,null,null,null],[null,null,null,null,null,"#f64e12",null,null,null,null,null,"#f66312",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f64e12","#ede423","#ede423",null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f66312","#f66312","#f66312","#f66312",null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null,null]],[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12",null,"#f64e12","#f66312",null,null,"#fffcb4",null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12",null,"#f64e12","#f66312",null,"#f64e12",null,null,null,"#f66312",null,null],[null,null,null,null,null,null,null,null,"#f64e12","#f66312","#f66312",null,"#f66312",null,null,null,null,null,null,null],[null,null,null,null,null,null,"#f64e12","#ede423","#ede423","#f66312",null,null,null,"#ede423",null,null,"#f64e12",null,null,null],[null,null,null,null,null,"#f64e12",null,null,"#f66312","#ede423","#f66312","#ede423","#ede423","#f66312","#f66312",null,"#f64e12",null,null,null],[null,"#fffcb4",null,null,null,"#f64e12",null,"#f66312","#ede423",null,"#f66312","#ede423",null,"#ede423","#ede423","#f66312",null,null,null,null],[null,null,null,null,"#f66312",null,"#fffcb4","#ede423","#f66312","#ede423","#ede423","#ede423","#fffcb4","#ede423",null,null,"#ede423",null,null,null],[null,null,null,null,"#f66312","#f66312","#f66312","#f66312","#f66312",null,null,null,"#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12","#ede423","#ede423","#ede423","#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,"#f64e12",null,"#f64e12","#ede423",null,null,"#ede423",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f66312",null,null,"#f66312",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,"#f66312",null,"#f66312","#f66312",null,"#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,null,"#f66312",null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null],[null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null]],[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null],[null,null,null,null,null,null,"#f64e12",null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,"#f64e12",null,null,null,null,"#f64e12",null,null,"#f66312",null,"#f64e12",null,null,null],["#f64e12",null,null,null,null,"#f66312",null,"#f66312",null,null,null,"#f66312",null,null,null,"#ede423",null,null,null,null],[null,null,null,null,null,"#f66312",null,null,"#f66312","#ede423","#f66312","#ede423","#f66312","#f66312",null,"#ede423",null,null,null,null],[null,null,null,null,null,null,"#f66312",null,"#f66312","#ede423",null,"#ede423","#f66312","#ede423","#f66312",null,"#f66312",null,null,null],[null,"#fffcb4",null,null,null,null,null,"#f66312","#f66312","#ede423","#ede423","#ede423","#ede423","#ede423","#ede423","#ede423",null,"#f66312","#f66312",null],[null,null,null,null,null,"#f64e12",null,"#ede423","#ede423","#f66312","#ede423","#ede423","#ede423",null,"#ede423",null,null,null,null,null],[null,null,null,null,null,null,"#f66312",null,null,"#ede423","#fffcb4","#ede423",null,"#ede423",null,null,null,null,null,null],[null,null,null,null,null,null,"#f66312","#f66312","#ede423","#ede423","#ede423","#ede423","#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,"#f66312",null,null,"#f64e12","#f66312",null,"#ede423","#f66312",null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,"#f66312",null,null,"#fffcb4",null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,"#f66312",null,null,null,null,null,null,null],[null,null,null,"#fffcb4",null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]],[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,"#fffcb4",null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#f64e12",null,null,"#f64e12",null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,"#f64e12",null,null,"#f66312",null,null,null,null,null,"#f64e12",null,null,null],[null,null,null,null,null,null,"#f66312","#f64e12",null,null,"#f66312",null,"#f66312",null,null,null,"#f64e12",null,null,null],[null,null,null,null,"#fffcb4",null,"#f64e12","#ede423","#ede423",null,"#f66312",null,null,null,"#ede423","#f66312",null,null,null,null],[null,null,null,null,null,null,"#ede423","#f66312",null,"#f66312","#f66312",null,"#ede423","#fffcb4","#f66312",null,"#f66312","#f66312",null,null],[null,null,null,null,null,null,null,null,null,null,"#f66312","#f66312","#ede423","#ede423","#f66312","#ede423","#ede423",null,null,null],[null,null,null,null,null,null,null,"#f66312","#f66312","#f66312","#ede423","#ede423","#ede423",null,"#ede423","#f66312",null,null,null,null],[null,null,"#f64e12",null,null,"#f66312","#f66312",null,"#fffcb4",null,"#ede423","#fffcb4","#ede423","#ede423",null,null,null,null,null,null],[null,null,"#fffcb4",null,null,null,"#ede423","#f66312","#ede423","#ede423",null,"#ede423",null,"#ede423","#ede423",null,null,null,null,null],[null,null,null,null,null,"#f64e12",null,null,null,null,null,"#f66312",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f64e12","#ede423","#ede423",null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f66312","#f66312","#f66312","#f66312",null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null,null]],[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12",null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12",null,"#f64e12","#f66312",null,null,"#fffcb4",null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12",null,"#f64e12","#f66312",null,"#f64e12",null,null,null,"#f66312",null,null],[null,null,null,null,null,null,null,null,"#f64e12","#f66312","#f66312",null,"#f66312",null,null,null,null,null,null,null],[null,null,null,null,null,null,"#f64e12","#ede423","#ede423","#f66312",null,null,null,"#ede423",null,null,"#f64e12",null,null,null],[null,null,null,null,null,"#f64e12",null,null,"#f66312","#ede423","#f66312","#ede423","#ede423","#f66312","#f66312",null,"#f64e12",null,null,null],[null,"#fffcb4",null,null,null,"#f64e12",null,"#f66312","#ede423",null,"#f66312","#ede423",null,"#ede423","#ede423","#f66312",null,null,null,null],[null,null,null,null,"#f66312",null,"#fffcb4","#ede423","#f66312","#ede423","#ede423","#ede423","#fffcb4","#ede423",null,null,"#ede423",null,null,null],[null,null,null,null,"#f66312","#f66312","#f66312","#f66312","#f66312",null,null,null,"#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f64e12","#ede423","#ede423","#ede423","#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,"#f64e12",null,"#f64e12","#ede423",null,null,"#ede423",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#f66312",null,null,"#f66312",null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,"#f66312",null,"#f66312","#f66312",null,"#ede423",null,null,null,null,null,null,null],[null,null,null,null,null,null,"#f66312",null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null],[null,"#fffcb4",null,null,null,null,null,null,null,null,null,null,null,null,"#fffcb4",null,null,null,null,null]]]},"particles":{"ember":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAjUlEQVR4nGNgGAV4ga+57n8LIfn/ZGv+v8fz/zxRdtINgWn+36X1/3+XFl5DWLBp3tQqw8Bw7iEDQ0QAAwMDA0MiwwYGhu67DAxC8v9PvHvIiKyeCd2A17c/McyP3AfhrNjAwLBiA8PZLc9J8gGDhZD8/3mi7P//d2n9P2MnSF44wAwhSzOyIWRrHkEAAEzMQWwxWN3RAAAAAElFTkSuQmCC","cloud_puff":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAxUlEQVR4nGNgGPKAEZ+kr1vofxj76fPXDOcuH8CrHkMzMmjpm/ffSNfhP2GdaJq//EBgbIYw4XP2159EOxi/zfhcwYKsedPOVQRt1dfTY2BIjGNgmM/w/9zlA4yMpGjef+QsnH3x0iWGdfMXYYYBMZqRARMDAySOW/vn49SISzMDAzQMzl0+wMgwn+E/AwMDQ0FWIormi5cuMTAwQP2O5vxzlw8wwgMR2RBksG7+IggjMQ5FDJYqMZImekKBKUQWJylJEwIAzkekIWCno+oAAAAASUVORK5CYII="}};
  function lessonCreateFuse(canvas){
    const ctx=canvas.getContext('2d');let W=0,H=0,last=0,embers=[];
    const img={};for(const [k,v] of Object.entries(lessonFuseArt.particles)){const i=new Image();i.src=v;img[k]=i}
    const sparks=(lessonFuseArt.spark.frames||[]).map(fr=>{const c=document.createElement('canvas');c.width=20;c.height=20;const g=c.getContext('2d');fr.forEach((r,y)=>r.forEach((col,x)=>{if(col){g.fillStyle=col;g.fillRect(x,y,1,1)}}));return c});
    const rnd=(a,b)=>a+Math.random()*(b-a);
 const IN=3,TH=3;
 const L=()=>2*((W-2*IN-TH)+(H-2*IN-TH));
 function at(d){const w=W-2*IN-TH,h=H-2*IN-TH;d=Math.max(0,Math.min(L(),d));if(d<=w)return[IN+d,IN,0];d-=w;if(d<=h)return[IN+w,IN+d,1];d-=h;if(d<=w)return[IN+w-d,IN+h,2];d-=w;return[IN,IN+h-d,3]}
 const ROPE=['#6e4524','#a8703a','#d29a58','#a8703a'];
    return {draw(remaining,now){
      const S=Math.max(2,Math.round(innerHeight/360)),w=Math.ceil(innerWidth/S),h=Math.ceil(innerHeight/S);
      if(W!==w||H!==h){W=w;H=h;canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;embers=[];}
      const dt=last?Math.min(.05,(now-last)/1000):0;last=now;ctx.clearRect(0,0,W,H);
      const fuse={dur:30},t=Math.max(0,Math.min(30,30-remaining/1000)),len=L(),prog=Math.min(1,t/fuse.dur),head=prog*len;
   for(let d=0;d<len;d++){const [x,y,side]=at(d);for(let k=0;k<TH;k++){const px=side%2===0?x:x+k,py=side%2===0?y+k:y;
     if(d>=head){ctx.fillStyle=ROPE[(d+k)%4];ctx.fillRect(px,py,1,1);continue}
     const age=t-d/len*fuse.dur;if(age>9)continue;const n=(d*7+k*13)%11,hot=n<2&&age<2.5;ctx.globalAlpha=Math.max(0,1-age/9)*(hot?1:.85);ctx.fillStyle=hot?(n?'#f66312':'#ede423'):(n<5?'#4a3d35':'#2c2725');ctx.fillRect(px,py,1,1);ctx.globalAlpha=1}}
   if(prog<1){const [hx,hy]=at(head),late=fuse.dur-t<10,big=late?1.35:1,sp=sparks[Math.floor(now/1000*(late?18:11))%Math.max(1,sparks.length)];
    if(sp){const sz=Math.round(20*big);ctx.drawImage(sp,Math.round(hx+1-sz/2),Math.round(hy+1-sz/2),sz,sz)}
    if(Math.random()<(late?.9:.45))embers.push({k:'ember',x:hx,y:hy,vx:rnd(-30,30),vy:rnd(-40,-8),life:rnd(.4,.9),a:0});
    if(Math.random()<(late?.25:.12))embers.push({k:'cloud_puff',x:hx,y:hy,vx:rnd(-4,4),vy:rnd(-12,-5),life:rnd(1.2,2),a:0,smoke:1});
    }
   
   for(const p of embers){p.a+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(!p.smoke)p.vy+=60*dt;const f=1-p.a/p.life;if(f<=0)continue;const im=img[p.k];if(!im||!im.complete||!im.naturalWidth)continue;ctx.globalAlpha=p.smoke?f*.45:f;const s=p.smoke?Math.round(8+p.a*5):8;ctx.drawImage(im,Math.round(p.x-s/2),Math.round(p.y-s/2),s,s);ctx.globalAlpha=1}
   embers=embers.filter(p=>p.a<p.life);
    }};
  }
  function lessonShow(){
    if(lessonOverlay)return;
    const e=document.createElement('div');e.setAttribute('aria-hidden','true');
    e.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483640;box-shadow:inset 0 0 32px 8px rgba(220,35,35,.13);';
    const cv=document.createElement('canvas');cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none';
    e.append(cv);document.body.append(e);lessonOverlay=e;lessonFuse=lessonCreateFuse(cv);
  }
  function lessonClear(){
    const wasWarning=lessonWarning;lessonWarning=false;lessonPulseAt=0;lessonFlashUntil=0;lessonStopHiss();
    if(lessonOverlay)lessonOverlay.remove();lessonOverlay=lessonFuse=lessonCount=null;
    if(wasWarning&&!lessonClosed)applySoundMode();
  }
  function lessonClose(){
    if(lessonClosed)return;lessonClosed=true;lessonClear();
    const cue=lessonPick(LESSON_LINES);
    const stem=cue.id.toLowerCase();
    const portrait=mood=>EMBED_ASSETS['portraits/'+stem+'_'+MOOD_FILE[mood]+'.webp']||null;
    cue.portrait=portrait(cue.mood);
    if(cue.id==='CHILJIDO_ELDER')cue.sleepPortrait=portrait('neutral');
    if(cue.id==='HOJA')cue.sadPortrait=portrait('sad');
    document.body.inert=true;
    // Existing manual/routine close contract: roundClose is idempotent; recovery
    // persists unsettled refunds. Host must immediately unmount this iframe.
    roundClose();cancelPendingPayment();stopBgm(0);
    if(sfxBus)sfxBus.gain.value=0;if(bgmBus)bgmBus.gain.value=0;
    coinPost({type:'hoja-close',reason:'lesson-end',lessonStartMs:lessonStart,lessonCue:cue});
  }
  function lessonTick(){
    if(lessonClosed)return;
    const now=Date.now(),state=lessonPhase(lessonStart,now);
    if(state==='close'){lessonClose();return;}
    if(state==='idle'){if(lessonWarning)lessonClear();return;}
    if(!lessonEffects){if(lessonWarning)lessonClear();return;}
    lessonWarning=true;lessonShow();if(lessonAudioAllowed){lessonDuck();lessonHiss();}else{lessonStopHiss();applySoundMode();}
    const remaining=Math.max(0,lessonStart-now-30000);
    lessonFuse.draw(remaining,performance.now());
    const interval=450+remaining/30000*1050;
    if(now>=lessonPulseAt){lessonPulseAt=now+interval;lessonFlashUntil=now+140;lessonTone();}
    const steady=matchMedia('(prefers-reduced-motion: reduce)').matches;
    lessonOverlay.style.boxShadow='inset 0 0 32px 8px rgba(220,35,35,'+(!steady&&now<lessonFlashUntil?.28:.12)+')';
  }
  if(EMBED){
    window.addEventListener('message',event=>{
      const m=event.data;
      if(lessonClosed||event.origin!==DASHBOARD_ORIGIN||event.source!==window.parent||!m||
         m.type!=='hoja-lesson-schedule'||m.sessionId!==COIN_SESSION||!Number.isSafeInteger(m.revision)||m.revision<=lessonRevision||
         typeof m.enabled!=='boolean'||(m.lessonStartMs!==null&&!Number.isSafeInteger(m.lessonStartMs)))return;
      lessonRevision=m.revision;
      lessonStart=m.enabled?m.lessonStartMs:null;
      lessonEffects=m.effects!==false;lessonAudioAllowed=m.audio!==false;
      lessonTick();
    });
    const lessonTimer=setInterval(lessonTick,75);
    document.addEventListener('visibilitychange',lessonTick);
    window.addEventListener('pagehide',()=>{clearInterval(lessonTimer);lessonClear();},{once:true});
  }
