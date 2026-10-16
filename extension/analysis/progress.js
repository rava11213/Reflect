/* Local snapshots contain review metrics and IDs, never API keys or full source. */
(function (root) {
  const Review = root.ReflectReview || (typeof require === 'function' ? require('./review.js') : null);
  const Analysis = root.ReflectAnalysis || (typeof require === 'function' ? require('./analyzer.js') : null);
  const RULESET = 'local-review-0.7.0';
  const MIN_SAMPLE = 5;
  const keyOf = s => s.titleSlug || s.title;
  function hash(text) {
    let result = 2166136261;
    for (let i = 0; i < text.length; i++) result = Math.imul(result ^ text.charCodeAt(i), 16777619);
    return (result >>> 0).toString(16);
  }
  function eligible(rule, family) {
    if (rule.startsWith('sql-')) return family === 'sql';
    if (rule.startsWith('cpp-')) return family === 'cpp';
    if (['indent', 'spacing', 'naming-style', 'function-size', 'queue', 'exceptions', 'two-sum'].includes(rule)) return family === 'python';
    return true;
  }
  function createSnapshot(items, end, { now = new Date().toISOString(), complete = true, verified = false, errors = 0 } = {}) {
    const cutoff = new Date(Math.min(Date.parse(end + 'T23:59:59.999Z'), Date.parse(now))).toISOString();
    const available = items.filter(s => s.timestamp <= cutoff);
    const report = Analysis.analyze(available, end);
    const latest = new Map();
    for (const s of report.data.filter(s => s.code?.trim())) {
      const family = Review.languageFamily(s.lang), key = keyOf(s) + '|' + family;
      if (!latest.has(key) || latest.get(key).timestamp <= s.timestamp) latest.set(key, s);
    }
    const definitions = new Map();
    const observations = [...latest.entries()].map(([key, s]) => {
      const findings = Review.review([s]).findings;
      findings.forEach(f => definitions.set(f.key, { key: f.key, title: f.title, category: f.category, action: f.action }));
      return { key, problemKey: keyOf(s), title: s.title, titleSlug: s.titleSlug, id: s.id, family: Review.languageFamily(s.lang), timestamp: s.timestamp, sourceHash: hash(s.code), rules: findings.map(f => f.key).sort() };
    }).sort((a, b) => a.key.localeCompare(b.key));
    const accepted = new Map();
    for (const s of available.filter(s => s.status.toLowerCase() === 'accepted')) {
      const key = keyOf(s);
      if (!accepted.has(key) || accepted.get(key).timestamp > s.timestamp) accepted.set(key, { key, id: s.id, title: s.title, titleSlug: s.titleSlug, timestamp: s.timestamp });
    }
    const snapshot = {
      version: 1, ruleset: RULESET, capturedAt: now, cutoff, start: report.start, end,
      quality: { complete, verified, errors, missingSource: report.data.filter(s => !s.code?.trim()).length },
      submissions: report.data.length, submissionIds: report.data.map(s => s.id).sort(), solved: report.solved, observations,
      definitions: [...definitions.values()],
      unsolved: report.unsolved.map(s => ({ key: keyOf(s), title: s.title, titleSlug: s.titleSlug })),
      accepted: [...accepted.values()].sort((a, b) => a.key.localeCompare(b.key))
    };
    snapshot.fingerprint = hash(JSON.stringify({ end, quality: snapshot.quality, submissions: snapshot.submissions, observations, unsolved: snapshot.unsolved, accepted: snapshot.accepted }));
    return snapshot;
  }
  function recordSnapshot(history, snapshot) {
    if (!snapshot.submissions || !snapshot.quality.complete || snapshot.mode === 'submission-offset') return history;
    const valid = history.filter(s => s.version === 1);
    if (valid.at(-1)?.fingerprint === snapshot.fingerprint && valid.at(-1)?.ruleset === snapshot.ruleset) return history;
    const next = [...valid, snapshot];
    return next.length <= 60 ? next : [next[0], ...next.slice(-59)];
  }
  function compare(baseline, current) {
    if (!baseline) return { state: 'no-baseline', changes: [], solved: [], newSolutions: 0 };
    if (current.cutoff < baseline.cutoff) return { state: 'earlier-window', changes: [], solved: [], newSolutions: 0 };
    if (baseline.submissionIds?.length && current.submissionIds?.length && !baseline.submissionIds.some(id => current.submissionIds.includes(id))) return { state: 'different-history', changes: [], solved: [], newSolutions: 0 };
    const unsolved = new Set(baseline.unsolved.map(s => s.key));
    const historicalIds = baseline.mode === 'submission-offset' ? new Set(baseline.submissionIds) : null;
    const solved = current.accepted.filter(s => unsolved.has(s.key) && (historicalIds ? !historicalIds.has(s.id) : s.timestamp > baseline.cutoff));
    const recent = current.observations.filter(s => historicalIds ? !historicalIds.has(s.id) : s.timestamp > baseline.cutoff);
    const result = { state: 'ready', changes: [], solved, newSolutions: recent.length };
    if (baseline.ruleset !== current.ruleset) return { ...result, state: 'rules-changed' };
    if (!baseline.quality.complete || !current.quality.complete || baseline.quality.errors || current.quality.errors || baseline.quality.missingSource || current.quality.missingSource) return { ...result, state: 'incomplete-source' };
    const definitions = new Map([...baseline.definitions, ...current.definitions].filter(d => !d.category.startsWith('Algorithm') && d.category !== 'Efficiency').map(d => [d.key, d]));
    const families = [...new Set(recent.map(s => s.family))];
    for (const definition of definitions.values()) for (const family of families) {
      if (!eligible(definition.key, family)) continue;
      const before = baseline.observations.filter(s => s.family === family);
      const after = recent.filter(s => s.family === family);
      const oldCount = before.filter(s => s.rules.includes(definition.key)).length;
      const newCount = after.filter(s => s.rules.includes(definition.key)).length;
      if (!oldCount && !newCount) continue;
      const oldRate = before.length ? oldCount / before.length : 0;
      const newRate = after.length ? newCount / after.length : 0;
      let status = 'similar';
      if (before.length < MIN_SAMPLE || after.length < MIN_SAMPLE) status = 'insufficient';
      else if (!newCount && oldCount) status = 'not-observed';
      else if (oldRate - newRate >= 0.1 - Number.EPSILON) status = 'less-frequent';
      else if (newRate - oldRate >= 0.1 - Number.EPSILON) status = 'more-frequent';
      result.changes.push({ ...definition, family, oldCount, oldTotal: before.length, newCount, newTotal: after.length, status });
    }
    return result;
  }
  function submissionsAgo(items, end, count = 50, options = {}) {
    const now = options.now || new Date().toISOString();
    const cutoff = Math.min(Date.parse(end + 'T23:59:59.999Z'), Date.parse(now));
    const ordered = Analysis.analyze(items, end).data.filter(s => Date.parse(s.timestamp) <= cutoff).slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id, undefined, { numeric: true }));
    if (ordered.length <= count) return { available: false, required: count + 1, found: ordered.length };
    const older = ordered.slice(0, -count), latest = ordered.slice(-count);
    const baseline = createSnapshot(older, end, { ...options, now: older.at(-1).timestamp });
    baseline.mode = 'submission-offset'; baseline.offset = count;
    const current = createSnapshot(ordered, end, { ...options, now });
    return { available: true, baseline, current, older, latest, comparison: compare(baseline, current) };
  }
  root.ReflectProgress = { createSnapshot, recordSnapshot, compare, submissionsAgo, MIN_SAMPLE, RULESET };
  if (typeof module !== 'undefined') module.exports = root.ReflectProgress;
})(typeof window === 'undefined' ? globalThis : window);
