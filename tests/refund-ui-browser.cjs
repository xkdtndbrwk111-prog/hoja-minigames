const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),{chromium}=require('playwright');
const students=Array.from({length:4},(_,i)=>({id:'s'+i,name:'학생 '+i,number:i+1,balance:10}));
const parentHtml='<!doctype html><style>body{margin:0}iframe{width:100vw;height:100vh;border:0}</style><iframe src="http://127.0.0.1:17440/?mode=board&embed=dashboard#debug"></iframe><script>const students='+JSON.stringify(students)+';window.addEventListener("message",e=>{if(e.origin!=="http://127.0.0.1:17440")return;const m=e.data;const reply=x=>e.source.postMessage({...x,sessionId:m.sessionId},e.origin);if(m.type==="hoja-ready")reply({type:"hoja-roster",version:4,readyReq:m.readyReq,classId:"test",className:"시험반",enabled:true,chosen:true,students,everyone:students,floor:-3,coinUnit:2});if(m.type==="hoja-coin-spend")reply({type:"hoja-coin-result",ok:true,req:m.req,charge:m.txId,classId:m.classId,price:2,balances:{}});if(m.type==="hoja-coin-refund")reply({type:"hoja-refund-result",ok:true,charge:m.charge,classId:m.classId,balances:{}});});</script>';
const host=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(parentHtml)});
let html=fs.readFileSync('index.html','utf8');
// Instrument the local test copy only; production debug/API are unchanged.
const anchor='  syncMode();\n  tournamentInit();';assert.ok(html.includes(anchor));
html=html.replace(anchor,anchor+'\n window.__refundTest={ready(){round={charge:"fixture",t0:null,freeRetry:false};syncRefundControl()},begin:roundBegin,eligible:roundRefundable,clear(){round=null;syncRefundControl()},open(id){currentGame=id;launchSelected()},leave:refundExitToMenu};');
const game=http.createServer((q,r)=>{if(q.url.startsWith('/sw.js')){r.statusCode=404;return r.end()}r.setHeader('Content-Type','text/html; charset=utf-8');r.end(html)});
const listen=(s,p)=>new Promise(resolve=>s.listen(p,'127.0.0.1',resolve));
(async()=>{let browser;await listen(host,17439);await listen(game,17440);try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const p=await browser.newPage({viewport:{width:1920,height:1080}});await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
 await p.goto('http://127.0.0.1:17439/');const f=p.frameLocator('iframe');await f.locator('#hojaRefundButton').waitFor({state:'attached'});
 const frame=p.frames().find(f=>f.url().includes(':17440/'));await frame.waitForFunction(()=>window.__refundTest);
 for(const size of [{width:1920,height:1080},{width:1366,height:768},{width:1024,height:768}]){
  await p.setViewportSize(size);
  for(const id of ['hockey','othello','gomoku','bubble','shop','stairs','volley','ttt','germ','dance']){
   await frame.evaluate(id=>{window.__refundTest.clear();window.__refundTest.leave();window.__refundTest.ready();window.__refundTest.open(id)},id);
   // Some games begin immediately, so no button is correct in that case.
   const before=await frame.evaluate(()=>{
    const b=document.getElementById('hojaRefundButton'),bar=b.parentElement,a=document.getElementById('app'),r=b.getBoundingClientRect(),ar=a.getBoundingClientRect(),br=bar.getBoundingClientRect();
    return {hidden:bar.hidden,appBottom:ar.bottom,barTop:br.top,buttonTop:r.top,buttonBottom:r.bottom,viewport:innerHeight,hit:bar.hidden||document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b};
   });
   if(!before.hidden){assert.ok(before.barTop>=before.appBottom-.5&&before.buttonTop>=before.barTop&&before.buttonBottom<=before.viewport&&before.hit,JSON.stringify({id,before}));assert.ok(before.buttonTop>=before.viewport*.34);}
   const after=await frame.evaluate(()=>{window.__refundTest.begin();return {hidden:document.getElementById('hojaRefundBar').hidden,app:document.getElementById('app').getBoundingClientRect().height,height:innerHeight,eligible:window.__refundTest.eligible()}});
   assert.equal(after.hidden,true,id);assert.ok(Math.abs(after.app-after.height)<2,id);assert.equal(after.eligible,true,id);
  }
 }
 await frame.evaluate(()=>{window.__refundTest.clear();window.__refundTest.leave();window.__hoja.bakery.setStage('coop4');window.__refundTest.ready();window.__refundTest.open('shop')});
 assert.equal(await frame.locator('#shopScreen').isVisible(),true);
 console.log('PASS bottom reserved refund strip, no overlap, synchronous hide and preserved refund eligibility across games and screen sizes');
}finally{await browser?.close();host.close();game.close()}})().catch(e=>{console.error(e);process.exit(1)});
