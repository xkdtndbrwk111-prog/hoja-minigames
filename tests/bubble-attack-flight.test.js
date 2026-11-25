const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('src/js/bubble.js','utf8');
function setup(){const c=vm.createContext({B_W:680,B_FH:1000,B_LY:900,B_ROCK:9,sfx(){}});vm.runInContext(s.slice(s.indexOf('  const B_FX_LIMIT='),s.indexOf('  function bFxDraw(')),c);return c;}
test('flight uses real pop coordinates, rock payload and separate all-clear effects',()=>{
 const c=setup();const actual=vm.runInContext(`(()=>{const f={i:0,combo:5},rival={pendingFX:[]},pops=[{x:123,y:456,v:2}];bFxQueue(f,rival,2,3,pops);bFxQueue(f,rival,2,0,pops,true);return JSON.stringify(rival.pendingFX)})()`,c);
 const events=JSON.parse(actual);assert.equal(events.length,4);assert.equal(events[0].particles.filter(p=>p.v===9).length,3);assert.equal(events[0].particles[0].x,123);assert.equal(events[0].particles[0].y,456);assert.equal(events[1].rock,0);assert.equal(events[2].particles.length,7);
});
test('defence cancels only the matching incoming rows; render queue is capped and reset',()=>{
 const c=setup();assert.equal(vm.runInContext(`(()=>{const f={i:0,combo:3},rival={i:1,pendingFX:[]},p=[{x:10,y:20,v:1}];bFxQueue(f,rival,2,1,p);const first=rival.pendingFX[0];bFxCancel(rival,1,p);return first.cancelled&&rival.pendingFX.length===1&&!rival.pendingFX[0].cancelled&&bFX.events.some(e=>e.defence)})()`,c),true);
 assert.equal(vm.runInContext('for(let i=0;i<100;i++)bFxAdd({});bFX.events.length',c),20);assert.equal(vm.runInContext('bFxReset();bFX.events.length',c),0);
});
test('normal and rotated field coordinates and curve endpoints',()=>{
 const c=setup();assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(bFxPoint({left:10,top:20,width:340,height:500},1,0,0,true))',c)),{x:350,y:520});
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(bFxPoint({left:10,top:20,width:340,height:500},0,0,0,true))',c)),{x:10,y:20});
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(bFxCurve({x:0,y:0},{x:100,y:0},0))',c)),{x:0,y:0});
 assert.ok(Math.abs(vm.runInContext('bFxCurve({x:0,y:0},{x:100,y:0},1).x',c)-100)<1e-6);
});
test('visual hooks leave attack accounting and danger portraits wired',()=>{
 assert.match(s,/rival\.pending\+=attack;.*bFxQueue\(f,rival,attack,rocks,attackPops\)/);
 assert.match(s,/f\.pending--;f\.pendingFX\.shift\(\);bPushRow/);
 assert.match(s,/bFxReset\(\);BB\.phase='over'/);
 assert.match(s,/pointer-events:none;z-index:4/);
 assert.match(s,/danger=low>=B_DEAD-2/);
});

test('danger portrait overrides happy attack reaction and recovers to neutral',()=>{
 const nodes=new Map(),BB={phase:'playing',fields:[{i:0,low:9,warned:false}]},sounds=[];
 const c=vm.createContext({BB,B_DEAD:11,bLowest:f=>f.low,portraitFor:(i,m)=>m,sfx:(...args)=>sounds.push(args),bEnd(){throw Error('unexpected end')},$:id=>{if(!nodes.has(id))nodes.set(id,{src:'',textContent:'',classList:{toggle(){}}});return nodes.get(id);}});
 vm.runInContext(s.slice(s.indexOf('  function bNote('),s.indexOf('  function bSyncScores('))+s.slice(s.indexOf('  function bCheckLoss('),s.indexOf('  function bEnd(')),c);
 vm.runInContext("bCheckLoss(BB.fields[0]);bNote(0,'happy','받아라!')",c);
 assert.equal(nodes.get('bPortrait0').src,'surprised');assert.equal(nodes.get('bNote0').textContent,'위험해!');
 assert.equal(sounds.length,1);
 vm.runInContext('BB.fields[0].low=8;bCheckLoss(BB.fields[0])',c);
 assert.equal(nodes.get('bPortrait0').src,'neutral');assert.equal(nodes.get('bNote0').textContent,'');
 vm.runInContext("bNote(0,'happy','받아라!')",c);assert.equal(nodes.get('bPortrait0').src,'happy');
});
