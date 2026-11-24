const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/js/hall-of-fame.js','utf8');
const code=src.slice(src.indexOf('  const WC='),src.indexOf('  /* Links carry the names'));
function env(){
 const HOF={cfg:{code:'TEST',names:['A','B','A']},viewKey:'test',players:[1,2],playerNames:['A','B']};
 const el=()=>({textContent:'',classList:{toggle(k,v){this[k]=v}}});
 const names=[el(),el()],panels=[el(),el()];
 const c=vm.createContext({HOF,HOF_MAX:40,currentGame:'bubble',aiLevel:0,PARTY_GAMES:{},epoch:1,stale:false,rows:[{seat:1}],names,panels,
 gamePlayerName:i=>HOF.playerNames[i]||((i+1)+'P'),hofViewScope:()=>c.epoch,hofScopeCurrent:e=>e===c.epoch,hofQrStale:()=>c.stale,
 hofChampion:rows=>({seats:rows.map(r=>r.seat)}),hofRpc:async()=>({periods:{week:c.rows}})});
 vm.runInContext(code,c);
 return {c,HOF,names,panels,run:()=>vm.runInContext('var pending=wcStart();wcBind(names[0],0,panels[0]);wcBind(names[1],1,panels[1]);pending',c)};
}
test('weekly champion follows registered seat, side changes, and same-name students',async()=>{
 const {c,HOF,names,panels,run}=env();await run();
 assert.equal(names[0].textContent,'챔피언 A');assert.equal(panels[0].classList['wc-panel'],true);assert.equal(names[1].textContent,'B');
 HOF.players=[2,1];HOF.playerNames=['B','A'];await run();assert.equal(names[1].textContent,'챔피언 A');
 HOF.players=[3,2];HOF.playerNames=['A','B'];await run();assert.equal(names[0].textContent,'A');
});
test('ties, guest, AI, empty, non-HOF mode and week expiry',async()=>{
 const {c,HOF,names,run}=env();c.rows=[{seat:1},{seat:2}];await run();assert.equal(names[1].textContent,'챔피언 B');
 c.aiLevel=1;await run();assert.equal(names[1].textContent,'B');
 HOF.players=[null,2];await run();assert.equal(names[0].textContent,'A');
 c.aiLevel=0;c.rows=[];await run();assert.equal(names[1].textContent,'B');
 c.rows=[{seat:2}];c.currentGame='other';await run();assert.equal(names[1].textContent,'B');
 c.currentGame='bubble';await run();assert.equal(vm.runInContext('WC.expires=0;wcIs(1)',c),false);
});
test('stale class, roster, match, and failed request do not apply old badge',async()=>{
 for(const mode of ['class','roster','rematch','offline']){
 const {c,HOF,names,run}=env();let resolve,reject;c.hofRpc=()=>new Promise((a,b)=>{resolve=a;reject=b;});const pending=run();
 if(mode==='class')c.epoch++;if(mode==='roster')HOF.cfg.names=['C','B'];if(mode==='rematch')vm.runInContext('wcInvalidate()',c);
 if(mode==='offline')reject(Error('offline'));else resolve({periods:{week:[{seat:1}]}});
 await pending;assert.equal(names[0].classList['wc-name'],false,mode);
 }
});
test('all Hall of Fame game families wired to the shared presentation',()=>{
 const targets={'hockey':'resetMatch','volleyball':'vbNew','bubble':'bNewMatch','othello':'oNewMatch','gomoku':'gNewMatch','tictactoe':'tNewMatch','germ':'xNewMatch','stairs':'stNew','bakery':'shNewGame','jump':'setMode','party/page1':'paStart'};
 for(const [file,fn] of Object.entries(targets)){const s=fs.readFileSync('src/js/'+file+'.js','utf8');assert.ok(s.includes('wcStart()'),file);assert.ok(/wcBind\(|wcName\(/.test(s),file);assert.ok(!/streak\.count>=2|const champ=streak/.test(s),file);}
 assert.ok(fs.readFileSync('src/js/dance.js','utf8').includes('wcBind(left,0'));
 assert.ok(!fs.readFileSync('src/js/selection.js','utf8').includes('도전자 나와라'));
});
