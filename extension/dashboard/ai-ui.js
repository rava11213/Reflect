let aiPrepared=[],aiSaved=null,aiRunning=false;
function refreshAISelection(){
 if(aiRunning)return;
 const latest=new Map();for(const s of report.data.filter(x=>x.code)){const k=(s.titleSlug||s.title)+'|'+s.lang;const old=latest.get(k);if(!old||s.timestamp>=old.timestamp)latest.set(k,s)}
 $('#aiSelect').innerHTML=[...latest.values()].sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).map(s=>`<option value="${esc(s.id)}">${esc(s.title)} · ${esc(s.lang)} · ${s.timestamp.slice(0,10)}</option>`).join('');
 aiPrepared=[];$('#aiPreview').innerHTML='';$('#aiRun').disabled=true;$('#aiConsent').checked=false;
}
function clearAIView(){aiSaved=null;$('#aiResults').innerHTML='';$('#aiDownload').disabled=true;}
function aiCard(title,body){return `<article class="finding-card"><h2>${esc(title)}</h2>${body}</article>`}
function aiEvidence(e,sources){const s=sources.find(x=>x.id===e.submission_id);return `<div class="evidence">${esc(s?.title||e.submission_id)} · lines ${e.line_start}–${e.line_end}<pre>${esc(e.quote)}</pre></div>`}
function showAIReport(saved){
 aiSaved=saved;const {review:r,sources}=saved;$('#aiDownload').disabled=false;
 $('#aiResults').innerHTML=`<div class="sectionhead"><h2>AI results</h2><span class="small">${sources.length} solutions · ${esc(saved.model)}</span></div><p>${esc(briefText(r.summary,200))}</p><details class="section-note"><summary>Review scope & limitations</summary><p>${esc(r.summary)}</p><p>${esc(saved.createdAt)} · Saved sample; changing the date does not rerun it. ${saved.usage?'Tokens: '+esc(saved.usage.total_tokens??'unavailable'):''}</p>${r.limitations.map(l=>`<p>${esc(l)}</p>`).join('')}</details><h2>Coding habits</h2><div class="findings">`+r.coding_habits.map(h=>aiCard(h.title,`<p class="card-action">${esc(briefText(h.suggestion))}</p><details><summary>Details & examples</summary><p class="small">${esc(h.confidence)} confidence</p><p>${esc(h.explanation)}</p>${h.evidence.map(e=>aiEvidence(e,sources)).join('')}<p>${esc(h.suggestion)}</p></details>`)).join('')+(r.coding_habits.length?'':'<p class="small">No habit findings in this sample.</p>')+'</div><h2>Algorithms & improvement</h2><div class="findings">'+r.algorithms.map(a=>aiCard(sources.find(s=>s.id===a.submission_id)?.title||a.submission_id,`<p class="card-action">${esc(briefText(a.assessment))}</p><p class="complexity">Time: ${esc(a.time_complexity)}<br>Space: ${esc(a.space_complexity)}</p><details><summary>Approach & alternatives</summary><p>${esc(a.approach)}</p><p>${esc(a.assessment)}</p>${a.evidence.map(e=>aiEvidence(e,sources)).join('')}<p><b>Alternative:</b> ${esc(a.alternative)}</p><p>${esc(a.alternative_time)} time · ${esc(a.alternative_space)} space</p><p><b>Tradeoff:</b> ${esc(a.tradeoff)}</p><p class="small">${esc(a.confidence)} confidence</p></details>`)).join('')+'</div>';
}
async function aiServer(path,body){
 let r;try{r=await fetch('http://127.0.0.1:4318'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(body?190000:path==='/check-api'?25000:5000)})}catch(e){throw Error(e.name==='TimeoutError'?'AI request timed out. Check the local server before retrying.':'Cannot reach the local AI server. Follow docs/AI-SETUP.md, and verify REFLECT_EXTENSION_ID matches this extension.')}
 let data;try{data=await r.json()}catch{throw Error('Local AI server returned an invalid response.');}if(!r.ok)throw Error(path==='/check-api'&&r.status===404?'Your local server is an older version. Stop it with Ctrl+C and restart start-ai.command.':data.error||'AI server error.');return data;
}
$('#aiHealth').onclick=async()=>{
 $('#aiHealth').disabled=true;$('#aiStatus').textContent='Checking OpenAI authentication and model access…';
 try{const h=await aiServer('/check-api');$('#aiStatus').textContent=`OpenAI connected · ${h.model}. Select solutions, click Prepare review, then Run AI review. Review permissions and quota are verified when a review runs.`}
 catch(e){$('#aiStatus').textContent=e.message}
 finally{$('#aiHealth').disabled=false}
};
$('#aiPrepare').onclick=async()=>{
 if(aiRunning)return;const ids=[...$('#aiSelect').selectedOptions].map(o=>o.value);aiPrepared=[];$('#aiPreview').innerHTML='';$('#aiRun').disabled=true;$('#aiConsent').checked=false;
 if(isDemo){$('#aiStatus').textContent='Import or sync your own source code before requesting an AI review.';return}
 if(ids.length<1||ids.length>5){$('#aiStatus').textContent='Choose between 1 and 5 solutions.';return}
 const selected=ids.map(id=>report.data.find(s=>s.id===id));$('#aiPrepare').disabled=true;$('#aiStatus').textContent='Preparing problem statements from LeetCode. Nothing is being sent to OpenAI.';
 let contexts={},contextError='';try{const slugs=selected.map(s=>s.titleSlug).filter(Boolean);if(slugs.length){const tabs=await chrome.tabs.query({url:'https://leetcode.com/*'});if(!tabs.length)throw Error('No signed-in LeetCode tab available.');const tab=tabs.find(t=>t.active)||tabs[0];await chrome.scripting.executeScript({target:{tabId:tab.id},files:['extension/content/ai-context.js']});const response=await chrome.tabs.sendMessage(tab.id,{kind:'reflect-ai-context',slugs});if(response?.error)throw Error(response.error);contexts=response?.problems||{}}}catch(e){contextError=e.message}
 aiPrepared=selected.map(s=>({id:s.id,title:s.title,lang:s.lang,code:s.code,problem:contexts[s.titleSlug]?.html?new DOMParser().parseFromString(contexts[s.titleSlug].html,'text/html').body.textContent.trim():''}));
 $('#aiPreview').innerHTML=aiPrepared.map((s,i)=>`<article style="margin-top:16px;padding:18px"><h2>${esc(s.title)} · ${esc(s.lang)}</h2><details><summary>Source code to send</summary><pre>${esc(s.code)}</pre></details><label for="aiProblem${i}">Problem statement and constraints (editable)</label><textarea id="aiProblem${i}" rows="7" maxlength="40000" style="width:100%;display:block;margin-top:8px">${esc(s.problem)}</textarea></article>`).join('');
 $('#aiStatus').textContent=`Prepared ${selected.length} solutions. Review code and problem context below, then confirm to send. ${aiPrepared.some(s=>!s.problem)?'Some statements could not be fetched; paste the full problem and constraints manually. '+contextError:''}`;$('#aiRun').disabled=false;$('#aiPrepare').disabled=false;
};
$('#aiRun').onclick=async()=>{
 if(aiRunning||!aiPrepared.length)return;if(!$('#aiConsent').checked){$('#aiStatus').textContent='Review the payload and check the consent box before sending.';return}
 const submissions=aiPrepared.map((s,i)=>({...s,problem:$('#aiProblem'+i).value.trim()}));if(submissions.some(s=>!s.problem||s.problem.length>40000||s.code.length>30000)){ $('#aiStatus').textContent='Every solution needs a problem statement with constraints, up to 40,000 characters; code limit is 30,000 characters.';return}
 aiRunning=true;$('#clear').disabled=true;$('#aiClear').disabled=true;$('#aiRun').disabled=true;$('#aiPrepare').disabled=true;$('#aiSelect').disabled=true;$('#aiStatus').textContent='Reviewing your selected code with OpenAI… This can take a few minutes.';
 try{const result=await aiServer('/review',{submissions});const saved={...result,sources:submissions};await chrome.storage.local.set({aiReport:saved});showAIReport(saved);$('#aiStatus').textContent='AI review complete. Evidence quotes were checked against the submitted source. Conclusions still need your judgment.'}catch(e){$('#aiStatus').textContent=e.message}finally{aiRunning=false;$('#clear').disabled=false;$('#aiClear').disabled=false;$('#aiRun').disabled=false;$('#aiPrepare').disabled=false;$('#aiSelect').disabled=false;$('#aiConsent').checked=false}
};
$('#aiDownload').onclick=()=>{if(aiSaved)download('reflect-ai-review.json',aiSaved)};
$('#aiClear').onclick=async()=>{if(aiRunning){$('#aiStatus').textContent='Wait for the running review before clearing its result.';return}await chrome.storage.local.remove('aiReport');clearAIView();$('#aiStatus').textContent='Saved AI review cleared locally.'};
refreshAISelection();chrome.storage.local.get('aiReport').then(s=>{if(s.aiReport)showAIReport(s.aiReport)});
$('#aiSelect').onchange=()=>{if(aiRunning)return;aiPrepared=[];$('#aiPreview').innerHTML='';$('#aiRun').disabled=true;$('#aiConsent').checked=false;$('#aiStatus').textContent='Selection changed. Prepare the selected solutions before reviewing.'};
