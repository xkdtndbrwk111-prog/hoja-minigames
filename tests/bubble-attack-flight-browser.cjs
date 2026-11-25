const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),{chromium}=require('playwright');
let html=fs.readFileSync('index.html','utf8');
const anchor='  syncMode();\n  tournamentInit();';
assert.ok(html.includes(anchor));
html=html.replace(anchor,anchor+`
  window.__flightTest={open(){enterBubble();cancelAnimationFrame(BB.raf);BB.phase='playing';},close:leaveBubble,
    reset:bFxReset,queue(side){bFxQueue(BB.fields[side],BB.fields[1-side],1,2,[{x:B_W/2,y:B_FH*.4,v:1}]);},
    step:bFxDraw};`);
const server=http.createServer((req,res)=>{if(req.url.startsWith('/sw.js')){res.statusCode=404;return res.end()}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
(async()=>{let browser;await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const [mode,width,height] of [['board',1920,1080],['tablet',1024,768],['tablet',768,1024]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/?mode='+mode+'#debug');
  await page.waitForFunction(()=>!!window.__flightTest);
  await page.evaluate(async()=>{await document.fonts.ready;window.__flightTest.open()});
  for(const side of [0,1]){
   const result=await page.evaluate(side=>{
    const t=window.__flightTest;t.reset();t.queue(side);t.step(.22);
    const c=document.getElementById('bAttackFX'),g=c.getContext('2d'),data=g.getImageData(0,0,c.width,c.height).data;
    let visible=0;for(let i=3;i<data.length;i+=4)if(data[i])visible++;
    const field=document.getElementById('bField'+side),r=field.getBoundingClientRect();
    const pointer=getComputedStyle(c).pointerEvents,hit=document.elementFromPoint(r.left+r.width*.5,r.top+r.height*.6)===field;
    t.step(.31);const impact=!!document.getElementById('bAttackFX');t.step(.3);
    return {visible,pointer,hit,impact,clean:!document.getElementById('bAttackFX')};
   },side);
   assert.ok(result.visible>50,JSON.stringify(result));assert.equal(result.pointer,'none');assert.ok(result.hit,JSON.stringify(result));assert.ok(result.impact);assert.ok(result.clean);
  }
  await page.evaluate(()=>window.__flightTest.close());assert.deepEqual(errors,[]);await page.close();console.log('PASS flight canvas '+mode+' '+width+'x'+height);
 }
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
