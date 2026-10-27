const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://citroen-rho.vercel.app/#resumen',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
const w=dom.window,$=id=>w.document.getElementById(id);
const info=w.document.createElement('span');info.id='leToolbarStatus';w.document.body.appendChild(info);
const canvasLabel=w.document.createElement('div');canvasLabel.id='leCanvasTitle';w.document.body.appendChild(canvasLabel);
const page=w.document.createElement('section');page.id='report-example';page.className='page-section is-active';page.innerHTML='<h2>Informe de campañas</h2>';w.document.querySelector('.content').appendChild(page);
const c={id:'card-1',title:'Inversión por mes',type:'chart',source:'meta',metric:'spend',dimension:'month',shape:'bar',w:500,h:260,x:20,y:20};
let active='report-example',calls=0,last=null,duplicated=0,removed=0,pagesMoved=0;
w.CITROEN_BUILDER={
 getCurrentPage:()=>active,getPages:()=>[{id:'example',title:'Informe de campañas'}],
 getCard:(p,id)=>p==='example'&&id===c.id?{...c}:null,
 updateCard:(p,id,patch)=>{if(id!==c.id)return false;Object.assign(c,patch);last=patch;calls++;return {...c};},
 addOnCurrent:type=>{last={newType:type};return true;},
 duplicateCard:()=>{duplicated++;return true;},removeCard:()=>{removed++;return true;},
 renamePage:()=>true,reorderPage:()=>{pagesMoved++;return true;}
};
w.eval(fs.readFileSync('looker-properties.js','utf8'));
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
assert.equal($('leBuilderProperties').hidden,true,'Public visitor sees no editor properties');
w.document.body.classList.add('citroen-looker-edit');
w.document.dispatchEvent(new w.Event('citroen:studio-layout'));
assert.equal($('leBuilderProperties').hidden,false,'Editor shows page properties');
assert.ok($('leBuilderProperties').textContent.includes('Propiedades de la página')||$('leBuilderProperties').textContent.includes('PROPIEDADES DE LA PÁGINA'));
w.document.dispatchEvent(new w.CustomEvent('citroen:builder-card-selected',{detail:{pageId:'example',card:{...c}}}));
assert.equal($('leBuilderProperties').querySelector('[data-le-property="metric"]').value,'spend');
const metric=$('leBuilderProperties').querySelector('[data-le-property="metric"]');metric.value='impressions';metric.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(c.metric,'impressions','Source metric changed from contextual panel');
const dim=$('leBuilderProperties').querySelector('[data-le-property="dimension"]');dim.value='model';dim.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(c.dimension,'model','Dimension changed');
const style=$('leBuilderProperties').querySelector('[data-le-tab="style"]');style.click();
const color=$('leBuilderProperties').querySelector('[data-le-property="color"]');color.value='#ee6677';color.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(c.color,'#ee6677','Series color stored through builder API');
$('leZoom').value='75';$('leZoom').dispatchEvent(new w.Event('change'));
assert.equal(w.CITROEN_EDITOR_ZOOM,.75,'Canvas zoom changes actual scale variable');
assert.equal(w.document.body.style.getPropertyValue('--le-canvas-zoom'),'0.75');
assert.equal(w.document.body.classList.contains('le-grid-on'),true);
$('leGrid').click();assert.equal(w.document.body.classList.contains('le-grid-on'),false,'Grid toggles');
$('leBuilderProperties').querySelector('[data-le-tab="data"]').click();
$('leBuilderProperties').querySelector('[data-le-action="duplicate"]').click();
assert.equal(duplicated,1);
w.document.body.classList.remove('citroen-looker-edit');
w.document.dispatchEvent(new w.Event('citroen:studio-layout'));
assert.equal($('leBuilderProperties').hidden,true,'Inspector hidden when viewing report publicly');
assert.ok(calls>=3,'Contextual editor actually changes stored data');
console.log('PASS: Public/private properties, live metric and dimension editing, color styling, page canvas zoom/grid, card duplicate and exit to viewing.');
w.close();