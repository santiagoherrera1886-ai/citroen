import {createSign} from 'node:crypto';
import {ready,currentUser,json,error,sameOrigin} from '../lib/editor-auth.mjs';
import {readSheet,SheetError} from '../lib/sheets-connector.mjs';
const validName=s=>typeof s==='string'&&/^[A-Za-z_][A-Za-z0-9_-]{0,100}$/.test(s);
function creds(){try{const a=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||'null');return a?.client_email&&a?.private_key?a:null;}catch{return null;}}
async function oauth(scope='https://www.googleapis.com/auth/spreadsheets.readonly'){
 const a=creds();if(!a)throw Error('Falta configurar GOOGLE_SERVICE_ACCOUNT_JSON en Vercel.');
 const t=Math.floor(Date.now()/1000),encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const payload=encode({iss:a.client_email,scope,aud:'https://oauth2.googleapis.com/token',iat:t,exp:t+3300});
 const b=encode({typ:'JWT',alg:'RS256'})+'.'+payload,sign=createSign('RSA-SHA256');sign.update(b);sign.end();
 const jwt=b+'.'+sign.sign(a.private_key).toString('base64url');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Google no aceptó las credenciales del servicio.');
 return (await response.json()).access_token;
}
export default async function handler(req,res){
 try{
  if(!ready())return error(res,503,'Acceso privado no configurado.');
  if(req.method==='GET'){
   const account=creds(),user=await currentUser(req);
   return json(res,200,{ok:true,googleServiceAccount:!!account,publicSheets:true,maxRows:5000,serviceEmail:user&&!user.mustChange?account?.client_email||null:null});
  }
  if(req.method!=='POST')return error(res,405,'Método no permitido.');
  const u=await currentUser(req);if(!u||u.mustChange)return error(res,401,'Debes iniciar sesión en Diseño.');
  if(!sameOrigin(req)||!String(req.headers['content-type']||'').includes('application/json'))return error(res,403,'Origen no autorizado.');
  const b=req.body||{};
  if(b.kind==='sheets'){
   const account=creds();
   return json(res,200,await readSheet(b,{token:account?()=>oauth():null,serviceEmail:account?.client_email}));
  }
  if(b.kind==='bigquery'){
   const project=String(b.project||''),dataset=String(b.dataset||''),table=String(b.table||'');
   if(!/^[a-z][a-z0-9-]{4,62}$/.test(project)||!validName(dataset)||!validName(table))return error(res,400,'Identificadores de BigQuery inválidos.');
   const access=await oauth('https://www.googleapis.com/auth/bigquery');
   const quoted=String.fromCharCode(96),query='SELECT * FROM '+quoted+project+'.'+dataset+'.'+table+quoted+' LIMIT 100';
   const response=await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/'+project+'/queries',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({query,useLegacySql:false,maxResults:100,timeoutMs:12000,maximumBytesBilled:'100000000'}),signal:AbortSignal.timeout(18000)});
   const data=await response.json();
   if(!response.ok||data.jobComplete===false)throw Error(String(data.error?.message||'No se completó la consulta BigQuery.').slice(0,180));
   const columns=(data.schema?.fields||[]).slice(0,50).map(x=>String(x.name).slice(0,90));
   const rows=(data.rows||[]).slice(0,100).map(row=>Object.fromEntries(columns.map((c,i)=>[c,String(row.f?.[i]?.v??'').slice(0,500)])));
   return json(res,200,{ok:true,kind:'bigquery',source:project+'.'+dataset+'.'+table,columns,rows,previewOnly:true});
  }
  return error(res,400,'Tipo de conexión no válido.');
 }catch(e){
  const timeout=e?.name==='TimeoutError'||e?.name==='AbortError';
  console.error('Citroen connector',e instanceof SheetError?e.code:timeout?'TIMEOUT':'CONNECTOR_ERROR');
  return json(res,e instanceof SheetError?e.status:timeout?504:400,{ok:false,code:e.code|| (timeout?'TIMEOUT':'CONNECTOR_ERROR'),error:timeout?'Google tardó demasiado. Intenta actualizar la fuente nuevamente.':String(e.message||'Error de conexión').slice(0,400)});
 }
}
