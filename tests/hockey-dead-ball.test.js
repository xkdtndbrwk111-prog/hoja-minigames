const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('src/js/hockey.js','utf8');
const fn=(a,b)=>s.slice(s.indexOf('  function '+a+'('),s.indexOf('  function '+b+'('));
const env=()=>{const c=vm.createContext({Math,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),W:1200,H:600,R:24,MALLET_R:45,midX:600,phase:'playing',serve:{side:0,time:4.5},freeze:0,clock:90,golden:false,shields:[8,8],slowField:{time:8},conquer:{time:8},goalWide:[8,8],walls:[8,8],iceTime:8,cannonWide:-1,shot:{},puck:{x:300,y:300,vx:0,vy:0},mallets:[{x:180,y:300,tx:500,ty:300,r:45,grab:0,hitT:0,big:8,small:0,frozen:0,sticky:8,svx:0,svy:0,id:1},{x:800,y:300,r:45}],aiLevel:0,keepOffLanding(){},clampTarget(){},collideMallet(i){c.hits.push(i);if(c.strike)c.serve=null;},hits:[],strike:false,launchServe(){c.serve=null;c.puck.vx=440;}});vm.runInContext(fn('hockeySweepSolid','collideMallet')+fn('stepPlaying','ejectPuck'),c);return c};
test('serve dead-ball leaves all gameplay clocks and stage effects untouched until strike or automatic release',()=>{
 for(const release of ['strike','auto']){
  const c=env();vm.runInContext('stepPlaying(2);stepMallet(0,.01)',c);
  assert.equal(c.serve.time,2.5);assert.equal(c.clock,90);assert.equal(c.mallets[0].big,8);assert.equal(c.mallets[0].sticky,8);assert.deepEqual(c.shields,[8,8]);assert.equal(c.slowField.time,8);assert.equal(c.conquer.time,8);assert.deepEqual(c.goalWide,[8,8]);assert.deepEqual(c.walls,[8,8]);assert.equal(c.iceTime,8);
  if(release==='strike'){c.strike=true;vm.runInContext('stepPlaying(.01)',c)}else vm.runInContext('stepPlaying(3)',c);
  assert.equal(c.serve,null);assert.equal(c.clock,90);assert.ok(c.hits.every(i=>i===0));
 }
});
test('stationary puck blocks full swept segment, not merely endpoint; sideways movement remains possible',()=>{
 const c=env();const run=x=>vm.runInContext(x,c);
 const a=run('hockeySweepSolid(100,300,500,300,300,300,70,0)');assert.ok(a.blocked&&a.x<=230&&a.x>=229);
 const b=run('hockeySweepSolid(230,300,230,100,300,300,70,0)');assert.equal(b.blocked,false);
 const d=run('hockeySweepSolid(500,300,100,300,300,300,70,1)');assert.ok(d.blocked&&d.x>=370&&d.x<=371);
 const e=run('hockeySweepSolid(300,300,300,300,300,300,70,0)');assert.equal(e.x,230);
});
test('special and impact stop keep mallet out of puck, preserve puck and timers, reset stored swing',()=>{
 for(const phase of ['special','playing']){
  const c=env();c.phase=phase;c.serve=null;c.freeze=phase==='playing'?.05:0;c.mallets[0].x=230;c.mallets[0].tx=490;c.mallets[0].svx=1000;
  vm.runInContext('stepMallet(0,.25)',c);
  assert.ok(c.mallets[0].x<=230);assert.equal(c.mallets[0].svx,0);assert.equal(c.puck.x,300);assert.equal(c.mallets[0].big,8);
 }
});
