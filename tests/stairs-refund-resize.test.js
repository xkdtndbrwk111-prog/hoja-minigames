const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('src/js/stairs.js','utf8');
const bundled=fs.readFileSync('index.html','utf8');
const startMarker='  function stResize(){';
const endMarker='  let stObserver=null;';
const section=text=>{
  const begin=text.indexOf(startMarker),end=text.indexOf(endMarker,begin);
  assert.ok(begin>=0&&end>begin,'stairs resize function missing');
  return text.slice(begin,end);
};

test('stairs canvas backing height follows refund strip appearing and disappearing',()=>{
  const rect={width:1280,height:720};
  let paints=0,resizes=0;
  const canvas={style:{},_width:0,_height:0};
  Object.defineProperties(canvas,{
    width:{get(){return this._width},set(value){this._width=value;resizes++;}},
    height:{get(){return this._height},set(value){this._height=value;resizes++;}}
  });
  const ST={on:true,W:0,H:0};
  const context={ST,stCanvas:canvas,$:()=>({getBoundingClientRect:()=>rect}),
    window:{devicePixelRatio:1},performance:{now:()=>10},stDraw:()=>{paints++},Math};
  vm.runInNewContext(section(source),context);
  const check=height=>{
    rect.height=height;
    context.stResize();
    assert.equal(canvas.width,1280);
    assert.equal(canvas.height,height,'canvas must not retain previous backing height');
    assert.equal(canvas.style.height,height+'px');
    assert.equal(ST.H,Math.round(1920*height/1280));
  };
  check(720);           // Full game area
  check(670);           // Pre-start refund strip reserves bottom space
  check(720);           // Start hides refund strip: bottom controls fully return
  const count=resizes;
  check(720);           // No redundant bitmap reallocations
  assert.equal(resizes,count);
  assert.equal(paints,4);
});

test('built index.html has identical stair canvas resize logic',()=>{
  assert.equal(section(bundled),section(source));
  assert.match(bundled,/body\.hoja-refund-ready #app\{height:calc\(100dvh - var\(--hoja-refund-height\)\)/);
});
