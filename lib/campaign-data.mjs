export const CAMPAIGN_SOURCE = Object.freeze({
  spreadsheetId: '1ku1vk57fU0_wHChmXObUaUpvw4KARMj6T1vqLpp5YBo',
  sheetId: 2001595094,
  sheetName: 'DATA CITROEN AÑO',
  year: 2026,
  url: 'https://docs.google.com/spreadsheets/d/1ku1vk57fU0_wHChmXObUaUpvw4KARMj6T1vqLpp5YBo/edit',
});

// These two functions are embedded together in the generated Apps Script.
export function campaignColumns(headers) {
  const required = ['Account name','Date','Campaign name','Ad name','Ad set name','Cost','On-Facebook leads','Messaging conversations started','Impressions','Link clicks','Clicks (all)','Reach'];
  const normalize = value => String(value ?? '').trim().replace(/\s+/g,' ').toLowerCase();
  const normalized = headers.map(normalize);
  const indexes = required.map(name => normalized.indexOf(normalize(name)));
  if (indexes.some(i => i < 0)) throw Error('Faltan columnas: ' + required.filter((_,i) => indexes[i] < 0).join(', '));
  for (let i=0;i<indexes.length;i++) if(normalized.lastIndexOf(normalize(required[i]))!==indexes[i]) throw Error('Columna duplicada: '+required[i]+'.');
  const mediaHeaders=['Promoted post image URL','Promoted post thumbnail URL'];
  return {required,indexes,mediaHeaders,mediaIndexes:mediaHeaders.map(name=>normalized.indexOf(normalize(name)))};
}

// Apps Script has no browser URL constructor. Accept only Meta image CDNs.
export function safeCampaignImage(value) {
  if(typeof value!=='string'||value.length>4096)return '';
  const url=value.trim();
  return /^https:\/\/(?:[a-z0-9-]+\.)*(?:fbcdn\.net|fbsbx\.com|cdninstagram\.com)\/[^\s\\<>"']+$/i.test(url)?url:'';
}

// Every source row contributes once; ratios are calculated by the dashboard.
export function aggregateCampaignRows(headers, rows, year = 2026) {
  const {required,indexes,mediaIndexes} = campaignColumns(headers);
  const dictionaries = {dates:[],months:[],accounts:[],models:[],territories:[],campaigns:[],adsets:[],ads:[]};
  const dictionariesMap = Object.fromEntries(Object.keys(dictionaries).map(k => [k,new Map()]));
  const id = (key,value) => {const map=dictionariesMap[key];if(!map.has(value)){map.set(value,map.size);dictionaries[key].push(value);}return map.get(value);};
  const groups = {daily:new Map(),campaigns:new Map(),creatives:new Map()};
  const media=new Map();
  const totals = [0,0,0,0,0,0,0];let count=0,excluded=0,missingReach=0,min='',max='';
  const normalize = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const modelOf = name => {const s=normalize(name);return /berlingo/.test(s)?'BERLINGO':/basalt/.test(s)?'Basalt':/aircross.?max/.test(s)?'AIRCROSS MAX':/aircross/.test(s)?'Aircross':/c3.?max/.test(s)?'C3 MAX':/\bc3\b|_c3[_-]/.test(s)?'C3':'Sin clasificar';};
  const territoryOf = name => {
    const s=normalize(name);
    const names=[['bogota','Bogotá'],['boyaca','Boyacá'],['antioquia','Antioquia'],['medellin','Medellín'],['palmira','Palmira'],['rionegro','Rionegro'],['cali','Cali'],['cordoba','Córdoba'],['narino','Nariño'],['villavicencio','Villavicencio'],['bucaramanga','Bucaramanga'],['cucuta','Cúcuta'],['barranquilla','Barranquilla'],['cartagena','Cartagena'],['pereira','Pereira'],['manizales','Manizales']];
    // The campaign prefix always says Colombia. Search a named local market first.
    for(const [text,label] of names)if(s.includes(text))return label;
    return s.includes('colombia')?'Cobertura Colombia':'No identificada';
  };
  const metric = (value,field,row) => {
    if(value==='' || value==null || value==='-')return 0;
    if(typeof value==='number' && Number.isFinite(value) && value>=0)return value;
    if(typeof value==='string' && /^\d+(\.\d+)?$/.test(value.trim()))return Number(value);
    if(field==='Reach'){missingReach++;return 0;}
    throw Error('Valor no numérico en '+field+', registro '+row+'. Corrige la hoja antes de sincronizar.');
  };
  const add = (map,key,values) => {const k=JSON.stringify(key),old=map.get(k);if(old){for(let i=0;i<7;i++)old[key.length+i]+=values[i];}else map.set(k,key.concat(values));};
  for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
    const original=rows[rowIndex];if(!original.some(v=>v!==''&&v!=null))continue;
    const r=indexes.map(i=>original[i]);
    let date=r[1];
    if(typeof date==='number')date=new Date(Date.UTC(1899,11,30)+Math.floor(date)*86400000).toISOString().slice(0,10);
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Fecha inválida en registro '+(rowIndex+2)+'.');
    if(!date.startsWith(year+'-')){excluded++;continue;}
    if(!r[0]||!r[2])throw Error('Cuenta o campaña vacía en registro '+(rowIndex+2)+'.');
    for(const v of [r[0],r[2],r[3],r[4]])if(String(v||'').length>1000)throw Error('Nombre demasiado largo en la fuente.');
    const account=String(r[0]),campaign=String(r[2]),ad=String(r[3]||''),adset=String(r[4]||'');
    const model=modelOf(campaign+' '+adset),territory=territoryOf(campaign+' '+adset),month=date.slice(0,7);
    const values=[5,6,7,8,9,10,11].map(i=>metric(r[i],required[i],rowIndex+2));
    for(let i=0;i<7;i++)totals[i]+=values[i];
    const a=id('accounts',account),m=id('models',model),t=id('territories',territory),c=id('campaigns',campaign),mo=id('months',month);
    add(groups.daily,[id('dates',date),m,t,a],values);
    add(groups.campaigns,[mo,c,a,m,t],values);
    const adsetId=id('adsets',adset),adId=id('ads',ad);
    add(groups.creatives,[mo,c,adsetId,adId,a,m,t],values);
    const mediaKey=JSON.stringify([a,c,adsetId,adId]),previous=media.get(mediaKey);
    if(!previous||previous[4]<=date)media.set(mediaKey,[a,c,adsetId,adId,date,...mediaIndexes.map(index=>safeCampaignImage(original[index]))]);
    count++;if(!min||date<min)min=date;if(date>max)max=date;
  }
  if(!count)throw Error('La pestaña no tiene registros válidos de '+year+'. Se conserva la última sincronización.');
  const common={schema:'citroen-meta-actuals/2026-v1',source:'Google Sheets · DATA CITROEN AÑO',date_min:min,date_max:max,rows_source:count,rows_other_years:excluded,metrics:['spend','forms','messages','impressions','clicks','all_clicks','reach'],totals,warning_reach_nonnum:missingReach,channels:['Meta Ads']};
  return {daily:{...common,dictionaries,daily:[...groups.daily.values()]},detail:{...common,dictionaries,campaigns:[...groups.campaigns.values()],creatives:[...groups.creatives.values()],media_version:1,creative_media:[...media.values()].filter(row=>row[5]||row[6])}};
}

export function validateCampaignData(payload) {
  if(!payload || typeof payload!=='object')throw Error('Datos de sincronización inválidos.');
  const {daily,detail}=payload;
  if(!daily||!detail||daily.schema!=='citroen-meta-actuals/2026-v1'||detail.schema!==daily.schema||!Number.isInteger(daily.rows_source)||daily.rows_source<1||daily.rows_source>250000||detail.rows_source!==daily.rows_source)throw Error('Esquema o cantidad de filas inválidos.');
  const safeDate=x=>typeof x==='string'&&/^2026-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
  if(!safeDate(daily.date_min)||!safeDate(daily.date_max)||daily.date_min>daily.date_max||detail.date_min!==daily.date_min||detail.date_max!==daily.date_max)throw Error('Período inválido.');
  const tolerance=(a,b)=>Math.abs(a-b)<=Math.max(.01,Math.abs(a)*1e-10);
  for(const doc of [daily,detail]){
    if(!Array.isArray(doc.totals)||doc.totals.length!==7||doc.totals.some((x,i)=>!Number.isFinite(x)||x<0||!tolerance(x,daily.totals[i])))throw Error('Totales inválidos.');
    if(!doc.dictionaries||typeof doc.dictionaries!=='object')throw Error('Diccionario inválido.');
  }
  const allowed=new Set(['dates','months','accounts','models','territories','campaigns','adsets','ads']);
  const cleanDoc=doc=>{
    const dictionaries={};
    for(const [key,items] of Object.entries(doc.dictionaries))if(allowed.has(key)){
      if(!Array.isArray(items)||items.length>100000||items.some(x=>typeof x!=='string'||x.length>1000))throw Error('Diccionario demasiado grande o inválido.');
      dictionaries[key]=items;
    }
    return {schema:daily.schema,source:'Google Sheets · DATA CITROEN AÑO',date_min:daily.date_min,date_max:daily.date_max,rows_source:daily.rows_source,rows_other_years:Math.max(0,Math.min(250000,Number(doc.rows_other_years)||0)),metrics:['spend','forms','messages','impressions','clicks','all_clicks','reach'],totals:[...daily.totals],warning_reach_nonnum:Math.max(0,Math.min(daily.rows_source,Number(doc.warning_reach_nonnum)||0)),channels:['Meta Ads'],dictionaries};
  };
  const result={daily:cleanDoc(daily),detail:cleanDoc(detail)};
  for(const [docName,key,fields] of [['daily','daily',['dates','models','territories','accounts']],['detail','campaigns',['months','campaigns','accounts','models','territories']],['detail','creatives',['months','campaigns','adsets','ads','accounts','models','territories']]]){
    const doc=payload[docName],rows=doc[key],sums=[0,0,0,0,0,0,0];
    if(!Array.isArray(rows)||!rows.length||rows.length>100000)throw Error('Agrupaciones inválidas.');
    for(const row of rows){
      if(!Array.isArray(row)||row.length!==fields.length+7)throw Error('Agrupación incompleta.');
      fields.forEach((field,i)=>{if(!Number.isInteger(row[i])||row[i]<0||!doc.dictionaries[field]||row[i]>=doc.dictionaries[field].length)throw Error('Referencia de campo inválida.');});
      for(let i=0;i<7;i++){const v=row[fields.length+i];if(!Number.isFinite(v)||v<0||v>1e15)throw Error('Métrica inválida.');sums[i]+=v;}
    }
    if(!sums.every((n,i)=>tolerance(n,daily.totals[i])))throw Error('Los totales no concilian entre vistas.');
    result[docName][key]=rows;
  }
  if(result.daily.dictionaries.dates.some(d=>!safeDate(d)||d<daily.date_min||d>daily.date_max))throw Error('Fechas fuera del período declarado.');
  if(detail.media_version!==undefined){
    if(detail.media_version!==1||!Array.isArray(detail.creative_media)||detail.creative_media.length>100000)throw Error('Catálogo de imágenes inválido.');
    const identities=new Set(detail.creatives.map(row=>JSON.stringify([row[4],row[1],row[2],row[3]]))),seen=new Set();
    result.detail.media_version=1;
    result.detail.creative_media=detail.creative_media.map(row=>{
      if(!Array.isArray(row)||row.length!==7)throw Error('Imagen de anuncio incompleta.');
      const key=JSON.stringify(row.slice(0,4));
      if(!identities.has(key)||seen.has(key))throw Error('La imagen no corresponde a un anuncio único de esta sincronización.');
      seen.add(key);
      if(!safeDate(row[4])||row[4]<daily.date_min||row[4]>daily.date_max)throw Error('Fecha de imagen inválida.');
      if(!row[5]&&!row[6]||[row[5],row[6]].some(url=>typeof url!=='string'||url!==safeCampaignImage(url)))throw Error('URL de imagen no permitida.');
      return [...row];
    });
  }
  return result;
}
