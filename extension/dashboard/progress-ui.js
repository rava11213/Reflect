let progressHistory = [], progressLoaded = false, progressQuality = {}, progressGeneration = 0;
let progressQueue = Promise.resolve();
function problemLink(s) {
  return s.titleSlug ? `<a href="https://leetcode.com/problems/${encodeURIComponent(s.titleSlug)}/" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>` : esc(s.title);
}
function changeCard(c) {
  const labels = { 'less-frequent': 'Less frequent', 'not-observed': 'Not observed in new code', 'more-frequent': 'More frequent', insufficient: 'More evidence needed', similar: 'Similar frequency' };
  return `<article class="finding-card"><div class="card-meta"><span>${esc(c.family)}</span><span>${esc(labels[c.status])}</span></div><h2>${esc(c.title)}</h2><p class="change-ratio">${c.oldCount}/${c.oldTotal} <span>→</span> ${c.newCount}/${c.newTotal}</p><p class="small">Baseline → new solutions</p><details><summary>What this means</summary><p>${esc(c.action)}</p><p>Compared within the same language family. Different problems may have different demands. ${c.status === 'insufficient' ? 'At least 5 eligible solutions on each side are needed for a trend.' : 'A lower frequency is a signal, not proof a habit is gone.'}</p></details></article>`;
}
function renderProgress() {
  if (!progressLoaded) return;
  const selector = $('#progressBaseline'), selected = selector.value;
  selector.innerHTML = progressHistory.map(s => `<option value="${esc(s.capturedAt)}">${esc(new Date(s.capturedAt).toLocaleString())} · ${s.observations.length} solutions</option>`).join('');
  selector.value = progressHistory.some(s => s.capturedAt === selected) ? selected : (progressHistory[0]?.capturedAt || '');
  selector.disabled = !progressHistory.length;
  if (isDemo || !items.length) {
    $('#progressStatus').textContent = isDemo ? 'Sync your submissions to start tracking progress.' : 'No submissions loaded.';
    $('#progressCards').innerHTML = ''; $('#habitChanges').innerHTML = ''; $('#solvedSince').innerHTML = ''; return;
  }
  const current = ReflectProgress.createSnapshot(items, $('#end').value, progressQuality);
  const baseline = progressHistory.find(s => s.capturedAt === selector.value);
  const comparison = ReflectProgress.compare(baseline, current);
  const improving = comparison.changes.filter(c => ['less-frequent', 'not-observed'].includes(c.status));
  const attention = comparison.changes.filter(c => c.status === 'more-frequent');
  const trendAvailable = comparison.state === 'ready' && comparison.changes.some(c => c.status !== 'insufficient');
  $('#progressCards').innerHTML = [['Previously unsolved → solved', baseline ? comparison.solved.length : '—'], ['Habits appearing less often', trendAvailable ? improving.length : '—'], ['New solutions reviewed', baseline ? comparison.newSolutions : '—']].map(([label, value]) => `<div class="stat"><span>${esc(label)}</span><strong>${value}</strong></div>`).join('');
  const status = {
    'no-baseline': 'Sync once to save your baseline.',
    'different-history': 'These imports do not share submission history. Choose a matching baseline.',
    'earlier-window': 'Choose a review date on or after this baseline.',
    'rules-changed': 'Local checks changed. Habit comparisons need a baseline using the same checks.',
    'incomplete-source': 'History or source is incomplete. Habit trends are paused.'
  };
  $('#progressStatus').textContent = status[comparison.state] || (!comparison.newSolutions && !comparison.solved.length ? 'Baseline saved. Come back after your next submissions.' : trendAvailable ? 'Changes since your baseline.' : comparison.changes.length ? 'Early progress. Habit trends need 5 new solutions per language.' : comparison.newSolutions >= 5 ? 'No matching habit findings to compare in this sample.' : 'Early progress. Habit trends need 5 new solutions per language.');
  const cards = [...improving, ...attention];
  $('#habitChanges').innerHTML = cards.length ? `<h2>Habit changes</h2><div class="findings">${cards.slice(0, 3).map(changeCard).join('')}</div>${cards.length > 3 ? `<details class="section-note"><summary>All habit changes (${cards.length})</summary><div class="findings">${cards.slice(3).map(changeCard).join('')}</div></details>` : ''}` : comparison.changes.some(c => c.status === 'similar') ? '<p class="small">Habit frequencies are similar so far.</p>' : '';
  $('#solvedSince').innerHTML = comparison.solved.length ? `<h2>Closed the loop</h2><ul class="solved-list">${comparison.solved.map(s => `<li><span>${problemLink(s)}</span><span class="accepted">Solved · ${s.timestamp.slice(0, 10)}</span></li>`).join('')}</ul>` : '';
  $('#reviewTimeline').innerHTML = progressHistory.slice().reverse().map(s => `<li><span>${esc(new Date(s.capturedAt).toLocaleString())}</span><span>${s.observations.length} reviewed · ${s.unsolved.length} unsolved</span></li>`).join('') || '<li>No saved reviews yet.</li>';
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
