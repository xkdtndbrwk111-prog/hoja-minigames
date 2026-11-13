/* Standalone, no packages: node tests/dance-logic.test.js */
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const dance=fs.readFileSync('src/js/dance.js','utf8');
const noop=()=>{};
function harness(lag=0,cast=['HOJA','NAHANSANG']){
  let now=1000;
  const nodeList={};
  const scores=[0,0],stored=[],ended=[],images=[];let begun=0;
  const canvasContext=new Proxy({},{
    get(target,key){
      if(key==='createLinearGradient')return ()=>({addColorStop:noop});
      if(key==='measureText')return ()=>({width:1});
      return target[key]===undefined?noop:target[key];
    },
    set(target,key,value){target[key]=value;return true;}
  });
  function el(tag,cls,text){
    const x={tag,cls,textContent:text||'',children:[],listeners:{},style:{},
      width:1000,height:560,classList:{add:noop,remove:noop,toggle:noop},hidden:false};
    x.addEventListener=(name,fn)=>{(x.listeners[name]||(x.listeners[name]=[])).push(fn);};
    x.append=(...children)=>x.children.push(...children);
    x.remove=()=>{x.removed=true;};
    x.setAttribute=noop;x.getContext=()=>canvasContext;
    x.getBoundingClientRect=()=>({width:x.width,height:x.height});
    return x;
  }
  const env={
    rhSeed:seed=>()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296,
    rhCompose:song=>({notes:[{step:4,midi:72,len:2}],bass:[],drums:[{step:0,kind:'kick'}],totalSteps:64,stepLen:60/song.bpm/4}),
    RH_SONGS:[
      {id:'march',name:'호자 행진곡',bpm:108,seed:11},
      {id:'break',name:'쉬는 시간',bpm:96,seed:27},
      {id:'run',name:'달려라 호자',bpm:126,seed:41},
      {id:'fish',name:'붕어빵 스윙',bpm:114,seed:53},
      {id:'star',name:'칠판 위의 별',bpm:84,seed:68},
      {id:'king',name:'광개토 전진',bpm:138,seed:79}
    ],
    paEl:el,PARTY_GAMES:{},$:(id)=>nodeList[id]||(nodeList[id]=el('div')),
    roundBegin:()=>{begun++;},
    Image:class {constructor(){this.complete=false;this.naturalWidth=0;images.push(this);}},
    choices:cast,nameFor:i=>({HOJA:'호자',NAHANSANG:'나한상',SUMAKSAE:'수막새',GWANGGAETO_KING:'광개토대왕'})[cast[i]]||cast[i],
    characterPortrait:id=>'/portraits/'+id+'.webp',clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),
    gamePlayerName:i=>['민수','서연'][i],
    performance:{now:()=>now,timeOrigin:Date.now()-now},window:{devicePixelRatio:1},
    document:{addEventListener:noop,removeEventListener:noop},
    PS:{live:true,on:true,ended:false,paused:false},HOF:{cfg:{},players:[10,11]},
    paSetScore:(i,n)=>{scores[i]=n;},paHint:noop,paTime:noop,
    paEnd:(winner,detail)=>{ended.push({winner,detail});env.PS.ended=true;},
    hofRecord:(...args)=>stored.push({kind:'solo',args}),
    hofRecordTeam:(...args)=>stored.push({kind:'duo',args}),
    rhAudioOk:()=>false,ac:null,boardLag:lag,rhTone:noop,rhBlip:noop,sfx:noop,
    currentGame:'dance',streak:{},toggleFullscreen:noop,enterSelection:noop
  };
  const keys=Object.keys(env);
  const api=new Function(...keys,dance+'\nreturn {DA_STAGES,daMake,daChart,daEventStamp};')(...keys.map(k=>env[k]));
  const advance=milliseconds=>{now=milliseconds;};
  const start=stage=>{
    env.PS.ended=false;
    const host=el('div'),run=api.daMake(stage,host);
    assert.equal(host.children.length,3);
    const songPicker=host.children[2].children[2],song=songPicker.children[0];
    assert.ok(song);
    song.listeners.pointerdown[0]({preventDefault:noop,stopPropagation:noop});
    assert.ok(run.state.chart.events.length>60);
    assert.ok(run.state.chart.duration>=stage.targetSeconds);
    assert.ok(run.state.chart.duration<=stage.targetSeconds+run.state.chart.beat*2.01);
    assert.equal(begun,1,'round must begin only when a song is selected');
    return {run,buttons:host.children[1].children};
  };
  const tap=(button,when)=>button.listeners.pointerdown[0]({timeStamp:when,preventDefault:noop,stopPropagation:noop});
  return {api,env,scores,stored,ended,images,start,tap,advance,get now(){return now;}};
}
function validateCharts(){
  const t=harness();
  let checked=0;
  for(const stage of t.api.DA_STAGES){
    for(const song of t.env.RH_SONGS){
      const chart=t.api.daChart(song,stage);
      assert.ok(chart.duration>=stage.targetSeconds,'stage too short');
      assert.ok(chart.duration<=stage.targetSeconds+chart.beat*2.01,'stage too long');
      assert.equal(chart.path.length,chart.events.length+2);
      assert.ok(chart.events.length<400,'chart must have bounded complexity');
      assert.ok(Math.abs(chart.beat-60/song.bpm)<1e-10);
      for(let i=0;i<chart.events.length;i++){
        const e=chart.events[i];
        assert.equal(e.owner,i%2);
        assert.ok(Number.isFinite(e.at));
        assert.ok(e.duration>0&&e.duration<=chart.beat*2.01);
        if(i)assert.ok(e.at>chart.events[i-1].at);
      }
      checked++;
    }
  }
  assert.equal(checked,36);
  console.log('PASS: 36 chart and BPM combinations');
}
function validateMode(mode,lag){
  const t=harness(lag),stage=t.api.DA_STAGES.find(x=>x.id===mode);
  assert.ok(stage);
  const {run,buttons}=t.start(stage),s=run.state;
  assert.equal(buttons.length,stage.people);
  for(let i=0;i<s.chart.events.length;i++){
    const e=s.chart.events[i],side=stage.people===1?0:e.owner;
    const now=s.startPerf+(e.at+lag)*1000+8;
    t.advance(now);
    if(stage.people===2&&i===0){
      t.tap(buttons[1],now);
      assert.equal(s.next,0,'wrong player must not score');
    }
    t.tap(buttons[side],now);
    assert.equal(s.next,i+1,'each beat increments exactly once');
  }
  assert.equal(s.score,300,'every PERFECT run must score 300 regardless of mode or BPM');
  assert.equal(s.perfect,s.chart.events.length);
  t.advance(s.startPerf+(s.chart.end+.7)*1000);
  s.lastTick=t.now-16;
  run.frame(.016); // Includes Canvas draw and final result path.
  assert.equal(t.ended.length,1);
  assert.equal(t.stored.length,1);
  assert.equal(t.stored[0].kind,stage.people===1?'solo':'duo');
  if(stage.people===2)assert.deepEqual(t.stored[0].args[1],[10,11]);
  assert.match(t.ended[0].detail,/기록 300\/300점/);
  assert.equal(t.stored[0].args[2],300,'normalized leaderboard score');
  const musicSeconds=64*60/108/4;
  assert.ok(s.cues.some(c=>c.kind==='tone'&&c.time>1.8+musicSeconds),'music must repeat for longer stages');
  run.stop();
  console.log('PASS: '+mode+' ('+s.chart.events.length+' notes) normalized score, result, leaderboard');
}
function validateMiss(){
  const t=harness(),stage=t.api.DA_STAGES.find(x=>x.id==='d-easy');
  const {run}=t.start(stage),s=run.state;
  const first=s.chart.events[0];
  t.advance(s.startPerf+(first.at+.2)*1000);
  s.lastTick=t.now-16;
  run.frame(.016);
  assert.equal(s.next,1);
  assert.equal(s.miss,1);
  assert.equal(s.score,0);
  run.stop();
  console.log('PASS: unplayed beat counts as MISS; play continues');
}
function validatePause(){
  const t=harness(.08),stage=t.api.DA_STAGES.find(x=>x.id==='d-easy');
  const {run,buttons}=t.start(stage),s=run.state;
  const initial=s.startPerf;
  t.advance(initial+450);
  run.pause();
  t.advance(initial+3450);
  run.resume();
  assert.equal(s.startPerf,initial+3000);
  const e=s.chart.events[0],at=s.startPerf+(e.at+.08)*1000;
  t.advance(at);
  t.tap(buttons[0],at);
  assert.equal(s.perfect,1,'calibrated tap must still be PERFECT after pause');
  run.stop();
  console.log('PASS: paused song resumes from exact beat with calibration');
}
function validateCharacterChoices(){
  const cast=['SUMAKSAE','GWANGGAETO_KING'],t=harness(0,cast);
  const stage=t.api.DA_STAGES.find(x=>x.id==='d-easy');
  const {run,buttons}=t.start(stage);
  assert.deepEqual(t.images.slice(0,2).map(im=>im.src),cast.map(id=>'/portraits/'+id+'.webp'));
  assert.match(buttons[0].textContent,/수막새/);
  assert.match(buttons[1].textContent,/광개토대왕/);
  assert.match(run.state.message,/^$/);
  run.stop();
  const duplicate=harness(0,['HOJA','HOJA']);
  const other=duplicate.start(stage);
  assert.equal(duplicate.images[0].src,duplicate.images[1].src);
  other.run.stop();
  console.log('PASS: 7-character cast selection, team labels and identical picks');
}
validateCharts();
validateCharacterChoices();
validatePause();
validateMode('s-easy',0);
validateMode('s-normal',.08);
validateMode('s-hard',0);
validateMode('d-easy',0);
validateMode('d-normal',.08);
validateMode('d-hard',0);
validateMiss();
console.log('All dance tests PASS.');
