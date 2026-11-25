const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('src/js/bubble.js','utf8');
const slice=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
test('score overrides depth and count, equal score draws',()=>{
 const c=vm.createContext({});vm.runInContext(slice('  function bLowest(','  function bPresentColors('),c);
 for(const [a,b,w] of [[100,50,0],[50,100,1],[50,50,-1]])assert.equal(vm.runInContext('bVerdict([{score:'+a+',rows:[[1],[2]]},{score:'+b+',rows:[]}]).winner',c),w);
});
test('one overtime only in tournament',()=>{
 const BB={fields:[{score:20},{score:20}],extra:false},events=[];
 const c=vm.createContext({BB,TM:{running:true},performance:{now:()=>1000},B_W:680,B_LY:900,bClock(){},bFloat(){},bEnd:w=>events.push(w)});
 vm.runInContext(slice('  function bLowest(','  function bPresentColors(')+slice('  function bTimeout(','  function bNewMatch('),c);
 vm.runInContext('bTimeout()',c);assert.equal(BB.deadline,11000);assert.equal(events.length,0);
 vm.runInContext('bTimeout()',c);assert.deepEqual(events,[-1]);
});
test('rock rows use existing rock type and distinct cells',()=>{
 const c=vm.createContext({B_COLS:8,B_ROCK:9,B_H:70,B_DEAD:11,bRandomRow:()=>Array(8).fill(1),sfx(){},bCheckLoss(){}});
 vm.runInContext(slice('  function bPushRow(','  function bCheckLoss('),c);
 for(const n of [0,1,2,3])assert.equal(vm.runInContext('(()=>{const f={rows:[],stage:{},shift:0,shake:0};bPushRow(f,true,'+n+');return f.rows[0].filter(x=>x===9).length})()',c),n);
});
test('combo reset, attack cancellation and all-clear queue are wired',()=>{
 assert.match(s,/f\.combo\+\+/);assert.match(s,/else f\.combo=0/);assert.match(s,/Math\.min\(3,Math\.max\(0,f\.combo-2\)\)/);
 assert.match(s,/f\.pendingRocks\.splice\(0,can\)/);assert.match(s,/f\.pendingRocks\.shift\(\)\|\|0/);assert.match(s,/rival\.pendingRocks\.push\(0,0\)/);
 assert.ok(!s.includes('BB.verdict.stats'));
});
test('lesson guard precedes timeout and field simulation',()=>{
 const step=slice('  function bStep(dt)','  /* ---------- Puzzle Bubble: touch');
 assert.ok(step.indexOf('lessonTick();return;')<step.indexOf('bTimeout();return;'));
 assert.ok(step.indexOf('bTimeout();return;')<step.indexOf('bStepField(f,dt)'));
});
