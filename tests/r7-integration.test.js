const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const coins=fs.readFileSync(path.join(__dirname,'../src/js/coins.js'),'utf8');
const hof=fs.readFileSync(path.join(__dirname,'../src/js/hall-of-fame.js'),'utf8');
test('R7 mode policy: 21 eligible categories, all new categories require protocol v3',()=>{
 const a=hof.slice(hof.indexOf('const HOF_GAMES='),hof.indexOf('const HOF_PERIODS='));
 const modes=[...a.matchAll(/\{id:'([^']+)',[\s\S]*?\}/g)].map(m=>({id:m[1],v3:m[0].includes('requiresV3:true')}));
 assert.equal(modes.length,21);
 assert.equal(modes.filter(m=>m.v3).length,13);
 assert.equal(modes.filter(m=>!m.v3).length,8);
 for(const name of ['stairs_solo','stairs_race','jump_solo','jump_duel','shop_solo','shop_vs2','shop_co2','shop_co4','flash_solo','flash_r8','flash_r12','dance_solo','dance_duo'])assert(modes.find(m=>m.id===name)?.v3,name);
});
test('R7 coin source parses as part of the joined app',()=>{
 assert.doesNotThrow(()=>new Function(coins));
 assert.match(coins,/sessionId:COIN_SESSION/);
 assert.match(coins,/readyReq/);
 assert.match(coins,/queueRefund/);
 assert.match(coins,/RECOVERY_KEY/);
 assert.match(coins,/function hofPrizeGames/);
});
test('R7 protocol: reject wrong iframe session, fetch fresh roster and confirm refund',()=>{
 const body=coins.slice(0,coins.indexOf('/* Dashboards from V1.16'));
 assert(body.includes('function coinPost'));
 const mocked=String.raw`const EMBED=true,DASHBOARD_ORIGIN='http://127.0.0.1:17439',
 HOF={players:[],playerNames:[]},HOF_GAMES=[],PARTY_GAMES={},currentGame='hockey',aiLevel=1,
 localStorage={getItem:()=>null,setItem:()=>{}},
 crypto={randomUUID:()=>String(++seed).padStart(8,'0')+'-0000-4000-8000-000000000000'},
 document={addEventListener:()=>{}},listeners={},sent=[],timers=new Map();
 let seed=0,idx=0,picked=0,played=0;
 const window={parent:{postMessage:m=>sent.push(m)},addEventListener:(k,f)=>listeners[k]=f};
 const setTimeout=f=>{timers.set(++idx,f);return idx},clearTimeout=id=>timers.delete(id),setInterval=()=>0;
 const hofToast=()=>{},hofSyncDue=()=>{},hofUseRoster=()=>{},
 hofPick=(n,done)=>done(),preference=()=>'',remember=()=>{},sfx=()=>{},
 $=id=>({hidden:true});`;
 const run=String.raw`const session=COIN_SESSION;
 const deliver=m=>listeners.message({origin:DASHBOARD_ORIGIN,source:window.parent,data:m});
 playGate(1,1,()=>played++);
 assert.equal(played,0);
 deliver({type:'hoja-roster',version:3,classId:'A',enabled:true,students:[{id:'s',name:'학생',balance:3}]});
 assert.equal(COIN.ready,false);
 deliver({type:'hoja-roster',sessionId:session,version:3,classId:'A',enabled:true,students:[{id:'s',name:'학생',balance:3}]});
 assert.equal(COIN.ready,true);
 coinPick=()=>picked++;
 playGate(1,1,()=>played++);
 const ready=sent.at(-1);
 assert.equal(ready.type,'hoja-ready');
 assert.equal(picked,0);
 deliver({type:'hoja-roster',sessionId:session,readyReq:ready.readyReq,version:3,classId:'A',enabled:true,students:[{id:'s',name:'학생',balance:3}]});
 assert.equal(picked,1);
 coinSpend(['s'],()=>played++,()=>{});
 const p=sent.at(-1);
 assert.equal(p.type,'hoja-coin-spend');
 assert.equal(p.sessionId,session);
 assert.equal(p.classId,'A');
 deliver({type:'hoja-coin-result',sessionId:session,req:p.req,ok:true,classId:'A',charge:p.txId,price:1,balances:{s:2}});
 assert.equal(played,1);
 roundClose();
 assert.equal(COIN.students[0].balance,2);
 deliver({type:'hoja-refund-result',sessionId:session,charge:p.txId,ok:true,classId:'A',balances:{s:3}});
 assert.equal(COIN.students[0].balance,3);
 `;
 new Function('assert',mocked+'\n'+body+'\n'+run)(assert);
});
