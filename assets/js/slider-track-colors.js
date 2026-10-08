/* Load AFTER reading-features.js and BEFORE app.js. */
(function () {
  'use strict';
  const factory = window.ReadingPyramid;
  if (typeof factory !== 'function') {
    console.warn('Slider track colors: load reading-features.js before this file.');
    return;
  }
  function sync(word) {
    const track = word.slider.find('.track')[0];
    const units = word.readingUnits;
    if (!track || !units || !units.length) return;
    const signature = units.map(unit =>
      `${unit.startFraction.toFixed(5)}:${unit.endFraction.toFixed(5)}:${unit.emphasis}`
    ).join('|');
    if (word.trackColorSignature !== signature) {
      track.replaceChildren();
      track.classList.add('segmented-track');
      word.trackColorSegments = units.map(unit => {
        const segment = document.createElement('span');
        segment.className = 'track-segment';
        if (unit.emphasis) segment.classList.add('emphasis-segment');
        segment.setAttribute('aria-hidden', 'true');
        segment.style.setProperty('--segment-left', unit.startFraction * 100 + '%');
        segment.style.setProperty('--segment-width', (unit.endFraction - unit.startFraction) * 100 + '%');
        const fill = document.createElement('span');
        fill.className = 'track-segment-fill';
        segment.appendChild(fill);
        track.appendChild(segment);
        return segment;
      });
      word.trackColorSignature = signature;
    }
    units.forEach((unit, index) => {
      const width = unit.endFraction - unit.startFraction;
      const progress = Math.max(0, Math.min(1, (word.value - unit.startFraction) / width));
      word.trackColorSegments[index].style.setProperty('--segment-progress', progress * 100 + '%');
    });
  }
  window.ReadingPyramid = function (api) {
    const extension = factory(api);
    const measure = api.measure;
    const paint = api.paint;
    api.measure = function (word) {
      measure(word);
      sync(word);
    };
    api.paint = function (word) {
      paint(word);
      sync(word);
    };
    return extension;
  };
})();
