const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bubble=fs.readFileSync('src/js/bubble.js','utf8');
const tournament=fs.readFileSync('src/js/tournament.js','utf8');
const selection=fs.readFileSync('src/js/selection.js','utf8');
test('Bubble catalog exposes exactly four stages and defaults to standard',()=>{
 const c=vm.createContext({});vm.runInContext(bubble.slice(bubble.indexOf('  const B_STAGES='),bubble.indexOf('  const B_R=')),c);
 const stages=JSON.parse(vm.runInContext('JSON.stringify(B_STAGES)',c));
 assert.deepEqual(stages.map(s=>s.id),['std','fast','rock','bomb']);
 assert.equal(stages[0].colors,4);
 assert.match(bubble,/B_STAGES\.find\(s=>s\.id===bubbleStage\)\|\|B_STAGES\[0\]/);
 assert.match(selection,/all:B_STAGES/);
 assert.match(tournament,/\['bubble','퍼즐버블',B_STAGES\]/);
});
test('saved retired stage remains resumable without changing brackets',()=>{
 const old={game:'bubble',stage:'easy',mode:'normal',version:2,players:[1,2],rounds:[[{a:1,b:2}]],completed:0};
 const other={...old,game:'other'};
 const c=vm.createContext({COIN:{classId:'x'},tmLoadAll:()=>[old,other],tmGame:id=>({stages:[{id:id==='bubble'?'std':'easy'}]})});
 vm.runInContext(tournament.slice(tournament.indexOf('  function tmSavedList('),tournament.indexOf('  function tmRoster(')),c);
 assert.equal(vm.runInContext('tmSavedList().length',c),2);
 assert.equal(old.stage,'std');assert.equal(other.stage,'easy');
 assert.deepEqual(old.rounds,[[{a:1,b:2}]]);assert.equal(old.completed,0);
});
