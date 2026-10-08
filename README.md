# Reading Tools — consolidated refactor

Refactor baseline: GitHub commit `68ffd71701a3ec5773326f961a8abd0bb17bf3a5`.
This is a replacement implementation of the same static tools, not another overlay.
No changes have been pushed to GitHub.

## Structure

```
index.html
slider.html
pyramid.html
wordparts.html
lettertiles.html
lesson.html
assets/
  css/styles.css
  js/app.js
  js/reading.js
  js/lesson.js
  js/lettertiles.js
  fonts/KGPrimaryPenmanshipAlt.ttf  # keep your existing font
```

- `app.js`: shared navigation, clipboard/share dialog, URL utilities, CSV parser,
  lesson serialization/storage, timer model, completion/return, confetti and ding.
- `reading.js`: direct slider/pyramid/word-part controller and one drag/track engine.
- `lesson.js`: editable sections/activities, checkbox state, local links, timer totals,
  JSON import/export and cross-device snapshot sharing.
- `lettertiles.js`: independent spelling board using shared services.
- `styles.css`: one canonical stylesheet with clearly separated page sections.

Each page loads app.js plus only its relevant controller. The homepage loads app.js only.
All pages use one local stylesheet. Bootstrap CSS and jQuery remain CDN dependencies;
Quicksand loads from Google Fonts. Your handwriting font remains local.
There are no ReadingPyramid aliases, monkey-patching layers, injected stylesheets,
whole-document MutationObservers, or scripts relocating existing controls.
Only a targeted ResizeObserver measures the single navigation bar.

## Safe installation

1. Export important lesson JSON backups and keep a copy of the current repository.
2. Work on a separate local branch, e.g. `git switch -c cleanup/consolidated-app`.
3. Replace the six HTML files and assets/css/styles.css, assets/js/app.js,
   assets/js/lesson.js, assets/js/lettertiles.js. Add assets/js/reading.js.
4. KEEP assets/fonts/KGPrimaryPenmanshipAlt.ttf. It is intentionally not in this ZIP.
5. Remove obsolete files (do not keep loading the old supplements):

```bash
git rm --ignore-unmatch assets/js/activity-timers.js assets/js/home.js assets/js/interface-core.js assets/js/interface.js assets/js/lesson-common.js assets/js/lesson-local-links.js assets/js/lesson-total.js assets/js/pyramid.js assets/js/reading-features.js assets/js/share-link.js assets/js/slider-track-colors.js assets/js/tool-navigation.js assets/js/wordparts.js
git rm --ignore-unmatch assets/css/home-wordparts.css assets/css/home.css assets/css/interface.css assets/css/lesson-total.css assets/css/lesson.css assets/css/lettertiles.css assets/css/pyramid.css assets/css/share-link.css assets/css/slider-track-colors.css assets/css/wordparts.css
git rm -r --ignore-unmatch .reading-update-backups
git rm --ignore-unmatch install_updates.py README.txt
```

If you prefer folder replacement, replace assets/js and assets/css completely with
this package's versions while preserving assets/fonts and your .git folder.
Remove the committed .reading-update-backups folder and any old installer file.
Add `.reading-update-backups/` to your existing .gitignore if you still use local backups.
The installer from the previous update is NOT needed for this version.

6. Test the branch before deploying; then commit and publish using your usual workflow.
   No external GitHub write has been performed by this assistant.

## Features retained

### Reading Slider
- Plain text or quoted CSV; each nonempty cell is an example; optional single-cell header.
- Sentence-based full-screen rows, smooth navigation and automatic row advance.
- Left-side example dots and example navigation only for CSV.
- Continuous dragging across separate word tracks; 68px dot with enlarged touch target.
- No reading-text selection; setup fields remain editable/selectable.

### Sentence Pyramids
- One textbox line per stacked line; automatic fit with scrolling for oversized pyramids.
- Only the first unfinished line shows the slider; completed lines grey out.
- Explicit pending/current/completed classes; final completed row keeps its slider.

### Word Parts
- Plain part text (no required hyphen or position selector); first matching occurrence anywhere.
- Full-screen introduction, purple part text without background, animated letter replacement.
- Automatic advance after each completed drag ends, with a short pause.

### Shared reading emphasis
- Combinations and whole sight words defined explicitly in setup or groups/sight URL parameters.
- Groups highlight together and use a shorter drag with a jump at the group midpoint.
- Emphasis appears on the purple track, not as a text underline.
- Word Parts also groups its selected part automatically.

### Letter Tiles
- Hidden teacher spelling list; reusable bank contains only relevant letters.
- Pointer/touch dragging, tap-to-add, reorder/delete, keyboard controls.
- Automatic positive feedback; only correctly spelled words appear in the completed list.

### Lesson plans and timers
- Editable lesson title, sections, activity labels and links; add/remove/reorder.
- Relative links for same-site tools, including old full hosted-site links.
- Checkbox and timer state saved in the browser using the EXISTING storage keys.
- Read-only individual timer results on the right, total time at top.
- Start/pause/reset controls only in an activity opened from the checklist.
- Complete/return pauses and records time and marks the checkbox.
- Copy/share JSON-based lesson links and import/export backups.
- Shared/exported timers are paused snapshots. Devices still do not live-sync.

## Backward compatibility

Page URLs are unchanged: slider.html, pyramid.html, wordparts.html, lettertiles.html.
Existing `text`, `csv`, `part`, `groups`, `sight`, `words`, `autostart=0` links are accepted
where applicable. Homepage links carrying text/csv still redirect to slider.html.
Existing version-1 `#plan=` and `#lesson=` fragments use the same encoding and schema.
Existing `reading:lesson:<id>` and `reading:last-lesson` storage keys remain in use.
Old plans without timer fields default to zero; recorded timers are preserved.
Lesson content is safely inserted as text; activity URL protocols are validated.
No existing saved browser records are deleted by the refactor.

## Colors and layout

Current repository colors were preserved and centralized:
- unread #777
- pyramid pending #eee
- pyramid completed #777
- read #000
- emphasized track #d7c6ef -> #8652c9

Change those CSS custom properties in the :root block if you want different defaults.
JavaScript updates only geometry/progress custom properties, not colors or stylesheet rules.
One navigation bar has its own fully styled icon buttons, so relocating a button can no
longer cause arrow styles to disappear. Every icon has a label and tooltip.

## Verification and limitations

Passed: JavaScript syntax checks, all six HTML asset-reference/unique-ID checks,
Unicode lesson serialization, old-schema normalization, timer start/pause/resume/reset,
paused snapshots with live local timer retention, relative links/checklist context,
quoted multiline CSV, beginning/middle/end part matching, grouped/sight-word matching,
monotone progress/group jumps, and unsafe URL rejection.

Browser/iPad/touch interaction tests have NOT been performed. This is a broad refactor,
so use a staging branch first. Smoke test URL auto-start, all four activities, emphasis,
CSV page navigation, checklist return, timers, sharing and backup import/export.
Font file not bundled. CDN assets require internet access. Hiding spelling answers is
not a security boundary: they remain in the URL and client-side data.
