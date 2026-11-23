const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const src=fs.readFileSync('src/js/stairs.js','utf8');
const built=fs.readFileSync('index.html','utf8');
const start='  function stMenuBounds(){';
const end='  function stDraw(now,dt){';
function menuFn(text){
  const a=text.indexOf(start),b=text.indexOf(end,a);
  assert.ok(a>=0&&b>a,'menu bounds helper must exist');
  return text.slice(a,b);
}

test('all stair modes put menu directly below the clock, safely away from turn/climb controls',()=>{
  for(const height of [360,540,720,812,1080,1440,2160]){
    const ST={W:1920,H:height};
    const c=vm.createContext({ST,Math});
    vm.runInContext(menuFn(src),c);
    const m=vm.runInContext('stMenuBounds()',c);
    const plateBottom=height*.3+32;
    const controlTop=height-Math.min(250,height*.23)-14;
    assert.equal(m.w,130);
    assert.equal(m.h,42);
    assert.equal(m.x,895,'centered horizontally');
    assert.equal(m.y,plateBottom+18,'menu directly beneath timer');
    assert.ok(m.y>plateBottom,'timer and menu do not overlap');
    assert.ok(m.y+m.h+16<controlTop,'menu and controls have physical separation');
  }
});

test('menu is drawn and tapped at the same moved position and never at the bottom',()=>{
  assert.match(src,/const \{x:mx,y:my,w:mw,h:mh\}=stMenuBounds\(\)/);
  assert.match(src,/g\.roundRect\(mx,my,mw,mh,10\)/);
  assert.match(src,/key:'menu',x:mx-6,y:my-6,w:mw\+12,h:mh\+12/);
  assert.doesNotMatch(src,/my=ST\.H-48/);
});

test('generated game HTML contains the exact same stairs menu geometry',()=>{
  assert.equal(menuFn(built),menuFn(src));
  assert.match(built,/const \{x:mx,y:my,w:mw,h:mh\}=stMenuBounds\(\)/);
});
