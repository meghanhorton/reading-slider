/* Preserve old reading links that pointed to index.html or the site root. */
(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.has('text') || params.has('csv')) {
    const destination = new URL('slider.html', window.location.href);
    destination.search = window.location.search;
    destination.hash = window.location.hash;
    window.location.replace(destination.href);
  }
})();
