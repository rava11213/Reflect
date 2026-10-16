const vm = require('node:vm'), fs = require('node:fs'), assert = require('node:assert/strict');
const nodes = {}, state = {}, get = s => nodes[s] ?? (nodes[s] = {value:'',innerHTML:'',textContent:'',selectedOptions:[],checked:false,disabled:false});
const context = {console,Date,Set,Map,AbortSignal,document:{querySelector:get},chrome:{storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,state[k]])),set:async data=>Object.assign(state,data),remove:async keys=>(Array.isArray(keys)?keys:[keys]).forEach(k=>delete state[k])}}}};context.window=context;
for (const file of ['analysis/review.js','analysis/analyzer.js','analysis/progress.js','dashboard/app.js','dashboard/progress-ui.js','dashboard/navigation.js']) vm.runInNewContext(fs.readFileSync(__dirname+'/../extension/'+file,'utf8'),context);
(async()=>{
 await vm.runInNewContext('progressReady',context);assert.equal(state.reviewHistory,undefined);assert.match(get('#progressStatus').textContent,/Demo data/);
 assert.equal(get('#overviewPage').hidden,false);assert.equal(get('#progressPage').hidden,true);assert.equal(get('#pageTitle').textContent,'Overview');context.location={hash:'#progress'};vm.runInNewContext('routeDashboard()',context);assert.equal(get('#overviewPage').hidden,true);assert.equal(get('#progressPage').hidden,false);context.location.hash='#habits';vm.runInNewContext('routeDashboard()',context);assert.equal(get('#overviewPage').hidden,false);
 const now=new Date(), earlier=new Date(now);earlier.setUTCDate(earlier.getUTCDate()-1);
 const payload={complete:true,errors:[],submissions:[{id:'1',title:'Example',titleSlug:'example',timestamp:earlier.toISOString(),status:'Wrong Answer',lang:'Python3',code:'count = 1'}]};
 context.payload=payload;vm.runInNewContext('items=ReflectAnalysis.normalize(payload).items;isDemo=false;render()',context);
 await vm.runInNewContext('queueProgressSnapshot(payload)',context);assert.equal(state.reviewHistory.length,1);assert.match(get('#progressStatus').textContent,/Baseline saved/);
 await vm.runInNewContext('queueProgressSnapshot(payload)',context);assert.equal(state.reviewHistory.length,1);
 const partial={...payload,complete:false};context.partial=partial;await vm.runInNewContext('queueProgressSnapshot(partial)',context);assert.equal(state.reviewHistory.length,1);assert.match(get('#progressStatus').textContent,/incomplete/);
 await vm.runInNewContext('clearProgressHistory()',context);assert.equal(state.reviewHistory,undefined);
 const html=fs.readFileSync(__dirname+'/../extension/dashboard/index.html','utf8');assert.ok(!html.includes('id="plan"'));assert.ok(!html.includes('id="weeks"'));assert.ok(html.indexOf('id="habits"')<html.indexOf('id="unsolved"'));assert.ok(html.indexOf('id="unsolved"')<html.indexOf('id="topics"'));
 console.log('Passed: no demo snapshot, automatic baseline, duplicate suppression, incomplete import warning, clearing history, overview default, separate progress tab, primary section ordering, no practice plan.');
})().catch(e=>{console.error(e);process.exitCode=1});
