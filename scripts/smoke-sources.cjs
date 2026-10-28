const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM,VirtualConsole}=require('jsdom');
const daily=JSON.parse(fs.readFileSync('data/meta_2026_daily.json','utf8'));
const files=['source-data.js','data-sources.js','builder.js','looker-editor.js','looker-properties.js'];
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function harness(saved={},workspace=null){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://citroen.example',runScripts:'outside-only',virtualConsole:new VirtualConsole()}),w=dom.window,$=id=>w.document.getElementById(id);
 let editor=true,fail=false,reads=0,published=null;
 w.scrollTo=()=>{};w.confirm=()=>true;
 w.CITROEN_ACCESS={canEdit:()=>editor,isOwner:()=>true,identity:()=> 'editor@example.test'};
 for(const [key,value] of Object.entries(saved))w.localStorage.setItem(key,value);
 w.fetch=async (url,options={})=>{
  const ok=body=>({ok:true,json:async()=>body});
  if(url==='/api/data-connect'){
   if(!options.body)return ok({ok:true,googleServiceAccount:false});
   reads++;if(fail)return {ok:false,json:async()=>({error:'Hoja sin permisos'})};
   const b=JSON.parse(options.body),second=b.url.includes('second');
   return ok({ok:true,source:second?'Segunda fuente':'Hoja de prueba',kind:'sheets',columns:second?['Ciudad','Clicks']:['Modelo','Inversión','Leads'],rows:second?[{Ciudad:'Bogotá',Clicks:'9'}]:[{Modelo:'C3',Inversión:'1.234,56',Leads:'10'},{Modelo:'C3',Inversión:'2.000,44',Leads:'20'}],access:'public',fetchedAt:'2026-10-28T15:00:00Z'});
  }
  if(url==='/api/dashboard'){
   if(options.method==='POST'){published=JSON.parse(options.body).workspace;return ok({ok:true,revision:'test-published',workspace:published});}
   return ok({ok:true,workspace:workspace||{pages:[],insights:[],creatives:[],controls:[],filters:{}},revision:'initial'});
  }
  return ok(daily);
 };
 files.forEach(file=>w.eval(fs.readFileSync(file,'utf8')));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await tick();await tick();
 $('c3Dashboard').classList.add('studio-edit-on');w.document.dispatchEvent(new w.Event('citroen:studio-layout'));
 return {dom,w,$,setEditor:value=>editor=value,setFail:value=>fail=value,getReads:()=>reads,getPublished:()=>published};
}
(async()=>{
 const h=await harness(),{w,$}=h;
 const number=w.CITROEN_SOURCE_DATA.number;
 assert.equal(number('$ 1.234,56'),1234.56);assert.equal(number('1,234.56'),1234.56);assert.equal(number('(1.200,50)'),-1200.5);assert.equal(number('1.234','en-US'),1.234);assert.equal(number('texto'),null);
 w.document.querySelector('[data-target="citroen-sources"]').click();
 $('builderSheetUrl').value='https://docs.google.com/spreadsheets/d/first_fixture_123456/edit';
 $('sourceSheetForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();await tick();
 assert.ok($('builderExternalPreview').textContent.includes('2 filas'));
 assert.equal(w.CITROEN_SOURCES.list().length,1);
 const firstId=w.CITROEN_SOURCES.list()[0].id;
 $('sourceDestination').value='new';$('sourceInsertChart').click();
 const page=w.CITROEN_BUILDER.getPages()[0],cardId=w.CITROEN_BUILDER.getSelectedCardId();
 let card=w.CITROEN_BUILDER.getCard(page.id,cardId);
 assert.equal(card.sourceId,firstId);assert.equal(card.metric,'Inversión');
 assert.ok($('report-'+page.id).textContent.includes('3.235'),'Colombian numbers aggregate correctly in chart tooltip');
 assert.equal($('leSourceTitle').textContent,'Hoja de prueba');
 assert.ok($('leFieldsList').textContent.includes('Leads'));assert.ok(!$('leFieldsList').textContent.includes('Cuenta Meta'));
 const select=$('leBuilderProperties').querySelector('[data-le-property="metric"]');select.value='Leads';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(w.CITROEN_BUILDER.getCard(page.id,cardId).metric,'Leads');
 assert.ok($('report-'+page.id).textContent.includes('30'),'Selected metric is recalculated');
 w.CITROEN_BUILDER.updateCard(page.id,cardId,{aggregation:'avg'});
 assert.ok($('report-'+page.id).textContent.includes('15'),'Average differs from sum');
 w.document.querySelector('[data-target="citroen-sources"]').click();
 $('builderSheetUrl').value='https://docs.google.com/spreadsheets/d/second_fixture_123456/edit';$('sourceName').value='';$('sourceSheetForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();await tick();
 assert.equal(w.CITROEN_SOURCES.list().length,2);
 w.document.querySelector('[data-target="report-'+page.id+'"]').click();
 assert.ok($('report-'+page.id).textContent.includes('Hoja de prueba'),'Connecting another sheet does not rebind existing cards');
 assert.ok(!$('report-'+page.id).textContent.includes('Bogotá'));
 const stored=JSON.parse(w.localStorage.getItem('citroen_sources_v2:editor@example.test'));
 assert.equal(stored.length,2);assert.ok(!JSON.stringify(stored).includes('1.234,56'),'Rows never enter local storage');
 h.setFail(true);await w.CITROEN_SOURCES.refresh(firstId);assert.equal(w.CITROEN_SOURCES.get(firstId).stale,true);assert.equal(w.CITROEN_SOURCES.get(firstId).rows.length,2);
 h.setFail(false);await w.CITROEN_BUILDER.publish();const published=h.getPublished();
 assert.equal(published.pages[0].cards[0].sourceId,firstId);assert.ok(!JSON.stringify(published).includes('1.234,56'),'Publishing stores layout, not private rows');
 const storage=Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));
 const reload=await harness(storage,published);await tick();await tick();await tick();
 assert.equal(reload.getReads(),2,'Saved sources refresh on next authorized edit session');
 assert.equal(reload.w.CITROEN_SOURCES.get(firstId).rows.length,2);
 reload.setEditor(false);reload.w.document.dispatchEvent(new reload.w.Event('citroen:auth-changed'));
 assert.equal(reload.w.CITROEN_SOURCES.get(firstId),null,'Logout clears source data');
 h.setEditor(false);$('c3Dashboard').classList.remove('studio-edit-on');w.document.dispatchEvent(new w.Event('citroen:studio-layout'));
 assert.ok(!$('report-'+page.id).textContent.includes('3.235'),'Private data is not rendered in read mode');
 assert.ok($('report-'+page.id).textContent.includes('Fuente externa privada'));
 h.dom.window.close();reload.dom.window.close();
 console.log('PASS: source connection, locale numbers, live fields, aggregation, isolated sources, refresh failures, reload and private-data isolation.');
})().catch(e=>{console.error(e);process.exit(1);});
