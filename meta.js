(function metaModule(){
  'use strict';
  const $=id=>document.getElementById(id);
  const integer=new Intl.NumberFormat('es-CO',{maximumFractionDigits:0});
  const currency=new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
  const percentage=new Intl.NumberFormat('es-CO',{style:'percent',maximumFractionDigits:2});
  const number=x=>x==null?'—':integer.format(x);
  const money=x=>x==null?'—':currency.format(x);
  const percent=x=>x==null?'—':percentage.format(x);
  const compact=x=>x>=1e6?integer.format(x/1e6)+' M':x>=1e3?integer.format(x/1000)+' mil':integer.format(x);
  const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let dailyFile=null,detailFile=null,days=[],campaigns=[],ads=[],filteredCampaigns=[],filteredAds=[],fileReady=false;
  const zeros=()=>[0,0,0,0,0,0,0];
  function total(rows){const out=zeros();for(const r of rows)for(let i=0;i<7;i++)out[i]+=r.metrics[i];return out;}
  const sum=(rows,idx)=>rows.reduce((n,r)=>n+r.metrics[idx],0);
  const addGroup=(rows,field,index)=>{
    const map=new Map();for(const r of rows){let k=r[field]||'Sin clasificar';map.set(k,(map.get(k)||0)+r.metrics[index]);}
    return [...map].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  };
  const monthsLabels={'2026-01':'Enero','2026-02':'Febrero','2026-03':'Marzo','2026-04':'Abril','2026-05':'Mayo','2026-06':'Junio','2026-07':'Julio','2026-08':'Agosto','2026-09':'Septiembre','2026-10':'Octubre'};
  function formatOf(ad){
    const s=String(ad||'').toLowerCase();
    if(s.includes('carrusel'))return 'Carrusel';
    if(s.includes('video'))return 'Video';
    if(s.includes('estatic')||s.includes('estátic'))return 'Estática';
    return 'Otro / no etiquetado';
  }
  function objectiveOf(campaign){
    const s=String(campaign||'').toLowerCase();
    if(s.includes('whatsapp')||s.includes('_wsp_')||s.includes('-wsp_')||s.includes('wsp_on'))return 'WhatsApp (por nombre)';
    return 'Formulario / otros (por nombre)';
  }
  function isMonth(row,filter){return (!filter.month||row.month===filter.month)&&(!filter.model||row.model===filter.model)&&(!filter.account||row.account===filter.account)&&(!filter.territory||row.territory===filter.territory);}
  function filterValues(){return {month:$('metaMonth').value,model:$('metaModel').value,account:$('metaAccount').value,territory:$('metaTerritory').value,campaignSearch:$('metaCampaignSearch').value.trim().toLowerCase(),adSearch:$('metaAdSearch').value.trim().toLowerCase()};}
  function selectOptions(id,values,placeholder){$(id).innerHTML=`<option value="">${escapeHtml(placeholder)}</option>`+values.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');}
  const noData=(why)=>`<div class="empty-state"><div class="empty-logo">ë</div><b>Sin resultados</b><span>${escapeHtml(why||'No existen filas para esta selección.')}</span></div>`;
  function bars(entries,hint,format=money){
    const a=entries.filter(x=>x.value>0).slice(0,9);if(!a.length)return noData();
    const max=Math.max(...a.map(x=>x.value),1);
    return '<div class="plan-section-bars">'+a.map(x=>`<div class="plan-bar"><label title="${escapeHtml(x.name)}">${escapeHtml(x.name)}</label><div class="plan-bar-track"><div class="plan-bar-fill" style="width:${x.value/max*100}%"></div></div><b>${format(x.value)}</b></div>`).join('')+`</div><div class="meta-hint">${escapeHtml(hint)}</div>`;
  }
  function kpis(rows){
    const t=total(rows);
    const vals=[
      ['Inversión Meta',money(t[0]),'Costo registrado del reporte','⌁',true],
      ['Leads de formulario',number(t[1]),'On-Facebook leads (no WhatsApp)','◎'],
      ['Conversaciones iniciadas',number(t[2]),'Messaging conversations started','◉'],
      ['Impresiones',number(t[3]),'Entregas de anuncios reportadas','◫'],
      ['Clics en enlace',number(t[4]),'Link clicks, no clics totales','↗'],
      ['CTR enlace',t[3]>0?percent(t[4]/t[3]):'—','Clics en enlace / impresiones','%'],
      ['CPM calculado',t[3]>0?money(t[0]/t[3]*1000):'—','Costo por mil impresiones','◇'],
      ['Alcance sumado*',number(t[6]),'No representa usuarios únicos','⊙']
    ];
    $('metaKpis').innerHTML=vals.map(x=>`<div class="meta-kpi ${x[4]?'dark':''}"><span>${x[0]}</span><span class="meta-kpi-icon">${x[3]}</span><strong title="${escapeHtml(x[1])}">${x[1]}</strong><small>${x[2]}</small></div>`).join('');
  }
  function timeline(rows,filter){
    const items=Object.keys(monthsLabels).filter(x=>!filter.month||filter.month===x).map(month=>({month,value:sum(rows.filter(r=>r.month===month),0)}));
    const max=Math.max(...items.map(x=>x.value),1);
    $('metaTrend').innerHTML='<div class="meta-month-chart">'+items.map(x=>`<div class="meta-month ${x.month==='2026-10'?'partial':''}"><span class="value">${compact(x.value)}</span><div class="bar" style="height:${Math.max(4,Math.round(x.value/max*155))}px"></div><small>${monthsLabels[x.month].slice(0,3)}</small></div>`).join('')+'</div><div class="meta-hint">Octubre comprende únicamente del 1 al 20 de octubre. No es comparable con meses completos sin ajustar el período.</div>';
  }
  function charts(dailyRows,creativeRows){
    $('metaModels').innerHTML=bars(addGroup(dailyRows,'model',0),'C3, C3 MAX, Aircross, Aircross MAX, Basalt y Berlingo se identifican mediante los nombres de campaña.');
    $('metaAccounts').innerHTML=bars(addGroup(dailyRows,'account',0),'Tres cuentas incluidas en la exportación de Meta Ads.');
    $('metaTerritories').innerHTML=bars(addGroup(dailyRows,'territory',0),'Nombres inferidos de campañas y conjuntos, no representan un desglose oficial por geolocalización. “Cobertura Colombia” no equivale a una ciudad.');
    $('metaFormats').innerHTML=bars(addGroup(creativeRows,'format',0),'Clasificación automática a partir de los nombres reales de anuncio; no hay imágenes en el archivo.');
    const objective=addGroup(creativeRows,'objective',0);
    const form=creativeRows.filter(r=>r.objective!=='WhatsApp (por nombre)'),chat=creativeRows.filter(r=>r.objective==='WhatsApp (por nombre)');
    const spendForm=sum(form,0),leadsForm=sum(form,1),spendChat=sum(chat,0),chatsChat=sum(chat,2);
    $('metaOutcomes').innerHTML=bars(objective,'Objetivos aproximados inferidos de la nomenclatura de campaña.')+`<div class="meta-hint">Gasto por formulario dentro del grupo “Formulario / otros”: <b>${leadsForm>0?money(spendForm/leadsForm):'—'}</b>. Gasto por conversación en campañas identificadas como WhatsApp: <b>${chatsChat>0?money(spendChat/chatsChat):'—'}</b>. Son ratios de grupos inferidos, no una medición de negocio validada.</div>`;
  }
  function campaignsTable(rows,search){
    filteredCampaigns=rows.filter(r=>(r.campaign+' '+r.model+' '+r.account+' '+r.territory).toLowerCase().includes(search)).sort((a,b)=>b.metrics[0]-a.metrics[0]);
    $('metaCampaignCount').textContent=`${number(filteredCampaigns.length)} agrupaciones · ${new Set(filteredCampaigns.map(r=>r.campaign)).size} campañas`;
    $('metaCampaignRows').innerHTML=filteredCampaigns.length?filteredCampaigns.slice(0,135).map(r=>`<tr><td>${escapeHtml(monthsLabels[r.month])}</td><td>${escapeHtml(r.account)}</td><td>${escapeHtml(r.model)}</td><td title="${escapeHtml(r.campaign)}">${escapeHtml(r.campaign)}</td><td>${money(r.metrics[0])}</td><td>${number(r.metrics[1])}</td><td>${number(r.metrics[2])}</td><td>${number(r.metrics[3])}</td><td>${number(r.metrics[4])}</td><td>${r.metrics[1]>0?money(r.metrics[0]/r.metrics[1]):'—'}</td></tr>`).join(''):'<tr><td colspan="10" class="table-empty">No hay campañas para el filtro seleccionado.</td></tr>';
  }
  function adsTable(rows,search){
    filteredAds=rows.filter(r=>(r.campaign+' '+r.adset+' '+r.ad+' '+r.model+' '+r.account).toLowerCase().includes(search)).sort((a,b)=>b.metrics[0]-a.metrics[0]);
    $('metaAdCount').textContent=`${number(filteredAds.length)} anuncios/conjuntos agregados`;
    $('metaAdRows').innerHTML=filteredAds.length?filteredAds.slice(0,130).map(r=>`<tr><td>${escapeHtml(monthsLabels[r.month])}</td><td>${escapeHtml(r.model)}</td><td title="${escapeHtml(r.campaign)}">${escapeHtml(r.campaign)}</td><td title="${escapeHtml(r.adset)}">${escapeHtml(r.adset)}</td><td>${escapeHtml(r.ad)}</td><td>${money(r.metrics[0])}</td><td>${number(r.metrics[1])}</td><td>${number(r.metrics[2])}</td><td>${number(r.metrics[3])}</td><td>${number(r.metrics[4])}</td></tr>`).join(''):'<tr><td colspan="10" class="table-empty">Sin anuncios para esta búsqueda.</td></tr>';
  }
  function quality(){
    const vals=[
      ['OK','Conciliación','Todos los 27.840 registros del archivo están representados en las agregaciones. Los costos y conversiones cuadran con los totales originales.'],
      ['OK','Período','1 de enero a 20 de octubre de 2026. Octubre aún no tiene todos los días del mes.'],
      ['ATENCIÓN','Leads vs conversaciones','On-Facebook leads (96.217) y Messaging conversations started (54.916) son eventos distintos. No se fusionan en leads únicos.'],
      ['ATENCIÓN','Alcance no deduplicable','La suma de reach de filas diarias/anuncios no equivale a usuarios únicos. La fuente contiene un registro donde el alcance no es calculable.'],
      ['ATENCIÓN','Geografía inferida','Territorios inferidos de nombres de campañas/conjuntos; no equivale a ubicación real del usuario ni a la distribución geográfica de Meta Ads.'],
      ['ATENCIÓN','Moneda','El archivo contiene valores de Cost con apariencia de pesos, pero no trae columna de moneda. Se presentan como COP según el contexto de las cuentas de Colombia; validar si todas las cuentas facturan en COP.'],
      ['ATENCIÓN','Proyectado vs real','Los planes anteriores son presupuestos del portafolio; esta fuente corresponde exclusivamente a Meta Ads. Una brecha respecto al plan completo no debe interpretarse como cumplimiento global.']
    ];
    $('metaQuality').innerHTML=vals.map(x=>`<div class="meta-quality-item ${x[0]==='OK'?'ok':''}"><span class="tag">${x[0]}</span><div><strong>${escapeHtml(x[1])}</strong><p>${escapeHtml(x[2])}</p></div></div>`).join('');
  }
  function render(){
    if(!fileReady)return;
    const filter=filterValues();
    const filteredDays=days.filter(r=>isMonth(r,filter));
    const filteredCreatives=ads.filter(r=>isMonth(r,filter));
    const filteredCamp=campaigns.filter(r=>isMonth(r,filter));
    $('metaFilterContext').textContent=`${number(filteredDays.length)} grupos diarios · ${number(filteredCamp.length)} registros mensuales de campaña · ${number(filteredCreatives.length)} agrupaciones de anuncios · Fuente completa: ${number(dailyFile.rows_source)} filas · Datos reales de Meta Ads.`;
    kpis(filteredDays);timeline(filteredDays,filter);charts(filteredDays,filteredCreatives);
    campaignsTable(filteredCamp,filter.campaignSearch);adsTable(filteredCreatives,filter.adSearch);
    quality();
  }
  function csvCell(value){let v=String(value??'');if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
  function downloadCsv(rows,columns,file){
    if(!rows.length){alert('No hay filas para exportar.');return;}
    const keys=Object.keys(columns),vals=Object.values(columns);
    const header=vals.map(csvCell).join(';');
    const lines=rows.map(r=>keys.map(k=>csvCell(k==='cpl'?r.metrics[1]>0?(r.metrics[0]/r.metrics[1]).toFixed(2):'':k.startsWith('metric')?r.metrics[Number(k.slice(6))]:r[k])).join(';'));
    const blob=new Blob(['\uFEFF'+[header,...lines].join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),800);
  }
  function wire(){
    if(!$('metaMonth'))return;
    for(const id of ['metaMonth','metaModel','metaAccount','metaTerritory'])$(id).onchange=render;
    for(const id of ['metaCampaignSearch','metaAdSearch'])$(id).oninput=render;
    $('metaReset').onclick=()=>{for(const id of ['metaMonth','metaModel','metaAccount','metaTerritory','metaCampaignSearch','metaAdSearch'])$(id).value='';render();};
    $('metaExportCampaigns').onclick=()=>downloadCsv(filteredCampaigns,{month:'Mes',account:'Cuenta',model:'Modelo',territory:'Territorio inferido',campaign:'Campaña',metric0:'Cost COP asumido',metric1:'Leads formulario',metric2:'Conversaciones iniciadas',metric3:'Impresiones',metric4:'Clicks enlace',metric5:'Clicks todos',metric6:'Alcance sumado no unico',cpl:'Gasto / formulario'},'citroen_meta_campanas_2026.csv');
    $('metaExportAds').onclick=()=>downloadCsv(filteredAds,{month:'Mes',account:'Cuenta',model:'Modelo',territory:'Territorio inferido',campaign:'Campaña',adset:'Conjunto',ad:'Anuncio',format:'Formato inferido',metric0:'Cost COP asumido',metric1:'Leads formulario',metric2:'Conversaciones iniciadas',metric3:'Impresiones',metric4:'Clicks enlace',metric5:'Clicks todos',metric6:'Alcance sumado no unico'},'citroen_meta_anuncios_2026.csv');
    Promise.all([fetch('./data/meta_2026_daily.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No disponible meta daily');return r.json()}),fetch('./data/meta_2026_detail.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No disponible meta detail');return r.json()})])
    .then(([daily,detail])=>{
      if(daily.schema!=='citroen-meta-actuals/2026-v1'||detail.schema!==daily.schema||daily.rows_source!==27840||detail.rows_source!==27840||daily.totals[0]!==909508844||daily.totals[1]!==96217||daily.totals[2]!==54916)throw Error('Integridad de fuente Meta no válida.');
      dailyFile=daily;detailFile=detail;
      const dd=daily.dictionaries,dt=detail.dictionaries;
      days=daily.daily.map(row=>({date:dd.dates[row[0]],month:dd.dates[row[0]].slice(0,7),model:dd.models[row[1]],territory:dd.territories[row[2]],account:dd.accounts[row[3]],metrics:row.slice(4)}));
      campaigns=detail.campaigns.map(row=>({month:dt.months[row[0]],campaign:dt.campaigns[row[1]],account:dt.accounts[row[2]],model:dt.models[row[3]],territory:dt.territories[row[4]],metrics:row.slice(5)}));
      ads=detail.creatives.map(row=>({month:dt.months[row[0]],campaign:dt.campaigns[row[1]],adset:dt.adsets[row[2]],ad:dt.ads[row[3]],account:dt.accounts[row[4]],model:dt.models[row[5]],territory:dt.territories[row[6]],metrics:row.slice(7)}));
      for(const r of ads){r.format=formatOf(r.ad);r.objective=objectiveOf(r.campaign);}
      const validate=a=>a.reduce((t,r)=>t+r.metrics[0],0);
      if(validate(days)!==909508844||validate(ads)!==909508844||validate(campaigns)!==909508844)throw Error('El total entre vistas no concilia.');
      selectOptions('metaMonth',Object.keys(monthsLabels),'Enero a octubre');
      for(const o of $('metaMonth').options)if(monthsLabels[o.value])o.textContent=monthsLabels[o.value];
      selectOptions('metaModel',[...new Set(days.map(r=>r.model))].sort(),'Todos los modelos');
      selectOptions('metaAccount',[...new Set(days.map(r=>r.account))].sort(),'Todas las cuentas');
      selectOptions('metaTerritory',[...new Set(days.map(r=>r.territory))].sort(),'Todos los territorios');
      fileReady=true;render();
      const mainRows=days.map(r=>({fecha:r.date,plataforma:'Meta Ads',modelo:r.model,ciudad:r.territory,concesionario:'No especificado',campana:'Consolidado diario Meta Ads (ver módulo Meta)',inversion:r.metrics[0],leads:r.metrics[1],impresiones:r.metrics[3],alcance:r.metrics[6],clics:r.metrics[4]}));
      document.dispatchEvent(new CustomEvent('citroen:meta-import',{detail:{source:'Meta Ads · ejecución enero-octubre 2026 (27.840 registros originales)',rows:mainRows,partialScope:true}}));
    }).catch(e=>{console.error('Meta data error',e);$('metaFilterContext').textContent='No se pudo cargar la fuente real de Meta Ads: '+e.message;for(const id of ['metaKpis','metaTrend','metaModels','metaAccounts','metaTerritories','metaFormats','metaOutcomes','metaCampaignRows','metaAdRows','metaQuality'])$(id).innerHTML=noData('Comprueba la publicación de los archivos Meta en GitHub/Vercel.');});
  }
  document.addEventListener('DOMContentLoaded',wire);
})();