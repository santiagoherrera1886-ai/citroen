import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {aggregateCampaignRows,campaignColumns,validateCampaignData,CAMPAIGN_SOURCE} from '../lib/campaign-data.mjs';
import {buildCampaignScript} from '../lib/campaign-apps-script.mjs';
import {createCampaignSyncHandler} from '../api/campaign-sync.js';
import {BlobPreconditionFailedError} from '@vercel/blob';

const headers=['Account name','Date','Campaign name','Ad name','Ad set name','Cost','On-Facebook leads','Cost per on-Facebook lead','Impressions','Link clicks','Reach','CTR (all)','Frequency','CPM (cost per 1000 impressions)','Clicks (all)','Messaging conversations started'];
const row=(date='2026-10-28',cost=100)=>['Cuenta',date,'2026_colombia_citroen_basalt-bogota','video','conjunto',cost,2,50,1000,30,700,3,1,100,50,4];
const liveHeaders=[...headers.slice(0,5),'Promoted post thumbnail URL','Promoted post image URL',...headers.slice(5)];
const liveRow=()=>[...row().slice(0,5),'https://scontent.xx.fbcdn.net/thumb.jpg','https://scontent.xx.fbcdn.net/image.jpg',...row().slice(5)];

test('full source > 5000 rows reconciles all views; two outcome types stay separate',()=>{
 const rows=Array.from({length:6002},()=>row());rows.push(row('2025-12-31',999),Array(16).fill(''));
 const data=validateCampaignData(aggregateCampaignRows(headers,rows));
 assert.equal(data.daily.rows_source,6002);assert.equal(data.daily.rows_other_years,1);
 assert.deepEqual(data.daily.totals,[600200,12004,24008,6002000,180060,300100,4201400]);
 assert.equal(data.daily.dictionaries.territories[0],'Bogotá');assert.equal(data.daily.dictionaries.models[0],'Basalt');
});
test('Excel dates, zero values and invalid cells have explicit semantics',()=>{
 const data=aggregateCampaignRows(headers,[row(46023,0)]);assert.equal(data.daily.date_min,'2026-01-01');
 const missing=row();missing[10]='#VALUE!';assert.equal(aggregateCampaignRows(headers,[missing]).daily.warning_reach_nonnum,1);
 assert.throws(()=>aggregateCampaignRows(headers,[row('2026-02-31')]),/Fecha inválida/);
 assert.throws(()=>aggregateCampaignRows(headers,[row('2026-10-28','#REF!')]),/no numérico/);
 assert.throws(()=>aggregateCampaignRows(headers,[]),/no tiene registros/);
 assert.throws(()=>aggregateCampaignRows(headers.slice(1),[row()]),/Faltan columnas/);
});
test('headers tolerate spacing and case, while missing or ambiguous metrics fail explicitly',()=>{
 const spaced=liveHeaders.map(name=>'  '+name.toUpperCase().replaceAll(' ','\u00a0 ')+'  ');
 assert.deepEqual(aggregateCampaignRows(spaced,[liveRow()]).daily.totals,[100,2,4,1000,30,50,700]);
 assert.throws(()=>campaignColumns(liveHeaders.slice(0,16)),/Messaging conversations started, Clicks \(all\)/);
 assert.throws(()=>campaignColumns([...liveHeaders,' clicks (all) ']),/Columna duplicada/);
});
test('image sync keeps the latest exact ad identity and preserves all metric totals',()=>{
 const newer=liveRow(),older=liveRow();newer[1]='2026-10-28';older[1]='2026-10-01';
 newer[5]='https://scontent.xx.fbcdn.net/thumb-new.jpg';newer[6]='https://scontent.xx.fbcdn.net/new.jpg';
 older[5]='https://scontent.xx.fbcdn.net/thumb-old.jpg';older[6]='https://scontent.xx.fbcdn.net/old.jpg';
 const data=validateCampaignData(aggregateCampaignRows(liveHeaders,[newer,older]));
 assert.deepEqual(data.daily.totals,[200,4,8,2000,60,100,1400]);
 assert.equal(data.detail.media_version,1);assert.equal(data.detail.creative_media.length,1);
 assert.deepEqual(data.detail.creative_media[0].slice(4),['2026-10-28',newer[6],newer[5]]);
 const removed=[...newer];removed[5]='';removed[6]='';assert.equal(aggregateCampaignRows(liveHeaders,[older,removed]).detail.creative_media.length,0);
 const unsafe=[...newer];unsafe[5]='javascript:alert(1)';unsafe[6]='https://fbcdn.net.evil.test/image.jpg';assert.equal(aggregateCampaignRows(liveHeaders,[unsafe]).detail.creative_media.length,0);
 const bad=structuredClone(data);bad.detail.creative_media[0][0]=999;assert.throws(()=>validateCampaignData(bad),/no corresponde/);
 const duplicate=structuredClone(data);duplicate.detail.creative_media.push([...duplicate.detail.creative_media[0]]);assert.throws(()=>validateCampaignData(duplicate),/único/);
 const hostile=structuredClone(data);hostile.detail.creative_media[0][5]='https://evil.test/a.jpg';assert.throws(()=>validateCampaignData(hostile),/URL de imagen/);
 const legacy=structuredClone(data);delete legacy.detail.creative_media;delete legacy.detail.media_version;assert.equal(validateCampaignData(legacy).detail.media_version,undefined);
 assert.equal(readFileSync(new URL('../downloads/CitroenSync.gs',import.meta.url),'utf8'),buildCampaignScript(''),'Download must be the complete current script with no credential');
});
test('invalid or inconsistent payloads cannot replace a complete snapshot',()=>{
 const data=aggregateCampaignRows(headers,[row()]);data.detail.creatives[0][7]++;
 assert.throws(()=>validateCampaignData(data),/no concilian/);
 const other=aggregateCampaignRows(headers,[row()]);other.daily.daily[0][0]=99;
 assert.throws(()=>validateCampaignData(other),/Referencia/);
});

function harness({beforeWrite=()=>{}}={}){
 const blobs=new Map();let editor=null,version=0;
 const handler=createCampaignSyncHandler({ready:()=>true,currentUser:async()=>editor,read:async p=>blobs.get(p)||null,write:async(p,value,previous)=>{await beforeWrite(p,value,previous,blobs);const current=blobs.get(p);assert.equal(previous?.etag,current?.etag);blobs.set(p,{value,etag:String(++version)});}});
 const call=async(body,token,method='POST',query={})=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.body=data;return this;}};await handler({method,query,body,headers:{host:'citroen.example',origin:'https://citroen.example','content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})}},res);return res;};
 return {call,setUser:u=>editor=u,blobs};
}
test('setup requires owner; ingestion needs scoped key; failed writes preserve prior data',async()=>{
 const h=harness();assert.equal((await h.call({action:'setup'})).code,403);
 h.setUser({role:'editor'});assert.equal((await h.call({action:'setup'})).code,403);
 h.setUser({role:'owner'});const setup=await h.call({action:'setup'});assert.equal(setup.code,200);
 const token=setup.body.script.match(/"token": "([a-f0-9]{64})"/)[1];
 assert.ok([...h.blobs.values()].every(x=>!JSON.stringify(x).includes(token)),'Persist hash only');
 assert.equal((await h.call(null,null,'GET')).body.connected,false);
 const payload={...aggregateCampaignRows(headers,[row()]),sourceId:CAMPAIGN_SOURCE.spreadsheetId,tabId:CAMPAIGN_SOURCE.sheetId,startedAt:new Date().toISOString(),scheduled:true};
 assert.equal((await h.call(payload)).code,401);
 assert.equal((await h.call({...payload,sourceId:'another-sheet'},token)).code,400);
 assert.equal((await h.call(payload,token)).code,200);
 const saved=(await h.call(null,null,'GET',{action:'data'})).body;assert.equal(saved.daily.totals[0],100);assert.equal(saved.scheduled,true);assert.ok(!JSON.stringify(saved).includes(token));
 assert.equal((await h.call(payload,token)).code,409,'Replay does not double count');
 const bad=structuredClone(payload);bad.daily.totals[0]=500;bad.startedAt=new Date(Date.now()+1000).toISOString();
 assert.equal((await h.call(bad,token)).code,400);
 assert.equal((await h.call(null,null,'GET',{action:'data'})).body.revision,saved.revision);
 await h.call({action:'setup'});assert.equal((await h.call(payload,token)).code,401,'Replacing setup revokes the old ingest key');
});

for(const mode of ['older concurrent update','newer concurrent update','persistent conflict'])test('storage conflict: '+mode,async()=>{
 let collide=false,writes=0;
 const now=Date.now(),initialTime=new Date(now-6000).toISOString(),incomingTime=new Date(now-2000).toISOString();
 const h=harness({beforeWrite:(path,value,previous,blobs)=>{
  if(!collide||!path.endsWith('-data-v1.json'))return;
  writes++;
  if(mode==='persistent conflict')throw new BlobPreconditionFailedError();
  if(writes===1){
   const current=blobs.get(path),concurrent=structuredClone(current.value);
   concurrent.startedAt=new Date(now+(mode==='newer concurrent update'?-1000:-4000)).toISOString();
   concurrent.revision='concurrent';
   blobs.set(path,{value:concurrent,etag:'concurrent-etag'});
   throw new BlobPreconditionFailedError();
  }
  assert.equal(previous.etag,'concurrent-etag','Retry must use the freshly read validator');
 }});
 h.setUser({role:'owner'});const setup=await h.call({action:'setup'});
 const token=setup.body.script.match(/"token": "([a-f0-9]{64})"/)[1];
 const payload={...aggregateCampaignRows(liveHeaders,[liveRow()]),sourceId:CAMPAIGN_SOURCE.spreadsheetId,tabId:CAMPAIGN_SOURCE.sheetId,startedAt:initialTime,scheduled:true};
 assert.equal((await h.call(payload,token)).code,200);
 const original=(await h.call(null,null,'GET',{action:'data'})).body;
 collide=true;
 const result=await h.call({...payload,startedAt:incomingTime},token);
 const saved=(await h.call(null,null,'GET',{action:'data'})).body;
 if(mode==='older concurrent update'){
  assert.equal(result.code,200);assert.equal(writes,2);assert.notEqual(saved.revision,'concurrent');
  assert.equal(saved.images,1);assert.equal(saved.mediaVersion,1);assert.equal(saved.scheduled,true);
 }else if(mode==='newer concurrent update'){
  assert.equal(result.code,409);assert.equal(writes,1);assert.equal(saved.revision,'concurrent');
 }else{
  assert.equal(result.code,409);assert.equal(writes,3);assert.equal(saved.revision,original.revision);
  assert.match(result.body.error,/vuelve a ejecutar sincronizarCitroen/);
  assert.ok(!result.body.error.includes('ETag'),'User gets actionable error, not SDK internals');
 }
 assert.deepEqual(saved.daily.totals,original.daily.totals,'Conflicts never add or erase metrics');
 assert.equal((await h.call({...payload,startedAt:new Date(now).toISOString()},'b'.repeat(64))).code,401,'Retries do not bypass key validation');
});
for(const layout of [
 {name:'original 16 columns',headers,row},
 {name:'live 18 columns with metrics in Q and R',headers:liveHeaders,row:liveRow},
 {name:'reordered metrics beyond R',headers:[...Array.from({length:8},(_,i)=>'Extra '+i),...liveHeaders.toReversed()],row:()=>[...Array(8).fill('ignored'),...liveRow().toReversed()]},
])test('standalone script reads '+layout.name+' and installs one hourly trigger',()=>{
 const token='a'.repeat(64),script=buildCampaignScript(token),triggers=[],properties=new Map(),sent=[];
 const sheet={getSheetId:()=>CAMPAIGN_SOURCE.sheetId,getName:()=>CAMPAIGN_SOURCE.sheetName,getLastRow:()=>6003,getLastColumn:()=>layout.headers.length,getRange:(start,col,count,width)=>{assert.equal(col,1);assert.ok(width<=layout.headers.length);return {getValues:()=>start===1?[layout.headers.slice(0,width)]:Array.from({length:count},()=>layout.row().slice(0,width))};}};
 const context={console:{log(){}},SpreadsheetApp:{getActiveSpreadsheet:()=>null,openById:id=>{assert.equal(id,CAMPAIGN_SOURCE.spreadsheetId);return {getId:()=>id,getSheets:()=>[sheet],getSpreadsheetTimeZone:()=> 'America/Bogota'};}},PropertiesService:{getScriptProperties:()=>({setProperty:(k,v)=>properties.set(k,v),getProperty:k=>properties.get(k)})},ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased(){return this;},everyHours(hours){assert.equal(hours,1);return this;},create(){triggers.push({getHandlerFunction:()=>name});}}),deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1)},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{newBlob:payload=>({getBytes:()=>Buffer.from(payload)})},UrlFetchApp:{fetch:(url,options)=>{assert.equal(url,'https://citroen-rho.vercel.app/api/campaign-sync');assert.equal(options.headers.Authorization,'Bearer '+token);const p=JSON.parse(options.payload);validateCampaignData(p);sent.push(p);return {getResponseCode:()=>200};}}};
 assert.ok(!script.includes('@OnlyCurrentDoc'),'Standalone access must not request only a nonexistent current document');
 vm.createContext(context);vm.runInContext(script,context);vm.runInContext('instalarCitroenSync()',context);vm.runInContext('instalarCitroenSync()',context);
 assert.equal(triggers.length,1);assert.equal(sent.length,2);assert.equal(sent[0].daily.rows_source,6002);assert.equal(sent[0].scheduled,true);
 assert.deepEqual(sent[0].daily.totals,[600200,12004,24008,6002000,180060,300100,4201400]);
 assert.ok(!JSON.stringify(sent[0].daily).includes('fbcdn.net'),'Images are sent once in the creative catalog, not in every daily metric');
 assert.equal(sent[0].detail.creative_media.length,layout.headers.length>16?1:0);
 // A later timer invocation has no open/active spreadsheet either.
 vm.runInContext('sincronizarCitroen()',context);assert.equal(sent.length,3);assert.equal(sent[2].daily.rows_source,6002);
 vm.runInContext('pausarCitroenSync()',context);assert.equal(triggers.length,0);
});
test('replacement script reuses the installed key and refuses placeholders before changing it',()=>{
 const token='a'.repeat(64),properties=new Map([['CITROEN_SYNC_TOKEN',token]]);
 const original=buildCampaignScript(token);
 const script=original.replace('"token": "'+token+'"','"token": ""');
 let sent=0;
 const context={console:{log(){}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v)})},SpreadsheetApp:{openById:()=>({getId:()=>CAMPAIGN_SOURCE.spreadsheetId})},ScriptApp:{getProjectTriggers:()=>[{getHandlerFunction:()=> 'sincronizarCitroen'}]}};
 vm.createContext(context);vm.runInContext(script,context);context.sincronizarCitroen=()=>sent++;
 vm.runInContext('instalarCitroenSync()',context);assert.equal(sent,1);assert.equal(properties.get('CITROEN_SYNC_TOKEN'),token);
 const badContext={...context};vm.createContext(badContext);
 vm.runInContext(original.replace('"token": "'+token+'"','"token": "PEGA_AQUI_TU_CLAVE_ACTUAL"'),badContext);
 assert.throws(()=>vm.runInContext('instalarCitroenSync()',badContext),/Falta la clave válida/);
 assert.equal(properties.get('CITROEN_SYNC_TOKEN'),token);
 properties.clear();assert.throws(()=>vm.runInContext('instalarCitroenSync()',context),/Falta la clave válida/);assert.equal(sent,1);
});
