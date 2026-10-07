/* Load after app.js. Pair with assets/css/share-link.css. */
$(function () {
  'use strict';
  const form = document.getElementById('setup');
  const reader = document.getElementById('reader');
  if (!form || !reader) return;
  let pending = null;
  let savedLink = '';
  let feedbackTimer;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-outline-secondary copy-link-button';
  button.hidden = true;
  button.setAttribute('aria-label', 'Copy link to this reading content');
  button.title = 'Copy a reusable link to this reading content';
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"></path></svg><span>Copy Link</span>';
  reader.querySelector('header').appendChild(button);
  const label = button.querySelector('span');
  const feedback = document.createElement('span');
  feedback.className = 'share-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  button.insertAdjacentElement('afterend', feedback);

  const dialog = document.createElement('dialog');
  dialog.className = 'share-dialog';
  dialog.innerHTML = '<h2>Save this reading link</h2><p>Select and copy the link below.</p><label for="reading-share-url">Reading link</label><textarea id="reading-share-url" class="form-control" rows="5" readonly></textarea><p class="share-local-warning" hidden>This page is opened as a local file. Upload it to your website before creating a link that works on other devices.</p><button type="button" class="btn btn-primary mt-3">Close</button>';
  document.body.appendChild(dialog);
  const field = dialog.querySelector('textarea');
  dialog.querySelector('button').addEventListener('click', () => dialog.close());

  function feedbackText(text) {
    clearTimeout(feedbackTimer);
    feedback.textContent = text;
    feedbackTimer = setTimeout(() => { feedback.textContent = ''; label.textContent = 'Copy Link'; }, 3500);
  }
  function buildLink(content) {
    const url = new URL(location.href);
    ['text', 'csv', 'autostart'].forEach(key => url.searchParams.delete(key));
    url.hash = '';
    // Only the selected format belongs in a link; CSV takes precedence in app.js.
    url.searchParams.set(content.mode === 'csv' ? 'csv' : 'text', content.text);
    return url.href;
  }
  function activate(content) {
    if (!content || !content.text.trim()) return;
    savedLink = buildLink(content);
    button.hidden = false;
    button.disabled = false;
    label.textContent = 'Copy Link';
    feedback.textContent = '';
  }
  // Capture the submitted source, rather than changing the link when the editor is changed.
  form.addEventListener('submit', () => {
    pending = { mode: document.getElementById('mode').value, text: document.getElementById('text').value.trim() };
  }, true);
  // app.js reveals the reader only after successful parsing and font loading.
  new MutationObserver(() => {
    if (!reader.hidden && pending) { activate(pending); pending = null; }
  }).observe(reader, { attributes: true, attributeFilter: ['hidden'] });
  // Also cover a URL that auto-started before this add-on initialized.
  if (!reader.hidden) activate({mode: document.getElementById('mode').value, text: document.getElementById('text').value.trim()});

  button.addEventListener('click', async () => {
    if (!savedLink) return;
    if (location.protocol === 'file:') {
      field.value = savedLink;
      dialog.querySelector('.share-local-warning').hidden = false;
      dialog.showModal(); field.focus(); field.select();
      return;
    }
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(savedLink);
      label.textContent = 'Copied!';
      feedbackText('Reading link copied. Paste it wherever you want to save it.');
    } catch (error) {
      field.value = savedLink;
      dialog.querySelector('.share-local-warning').hidden = true;
      dialog.showModal(); field.focus(); field.select();
    }
  });
});
