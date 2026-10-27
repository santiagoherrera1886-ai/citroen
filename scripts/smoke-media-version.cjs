/* Shared-media client regressions with a mocked authenticated backend. No network calls. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{
 url:'https://citroen-rho.vercel.app/#resumen',runScripts:'outside-only',virtualConsole:new VirtualConsole()
});
const w=dom.window,id='m-'+'a'.repeat(32),link='/api/media?id='+id;
let requests=0;
w.fetch=async(url,options)=>{
 requests++;
 assert.equal(url,'/api/media','Images are uploaded only to the protected first-party endpoint');
 assert.equal(options.method,'POST');
 assert.equal(options.credentials,'same-origin');
 assert.equal(JSON.parse(options.body).image.startsWith('data:image/jpeg;base64,'),true);
 return {ok:true,json:async()=>({ok:true,url:link})};
};
w.eval(fs.readFileSync('photo-editor.js','utf8'));
(async()=>{
 assert.equal(w.CITROEN_SHARED_MEDIA.isManaged(link),true);
 assert.equal(w.CITROEN_SHARED_MEDIA.isManaged('/api/media?id=../../etc/passwd'),false,'Traversal cannot be a media reference');
 assert.equal(w.CITROEN_SHARED_MEDIA.isManaged('javascript:alert(1)'),false,'Scripts are not accepted as images');
 assert.equal(w.CITROEN_PHOTO_EDITOR.set('C3',link),true,'Car photos accept uploaded library URLs');
 assert.equal(w.CITROEN_PHOTO_EDITOR.export().C3,link,'Private library reference persists in photo editor');
 assert.equal(w.CITROEN_PHOTO_EDITOR.set('C3','/api/media?id=bad'),false,'Invalid ID rejected');
 assert.equal(w.CITROEN_PHOTO_EDITOR.set('HERO',link),true,'Hero photo supports shared media');
 const output=await w.CITROEN_SHARED_MEDIA.upload('data:image/jpeg;base64,'+'a'.repeat(64));
 assert.equal(output,link,'Private media API result can be attached to creative/card/hero');
 assert.equal(requests,1);
 console.log('PASS: managed media URLs, hero and car selection, invalid references, and authenticated upload endpoint.');
 w.close();
})().catch(e=>{console.error(e);process.exitCode=1;w.close()});
