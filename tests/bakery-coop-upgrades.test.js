const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/js/bakery.js','utf8');
const bundle=fs.readFileSync('index.html','utf8');
const start='  // Cooperative-only upgrades:';
const end='  const SH_SP={';
const a=src.indexOf(start),b=src.indexOf(end,a);assert.ok(a>=0&&b>a);
const code=src.slice(a,b);
function fixture(people=4){
  const SH={people,time:0,money:30000,phase:'day',W:1920,H:1080,shops:[{molds:Array.from({length:4},()=>({state:0})),tickets:[{done:false,patience:30,maxP:60}]}],
    co:{up:{},bag:[],offer:null,offerSlot:0,lastOffer:null,bought:false,confirm:null}};
  const logs=[],context=vm.createContext({SH,sfx:(...args)=>logs.push(args),shFloat:()=>{},Math});
  vm.runInContext(code,context);
  return {SH,logs,context,call:(fn)=>vm.runInContext(fn,context)};
}
test('only six cooperative upgrades are present, not solo price or character special',()=>{
  const t=fixture(),ids=Array.from(t.call('SH_CO_UP.map(u=>u.id)'));
  assert.deepEqual(ids,['molds','fire','patience','tray','gold','burn']);
  assert.equal(t.call('SH_CO_UP.length'),6);
  const two=fixture(2);assert.equal(two.call("shCoPrice(SH_CO_UP.find(u=>u.id==='molds'))"),2400);
  assert.equal(t.call("shCoPrice(SH_CO_UP.find(u=>u.id==='molds'))"),3000);
});
test('one random offer at a time, exactly one refresh per ten played seconds',()=>{
  const t=fixture();t.call('shCoOfferNext()');
  const first=t.SH.co.offer.id;
  t.SH.time=9.95;t.call('shCoOfferTick()');assert.equal(t.SH.co.offer.id,first);
  t.SH.time=10;t.call('shCoOfferTick()');assert.notEqual(t.SH.co.offer.id,first);
  const second=t.SH.co.offer.id;
  t.SH.time=10.5;t.call('shCoOfferTick()');assert.equal(t.SH.co.offer.id,second);
  t.SH.time=11;t.call('shCoOfferTick()');assert.equal(t.SH.co.offer.id,second);
  const seen=new Set([first,second]);
  for(let sec=20;sec<60;sec+=10){t.SH.time=sec;t.call('shCoOfferTick()');seen.add(t.SH.co.offer.id);}
  assert.equal(seen.size,6,'all six items offered during first 60 seconds before repeats');
  t.SH.time=60;t.call('shCoOfferTick()');assert.notEqual(t.SH.co.offer.id,[...seen][5]);
});
test('purchase requires two taps, exact slot, enough team cash and is never double-charged',()=>{
  const t=fixture();t.call('shCoOfferNext()');
  t.SH.co.offer=t.call("SH_CO_UP.find(u=>u.id==='molds')");
  t.SH.co.bought=false;
  t.SH.co.confirm=null;
  t.call("shCoBuy('molds',0)");assert.equal(t.SH.money,30000);
  assert.equal(t.SH.co.confirm.id,'molds');
  t.call("shCoBuy('molds',1)");assert.equal(t.SH.money,30000,'stale slot rejected');
  t.call("shCoBuy('molds',0)");assert.equal(t.SH.money,27000);
  assert.equal(t.SH.shops[0].molds.length,5);
  assert.equal(t.SH.co.up.molds,1);
  t.call("shCoBuy('molds',0)");assert.equal(t.SH.money,27000,'second purchase rejected');
  t.SH.money=500;
  t.SH.co.offer=t.call("SH_CO_UP.find(u=>u.id==='burn')");t.SH.co.bought=false;
  t.call("shCoBuy('burn',0)");assert.equal(t.SH.money,500);
  assert.equal(t.SH.co.up.burn,undefined);
});
test('two-second confirmation expires, 10-second offer change cancels pending purchase',()=>{
  const t=fixture();t.call('shCoOfferNext()');const id=t.SH.co.offer.id;
  t.call("shCoBuy(SH.co.offer.id,0)");assert.equal(t.SH.co.confirm.id,id);
  t.SH.time=2.1;t.call("shCoBuy(SH.co.offer.id,0)");assert.equal(t.SH.money,30000);
  t.SH.time=10;t.call('shCoOfferTick()');
  assert.equal(t.SH.co.confirm,null);
  t.call('shCoBuy(SH.co.offer.id,0)');assert.equal(t.SH.money,30000);
});
test('upgrades apply to one match only; bonus patience extends existing wait',()=>{
  const t=fixture();t.call('shCoOfferNext()');
  t.SH.co.offer=t.call("SH_CO_UP.find(u=>u.id==='patience')");t.SH.co.bought=false;
  t.call("shCoBuy('patience',0)");t.call("shCoBuy('patience',0)");
  assert.ok(Math.abs(t.SH.shops[0].tickets[0].patience-36)<1e-8);
  assert.ok(Math.abs(t.SH.shops[0].tickets[0].maxP-72)<1e-8);
});
test('generated HTML contains the identical rotating offer logic',()=>{
  assert.ok(bundle.includes(code));
  assert.match(src,/shDrawCoUpgradeFooter\(g\)/);
  assert.match(src,/if\(SH\.co\)shCoOfferTick\(\)/);
  assert.match(src,/SH\.money-=price/);
  assert.match(src,/if\(SH\.time>=SH\.dayLen\)shEndRound\(\)/);
});
