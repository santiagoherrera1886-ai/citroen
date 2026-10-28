import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {get,put} from '@vercel/blob';
import {currentUser,json,error,ready,sameOrigin} from '../lib/editor-auth.mjs';
import {CAMPAIGN_SOURCE,validateCampaignData} from '../lib/campaign-data.mjs';
import {buildCampaignScript} from '../lib/campaign-apps-script.mjs';

const CONFIG='private/citroen-campaign-sync-config-v1.json';
const DATA='private/citroen-campaign-sync-data-v1.json';
const digest=s=>createHash('sha256').update(s).digest('hex');
async function read(path){const r=await get(path,{access:'private',useCache:false});if(!r||r.statusCode===404)return null;if(r.statusCode!==200)throw Error('No se pudo leer la conexión.');return {value:JSON.parse(await new Response(r.stream).text()),etag:r.blob?.etag};}
async function write(path,value,previous){return put(path,JSON.stringify(value),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!previous, ...(previous?{ifMatch:previous.etag}:{})});}
function status(record){const d=record?.value;return {ok:true,connected:!!d,revision:d?.revision||null,syncedAt:d?.syncedAt||null,dateMin:d?.daily.date_min||null,dateMax:d?.daily.date_max||null,rows:d?.daily.rows_source||0,scheduled:!!d?.scheduled,intervalMinutes:60,stale:!!d&&Date.now()-Date.parse(d.syncedAt)>3*3600000,mediaVersion:d?.detail.media_version||0,images:d?.detail.creative_media?.length||0,source:'DATA CITROEN AÑO'};}

export function createCampaignSyncHandler(deps={}){
 const storeRead=deps.read||read,storeWrite=deps.write||write,authenticate=deps.currentUser||currentUser,isReady=deps.ready||ready;
 return async function handler(req,res){
  try{
   if(!isReady())return error(res,503,'Almacenamiento de conexión no disponible.');
   if(req.method==='GET'){
    const record=await storeRead(DATA),state=status(record);
    return json(res,200,req.query?.action==='data'&&record?{...state,daily:record.value.daily,detail:record.value.detail}:state);
   }
   if(req.method!=='POST')return error(res,405,'Método no permitido.');
   if(!String(req.headers['content-type']||'').includes('application/json'))return error(res,415,'Se requiere JSON.');
   const b=req.body||{};
   if(b.action==='setup'){
    const user=await authenticate(req);
    if(!user||user.mustChange||user.role!=='owner')return error(res,403,'Solo el administrador puede preparar la sincronización.');
    if(!sameOrigin(req))return error(res,403,'Origen no autorizado.');
    const prior=await storeRead(CONFIG),token=randomBytes(32).toString('hex');
    await storeWrite(CONFIG,{tokenHash:digest(token),createdAt:new Date().toISOString()},prior);
    return json(res,200,{ok:true,script:buildCampaignScript(token),source:CAMPAIGN_SOURCE,needsGoogleAuthorization:true});
   }
   const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
   if(!/^[a-f0-9]{64}$/.test(token))return error(res,401,'Clave de sincronización inválida.');
   const config=await storeRead(CONFIG),expected=config?.value.tokenHash;
   if(typeof expected!=='string'||expected.length!==64||!timingSafeEqual(Buffer.from(digest(token)),Buffer.from(expected)))return error(res,401,'Clave de sincronización inválida.');
   if(b.sourceId!==CAMPAIGN_SOURCE.spreadsheetId||b.tabId!==CAMPAIGN_SOURCE.sheetId)return error(res,400,'La conexión corresponde exclusivamente a DATA CITROEN AÑO.');
   if(JSON.stringify(b).length>3500000)return error(res,413,'Sincronización demasiado grande.');
   const started=Date.parse(b.startedAt);
   if(!Number.isFinite(started)||Math.abs(Date.now()-started)>15*60000)return error(res,400,'Hora de sincronización inválida.');
   const data=validateCampaignData(b),prior=await storeRead(DATA);
   if(prior&&Date.parse(prior.value.startedAt)>=started)return error(res,409,'Ya se recibió una sincronización más reciente.');
   const saved={...data,startedAt:b.startedAt,scheduled:b.scheduled===true,syncedAt:new Date().toISOString(),revision:randomUUID()};
   await storeWrite(DATA,saved,prior);
   return json(res,200,status({value:saved}));
  }catch(e){
   if(e?.name==='BlobPreconditionFailedError')return error(res,409,'Otra sincronización terminó antes. Se conserva la versión más reciente.');
   console.error('Campaign sync',e?.name||'Error');
   return error(res,400,String(e.message||'No fue posible sincronizar.').slice(0,240));
  }
 };
}
export default createCampaignSyncHandler();
