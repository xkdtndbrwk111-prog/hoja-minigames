const fs=require('node:fs');
const source=fs.readFileSync('src/js/break-deadline.js','utf8');
const checks=[];
const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name)};
const {breakPhase,breakDismissal,BREAK_CAST}=new Function(source+'\nreturn {breakPhase,breakDismissal,BREAK_CAST};')();
const start=1000000;
for(const [left,want] of [[60001,'idle'],[60000,'warn'],[30001,'warn'],[30000,'close'],[0,'close'],[-10000,'close']])check('boundary '+left,breakPhase(start,start-left)===want);
check('null is idle',breakPhase(null,start)==='idle');
check('7 unique cast',BREAK_CAST.length===7&&new Set(BREAK_CAST.map(x=>x.id)).size===7);
check('56 distinct lines',BREAK_CAST.every(x=>x.lines.length===8)&&new Set(BREAK_CAST.flatMap(x=>x.lines)).size===56);
for(let i=0;i<7;i++)for(let j=0;j<8;j++){let k=0;const a=breakDismissal(()=>k++===0?(i+.5)/7:(j+.5)/8);check('selection '+i+' '+j,a.id===BREAK_CAST[i].id&&a.line===BREAK_CAST[i].lines[j]);}
function harness(embed=true){
 let now=1000000,close=0,cancel=0,stop=0,restore=0,beeps=0;const parent={},sent=[],listeners={},intervals=new Map();let seq=0;
 parent.postMessage=(data,origin)=>sent.push({data,origin});
 const win={parent,addEventListener:(n,f)=>{(listeners[n]??=[]).push(f)},matchMedia:()=>({matches:false})};
 const node=()=>({style:{},children:[],attrs:{},textContent:'',removed:false,setAttribute(k,v){this.attrs[k]=v},append(...x){this.children.push(...x)},remove(){this.removed=true}});
 const doc={body:node(),createElement:node,createElementNS:node,addEventListener(){}};
 new Function('EMBED','window','document','Date','setInterval','clearInterval','applySoundMode','ac','bgmBus','soundMode','sfx','roundClose','cancelPendingPayment','stopBgm','characterPortrait','DASHBOARD_ORIGIN',source+'\ninstallBreakDeadline();')(embed,win,doc,{now:()=>now},fn=>{intervals.set(++seq,fn);return seq},id=>intervals.delete(id),()=>restore++,null,null,'off',()=>beeps++,()=>close++,()=>cancel++,()=>stop++,()=> 'data:image/webp;base64,AAAA','http://127.0.0.1:17439');
 return {sent,doc,listeners,intervals,at(t){now=t;for(const f of [...intervals.values()])f()},send(data,origin='http://127.0.0.1:17439',src=parent){for(const f of listeners.message??[])f({data,origin,source:src})},stats:()=>({close,cancel,stop,restore,beeps})};
}
const make=(revision,classStartAt,audible=true)=>({type:'hoja-break-schedule',revision,classStartAt,audible});
const h=harness();check('ready handshake',h.sent[0]?.data.type==='hoja-break-ready');
h.send(make(1,1060000),'https://foreign.example');check('foreign origin rejected',h.intervals.size===0);
h.send(make(1,1060000),undefined,{});check('foreign source rejected',h.intervals.size===0);
h.send(make(1,1060000,false));check('warning overlay at 60s',h.doc.body.children[0]?.id==='hojaBreakWarning');
const spark=h.doc.body.children[0].children[0].children[2];check('perimeter spark begins at corner',spark.attrs.cx==='8'&&spark.attrs.cy==='8');
check('muted warning',h.stats().beeps===0);
h.at(1015000);check('spark burns along perimeter',spark.attrs.cx==='992'&&spark.attrs.cy==='992');
h.at(1029999);check('not closed before 30s',h.stats().close===0);
h.at(1030000);check('exact threshold closes',h.stats().close===1&&h.stats().cancel===1&&h.stats().stop===1);
check('close carries character',h.sent.at(-1)?.data.reason==='class-start'&&typeof h.sent.at(-1)?.data.dismissal.line==='string');
h.at(1040000);h.send(make(2,1050000));check('no duplicate settlement',h.stats().close===1&&h.sent.filter(x=>x.data.type==='hoja-close').length===1);
const c=harness();c.send(make(5,1060000));c.send(make(4,null));check('stale cancel rejected',c.intervals.size===1);c.send(make(6,null));check('new cancel clears',c.intervals.size===0&&c.doc.body.children[0]?.removed===true);c.at(1090000);check('canceled no close',c.stats().close===0);
const z=harness(false);check('standalone unaffected',z.sent.length===0&&Object.keys(z.listeners).length===0);
const j=harness();j.send(make(1,1070000));j.at(1090000);check('resume past deadline',j.stats().close===1);
console.log(checks.length+'/'+checks.length+' checks passed');
