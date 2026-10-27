/* Verify built-in Citroen templates are structural presets, never fictional source data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync('report-templates.js','utf8'),ctx,{filename:'report-templates.js'});
const api=ctx.window.CITROEN_REPORT_TEMPLATES;
const presets=api.list();
assert.ok(presets.length>=6,'Includes six curated, data-grounded page templates');
const metrics=new Set(['spend','forms','messages','impressions','reach','clicks','ctr','cpl']);
const dims=new Set(['month','date','week','quarter','model','territory','account']);
const shapes=new Set(['bar','barh','line','area','table','pie','donut','gauge']);
let next=0;
for(const preset of presets){
 const create=()=> 'item-test-'+(++next);
 const p=api.instantiate(preset.id,create);
 assert.ok(p.cards.length>=6&&p.cards.length<=45,'Every page has useful content within publication limits');
 const ids=new Set(p.cards.map(c=>c.id));
 assert.equal(ids.size,p.cards.length,'Cards have independent IDs');
 assert.ok(p.cards.every(c=>c.source==='meta'),'Templates read existing Meta Ads data only');
 assert.ok(p.cards.every(c=>metrics.has(c.metric)&&dims.has(c.dimension)&&shapes.has(c.shape)),'Only supported metrics, dimensions, charts');
 assert.ok(p.cards.every(c=>c.type==='note'||!Object.hasOwn(c,'text')),'Templates cannot hard-code results');
 assert.ok(p.cards.every(c=>c.x>=0&&c.y>=0&&c.w>=220&&c.h>=170&&c.x+c.w<=1200),'Cards fit the full-width canvas');
 for(let i=0;i<p.cards.length;i++)for(let j=i+1;j<p.cards.length;j++){
  const a=p.cards[i],b=p.cards[j];
  const collide=Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y);
  assert.ok(!collide,'Cards '+i+' and '+j+' must not overlap in '+preset.title);
 }
 if(p.cards.some(c=>c.type==='note'))assert.ok(p.cards.filter(c=>c.type==='note').every(c=>/Pendiente|No deben sumarse|no deben sumarse|Compara períodos equivalentes/i.test(c.text)),'Notes are editorial placeholders or valid methodology, not made-up analysis');
 const another=api.instantiate(preset.id,create);
 assert.notEqual(p.id,another.id,'Each instance receives unique page ID');
 assert.ok(p.cards.every(c=>!another.cards.some(d=>d.id===c.id)),'Recreating a preset creates unique chart IDs');
}
assert.equal(api.instantiate('not-real',()=> 'id'),null,'Unknown template cannot generate a page');
console.log('PASS: Six non-overlapping templates, including grounded period comparison, use Meta data only; stable limits and unique IDs.');
