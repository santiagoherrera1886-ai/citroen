import test from 'node:test';
import assert from 'node:assert/strict';
import {BlobNotFoundError,BlobPreconditionFailedError} from '@vercel/blob';
import {createCampaignStore,isCampaignWriteConflict} from '../lib/campaign-store.mjs';

const response=value=>({statusCode:200,stream:new Response(JSON.stringify(value)).body,blob:{etag:'W/"download-validator"'}});

test('conditional write uses the storage validator even when the download ETag differs',async()=>{
 let stored={revision:'before'},version=1,heads=0,gets=0,writes=0;
 const store=createCampaignStore({
  head:async()=>{heads++;return {etag:'"origin-'+version+'"'};},
  get:async(path,options)=>{gets++;assert.equal(options.access,'private');assert.equal(options.useCache,false);return response(stored);},
  put:async(path,body,options)=>{
   writes++;assert.equal(options.ifMatch,'"origin-'+version+'"');assert.equal(options.allowOverwrite,true);
   assert.equal(options.access,'private');assert.equal(options.addRandomSuffix,false);
   stored=JSON.parse(body);version++;
  }
 });
 const previous=await store.read('snapshot.json',{forWrite:true});
 assert.deepEqual(previous,{value:{revision:'before'},etag:'"origin-1"'});
 await store.write('snapshot.json',{revision:'after'},previous);
 const updated=await store.read('snapshot.json',{forWrite:true});
 await store.write('snapshot.json',{revision:'third'},updated);
 assert.equal(stored.revision,'third');assert.equal(heads,4);assert.equal(gets,2);assert.equal(writes,2);
 await store.read('snapshot.json');assert.equal(heads,4,'Read-only status does not request write metadata');
});

test('a write during the content read forces a fresh matching value and validator',async()=>{
 const tags=['"v1"','"v2"','"v2"','"v2"'];let reads=0;
 const store=createCampaignStore({head:async()=>({etag:tags.shift()}),get:async()=>response({revision:++reads===1?'old':'new'})});
 assert.deepEqual(await store.read('snapshot.json',{forWrite:true}),{value:{revision:'new'},etag:'"v2"'});
 assert.equal(reads,2);assert.equal(tags.length,0);
});

test('an unstable snapshot exhausts bounded reads without permitting a write',async()=>{
 let heads=0,reads=0;
 const store=createCampaignStore({head:async()=>({etag:'"v'+(++heads)+'"'}),get:async()=>{reads++;return response({});}});
 await assert.rejects(store.read('snapshot.json',{forWrite:true}),BlobPreconditionFailedError);
 assert.equal(heads,6);assert.equal(reads,3);
});

test('new files remain create-only and missing validators cannot silently overwrite',async()=>{
 let options;
 const store=createCampaignStore({head:async()=>{throw new BlobNotFoundError();},get:async()=>null,put:async(path,body,value)=>{options=value;}});
 assert.equal(await store.read('new.json',{forWrite:true}),null);
 await store.write('new.json',{revision:'first'},null);
 assert.equal(options.allowOverwrite,false);assert.equal('ifMatch' in options,false);
 await assert.rejects(store.write('new.json',{}, {value:{}}),/no se sobrescribirá/);
});

test('real SDK conflicts are identified by class although their public name is Error',()=>{
 const conflict=new BlobPreconditionFailedError();
 assert.equal(conflict.name,'Error','Reproduces the production SDK behavior');
 assert.equal(isCampaignWriteConflict(conflict),true);
 assert.equal(isCampaignWriteConflict(new Error('Unrelated storage failure')),false);
});
