/* Supplement loaded before app.js: shared app owns rendering, dragging, fonts and celebration. */
window.ReadingPyramid = function (api) {
  "use strict";
  const { $reader, $pages, words } = api;
  function sync() {
  // Wait until the child releases the dot before changing rows.
  if ($pages.find(".dragging").length) return;

  const groups = api.getPages();
  if (!groups.length) return;

  const next = groups.findIndex(group =>
    !group.every(word => word.complete)
  );

  // When everything is complete, keep the final row active.
  const activeIndex = next >= 0 ? next : groups.length - 1;

  api.setCurrent(activeIndex);

  $pages.find(".row-text").each(function (index) {
    const completed = groups[index].every(word => word.complete);
    const active = index === activeIndex;

    $(this)
      .toggleClass("active-line", active)
      .toggleClass("completed-line", completed)
      .find(".row-dot")
      .attr({
        "tabindex": active ? "0" : "-1",
        "aria-disabled": active ? "false" : "true"
      });
  });
}
  function status(finish = false) {
    api.stopAdvance();
    sync();
    const groups = api.getPages();
    if (!groups.length) return;
    const completed = groups.filter((group) =>
        group.every((w) => w.complete),
      ).length,
      all = completed === groups.length;
    $("#status").text(
      all
        ? "Great reading! This pyramid is complete."
        : `${completed} of ${groups.length} lines complete`,
    );
    api.updateExamples();
    if (finish && all && !$pages.find(".dragging").length) api.celebrate();
  }
  function focus() {
    const h = $pages.find(".active-line .row-dot")[0];
    if (h) h.focus({ preventScroll: true });
  }
  function fit() {
    const requested = Number($("#size").val()),
      available = Math.max(46, $pages[0].clientWidth - 60),
      height = $pages[0].clientHeight - 24;
    const rows = $pages.find(".row-text");
    let size = requested;
    words().forEach((w) => w.letters[0].style.removeProperty("--word-size"));
    for (let step = 0; step < 12; step++) {
      $pages[0].style.setProperty("--pyramid-size", size + "px");
      $pages[0].style.setProperty(
        "--pyramid-gap",
        Math.max(8, (18 * size) / requested) + "px",
      );
      $pages[0].style.setProperty(
        "--pyramid-word-gap",
        Math.max(4, (22 * size) / requested) + "px",
      );
      const widths = rows
          .toArray()
          .map((el) => el.getBoundingClientRect().width),
        maxWidth = Math.max(...widths);
      const gap = parseFloat(getComputedStyle($pages[0]).gap) || 8;
      const total =
        rows
          .toArray()
          .reduce((sum, el) => sum + el.getBoundingClientRect().height, 0) +
        Math.max(0, rows.length - 1) * gap;
      const ratio = Math.min(1, available / maxWidth, height / total);
      if (ratio >= 0.995 || size <= 18) break;
      size = Math.max(18, size * ratio);
    }
    // Fit unusually long lines even after reaching the minimum common text size.
    rows.each(function () {
      const width = this.getBoundingClientRect().width;
      if (width > available)
        $(this)
          .find(".letters")
          .each(function () {
            this.style.setProperty(
              "--word-size",
              (size * available) / width + "px",
            );
          });
    });
    words().forEach((w) => {
      api.measure(w);
      api.paint(w);
    });
    api.restoreDots();
  }
  function paginate() {
    api.cancelDrags();
    api.stopAdvance();
    api.clearNavigation();
    words().forEach((w) => w.box.detach());
    $pages.empty();
    api.$measure.empty();
    const groups = [];
    words().forEach((w) => {
      if (!groups[w.sentence]) groups[w.sentence] = [];
      groups[w.sentence].push(w);
    });
    api.setPages(groups);
    groups.forEach((group, i) => {
      const row = $('<div class="row-text pyramid-line">').attr({
        role: "group",
        "aria-label": `Pyramid line ${i + 1}`,
      });
      group.forEach((w) => row.append(w.box));
      $pages.append(row);
      api.bindRow(row, group, i);
      row.find(".row-dot").attr("aria-label", `Read pyramid line ${i + 1}`);
    });
    fit();
    status();
    api.setSavedPage(0);
  }
  function go(index, moveFocus) {
    sync();
    if (moveFocus) focus();
  }
  return {
    split: (text) => text.split(/\r\n|\n|\r/),
    paginate,
    status,
    update: () => status(),
    focus,
    go,
  };
};
