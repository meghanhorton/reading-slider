(function () {
  "use strict";
  function init() {
    const U = window.ReadingUI;
    if (!U) return;
    document.body.classList.add("interface-active");
    const bar = document.createElement("nav");
    bar.className = "appbar";
    bar.setAttribute("aria-label", "App navigation");
    bar.innerHTML =
      '<div class="appbar-group appbar-links"></div><span class="appbar-title"></span><div class="appbar-group appbar-reading"></div><div class="appbar-group appbar-actions"></div><div class="appbar-group appbar-timer"></div>';
    document.body.prepend(bar);
    const links = bar.querySelector(".appbar-links"),
      reading = bar.querySelector(".appbar-reading"),
      actions = bar.querySelector(".appbar-actions"),
      timer = bar.querySelector(".appbar-timer");
    function link(href, icon, label) {
      const a = document.createElement("a");
      a.href = href;
      a.className = "btn btn-outline-secondary ui-icon-button";
      a.title = label;
      a.setAttribute("aria-label", label);
      a.innerHTML = U.svg(icon);
      links.appendChild(a);
    }
    link("index.html", "home", "Home");
    link("lesson.html", "lesson", "Lesson plan");
    bar.querySelector(".appbar-title").textContent = document.title;
function iconize(el, icon, label) {
      if (!el) return;

      // Preserve existing button variants, but style previously unstyled arrows.
      if (!el.classList.contains("btn")) {
        el.classList.add("btn", "btn-outline-secondary");
      }

      if (!el.classList.contains("ui-icon-button")) {
        el.classList.add("ui-icon-button");
      }     
      
      el.classList.add("ui-icon-button");
      el.title = label;
      el.setAttribute("aria-label", label);
      // Preserve Copy Link's existing span: its original handler updates that node.
      if (el.classList.contains("copy-link-button")) {
        const existing = el.querySelector("svg");
        if (existing) existing.classList.add("nav-icon");
        const span = el.querySelector("span");
        if (span) span.classList.add("nav-label");
        return;
      }
      if (!el.querySelector(".nav-icon"))
        el.innerHTML =
          U.svg(icon) + '<span class="nav-label">' + label + "</span>";
    }
    let queued = false;
    function update() {
      queued = false;
      const reader = document.getElementById("reader"),
        playing = !!reader && !reader.hidden,
        isLesson = !!document.getElementById("lesson-page"),
        csv = !!reader && reader.classList.contains("csv-mode");
      const move = (el, parent, icon, label, visible = true) => {
        if (!el) return;
        if (el.parentElement !== parent) parent.appendChild(el);
        iconize(el, icon, label);
        if (el.hidden === visible) el.hidden = !visible;
      };
      move(
        document.getElementById("edit"),
        actions,
        "edit",
        "Edit activity",
        playing,
      );
      move(
        document.getElementById("lesson-edit"),
        actions,
        "edit",
        document
          .getElementById("lesson-page")
          ?.classList.contains("lesson-editing")
          ? "Finish editing lesson"
          : "Edit lesson",
      );
      move(
        document.getElementById("lesson-copy"),
        actions,
        "copy",
        "Copy lesson link",
      );
      move(
        document.getElementById("lesson-share"),
        actions,
        "share",
        "Share lesson",
      );
      move(
        document.getElementById("wp-copy"),
        actions,
        "copy",
        "Copy activity link",
        playing,
      );
      move(
        document.getElementById("lt-copy"),
        actions,
        "copy",
        "Copy spelling link",
        playing,
      );
      const copy = document.querySelector(".copy-link-button");
      if (copy) {
        if (playing && !copy.hidden) copy.dataset.copyReady = "true";
        const ready = copy.dataset.copyReady === "true" || !copy.hidden;
        move(copy, actions, "copy", "Copy activity link", playing && ready);
      }
      const complete = document.querySelector(".lesson-return-button");
      move(complete, actions, "done", "Mark completed and return to lesson");
      [
        ["prev", "up", "Previous reading row"],
        ["next", "down", "Next reading row"],
        ["wp-previous", "left", "Previous word"],
        ["wp-next", "right", "Next word"],
      ].forEach(([id, icon, label]) =>
        move(document.getElementById(id), reading, icon, label, playing),
      );
      [
        ["previous-example", "left", "Previous example"],
        ["next-example", "right", "Next example"],
      ].forEach(([id, icon, label]) =>
        move(document.getElementById(id), reading, icon, label, playing && csv),
      );
      ["wp-count", "example-count"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          if (el.parentElement !== reading) reading.appendChild(el);
          el.classList.add("appbar-count");
          const hide = !playing || (id === "example-count" && !csv);
          if (el.hidden !== hide) el.hidden = hide;
        }
      });
      if (
        window.ReadingActivityTimer &&
        window.ReadingActivityTimer.parentElement !== timer
      )
        timer.appendChild(window.ReadingActivityTimer);
      document.documentElement.style.setProperty(
        "--appbar-height",
        Math.ceil(bar.getBoundingClientRect().height) + "px",
      );
    }
    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }
    const observer = new MutationObserver(queue);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "class"],
    });
    window.addEventListener("reading:timer-ready", queue);
    window.addEventListener("resize", queue);
    update();
    // Old setup-only home links are replaced by the shared bar.
    document
      .querySelectorAll(".wp-home-link")
      .forEach((el) => (el.hidden = true));
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
