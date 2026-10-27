const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync('alert-engine.js','utf8'),context);
const engine=context.window.CITROEN_ALERT_ENGINE;
const rows=[
 {date:'2026-09-01',model:'C3',territory:'Bogotá',spend:1000,forms:2,impressions:1000,clicks:20},
 {date:'2026-10-01',model:'C3',territory:'Bogotá',spend:6000,forms:2,impressions:2000,clicks:40},
 {date:'2026-10-02',model:'Basalt',territory:'Medellín',spend:3000,forms:1,impressions:1000,clicks:10}
];
assert.equal(engine.calculate(rows.filter(x=>x.date.startsWith('2026-10')),'cpl'),3000);
assert.equal(engine.calculate(rows.filter(x=>x.date.startsWith('2026-10')),'ctr'),50/3000*100);
assert.equal(engine.calculate([{date:'2026-10-01',forms:0,spend:300}],'cpl'),null);
assert.equal(engine.calculate([],'spend'),null);
const rules=[{id:'test-rule',title:'CPL alto',metric:'cpl',operator:'gt',threshold:2900},{id:'test-forms',title:'Leads bajos',metric:'forms',operator:'lt',threshold:4}];
const results=engine.evaluate(rows,rules);
assert.equal(results[0].month,'2026-10');
assert.equal(results[0].status,'alert');assert.equal(results[1].status,'alert');
assert.equal(engine.evaluate(rows,[{...rules[0],model:'Inexistente'}])[0].status,'no-data');
assert.equal(engine.validate({...rules[0],metric:'reach'}),null,'Never add estimated reach as observed unique reach');
assert.equal(engine.validate({...rules[0],threshold:-1}),null);
assert.equal(engine.evaluate(rows,[{...rules[0],enabled:false}])[0].status,'disabled');
console.log('PASS: thresholds, latest month, missing data, safe CPL and CTR, rejected unbounded/unsupported rules.');
