// Read-only Google Sheets connector. No Google credentials leave the server.
export const MAX_ROWS = 5000;
export const MAX_COLUMNS = 50;
const MAX_BYTES = 2000000;
export class SheetError extends Error {
 constructor(code,message,status=400){super(message);this.code=code;this.status=status;}
}
export function parseSheet(input,gidOverride){
 let u;try{u=new URL(String(input).trim());}catch{throw new SheetError('INVALID_URL','Pega el enlace completo de Google Sheets, de Compartir o de Publicar en la web.');}
 if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||u.username||u.password||u.port)throw new SheetError('INVALID_URL','El enlace debe comenzar por https://docs.google.com/spreadsheets/.');
 const match=u.pathname.match(/^\/spreadsheets\/(?:u\/\d+\/)?d\/(e\/)?([A-Za-z0-9_-]{15,200})(?:\/(?:edit|view|preview|copy|export|pub|pubhtml|gviz\/tq))?\/?$/);
 if(!match)throw new SheetError('INVALID_URL','No reconozco este enlace de Sheets. Copia el enlace de la hoja o su enlace publicado.');
 const hash=new URLSearchParams(u.hash.slice(1));
 const gid=String(gidOverride??u.searchParams.get('gid')??hash.get('gid')??'');
 if(gid&&!/^\d{1,15}$/.test(gid))throw new SheetError('INVALID_TAB','El identificador de pestaña (gid) debe ser numérico.');
 const base='https://docs.google.com/spreadsheets/d/'+(match[1]||'')+match[2];
 const url=new URL(base+(match[1]?'/pub':'/export'));
 url.searchParams.set(match[1]?'output':'format','csv');
 if(gid)url.searchParams.set('gid',gid);
 if(match[1])url.searchParams.set('single','true');
 return {id:match[2],published:!!match[1],gid,url:url.href};
}
export function parseCSV(text){
 const s=String(text).replace(/^\uFEFF/,'');
 // Detect delimiter on the first logical record, excluding quoted separators.
 const counts={',':0,';':0,'\t':0};let quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"')i++;else quoted=!quoted;}else if(!quoted){if(c==='\n'||c==='\r')break;if(c in counts)counts[c]++;}}
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
 const rows=[];let row=[],cell='';quoted=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===delimiter&&!quoted){row.push(cell);cell='';}
  else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw new SheetError('INVALID_CSV','El archivo CSV está incompleto. Vuelve a conectar la hoja.');
 if(cell||row.length){row.push(cell);rows.push(row);}
 return rows;
}
export function records(values,{headerRow=1,maxRows=MAX_ROWS}={}){
 const header=values[headerRow-1]||[];
 if(!header.some(x=>String(x??'').trim()))throw new SheetError('EMPTY_HEADER','La fila de encabezados está vacía. Elige la fila que contiene los nombres de las columnas.');
 const seen=new Set(),columns=header.slice(0,MAX_COLUMNS).map((x,i)=>{
  const name=String(x??'').trim().slice(0,80)||'Columna '+(i+1);let key=name,n=2;
  while(seen.has(key))key=name+'_'+n++;
  seen.add(key);return key;
 });
 const rows=[];let bytes=0,truncated=false;
 for(const raw of values.slice(headerRow)){
  if(!raw.some(v=>String(v??'').trim()))continue;
  const row=Object.fromEntries(columns.map((c,i)=>[c,String(raw[i]??'').slice(0,1000)]));
  bytes+=Buffer.byteLength(JSON.stringify(row));
  if(rows.length>=maxRows||bytes>MAX_BYTES){truncated=true;break;}
  rows.push(row);
 }
 return {columns,rows,truncated,columnLimit:MAX_COLUMNS,rowLimit:maxRows,columnsTruncated:header.length>MAX_COLUMNS};
}
async function boundedText(response){
 if(Number(response.headers.get('content-length'))>MAX_BYTES)throw new SheetError('SHEET_TOO_LARGE','Esta pestaña supera 2 MB. Conecta una pestaña resumida para el dashboard.');
 if(!response.body?.getReader){const text=await response.text();if(Buffer.byteLength(text)>MAX_BYTES)throw new SheetError('SHEET_TOO_LARGE','Esta pestaña supera 2 MB. Usa una pestaña resumida.');return text;}
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new SheetError('SHEET_TOO_LARGE','Esta pestaña supera 2 MB. Conecta una pestaña resumida para el dashboard.');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}
async function publicValues(sheet,fetcher){
 let url=sheet.url,response;
 for(let count=0;count<6;count++){
  response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(![301,302,303,307,308].includes(response.status))break;
  const next=new URL(response.headers.get('location')||'',url);
  if(next.protocol!=='https:'||next.username||next.password||!(next.hostname==='docs.google.com'||next.hostname.endsWith('.googleusercontent.com')))throw new SheetError('SHEET_ACCESS','Google solicita acceso a esta hoja.',403);
  url=next.href;
 }
 if(!response.ok)throw new SheetError(response.status===429?'GOOGLE_RATE_LIMIT':'SHEET_ACCESS',response.status===429?'Google limitó las solicitudes. Espera un momento y vuelve a intentar.':'La hoja no permite lectura con este enlace. Revisa su acceso o usa la conexión privada.',response.status===429?429:403);
 const text=await boundedText(response),type=response.headers.get('content-type')||'';
 if(type.includes('text/html')||/^\s*(?:<!doctype|<html|<head|<body)/i.test(text))throw new SheetError('SHEET_ACCESS','Google devolvió una pantalla de acceso en lugar de los datos.',403);
 return parseCSV(text);
}
export async function readSheet(settings,{fetcher=fetch,token=null,serviceEmail=null}={}){
 const sheet=parseSheet(settings.url,settings.gid),headerRow=Number(settings.headerRow??1),maxRows=Number(settings.maxRows??MAX_ROWS);
 if(!Number.isInteger(headerRow)||headerRow<1||headerRow>100)throw new SheetError('INVALID_HEADER','La fila de encabezados debe estar entre 1 y 100.');
 if(!Number.isInteger(maxRows)||maxRows<1||maxRows>MAX_ROWS)throw new SheetError('INVALID_LIMIT','El límite de filas debe estar entre 1 y 5.000.');
 const mode=['auto','public','private'].includes(settings.mode)?settings.mode:'auto';
 let values,tabs=[],title='Google Sheets',tabTitle='',gid=sheet.gid,access='public';
 if(mode!=='private'||sheet.published){
  try{values=await publicValues(sheet,fetcher);}catch(e){
   if(e.code!=='SHEET_ACCESS'||mode==='public'||sheet.published)throw e;
   if(!token)throw new SheetError('GOOGLE_NOT_CONFIGURED','Esta hoja requiere acceso privado. Falta configurar la cuenta de servicio de Google en Vercel; tu sesión de Google no se comparte con el dashboard.',503);
  }
 }
 if(!values){
  if(!token)throw new SheetError('GOOGLE_NOT_CONFIGURED','La conexión privada requiere configurar GOOGLE_SERVICE_ACCOUNT_JSON en Vercel.',503);
  const accessToken=await token();
  const get=async path=>{
   const res=await fetcher('https://sheets.googleapis.com/v4/spreadsheets/'+sheet.id+path,{headers:{Authorization:'Bearer '+accessToken},signal:AbortSignal.timeout(15000)});
   if(!res.ok){let reason='';try{reason=(await res.json()).error?.status||'';}catch{}
    if(res.status===429)throw new SheetError('GOOGLE_RATE_LIMIT','Google limitó las solicitudes. Espera un momento y vuelve a intentar.',429);
    throw new SheetError('SHEET_ACCESS',reason==='PERMISSION_DENIED'?'Google denegó el acceso. Comparte la hoja como lector con la cuenta de servicio y comprueba que la API Sheets esté habilitada.':'No fue posible leer la hoja. Revisa el enlace y los permisos de la cuenta de servicio.',403);
   }
   return res.json();
  };
  const meta=await get('?fields=properties(title),sheets(properties(sheetId,title))');
  tabs=(meta.sheets||[]).map(x=>({gid:String(x.properties.sheetId),title:x.properties.title}));
  const selected=gid?tabs.find(x=>x.gid===gid):tabs[0];
  if(!selected)throw new SheetError('TAB_NOT_FOUND','La pestaña de ese enlace ya no existe. Copia el enlace de la pestaña que quieres conectar.');
  gid=selected.gid;tabTitle=selected.title;title=meta.properties?.title||title;access='private';
  const range="'"+selected.title.replace(/'/g,"''")+"'!A"+headerRow+':AX'+(headerRow+maxRows+1);
  values=(await get('/values/'+encodeURIComponent(range)+'?valueRenderOption=FORMATTED_VALUE')).values||[];
 }
 const result=records(values,{headerRow:access==='private'?1:headerRow,maxRows});
 return {ok:true,kind:'sheets',source:title+(tabTitle?' · '+tabTitle:''),...result,tabs,gid,access,headerRow,serviceEmail:access==='private'?serviceEmail:null,previewOnly:true,fetchedAt:new Date().toISOString()};
}
