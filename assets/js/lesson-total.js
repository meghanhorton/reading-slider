/* Load after lesson-common.js and activity-timers.js on lesson.html. */
(function () {
  'use strict';
  function init() {
    const page = document.getElementById('lesson-page');
    const S = window.LessonStore;
    if (!page || !S) return;
    const heading = page.querySelector('.lesson-heading');
    if (!heading || document.getElementById('lesson-total-time')) return;
    heading.classList.add('has-lesson-total');
    const total = document.createElement('div');
    total.id = 'lesson-total-time';
    total.className = 'lesson-total-time';
    const label = document.createElement('span');
    label.className = 'lesson-total-label';
    label.textContent = 'Total time';
    const output = document.createElement('output');
    output.className = 'lesson-total-value';
    output.setAttribute('aria-label', 'Total elapsed time for all lesson activities');
    output.textContent = '00:00';
    total.append(label, output);
    heading.appendChild(total);

    function elapsed(timer, now) {
      if (window.ReadingTimerCore) return window.ReadingTimerCore.elapsed(timer, now);
      const t = timer || {};
      const saved = Number.isFinite(t.elapsedMs) ? Math.max(0, t.elapsedMs) : 0;
      const running = Number.isFinite(t.runningSince) && t.runningSince > 0;
      return saved + (running ? Math.max(0, now - t.runningSince) : 0);
    }
    function format(ms) {
      if (window.ReadingTimerCore) return window.ReadingTimerCore.format(ms);
      const seconds = Math.floor(ms / 1000);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor(seconds / 60) % 60;
      return (hours ? hours + ':' : '') + String(minutes).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    }
    function refresh() {
      try {
        const encoded = new URLSearchParams(location.hash.slice(1)).get('plan');
        const plan = encoded ? S.freshest(S.normalize(S.decode(encoded))) : S.last();
        const now = Date.now();
        const sum = (plan?.sections || []).reduce((total, section) =>
          total + section.items.reduce((subtotal, item) => subtotal + elapsed(item.timer, now), 0), 0);
        const text = format(sum);
        if (output.textContent !== text) output.textContent = text;
        const running = (plan?.sections || []).some(section => section.items.some(item => item.timer?.runningSince));
        total.classList.toggle('is-running', running);
      } catch (error) {
        output.textContent = '00:00';
      }
    }
    refresh();
    setInterval(refresh, 250);
    window.addEventListener('storage', refresh);
    window.addEventListener('hashchange', refresh);
    document.addEventListener('visibilitychange', refresh);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
