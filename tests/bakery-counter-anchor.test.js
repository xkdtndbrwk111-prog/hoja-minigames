const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const src=fs.readFileSync('src/js/bakery.js','utf8');
const bundle=fs.readFileSync('index.html','utf8');
const start='  function shCustomerPortraitBox(';
const end='  function shDrawCustomers(g,now){';
const section=text=>{
  const a=text.indexOf(start),b=text.indexOf(end,a);
  assert.ok(a>=0&&b>a,'customer portrait placement helper missing');
  return text.slice(a,b);
};
test('all moods share a fixed horizontal character anchor and seat visible hand on counter',()=>{
  const neutral={name:'neutral'},surprised={name:'surprised'};
  const anchors=new Map([[neutral,{x:.48,y:.86}],[surprised,{x:.62,y:.94}]]);
  const context={stPortraitAnchor:im=>anchors.get(im),Math};
  vm.runInNewContext(section(src),context);
  for(const tz of [180,245,261,367,520]){
    for(const cx of [240,720,1200,1680]){
      const size=tz*.66;
      context.sz=size;context.cx=cx;context.tz=tz;context.neutral=neutral;context.surprised=surprised;
      const normal=vm.runInNewContext('shCustomerPortraitBox(neutral,neutral,cx,tz,sz)',context);
      const changed=vm.runInNewContext('shCustomerPortraitBox(surprised,neutral,cx,tz,sz)',context);
      const contact=tz-34+Math.min(8,tz*.022);
      assert.ok(Math.abs(normal.x-changed.x)<1e-9,'mood changes must not move character sideways');
      assert.ok(Math.abs(normal.y+size*.86-contact)<1e-8);
      assert.ok(Math.abs(changed.y+size*.94-contact)<1e-8);
      assert.ok(normal.y>0&&changed.y>0,'heads remain on screen');
      assert.ok(contact>=tz-34&&contact<tz-25,'hands overlap the TOP of the striped awning rather than the lower wood counter');
    }
  }
});
test('shop canvas draws customers above the counter background and uses actual image anchors',()=>{
  assert.match(src,/g\.drawImage\(SH\.bg,0,0\)/);
  assert.ok(src.indexOf('shDrawCustomers(g,now);')>src.indexOf('g.drawImage(SH.bg,0,0)'));
  assert.match(src,/const box=shCustomerPortraitBox\(im,neutral,cx,TZ,size,motionY\)/);
  assert.match(src,/g\.drawImage\(im,box\.x,box\.y,box\.w,box\.h\)/);
  assert.doesNotMatch(src,/TZ-46-size\+6-off\*-.2/);
});
test('generated HTML matches the source anchor and drawing code',()=>{
  assert.equal(section(bundle),section(src));
  assert.match(bundle,/const box=shCustomerPortraitBox\(im,neutral,cx,TZ,size,motionY\)/);
});
