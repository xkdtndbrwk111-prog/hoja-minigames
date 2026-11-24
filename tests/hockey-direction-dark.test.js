const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('src/js/hockey.js','utf8');
const start=s.indexOf('  function fieldRate('),end=s.indexOf('  // The second puck',start);
const c=vm.createContext({Math,W:1200,SLOW_OWN:.45,SLOW_FOE:1.5,slowField:{side:0,time:8},darkTime:8,darkSide:0});
vm.runInContext(s.slice(start,end),c);
test('direction, reversal, vertical and expiry for both players',()=>{
 for(const side of [0,1]){
  c.slowField={side,time:8};
  const forward=side===0?300:-300;
  assert.equal(c.fieldRate(forward),1.5);
  assert.equal(c.fieldRate(-forward),.45);
  assert.equal(c.fieldRate(0),1);
  assert.equal(c.fieldRate(.001),1);
  c.slowField.time=0;assert.equal(c.fieldRate(forward),1);
 }
});
test('darkness uses puck centre and restores at boundary or expiry',()=>{
 for(const side of [0,1]){
  c.darkSide=side;c.darkTime=8;
  assert.equal(c.puckBrightness(100),side===0?.5:1);
  assert.equal(c.puckBrightness(600),side===1?.5:1);
  assert.equal(c.puckBrightness(1100),side===1?.5:1);
  c.darkTime=0;assert.equal(c.puckBrightness(100),1);assert.equal(c.puckBrightness(1100),1);
 }
});
test('all puck types use directional rate',()=>{
 for(const name of ['puck','b','g'])assert.ok(s.includes('fieldRate('+name+'.vx)'));
});
