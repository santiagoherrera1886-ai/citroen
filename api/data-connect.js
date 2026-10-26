import {createSign} from 'node:crypto';
import {ready,currentUser,json,error,sameOrigin} from '../lib/editor-auth.mjs';
const validName=s=>typeof s==='string'&&/^[A-Za-z_][A-Za-z0-9_-]{0,100}$/.test(s);
function creds(){try{const a=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||'null');return a?.client_email&&a?.private_key?a:null;}catch{return null;}}
async function oauth(){
 const a=creds();if(!a)throw Error('Falta configurar GOOGLE_SERVICE_ACCOUNT_JSON en Vercel.');
 const t=Math.floor(Date.now()/1000),encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const payload=encode({iss:a.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/bigquery',aud:'https://oauth2.googleapis.com/token',iat:t,exp:t+3300});
 const b=encode({typ:'JWT',alg:'RS256'})+'.'+payload,sign=createSign('RSA-SHA256');sign.update(b);sign.end();
 const jwt=b+'.'+sign.sign(a.private_key).toString('base64url');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Google no aceptó las credenciales del servicio.');
 return (await response.json()).access_token;
}
function parseSheet(url){try{const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='docs.google.com')return null;const m=u.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]{15,150})/),gid=u.searchParams.get('gid')||u.hash.match(/gid=(\d+)/)?.[1]||'0';if(!m||!/^\d{1,15}$/.test(gid))return null;return {id:m[1],gid};}catch{return null;}}
function csv(txt){const out=[];let row=[],cell='',quote=false;const s=String(txt).slice(0,600000);for(let i=0;i<s.length&&out.length<111;i++){const c=s[i];if(c==='"'){if(quote&&s[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if((c==='\r'||c==='\n')&&!quote){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);out.push(row.slice(0,50));row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);out.push(row.slice(0,50));}return out;}
function records(values){const names=(values[0]||[]).slice(0,50).map((x,i)=>String(x||'Columna '+(i+1)).slice(0,90)),seen=new Set(),columns=names.map((n,i)=>{let c=n,j=2;while(seen.has(c))c=n+'_'+(j++);seen.add(c);return c;});return {columns,rows:values.slice(1,101).map(row=>Object.fromEntries(columns.map((c,i)=>[c,String(row[i]??'').slice(0,500)])))};}
export default async function handler(req,res){
 try{
  if(!ready())return error(res,503,'Acceso privado no configurado.');
  if(req.method==='GET')return json(res,200,{ok:true,googleServiceAccount:!!creds(),publicSheets:true});
  if(req.method!=='POST')return error(res,405,'Método no permitido.');
  const u=await currentUser(req);if(!u||u.mustChange)return error(res,401,'Debes iniciar sesión en Diseño.');
  if(!sameOrigin(req)||!String(req.headers['content-type']||'').includes('application/json'))return error(res,403,'Origen no autorizado.');
  const b=req.body||{};
  if(b.kind==='sheets'){
   const sheet=parseSheet(b.url);if(!sheet)return error(res,400,'Pega una URL válida de Google Sheets.');
   let values;
   if(creds()){
    const access=await oauth();
    const meta=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sheet.id+'?fields=sheets(properties(sheetId,title))',{headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(12000)});
    if(!meta.ok)throw Error('La cuenta de servicio no tiene acceso a la hoja. Compártela con su correo.');
    const tab=(await meta.json()).sheets?.find(x=>String(x.properties.sheetId)===sheet.gid);
    if(!tab)throw Error('No se encontró la pestaña en Google Sheets.');
    const range=encodeURIComponent("'"+tab.properties.title.replace(/'/g,"''")+"'!A1:AX110");
    const resSheets=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sheet.id+'/values/'+range,{headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(12000)});
    if(!resSheets.ok)throw Error('No fue posible acceder a los valores de la hoja.');
    values=(await resSheets.json()).values||[];
   }else{
    const url='https://docs.google.com/spreadsheets/d/'+sheet.id+'/export?format=csv&gid='+sheet.gid;
    const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(12000)});
    if(!response.ok||!String(response.headers.get('content-type')||'').toLowerCase().includes('csv'))throw Error('Hoja privada: publícala como CSV o configura credenciales privadas de Google.');
    values=csv(await response.text());
   }
   return json(res,200,{ok:true,source:'Google Sheets',kind:'sheets',...records(values),previewOnly:true});
  }
  if(b.kind==='bigquery'){
   const project=String(b.project||''),dataset=String(b.dataset||''),table=String(b.table||'');
   if(!/^[a-z][a-z0-9-]{4,62}$/.test(project)||!validName(dataset)||!validName(table))return error(res,400,'Identificadores de BigQuery inválidos.');
   const access=await oauth();
   const quoted=String.fromCharCode(96),query='SELECT * FROM '+quoted+project+'.'+dataset+'.'+table+quoted+' LIMIT 100';
   const response=await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/'+project+'/queries',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({query,useLegacySql:false,maxResults:100,timeoutMs:12000,maximumBytesBilled:'100000000'}),signal:AbortSignal.timeout(18000)});
   const data=await response.json();
   if(!response.ok||data.jobComplete===false)throw Error(String(data.error?.message||'No se completó la consulta BigQuery.').slice(0,180));
   const columns=(data.schema?.fields||[]).slice(0,50).map(x=>String(x.name).slice(0,90));
   const rows=(data.rows||[]).slice(0,100).map(row=>Object.fromEntries(columns.map((c,i)=>[c,String(row.f?.[i]?.v??'').slice(0,500)])));
   return json(res,200,{ok:true,kind:'bigquery',source:project+'.'+dataset+'.'+table,columns,rows,previewOnly:true});
  }
  return error(res,400,'Tipo de conexión no válido.');
 }catch(e){console.error('Citroen connector',e?.message||'error');return error(res,400,String(e.message||'Error de conexión').slice(0,230));}
}
