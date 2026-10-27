(function concept3(){
'use strict';
const $=id=>document.getElementById(id);
const int=new Intl.NumberFormat('es-CO',{maximumFractionDigits:0});
const cop=new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
const num=x=>x==null?'—':int.format(x),money=x=>x==null?'—':cop.format(x);
const short=x=>x==null?'—':Math.abs(x)>=1e6?(x/1e6).toLocaleString('es-CO',{maximumFractionDigits:1})+' M':Math.abs(x)>=1e3?(x/1e3).toLocaleString('es-CO',{maximumFractionDigits:1})+' mil':num(x);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const months=['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'],labels=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct'];
const cars=[
 {model:'C3',name:'Citroën C3',desc:'Urbano, ágil, icónico.',url:'https://www.citroen.com.co/modelos/nueva-c3.html',src:'./assets/models/c3.webp',backup:'https://http2.mlstatic.com/D_Q_NP_2X_886228-MCO106912865482_022026-P.webp'},
 {model:'Basalt',name:'Citroën Basalt',desc:'Diseño que destaca.',url:'https://www.citroen.com.co/modelos/basalt.html',src:'./assets/models/basalt.webp',backup:'https://citroenderco.vteximg.com.br/arquivos/ids/157771/live-pack-gris-grafito-main.jpg?v=638845873268330000'},
 {model:'Aircross',name:'Citroën Aircross',desc:'Versatilidad en familia.',url:'https://www.citroen.com.co/modelos/nueva-aircross-suv.html',src:'./assets/models/aircross.webp',backup:'https://citroenderco.vteximg.com.br/arquivos/ids/157467-1000-500/Shine-Rojo-ruby-main.jpg?v=638635747121730000'},
 {model:'BERLINGO',name:'Citroën Berlingo',desc:'Espacio para tu negocio.',url:'https://www.citroen.com.co/modelos/nueva-berlingo-van.html',src:'./assets/models/berlingo.webp',backup:'https://citroenalcala.com/wp-content/uploads/2025/12/berlingo-van.png'}
];
const state={plan:null,rows:[],campaigns:[],month:'',model:'',territory:'',metric:'investment',ready:false};
const add=(rows,i)=>rows.reduce((a,r)=>a+(r.v[i]||0),0);
const norm=s=>String(s||'').trim().toUpperCase();
const filter=rows=>{
 const basic=rows.filter(r=>(!state.month||r.month===state.month)&&(!state.model||norm(r.model)===norm(state.model))&&(!state.territory||r.territory===state.territory));
 return window.CITROEN_FILTER_ENGINE?.filter(basic,'resumen')||basic;
};
const opt=(value,label)=>`<option value="${esc(value)}">${esc(label)}</option>`;
const configured=(kind,slot,fallback)=>{const prefs=window.CITROEN_METRIC_OVERRIDES||{};return kind==='slot'?(prefs.slots&&prefs.slots[slot])||fallback:(prefs.native&&prefs.native[kind])||fallback;};
const metricNames={planned:'Inversión planeada',spend:'Inversión Meta',forms:'Formularios',messages:'Conversaciones',impressions:'Impresiones',reach:'Alcance estimado*',clicks:'Clics en enlace',all_clicks:'Clics totales',ctr:'CTR de enlace',cpm:'CPM calculado',cpl:'Costo / formulario*',cost_message:'Costo / conversación*'};
const metricNotes={planned:'Presupuesto proyectado · plan multicanal',spend:'Gasto Meta Ads · COP supuesto',forms:'Leads de formulario · sin conversaciones',messages:'Eventos de conversación · no leads únicos',impressions:'Impresiones entregadas · Meta Ads',reach:'Estimación Sainsbury · no alcance único observado',clicks:'Clics en enlace · Meta Ads',all_clicks:'Clics totales de Meta Ads',ctr:'Clics de enlace / impresiones',cpm:'Gasto Meta por 1.000 impresiones',cpl:'Gasto Meta / formularios; incluye otros objetivos',cost_message:'Gasto Meta / conversaciones; incluye otros objetivos'};
const metricMoney=new Set(['planned','spend','cpm','cpl','cost_message']);
function metricTotal(rows,key,plan){
 if(key==='planned')return plan;
 const v=i=>add(rows,i),spend=v(0),forms=v(1),messages=v(2),impressions=v(3),clicks=v(4);
 if(key==='spend')return spend;
 if(key==='forms')return forms;
 if(key==='messages')return messages;
 if(key==='impressions')return impressions;
 if(key==='reach')return window.CITROEN_REACH_MATH?.estimate(rows.map(r=>r.v[6]||0),window.CITROEN_REACH_MATH.currentUniverse())??null;
 if(key==='clicks')return clicks;
 if(key==='all_clicks')return v(5);
 if(key==='ctr')return impressions>0?100*clicks/impressions:null;
 if(key==='cpm')return impressions>0?1000*spend/impressions:null;
 if(key==='cpl')return forms>0?spend/forms:null;
 if(key==='cost_message')return messages>0?spend/messages:null;
 return null;
}
function fmtMetric(v,key){return v==null?'—':metricMoney.has(key)?money(v):key==='ctr'?v.toLocaleString('es-CO',{maximumFractionDigits:2})+' %':num(v);}
const planRows=(month,model,includeBerlingo=true)=>state.plan.models.filter(r=>r[0]===months.indexOf(month)&&(!model||norm(r[1])===norm(model))&&(includeBerlingo||norm(r[1])!=='BERLINGO'));
const planValue=(month,mode)=>{
 if(state.territory)return null;
 if(mode==='investment'){const r=planRows(month,state.model);return state.model?(r.length?r.reduce((a,x)=>a+x[2],0):null):state.plan.months[months.indexOf(month)][2];}
 const r=planRows(month,state.model,!!state.model);if(!r.length||r.some(x=>x[3]==null))return null;
 const target=r.reduce((a,x)=>a+(x[3]||0),0),budget=r.reduce((a,x)=>a+x[2],0);
 return mode==='leads'?target:target>0?budget/target:null;
};
async function loadPlan(){
 const b=String(window.CITROEN_PLAN_PACKED||'');
 if(!b)throw Error('No se encontraron proyecciones.');
 const bytes=Uint8Array.from(atob(b),x=>x.charCodeAt(0));
 const txt=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 const p=JSON.parse(txt);
 if(p.schema!=='citroen-planning-2026/v1'||p.months.length!==10||p.models.length!==60)throw Error('Proyecciones incompletas.');
 if(window.CITROEN_PATCH_PLAN)await window.CITROEN_PATCH_PLAN(p);
 return p;
}
function actualData(d,detail){
 if(d.schema!=='citroen-meta-actuals/2026-v1'||detail.schema!==d.schema||d.rows_source!==27840||detail.rows_source!==27840)throw Error('Fuente Meta no válida.');
 const dd=d.dictionaries,dc=detail.dictionaries;
 const rows=d.daily.map(r=>({date:dd.dates[r[0]],month:dd.dates[r[0]].slice(0,7),model:dd.models[r[1]],territory:dd.territories[r[2]],account:dd.accounts[r[3]],platform:'Meta Ads',v:r.slice(4)}));
 const campaigns=detail.campaigns.map(r=>({month:dc.months[r[0]],campaign:dc.campaigns[r[1]],model:dc.models[r[3]],territory:dc.territories[r[4]],account:dc.accounts[r[2]],v:r.slice(5)}));
 if(add(rows,0)!==909508844||add(campaigns,0)!==909508844)throw Error('Los totales de Meta no concilian.');
 return {rows,campaigns};
}
function setKpis(rows){
 const planned=state.territory?null:months.filter(m=>!state.month||state.month===m).reduce((a,m)=>a+(planValue(m,'investment')||0),0);
 const defaults=['planned','spend','forms','messages','cpl','impressions'];
 const icons=['▥','◫','♙','▤','◎','▥'];
 $('c3Kpis').innerHTML=defaults.map((fallback,i)=>{
  const key=configured('slot',i,fallback),value=metricTotal(rows,key,planned);
  const title=key===fallback?(['Inversión planeada','Ejecutado · Meta','Formularios','Conversaciones','Costo / formulario*','Impresiones'][i]):metricNames[key]||metricNames[fallback];
  const note=key==='planned'&&state.territory?'Sin plan territorial comparable':metricNotes[key]||'Meta Ads';
  return '<article class="c3-kpi" data-metric-slot="'+i+'" tabindex="0" title="En modo edición, selecciona esta tarjeta para cambiar su métrica"><div class="c3-kpi-ico">'+icons[i]+'</div><div><h4>'+esc(title)+'</h4><strong title="'+esc(fmtMetric(value,key))+'">'+fmtMetric(value,key)+'</strong><small class="muted">'+esc(note)+'</small></div></article>';
 }).join('');
 $('c3Context').textContent=(state.month?labels[months.indexOf(state.month)]+' 2026':'Enero–octubre de 2026')+' · '+(state.model||'Todos los modelos')+' · '+(state.territory||'Cobertura completa')+' · octubre contiene resultados hasta el 20/10. Cifras reales, no las de la maqueta.';
}
function comparison(rows){
 const selected=configured('compareMetric','metric',state.metric);state.metric=selected;
 const theme=window.CITROEN_STYLE_EDITOR?.get("n:c3ComparePanel")||{},chartMode=theme.chartType||"bar",showLabels=theme.showLabels===true;
  const periods=months.filter(m=>!state.month||state.month===m);
 const series=periods.map(m=>{const d=rows.filter(r=>r.month===m),k=state.metric,which=k==='investment'?'spend':k==='leads'?'forms':k;return {month:m,label:labels[months.indexOf(m)],planned:['investment','leads','cpl'].includes(k)?planValue(m,k):null,actual:metricTotal(d,which,null)};});
 const max=Math.max(1,...series.flatMap(s=>[s.planned||0,s.actual||0]));
 const w=840,h=219,l=51,r=16,t=22,b=32,pw=w-l-r,ph=h-t-b,step=pw/series.length,bw=Math.min(20,step*.28);
 const y=v=>t+ph-(Math.max(0,v||0)/max)*ph;
 const ticks=[0,.25,.5,.75,1].map(z=>`<line x1="${l}" x2="${w-r}" y1="${t+ph*(1-z)}" y2="${t+ph*(1-z)}" stroke="#e7eff4"/><text x="${l-7}" y="${t+ph*(1-z)+4}" text-anchor="end" font-size="10" fill="#809aac">${short(max*z)}</text>`).join('');
 const bar=series.map((s,i)=>{
   const x=l+step*(i+.5);
   let ret='';
   if(s.planned!=null)ret+=`<rect x="${x-bw-3}" y="${y(s.planned)}" height="${Math.max(0,t+ph-y(s.planned))}" width="${bw}" rx="2" fill="#a9d4eb"><title>${s.label} planeado: ${state.metric==='leads'?num(s.planned):money(s.planned)}</title></rect>`;
   if(s.actual!=null)ret+=`<rect x="${x+3}" y="${y(s.actual)}" height="${Math.max(0,t+ph-y(s.actual))}" width="${bw}" rx="2" fill="${s.month==='2026-10'?'url(#c3hatch)':'#f46b74'}"><title>${s.label} Meta: ${['investment','cpl','cpm','cost_message'].includes(state.metric)?money(s.actual):state.metric==='ctr'?fmtMetric(s.actual,'ctr'):num(s.actual)}${s.month==='2026-10'?' (parcial)':''}</title></rect>`;
   return ret+`<text x="${x}" y="${h-7}" text-anchor="middle" font-size="11" font-weight="700" fill="#7896aa">${s.label.toUpperCase()}${s.month==='2026-10'?'*':''}</text>`;
 }).join('');
 let visual=bar;
 if(chartMode==="line"||chartMode==="area"){
  const points=(key)=>series.map((a,i)=>a[key]==null?null:[l+step*(i+.5),y(a[key])]).filter(Boolean);
  visual=series.map((x,i)=>'<text x="'+(l+step*(i+.5))+'" y="'+(h-7)+'" text-anchor="middle" font-size="11" font-weight="700" fill="#7896aa">'+x.label.toUpperCase()+(x.month==='2026-10'?'*':'')+'</text>').join('');
  for(const [k,col] of [["planned","#a9d4eb"],["actual","#f46b74"]]){
   const pts=points(k);if(pts.length<2)continue;
   const coords=pts.map(p=>p.join(",")).join(" ");
   if(chartMode==="area")visual+='<polygon points="'+pts[0][0]+','+(t+ph)+' '+coords+' '+pts[pts.length-1][0]+','+(t+ph)+'" fill="'+col+'" opacity=".15"/>';
   visual+='<polyline points="'+coords+'" stroke="'+col+'" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/>';
   visual+=pts.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5" fill="'+col+'"/>').join('');
  }
 }
 if(showLabels){
  visual+=series.map((v,i)=>{
   const x=l+step*(i+.5),items=[];
   if(v.planned!=null)items.push('<text x="'+(x-(chartMode==="bar"?bw+3:0))+'" y="'+Math.max(12,y(v.planned)-8)+'" font-size="9" text-anchor="middle" fill="#a9d4eb">'+short(v.planned)+'</text>');
   if(v.actual!=null)items.push('<text x="'+(x+(chartMode==="bar"?bw+3:0))+'" y="'+Math.max(12,y(v.actual)-8)+'" font-size="9" text-anchor="middle" fill="#f46b74">'+short(v.actual)+'</text>');
   return items.join("");
  }).join("");
 }
 let path='';
 if(chartMode==="bar"&&state.metric==='investment'&&!state.territory){
   const pts=series.map((s,i)=>s.planned>0?{x:l+step*(i+.5),coverage:s.actual/s.planned}:null).filter(Boolean);
   const topRatio=Math.max(1.1,...pts.map(p=>p.coverage));
   if(pts.length>1)path=`<polyline fill="none" stroke="#173b58" stroke-width="2" points="${pts.map(p=>p.x+','+(t+ph*(1-p.coverage/topRatio))).join(' ')}"/>`+pts.map(p=>`<circle cx="${p.x}" cy="${t+ph*(1-p.coverage/topRatio)}" r="3.8" stroke="#fff" stroke-width="1" fill="#163d59"><title>Meta/plan: ${(p.coverage*100).toFixed(1)}% del presupuesto, no cumplimiento total</title></circle>`).join('');
 }
 $('c3CompareChart').innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Planeado contra ejecutado, alcance de Meta Ads"><defs><pattern id="c3hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#fae0e3"/><rect width="3" height="7" fill="#ef7780"/></pattern></defs>${ticks}${visual}${path}</svg>`;
 const notes={
 impressions:'Meta Ads: impresiones reales por mes. No hay plan comparable de impresiones.',
 reach:'Alcance ESTIMADO con Sainsbury y universo configurado, no usuarios únicos medidos ni meta comparable.',
 clicks:'Meta Ads: clics en enlace, sin meta homologada.',
 all_clicks:'Meta Ads: clics totales, sin meta homologada.',
 forms:'Meta Ads: formularios, no necesariamente el mismo objetivo comercial del plan.',
 messages:'Meta Ads: conversaciones, distintas de formularios.',
 ctr:'CTR = clics enlace / impresiones; sin proyección equivalente.',
 cpm:'CPM = gasto Meta / impresiones × 1.000.',
 cost_message:'Gasto Meta / conversaciones; no representa CPL de negocio.',
 investment:state.territory?'El plan no se puede desagregar por esta geografía inferida. Se muestra ejecución Meta únicamente.':'Barras azules: plan general. Rojas: Meta ejecutado. Línea: proporción Meta/plan, NO cumplimiento total. *Octubre parcial.',
 leads:'Azul: metas comerciales del plan si son completas. Rojo: formularios de Meta. Las definiciones son distintas y no equivalen a cumplimiento. *Octubre parcial.',
 cpl:'Azul: CPL planificado (portafolio: cinco modelos sin Berlingo). Rojo: gasto total Meta / formularios; incluye WhatsApp y no es un CPL comercial comparable.'
 };
 $('c3CompareNote').textContent=state.metric==='reach'&&!window.CITROEN_REACH_MATH?.currentUniverse()
  ?'Sin universo de audiencia configurado: no se muestra estimación Sainsbury. Configúralo en Propiedades del gráfico.'
  :notes[state.metric]||'Datos de Meta Ads, no ejecución global del plan.';
}
function funnel(rows){
 const first=configured('funnelMetric','metric','impressions'),isReach=first==='reach';
 const base=isReach?metricTotal(rows,'reach',null):add(rows,3),clicks=add(rows,4),forms=add(rows,1),messages=add(rows,2);
 const ratio=(a,b)=>b>0?(100*a/b).toLocaleString('es-CO',{maximumFractionDigits:2})+' %':'—';
 $('c3Funnel').innerHTML='<div class="c3-funnel-stages">'+[
  [short(base),isReach?'Alcance estimado*':'Impresiones',''],[num(clicks),'Clics enlace',''],[num(forms),'Formularios',''],[num(messages),'Conversaciones','action']
 ].map(v=>'<div class="c3-funnel-step '+v[2]+'"><span><b>'+v[0]+'</b><small>'+v[1]+'</small></span></div>').join('')+'</div><div class="c3-funnel-rate">'+[
  [isReach?'Clics / alcance estimado*':'CTR de enlace',ratio(clicks,base)],['Formularios / clics*',ratio(forms,clicks)],['Conversaciones / clics*',ratio(messages,clicks)]
 ].map(v=>'<div><span>'+v[0]+'</span><b>'+v[1]+'</b></div>').join('')+'</div>';
 $('c3FunnelPanel').querySelector('.c3-funnel-foot').textContent=isReach?'*Sainsbury es estimación, no usuarios únicos observados. Requiere universo configurado. Clics/alcance estimado no es CTR.':'Formularios y conversaciones son resultados paralelos: no se deben sumar como leads únicos.';
}
function models(rows){
 $('c3Models').innerHTML=cars.map(m=>{
 const selected=rows.filter(r=>norm(r.model)===norm(m.model)),form=add(selected,1),spend=add(selected,0),modelMetric=configured('modelsMetric','metric','forms'),metricValue=metricTotal(selected,modelMetric,null);
 return `<article class="c3-model-card"><div class="c3-model-top"><div><h4>${m.name}</h4><p>${m.desc}</p></div><button class="c3-model-visit" type="button" data-model="${esc(m.model)}" aria-label="Filtrar ${m.name}">›</button></div><div class="c3-model-photo"><span>${m.model}</span><img loading="lazy" src="${esc(m.src)}" data-backup="${esc(m.backup)}" alt="${m.name} — fotografía real"></div><div class="c3-model-data"><div><b>${fmtMetric(metricValue,modelMetric)}</b><span>${esc(metricNames[modelMetric]||'Formularios')}</span><small>${modelMetric==='reach'?'Sainsbury · estimado':'Meta 2026'}</small></div><div><b>${form>0?money(spend/form):'—'}</b><span>Gasto / form.</span><small>Indicativo*</small></div></div></article>`;
 }).join('');
 for(const btn of $('c3Models').querySelectorAll('[data-model]'))btn.onclick=()=>{state.model=btn.dataset.model;$('c3Model').value=state.model;render();$('c3ComparePanel').scrollIntoView({behavior:'smooth',block:'center'});};
 for(const img of $('c3Models').querySelectorAll('img'))img.onerror=()=>{if(img.dataset.backup){img.src=img.dataset.backup;img.dataset.backup='';}else img.style.display='none';};
}
function campaigns(){
 const key=configured('campaignsMetric','metric','spend');
 const rows=filter(state.campaigns).sort((a,b)=>(metricTotal([b],key,null)||0)-(metricTotal([a],key,null)||0)).slice(0,4);
 const th=$('c3CampaignPanel').querySelector('.c3-campaign-table thead th:nth-child(3)');
 if(th)th.textContent=metricNames[key]||'Inversión';
 $('c3Campaigns').innerHTML=rows.length?rows.map(r=>{
  const name=r.campaign.replace(/^\d{4}_colombia_citroen_/i,'');
  return '<tr><td title="'+esc(r.campaign)+'">'+esc(name.slice(0,33))+(name.length>33?'…':'')+'</td><td>'+esc(r.model)+'</td><td>'+fmtMetric(metricTotal([r],key,null),key)+'</td><td>'+num(r.v[1])+'</td><td>'+(r.v[1]>0?money(r.v[0]/r.v[1]):'—')+'</td></tr>';
 }).join(''):'<tr><td colspan="5">Sin campañas para esta selección.</td></tr>';
}
function insights(rows){
 if(!rows.length){$('c3Insights').innerHTML='<p>Sin información para los filtros seleccionados.</p>';return;}
 const bag=new Map();for(const r of rows){const x=bag.get(r.model)||0;bag.set(r.model,x+r.v[1]);}
 const lead=[...bag].sort((a,b)=>b[1]-a[1])[0];
 const sections=[
 ['Modelo con más formularios',`${lead[0]} registra ${num(lead[1])} formularios en esta selección.`],
 ['Conversaciones diferenciadas',`${num(add(rows,2))} conversaciones y ${num(add(rows,1))} formularios: no son contactos únicos sumables.`],
 ['Análisis de cumplimiento',state.territory?'Sin meta regional homologada; los territorios de Meta se infieren de la nomenclatura.':'Meta Ads es parte del plan multicanal. La brecha no indica presupuesto pendiente.']
 ];
 $('c3Insights').innerHTML=sections.map((x,i)=>`<div class="c3-insight"><span class="n">${i+1}</span><div><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div></div>`).join('');
}
function render(){
 if(!state.ready)return;
 const rows=filter(state.rows);
 setKpis(rows);
 comparison(window.CITROEN_FILTER_ENGINE?.filter(rows,'resumen','n:c3ComparePanel')||rows);
 funnel(window.CITROEN_FILTER_ENGINE?.filter(rows,'resumen','n:c3FunnelPanel')||rows);
 models(window.CITROEN_FILTER_ENGINE?.filter(rows,'resumen','n:c3ModelsPanel')||rows);
 campaigns();insights(rows);document.dispatchEvent(new Event('citroen:summary-rendered'));
}
function wire(){
 if(!$('c3Dashboard'))return;
 const hero=$('c3HeroCar');hero.src=cars[2].src;hero.onerror=()=>{if(!hero.dataset.tried){hero.dataset.tried='yes';hero.src=cars[2].backup;}else{hero.style.display='none';hero.parentElement.classList.add('no-photo');}};
 $('c3Explore').onclick=()=>$('c3ComparePanel').scrollIntoView({behavior:'smooth',block:'center'});
 for(const btn of document.querySelectorAll('[data-c3-jump]'))btn.onclick=()=>{const nav=document.querySelector('.nav-link[data-target="'+btn.dataset.c3Jump+'"]');if(nav)nav.click();};
 for(const [id,key] of [['c3Month','month'],['c3Model','model'],['c3Territory','territory']])$(id).onchange=e=>{state[key]=e.target.value;render();};
 for(const b of document.querySelectorAll('[data-c3-metric]'))b.onclick=()=>{state.metric=b.dataset.c3Metric;for(const el of document.querySelectorAll('[data-c3-metric]'))el.classList.toggle('active',el===b);render();};
 document.addEventListener('citroen:metric-settings',()=>{state.metric=configured('compareMetric','metric','investment');document.querySelectorAll('[data-c3-metric]').forEach(el=>el.classList.toggle('active',el.dataset.c3Metric===state.metric));render();});
 document.addEventListener('citroen:style-settings',()=>{if(state.ready)render();});
 document.addEventListener('citroen:advanced-filter-changed',()=>{if(state.ready)render();});
 Promise.all([
 loadPlan(),
 fetch('./data/meta_2026_daily.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Reporte diario no disponible.');return r.json();}),
 fetch('./data/meta_2026_detail.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Detalle de campañas no disponible.');return r.json();})
 ]).then(([plan,daily,detail])=>{
 const actual=actualData(daily,detail);state.plan=plan;state.rows=actual.rows;state.campaigns=actual.campaigns;
 $('c3Month').innerHTML=opt('','2026 · Ene–Oct')+months.map((m,i)=>opt(m,labels[i]+' 2026')).join('');
 $('c3Model').innerHTML=opt('','Todos los modelos')+[...new Set([...plan.models.map(r=>r[1]),...state.rows.map(r=>r.model)])].sort().map(m=>opt(m,m)).join('');
 $('c3Territory').innerHTML=opt('','Todos los territorios')+[...new Set(state.rows.map(r=>r.territory))].sort().map(t=>opt(t,t)).join('');
 state.ready=true;render();
 }).catch(e=>{console.error('Concept 3:',e);$('c3Context').textContent='No se pudieron cargar las fuentes: '+e.message;});
}
document.addEventListener('DOMContentLoaded',wire);
})();