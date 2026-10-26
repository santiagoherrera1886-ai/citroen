/* Login-gate regression test. All account payloads below are local test fixtures. */
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://citroen-rho.vercel.app/#resumen',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
const w=dom.window,$=id=>w.document.getElementById(id);
w.eval(fs.readFileSync('data/proyecciones_2026.js','utf8'));w.eval(fs.readFileSync('data/revision_2026.js','utf8'));
const actuals=JSON.parse(fs.readFileSync('data/meta_2026_daily.json','utf8'));
w.DecompressionStream=class{constructor(type){assert.equal(type,'gzip');}};
w.Blob=class{constructor(parts){this.parts=parts}stream(){const that=this;return{pipeThrough(){return that}}}};
w.Response=class{constructor(stream){this.stream=stream}async text(){return zlib.gunzipSync(Buffer.from(this.stream.parts[0])).toString('utf8')}};
w.confirm=()=>true;
let active=null,authCalls=0,users=[];
w.fetch=async(url,options={})=>{
 if(!String(url).startsWith('/api/'))return {ok:true,json:async()=>actuals};
 authCalls++;
 const body=options.body?JSON.parse(options.body):{},respond=(ok,obj,status=200)=>({ok,status,json:async()=>obj});
 if(url==='/api/auth'&&(!options.method||options.method==='GET'))return respond(true,{authenticated:!!active,user:active});
 if(url==='/api/auth'&&body.action==='login'){
  if(body.password==='ExampleStrongAccess42!'&&body.email==='admin@example.com'){active={email:body.email,role:'owner',mustChange:false};return respond(true,{user:active});}
  return respond(false,{error:'Usuario o contraseña incorrectos'},401);
 }
 if(url==='/api/auth'&&body.action==='logout'){active=null;return respond(true,{ok:true});}
 if(url==='/api/users'&&(!options.method||options.method==='GET'))return active?.role==='owner'?respond(true,{users:[{email:active.email,role:'owner',active:true},...users]}):respond(false,{error:'Prohibido'},403);
 if(url==='/api/users'&&body.action==='create'){users.push({email:body.email,role:'editor',active:true});return respond(true,{ok:true});}
 return respond(false,{error:'Solicitud inesperada'},400);
};
for(const file of ['studio.js','access.js'])w.eval(fs.readFileSync(file,'utf8'));
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
const pause=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
 for(let i=0;i<70&&!$('studioCards').querySelector('.studio-native-tools');i++)await pause();
 assert.ok(!$('c3Dashboard').classList.contains('studio-edit-on'),'No unauthenticated editing on initial load');
 w.localStorage.setItem('citroen_workspace_summary_v2',JSON.stringify({edit:true,cards:[]}));
 $('studioEdit').click();await pause();await pause();
 assert.equal($('citroenAuthModal').hidden,false,'Edit click opens authentication dialog');
 assert.ok(!$('c3Dashboard').classList.contains('studio-edit-on'),'Cannot edit prior to authentication');
 const form=$('citroenLoginForm');
 form.querySelector('[name="email"]').value='admin@example.com';
 form.querySelector('[name="password"]').value='incorrect';
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();await pause();
 assert.ok(!$('c3Dashboard').classList.contains('studio-edit-on'),'Incorrect password stays locked');
 form.querySelector('[name="password"]').value='ExampleStrongAccess42!';
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();await pause();await pause();
 assert.ok($('c3Dashboard').classList.contains('studio-edit-on'),'Verified server session unlocks editor');
 assert.equal($('citroenAuthModal').hidden,true,'Modal closes after successful login');
 assert.equal($('citroenMasterOpen').hidden,false,'Owner gets master access');
 $('citroenMasterOpen').click();await pause();await pause();
 assert.equal($('citroenMasterModal').hidden,false,'Owner panel opens');
 const add=$('citroenNewEditorForm');
 add.querySelector('[name="email"]').value='new-editor@example.com';
 add.querySelector('[name="password"]').value='AnotherStrong42Access';
 add.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();await pause();await pause();
 assert.ok($('citroenMasterUsers').textContent.includes('new-editor@example.com'),'Owner creates editor account');
 $('citroenAuthLogout').click();await pause();await pause();
 assert.ok(!$('c3Dashboard').classList.contains('studio-edit-on'),'Logout immediately locks editor');
 assert.equal($('citroenMasterOpen').hidden,true,'Master control hidden after logout');
 assert.ok(authCalls>0,'Every login action uses server endpoint');
 console.log('PASS: protected edit gate, wrong-password denial, server login unlock, master account creation, logout/relock and cached edit flag ignored.');
 w.close();
})().catch(e=>{console.error(e);process.exitCode=1;w.close()});
