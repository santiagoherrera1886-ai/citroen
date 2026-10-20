const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]));
const refs=[...script.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
const miss=refs.filter(x=>!ids.has(x));
assert.equal(miss.length,0,'IDs missing from index.html: '+miss.join(', '));
for(const section of ['resumen','modelos','medios','territorios','campanas','creativos','datos'])assert.ok(ids.has(section),'Missing section '+section);
assert.ok(script.includes("citroen-data.json"),'Optional verified-data JSON not supported');
assert.ok(script.includes('parseCsv'),'Import CSV missing');
assert.ok(script.includes('No especificado'),'Empty states missing');
assert.ok(!/Math\.random\s*\(/.test(script),'Random performance numbers are forbidden');
assert.ok(!/(mockData|demoData|seedData)\s*=/.test(script),'Seeded performance data are forbidden');
assert.ok(css.includes('--navy:#0b2944'),'Montecarlo theme is missing');

const zlib=require('node:zlib');
const vm=require('node:vm');
const planText=fs.readFileSync('data/proyecciones_2026.js','utf8');
const ctx={window:{}};
vm.runInNewContext(planText,ctx,{timeout:5000});
const projected=JSON.parse(zlib.gunzipSync(Buffer.from(ctx.window.CITROEN_PLAN_PACKED,'base64')).toString('utf8'));
assert.equal(projected.schema,'citroen-planning-2026/v1');
assert.equal(projected.months.length,10);
assert.equal(projected.models.length,60);
assert.equal(projected.lines.length,551);
assert.ok(Math.abs(projected.months.reduce((s,m)=>s+m[2],0)-944266850.42)<2,'Base budget mismatch');
assert.ok(Math.abs(projected.months.reduce((s,m)=>s+m[4],0)-855980000.4)<2,'Passenger budget mismatch');
const dicIdx=[1,3,4,5,6,7,9];
const details=projected.lines.map(line=>{const r=[...line];dicIdx.forEach(i=>r[i]=projected.lineDictionaries[String(i)][r[i]]);return r;});
for(let month=0;month<10;month++){
  const planned=projected.months[month][2];
  const byModel=projected.models.filter(r=>r[0]===month).reduce((s,m)=>s+m[2],0);
  assert.ok(Math.abs(planned-byModel)<2,'Month '+(month+1)+' budget does not reconcile with models');
  const declared=details.filter(r=>r[0]===month).reduce((s,r)=>s+r[8],0);
  assert.ok(declared<=planned+2,'Month '+(month+1)+' detailed rows exceed plan');
}
for(const id of ['planKpis','planTimeline','planModelsChart','planRegionsChart','planTypeChart','planComparison','planDetailRows','planAlerts'])
  assert.ok(ids.has(id),'Missing planning component '+id);
assert.ok(script.includes("citroen:real-data"),'Plan vs real bridge missing');

for(const id of ['metaMonth','metaModel','metaAccount','metaTerritory','metaKpis','metaTrend','metaModels','metaCampaignRows','metaAdRows','metaQuality'])
  assert.ok(ids.has(id),'Meta dashboard UI missing: '+id);
for(const path of ['data/meta_2026_daily.json','data/meta_2026_detail.json'])
  assert.ok(fs.existsSync(path),'Missing source file '+path);
const md=JSON.parse(fs.readFileSync('data/meta_2026_daily.json','utf8'));
const mc=JSON.parse(fs.readFileSync('data/meta_2026_detail.json','utf8'));
assert.equal(md.schema,'citroen-meta-actuals/2026-v1');
assert.equal(mc.schema,md.schema);
assert.equal(md.rows_source,27840);
assert.equal(mc.rows_source,27840);
assert.equal(md.date_min,'2026-01-01');
assert.equal(md.date_max,'2026-10-20');
assert.equal(md.daily.length,8032);
assert.equal(mc.creatives.length,1803);
assert.equal(mc.campaigns.length,564);
assert.equal(mc.dictionaries.campaigns.length,164);
assert.equal(mc.dictionaries.adsets.length,578);
assert.equal(mc.dictionaries.ads.length,434);
assert.deepEqual(md.totals,[909508844,96217,54916,145525157,1973315,2597585,113191745]);
assert.deepEqual(mc.totals,md.totals);
const sums=(records,prefix)=>[0,1,2,3,4,5,6].map(i=>records.reduce((sum,r)=>sum+r[prefix+i],0));
assert.deepEqual(sums(md.daily,4),md.totals,'Daily rollups disagree with raw source');
assert.deepEqual(sums(mc.campaigns,5),md.totals,'Campaign rollups disagree with raw source');
assert.deepEqual(sums(mc.creatives,7),md.totals,'Ad creative rollups disagree with raw source');
assert.ok(script.includes('citroen:meta-import'),'Global dashboard Meta bridge missing');
assert.ok(fs.readFileSync('planning.js','utf8').includes('realPartial'),'Meta partial coverage guard missing');
console.log('PASS: Citroen, 10 projected months, 27,840 Meta actuals, 3 accounts, 164 campaigns, 578 ad sets, 434 creative names. No double count.');


