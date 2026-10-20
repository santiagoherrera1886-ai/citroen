(function planning(){
  'use strict';
  const $=id=>document.getElementById(id);
  const fmt=new Intl.NumberFormat('es-CO',{maximumFractionDigits:0});
  const cop=new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
  const num=x=>x==null?'—':fmt.format(x),money=x=>x==null?'—':cop.format(x);
  const short=x=>x==null?'—':x>=1000000?fmt.format(x/1000000)+' M':fmt.format(x/1000)+' mil';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let data=null,filteredLines=[],realRows=[];
  const dictionaryIndexes=[1,3,4,5,6,7,9];
  async function unpack(){
    const encoded=String(window.CITROEN_PLAN_PACKED||'').replace(/\s/g,'');
    if(!encoded)throw Error('Falta el archivo de presupuestos.');
    if(!('DecompressionStream' in window))throw Error('El navegador debe tener soporte para gzip.');
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const parsed=JSON.parse(raw);
    if(parsed.schema!=='citroen-planning-2026/v1'||parsed.months.length!==10||parsed.lines.length!==551||parsed.models.length!==60)throw Error('La estructura de proyecciones no coincide con el consolidado.');
    parsed.lines=parsed.lines.map(row=>{row=[...row];dictionaryIndexes.forEach(i=>row[i]=parsed.lineDictionaries[String(i)][row[i]]);return row;});
    const total=parsed.months.reduce((v,m)=>v+m[2],0);
    if(Math.abs(total-944266850.42)>2)throw Error('Error de conciliación del total base.');
    return parsed;
  }
  function opts(id,values,label){$(id).innerHTML='<option value="">'+esc(label)+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');}
  function initFilters(){
    opts('planMonth',data.months.map(m=>m[0]),'Enero – Octubre');
    for(const o of $('planMonth').options){const m=data.months.find(x=>x[0]===o.value);if(m)o.textContent=m[1];}
    opts('planModel',[...new Set(data.models.map(r=>r[1]))].sort(),'Todo el portafolio');
    opts('planRegion',[...new Set(data.lines.map(r=>r[5]).filter(Boolean))].sort(),'Todas las regiones');
    opts('planType',[...new Set(data.lines.map(r=>r[4]).filter(Boolean))].sort(),'Todos los tipos');
  }
  function f(){return {month:$('planMonth').value,model:$('planModel').value,region:$('planRegion').value,type:$('planType').value,search:$('planSearch').value.toLowerCase().trim()};}
  const sum=(arr,i)=>arr.reduce((a,r)=>a+(r[i]||0),0);
  function totals(filter){
    const months=data.months.filter(m=>!filter.month||m[0]===filter.month);
    const ids=new Set(months.map(m=>data.months.indexOf(m)));
    const models=data.models.filter(m=>ids.has(m[0])&&(!filter.model||m[1]===filter.model));
    const passengers=models.filter(m=>m[1]!=='BERLINGO');
    return {months,models,budget:filter.model?sum(models,2):sum(months,2),leads:sum(models,3),
      incomplete:models.some(m=>m[3]===null),passengerBudget:sum(passengers,2),passengerLeads:sum(passengers,3),berlingoBudget:sum(models.filter(m=>m[1]==='BERLINGO'),2)};
  }
  function kpis(filter){
    const t=totals(filter),isModel=!!filter.model;
    $('planPreviewTotal').textContent=money(sum(data.months,2));
    const cpl=isModel?(t.incomplete||t.leads<=0?null:t.budget/t.leads):(t.passengerLeads>0?t.passengerBudget/t.passengerLeads:null);
    const items=[
      ['PRESUPUESTO BASE',money(t.budget),isModel?'Inversión prevista · '+filter.model:'Incluye Berlingo una sola vez',true],
      ['LEADS META CONOCIDOS',num(t.leads),t.incomplete?'Parcial · sin meta Berlingo de enero':'Metas informadas por el plan'],
      [isModel?'CPL PROYECTADO':'CPL CINCO MODELOS',money(cpl),isModel?(t.incomplete?'No calculable: falta una meta':'Inversión / leads proyectados'):'Excluye Berlingo para un alcance consistente'],
      ['PRESUPUESTO BERLINGO',money(t.berlingoBudget),'Sin sumar dos veces el mismo presupuesto']
    ];
    $('planKpis').innerHTML=items.map(x=>'<article class="plan-kpi '+(x[3]?'accent':'')+'"><small>'+x[0]+'</small><strong>'+x[1]+'</strong><span>'+esc(x[2])+'</span></article>').join('');
    $('planOverviewNote').textContent='Alcance: '+t.months.map(m=>m[1]).join(', ')+' · '+(filter.model||'Todo el portafolio')+'. Los filtros de región y tipo afectan el desglose territorial, no modifican el total del seguimiento.';
  }
  function chartBars(arr,note){
    arr=arr.filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,9);
    if(!arr.length)return '<div class="empty-state"><div class="empty-logo">ë</div><b>Sin detalle disponible</b><span>Este filtro no devuelve filas.</span></div>';
    const max=Math.max(...arr.map(x=>x.value),1);
    return '<div class="plan-section-bars">'+arr.map(x=>'<div class="plan-bar"><label title="'+esc(x.name)+'">'+esc(x.name)+'</label><div class="plan-bar-track"><div class="plan-bar-fill" style="width:'+x.value/max*100+'%"></div></div><b>'+short(x.value)+'</b></div>').join('')+'</div><p class="plan-bar-note">'+esc(note)+'</p>';
  }
  function renderTimeline(filter){
    const t=totals(filter),bars=t.months.map(m=>{const i=data.months.indexOf(m);return {label:m[1].slice(0,3),value:filter.model?sum(t.models.filter(x=>x[0]===i),2):m[2]};});
    const max=Math.max(...bars.map(x=>x.value),1);
    $('planTimeline').innerHTML='<div class="plan-month-chart">'+bars.map((x,i)=>'<div class="plan-month-col '+(i===bars.length-1?'highlight':'')+'"><span class="amount">'+short(x.value)+'</span><div class="column" style="height:'+Math.max(5,Math.round(x.value/max*155))+'px"></div><small>'+esc(x.label)+'</small></div>').join('')+'</div><p class="plan-chart-note">Serie de presupuesto planificado. No es inversión ejecutada.</p>';
    const byModel=[...new Set(t.models.map(x=>x[1]))].map(name=>({name,value:sum(t.models.filter(x=>x[1]===name),2)}));
    $('planModelsChart').innerHTML=chartBars(byModel,'El gasto por modelo se cuenta una sola vez y corresponde al escenario base seleccionado.');
  }
  function groupBudget(rows,index){
    const d=new Map();rows.forEach(r=>{const label=String(r[index]||'No declarado');d.set(label,(d.get(label)||0)+r[8]);});
    return [...d].map(([name,value])=>({name,value}));
  }
  function detail(filter){
    const common=data.lines.filter(r=>(!filter.month||data.months[r[0]][0]===filter.month)&&(!filter.model||r[7]===filter.model));
    const subset=common.filter(r=>(!filter.region||r[5]===filter.region)&&(!filter.type||r[4]===filter.type));
    $('planRegionsChart').innerHTML=chartBars(groupBudget(subset,5),'Regiones tal como figuran en las estructuras originales; no son indicadores de alcance.');
    $('planTypeChart').innerHTML=chartBars(groupBudget(subset,4),'Tipos de campaña tal como aparecen en el plan, no resultados ejecutados por medio.');
    filteredLines=subset.filter(r=>[r[3],r[4],r[5],r[6],r[7]].some(v=>String(v||'').toLowerCase().includes(filter.search)));
    $('planDetailCount').textContent=num(filteredLines.length)+' de '+num(data.lines.length)+' FILAS';
    $('planDetailBudget').textContent='Desglose filtrado: '+money(sum(filteredLines,8));
    $('planDetailRows').innerHTML=filteredLines.length?filteredLines.slice(0,120).map(r=>'<tr><td>'+esc(data.months[r[0]][1])+'</td><td title="'+esc(r[3])+'">'+esc(r[3])+'</td><td>'+esc(r[4])+'</td><td>'+esc(r[5])+'</td><td>'+esc(r[6])+'</td><td>'+esc(r[7])+'</td><td>'+money(r[8])+'</td><td>'+esc(r[1]+'!'+r[9])+'</td></tr>').join(''):'<tr><td colspan="8" class="table-empty">No hay líneas de estructura para esta selección.</td></tr>';
  }
  function realForMonth(filter,month){
    const r=realRows.filter(row=>row.fecha?.slice(0,7)===month&&(!filter.model||String(row.modelo).toLowerCase()===filter.model.toLowerCase()));
    const spend=r.map(x=>x.inversion).filter(x=>x!=null),leads=r.map(x=>x.leads).filter(x=>x!=null);
    return {spend:spend.length?spend.reduce((a,b)=>a+b,0):null,leads:leads.length?leads.reduce((a,b)=>a+b,0):null};
  }
  function comparison(filter){
    const t=totals(filter);
    $('planRealState').textContent=realRows.length?'REALES IMPORTADOS · NO AUDITADOS':'REAL SIN FUENTE';
    $('planComparison').innerHTML=t.months.map(m=>{
      const i=data.months.indexOf(m),models=t.models.filter(r=>r[0]===i);
      const plan=filter.model?sum(models,2):m[2],lead=sum(models,3),complete=!models.some(x=>x[3]===null);
      const real=realForMonth(filter,m[0]),delta=real.spend!=null&&plan>0?(real.spend/plan-1)*100:null;
      const cp=complete&&lead>0?plan/lead:null,cr=real.spend!=null&&real.leads>0?real.spend/real.leads:null;
      return '<tr><td>'+esc(m[1])+'</td><td>'+money(plan)+'</td><td>'+money(real.spend)+'</td><td>'+(delta==null?'—':(delta>0?'+':'')+delta.toFixed(1)+' %')+'</td><td>'+num(lead)+(complete?'':' *')+'</td><td>'+num(real.leads)+'</td><td>'+money(cp)+'</td><td>'+money(cr)+'</td></tr>';
    }).join('');
  }
  function quality(filter){
    const relevant=data.months.filter(x=>!filter.month||x[0]===filter.month);
    const checks=relevant.map(m=>{
      const i=data.months.indexOf(m),raw=data.lines.filter(r=>r[0]===i),difference=m[2]-sum(raw,8);
      return Math.abs(difference)<.5?null:['MEDIA',m[1],'Conciliación de estructura',`Presupuesto base ${money(m[2])}; filas del desglose ${money(sum(raw,8))}; diferencia ${money(difference)} (principalmente Berlingo no detallado).`];
    }).filter(Boolean);
    const qa=[...checks,...data.quality];
    $('planAlerts').innerHTML=qa.map(a=>'<div class="audit-item"><span class="audit-severity '+(a[0]==='ALTA'?'':'med')+'">'+esc(a[0])+'</span><span class="when">'+esc(a[1])+'</span><div><strong>'+esc(a[2])+'</strong><p>'+esc(a[3])+'</p></div></div>').join('');
  }
  function render(){if(!data)return;const filter=f();kpis(filter);renderTimeline(filter);detail(filter);comparison(filter);quality(filter);}
  function csvCell(v){let s=String(v??'');if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function exportFiltered(){
    if(!filteredLines.length){alert('No hay líneas para exportar.');return;}
    const headers=['Mes','Hoja','Fila origen','Campaña','Tipo','Región','Conjunto','Modelo','Presupuesto COP','Celda origen'];
    const csv='\uFEFF'+[headers.join(';'),...filteredLines.map(r=>[data.months[r[0]][1],...r.slice(1)].map(csvCell).join(';'))].join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download='citroen_planeacion_2026_detalle.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function wire(){
    if(!$('planMonth'))return;
    ['planMonth','planModel','planRegion','planType'].forEach(id=>$(id).onchange=render);
    $('planSearch').oninput=render;
    $('planReset').onclick=()=>{['planMonth','planModel','planRegion','planType','planSearch'].forEach(id=>$(id).value='');render();};
    $('planExport').onclick=exportFiltered;
    document.addEventListener('citroen:real-data',e=>{realRows=Array.isArray(e.detail?.rows)?e.detail.rows:[];render();});
    unpack().then(v=>{data=v;initFilters();render();}).catch(e=>{
      $('planOverviewNote').textContent='No fue posible abrir los presupuestos: '+e.message;
      for(const id of ['planKpis','planTimeline','planModelsChart','planRegionsChart','planTypeChart','planComparison','planDetailRows','planAlerts'])$(id).innerHTML='<div class="empty-state"><b>Paquete de datos no disponible</b><span>Revisa la carga de data/proyecciones_2026.js.</span></div>';
    });
  }
  document.addEventListener('DOMContentLoaded',wire);
})();