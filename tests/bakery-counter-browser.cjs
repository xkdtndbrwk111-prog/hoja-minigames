const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
let html=fs.readFileSync('index.html','utf8');
const anchor='  syncMode();\n  tournamentInit();';
assert.ok(html.includes(anchor),'game bootstrap missing');
html=html.replace(anchor,anchor+`
  window.__customerAnchorFixture={
    face:shFace,
    getAnchor:stPortraitAnchor,
    box:shCustomerPortraitBox,
    start:()=>{shopStage='co4';enterShop();},
    getTop:()=>SH.TZ
  };`);
const server=http.createServer((q,r)=>{
  if(q.url.startsWith('/sw.js')){r.statusCode=404;return r.end();}
  r.setHeader('Content-Type','text/html; charset=utf-8');r.end(html);
});
(async()=>{
 let browser;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/?mode=board#debug');
  await page.waitForFunction(()=>window.__customerAnchorFixture);
  await page.evaluate(()=>window.__customerAnchorFixture.start());
  for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});
    const anchors=await page.evaluate(async()=>{
      const fixture=window.__customerAnchorFixture;
      const faces=['HOJA','NAHANSANG','SUMAKSAE','CHILJIDO_ELDER','MURYEONG_KING','BANGASAYUSANG','GWANGGAETO_KING'];
      const moods=['neutral','surprised','angry','sad','happy'];
      const tz=fixture.getTop(),size=tz*.66,expected=tz+Math.min(9,tz*.025);
      const data=[];
      for(const face of faces){
        const neutral=fixture.face(face,'neutral');
        await neutral.decode();
        const boxes=[];
        for(const mood of moods){
          const image=fixture.face(face,mood);await image.decode();
          const a=fixture.getAnchor(image);
          const box=fixture.box(image,neutral,480,tz,size,0);
          boxes.push({mood,x:box.x,contact:box.y+size*a.y,head:box.y,hasImage:!!image.naturalWidth});
        }
        data.push({face,boxes});
      }
      return {tz,expected,data};
    });
    for(const entry of anchors.data){
      assert.equal(entry.boxes.length,5);
      for(const b of entry.boxes){
        assert.ok(b.hasImage,JSON.stringify({width,height,entry,b}));
        assert.ok(Math.abs(b.contact-anchors.expected)<.001,JSON.stringify({width,height,entry,b,expected:anchors.expected}));
        assert.ok(Math.abs(b.x-entry.boxes[0].x)<.001,'all expression variants must stay horizontally centered');
        assert.ok(b.head>=-1,'top of character should stay within scene');
      }
    }
    console.log('PASS actual 7 characters x 5 expressions counter anchors',width,height);
  }
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
