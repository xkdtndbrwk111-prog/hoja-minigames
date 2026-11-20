const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),{chromium}=require('playwright');
let html=fs.readFileSync('index.html','utf8');
const anchor='  installGameHeadlineFit();';assert.ok(html.includes(anchor));
html=html.replace(anchor,()=>anchor+'\n  window.__headlineFixture={open(){currentGame="hockey";launchSelected()},goal(){scores=[3,4];showGoalBanner(1)},normal(){scores=[1,0];showGoalBanner(0)},hide:hideGoalBanner,fit:fitGameHeadline};');
const server=http.createServer((q,r)=>{if(q.url.startsWith('/sw.js')){r.statusCode=404;return r.end()}r.setHeader('Content-Type','text/html; charset=utf-8');r.end(html)});
(async()=>{let browser;await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
 await page.goto('http://127.0.0.1:'+server.address().port+'/?mode=board#debug');
 await page.waitForFunction(()=>window.__headlineFixture);
 await page.evaluate(async()=>{await document.fonts.ready;window.__headlineFixture.open()});
 for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[800,600],[1280,400],[640,360]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>window.__headlineFixture.goal());
  await page.waitForTimeout(400);
  const snap=await page.evaluate(()=>{
   const title=document.getElementById('goalText'),b=document.getElementById('goalBanner'),rink=b.parentElement,score=document.getElementById('goalScore'),rect=b.getBoundingClientRect(),r=rink.getBoundingClientRect();
   return {title:title.textContent,score:score.textContent,white:getComputedStyle(title).whiteSpace,sz:parseFloat(getComputedStyle(title).fontSize),sw:title.scrollWidth,w:title.clientWidth,box:[rect.left,rect.right],rink:[r.left,r.right]};
  });
  assert.equal(snap.title,'매치 포인트!');assert.equal(snap.score,'3 : 4');assert.equal(snap.white,'nowrap',JSON.stringify({width,height,snap}));assert.ok(snap.w>0&&snap.sw<=snap.w&&snap.box[0]>=snap.rink[0]-1&&snap.box[1]<=snap.rink[1]+1,JSON.stringify({width,height,snap}));
  console.log('PASS match point',width,height,JSON.stringify(snap));
 }
 await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(300);
 await page.evaluate(()=>window.__headlineFixture.normal());await page.waitForTimeout(400);
 const normal=await page.evaluate(()=>{let el=document.getElementById('goalText');return {text:el.textContent,inline:el.style.fontSize,w:el.clientWidth,sw:el.scrollWidth}});
 assert.equal(normal.text,'득점!');assert.equal(normal.inline,'');assert.ok(normal.sw<=normal.w);console.log('PASS short goal restores original font');
 // Board mode deliberately hides the mirrored tablet title, regardless of parent.
 // Verify that policy, then exercise its actual tablet CSS rather than counting
 // a hidden DOM node as an overflowing visible headline.
 const hidden=await page.evaluate(()=>{const e=document.getElementById('overlayTitle2');return {display:getComputedStyle(e).display,width:e.clientWidth}});
 assert.equal(hidden.display,'none');assert.equal(hidden.width,0);
 console.log('PASS mirrored tablet title hidden in board mode');
 for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[800,600],[1280,400],[640,360]]){
  await page.setViewportSize({width,height});
  const summary=await page.evaluate(()=>{
   const ids=[...document.querySelectorAll('.overlay-title')].map(e=>e.id).filter(Boolean);
   const fixture=document.createElement('div');fixture.style.cssText='position:fixed;top:0;left:0;width:180px;z-index:9999';document.body.append(fixture);
   const root=document.documentElement,device=root.getAttribute('data-device'),results=[];
   try{
    for(const id of ids){
     const real=document.getElementById(id),parent=real.parentElement,after=real.nextSibling,previous=real.textContent,style=real.getAttribute('style'),className=real.className;
     try{
      if(id==='overlayTitle2')root.setAttribute('data-device','tablet');
      fixture.append(real);real.textContent='광개토대왕 매치 포인트!';
      window.__headlineFixture.fit(real);
      results.push({id,width:real.clientWidth,scroll:real.scrollWidth,white:getComputedStyle(real).whiteSpace,font:parseFloat(getComputedStyle(real).fontSize)});
     }finally{
      parent.insertBefore(real,after);real.textContent=previous;real.className=className;
      if(style===null)real.removeAttribute('style');else real.setAttribute('style',style);
      if(device===null)root.removeAttribute('data-device');else root.setAttribute('data-device',device);
     }
    }
   }finally{fixture.remove()}
   return results;
  });
  assert.ok(summary.length>=10);assert.ok(summary.some(x=>x.id==='overlayTitle2'));
  for(const x of summary)assert.ok(x.width>0&&x.scroll<=x.width&&x.white==='nowrap'&&x.font>=12,JSON.stringify({width,height,...x}));
  console.log('PASS all shared overlay title nodes at constrained fixture width',width,height,JSON.stringify(summary));
 }
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exit(1)});
