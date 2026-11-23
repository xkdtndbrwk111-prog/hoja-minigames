const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),{chromium}=require('playwright');
let html=fs.readFileSync('index.html','utf8');
const anchor='  syncMode();\n  tournamentInit();';
assert.ok(html.includes(anchor),'bootstrap marker missing');
html=html.replace(anchor,anchor+`
  window.__bakeryUpgradeTest={
    start(mode){shopStage=mode;enterShop();SH.phase='day';SH.time=0;},
    three(){
      SH.co.bags=Array.from({length:3},(_,i)=>({t:{id:1000+i,face:'HOJA'},due:1000+500*i,paid:2000+500*i,change:1000,opts:[500,1000,1500],shake:0}));
      shDraw(performance.now(),0);
      const answers=SH.hits.filter(h=>/^o100[0-2]_/.test(h.key));
      const upgrade=SH.hits.find(h=>h.key.startsWith('coUpgrade-'));
      const all=SH.hits;
      return {answers,upgrade,all,meta:{money:SH.money,earned:SH.earned,offer:SH.co.offer?.id,slots:SH.co.bags.length}};
    },
    buy(){
      SH.money=20000;SH.earned=35000;
      const offer=SH.co.offer,slot=SH.co.offerSlot,before=SH.money,earned=SH.earned;
      shCoBuy(offer.id,slot);const pending=SH.money;
      shCoBuy(offer.id,slot);
      const out={offer:offer.id,price:shCoPrice(offer),before,pending,after:SH.money,earnedBefore:earned,earnedAfter:SH.earned,bought:SH.co.bought,changed:!!SH.co.up[offer.id]};
      shDraw(performance.now(),0);return out;
    }
  };`);
const server=http.createServer((q,r)=>{if(q.url.startsWith('/sw.js')){r.statusCode=404;return r.end()}r.setHeader('Content-Type','text/html; charset=utf-8');r.end(html)});
(async()=>{
 let browser;await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/?mode=board#debug');
  await page.waitForFunction(()=>window.__bakeryUpgradeTest);
  await page.evaluate(()=>window.__bakeryUpgradeTest.start('co4'));
  for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});
    const state=await page.evaluate(()=>window.__bakeryUpgradeTest.three());
    assert.equal(state.answers.length,9,JSON.stringify({width,height,issue:'must keep all nine cashier answer buttons',state}));
    assert.ok(state.upgrade,JSON.stringify({width,height,issue:'offer must be visible and purchasable from start'}));
    const bottom=Math.max(...state.answers.map(h=>h.y+h.h));
    assert.ok(bottom+8<state.upgrade.y-8,JSON.stringify({width,height,issue:'upgrade must not cover cashier answers',bottom,offer:state.upgrade}));
    assert.ok(state.upgrade.x>1400&&state.upgrade.y>500,JSON.stringify(state.upgrade));
    assert.equal(state.meta.slots,3);
    console.log('PASS 3 complete cashier cards and 9 answer buttons remain unobscured with rotating upgrade offer',width,height);
  }
  const purchase=await page.evaluate(()=>window.__bakeryUpgradeTest.buy());
  assert.equal(purchase.before,purchase.pending,'first touch only arms confirmation');
  assert.equal(purchase.after,purchase.before-purchase.price,'second touch deducts exact cost');
  assert.equal(purchase.earnedAfter,purchase.earnedBefore,'upgrade spending cannot alter team cumulative sales/star score');
  assert.ok(purchase.bought&&purchase.changed);
  console.log('PASS cooperative team-money spending preserves earned and upgrades apply immediately',JSON.stringify(purchase));
  await page.evaluate(()=>window.__bakeryUpgradeTest.start('co2'));
  const two=await page.evaluate(()=>window.__bakeryUpgradeTest.three());
  assert.equal(two.answers.length,9);assert.ok(two.upgrade,'two-player cooperation gets identical cashier upgrade offer');
  console.log('PASS 2P cooperation has the same 9 calculation choices and upgrade footer');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
