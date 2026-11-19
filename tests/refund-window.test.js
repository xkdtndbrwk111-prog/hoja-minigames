const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=p=>fs.readFileSync(path.join(__dirname,'../src/js',p),'utf8');
const coins=source('coins.js');
const body=coins.slice(0,coins.indexOf('/* Dashboards from V1.16'));
const mocks=String.raw`const EMBED=true,DASHBOARD_ORIGIN='https://board.invalid',
HOF={players:[],playerNames:[]},HOF_GAMES=[],PARTY_GAMES={},aiLevel=1,
localStorage={getItem:()=>null,setItem:()=>{}},crypto={randomUUID:()=>String(++seed)},
document={addEventListener:()=>{}},listeners={},sent=[],timers=new Map();
let seed=0,idx=0,currentGame='stairs',now=100000,played=0,exits=0;
const refundExitToMenu=()=>{exits++;};
const paints=[];const syncRefundControl=()=>paints.push(roundRefundControlVisible());
const Date={now:()=>now};
const window={parent:{postMessage:m=>sent.push(m)},addEventListener:(k,f)=>listeners[k]=f};
const setTimeout=f=>{timers.set(++idx,f);return idx},clearTimeout=id=>timers.delete(id),setInterval=()=>0;
const hofToast=()=>{},hofSyncDue=()=>{},hofUseRoster=()=>{},hofPick=(n,done)=>done(),
preference=()=>'',remember=()=>{},sfx=()=>{},$=id=>({hidden:true});`;
const run=code=>new Function('assert',mocks+'\n'+body+'\n'+String.raw`
COIN.ready=true;COIN.protocol=3;COIN.classId='A';COIN.on=true;COIN.enabled=true;
const deliver=m=>listeners.message({origin:DASHBOARD_ORIGIN,source:window.parent,data:{...m,sessionId:COIN_SESSION}});
function pay(game='stairs'){
 currentGame=game;coinSpend(['s'],()=>played++,e=>{throw Error(e)});
 const p=sent.at(-1);
 assert.equal(p.type,'hoja-coin-spend');
 deliver({type:'hoja-coin-result',req:p.req,ok:true,classId:'A',charge:p.txId,price:1});
 return p.txId;
}
const refunds=()=>sent.filter(m=>m.type==='hoja-coin-refund');
function confirm(charge){deliver({type:'hoja-refund-result',charge,ok:true,classId:'A'});}
`+'\n'+code)(assert);
test('first paid attempt: unlimited ready screen, refund once, cancel remaining attempts',()=>run(
 'const id=pay(); now+=900000; assert.equal(TRY.left,4); assert(roundRefundable()); assert(roundClose()); assert.equal(TRY.left,0); assert(!roundRefundable()); assert(!roundClose()); assert.equal(refunds().length,1); assert.equal(refunds()[0].charge,id);'
));
test('all 11 retry games refund their first paid attempt',()=>run(
 'for(const game of Object.keys(TRY_PLAN)){const id=pay(game); roundBegin(); now+=9999; assert(roundClose(),game); assert.equal(TRY.left,0,game); confirm(id); } assert.equal(refunds().length,11);'
));
test('exact 10 second boundary; repeated start preserves original clock',()=>run(
 'pay(); roundBegin(); now+=9999; roundBegin(); assert(roundRefundable()); now++; assert(!roundRefundable()); assert(!roundClose()); assert.equal(refunds().length,0);'
));
test('early game over stays refundable even after reading result',()=>run(
 'pay(); roundBegin(); now+=3000; roundFinish(); now+=120000; roundFinish(); assert(roundRefundable()); assert(roundClose()); assert.equal(refunds().length,1);'
));
test('free retry never refunds original payment, and count decreases once',()=>run(
 'pay(); roundBegin(); now+=10001; roundFinish(); replayGateFresh(()=>played++); assert.equal(TRY.left,3); assert.equal(round.freeRetry,true); roundBegin(); now+=100; assert(!roundRefundable()); assert(!roundClose()); assert.equal(refunds().length,0); assert.equal(TRY.left,0);'
));
test('replay after short paid round cancels entitlement rather than issuing free retry',()=>run(
 'const id=pay(); roundBegin(); now+=500; replayGateFresh(()=>played++); assert.equal(played,1); assert.equal(exits,1); assert.equal(TRY.left,0); assert.equal(refunds().length,1); assert.equal(COIN.refunds.size,1); confirm(id); assert.equal(COIN.refunds.size,0);'
));
test('all game families have explicit start and terminal hooks, no generic capture timer',()=>{
 assert(!coins.includes("document.addEventListener('pointerdown'"));
 for(const f of ['hockey','othello','gomoku','bubble','bakery','stairs','volleyball','tictactoe','germ','jump','party/page1']){
   const s=source(f+'.js');assert(s.includes('roundBegin()'),f);assert(s.includes('roundFinish()'),f);
 }
 for(const f of ['rhythm','dance'])assert(source(f+'.js').includes('roundBegin()'),f);
 assert(source('hockey.js').includes('다시 오르기|다시 경주|처음부터'));
});

test('paid ready control hides synchronously on start, yet the existing 10-second refund remains',()=>run(
 'pay(); assert.equal(paints.at(-1),true); assert(roundRefundControlVisible()); roundBegin(); assert.equal(paints.at(-1),false); assert(!roundRefundControlVisible()); now+=9999; assert(roundRefundable()); roundFinish(); assert.equal(paints.at(-1),false); assert(roundClose()); assert.equal(refunds().length,1);'
));
test('no button for free rounds, finished rounds or tournament purchase transferred to bracket',()=>run(
 'assert(!roundRefundControlVisible()); round={freeRetry:true,t0:null}; assert(!roundRefundControlVisible()); round={day:true,t0:null}; assert(!roundRefundControlVisible()); round={charge:"x",t0:null,endAt:now}; assert(!roundRefundControlVisible()); round=null; assert(!roundRefundControlVisible());'
));
test('bakery cooperative banner is removed, role name rendering and solo sign retained',()=>{
 const s=source('bakery.js');assert.match(s,/if\(SH.mode==='solo'&&!shFaced\(\)\)\{\s*const sign='호자네 붕어빵'/);assert.ok(!s.includes("const sign=SH.co"));assert.ok(s.includes("label+' · '+gamePlayerName(i)"));
});
