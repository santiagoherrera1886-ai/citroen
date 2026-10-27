/* Snapping, guides, history, and keyboard actions without real network. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><body><main id="c3Dashboard"><div class="c3-header"><div><h1>Citroën</h1></div><div class="c3-header-controls"><label><select id="c3Month"><option value="">Mes</option></select></label><label><select id="c3Territory"><option value="">Territorio</option></select></label><label><select id="c3Model"><option value="">Modelo</option></select></label></div></div><div class="c3-hero">Banner</div><p id="c3Context">Reporte</p><div id="lkGlobalFilters"></div><div id="studioTools" hidden></div><div id="c3Kpis">'+
 Array.from({length:6},(_,i)=>'<article data-metric-slot="'+i+'">KPI</article>').join('')+
 '</div><section id="studioCards"><article id="c3ComparePanel" class="c3-panel" data-panel-key="n:c3ComparePanel">Chart</article>'+
 '<article class="studio-card" data-panel-key="c:custom">Custom</article></section><button id="studioFreeLayout">Free</button>'+
 '<button id="studioUndoPosition" disabled>Undo</button><button id="studioRedoPosition" disabled>Redo</button></main></body>',{runScripts:'outside-only',url:'https://citroen-rho.vercel.app'});
const w=dom.window,$=id=>w.document.getElementById(id);
w.CITROEN_ACCESS={canEdit:()=>true};
w.CITROEN_BUILDER={getCurrentPage:()=> 'resumen'};
w.CITROEN_METRIC_EDITOR={selected:()=> 'k:1'};
w.CITROEN_EDITOR_ZOOM=1;
for(const id of ['c3Kpis','studioCards'])$(id).getBoundingClientRect=()=>({left:0,top:0,width:1280,height:700});
w.eval(fs.readFileSync('layout-assist.js','utf8'));
w.eval(fs.readFileSync('free-layout.js','utf8'));
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
$('c3Dashboard').classList.add('studio-edit-on');
w.document.dispatchEvent(new w.Event('citroen:studio-layout'));
const assist=w.CITROEN_LAYOUT_HISTORY;
const peer={x:100,y:100,w:240,h:130};
const near={x:103,y:101,w:240,h:130};
const adjusted=assist.snap(near,[peer],{grid:8,tolerance:7,gap:12});
assert.equal(adjusted.x,100,'Nearby left edges should magnetize');
assert.equal(adjusted.y,100,'Nearby top edges should magnetize');
assert.equal(adjusted.guides.length,2,'Both axes receive alignment guides');
assert.equal(assist.snap(near,[peer],{bypass:true}).x,103,'Alt bypasses all snapping');
const resize=assist.snap({x:0,y:0,w:338,h:229},[{x:340,y:229,w:120,h:90}],{mode:'resize',tolerance:7});
assert.equal(resize.w,340,'Resize right edge should align');
assert.equal(resize.h,229,'Resize bottom edge should align');
assist.guides($('studioCards'),adjusted.guides);
assert.equal($('studioCards').querySelectorAll('.citroen-align-guide').length,2,'Guides rendered within current canvas');
assist.guides($('studioCards'),[]);
assert.equal($('studioCards').querySelectorAll('.citroen-align-guide').length,0,'Guides are cleared after dragging');
const k=$('c3Kpis').querySelector('[data-metric-slot="1"]');
const before=w.CITROEN_FREE_LAYOUT.export();
function ptr(target,type,x,y){const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperty(e,'pointerId',{value:7});target.dispatchEvent(e);}
ptr(k,'pointerdown',120,40);ptr(w,'pointermove',199,65);ptr(w,'pointerup',199,65);
const after=w.CITROEN_FREE_LAYOUT.export();
assert.notDeepEqual(after.items['k:1'],before.items['k:1'],'Summary KPI moved');
assert.ok(assist.canUndo('summary'),'Movement is recorded in Summary history');
$('studioUndoPosition').click();
assert.deepEqual(w.CITROEN_FREE_LAYOUT.export().items['k:1'],before.items['k:1'],'Undo restores original KPI coordinates');
$('studioRedoPosition').click();
assert.deepEqual(w.CITROEN_FREE_LAYOUT.export().items['k:1'],after.items['k:1'],'Redo restores moved position');
const arrowBefore=w.CITROEN_FREE_LAYOUT.export().items['k:1'].x;
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
assert.equal(w.CITROEN_FREE_LAYOUT.export().items['k:1'].x,arrowBefore+8,'Right arrow nudges selected KPI eight pixels');
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',shiftKey:true,bubbles:true,cancelable:true}));
assert.equal(w.CITROEN_FREE_LAYOUT.export().items['k:1'].y,after.items['k:1'].y+1,'Shift arrow enables one-pixel fine tuning');
assert.equal(assist.canUndo('summary'),true,'Keyboard movement is reversible');
let x=0;const scope='page:alpha';
assist.bind(scope,()=>({x}),v=>{x=v.x});
assist.record(scope,{x:0},{x:20});
x=20;
assert.ok(assist.undo(scope));assert.equal(x,0,'Page undo scope remains separate');
assert.ok(assist.canUndo('summary'),'Summary history unaffected by page changes');
const inp=w.document.createElement('input');w.document.body.append(inp);inp.focus();
const ev=new w.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true});inp.dispatchEvent(ev);
assert.equal(x,0,'Text-input native undo remains untouched');
assert.ok(assist.redo(scope));assert.equal(x,20);
console.log('PASS: edge snapping, Alt bypass, resize guides, guide clean-up, Summary undo/redo, scoped page history, input keyboard protection.');
w.close();
