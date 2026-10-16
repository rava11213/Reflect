let previousDashboardView;
function routeDashboard() {
  const hash = typeof location === 'undefined' ? '' : location.hash;
  const progress = hash === '#progress';
  $('#overviewPage').hidden = progress;
  $('#progressPage').hidden = !progress;
  $('#pageTitle').textContent = progress ? 'Progress' : 'Overview';
  for (const link of document.querySelectorAll?.('aside a') || []) {
    const href = link.getAttribute('href');
    const active = progress ? href === '#progress' : href === (hash || '#overview');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  if (previousDashboardView !== undefined && previousDashboardView !== progress) {
    if (progress || !hash || hash === '#overview') window.scrollTo?.({ top: 0, behavior: 'instant' });
    else document.getElementById?.(hash.slice(1))?.scrollIntoView();
  }
  previousDashboardView = progress;
  if (progress && typeof renderProgress === 'function') renderProgress();
}
if (typeof window.addEventListener === 'function') window.addEventListener('hashchange', routeDashboard);
routeDashboard();
