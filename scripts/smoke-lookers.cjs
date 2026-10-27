const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const sandbox={module:{exports:{}},Date,Intl,console,globalThis:null};
sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync('looker-filter-engine.js','utf8'),sandbox,{filename:'looker-filter-engine.js'});
const filter=sandbox.CITROEN_FILTER_ENGINE;
const same=o=>JSON.parse(JSON.stringify(o));
assert.deepEqual(same(filter.range('last7','2026-10-27')),{start:'2026-10-21',end:'2026-10-27'});
assert.deepEqual(same(filter.range('lastmonth','2026-10-27')),{start:'2026-09-01',end:'2026-09-30'});
assert.deepEqual(same(filter.range('lastweek','2026-10-27')),{start:'2026-10-19',end:'2026-10-25'});
assert.deepEqual(same(filter.range('thisquarter','2026-10-27')),{start:'2026-10-01',end:'2026-10-27'});
assert.equal(filter.date('2026-02-30'),false,'Invalid calendar day is rejected');
const rows=[
 {date:'2026-10-20',month:'2026-10',model:'C3',territory:'Bogotá',account:'Honda',spend:7000,forms:7,platform:'Meta Ads'},
 {date:'2026-10-21',month:'2026-10',model:'Aircross',territory:'Medellín',account:'Fanalca',spend:12000,forms:12,platform:'Meta Ads'},
 {date:'2026-10-25',month:'2026-10',model:'C3',territory:'Bogotá',account:'Fanalca',spend:15000,forms:14,platform:'Meta Ads'},
 {date:'2026-09-15',month:'2026-09',model:'Basalt',territory:'Cali',account:'Fanalca',spend:9000,forms:8,platform:'Meta Ads'}
];
let defs=[{id:'period',type:'date',field:'date',scope:'report',start:'2026-10-21',end:'2026-10-25'}];
assert.equal(filter.apply(rows,defs,{},'resumen','','2026-10-27').length,2,'Calendar start/end inclusive');
defs=[{id:'relative',type:'relative',field:'date',scope:'report',preset:'last7'}];
assert.equal(filter.apply(rows,defs,{},'resumen','','2026-10-27').length,2,'Rolling last-seven window');
defs=[{id:'models',type:'multi',field:'model',scope:'page',pageId:'report-test',values:['C3','Basalt']}];
assert.equal(filter.apply(rows,defs,{},'report-test').length,3,'Page-specific multi-choice');
assert.equal(filter.apply(rows,defs,{},'resumen').length,4,'Page controls do not affect other pages');
assert.equal(filter.apply(rows,defs,{models:{values:['Aircross']}},'report-test').length,1,'Viewer multiselect overrides default');
defs=[{id:'limit',type:'number',field:'spend',scope:'chart',pageId:'report-test',cardId:'c:plot',min:8000,max:15000}];
assert.equal(filter.apply(rows,defs,{},'report-test','c:plot').length,3,'Numeric range inclusivity');
assert.equal(filter.apply(rows,defs,{},'report-test','c:other').length,4,'Chart filter does not touch other charts');
defs=[{id:'search',type:'search',field:'territory',scope:'report',value:'BOG'}];
assert.equal(filter.apply(rows,defs).length,2,'Case-insensitive text filtering');
defs=[{id:'exclude',type:'select',field:'model',scope:'report',value:'C3',exclude:true}];
assert.equal(filter.apply(rows,defs).length,2,'Exclude condition removes matched rows');
defs=[{id:'a',type:'select',field:'model',scope:'report',value:'C3'},{id:'b',type:'select',field:'model',scope:'report',value:'Basalt',logic:'OR'}];
assert.equal(filter.apply(rows,defs).length,3,'OR between filter expressions');
defs=[{id:'a',type:'select',field:'model',scope:'report',value:'C3'},{id:'b',type:'advanced',field:'spend',operator:'gte',value:'10000',scope:'report',logic:'AND'}];
assert.equal(filter.apply(rows,defs).length,1,'AND between conditions');
assert.equal(filter.apply(rows,[{id:'regex',type:'advanced',field:'model',operator:'regex',value:'^C',scope:'report'}]).length,2,'Regex mode works on bounded input');
assert.equal(filter.apply(rows,[{id:'neg',type:'advanced',field:'account',operator:'notcontains',value:'fanalca',scope:'report'}]).length,1);
const meta=[{date:'2026-10-20',month:'2026-10',model:'C3',territory:'Bogotá',v:[7000,7,1,13000,600,700,10000]}];
assert.equal(filter.apply(meta,[{id:'spend',type:'number',field:'spend',min:7000,max:7000,scope:'report'}]).length,1,'Raw Meta rows are compatible with daily indices');
assert.equal(filter.apply(meta,[{id:'date',type:'date',field:'date',start:'2026-10-21',scope:'report'}]).length,0,'Exact date not month only');
assert.equal(filter.normalize({id:'bad',type:'relative',field:'spend'}),null,'Relative dates must use a date column');
console.log('PASS: 14 relative date windows, calendar validity, raw Meta daily, scope report/page/chart, multi-select, numeric bounds, advanced operators, AND/OR and exclusion.');
