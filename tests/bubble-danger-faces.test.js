const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('src/js/bubble.js','utf8');
const a=s.indexOf('  function bDrawBall('),b=s.indexOf('  function bText(',a);
test('danger selects surprised sprite per draw and neutral returns; special balls unchanged',()=>{
 const BB={sprites:[null,'normal',null,null,null,null,'rock','bomb'],dangerSprites:[null,'surprised']},draws=[];
 const g={drawImage(sprite){draws.push(sprite)}};
 const c=vm.createContext({BB,B_D:80,g});vm.runInContext(s.slice(a,b),c);
 vm.runInContext('bDrawBall(g,1,0,0,1,1,true);bDrawBall(g,1,0,0);bDrawBall(g,6,0,0,1,1,true);bDrawBall(g,7,0,0,1,1,true)',c);
 assert.deepEqual(draws,['surprised','normal','rock','bomb']);assert.equal(g.globalAlpha,1);
});
test('five character assets and existing danger threshold wired',()=>{
 const core=fs.readFileSync('src/js/core.js','utf8');
 for(const id of ['hoja','nahansang','sumaksae','muryeong_king','gwanggaeto_king'])assert.ok(core.includes(id+'_02_surprised.webp'));
 assert.ok(s.includes('danger=low>=B_DEAD-2'));
 assert.ok(s.includes('bY(r)-slide,1,1,danger'));
});
