import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSheet,parseCSV,records,readSheet} from '../lib/sheets-connector.mjs';
const id='sheet_fixture_1234567890',url='https://docs.google.com/spreadsheets/d/'+id+'/edit';
const response=(text,type='text/csv',status=200)=>new Response(text,{status,headers:{'content-type':type}});
test('accepts edit/export/published URLs and preserves tab identity',()=>{
 assert.equal(parseSheet(' '+url+'#gid=42 ').gid,'42');
 assert.equal(parseSheet(url).gid,'');
 assert.ok(!parseSheet(url).url.includes('gid=0'));
 assert.equal(parseSheet(url+'?gid=42','19').gid,'19');
 const published=parseSheet('https://docs.google.com/spreadsheets/d/e/2PACX_fixture_1234567890/pubhtml?gid=75&single=true');
 assert.equal(published.published,true);assert.ok(published.url.includes('/d/e/2PACX_'));assert.ok(published.url.includes('output=csv'));
 for(const bad of ['http://docs.google.com/spreadsheets/d/'+id,'https://docs.google.com.attacker.test/spreadsheets/d/'+id,url+'?gid=abc',url+'/extra'])assert.throws(()=>parseSheet(bad));
});
test('CSV handles quoted separators, newlines, BOM, CRLF and semicolons',()=>{
 assert.deepEqual(parseCSV('\uFEFFModelo,Inversión,Nota\r\nC3,"1.234,56","A, B\nC"\r\n'),[['Modelo','Inversión','Nota'],['C3','1.234,56','A, B\nC']]);
 assert.deepEqual(parseCSV('Modelo;Inversión\nC3;1.234,56'),[['Modelo','Inversión'],['C3','1.234,56']]);
 assert.throws(()=>parseCSV('a,b\n"unfinished'),{code:'INVALID_CSV'});
});
test('header rows, duplicate names, empty rows and truncation are explicit',()=>{
 const r=records([['Título'],['','Leads','Leads'],['C3','2','3'],['','',''],['C4','4','5']],{headerRow:2,maxRows:1});
 assert.deepEqual(r.columns,['Columna 1','Leads','Leads_2']);assert.equal(r.rows.length,1);assert.equal(r.truncated,true);
 assert.throws(()=>records([[]]),{code:'EMPTY_HEADER'});
});
test('public CSV works despite service-account setup and non-CSV content type',async()=>{
 const r=await readSheet({url},{fetcher:async()=>response('Modelo,Leads\nC3,42','text/plain'),token:()=>{throw Error('Must not use private credentials for public export');}});
 assert.equal(r.rows[0].Leads,'42');assert.equal(r.access,'public');
});
test('published links stay on their published export route',async()=>{
 let fetched='';await readSheet({url:'https://docs.google.com/spreadsheets/d/e/2PACX_fixture_1234567890/pubhtml?gid=75'},{fetcher:async u=>{fetched=u;return response('Modelo,Leads\nC3,42');}});
 assert.ok(fetched.includes('/d/e/'));assert.ok(fetched.includes('/pub?'));
});
test('private sheet without credentials explains the exact configuration gap',async()=>{
 await assert.rejects(readSheet({url},{fetcher:async()=>response('<html>login</html>','text/html')}),{code:'GOOGLE_NOT_CONFIGURED',status:503});
});
test('private fallback selects the first actual tab, escapes names, limits range',async()=>{
 const calls=[];
 const r=await readSheet({url,headerRow:3,maxRows:2},{token:async()=>'test-token',serviceEmail:'fixture@example.test',fetcher:async(u,options)=>{
  calls.push(u);if(u.startsWith('https://docs.google.com'))return response('Denied','text/plain',403);
  assert.equal(options.headers.Authorization,'Bearer test-token');
  if(u.includes('?fields='))return Response.json({properties:{title:'Fixture'},sheets:[{properties:{sheetId:98,title:"L'équipe"}}]});
  assert.ok(decodeURIComponent(u).includes("'L''équipe'!A3:AX6"));return Response.json({values:[['Modelo','Leads'],['C3','1'],['C3','2'],['C3','3']]});
 }});
 assert.equal(r.gid,'98');assert.equal(r.rows.length,2);assert.equal(r.truncated,true);assert.equal(r.access,'private');assert.equal(calls.length,3);
});
test('missing tab, denied private API and empty data never report connected',async()=>{
 const metadata=async()=>Response.json({sheets:[{properties:{sheetId:7,title:'Real'}}]});
 await assert.rejects(readSheet({url:url+'#gid=5',mode:'private'},{token:async()=>'test',fetcher:metadata}),{code:'TAB_NOT_FOUND'});
 await assert.rejects(readSheet({url,mode:'private'},{token:async()=>'test',fetcher:async()=>Response.json({error:{status:'PERMISSION_DENIED'}},{status:403})}),{code:'SHEET_ACCESS'});
 await assert.rejects(readSheet({url},{fetcher:async()=>response('')}),{code:'EMPTY_HEADER'});
});
test('redirects are confined to Google export hosts',async()=>{
 const r=await readSheet({url},{fetcher:async u=>u.includes('googleusercontent.com')?response('Name,Total\na,1'):new Response(null,{status:302,headers:{location:'https://doc-fixture.googleusercontent.com/export'}})});
 assert.equal(r.rows.length,1);
 await assert.rejects(readSheet({url,mode:'public'},{fetcher:async()=>new Response(null,{status:302,headers:{location:'https://attacker.test/csv'}})}),{code:'SHEET_ACCESS'});
});
test('rate limits, oversized reads and invalid options are distinguishable',async()=>{
 await assert.rejects(readSheet({url},{fetcher:async()=>response('','text/plain',429)}),{code:'GOOGLE_RATE_LIMIT'});
 await assert.rejects(readSheet({url},{fetcher:async()=>new Response('a,b',{headers:{'content-length':'2000001'}})}),{code:'SHEET_TOO_LARGE'});
 await assert.rejects(readSheet({url,headerRow:0}),{code:'INVALID_HEADER'});
 await assert.rejects(readSheet({url,maxRows:5001}),{code:'INVALID_LIMIT'});
});
