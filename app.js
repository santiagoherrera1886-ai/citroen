(function source() {
  'use strict';
  const $ = id=>document.getElementById(id);
  const int = new Intl.NumberFormat('es-CO',{maximumFractionDigits:0});
  const cop = new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
  const pct = new Intl.NumberFormat('es-CO',{style:'percent',maximumFractionDigits:2});
  const num = x=>x==null?'—':int.format(x);
  const money = x=>x==null?'—':cop.format(x);
  const percent = x=>x==null?'—':pct.format(x);
  const esc = x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validUrl=x=>{try{let a=new URL(x);return ['https:','http:'].includes(a.protocol)?a.href:''}catch{return ''}};
  const models=[
    {name:'C3',tag:'URBAN EXPLORER',desc:'Carácter SUV y practicidad para descubrir cada rincón de la ciudad.',photo:'https://www.citroen.com.co/content/dam/citroen/colombia/home/C3v2.jpg?imwidth=768',url:'https://www.citroen.com.co/modelos/nueva-c3.html'},
    {name:'Aircross',tag:'FAMILY ADVENTURE',desc:'Versatilidad y espacio para viajar con toda la familia.',photo:'https://citroenderco.vteximg.com.br/arquivos/ids/157467-1000-500/Shine-Rojo-ruby-main.jpg?v=638635747121730000',url:'https://www.citroen.com.co/modelos/nueva-aircross-suv.html'},
    {name:'Basalt',tag:'NEW GENERATION',desc:'Diseño coupé-SUV y líneas dinámicas que reinventan el confort.',photo:'https://citroenderco.vteximg.com.br/arquivos/ids/157771/live-pack-gris-grafito-main.jpg?v=638845873268330000',url:'https://www.citroen.com.co/modelos/basalt.html'},
    {name:'C3 MAX',tag:'HYBRID EDITION',desc:'Variante MAX presente en la planeación; foto de familia C3 como referencia, no del acabado específico.',photo:'https://www.citroen.com.co/content/dam/citroen/colombia/home/C3v2.jpg?imwidth=768',url:'https://www.citroen.com.co/modelos/nueva-c3-max.html'},
    {name:'AIRCROSS MAX',tag:'HYBRID EDITION',desc:'Variante MAX en los proyectados; imagen de la familia Aircross como referencia, no del acabado específico.',photo:'https://citroenderco.vteximg.com.br/arquivos/ids/157467-1000-500/Shine-Rojo-ruby-main.jpg?v=638635747121730000',url:'https://www.citroen.com.co/modelos/nueva-aircross-max.html'},
    {name:'BERLINGO',tag:'PROFESSIONAL',desc:'Línea profesional contemplada en el plan de medios. Foto específica pendiente de validación.',photo:'',url:'https://www.citroen.com.co/modelos/nueva-berlingo-van.html'}
  ];
  const aliases={
    fecha:'fecha date dia day reporting_start date_start start_date',
    plataforma:'plataforma platform source medio canal network publisher_platform',
    modelo:'modelo model vehicle vehiculo linea producto',
    ciudad:'ciudad city location ubicacion territorio region',
    concesionario:'concesionario dealer vitrina sucursal tienda',
    campana:'campana campaign campaign_name nombre_campana campaignname',
    anuncio:'anuncio ad ad_name nombre_anuncio creative_name',
    inversion:'inversion inversion_cop spend cost gasto importe_gastado amount_spent investment',
    impresiones:'impresiones impressions',
    alcance:'alcance reach personas_alcanzadas',
    clics:'clics clicks link_clicks clics_en_el_enlace',
    leads:'leads clientes_potenciales conversiones results resultados registros formularios',
    url_creativo:'url_creativo creative_url image_url thumbnail_url url_imagen asset_url'
  };
  const metricKeys=['inversion','impresiones','alcance','clics','leads'];
  const state={rows:[],filtered:[],source:'',loaded:'',supported:new Set(),warnings:[],search:''};
  const cleanKey=x=>String(x||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  function normModel(x){let s=cleanKey(x);if(s.includes('aircross')&&s.includes('max'))return 'AIRCROSS MAX';if(s.includes('c3')&&s.includes('max'))return 'C3 MAX';if(s.includes('berlingo'))return 'BERLINGO';if(s.includes('aircross'))return 'Aircross';if(s.includes('basalt'))return 'Basalt';if(s==='c3'||s.startsWith('c3_')||s.includes('citroen_c3'))return 'C3';return String(x||'No especificado').trim();}
  function normPlatform(x){let s=cleanKey(x);if(/facebook|instagram|meta/.test(s))return 'Meta Ads';if(/google|youtube|pmax|^search$/.test(s))return 'Google Ads';if(s.includes('tiktok'))return 'TikTok Ads';return String(x||'No especificada').trim();}
  function parseNumber(x){
    if(x==null||String(x).trim()==='')return null;
    if(typeof x==='number')return Number.isFinite(x)?x:null;
    let t=String(x).replace(/\s/g,'').replace(/[^\d,.\-]/g,'');if(!t)return null;
    const dot=t.lastIndexOf('.'),comma=t.lastIndexOf(',');
    if(dot>=0&&comma>=0)t=dot>comma?t.replace(/,/g,''):t.replace(/\./g,'').replace(',','.');
    else if(comma>=0){let p=t.split(',');t=(p.length>2||p[p.length-1].length===3)?t.replace(/,/g,''):t.replace(',','.');}
    else if(dot>=0){let p=t.split('.');if(p.length>2||(p.length===2&&p[1].length===3))t=t.replace(/\./g,'');}
    let n=Number(t);return Number.isFinite(n)?n:null;
  }
  function parseDate(x){
    if(x==null||x==='')return '';let s=String(x).trim(),m,y,mo,d;
    if((m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))){y=+m[1];mo=+m[2];d=+m[3];}
    else if((m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/))){y=+m[3];mo=+m[2];d=+m[1];}
    else return '';
    let t=new Date(Date.UTC(y,mo-1,d));
    return t.getUTCFullYear()===y&&t.getUTCMonth()===mo-1&&t.getUTCDate()===d?`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';
  }
  function parseCsv(text){
    const t=text.replace(/^\uFEFF/,'');const first=t.split(/\r?\n/,1)[0]||'';
    const delimiter=[',',';','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
    let rows=[],row=[],cell='',inQuote=false;
    for(let i=0;i<t.length;i++){const ch=t[i];
      if(ch==='"'){if(inQuote&&t[i+1]==='"'){cell+='"';i++;}else inQuote=!inQuote;}
      else if(ch===delimiter&&!inQuote){row.push(cell);cell='';}
      else if((ch==='\r'||ch==='\n')&&!inQuote){if(ch==='\r'&&t[i+1]==='\n')i++;row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);row=[];cell='';}
      else cell+=ch;
    }
    if(inQuote)throw Error('El CSV tiene comillas sin cerrar.');
    row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);
    if(rows.length<2)throw Error('Necesitas encabezados y al menos una fila.');
    const h=rows.shift().map(v=>v.trim());
    return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])));
  }
  function normalize(raw){
    if(!Array.isArray(raw)||!raw.length)throw Error('El archivo no contiene registros.');
    const keys=[...new Set(raw.flatMap(x=>Object.keys(x||{})))],map=new Map(keys.map(k=>[cleanKey(k),k]));
    const chosen={};Object.entries(aliases).forEach(([field,names])=>chosen[field]=names.split(' ').map(x=>map.get(x)).find(Boolean)||null);
    const supported=new Set(metricKeys.filter(k=>chosen[k]));
    if(!supported.size)throw Error('Debe existir alguna métrica: inversión, impresiones, alcance, clics o leads.');
    if(!chosen.modelo&&!chosen.campana&&!chosen.plataforma)throw Error('Necesitas un campo modelo, plataforma o campaña.');
    let skipped=0,badDate=0,negatives=0;
    const rows=raw.map((r,i)=>{
      if(!r||typeof r!=='object'||Array.isArray(r)){skipped++;return null;}
      const at=k=>chosen[k]?r[chosen[k]]:null;
      let v=Object.fromEntries(metricKeys.map(k=>[k,parseNumber(at(k))]));
      if(Object.values(v).every(x=>x===null)){skipped++;return null;}
      if(Object.values(v).some(x=>x!=null&&x<0))negatives++;
      let fecha=parseDate(at('fecha'));
      if(chosen.fecha&&String(at('fecha')||'').trim()&&!fecha)badDate++;
      return {id:i+1,fecha,plataforma:normPlatform(at('plataforma')),modelo:normModel(at('modelo')),
        ciudad:String(at('ciudad')||'No especificada').trim(),concesionario:String(at('concesionario')||'No especificado').trim(),
        campana:String(at('campana')||'Sin nombre').trim(),anuncio:String(at('anuncio')||'').trim(),
        url_creativo:validUrl(at('url_creativo')),...v};
    }).filter(Boolean);
    if(!rows.length)throw Error('Ninguna fila válida contiene métricas numéricas.');
    const warnings=[];if(skipped)warnings.push(skipped+' filas omitidas.');if(badDate)warnings.push(badDate+' fechas inválidas.');if(negatives)warnings.push(negatives+' registros con valores negativos.');if(!chosen.fecha)warnings.push('El archivo no incluye fecha.');
    return {rows,supported,warnings};
  }
  function aggregate(rows){
    let s={count:rows.length};
    for(const k of metricKeys){const values=rows.map(r=>r[k]).filter(x=>x!==null);s[k]=values.length?values.reduce((a,b)=>a+b,0):null;}
    s.cpl=s.inversion!=null&&s.leads>0?s.inversion/s.leads:null;
    s.cpm=s.inversion!=null&&s.impresiones>0?s.inversion/s.impresiones*1000:null;
    s.cpc=s.inversion!=null&&s.clics>0?s.inversion/s.clics:null;
    s.ctr=s.clics!=null&&s.impresiones>0?s.clics/s.impresiones:null;
    return s;
  }
  function group(rows,get){
    let map=new Map();for(const r of rows){const key=get(r);if(!map.has(key))map.set(key,[]);map.get(key).push(r);}
    return [...map].map(([name,items])=>({name,items,stats:aggregate(items)}));
  }
  const empty=(title,detail='Carga datos reales para consultar este análisis.')=>`<div class="empty-state"><div class="empty-logo">ë</div><b>${esc(title)}</b><span>${esc(detail)}</span></div>`;
  function options(id,values,label){const el=$(id),old=el.value;el.innerHTML=`<option value="">${esc(label)}</option>`+values.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(values.includes(old))el.value=old;}
  function updateFilters(){
    options('filterModel',[...new Set([...models.map(m=>m.name),...state.rows.map(r=>r.modelo)])].filter(v=>v!=='No especificado'),'Todos los modelos');
    options('filterPlatform',[...new Set(state.rows.map(r=>r.plataforma))].sort(),'Todas las plataformas');
    options('filterCity',[...new Set(state.rows.map(r=>r.ciudad))].sort(),'Todas las ciudades');
  }
  function filterData(){const model=$('filterModel').value,platform=$('filterPlatform').value,city=$('filterCity').value,from=$('filterFrom').value,to=$('filterTo').value;
    return state.rows.filter(r=>(!model||r.modelo===model)&&(!platform||r.plataforma===platform)&&(!city||r.ciudad===city)&&(!from||(r.fecha&&r.fecha>=from))&&(!to||(r.fecha&&r.fecha<=to)));
  }
  function nav(id){
    document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.target===id));
    const b=document.querySelector(`.nav-link[data-target="${id}"]`);$('breadcrumb').textContent=b?b.textContent.replace(/\d+/g,'').trim():'Visión general';
    $(id)?.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+id);$('sidebar').classList.remove('open');$('sidebarOverlay').classList.remove('show');
  }
  function goto(){document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>nav(b.dataset.goto));}
  let toastId;
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastId);toastId=setTimeout(()=>$('toast').classList.remove('show'),4000);}
  function kpis(rows){
    const a=aggregate(rows);
    const items=[['Inversión',money(a.inversion),'COP · gasto registrado','↗'],['Leads',num(a.leads),'Oportunidades registradas','◎'],[state.source.startsWith('Meta Ads')?'Gasto / formulario*':'Costo por lead',money(a.cpl),state.source.startsWith('Meta Ads')?'Ratio mixto: incluye gasto WhatsApp · ver módulo Meta':'Inversión / leads','◇'],['Impresiones',num(a.impresiones),'Entrega de anuncios','◫'],['Clics',num(a.clics),'Interacciones de pauta','↗'],['CTR',percent(a.ctr),'Clics / impresiones','%'],['CPM',money(a.cpm),'Costo por mil impresiones','⌁'],['Alcance reportado*',num(a.alcance),'Suma sin desduplicación','◉']];
    $('kpiGrid').innerHTML=items.map(x=>`<article class="kpi"><div class="kpi-top"><span class="kpi-label">${x[0]}</span><span class="kpi-icon">${x[3]}</span></div><div class="kpi-value">${x[1]}</div><div class="kpi-sub">${x[2]}</div></article>`).join('');
  }
  function bars(groups,key,format=num,red=false){
    const list=groups.filter(x=>x.stats[key]!=null).sort((a,b)=>b.stats[key]-a.stats[key]).slice(0,8);
    if(!list.length)return empty('Sin valores disponibles','La fuente no incluye esta métrica para la selección actual.');
    const max=Math.max(...list.map(x=>Math.max(x.stats[key],0)),1);
    return '<div class="bar-chart">'+list.map(x=>`<div class="bar-row"><span class="bar-name" title="${esc(x.name)}">${esc(x.name)}</span><div class="bar-track"><div class="bar-fill ${red?'red':''}" style="width:${Math.max(x.stats[key],0)/max*100}%"></div></div><span class="bar-value">${format(x.stats[key])}</span></div>`).join('')+'</div>';
  }
  function renderModels(rows){
    const by=group(rows,r=>r.modelo);
    const all=[...models,...by.filter(g=>!models.some(m=>m.name===g.name)).map(g=>({name:g.name,tag:'MODELO IMPORTADO',desc:'Modelo encontrado en el archivo de rendimiento.',photo:'',url:'https://www.citroen.com.co/'}))];
    $('modelGrid').innerHTML=all.map(m=>{
      const a=by.find(x=>x.name===m.name)?.stats||aggregate([]);
      return `<article class="model-card"><div class="model-photo"><span class="photo-fallback">${esc(m.name)}</span>${m.photo?`<img src="${esc(m.photo)}" alt="Citroën ${esc(m.name)} · imagen oficial" loading="lazy" onerror="this.style.display='none'">`:''}</div><div class="model-body"><div class="model-title"><h3>${esc(m.name)}</h3><span class="model-kicker">${esc(m.tag)}</span></div><p>${esc(m.desc)}</p><div class="model-stats"><div><small>LEADS</small><b>${num(a.leads)}</b></div><div><small>CPL</small><b>${money(a.cpl)}</b></div></div><div class="model-bottom"><a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Ficha oficial ↗</a><button data-select-model="${esc(m.name)}">Analizar modelo →</button></div></div></article>`;
    }).join('');
    document.querySelectorAll('[data-select-model]').forEach(b=>b.onclick=()=>{$('filterModel').value=b.dataset.selectModel;render();nav('resumen');});
  }
  function trend(rows){
    const dates=group(rows.filter(x=>x.fecha),r=>r.fecha.slice(0,7)).sort((a,b)=>a.name.localeCompare(b.name));
    if(!dates.length){$('trendChart').innerHTML=empty('Sin evolución temporal','Se necesita una columna fecha para ver la tendencia real.');return;}
    const W=800,H=205,L=20,T=18,R=17,B=35,w=W-L-R,h=H-T-B;
    const points=k=>{const max=Math.max(...dates.map(x=>x.stats[k]||0),1);return dates.map((x,i)=>`${L+(dates.length===1?.5:i/(dates.length-1))*w},${T+h-Math.max(0,x.stats[k]||0)/max*h}`).join(' ');};
    const spend=state.supported.has('inversion'),leads=state.supported.has('leads');
    const ticks=dates.filter((_,i)=>i%Math.max(1,Math.ceil(dates.length/6))===0||i===dates.length-1);
    $('trendChart').innerHTML=`<svg class="trend-svg" viewBox="0 0 800 205" preserveAspectRatio="none" role="img" aria-label="Tendencia mensual con escalas independientes de inversión y leads">${[0,1,2,3].map(i=>`<line class="grid-line" x1="${L}" y1="${T+i*h/3}" x2="${W-R}" y2="${T+i*h/3}"/>`).join('')}${spend?`<polyline class="spend-line" points="${points('inversion')}"/>`:''}${leads?`<polyline class="lead-line" points="${points('leads')}"/>`:''}${ticks.map(d=>`<text text-anchor="middle" x="${L+(dates.length===1?.5:dates.indexOf(d)/(dates.length-1))*w}" y="195">${esc(d.name)}</text>`).join('')}</svg><div class="trend-legend">${spend?'<span><i class="legend-dot"></i> Inversión · escala propia</span>':''}${leads?'<span><i class="legend-dot red"></i> Leads · escala propia</span>':''}</div>`;
  }
  function insights(rows){
    if(!rows.length){$('insightList').innerHTML=empty('Los insights llegan con tus datos','Nunca presentaremos conclusiones sin información de rendimiento.');return;}
    const a=aggregate(rows),byModel=group(rows,r=>r.modelo).filter(g=>g.stats.leads>0).sort((a,b)=>b.stats.leads-a.stats.leads),byPlatform=group(rows,r=>r.plataforma).filter(g=>g.stats.inversion>0).sort((a,b)=>b.stats.inversion-a.stats.inversion),out=[];
    if(byModel.length)out.push(['VOLUMEN',byModel[0].name+' lidera en leads',`${num(byModel[0].stats.leads)} oportunidades registradas para este modelo.`]);
    if(byPlatform.length)out.push(['INVERSIÓN',byPlatform[0].name+' concentra inversión',`${money(byPlatform[0].stats.inversion)} de gasto registrado en la selección.`]);
    if(a.cpl!=null)out.push(['EFICIENCIA',`CPL consolidado: ${money(a.cpl)}`,'Inversión total dividida entre leads, no media simple de los CPL individuales.']);
    if(a.alcance!=null)out.push(['TRAZABILIDAD','Alcance no desduplicado','El alcance total puede repetir usuarios entre campañas o plataformas.']);
    if(!out.length)out.push(['DISPONIBILIDAD',`${rows.length} registros seleccionados`,'No hay suficientes métricas para establecer conclusiones adicionales.']);
    $('insightList').innerHTML=out.map(x=>`<div class="insight-item"><span class="insight-tag">${x[0]}</span><strong>${esc(x[1])}</strong><p>${esc(x[2])}</p></div>`).join('');
  }
  function analytics(rows){
    const platforms=group(rows,r=>r.plataforma),cities=group(rows,r=>r.ciudad),dealers=group(rows,r=>r.concesionario).filter(x=>x.name!=='No especificado');
    $('platformChart').innerHTML=rows.length?bars(platforms,'inversion',money):empty('Sin datos de medios');
    $('platformEfficiency').innerHTML=rows.length?bars(platforms.filter(x=>x.stats.cpl!=null),'cpl',money,true):empty('Sin CPL disponible','Se necesitan gasto y leads positivos para calcular CPL.');
    $('cityChart').innerHTML=rows.length?bars(cities,'leads',num):empty('Sin datos de ciudades');
    $('dealerChart').innerHTML=dealers.length?bars(dealers,'leads',num):empty('Sin datos de concesionarios','Incluye una columna concesionario en el reporte.');
  }
  function campaigns(rows){
    const grouped=group(rows,r=>[r.campana,r.modelo,r.plataforma,r.ciudad].join('¦')).map(x=>({...x,...((({campana,modelo,plataforma,ciudad})=>({campana,modelo,plataforma,ciudad}))(x.items[0]))}));
    const found=grouped.filter(g=>[g.campana,g.modelo,g.plataforma,g.ciudad].join(' ').toLowerCase().includes(state.search.toLowerCase())).sort((a,b)=>(b.stats.inversion??-1)-(a.stats.inversion??-1));
    $('campaignCount').textContent=`${found.length} campañas · ${rows.length} registros${found.length>180?' · primeras 180':''}`;
    $('campaignRows').innerHTML=found.length?found.slice(0,180).map(g=>`<tr><td title="${esc(g.campana)}">${esc(g.campana)}</td><td>${esc(g.modelo)}</td><td>${esc(g.plataforma)}</td><td>${esc(g.ciudad)}</td><td>${money(g.stats.inversion)}</td><td>${num(g.stats.leads)}</td><td>${money(g.stats.cpl)}</td><td>${percent(g.stats.ctr)}</td></tr>`).join(''):'<tr><td colspan="8" class="table-empty">No hay campañas para esta selección.</td></tr>';
  }
  function creatives(rows){
    const map=new Map();
    for(const r of rows){if(!r.url_creativo)continue;const key=r.url_creativo+'|'+r.campana;if(!map.has(key))map.set(key,{...r,items:[]});map.get(key).items.push(r);}
    const list=[...map.values()].slice(0,32);
    $('creativeGrid').innerHTML=list.length?list.map(r=>`<article class="creative-card"><img src="${esc(r.url_creativo)}" alt="Pieza creativa importada de ${esc(r.campana)}" loading="lazy" onerror="this.style.display='none'"><div class="creative-body"><h4>${esc(r.campana)}</h4><p>${esc(r.modelo)} · ${num(aggregate(r.items).leads)} leads</p><a href="${esc(r.url_creativo)}" target="_blank" rel="noopener noreferrer">Ver original ↗</a></div></article>`).join(''):empty('Aún no hay creativos reales importados','Añade url_creativo a los registros para mostrar piezas de pauta auténticas.');
  }
  function status(rows){
    const has=state.rows.length>0;document.body.classList.toggle('has-data',has);
    $('sideDataStatus').textContent=has?`${num(state.rows.length)} registros cargados`:'Esperando fuente de datos';
    $('topDataStatus').textContent=has?'Datos aportados':'Sin datos cargados';
    $('filterExplanation').textContent=has?`${num(rows.length)} de ${num(state.rows.length)} registros corresponden a la selección.`:'Selecciona filtros para analizar los datos cuando estén disponibles.';
    $('dataDisclaimer').classList.toggle('loaded',has);
    $('dataDisclaimer').innerHTML=has?`<svg><use href="#i-info"/></svg> Fuente: <b>${esc(state.source)}</b>. Datos cargados pero no auditados; el alcance no está desduplicado. ${esc(state.warnings.join(' '))} <button data-goto="datos">Ver origen →</button>`:'<svg><use href="#i-info"/></svg> Modo estructura: todavía no hay un reporte Citroën cargado. No se presentan métricas simuladas. <button data-goto="datos">Importar un archivo →</button>';
    $('sourceDescription').textContent=has?`${state.source} · ${state.loaded} · importación local / no auditada`:'Ningún reporte proporcionado todavía';
    $('reportBullet').classList.toggle('verified',has);$('sourceTag').textContent=has?'IMPORTADO':'PENDIENTE';$('sourceRows').textContent=num(state.rows.length);
    goto();
  }
  function render(){state.filtered=filterData();status(state.filtered);kpis(state.filtered);trend(state.filtered);insights(state.filtered);renderModels(state.filtered);analytics(state.filtered);campaigns(state.filtered);creatives(state.filtered);document.dispatchEvent(new CustomEvent('citroen:real-data',{detail:{rows:state.rows,source:state.source,partialScope:state.source.startsWith('Meta Ads')}}));}
  function install(raw,name){
    const parsed=normalize(raw);state.rows=parsed.rows;state.supported=parsed.supported;state.warnings=parsed.warnings;state.source=name;state.loaded=new Date().toLocaleString('es-CO');
    ['filterModel','filterPlatform','filterCity','filterFrom','filterTo'].forEach(id=>$(id).value='');updateFilters();render();
    $('fileFeedback').textContent=`${num(state.rows.length)} registros cargados. ${state.warnings.join(' ')||'Sin advertencias de formato.'}`;
    toast(`${num(state.rows.length)} registros importados correctamente.`);
  }
  function download(text,name){const u=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),800);}
  function exportCsv(){if(!state.filtered.length){toast('No hay datos para exportar.');return;}const fields=['fecha','plataforma','modelo','ciudad','concesionario','campana','anuncio',...metricKeys,'url_creativo'];const cell=x=>{let t=String(x??'');if(/^[=+\-@]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};download('\uFEFF'+fields.join(';')+'\r\n'+state.filtered.map(r=>fields.map(k=>cell(r[k])).join(';')).join('\r\n'),'citroen_performance_filtrado.csv');}
  async function importFile(file){
    if(!file)return;if(file.size>20*1024*1024){toast('Máximo 20 MB por archivo.');return;}
    $('fileFeedback').textContent='Procesando archivo…';
    try{let t=await file.text();let raw;if(/\.json$/i.test(file.name)){let o=JSON.parse(t);raw=Array.isArray(o)?o:o.rows||o.data||o.records;}else raw=parseCsv(t);install(raw,file.name);}
    catch(e){$('fileFeedback').textContent='Error: '+e.message;toast('Revisa el archivo: '+e.message);}
  }
  async function loadRepoJson(){try{let r=await fetch('./data/citroen-data.json',{cache:'no-store'});if(!r.ok)return;let o=await r.json();install(Array.isArray(o)?o:o.rows||o.data||o.records,'data/citroen-data.json (repositorio)');}catch(e){console.info('Aún no hay datos de campañas preconfigurados.',e.message);}}
  function wire(){
    $('todayLabel').textContent=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'long',year:'numeric'}).format(new Date());
    $('openMenu').onclick=()=>{$('sidebar').classList.add('open');$('sidebarOverlay').classList.add('show');};
    $('closeMenu').onclick=$('sidebarOverlay').onclick=()=>{$('sidebar').classList.remove('open');$('sidebarOverlay').classList.remove('show');};
    document.querySelectorAll('.nav-link').forEach(b=>b.onclick=()=>nav(b.dataset.target));
    $('jumpToData').onclick=()=>nav('datos');
    ['filterModel','filterPlatform','filterCity','filterFrom','filterTo'].forEach(id=>$(id).onchange=render);
    $('resetFilters').onclick=()=>{['filterModel','filterPlatform','filterCity','filterFrom','filterTo'].forEach(id=>$(id).value='');render();};
    document.querySelector('.filter-icon').onclick=()=>$('filterModel').focus();
    $('campaignSearch').oninput=e=>{state.search=e.target.value;campaigns(state.filtered);};
    $('exportCsv').onclick=exportCsv;
    $('dataFile').onchange=e=>importFile(e.target.files?.[0]);
    $('downloadTemplate').onclick=()=>download('\uFEFF'+'fecha;plataforma;modelo;ciudad;concesionario;campana;anuncio;inversion;impresiones;alcance;clics;leads;url_creativo\r\n','plantilla_citroen_sin_datos.csv');
    $('clearData').onclick=()=>{state.rows=[];state.source='';state.loaded='';state.warnings=[];state.supported=new Set();state.search='';$('campaignSearch').value='';$('dataFile').value='';$('fileFeedback').textContent='Sin archivo seleccionado';['filterFrom','filterTo'].forEach(id=>$(id).value='');updateFilters();render();toast('Datos locales retirados.');};
    const hero=$('heroCar');hero.src='https://www.citroen.com.co/content/dam/citroen/colombia/modelos/basalt/basalt-citroen-colombia.webp?imwidth=768';hero.onerror=()=>{hero.style.display='none';};
    const style=document.createElement('style');style.textContent='.hero-art img{object-fit:cover;mix-blend-mode:normal;border-radius:18px;mask-image:linear-gradient(to right,transparent,black 24%);-webkit-mask-image:linear-gradient(to right,transparent,black 24%)}';document.head.appendChild(style);
    updateFilters();render();
    let anchor=location.hash.slice(1);if($(anchor)&&document.querySelector(`.nav-link[data-target="${anchor}"]`))setTimeout(()=>nav(anchor),120);
    // Imported Meta Ads actuals are pre-aggregated from 27,840 daily ad records.
    // The global dashboard receives only one summary dataset to avoid double counting.
    document.addEventListener('citroen:meta-import',e=>{
      if(!e.detail||!Array.isArray(e.detail.rows))return;
      if(state.rows.length&&state.source&&!state.source.startsWith('Meta Ads'))return;
      try{install(e.detail.rows,e.detail.source||'Meta Ads · real 2026');}
      catch(error){console.error('Meta integration error',error);toast('No fue posible usar la fuente Meta en el resumen.');}
    });
    loadRepoJson();
  }
  document.addEventListener('DOMContentLoaded',wire);
})();