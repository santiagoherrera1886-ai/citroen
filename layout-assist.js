/* Alignment and movement history for Citroën dashboard canvases.
 * Independent of analytics data. Nothing is published without the explicit Publish action.
 */
(function(){
'use strict';
const scopes=new Map(),LIMIT=30;
function clone(x){return JSON.parse(JSON.stringify(x));}
function history(scope){
 if(!scopes.has(scope))scopes.set(scope,{undo:[],redo:[],apply:null});
 return scopes.get(scope);
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function notify(scope){document.dispatchEvent(new CustomEvent('citroen:layout-history',{detail:{scope,undo:canUndo(scope),redo:canRedo(scope)}}));}
function register(scope,apply){history(scope).apply=apply;}
function record(scope,before,after){
 if(!before||!after||same(before,after))return false;
 const h=history(scope);h.undo.push(clone(before));if(h.undo.length>LIMIT)h.undo.shift();h.redo=[];notify(scope);
 return true;
}
function undo(scope,current){
 const h=history(scope);if(!h.undo.length||typeof h.apply!=='function')return false;
 const target=h.undo.pop();h.redo.push(clone(current));
 h.apply(clone(target));notify(scope);return true;
}
function redo(scope,current){
 const h=history(scope);if(!h.redo.length||typeof h.apply!=='function')return false;
 const target=h.redo.pop();h.undo.push(clone(current));
 h.apply(clone(target));return true;
}
function canUndo(scope){return history(scope).undo.length>0;}
function canRedo(scope){return history(scope).redo.length>0;}
function clear(scope){const h=history(scope);h.undo=[];h.redo=[];notify(scope);}
const choose=(target,candidates,tolerance)=>{
 let best=null;
 for(const candidate of candidates){
  const d=Math.abs(candidate.value-target);
  if(d<=tolerance&&(!best||d<best.delta))best={...candidate,delta:d};
 }
 return best;
};
function candidates(peers,rect,mode,axis,gap){
 const candidates=[];
 const pSize=axis==='x'?'w':'h',vSize=rect[pSize],start=axis;
 for(const other of peers){
  const begin=Number(other[start])||0,size=Number(other[pSize])||0,end=begin+size,center=begin+size/2;
  if(mode==='resize'){
   for(const value of [begin,center,end])candidates.push({value,guide:value});
  }else{
   for(const [value,guide] of [
    [begin,begin],[center-vSize/2,center],[end-vSize,end],
    [end+gap,end],[begin-vSize-gap,begin]
   ])candidates.push({value,guide});
  }
 }
 return candidates;
}
function snap(rect,peers=[],opts={}){
 const step=Math.max(1,Number(opts.grid)||8),gap=Number.isFinite(Number(opts.gap))?Math.max(0,Number(opts.gap)):12,
  tolerance=Number.isFinite(Number(opts.tolerance))?Number(opts.tolerance):7;
 const mode=opts.mode==='resize'?'resize':'move';
 const result={x:Number(rect.x)||0,y:Number(rect.y)||0,w:Number(rect.w)||0,h:Number(rect.h)||0,guides:[]};
 const round=n=>Math.round(n/step)*step;
 const targetX=mode==='resize'?result.x+result.w:result.x;
 const targetY=mode==='resize'?result.y+result.h:result.y;
 const limitsX=candidates(peers,rect,mode,'x',gap);
 const limitsY=candidates(peers,rect,mode,'y',gap);
 const mx=!opts.bypass?choose(targetX,limitsX,tolerance):null;
 const my=!opts.bypass?choose(targetY,limitsY,tolerance):null;
 const xx=mx?mx.value:opts.bypass?targetX:round(targetX);
 const yy=my?my.value:opts.bypass?targetY:round(targetY);
 if(mode==='resize'){
  result.w=Math.max(1,xx-result.x);result.h=Math.max(1,yy-result.y);
 }else{result.x=xx;result.y=yy;}
 if(mx)result.guides.push({axis:'x',position:mx.guide});
 if(my)result.guides.push({axis:'y',position:my.guide});
 return result;
}
function guides(host,lines){
 if(!host)return;
 host.querySelectorAll(':scope > .citroen-align-guide').forEach(x=>x.remove());
 for(const g of (lines||[]).slice(0,2)){
  const line=document.createElement('div');
  line.className='citroen-align-guide citroen-align-'+g.axis;
  line.setAttribute('aria-hidden','true');
  line.style[g.axis==='x'?'left':'top']=g.position+'px';
  host.appendChild(line);
 }
}
function scopeNow(){
 const id=window.CITROEN_BUILDER?.getCurrentPage?.()||'resumen';
 return id.startsWith('report-')?'page:'+id.slice(7):'summary';
}
function onKey(e){
 if(!((e.ctrlKey||e.metaKey)&&!e.altKey))return;
 if(e.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;
 if(!window.CITROEN_ACCESS?.canEdit?.()||!document.getElementById('c3Dashboard')?.classList.contains('studio-edit-on'))return;
 if(e.key.toLowerCase()!=='z'&&e.key.toLowerCase()!=='y')return;
 const scope=scopeNow(),api=window.CITROEN_LAYOUT_HISTORY;
 let ok=false;
 if(e.key.toLowerCase()==='y'||e.shiftKey)ok=api.redo(scope);
 else ok=api.undo(scope);
 if(ok){e.preventDefault();e.stopPropagation();}
}
window.CITROEN_LAYOUT_HISTORY={
 register,record,canUndo,canRedo,clear,snap,guides,current:scopeNow,
 undo(scope){const h=history(scope);const current=h.current?.();return current?undo(scope,current):false;},
 redo(scope){const h=history(scope);const current=h.current?.();return current?redo(scope,current):false;},
 bind(scope,get,apply){const h=history(scope);h.current=get;h.apply=apply;},
};
document.addEventListener('keydown',onKey,true);
})();
