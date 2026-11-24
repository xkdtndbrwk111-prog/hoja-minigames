const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('src/js/bubble.js','utf8');
const code=s.slice(s.indexOf('  function bSetChampion('),s.indexOf('  function bNewMatch('));
function env(){
 const els={};for(let i=0;i<2;i++){els['bName'+i]={textContent:''};els['bTeam'+i]={classList:{champ:false,toggle(k,v){assert.equal(k,'weekly-champion');this.champ=v;}}};}
 const HOF={cfg:{code:'TEST',names:['A','B','A']},players:[1,2],playerNames:['A','B']};
 const c=vm.createContext({HOF,HOF_MAX:40,BB:{on:true,token:1},aiLevel:0,els,
   epoch:1,stale:false,rows:[{seat:1}],request:null,
   $:id=>els[id],gamePlayerName:i=>HOF.playerNames[i]||((i+1)+'P'),
   hofViewScope:()=>c.epoch,hofScopeCurrent:e=>e===c.epoch,hofQrStale:()=>c.stale,
   hofChampion:rows=>({seats:rows.map(r=>r.seat)}),
   hofRpc:async (rpc,args)=>{c.request=[rpc,JSON.stringify(args)];return {periods:{week:c.rows}};}});
 vm.runInContext(code,c);
 return {c,els,HOF,run:()=>vm.runInContext('bSetChampion(0,false);bSetChampion(1,false);bRefreshChampions()',c)};
}
test('weekly champion nameplate follows roster seat, not character, side or matching display name',async()=>{
 const {c,els,HOF,run}=env();await run();
 assert.equal(els.bName0.textContent,'👑 챔피언 A');assert.equal(els.bTeam0.classList.champ,true);
 assert.equal(els.bName1.textContent,'B');assert.equal(els.bTeam1.classList.champ,false);
 HOF.players=[2,1];HOF.playerNames=['B','A'];await run();assert.equal(els.bTeam0.classList.champ,false);assert.equal(els.bTeam1.classList.champ,true);
 HOF.players=[3,2];HOF.playerNames=['A','B'];await run();assert.equal(els.bTeam0.classList.champ,false);
 assert.deepEqual(c.request,['hof_board','{"p_code":"TEST"}']);
});
test('cochampions, guests, AI and empty records',async()=>{
 const {c,els,HOF,run}=env();c.rows=[{seat:1},{seat:2}];await run();assert.equal(els.bTeam0.classList.champ,true);assert.equal(els.bTeam1.classList.champ,true);
 c.aiLevel=1;await run();assert.equal(els.bTeam1.classList.champ,false);
 HOF.players=[null,2];await run();assert.equal(els.bTeam0.classList.champ,false);
 c.aiLevel=0;c.rows=[];await run();assert.equal(els.bTeam1.classList.champ,false);
});
test('stale class, replaced roster, rematch and offline never apply old champion',async()=>{
 for(const mode of ['class','roster','rematch','leave','offline']){
   const {c,els,HOF,run}=env();let resolve,reject;
   c.hofRpc=()=>new Promise((a,b)=>{resolve=a;reject=b;});
   const pending=run();
   if(mode==='class')c.epoch++;
   if(mode==='roster')HOF.cfg.names=['C','B'];
   if(mode==='rematch')c.BB.token++;
   if(mode==='leave')c.BB.on=false;
   if(mode==='offline')reject(Error('offline'));else resolve({periods:{week:[{seat:1}]}});
   await pending;assert.equal(els.bTeam0.classList.champ,false,mode);
 }
});
test('legacy bubble streak removed; selection hint suppressed only for bubble',()=>{
 assert.ok(!/\bstreak\b/.test(s));assert.ok(s.includes('bSetChampion(i,false)'));assert.ok(s.includes('bRefreshChampions();'));
 const selection=fs.readFileSync('src/js/selection.js','utf8');
 assert.ok(selection.includes("currentGame!=='bubble'&&streak.count"));
});
