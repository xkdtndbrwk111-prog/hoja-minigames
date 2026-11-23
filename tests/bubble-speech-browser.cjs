const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),{chromium}=require('playwright');
let html=fs.readFileSync('index.html','utf8');
const anchor='  syncMode();\n  tournamentInit();';
assert.ok(html.includes(anchor),'game bootstrap hook not found');
html=html.replace(anchor,anchor+'\n  window.__bubbleSpeechTest={open:enterBubble,close:leaveBubble,note:bNote,reset:bNewMatch};');
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/sw.js')){res.statusCode=404;return res.end()}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
});
(async()=>{
 let browser;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/?mode=board#debug');
  await page.waitForFunction(()=>!!window.__bubbleSpeechTest);
  await page.evaluate(async()=>{await document.fonts.ready;window.__bubbleSpeechTest.open()});
  for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[1280,720]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>{
    window.__bubbleSpeechTest.note(0,'happy','싹 비웠다!');
    window.__bubbleSpeechTest.note(1,'surprised','위험해!');
   });
   const snap=await page.evaluate(()=>[0,1].map(i=>{
    const el=document.getElementById('bNote'+i),panel=document.getElementById('bTeam'+i),bubble=el.getBoundingClientRect(),team=panel.getBoundingClientRect(),css=getComputedStyle(el);
    return {text:el.textContent,font:parseFloat(css.fontSize),bg:css.backgroundColor,border:parseFloat(css.borderTopWidth),pointer:css.pointerEvents,tail:getComputedStyle(el,'::before').content,
    bubble:{l:bubble.left,r:bubble.right,t:bubble.top,b:bubble.bottom,w:bubble.width,h:bubble.height},team:{l:team.left,r:team.right,t:team.top,b:team.bottom},
    overflows:el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1};
   }));
   for(const v of snap){
    assert.ok(v.font>=21,JSON.stringify({width,height,v}));
    assert.ok(v.border>=3&&v.bg!=='rgba(0, 0, 0, 0)'&&v.tail!=='none'&&v.pointer==='none',JSON.stringify(v));
    assert.ok(v.bubble.l>=v.team.l-2&&v.bubble.r<=v.team.r+2&&v.bubble.t>=v.team.t-2&&v.bubble.b<=v.team.b+2,JSON.stringify({width,height,v}));
    assert.equal(v.overflows,false,JSON.stringify({width,height,v}));
   }
   console.log('PASS puzzle bubble dialogue',width,height,JSON.stringify(snap.map(x=>({text:x.text,font:x.font,width:x.bubble.w}))));
  }
  await page.evaluate(()=>window.__bubbleSpeechTest.reset());
  const empty=await page.evaluate(()=>[0,1].map(i=>getComputedStyle(document.getElementById('bNote'+i)).display));
  assert.deepEqual(empty,['none','none']);
  console.log('PASS empty notes take no space and do not overlay portrait');
 }finally{await browser?.close();server.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
