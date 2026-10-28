import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {aggregateCampaignRows,validateCampaignData,CAMPAIGN_SOURCE} from '../lib/campaign-data.mjs';
import {buildCampaignScript} from '../lib/campaign-apps-script.mjs';
import {createCampaignSyncHandler} from '../api/campaign-sync.js';

const headers=['Account name','Date','Campaign name','Ad name','Ad set name','Cost','On-Facebook leads','Cost per on-Facebook lead','Impressions','Link clicks','Reach','CTR (all)','Frequency','CPM (cost per 1000 impressions)','Clicks (all)','Messaging conversations started'];
const row=(date='2026-10-28',cost=100)=>['Cuenta',date,'2026_colombia_citroen_basalt-bogota','video','conjunto',cost,2,50,1000,30,700,3,1,100,50,4];

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
test('invalid or inconsistent payloads cannot replace a complete snapshot',()=>{
 const data=aggregateCampaignRows(headers,[row()]);data.detail.creatives[0][7]++;
 assert.throws(()=>validateCampaignData(data),/no concilian/);
 const other=aggregateCampaignRows(headers,[row()]);other.daily.daily[0][0]=99;
 assert.throws(()=>validateCampaignData(other),/Referencia/);
});

function harness(){
 const blobs=new Map();let editor=null,version=0;
 const handler=createCampaignSyncHandler({ready:()=>true,currentUser:async()=>editor,read:async p=>blobs.get(p)||null,write:async(p,value,previous)=>{const current=blobs.get(p);assert.equal(previous?.etag,current?.etag);blobs.set(p,{value,etag:String(++version)});}});
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
test('generated bound script reads only intended sheet, installs one hourly trigger, and sends a complete snapshot',()=>{
 const token='a'.repeat(64),script=buildCampaignScript(token),triggers=[],properties=new Map(),sent=[];
 const sheet={getSheetId:()=>CAMPAIGN_SOURCE.sheetId,getName:()=>CAMPAIGN_SOURCE.sheetName,getLastRow:()=>6003,getRange:(start,col,count,width)=>{assert.equal(col,1);assert.equal(width,16);return {getValues:()=>start===1?[headers]:Array.from({length:count},()=>row())};}};
 const context={console:{log(){}},SpreadsheetApp:{getActiveSpreadsheet:()=>({getId:()=>CAMPAIGN_SOURCE.spreadsheetId,getSheets:()=>[sheet],getSpreadsheetTimeZone:()=> 'America/Bogota'})},PropertiesService:{getScriptProperties:()=>({setProperty:(k,v)=>properties.set(k,v),getProperty:k=>properties.get(k)})},ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased(){return this;},everyHours(hours){assert.equal(hours,1);return this;},create(){triggers.push({getHandlerFunction:()=>name});}}),deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1)},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{newBlob:payload=>({getBytes:()=>Buffer.from(payload)})},UrlFetchApp:{fetch:(url,options)=>{assert.equal(url,'https://citroen-rho.vercel.app/api/campaign-sync');assert.equal(options.headers.Authorization,'Bearer '+token);const p=JSON.parse(options.payload);validateCampaignData(p);sent.push(p);return {getResponseCode:()=>200};}}};
 vm.createContext(context);vm.runInContext(script,context);vm.runInContext('instalarCitroenSync()',context);vm.runInContext('instalarCitroenSync()',context);
 assert.equal(triggers.length,1);assert.equal(sent.length,2);assert.equal(sent[0].daily.rows_source,6002);assert.equal(sent[0].scheduled,true);
 vm.runInContext('pausarCitroenSync()',context);assert.equal(triggers.length,0);
});
