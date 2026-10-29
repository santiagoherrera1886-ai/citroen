/* Canonical Excel audit integration, built from the 10 user-provided 2026 files.
 * No fictional delivery, outcomes or approval assumptions.
 */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const format=new Intl.NumberFormat('es-CO',{maximumFractionDigits:0});
  const currency=new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
  const n=x=>x==null?'—':format.format(x);
  const cop=x=>x==null?'—':currency.format(x);
  const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre'];
  const monthNo=s=>Number(String(s).slice(-2))-1;
  const sum=(arr,fn)=>arr.reduce((a,x)=>a+(fn(x)||0),0);
  const within=(a,b)=>Math.abs(a-b)<2;
  const audit=window.CITROEN_AUDIT_2026;
  if(window.CITROEN_PATCH_AUDIT)window.CITROEN_PATCH_AUDIT(audit);
  let packed=null;
  function integrity(){
    if(!audit||audit.schema!=='citroen-audit-originals-2026/v2')throw Error('Falta el archivo auditado: data/auditoria_2026.js.');
    if(audit.months.length!==10||audit.alerts.length<20||audit.scenarios.length!==6)throw Error('La auditoría no contiene el detalle completo de los 10 libros.');
    if(!within(sum(audit.months,x=>x[1]),1086316554.45))throw Error('El presupuesto no concilia con la auditoría.');
    if(!within(sum(audit.months,x=>x[2]),986485356.45))throw Error('El presupuesto de pasajeros no concilia.');
    if(!within(sum(audit.months,x=>x[3]),99831198))throw Error('El presupuesto Berlingo no concilia.');
  }
  async function loadPacked(){
    const code=String(window.CITROEN_PLAN_PACKED||'').replace(/\s/g,'');
    if(!code)throw Error('Falta el detalle planificado por modelo.');
    if(!('DecompressionStream' in window))throw Error('Navegador sin soporte para datos comprimidos.');
    const bytes=Uint8Array.from(atob(code),c=>c.charCodeAt(0));
    const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const obj=JSON.parse(text);
    if(obj.schema!=='citroen-planning-2026/v1'||obj.models?.length!==60)throw Error('No coinciden las 60 metas modelo-mes y 551 líneas principales.');
    if(window.CITROEN_PATCH_PLAN)await window.CITROEN_PATCH_PLAN(obj);
    obj.models.forEach(x=>{const mi=x[0];if(mi<0||mi>9)throw Error('Mes inválido en modelo.');});
    for(let i=0;i<10;i++){
      const m=audit.months[i], p=obj.months[i], models=obj.models.filter(row=>row[0]===i);
      if(m[0]!==p[0]||models.length!==6)throw Error('No coincide la lista de modelos del mes '+(i+1));
      if(!within(m[1],p[2])||!within(m[2],p[4])||!within(m[3],p[6]))throw Error('Diferencia de presupuesto detectada en '+names[i]+'.');
      if(!within(sum(models,row=>row[2]),m[1]))throw Error('Modelos no concilian en '+names[i]+'.');
      const passengerLeads=sum(models.filter(row=>row[1]!=='BERLINGO'),row=>row[3]);
      if(Math.abs(passengerLeads-m[4])>.1)throw Error('Metas de pasajeros no concilian en '+names[i]+'.');
      const brl=models.find(row=>row[1]==='BERLINGO');
      if(m[5]!=null&&Math.abs((brl[3]||0)-m[5])>.1)throw Error('Meta Berlingo no concilia en '+names[i]+'.');
      // 551 ESTRUCTURA + one external source per month for Jan-Jun.
      const x=obj.lines.filter(row=>row[0]===i);
      const details=sum(x,row=>row[8])+(i<6?m[3]:0);
      if(!within(details,m[1])&&i!==4)throw Error('Estructura no concilia con anexos Berlingo en '+names[i]+'.');
    }
    return obj;
  }
  function monthsView(){
    const f=$('auditMonth').value;
    const rows=audit.months.filter(m=>!f||m[0]===f);
    $('auditMonthRows').innerHTML=rows.map(m=>{
      const i=monthNo(m[0]),botBer=i>=5,leads=m[5];
      return '<tr><td><b>'+names[i]+'</b></td><td class="cit-audit-emph">'+cop(m[1])+'</td><td>'+cop(m[2])+'</td><td>'+cop(m[3])+'</td>'+
        '<td>'+n(m[4])+'</td><td>'+n(leads)+(leads==null?' <span title="Meta no verificable">⚠</span>':'')+'</td><td>'+n(m[6])+'</td>'+
        '<td><span class="cit-audit-scope">'+(botBer?'Incluye Berlingo':'Solo pasajeros')+'</span></td><td title="'+safe(m[7])+'">'+safe(m[7])+'</td></tr>';
    }).join('');
  }
  function modelView(){
    if(!packed)return;
    const f=$('auditMonth').value;
    const rows=packed.models.filter(row=>!f||audit.months[row[0]][0]===f);
    $('auditModelCount').textContent=n(rows.length)+' REGISTROS';
    $('auditModelRows').innerHTML=rows.map(r=>{
      const ratio=r[3]>0?cop(r[2]/r[3]):'—';
      return '<tr><td>'+names[r[0]]+'</td><td><b>'+safe(r[1])+'</b></td><td>'+cop(r[2])+'</td>'+
        '<td>'+n(r[3])+(r[3]==null?' · pendiente':'')+'</td><td>'+ratio+'</td><td>'+safe(r[4])+'</td><td>'+safe(r[5])+'</td></tr>';
    }).join('');
  }
  function scenarioView(){
    const f=$('auditMonth').value;
    const rows=audit.scenarios.filter(r=>!f||r[0]===names[monthNo(f)].toUpperCase());
    const base=sum(audit.months,m=>m[1]),extra=13500000;
    $('auditScenarioBase').textContent=cop(base);$('auditScenarioExtra').textContent=cop(extra);$('auditScenarioTotal').textContent=cop(base+extra);
    $('auditScenarioList').innerHTML=rows.map((r,i)=>'<div class="cit-scenario"><div class="cit-scenario-tag">'+safe(r[1])+'</div>'+
       '<div><b>'+safe(r[0])+' · '+safe(r[2])+'</b><p>'+safe(r[4])+'</p></div><strong>'+ (typeof r[3]==='number'?cop(r[3]):safe(r[3]))+'</strong></div>').join('')||'<p class="cit-audit-empty">Este mes no tiene un escenario alternativo documentado.</p>';
  }
  function alertsView(){
    const f=$('auditMonth').value,prio=$('auditSeverity').value;
    const thisMonth=f?names[monthNo(f)].toUpperCase():null;
    const rows=audit.alerts.filter(r=>(!prio||r[0]===prio)&&(!thisMonth||r[1]===thisMonth||r[1]==='TODOS'||(thisMonth==='SEPTIEMBRE'||thisMonth==='OCTUBRE')&&r[1]==='SEP–OCT'));
    $('auditAlertCount').textContent=n(rows.length)+' DE '+audit.alerts.length+' ALERTAS';
    $('auditAlertList').innerHTML=rows.map((r,i)=>
       '<div class="cit-audit-issue"><span class="cit-issue-severity '+(r[0]==='Alta'?'high':r[0]==='Media'?'mid':'info')+'">'+safe(r[0])+'</span>'+
       '<div><div class="cit-issue-heading"><strong>'+safe(r[2])+'</strong><span>'+safe(r[1])+'</span></div><code>'+safe(r[3])+'</code><p>'+safe(r[4])+'</p><small>Acción: '+safe(r[5])+'</small></div></div>'
    ).join('')||'<p class="cit-audit-empty">No existen alertas de este tipo para la selección.</p>';
  }
  function renderAll(){
    monthsView();modelView();scenarioView();alertsView();
    const key=$('auditView').value;
    document.querySelectorAll('[data-audit-panel]').forEach(p=>{p.hidden=p.dataset.auditPanel!==key;});
    $('auditStatus').textContent='Auditoría de proyecciones · 10 libros revisados · 60 filas modelo-mes · '+(packed?.lines?.length+6||'')+' asignaciones · '+audit.alerts.length+' alertas. Mayo presenta $992.624 pendientes de conciliación.';
  }
  function stats(){
    const m=audit.months;
    const rows=[
      ['Inversión base',cop(sum(m,x=>x[1])),'COP · escenario sujeto a confirmar versiones'],
      ['Cinco modelos',cop(sum(m,x=>x[2])),'Presupuesto de pasajeros'],
      ['Berlingo',cop(sum(m,x=>x[3])),'Una sola vez por mes'],
      ['Leads comparables',n(sum(m,x=>x[4])),'Cinco modelos, enero–octubre'],
      ['Leads BOT (mixtos)',n(sum(m,x=>x[6])),'El alcance cambia desde junio'],
      ['Hallazgos',n(audit.alerts.length),'Fórmulas, escenarios y cobertura']
    ];
    $('auditStats').innerHTML=rows.map((r,i)=>'<article class="cit-audit-stat '+(i===0?'important':'')+'"><small>'+safe(r[0])+'</small><strong>'+r[1]+'</strong><span>'+safe(r[2])+'</span></article>').join('');
    $('auditBaseHero').textContent=cop(sum(m,x=>x[1]));
    $('auditSources').innerHTML=audit.sources.map((src,i)=>{
      const who=audit.months[i];
      return '<div class="cit-audit-source"><span>'+String(i+1).padStart(2,'0')+'</span><div><b>'+safe(src)+'</b><small>'+safe(who[7])+'</small><small>Berlingo: '+safe(who[8])+'</small></div></div>';
    }).join('');
  }
  function go(section){document.querySelector('.nav-link[data-target="'+section+'"]')?.click();}
  function wire(){
    if(!$('auditMonth'))return;
    try{integrity();}catch(e){$('auditStatus').textContent=e.message;return;}
    $('auditMonth').innerHTML='<option value="">Todos los meses</option>'+audit.months.map((m,i)=>'<option value="'+safe(m[0])+'">'+names[i]+'</option>').join('');
    ['auditMonth','auditSeverity','auditView'].forEach(id=>$(id).addEventListener('change',renderAll));
    $('auditReset').onclick=()=>{$('auditMonth').value='';$('auditSeverity').value='';$('auditView').value='months';renderAll();};
    $('auditToPlan').onclick=()=>go('planeacion');
    $('auditGoDetail').onclick=()=>go('planeacion');
    $('auditOpenFromPlanning')?.addEventListener('click',()=>go('auditoria'));
    loadPacked().then(value=>{packed=value;stats();renderAll();}).catch(e=>{
      $('auditStatus').textContent='Error de conciliación: '+e.message;
      console.error('Citroën Excel audit validation:',e);
    });
  }
  document.addEventListener('DOMContentLoaded',wire);
})();
