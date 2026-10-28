/**
 * Citroën: lectura de DATA CITROEN AÑO → dashboard, cada hora.
 * No modifica celdas. Publica métricas e imágenes de anuncios en tu dashboard.
 * Funciona desde un proyecto independiente o desde Extensiones → Apps Script.
 * Abre el archivo por su ID fijo; no requiere una hoja activa en el navegador.
 * Ejecuta instalarCitroenSync una vez y autoriza con tu cuenta de Google.
 * Si token está vacío, conserva la clave ya guardada en este proyecto.
 */
const CITROEN_SYNC = {
  "spreadsheetId": "1ku1vk57fU0_wHChmXObUaUpvw4KARMj6T1vqLpp5YBo",
  "sheetId": 2001595094,
  "sheetName": "DATA CITROEN AÑO",
  "year": 2026,
  "url": "https://docs.google.com/spreadsheets/d/1ku1vk57fU0_wHChmXObUaUpvw4KARMj6T1vqLpp5YBo/edit",
  "endpoint": "https://citroen-rho.vercel.app/api/campaign-sync",
  "token": ""
};

function instalarCitroenSync() {
  const properties = PropertiesService.getScriptProperties();
  const token = CITROEN_SYNC.token || properties.getProperty('CITROEN_SYNC_TOKEN');
  if(!/^[a-f0-9]{64}$/.test(token || ''))throw Error('Falta la clave válida del dashboard. Conserva el valor token de tu código anterior o copia el código completo desde Preparar actualización automática.');
  const spreadsheet = SpreadsheetApp.openById(CITROEN_SYNC.spreadsheetId);
  if(!spreadsheet || spreadsheet.getId()!==CITROEN_SYNC.spreadsheetId)throw Error('No fue posible abrir Citroen Seguimiento de campañas. Usa una cuenta con acceso al archivo.');
  properties.setProperty('CITROEN_SYNC_TOKEN', token);
  // Touch only this integration's triggers; other automations remain intact.
  const own = ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='sincronizarCitroen');
  if(!own.length)ScriptApp.newTrigger('sincronizarCitroen').timeBased().everyHours(1).create();
  sincronizarCitroen();
  console.log('Primera sincronización enviada. Activador de Citroën instalado cada hora.');
}

function pausarCitroenSync() {
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='sincronizarCitroen').forEach(t=>ScriptApp.deleteTrigger(t));
}

function sincronizarCitroen() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try {
    const startedAt=new Date().toISOString();
    const token=PropertiesService.getScriptProperties().getProperty('CITROEN_SYNC_TOKEN');
    if(!token)throw Error('Ejecuta instalarCitroenSync primero.');
    const spreadsheet=SpreadsheetApp.openById(CITROEN_SYNC.spreadsheetId);
    if(!spreadsheet || spreadsheet.getId()!==CITROEN_SYNC.spreadsheetId)throw Error('Archivo de origen incorrecto.');
    const sheet=spreadsheet.getSheets().find(s=>s.getSheetId()===CITROEN_SYNC.sheetId);
    if(!sheet || sheet.getName()!==CITROEN_SYNC.sheetName)throw Error('No se encontró la pestaña DATA CITROEN AÑO.');
    const last=sheet.getLastRow();
    if(last>250001)throw Error('La fuente supera 250.000 filas. No se enviarán datos parciales.');
    const lastColumn=sheet.getLastColumn();
    if(lastColumn<1)throw Error('La pestaña no tiene encabezados.');
    const headers=sheet.getRange(1,1,1,lastColumn).getValues()[0];
    const {required,indexes,mediaHeaders,mediaIndexes}=campaignColumns(headers),rows=[];
    const selected=[...indexes,...mediaIndexes],width=Math.max(...selected)+1;
    for(let start=2;start<=last;start+=5000){
      const block=sheet.getRange(start,1,Math.min(5000,last-start+1),width).getValues();
      for(const original of block){
        const row=selected.map(index=>index<0?'':original[index]);
        if(!row.some(v=>v!=='' && v!=null))continue;
        if(row[1] instanceof Date)row[1]=Utilities.formatDate(row[1],spreadsheet.getSpreadsheetTimeZone(),'yyyy-MM-dd');
        rows.push(row);
      }
    }
    const data=aggregateCampaignRows([...required,...mediaHeaders],rows,CITROEN_SYNC.year);
    const payload=JSON.stringify({sourceId:CITROEN_SYNC.spreadsheetId,tabId:CITROEN_SYNC.sheetId,startedAt,scheduled:ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='sincronizarCitroen'),...data});
    if(Utilities.newBlob(payload).getBytes().length>3500000)throw Error('El resumen supera el límite de envío. No se enviarán datos parciales.');
    const response=UrlFetchApp.fetch(CITROEN_SYNC.endpoint,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload,muteHttpExceptions:true,followRedirects:false});
    if(response.getResponseCode()!==200)throw Error('No se actualizó el dashboard: '+response.getContentText().slice(0,300));
    console.log('Sincronizadas '+data.daily.rows_source+' filas. Último dato: '+data.daily.date_max+'.');
  } finally {lock.releaseLock();}
}

function campaignColumns(headers) {
  const required = ['Account name','Date','Campaign name','Ad name','Ad set name','Cost','On-Facebook leads','Messaging conversations started','Impressions','Link clicks','Clicks (all)','Reach'];
  const normalize = value => String(value ?? '').trim().replace(/\s+/g,' ').toLowerCase();
  const normalized = headers.map(normalize);
  const indexes = required.map(name => normalized.indexOf(normalize(name)));
  if (indexes.some(i => i < 0)) throw Error('Faltan columnas: ' + required.filter((_,i) => indexes[i] < 0).join(', '));
  for (let i=0;i<indexes.length;i++) if(normalized.lastIndexOf(normalize(required[i]))!==indexes[i]) throw Error('Columna duplicada: '+required[i]+'.');
  const mediaHeaders=['Promoted post image URL','Promoted post thumbnail URL'];
  return {required,indexes,mediaHeaders,mediaIndexes:mediaHeaders.map(name=>normalized.indexOf(normalize(name)))};
}

function safeCampaignImage(value) {
  if(typeof value!=='string'||value.length>4096)return '';
  const url=value.trim();
  return /^https:\/\/(?:[a-z0-9-]+\.)*(?:fbcdn\.net|fbsbx\.com|cdninstagram\.com)\/[^\s\\<>"']+$/i.test(url)?url:'';
}

function aggregateCampaignRows(headers, rows, year = 2026) {
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
