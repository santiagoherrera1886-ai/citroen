// Real DOM regression test for the Citroen Planning 2026 module.
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const packedSource=fs.readFileSync('data/proyecciones_2026.js','utf8');
const script=fs.readFileSync('planning.js','utf8');
const virtual=new VirtualConsole();
const errors=[];virtual.on('jsdomError',x=>errors.push(x.message));
const dom=new JSDOM(html,{url:'https://citroen.example/#planeacion',runScripts:'outside-only',virtualConsole:virtual});
const {window:w}=dom;
w.eval(packedSource);
const decoded=JSON.parse(zlib.gunzipSync(Buffer.from(w.CITROEN_PLAN_PACKED,'base64')).toString('utf8'));
// Only replace the browser compression stream plumbing; the parsed source and
// actual dashboard code remain unchanged.
w.DecompressionStream=class{constructor(type){assert.equal(type,'gzip');}};
w.Blob=class{stream(){return {pipeThrough(){return null;}};}};
w.Response=class{async text(){return JSON.stringify(decoded);}};
w.alert=message=>{throw Error('Unexpected browser alert: '+message);};
w.eval(script);
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
(async()=>{
  const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
  for(let i=0;i<12&&!w.document.querySelector('#planKpis .plan-kpi');i++)await tick();
  assert.equal(errors.length,0,'Unexpected DOM console errors: '+errors);
  const id=x=>w.document.getElementById(x);
  assert.equal(id('planKpis').querySelectorAll('.plan-kpi').length,4,'KPI cards did not render');
  assert.equal(id('planMonth').options.length,11,'All 10 months did not populate');
  assert.equal(id('planModel').options.length,7,'All 6 models did not populate');
  assert.equal(id('planComparison').querySelectorAll('tr').length,10,'Missing 10 plan-vs-real rows');
  assert.ok(id('planPreviewTotal').textContent.includes('944'),'Audited 944M total not rendered');
  assert.ok(id('planTimeline').querySelector('.plan-month-chart'),'Budget chart not rendered');
  assert.ok(id('planModelsChart').querySelector('.plan-section-bars'),'Model allocation chart not rendered');
  assert.ok(id('planDetailRows').querySelectorAll('tr').length>0,'Missing original plan lines');

  // Exercise filters, not just the initial render.
  id('planMonth').value='2026-09';
  id('planMonth').dispatchEvent(new w.Event('change'));
  assert.equal(id('planComparison').querySelectorAll('tr').length,1,'Month filter broken');
  id('planModel').value='C3';
  id('planModel').dispatchEvent(new w.Event('change'));
  assert.ok(id('planKpis').textContent.includes('C3'),'Model filter broken');

  // Actuals remain clearly scoped to Meta Ads, not overall media-plan completion.
  w.document.dispatchEvent(new w.CustomEvent('citroen:real-data',{detail:{
   source:'Meta Ads · January–October execution',partialScope:true,
   rows:[{fecha:'2026-09-01',modelo:'C3',inversion:1000,leads:2}]
  }}));
  assert.ok(id('planRealState').textContent.includes('COBERTURA PARCIAL'),'Meta-only scoping broken');
  assert.ok(id('planComparison').textContent.includes('1.000'),'Real September spend did not render');
  assert.ok(!id('planOverviewNote').textContent.includes('No fue posible abrir'),'Planning falsely reports source failure');
  console.log('PASS: live-DOM Planning 2026 loaded 10 real plan months, 551 lines, filters, charts and Meta partial coverage.');
  w.close();
})().catch(e=>{console.error(e);process.exitCode=1;w.close();});
