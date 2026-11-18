// Run the generated page in stock Chrome with a fake local classroom host.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),{spawn}=require('node:child_process');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const students=Array.from({length:21},(_,i)=>({id:'s'+(i+1),name:'학생 '+(i+1),number:i+1,balance:5}));
const parentHtml='<!doctype html><meta charset=utf-8><iframe id="mini" style="width:98vw;height:94vh" src="http://127.0.0.1:17440/?mode=board&embed=dashboard#debug"></iframe><script>window.mock={spends:[],refunds:[],auth:[],pin:true,allow:false};const students='+JSON.stringify(students)+';window.addEventListener("message",e=>{if(e.origin!=="http://127.0.0.1:17440"||e.source!==document.getElementById("mini").contentWindow)return;const m=e.data,reply=x=>e.source.postMessage({...x,sessionId:m.sessionId},e.origin);if(m.type==="hoja-ready")reply({type:"hoja-roster",version:3,readyReq:m.readyReq,classId:"class-test",className:"시험반",enabled:true,chosen:true,students,everyone:students,floor:-3,tournamentV1:true,teacherPinConfigured:mock.pin,hof:null});if(m.type==="hoja-coin-spend"){mock.spends.push(m);reply({type:"hoja-coin-result",ok:true,req:m.req,charge:m.txId,classId:m.classId,price:.5,balances:Object.fromEntries(m.ids.map(id=>[id,4.5]))});}if(m.type==="hoja-coin-refund"){mock.refunds.push(m);reply({type:"hoja-refund-result",ok:true,charge:m.charge,classId:m.classId,balances:{}});}if(m.type==="hoja-tournament-auth"){mock.auth.push(m);reply({type:"hoja-tournament-auth-result",ok:mock.pin&&mock.allow,req:m.req,classId:m.classId,message:"시험 인증 거부"});}});</script>';
const host=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(parentHtml);});
const game=http.createServer((q,r)=>{if(q.url.startsWith('/sw.js')){r.statusCode=404;r.end();return;}r.setHeader('Content-Type','text/html; charset=utf-8');r.end(fs.readFileSync('index.html'));});
const listen=(s,p)=>new Promise((resolve,reject)=>s.once('error',reject).listen(p,'127.0.0.1',resolve));
let driver,session;
async function api(path,method='GET',body){
 const r=await fetch('http://127.0.0.1:9515'+path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const x=await r.json();if(!r.ok||x.value?.error)throw Error(JSON.stringify(x.value));return x.value;
}
async function until(fn,label){for(let i=0;i<100;i++){try{const x=await fn();if(x)return x;}catch{}await wait(150);}throw Error('timeout: '+label);}
async function cmd(path,method='POST',data={}){return api('/session/'+session+path,method,method==='GET'?undefined:data);}
const exec=(script,...args)=>cmd('/execute/sync','POST',{script,args});
const frame=async()=>{const el=await cmd('/element','POST',{using:'css selector',value:'#mini'});await cmd('/frame','POST',{id:el});};
const parent=()=>cmd('/frame/parent');
const click=label=>exec('const b=[...document.querySelectorAll("#tmScreen button")].find(b=>b.textContent.includes(arguments[0])&&!b.disabled);if(!b)return false;b.click();return true;',label);
const confirmClick=async label=>{assert(await exec('const b=[...document.querySelectorAll("#tmScreen button")].find(b=>b.textContent.includes(arguments[0])&&!b.disabled);if(!b)return false;setTimeout(()=>b.click(),50);return true;',label));await until(()=>cmd('/alert/text','GET'),'confirmation alert');await cmd('/alert/accept');};
const shown=()=>exec('const e=document.querySelector("#tmScreen");return e&&!e.hidden?e.innerText:"";');
const text=label=>until(async()=>String(await shown()).includes(label),label);
const pick=(i)=>exec('const e=document.querySelectorAll(".tm-roster button")[arguments[0]];if(!e||e.disabled)return false;e.click();return true;',i);
const selectGame=id=>exec('let e=document.querySelector("select[aria-label=게임]");e.value=arguments[0];e.dispatchEvent(new Event("change"));return e.value;',id);
async function open(){await until(()=>exec('const x=document.getElementById("openTournament");if(!x||document.getElementById("menuScreen").hidden)return false;x.click();return true;'),'menu');await text('일반 토너먼트');}
async function openResume(){await until(()=>exec('const b=document.getElementById("openTournament");if(!b||document.getElementById("menuScreen").hidden)return false;b.click();return true;'),'resume menu');await text('이어하기');}
async function startNormal(n){await until(()=>click('일반 토너먼트'),'normal');await text('대진표 추첨');assert.equal(await selectGame('stairs'),'stairs');assert(await click(n+'인전'));for(let j=0;j<n;j++)assert(await pick(j));assert(await click('대진표 추첨'));await text('경기 시작');}
(async()=>{
 await listen(host,17439);await listen(game,17440);
 driver=spawn('chromedriver',['--port=9515','--allowed-ips=127.0.0.1'],{stdio:['ignore','ignore','inherit']});
 await until(async()=>{const r=await api('/status');return r.ready;},'chromedriver');
 const s=await api('/session','POST',{capabilities:{alwaysMatch:{browserName:'chrome','goog:chromeOptions':{args:['--headless=new','--no-sandbox','--disable-dev-shm-usage','--window-size=1600,1000','--host-resolver-rules=MAP aolfbqfchzipyevtdhdy.supabase.co ~NOTFOUND']}}}});session=s.sessionId;
 await cmd('/url','POST',{url:'http://127.0.0.1:17439/'});await frame();
 await open();await startNormal(8);
 assert.equal(await exec('return document.querySelectorAll(".tm-tree .tm-match").length'),7);
 await confirmClick('환불하고 토너먼트 취소');await text('일반 토너먼트');
 await parent();await until(()=>exec('return mock.refunds.length===1'),'refund');
 assert.deepEqual(await exec('return mock.spends.map(s=>s.ids.length)'),[8]);
 await frame();await startNormal(4);assert(await click('경기 시작'));
 await until(()=>exec('return window.__hoja?.st?.ST.on'),'stairs running');
 // Advance actual game state and invoke the real end condition, not the bracket helper.
 await exec('const s=window.__hoja.st;s.stStep(3);s.ST.players[0].idx=10;s.ST.players[1].idx=1;s.ST.time=s.ST.limit-.1;s.stStep(.2);');
 await text('1/3경기 완료');
 assert.equal(await exec('return document.querySelectorAll(".tm-tree .tm-loser").length'),1);
 assert(await click('저장하고 나가기'));await text('이어하기');
 assert(await click('이어하기'));await text('1/3경기 완료');
 await parent();assert.deepEqual(await exec('return mock.spends.map(s=>s.ids.length)'),[8,4]);
 await frame();
 // A tie must keep the current bracket slot and a later win must advance once.
 const play=async(a,b)=>{assert(await click('경기 시작'));await until(()=>exec('return window.__hoja?.st?.ST.on'),'stairs running');await exec('const s=window.__hoja.st;s.stStep(3);s.ST.players[0].idx=arguments[0];s.ST.players[1].idx=arguments[1];s.ST.time=s.ST.limit-.1;s.stStep(.2);',a,b);};
 await play(5,5);await text('무승부');await text('1/3경기 완료');
 await play(1,10);await text('2/3경기 완료');
 await play(10,1);await text('우승!');
 assert(await click('우승 기록 저장'));await text('일반 토너먼트');
 assert(await click('토너먼트 우승 기록'));await text('무한의 계단');assert(await click('← 토너먼트'));await text('일반 토너먼트');
 await parent();assert.equal(await exec('return mock.spends.length'),2);assert.equal(await exec('return mock.refunds.length'),1);await frame();
 await until(()=>click('교실 월드컵'),'world denied');await parent();await until(()=>exec('return mock.auth.length===1'),'auth request');await wait(300);await frame();
 assert(String(await shown()).includes('일반 토너먼트'));
 await parent();await exec('mock.allow=true;');await frame();
 await until(()=>click('교실 월드컵'),'world authorized');await text('21명 전원 참가');
 assert.equal(await selectGame('stairs'),'stairs');
 assert(await click('대진표 추첨'));await text('21명 · 0/20경기');
 await text('24강 · 예선');
 assert.equal(await exec('return document.querySelectorAll(".tm-tree .tm-match").length'),20);
 assert.equal(await exec('return [...document.querySelectorAll(".tm-tree .tm-match-label")].filter(e=>e.textContent.includes("24강")).length'),5);
 assert(await exec('const a=[...document.querySelectorAll(".tm-tree .tm-match")];return a[0].getBoundingClientRect().top>a.at(-1).getBoundingClientRect().top'));
 const loadSaved=()=>exec('return JSON.parse(localStorage.getItem("hoja-tournament-v1:class-test"))');
 assert(await click('경기 시작'));await until(()=>exec('return window.__hoja?.st?.ST.on'),'stairs running before interruption');
 const active=(await loadSaved()).active;assert(active.faces.length===2);
 await parent();await exec('document.getElementById("mini").src="http://127.0.0.1:17440/?mode=board&embed=dashboard&fresh=crash#debug";');
 await frame();await openResume();
 assert(await click('이어하기'));await text('직전 경기가 중단');
 assert.deepEqual((await loadSaved()).active.faces,active.faces);
 await play(10,1);await text('1/20경기 완료');
 assert.deepEqual((await loadSaved()).faces[active.key+":"+JSON.stringify([(await loadSaved()).journal[0].rounds[0][0].a,(await loadSaved()).journal[0].rounds[0][0].b])],active.faces);
 await confirmClick('이전 경기로 복구');await text('0/20경기 완료');assert.equal((await loadSaved()).refundLocked,true);
 await play(1,10);await text('1/20경기 완료');
 assert(await click('저장하고 나가기'));await text('이어하기');
 await parent();assert.equal(await exec('return mock.spends.length'),2);await exec('mock.allow=false;');await frame();
 await until(()=>click('이어하기'),'world reauth');await parent();await until(()=>exec('return mock.auth.length>=5'),'new auth');await wait(200);await frame();assert(String(await shown()).includes('이어하기'));
 await parent();await exec('mock.allow=true;');await frame();
 await until(()=>click('이어하기'),'resume after denial');await text('1/20경기 완료');
 await confirmClick('토너먼트 종료');await text('일반 토너먼트');
 await until(()=>click('교실 월드컵'),'world dual');await text('21명 전원 참가');
 assert.equal(await selectGame('stairs'),'stairs');
 assert(await exec('const e=[...document.querySelectorAll("select")].find(s=>s.getAttribute("aria-label")==="경기 방식");e.value="dual";return e.value==="dual"'));
 assert(await click('대진표 추첨'));await text('21명 · 0/35경기');
 assert.equal(await exec('return document.querySelectorAll(".tm-group").length'),6);
 await play(10,1);await text('1/35경기 완료');
 assert(await click('저장하고 나가기'));await text('이어하기');
 await parent();assert.deepEqual(await exec('return mock.spends.map(s=>s.ids.length)'),[8,4]);
 console.log('PASS browser: payment/refund, upward bracket, compact 21-player 24 seeds, defeat shading, crash reload and same random character, PIN rollback, 21-player dual group save, tie, champion, no additional spend');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(session)try{await api('/session/'+session,'DELETE')}catch{}if(driver)driver.kill();host.close();game.close();});
