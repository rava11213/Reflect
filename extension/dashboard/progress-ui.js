let progressHistory = [], progressLoaded = false, progressQuality = {}, progressGeneration = 0;
let progressQueue = Promise.resolve();
function problemLink(s) {
  return s.titleSlug ? `<a href="https://leetcode.com/problems/${encodeURIComponent(s.titleSlug)}/" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>` : esc(s.title);
}
function changeCard(c) {
  const labels = { 'less-frequent': 'Less frequent', 'not-observed': 'Not observed in new code', 'more-frequent': 'More frequent', insufficient: 'More evidence needed', similar: 'Similar frequency' };
  return `<article class="finding-card"><div class="card-meta"><span>${esc(c.family)}</span><span>${esc(labels[c.status])}</span></div><h2>${esc(c.title)}</h2><p class="change-ratio">${c.oldCount}/${c.oldTotal} <span>→</span> ${c.newCount}/${c.newTotal}</p><p class="small">Baseline → new solutions</p><details><summary>What this means</summary><p>${esc(c.action)}</p><p>Compared within the same language family. Different problems may have different demands. ${c.status === 'insufficient' ? 'At least 5 eligible solutions on each side are needed for a trend.' : 'A lower frequency is a signal, not proof a habit is gone.'}</p></details></article>`;
}
let comparisonSources = { before: [], after: [] };
function renderCodePair() {
  const panels = [['before', 'Then'], ['after', 'Now']];
  $('#codeComparison').innerHTML = comparisonSources.before.length && comparisonSources.after.length ? '<h2>Code then & now</h2><p class="small">Choose matching problems to compare approaches. Different problems are shown for reference.</p><div class="code-pair">'+panels.map(([side,label])=>`<article><span class="number">${label}</span><select id="codeSelect${side}" aria-label="${label} submission">${comparisonSources[side].slice().reverse().map(s=>`<option value="${esc(s.id)}">${esc(s.title)} · ${s.timestamp.slice(0,10)}</option>`).join('')}</select><div id="codeBody${side}"></div></article>`).join('')+'</div>' : '';
  for (const [side] of panels) {
    if (!comparisonSources[side].length) continue;
    const selector = $('#codeSelect'+side);
    const boundary=comparisonSources.before.at(-1);
    const matching=side==='after'?comparisonSources.after.filter(s=>(s.titleSlug||s.title)===(boundary.titleSlug||boundary.title)&&ReflectReview.languageFamily(s.lang)===ReflectReview.languageFamily(boundary.lang)).at(-1):null;
    selector.value = (matching||comparisonSources[side].at(-1)).id;
    const update = () => {
      const item = comparisonSources[side].find(s=>s.id===selector.value);
      if (!item) return;
      $('#codeBody'+side).innerHTML = `<p class="small">${esc(item.lang)} · ${esc(item.status)} · #${esc(item.id)}</p><pre>${esc(item.code || 'Source code was not included in this import.')}</pre>`;
    };
    selector.onchange=update;update();
  }
}
function renderProgress() {
  if (!progressLoaded) return;
  const selector = $('#progressBaseline'), selected = selector.value;
  const historical = ReflectProgress.submissionsAgo(items, $('#end').value, 50, isDemo ? {} : progressQuality);
  const history = isDemo ? [] : progressHistory;
  selector.innerHTML = (historical.available ? '<option value="offset-50">50 submissions ago · reconstructed</option>' : '') + history.map(s => `<option value="${esc(s.capturedAt)}">${esc(new Date(s.capturedAt).toLocaleString())} · saved review</option>`).join('');
  const values = [...(historical.available?['offset-50']:[]),...history.map(s=>s.capturedAt)];
  selector.value = values.includes(selected) ? selected : values[0] || '';
  selector.disabled = !values.length;
  if (!items.length) {
    $('#progressStatus').textContent = 'Sync or import your submissions.';
    $('#progressCards').innerHTML='';$('#habitChanges').innerHTML='';$('#solvedSince').innerHTML='';$('#codeComparison').innerHTML='';return;
  }
  const offsetMode=selector.value==='offset-50';
  const current=historical.available?historical.current:ReflectProgress.createSnapshot(items,$('#end').value,isDemo?{}:progressQuality);
  const baseline=offsetMode?historical.baseline:history.find(s=>s.capturedAt===selector.value);
  const comparison=offsetMode?historical.comparison:ReflectProgress.compare(baseline,current);
  const improving=comparison.changes.filter(c=>['less-frequent','not-observed'].includes(c.status));
  const attention=comparison.changes.filter(c=>c.status==='more-frequent');
  const trendAvailable=comparison.state==='ready'&&comparison.changes.some(c=>c.status!=='insufficient');
  $('#progressCards').innerHTML=[['Previously unsolved → solved',baseline?comparison.solved.length:'—'],['Habits appearing less often',trendAvailable?improving.length:'—'],[offsetMode?'Submissions since then':'New solutions reviewed',baseline?(offsetMode?50:comparison.newSolutions):'—']].map(([label,value])=>`<div class="stat"><span>${esc(label)}</span><strong>${value}</strong></div>`).join('');
  const statuses={'no-baseline':historical.available?'Select a comparison.':`50-submission comparison needs 51 imported attempts; ${historical.found} available.`, 'different-history':'These imports do not share submission history.','earlier-window':'Choose a date on or after the saved review.','rules-changed':'Local checks changed. Choose a matching saved review.','incomplete-source':'History or source is incomplete. Habit trends are paused.'};
  $('#progressStatus').textContent=(isDemo?'Demo data · ':'')+(statuses[comparison.state]||(offsetMode?'Now compared with the code state 50 imported submissions earlier. Reconstructed, not a saved past review.':!comparison.newSolutions&&!comparison.solved.length?'Baseline saved. Come back after your next submissions.':trendAvailable?'Changes since your saved review.':'More new code is needed for habit trends.'));
  const cards=[...improving,...attention];
  $('#habitChanges').innerHTML=cards.length?`<h2>Habit changes</h2><div class="findings">${cards.slice(0,3).map(changeCard).join('')}</div>${cards.length>3?`<details class="section-note"><summary>All habit changes (${cards.length})</summary><div class="findings">${cards.slice(3).map(changeCard).join('')}</div></details>`:''}`:comparison.changes.some(c=>c.status==='similar')?'<p class="small">Habit frequencies are similar in these samples.</p>':comparison.state==='ready'&&comparison.newSolutions?'<p class="small">No comparable habit changes yet. Trends need 5 solutions per language in each sample.</p>':'';
  $('#solvedSince').innerHTML=comparison.solved.length?`<h2>Closed the loop</h2><ul class="solved-list">${comparison.solved.map(s=>`<li><span>${problemLink(s)}</span><span class="accepted">Solved · ${s.timestamp.slice(0,10)}</span></li>`).join('')}</ul>`:'';
  $('#reviewTimeline').innerHTML=history.slice().reverse().map(s=>`<li><span>${esc(new Date(s.capturedAt).toLocaleString())}</span><span>${s.observations.length} reviewed · ${s.unsolved.length} unsolved</span></li>`).join('')||'<li>No saved reviews yet.</li>';
  const ids=new Set(baseline?.submissionIds||[]);
  comparisonSources={before:items.filter(s=>ids.has(s.id)).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.id.localeCompare(b.id,undefined,{numeric:true})),after:offsetMode?historical.latest:items.filter(s=>s.timestamp>baseline?.cutoff&&s.timestamp<=current.cutoff)};
  renderCodePair();
}
async function queueProgressSnapshot(payload) {
  const generation = progressGeneration;
  progressQuality = { complete: payload.complete !== false, verified: payload.complete === true, errors: payload.errors?.length || 0 };
  const normalized = ReflectAnalysis.normalize(payload).items, end = $('#end').value;
  const quality = { ...progressQuality };
  progressQueue = progressQueue.catch(() => {}).then(async () => {
    await progressReady;
    if (generation !== progressGeneration) return;
    const snapshot = ReflectProgress.createSnapshot(normalized, end, quality);
    const next = ReflectProgress.recordSnapshot(progressHistory, snapshot);
    if (next !== progressHistory) { await chrome.storage.local.set({ reviewHistory: next }); if (generation !== progressGeneration) return; progressHistory = next; }
    renderProgress();
  }).catch(() => { $('#progressStatus').textContent = 'Could not save review history. Try syncing again.'; });
  return progressQueue;
}
async function clearProgressHistory() {
  progressGeneration++; await progressQueue.catch(() => {});
  progressHistory = []; progressQuality = {}; await chrome.storage.local.remove('reviewHistory');
  $('#reviewTimeline').innerHTML = ''; renderProgress();
}
const progressReady = chrome.storage.local.get(['reviewHistory', 'history']).then(saved => {
  progressHistory = Array.isArray(saved.reviewHistory) ? saved.reviewHistory.filter(s => s.version === 1) : [];
  progressLoaded = true; renderProgress();
  // Establish a baseline from history already saved before this feature existed.
  if (saved.history && !isDemo) queueProgressSnapshot(saved.history);
}).catch(error => { console.error('Progress initialization failed:', error); progressLoaded = true; $('#progressStatus').textContent = 'Review history is unavailable.'; });
$('#progressBaseline').onchange = renderProgress;
