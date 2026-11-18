const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/js/tournament.js'),'utf8');
const pure=source.slice(0,source.indexOf('/* UI / host adapters'));
const {tmBracket,tmNext,tmResolve,tmRefundable}=new Function(pure+';return {tmBracket,tmNext,tmResolve,tmRefundable}')();
test('all sizes 2-40: byes only first round, no empty matches, exactly n-1 played games',()=>{
 for(let n=2;n<=40;n++){
  const ids=Array.from({length:n},(_,i)=>'s'+i),r=tmBracket(ids,()=>.47);
  assert.equal(r[0].length*2,2**Math.ceil(Math.log2(n)));
  assert.equal(r[0].filter(m=>m.bye).length,r[0].length*2-n);
  assert(r[0].every(m=>m.a));assert.equal(new Set(r[0].flatMap(m=>[m.a,m.b]).filter(Boolean)).size,n);
  let played=0,next;while(next=tmNext(r)){assert(tmResolve(r,next.r,next.i,next.m.a));played++;assert(!tmResolve(r,next.r,next.i,next.m.a));}
  assert.equal(played,n-1);assert(ids.includes(r.at(-1)[0].winner));
 }
});
test('invalid or duplicated entrants rejected',()=>{for(const ids of [[],['x'],['x','x'],Array(41).fill('x')])assert.throws(()=>tmBracket(ids));});
test('refund only paid first match, exact 10 seconds and freeze on early end',()=>{
 const t={charge:'tx',firstStart:null,firstEnd:null,refundLocked:false};assert(tmRefundable(t,1e9));
 t.firstStart=1000;assert(tmRefundable(t,10999));assert(!tmRefundable(t,11000));
 t.firstEnd=1500;assert(tmRefundable(t,1e9));t.refundLocked=true;assert(!tmRefundable(t,1e9));t.charge=null;assert(!tmRefundable(t,1e9));
});
test('winner is current pair only and duplicate events are rejected',()=>{const r=tmBracket(['a','b','c','d'],()=>.3),n=tmNext(r);assert(!tmResolve(r,n.r,n.i,'outsider'));assert(tmResolve(r,n.r,n.i,n.m.a));assert(!tmResolve(r,n.r,n.i,n.m.b));});
