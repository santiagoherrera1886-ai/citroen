import {CAMPAIGN_SOURCE,campaignColumns,aggregateCampaignRows} from './campaign-data.mjs';

export function buildCampaignScript(token) {
  if(!/^[a-f0-9]{64}$/.test(token))throw Error('Token inválido');
  return `/**
 * Citroën: lectura de DATA CITROEN AÑO → dashboard, cada hora.
 * No modifica celdas. Publica métricas agregadas de campañas en tu dashboard.
 * Funciona desde un proyecto independiente o desde Extensiones → Apps Script.
 * Abre el archivo por su ID fijo; no requiere una hoja activa en el navegador.
 * Ejecuta instalarCitroenSync una vez y autoriza con tu cuenta de Google.
 * No compartas este código: contiene una clave exclusiva de sincronización.
 */
const CITROEN_SYNC = ${JSON.stringify({...CAMPAIGN_SOURCE,endpoint:'https://citroen-rho.vercel.app/api/campaign-sync',token},null,2)};

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
    const {required,indexes}=campaignColumns(headers),rows=[];
    const width=Math.max(...indexes)+1;
    for(let start=2;start<=last;start+=5000){
      const block=sheet.getRange(start,1,Math.min(5000,last-start+1),width).getValues();
      for(const original of block){
        // Retain only the metrics and dimensions; image URLs are not needed.
        const row=indexes.map(index=>original[index]);
        if(!row.some(v=>v!=='' && v!=null))continue;
        if(row[1] instanceof Date)row[1]=Utilities.formatDate(row[1],spreadsheet.getSpreadsheetTimeZone(),'yyyy-MM-dd');
        rows.push(row);
      }
    }
    const data=aggregateCampaignRows(required,rows,CITROEN_SYNC.year);
    const payload=JSON.stringify({sourceId:CITROEN_SYNC.spreadsheetId,tabId:CITROEN_SYNC.sheetId,startedAt,scheduled:ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='sincronizarCitroen'),...data});
    if(Utilities.newBlob(payload).getBytes().length>3500000)throw Error('El resumen supera el límite de envío. No se enviarán datos parciales.');
    const response=UrlFetchApp.fetch(CITROEN_SYNC.endpoint,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload,muteHttpExceptions:true,followRedirects:false});
    if(response.getResponseCode()!==200)throw Error('No se actualizó el dashboard: '+response.getContentText().slice(0,300));
    console.log('Sincronizadas '+data.daily.rows_source+' filas. Último dato: '+data.daily.date_max+'.');
  } finally {lock.releaseLock();}
}

${campaignColumns.toString()}

${aggregateCampaignRows.toString()}
`;
}
