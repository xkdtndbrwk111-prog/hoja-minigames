const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'../src/js',p),'utf8');
const hof=read('hall-of-fame.js'),coins=read('coins.js');
const helpers=hof.slice(hof.indexOf('  const HOF={'),hof.indexOf('  async function hofRpc'));
const query=coins.slice(coins.indexOf('  async function hofRefresh(){'),coins.indexOf('  /* Weekly settlement:'));
function harness(embedded=false,initial={}){
 const storage=new Map(Object.entries(initial)),requests=[],messages=[];
 const env={EMBED:embedded,COIN:{classId:embedded?'A':'',v2:true},preference:(k,d)=>storage.get(k)??d,remember:(k,v)=>storage.set(k,v),
   localStorage:{removeItem:k=>storage.delete(k.replace('hoja-airhockey-',''))},
   hofRpc:(name,args)=>new Promise((resolve,reject)=>requests.push({name,args,resolve,reject})),
   coinPost:m=>messages.push(m),hofToast:()=>{},hofShowStart:()=>{},hofDrawMain:()=>{},$:()=>({hidden:true})};
 const api=new Function(...Object.keys(env),helpers+'\n'+query+'\nreturn {HOF,hofLoad,hofSaveCfg,hofRefresh,hofLoadLastWeek,hofForget};')(...Object.values(env));
 function cls(code,local=env.COIN.classId){env.COIN.classId=local;api.HOF.cfg={code};api.hofSaveCfg();}
 api.hofLoad();
 return {...api,cls,requests,storage,messages};
}
test('delayed A board response cannot overwrite B or its cache',async()=>{
 const h=harness(true);h.cls('A','A');const a=h.hofRefresh();h.cls('B','B');const b=h.hofRefresh();
 h.requests[1].resolve({rank:'B'});await b;h.requests[0].resolve({rank:'A'});await a;
 assert.equal(h.HOF.board.rank,'B');assert.equal(JSON.parse(h.storage.get('hof-board')).board.rank,'B');
});
test('old no_class response never unlinks new class',async()=>{
 const h=harness(true);h.cls('A','A');const a=h.hofRefresh();h.cls('B','B');
 h.requests[0].resolve({error:'no_class'});await a;assert.equal(h.HOF.cfg.code,'B');assert.equal(h.messages.length,0);
});
test('same class requests arriving in reverse order keep newest response',async()=>{
 const h=harness();h.cls('A');const a=h.hofRefresh(),b=h.hofRefresh();
 h.requests[1].resolve({n:2});await b;h.requests[0].resolve({n:1});await a;assert.equal(h.HOF.board.n,2);
});
test('A to B to A discards old weekly request, including stale errors',async()=>{
 const h=harness(true);h.cls('A','A');const a=h.hofLoadLastWeek(true);const e=h.hofLoadLastWeek(true);
 h.cls('B','B');h.cls('A','A');h.requests[0].resolve({rows:[{old:true}]});h.requests[1].reject(Error('old failure'));
 assert.equal(await a,null);assert.equal(await e,null);assert.equal(h.HOF.last,null);assert.equal(h.HOF.online,true);
});
test('legacy board cache is not trusted; pending records remain intact',()=>{
 const pending=[{code:'A',game:'hockey',seat:1}];const h=harness(false,{hof:JSON.stringify({code:'B'}),'hof-board':JSON.stringify({rank:'A'}),'hof-pending':JSON.stringify(pending)});
 assert.equal(h.HOF.board,null);assert.deepEqual(h.HOF.pending,pending);
});
test('current tagged standalone cache can be used, embed cache waits for roster',()=>{
 const initial={hof:JSON.stringify({code:'B'}),'hof-board':JSON.stringify({scope:JSON.stringify(['','B']),board:{rank:'B'}})};
 assert.equal(harness(false,initial).HOF.board.rank,'B');assert.equal(harness(true,initial).HOF.board,null);
});
