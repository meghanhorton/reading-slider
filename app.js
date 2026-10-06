$(function () {
  const $reader = $('#reader'), $pages = $('#pages'), $measure = $('#measure');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  let words = [], pages = [], current = 0;
  let advance, settle, resize, navigating = null;

  // Inject the new row-handle styles so this file also works with the last package's CSS.
  if (!document.getElementById('continuous-row-styles')) {
    $('<style id="continuous-row-styles">').text(`
      #pages .row-text { position:relative; }
      #pages .row-text::before { content:none; }
      #pages .slider { pointer-events:none; cursor:default; }
      #pages .track { background:#dce1e7; }
      #pages .row-dot {
        position:absolute; left:0; bottom:32px; width:46px; height:46px;
        transform:translate(-50%,50%); border-radius:50%; background:#2375dc;
        border:4px solid white; box-shadow:0 2px 8px #163b6e38;
        cursor:grab; touch-action:none; user-select:none; z-index:1;
      }
      #pages .row-text.dragging .row-dot { cursor:grabbing; }
      #pages .row-dot:focus-visible { outline:3px solid #2375dc; outline-offset:4px; }
      #pages .letter { color:#555555; }
      #pages .letter.read { color:#000000; }
    `).appendTo('head');
  }

  function stopAdvance() { clearTimeout(advance); }
  function dragging() { return $pages.find('.row-text.dragging').length > 0; }
  function measure(word) {
    const rect = word.slider[0].getBoundingClientRect();
    word.thresholds = word.letters.children().toArray().map(letter => {
      const r = letter.getBoundingClientRect();
      return Math.max(0, Math.min(1, (r.left + r.width / 2 - rect.left) / rect.width));
    });
  }
  function paint(word) {
    let passed = 0;
    word.letters.children().each(function (index) {
      const read = word.value > 0 && word.value >= word.thresholds[index];
      $(this).toggleClass('read', read);
      if (read) passed++;
    });
    word.complete = passed === word.thresholds.length;
  }
  function status(auto = false) {
    stopAdvance();
    if (!pages[current]) return;
    const complete = pages[current].every(word => word.complete);
    $('#status').text(words.every(word => word.complete)
      ? 'Great reading! You finished the passage.'
      : complete ? 'Great reading!' : 'Drag the blue dot across the words as you read.');
    if (auto && complete && current < pages.length - 1 && !navigating && !dragging()) {
      const from = current;
      advance = setTimeout(function () {
        if (current === from && !$reader.prop('hidden')) go(current + 1, true);
      }, 650);
    }
  }
  function update() {
    $('#count').text(`Page ${current + 1} of ${pages.length}`);
    $('#prev').prop('disabled', current === 0);
    $('#next').prop('disabled', current === pages.length - 1);
    $pages.find('.page').each(function (index) {
      $(this).find('.row-dot').attr('tabindex', index === current ? '0' : '-1');
    });
    status();
  }
  function focusHandle() {
    const handle = $pages.children('.page').eq(current).find('.row-dot')[0];
    if (handle) handle.focus({ preventScroll: true });
  }
  function go(index, focus = false, smooth = true) {
    if (index < 0 || index >= pages.length || dragging()) return;
    stopAdvance(); clearTimeout(settle);
    current = index; update();
    const container = $pages[0], top = index * container.clientHeight;
    if (!smooth || reduced.matches || Math.abs(container.scrollTop - top) < 1) {
      navigating = null;
      container.scrollTo({ top, behavior: 'instant' });
      if (focus) focusHandle();
    } else {
      navigating = { index, focus };
      container.scrollTo({ top, behavior: 'smooth' });
    }
  }
  $pages.on('scroll', function () {
    stopAdvance(); clearTimeout(settle);
    settle = setTimeout(function () {
      if ($reader.prop('hidden') || !pages.length) return;
      const index = Math.max(0, Math.min(pages.length - 1,
        Math.round($pages[0].scrollTop / $pages[0].clientHeight)));
      const focus = navigating && navigating.index === index && navigating.focus;
      navigating = null; current = index; update();
      if (focus) focusHandle();
    }, 180);
  }).on('wheel touchstart', function (event) {
    if ($(event.target).closest('.row-dot').length) return;
    navigating = null; stopAdvance();
  });

  function makeWord(text, sentence) {
    const box = $('<div class="word">');
    const letters = $('<div class="letters" aria-hidden="true">');
    const chars = segmenter
      ? Array.from(segmenter.segment(text), item => item.segment) : Array.from(text);
    chars.forEach(character => $('<span class="letter">').text(character).appendTo(letters));
    const slider = $('<div class="slider">').append($('<div class="track">'));
    box.append(letters, slider);
    return { box, letters, slider, sentence, value: 0, complete: false, thresholds: [] };
  }

  function bindRow(row, page, pageNumber) {
    const handle = $('<div class="row-dot">').attr({
      role: 'slider', tabindex: '-1',
      'aria-label': `Reading progress for page ${pageNumber + 1}`,
      'aria-orientation': 'horizontal', 'aria-valuemin': '0',
      'aria-valuemax': '100', 'aria-valuenow': '0'
    });
    row.append(handle);
    let pointer = null, grabOffset = 0;
    function geometry() {
      const origin = row[0].getBoundingClientRect().left;
      const segments = page.map(word => {
        const rect = word.slider[0].getBoundingClientRect();
        return { word, left: rect.left - origin, width: rect.width };
      });
      return {
        segments, start: segments[0].left,
        end: segments[segments.length - 1].left + segments[segments.length - 1].width
      };
    }
    function position(x, bounds) {
      row.data('dotX', x);
      handle.css('left', x + 'px').attr({
        'aria-valuenow': Math.round(100 * (x - bounds.start) / (bounds.end - bounds.start)),
        'aria-valuetext': `${page.filter(word => word.complete).length} of ${page.length} words passed`
      });
    }
    function apply(x) {
      const bounds = geometry();
      x = Math.max(bounds.start, Math.min(bounds.end, x));
      bounds.segments.forEach(segment => {
        segment.word.value = Math.max(0, Math.min(1, (x - segment.left) / segment.width));
        paint(segment.word);
      });
      position(x, bounds); status(false);
    }
    function restore() {
      const bounds = geometry();
      const next = bounds.segments.find(segment => !segment.word.complete);
      position(next ? next.left + next.word.value * next.width : bounds.end, bounds);
    }
    function move(event) {
      apply(event.clientX - row[0].getBoundingClientRect().left - grabOffset);
    }
    function cancel() {
      const id = pointer;
      pointer = null; row.removeClass('dragging');
      if (id !== null && handle[0].hasPointerCapture(id)) handle[0].releasePointerCapture(id);
    }
    handle.on('pointerdown', function (event) {
      const p = event.originalEvent;
      if (!p.isPrimary || p.button !== 0 || pointer !== null || navigating || current !== pageNumber) return;
      event.preventDefault(); stopAdvance();
      const rect = handle[0].getBoundingClientRect();
      grabOffset = p.clientX - (rect.left + rect.width / 2);
      pointer = p.pointerId;
      page.forEach(measure);
      row.addClass('dragging');
      handle[0].focus({ preventScroll: true });
      handle[0].setPointerCapture(pointer);
    }).on('pointermove', function (event) {
      if (event.originalEvent.pointerId === pointer) move(event.originalEvent);
    }).on('pointerup pointercancel', function (event) {
      const p = event.originalEvent;
      if (p.pointerId !== pointer) return;
      if (p.type === 'pointerup') move(p);
      cancel(); status(p.type === 'pointerup');
    }).on('lostpointercapture', function () {
      if (pointer === null) return;
      pointer = null; row.removeClass('dragging'); status(false);
    }).on('keydown', function (event) {
      if (navigating || current !== pageNumber) return;
      page.forEach(measure);
      const bounds = geometry(), x = Number(row.data('dotX'));
      let next;
      switch (event.key) {
        case 'ArrowRight': case 'ArrowUp': next = x + 12; break;
        case 'ArrowLeft': case 'ArrowDown': next = x - 12; break;
        case 'Home': next = bounds.start; break;
        case 'End': next = bounds.end; break;
        default: return;
      }
      event.preventDefault(); apply(next); status(true);
    });
    row.data('restoreDot', restore).data('cancelDrag', cancel);
  }
  function cancelDrags() {
    $pages.find('.row-text').each(function () {
      const cancel = $(this).data('cancelDrag'); if (cancel) cancel();
    });
  }
  function restoreDots() {
    $pages.find('.row-text').each(function () {
      const restore = $(this).data('restoreDot'); if (restore) restore();
    });
  }
  function paginate(anchor) {
    cancelDrags(); stopAdvance(); clearTimeout(settle); navigating = null;
    words.forEach(word => word.box.detach()); $pages.empty(); $measure.empty();
    const probe = $('<div class="page">'), row = $('<div class="row-text">');
    probe.append(row); $pages.append(probe);
    const style = getComputedStyle(probe[0]);
    const available = Math.max(46, probe[0].clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const gap = parseFloat(getComputedStyle(row[0]).gap) || 28;
    const size = Number($('#size').val()); probe.remove();
    words.forEach(word => {
      word.letters.css('font-size', ''); $measure.append(word.box);
      let width = word.box[0].getBoundingClientRect().width;
      if (width > available) {
        word.letters.css('font-size', size * available / width + 'px');
        width = word.box[0].getBoundingClientRect().width;
      }
      word.width = width;
    });
    pages = []; let group = [], width = 0, sentence = null;
    function finish() { if (group.length) pages.push(group); group = []; width = 0; }
    words.forEach(word => {
      if (group.length && (sentence !== word.sentence || width + gap + word.width > available)) finish();
      sentence = word.sentence; width += word.width + (group.length ? gap : 0); group.push(word);
    }); finish();
    pages.forEach((page, index) => {
      const screen = $('<div class="page">').attr({ role: 'group', 'aria-label': `Reading page ${index + 1}` });
      const row = $('<div class="row-text">');
      page.forEach(word => row.append(word.box)); screen.append(row); $pages.append(screen);
      bindRow(row, page, index);
    });
    words.forEach(word => { measure(word); paint(word); }); restoreDots();
    const index = pages.findIndex(page => page.includes(anchor)); go(index >= 0 ? index : 0, false, false);
  }
  $('#setup').on('submit', async function (event) {
    event.preventDefault(); const text = $('#text').val().trim();
    if (!text) { $('#message').text('Enter some text before starting.'); return; }
    const button = $(this).find('button'); button.prop('disabled', true);
    try { if (document.fonts) await document.fonts.load('64px "KG Primary Penmanship Alt"'); }
    catch (error) { console.warn('Custom font unavailable; using fallback.', error); }
    button.prop('disabled', false); $('#message').text('');
    cancelDrags(); stopAdvance(); clearTimeout(settle); clearTimeout(resize);
    $pages.empty(); $measure.empty(); words = [];
    const sentences = text.split(/(?<=[.!?…])\s+|(?<=[.!?…]["”’'])\s+|\n+/u).map(s => s.trim()).filter(Boolean);
    sentences.forEach((sentence, index) => sentence.split(/\s+/u).forEach(word => words.push(makeWord(word, index))));
    $reader.prop('hidden', false); $('body').addClass('reading'); paginate(words[0]); focusHandle();
  });
  $('#size').on('input', function () {
    document.documentElement.style.setProperty('--text-size', this.value + 'px');
    $('#size-label').text(this.value + 'px');
  });
  $('#prev').on('click', () => go(current - 1, true));
  $('#next').on('click', () => go(current + 1, true));
  $('#reset').on('click', function () {
    cancelDrags(); words.forEach(word => { word.value = 0; paint(word); }); restoreDots(); go(0, true);
  });
  $('#edit').on('click', function () {
    cancelDrags(); stopAdvance(); clearTimeout(settle); clearTimeout(resize); navigating = null;
    $reader.prop('hidden', true); $('body').removeClass('reading'); $('#text').trigger('focus');
  });
  $(window).on('resize', function () {
    if ($reader.prop('hidden')) return;
    stopAdvance(); clearTimeout(resize); resize = setTimeout(() => paginate(pages[current]?.[0]), 120);
  });
  $(document).on('keydown', function (event) {
    if ($reader.prop('hidden')) return;
    if (event.key === 'PageDown') { event.preventDefault(); go(current + 1, true); }
    else if (event.key === 'PageUp') { event.preventDefault(); go(current - 1, true); }
    else if (event.key === 'Escape') $('#edit').trigger('click');
  });
});
