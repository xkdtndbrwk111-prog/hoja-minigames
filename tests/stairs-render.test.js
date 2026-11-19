const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('src/js/stairs.js','utf8'),start=s.indexOf('  const stPortraitAnchors='),end=s.indexOf('  function stDrawColumn(',start);
assert.ok(start>=0&&end>start);
const c=vm.createContext({});vm.runInContext(s.slice(start,end),c);
test('actual image alpha anchor ignores transparent margin and faint edge',()=>{
 const w=10,h=10,data=new Uint8Array(w*h*4);
 for(let y=1;y<=7;y++)for(let x=2;x<=5;x++)data[(y*w+x)*4+3]=255;
 data[(9*w+9)*4+3]=8;c.data=data;
 const a=vm.runInContext('stAlphaAnchor(data,10,10)',c);
 assert.equal(a.x,.4);assert.equal(a.y,.8);
 for(const size of [36,90,158])assert.ok(Math.abs(-size*a.y+size*.8)<1e-9);
});
test('record draw uses outlined text only, no box and no other lane',()=>{
 const calls=[];c.g={save(){},restore(){},strokeText(...args){calls.push(['stroke',...args])},fillText(...args){calls.push(['fill',...args])}};
 vm.runInContext("stDrawRecord(g,{text:'지난 기록',year:true},25,110,30,50,50,0,400)",c);
 assert.equal(calls.length,2);assert.equal(calls[1][1],'지난 기록 25층');assert.equal(calls[1][2],143);assert.ok(calls[1][4]<=184);
 assert.match(s,/g.translate\(cx,feet\)/);assert.match(s,/g.drawImage\(im,-size\*a.x,-size\*a.y,size,size\)/);
});
