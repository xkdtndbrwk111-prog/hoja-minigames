// CSS integration smoke for non-interactive rhythm reactions on board and tablet.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const css=fs.readFileSync('src/css/style.css','utf8');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const [device,width,height,full] of [
   ['board',1920,1080,false],['board',1920,1080,true],
   ['tablet',1024,768,false],['tablet',1024,768,true],
   ['tablet',390,844,false],['tablet',390,844,true]
  ]){
   const p=await browser.newPage({viewport:{width,height}});
   const markup=`<!doctype html><html data-device="${device}"><head><meta charset="utf-8"><style>${css}</style></head><body style="margin:0">
    <div id="partyScreen" class="screen screen-game rh-stage ${full?'rh-full':''}" style="width:100vw;height:100vh;display:flex;flex-direction:column">
     <header class="display-zone game-header">
      <div class="team left" id="paTeam0"><div class="avatar-wrap"><img src="" alt=""><span class="rh-speech">좋아, 출발!</span></div><div class="team-text"><span class="team-name">호자</span></div></div>
      <div class="score-center"><div class="score-digit">20</div><div id="paHint">콤보</div></div>
      <div class="team right" id="paTeam1"><div class="avatar-wrap"><img src="" alt=""><span class="rh-speech">두둠칫!</span></div><div class="team-text"><span class="team-name">나한상</span></div></div>
     </header><div class="touch-zone pa-touch" style="flex:1"><div class="pa-stage"></div></div>
    </div></body></html>`;
   await p.setContent(markup);
   const state=await p.evaluate(()=>{
    const avatar=document.querySelector('#paTeam0 .avatar-wrap');
    const speech=document.querySelector('#paTeam0 .rh-speech');
    const ar=avatar.getBoundingClientRect(),sr=speech.getBoundingClientRect();
    return {avatarWidth:ar.width,avatarHeight:ar.height,speechDisplay:getComputedStyle(speech).display,speechPointer:getComputedStyle(speech).pointerEvents,speechWidth:sr.width};
   });
   assert.ok(state.avatarWidth>=(device==='tablet'?73:93),JSON.stringify({device,width,height,full,state}));
   assert.ok(state.avatarHeight>=(device==='tablet'?73:93),JSON.stringify({device,width,height,full,state}));
   assert.equal(state.speechPointer,'none','speech must not intercept multi-touch');
   if(device==='tablet')assert.equal(state.speechDisplay,'none','tablet play zones must have no bubble');
   else {assert.notEqual(state.speechDisplay,'none','board needs dialogue');assert.ok(state.speechWidth>25);}
   await p.close();
   console.log('PASS',device,width,height,full?'full':'header','face',Math.round(state.avatarWidth),'speech',state.speechDisplay);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
