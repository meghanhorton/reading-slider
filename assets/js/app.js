$(function () {
  "use strict";
  const $reader = $("#reader"),
    $pages = $("#pages"),
    $measure = $("#measure");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const segmenter =
    typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  let examples = [],
    exampleIndex = 0,
    pages = [],
    current = 0,
    advance,
    settle,
    resize,
    navigating = null;
  let audio = null,
    canvas = null,
    animation = null;
  const words = () => examples[exampleIndex]?.words || [];
  const dragging = () => $pages.find(".dragging").length > 0;
  let extension = null;
  function stopAdvance() {
    clearTimeout(advance);
  }
  function parseCSV(text) {
    const rows = [];
    let row = [],
      cell = "",
      quoted = false,
      closed = false;
    text = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            quoted = false;
            closed = true;
          }
        } else cell += c;
      } else if (c === '"' && !cell.trim() && !closed) {
        cell = "";
        quoted = true;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
        closed = false;
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        closed = false;
      } else if (closed && !/\s/.test(c))
        throw new Error("Unexpected text after a closing CSV quote.");
      else if (!closed) cell += c;
    }
    if (quoted) throw new Error("CSV has an unclosed quotation mark.");
    row.push(cell);
    rows.push(row);
    const first = rows.findIndex((r) => r.some((c) => c.trim()));
    if (
      first >= 0 &&
      rows[first].length === 1 &&
      /^(text|sentence|example)$/i.test(rows[first][0].trim())
    )
      rows.splice(first, 1);
    return rows
      .flat()
      .map((c) => c.trim())
      .filter(Boolean);
  }
  function unlockAudio() {
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      if (!audio) audio = new A();
      if (audio.state === "suspended") audio.resume().catch(() => {});
    } catch (e) {
      console.warn(e);
    }
  }
  document.addEventListener("pointerdown", unlockAudio, { passive: true });
  document.addEventListener("keydown", unlockAudio);
  function stopConfetti() {
    cancelAnimationFrame(animation);
    if (canvas) canvas.remove();
    canvas = null;
  }
  function celebrate() {
    const example = examples[exampleIndex];
    if (example.celebrated) return;
    example.celebrated = true;
    if (audio?.state === "running") {
      const now = audio.currentTime;
      [
        [1046.5, 0.15, 0.85],
        [2093, 0.045, 0.6],
      ].forEach(([f, v, d]) => {
        const o = audio.createOscillator(),
          g = audio.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(v, now + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + d);
        o.connect(g);
        g.connect(audio.destination);
        o.start(now);
        o.stop(now + d + 0.03);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
        };
      });
    }
    stopConfetti();
    canvas = document.createElement("canvas");
    canvas.classList.add("reading-confetti");
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      stopConfetti();
      return;
    }
    const w = innerWidth,
      h = innerHeight,
      dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#2375dc", "#ffca48", "#ec6394", "#52b788", "#9c7bea"];
    const particles = Array.from({ length: reduced.matches ? 40 : 140 }, () => {
      const left = Math.random() < 0.5;
      return {
        x: reduced.matches ? Math.random() * w : left ? w * 0.15 : w * 0.85,
        y: reduced.matches ? Math.random() * h : h * 0.55,
        vx: (left ? 1 : -1) * (100 + Math.random() * 300),
        vy: -270 - Math.random() * 400,
        s: 5 + Math.random() * 7,
        r: Math.random() * 6.28,
        color: colors[Math.floor(Math.random() * 5)],
      };
    });
    const start = performance.now();
    let last = start;
    function frame(now) {
      const duration = reduced.matches ? 1000 : 3000;
      if (now - start > duration) {
        stopConfetti();
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.min(1, (duration - (now - start)) / 600);
      particles.forEach((p) => {
        if (!reduced.matches) {
          p.vy += 380 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.r += 3 * dt;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.65);
        ctx.restore();
      });
      animation = requestAnimationFrame(frame);
    }
    animation = requestAnimationFrame(frame);
  }
  function measure(word) {
    const rect = word.slider[0].getBoundingClientRect();
    word.thresholds = word.letters
      .children()
      .toArray()
      .map((el) => {
        const r = el.getBoundingClientRect();
        return Math.max(
          0,
          Math.min(1, (r.left + r.width / 2 - rect.left) / rect.width),
        );
      });
  }
  function paint(word) {
    let passed = 0;
    word.letters.children().each(function (index) {
      const read = word.value > 0 && word.value >= word.thresholds[index];
      $(this).toggleClass("read", read);
      if (read) passed++;
    });
    word.complete = passed === word.thresholds.length;
    word.slider[0].style.setProperty(
      "--track-progress",
      `${Math.max(0, Math.min(1, word.value)) * 100}%`,
    );
  }
  function updateExamples() {
    $("#example-count").text(`${exampleIndex + 1} of ${examples.length}`);
    $("#previous-example").prop("disabled", exampleIndex === 0);
    $("#next-example").prop("disabled", exampleIndex === examples.length - 1);
    $("#example-dots .example-dot").each(function (i) {
      const done = examples[i].words.every((w) => w.complete);
      $(this)
        .toggleClass("active", i === exampleIndex)
        .toggleClass("complete", done)
        .attr("aria-label", `Example ${i + 1}${done ? ", completed" : ""}`);
      if (i === exampleIndex) $(this).attr("aria-current", "true");
      else $(this).removeAttr("aria-current");
    });
  }
  function status(auto = false) {
    if (extension) return extension.status(auto);
    stopAdvance();
    if (!pages[current]) return;
    const complete = pages[current].every((w) => w.complete),
      all = words().every((w) => w.complete);
    $("#status").text(
      all
        ? "Great reading! This example is complete."
        : complete
          ? "Great reading!"
          : "Drag the blue dot across the words as you read.",
    );
    updateExamples();
    if (auto && all && !dragging()) celebrate();
    if (
      auto &&
      complete &&
      current < pages.length - 1 &&
      !navigating &&
      !dragging()
    ) {
      const from = current;
      advance = setTimeout(() => {
        if (current === from && !$reader.prop("hidden")) go(current + 1, true);
      }, 650);
    }
  }
  function update() {
    if (extension) return extension.update();
    examples[exampleIndex].page = current;
    $("#count").text(`Row ${current + 1} of ${pages.length}`);
    $("#prev").prop("disabled", current === 0);
    $("#next").prop("disabled", current === pages.length - 1);
    $pages.children(".page").each(function (i) {
      $(this)
        .find(".row-dot")
        .attr("tabindex", i === current ? "0" : "-1");
    });
    status();
  }
  function focusHandle() {
    if (extension) return extension.focus();
    const h = $pages.children(".page").eq(current).find(".row-dot")[0];
    if (h) h.focus({ preventScroll: true });
  }
  function go(i, focus = false, smooth = true) {
    if (extension) return extension.go(i, focus);
    if (i < 0 || i >= pages.length || dragging()) return;
    stopAdvance();
    clearTimeout(settle);
    current = i;
    update();
    const el = $pages[0],
      top = i * el.clientHeight;
    if (!smooth || reduced.matches || Math.abs(el.scrollTop - top) < 1) {
      navigating = null;
      el.scrollTo({ top, behavior: "instant" });
      if (focus) focusHandle();
    } else {
      navigating = { i, focus };
      el.scrollTo({ top, behavior: "smooth" });
    }
  }
  $pages
    .on("scroll", () => {
      if (extension) return;
      stopAdvance();
      clearTimeout(settle);
      settle = setTimeout(() => {
        if ($reader.prop("hidden") || !pages.length) return;
        const i = Math.max(
          0,
          Math.min(
            pages.length - 1,
            Math.round($pages[0].scrollTop / $pages[0].clientHeight),
          ),
        );
        const focus = navigating && navigating.i === i && navigating.focus;
        navigating = null;
        current = i;
        update();
        if (focus) focusHandle();
      }, 180);
    })
    .on("wheel touchstart", (e) => {
      if ($(e.target).closest(".row-dot").length) return;
      navigating = null;
      stopAdvance();
    });
  function makeWord(text, sentence) {
    const box = $('<div class="word">'),
      letters = $('<div class="letters" aria-hidden="true">');
    const chars = segmenter
      ? Array.from(segmenter.segment(text), (s) => s.segment)
      : Array.from(text);
    chars.forEach((c) => $('<span class="letter">').text(c).appendTo(letters));
    const slider = $('<div class="slider">').append($('<div class="track">'));
    box.append(letters, slider);
    return {
      box,
      letters,
      slider,
      sentence,
      value: 0,
      complete: false,
      thresholds: [],
    };
  }
  function bindRow(row, page, index) {
    const handle = $('<div class="row-dot">').attr({
      role: "slider",
      tabindex: -1,
      "aria-label": `Example ${exampleIndex + 1}, row ${index + 1} progress`,
      "aria-orientation": "horizontal",
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": 0,
    });
    row.append(handle);
    let pointer = null,
      offset = 0;
    function bounds() {
      const origin = row[0].getBoundingClientRect().left;
      const segments = page.map((word) => {
        const r = word.slider[0].getBoundingClientRect();
        return { word, left: r.left - origin, width: r.width };
      });
      const last = segments[segments.length - 1];
      return { segments, start: segments[0].left, end: last.left + last.width };
    }
    function position(x, b) {
      row.data("dotX", x);
      row[0].style.setProperty("--dot-x", x + "px");
      handle.attr({
        "aria-valuenow": Math.round((100 * (x - b.start)) / (b.end - b.start)),
        "aria-valuetext": `${page.filter((w) => w.complete).length} of ${page.length} words passed`,
      });
    }
    function apply(x) {
      const b = bounds();
      x = Math.max(b.start, Math.min(b.end, x));
      b.segments.forEach((s) => {
        s.word.value = Math.max(0, Math.min(1, (x - s.left) / s.width));
        paint(s.word);
      });
      position(x, b);
      status();
    }
    function restore() {
      const b = bounds(),
        next = b.segments.find((s) => !s.word.complete);
      position(next ? next.left + next.word.value * next.width : b.end, b);
    }
    function move(p) {
      apply(p.clientX - row[0].getBoundingClientRect().left - offset);
    }
    function cancel() {
      const id = pointer;
      pointer = null;
      row.removeClass("dragging");
      if (id !== null && handle[0].hasPointerCapture(id))
        handle[0].releasePointerCapture(id);
    }
    handle
      .on("pointerdown", (e) => {
        const p = e.originalEvent;
        if (
          !p.isPrimary ||
          p.button !== 0 ||
          pointer !== null ||
          navigating ||
          current !== index
        )
          return;
        e.preventDefault();
        stopAdvance();
        const r = handle[0].getBoundingClientRect();
        offset = p.clientX - (r.left + r.width / 2);
        pointer = p.pointerId;
        page.forEach(measure);
        row.addClass("dragging");
        handle[0].focus({ preventScroll: true });
        handle[0].setPointerCapture(pointer);
      })
      .on("pointermove", (e) => {
        if (e.originalEvent.pointerId === pointer) move(e.originalEvent);
      })
      .on("pointerup pointercancel", (e) => {
        const p = e.originalEvent;
        if (p.pointerId !== pointer) return;
        if (p.type === "pointerup") move(p);
        cancel();
        status(p.type === "pointerup");
      })
      .on("lostpointercapture", () => {
        if (pointer === null) return;
        pointer = null;
        row.removeClass("dragging");
        status();
      })
      .on("keydown", (e) => {
        if (navigating || current !== index) return;
        page.forEach(measure);
        const b = bounds(),
          x = Number(row.data("dotX"));
        let next;
        switch (e.key) {
          case "ArrowRight":
          case "ArrowUp":
            next = x + 12;
            break;
          case "ArrowLeft":
          case "ArrowDown":
            next = x - 12;
            break;
          case "Home":
            next = b.start;
            break;
          case "End":
            next = b.end;
            break;
          default:
            return;
        }
        e.preventDefault();
        apply(next);
        status(true);
      });
    row.data("restoreDot", restore).data("cancelDrag", cancel);
  }
  function cancelDrags() {
    $pages.find(".row-text").each(function () {
      const fn = $(this).data("cancelDrag");
      if (fn) fn();
    });
  }
  function restoreDots() {
    $pages.find(".row-text").each(function () {
      const fn = $(this).data("restoreDot");
      if (fn) fn();
    });
  }
  function paginate(anchor, target = 0) {
    if (extension) return extension.paginate(anchor, target);
    cancelDrags();
    stopAdvance();
    clearTimeout(settle);
    navigating = null;
    words().forEach((w) => w.box.detach());
    $pages.empty();
    $measure.empty();
    const probe = $('<div class="page">'),
      row = $('<div class="row-text">');
    probe.append(row);
    $pages.append(probe);
    const s = getComputedStyle(probe[0]),
      available = Math.max(
        46,
        probe[0].clientWidth -
          parseFloat(s.paddingLeft) -
          parseFloat(s.paddingRight),
      ),
      gap = parseFloat(getComputedStyle(row[0]).gap) || 28,
      size = Number($("#size").val());
    probe.remove();
    words().forEach((w) => {
      w.letters[0].style.removeProperty("--word-size");
      $measure.append(w.box);
      let width = w.box[0].getBoundingClientRect().width;
      if (width > available) {
        w.letters[0].style.setProperty(
          "--word-size",
          (size * available) / width + "px",
        );
        width = w.box[0].getBoundingClientRect().width;
      }
      w.width = width;
    });
    pages = [];
    let group = [],
      width = 0,
      sentence = null;
    function finish() {
      if (group.length) pages.push(group);
      group = [];
      width = 0;
    }
    words().forEach((w) => {
      if (
        group.length &&
        (sentence !== w.sentence || width + gap + w.width > available)
      )
        finish();
      sentence = w.sentence;
      width += w.width + (group.length ? gap : 0);
      group.push(w);
    });
    finish();
    pages.forEach((page, i) => {
      const screen = $('<div class="page">').attr({
          role: "group",
          "aria-label": `Row ${i + 1}`,
        }),
        row = $('<div class="row-text">');
      page.forEach((w) => row.append(w.box));
      screen.append(row);
      $pages.append(screen);
      bindRow(row, page, i);
    });
    words().forEach((w) => {
      measure(w);
      paint(w);
    });
    restoreDots();
    const i = pages.findIndex((p) => p.includes(anchor));
    go(i >= 0 ? i : Math.min(target, pages.length - 1), false, false);
  }
  function switchExample(i) {
    if (i < 0 || i >= examples.length || dragging()) return;
    cancelDrags();
    stopAdvance();
    clearTimeout(settle);
    clearTimeout(resize);
    stopConfetti();
    words().forEach((w) => w.box.detach());
    exampleIndex = i;
    paginate(null, examples[i].page);
    focusHandle();
  }
  $("#example-dots").on("click", ".example-dot", function () {
    switchExample(Number($(this).data("index")));
  });
  $("#previous-example").on("click", () => switchExample(exampleIndex - 1));
  $("#next-example").on("click", () => switchExample(exampleIndex + 1));
  $("#setup").on("submit", async function (e) {
    e.preventDefault();
    let texts;
    try {
      const text = $("#text").val().trim();
      texts = $("#mode").val() === "csv" ? parseCSV(text) : text ? [text] : [];
      if (!texts.length) throw new Error("Enter at least one reading example.");
    } catch (error) {
      $("#message").text(error.message);
      return;
    }
    const button = $(this).find("button");
    button.prop("disabled", true);
    try {
      if (document.fonts)
        await document.fonts.load('64px "KG Primary Penmanship Alt"');
    } catch (error) {
      console.warn(error);
    }
    button.prop("disabled", false);
    $("#message").text("");
    cancelDrags();
    stopAdvance();
    clearTimeout(settle);
    clearTimeout(resize);
    stopConfetti();
    $pages.empty();
    $measure.empty();
    examples = texts.map((text) => {
      const list = [];
      const parts = extension
        ? extension.split(text)
        : text.split(/(?<=[.!?…])\s+|(?<=[.!?…]["”’'])\s+|\n+/u);
      parts
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s, i) =>
          s.split(/\s+/u).forEach((w) => list.push(makeWord(w, i))),
        );
      return { words: list, page: 0, celebrated: false };
    });
    exampleIndex = 0;
    $("#example-dots").empty();
    examples.forEach((example, i) =>
      $('<button type="button" class="example-dot">')
        .attr("title", `Example ${i + 1}`)
        .data("index", i)
        .appendTo("#example-dots"),
    );
    $reader.toggleClass("csv-mode", $("#mode").val() === "csv");
    $reader.prop("hidden", false);
    $("body").addClass("reading");
    paginate(null, 0);
    focusHandle();
    document.dispatchEvent(
      new CustomEvent("reading:submitted", {
        detail: { mode: $("#mode").val(), text: $("#text").val().trim() },
      }),
    );
  });
  $("#size").on("input", function () {
    document.documentElement.style.setProperty(
      "--text-size",
      this.value + "px",
    );
    $("#size-label").text(this.value + "px");
  });
  $("#prev").on("click", () => go(current - 1, true));
  $("#next").on("click", () => go(current + 1, true));
  $("#reset").on("click", () => {
    cancelDrags();
    stopConfetti();
    examples.forEach((ex) => {
      ex.page = 0;
      ex.celebrated = false;
      ex.words.forEach((w) => {
        w.value = 0;
        w.complete = false;
      });
    });
    words().forEach(paint);
    restoreDots();
    if (extension) extension.update();
    else go(0, true);
  });
  $("#edit").on("click", () => {
    cancelDrags();
    stopAdvance();
    clearTimeout(settle);
    clearTimeout(resize);
    stopConfetti();
    navigating = null;
    $reader.prop("hidden", true);
    $("body").removeClass("reading");
    $("#text").trigger("focus");
  });
  $(window).on("resize", () => {
    if ($reader.prop("hidden")) return;
    stopAdvance();
    clearTimeout(resize);
    resize = setTimeout(() => paginate(pages[current]?.[0], current), 120);
  });
  $(document).on("keydown", (e) => {
    if ($reader.prop("hidden")) return;
    if (e.key === "PageDown") {
      e.preventDefault();
      go(current + 1, true);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      go(current - 1, true);
    } else if (e.key === "Escape") $("#edit").trigger("click");
  });
  if (
    document.body.classList.contains("pyramid-mode") &&
    window.ReadingPyramid
  ) {
    extension = window.ReadingPyramid({
      $reader,
      $pages,
      $measure,
      words,
      measure,
      paint,
      bindRow,
      cancelDrags,
      restoreDots,
      stopAdvance,
      celebrate,
      updateExamples,
      getPages: () => pages,
      setPages: (p) => {
        pages = p;
      },
      getCurrent: () => current,
      setCurrent: (i) => {
        current = i;
      },
      clearNavigation: () => {
        navigating = null;
        clearTimeout(settle);
      },
      setSavedPage: (i) => {
        examples[exampleIndex].page = i;
      },
    });
  }
  const params = new URLSearchParams(location.search);
  if (params.has("csv") || params.has("text")) {
    const csv = params.has("csv");
    $("#mode").val(csv ? "csv" : "text");
    $("#text").val(params.get(csv ? "csv" : "text"));
    if (params.get("autostart") !== "0") {
      const form = document.getElementById("setup");

      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(
          new Event("submit", {
            bubbles: true,
            cancelable: true
          })
        );
      }
    }
  }
});
