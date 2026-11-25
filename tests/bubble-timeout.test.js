const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('src/js/bubble.js','utf8');
function setup(fields,running=false,extra=false){
 const events=[],BB={fields,extra,remaining:0,clockShown:0,phase:'playing',deadline:0};
 const c=vm.createContext({BB,TM:{running},performance:{now:()=>1000},B_W:680,B_LY:900,bClock:()=>{},bFloat:()=>{},bEnd:w=>events.push(w)});
 vm.runInContext(s.slice(s.indexOf('  function bLowest('),s.indexOf('  function bPresentColors(')),c);
 vm.runInContext(s.slice(s.indexOf('  function bTimeout('),s.indexOf('  function bNewMatch(')),c);
 return {BB,events,verdict:()=>vm.runInContext('bVerdict(BB.fields)',c),timeout:()=>vm.runInContext('bTimeout()',c)};
}
const f=(rows,shot=null)=>({rows,shot});
test('lowest occupied row wins regardless of count and projectile',()=>{
 const x=setup([f([[1,2,3],[1]],{y:1000}),f([[0],[0],[1]])]);
 assert.equal(x.verdict().winner,0);assert.equal(x.verdict().reason,'최하단 버블');
});
test('empty grid and trailing empty rows',()=>{
 assert.equal(setup([f([[0],[0]]),f([[1]])]).verdict().winner,0);
 assert.equal(setup([f([[1],[0]]),f([[1]])]).verdict().winner,-1);
});
test('equal depth compares attached count including rock',()=>{
 assert.equal(setup([f([[1,9],[2]]),f([[1],[2]])]).verdict().winner,1);
});
test('normal tie ends as draw and does not extend',()=>{
 const x=setup([f([[1]]),f([[2]])]);x.timeout();assert.deepEqual(x.events,[-1]);assert.equal(x.BB.extra,false);
});
test('tournament tie grants one ten-second extension; second tie uses existing replay contract',()=>{
 const x=setup([f([[1]]),f([[2]])],true);x.timeout();assert.equal(x.BB.deadline,11000);assert.equal(x.BB.remaining,10000);assert.equal(x.BB.extra,true);assert.equal(x.events.length,0);
 x.timeout();assert.deepEqual(x.events,[-1]);
});
test('decisive tournament result does not extend',()=>{
 const x=setup([f([[1]]),f([[2],[1]])],true);x.timeout();assert.deepEqual(x.events,[0]);
});
test('deadline and lesson-close checks precede field simulation',()=>{
 const step=s.slice(s.indexOf('  function bStep(dt)'),s.indexOf('  /* ---------- Puzzle Bubble: touch'));
 assert.ok(step.indexOf('lessonTick();return;')<step.indexOf('bTimeout();return;'));
 assert.ok(step.indexOf('bTimeout();return;')<step.indexOf('bStepField(f,dt)'));
 assert.match(s,/B_MATCH_MS=90000,B_EXTRA_MS=10000/);
 assert.match(s,/BB.deadline\+=performance.now\(\)-BB.pauseAt/);
});
