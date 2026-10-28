const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{JSDOM,VirtualConsole}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
 const {aggregateCampaignRows}=await import('../lib/campaign-data.mjs');
 const headers=['Account name','Date','Campaign name','Ad name','Ad set name','Cost','On-Facebook leads','Impressions','Link clicks','Reach','Clicks (all)','Messaging conversations started'];
 let version=1,connected=false,failData=false,authorized=true,calls=0;
 const snapshot=()=>aggregateCampaignRows(headers,[['Cuenta','2026-10-28','colombia_citroen_c3-bogota','video','adset',12345*version,2,1000,10,500,20,4]]);
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://citroen.example',runScripts:'outside-only',virtualConsole:new VirtualConsole()}),w=dom.window,$=id=>w.document.getElementById(id);
 w.scrollTo=()=>{};w.CITROEN_ACCESS={canEdit:()=>authorized,isOwner:()=>true,identity:()=> 'fixture@example.test'};
 w.DecompressionStream=class{};w.Blob=class{constructor(parts){this.parts=parts;}stream(){return {pipeThrough:()=>this};}};w.Response=class{constructor(s){this.s=s;}async text(){return zlib.gunzipSync(Buffer.from(this.s.parts[0])).toString('utf8');}};
 const originalDaily=JSON.parse(fs.readFileSync('data/meta_2026_daily.json')),originalDetail=JSON.parse(fs.readFileSync('data/meta_2026_detail.json'));
 w.fetch=async(url,options={})=>{
  const ok=body=>({ok:true,json:async()=>body});
  if(String(url).startsWith('/api/campaign-sync')){
   calls++;if(options.method==='POST')return ok({ok:true,script:'PRIVATE_SETUP_CODE'});
   if(failData&&String(url).endsWith('data'))throw Error('temporarily unavailable');
   return ok({ok:true,connected,revision:connected?String(version):null,rows:connected?1:0,syncedAt:new Date().toISOString(),dateMax:'2026-10-28',scheduled:true,...(connected&&String(url).endsWith('data')?snapshot():{})});
  }
  if(url==='/api/data-connect')return ok({ok:true,googleServiceAccount:false});
  if(url==='/api/dashboard')return ok({ok:true,workspace:{pages:[],creatives:[],insights:[]},revision:'initial'});
  return ok(String(url).includes('detail')?originalDetail:originalDaily);
 };
 for(const file of ['data/proyecciones_2026.js','data/revision_2026.js','campaign-feed.js','reach-math.js','meta.js','concept3.js','studio.js','campaign-connection.js','data-sources.js','builder.js'])w.eval(fs.readFileSync(file,'utf8'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));for(let i=0;i<8;i++)await tick();
 assert.ok($('campaignFeedStatus').textContent.includes('pendiente'));assert.ok($('metaFilterContext').textContent.includes('27.840'));
 connected=true;failData=true;await w.CITROEN_CAMPAIGN_FEED.refresh();assert.equal(w.CITROEN_CAMPAIGN_FEED.status().connected,false,'A failed fetch cannot claim live data');
 failData=false;await w.CITROEN_CAMPAIGN_FEED.refresh();for(let i=0;i<4;i++)await tick();
 assert.ok($('metaKpis').textContent.includes('12.345'));assert.ok($('c3Kpis').textContent.includes('12.345'));assert.ok($('campaignFeedStatus').textContent.includes('2026-10-28'));
 $('metaMonth').value='2026-10';$('metaMonth').dispatchEvent(new w.Event('change'));$('c3Month').value='2026-10';$('c3Month').dispatchEvent(new w.Event('change'));
 version=2;await w.CITROEN_CAMPAIGN_FEED.refresh();for(let i=0;i<4;i++)await tick();
 assert.equal($('metaMonth').value,'2026-10');assert.equal($('c3Month').value,'2026-10');
 assert.ok($('metaKpis').textContent.includes('24.690'));assert.ok($('c3Kpis').textContent.includes('24.690'));
 const mount=w.document.createElement('div');mount.id='sourceWorkspace';w.document.body.append(mount);const panel=w.document.createElement('div');panel.id='campaignSyncPanel';mount.append(panel);w.CITROEN_CAMPAIGN_CONNECTION.mount(panel);
 $('campaignPrepare').click();await tick();await tick();assert.equal($('campaignScript').value,'PRIVATE_SETUP_CODE');assert.ok($('campaignSetupMessage').textContent.includes('Falta ejecutarlo'));
 authorized=false;w.document.dispatchEvent(new w.Event('citroen:auth-changed'));assert.ok(!w.document.body.textContent.includes('PRIVATE_SETUP_CODE'));
 dom.window.close();console.log('PASS: fallback, failed fetch honesty, shared live data, refresh without reload, setup and logout privacy.');
})().catch(e=>{console.error(e);process.exit(1);});
