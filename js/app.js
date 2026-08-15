/* TripApp — startup, live "now" engine, and time-scrubber preview.
 *
 * Loaded LAST (see index.html). Owns no itinerary DOM (TripRender does) and no
 * geolocation (TripLocate/TripGeo own that — TripLocate is optional here).
 *
 * Consumes:
 *   window.TRIP          (js/data.js)
 *   window.TripTimeline  (js/timeline.js)  — state engine (pure)
 *   window.TripTheme     (js/theme.js)     — light/dark/auto
 *   window.TripRender    (js/render.js)    — itinerary DOM + map helpers
 *   window.TripLocate    (js/locate.js)    — OPTIONAL, guarded
 *
 * Public API (window.TripApp):
 *   init()  — wire everything, start the 30 s engine, run the first tick
 *   tick()  — recompute live state and update the UI (exposed for testing)
 */
(function (global) {
  "use strict";
  if (typeof global === "undefined" || global === null) return;
  if (!global.document) return;

  const doc = global.document;

  // ------------------------------------------------------------------
  // Internal state (closure-scoped, so init()/tick() are re-entrant-safe).
  // ------------------------------------------------------------------
  let inited = false;
  let previewTime = null; // epoch ms while scrubbing, else null (live mode)
  let liveDay = null;     // last auto-followed day index (null = never followed)
  let activeDay = 0;      // currently active day panel (TripRender does not expose one)

  // Element references.
  let themeToggle = null;
  let heroNow = null;
  let nowBar = null;
  let nowReadout = null;
  let nowSub = null;
  let tripFill = null;
  let tripComet = null;
  let tripTrack = null;
  let scrubber = null;
  let liveBtn = null;
  let previewBadge = null;
  let dayTabs = null;

  // Hobart-time formatters (all display strings, no data interpolation).
  const DTF_DAYS = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Hobart",
    weekday: "short",
    day: "numeric",
    month: "short"
  });

  const DTF_PREVIEW = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Hobart",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  // ------------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------------
  function warn(msg) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("TripApp: " + msg);
    }
  }

  function fmt(iso) {
    try {
      return DTF_DAYS.format(new Date(iso));
    } catch (err) {
      return String(iso);
    }
  }

  function fmtPreview(epochMs) {
    try {
      return DTF_PREVIEW.format(new Date(epochMs));
    } catch (err) {
      return String(epochMs);
    }
  }

  /** Guarded call into TripRender (failures must never break the app). */
  function callRender(method, args) {
    if (!global.TripRender || typeof global.TripRender[method] !== "function") return;
    try {
      global.TripRender[method].apply(global.TripRender, args);
    } catch (err) {
      warn("TripRender." + method + " failed: " + (err && err.message ? err.message : err));
    }
  }

  // ------------------------------------------------------------------
  // Readouts (shared by live tick and scrubber preview)
  // ------------------------------------------------------------------
  function setReadouts(st) {
    if (st.phase === "pre") {
      const c = st.countdown || { d: 0, h: 0, m: 0 };
      heroNow.textContent = "Trip starts in " + c.d + "d " + c.h + "h " + c.m + "m";
      nowReadout.textContent = "Tasmania awaits";
      nowSub.textContent = fmt(global.TRIP.startISO) + " → " + fmt(global.TRIP.endISO);
      return;
    }

    if (st.phase === "post") {
      heroNow.textContent = "Trip complete";
      nowReadout.textContent = "Home sweet home";
      nowSub.textContent = "";
      return;
    }

    // ---- live ----
    const day = global.TRIP.days[st.dayIndex];
    if (!day) return;
    heroNow.textContent = day.label || "";

    if (!st.inGap && st.entryIndex >= 0) {
      const e = day.entries[st.entryIndex];
      if (!e) return;
      const nextTitle = st.next && st.next.title ? st.next.title : "—";
      nowReadout.textContent = e.title || "";
      nowSub.textContent =
        "until " + e.end +
        " · next: " + nextTitle +
        " · " + Math.round((st.entryProgress || 0) * 100) + "%";
    } else if (st.gap) {
      const leg = st.gap.leg;
      nowReadout.textContent = "On the road → " + st.gap.toTitle;
      nowSub.textContent =
        leg && typeof leg.fallbackKm === "number" && typeof leg.fallbackMin === "number"
          ? leg.fallbackKm + " km · " + leg.fallbackMin + " min · next: " + st.gap.toTitle
          : "Next: " + st.gap.toTitle;
    } else {
      // Boundary edge: nothing scheduled inside the live window (e.g. the
      // scrubber parked exactly on the trip-end instant) — avoid stale text.
      nowReadout.textContent = "Trip wrapping up";
      nowSub.textContent = "";
    }
  }

  function setProgress(st) {
    const pct = (st.tripProgress * 100) + "%";
    tripFill.style.width = pct;
    tripComet.style.left = pct;
    tripTrack.setAttribute("aria-valuenow", String(Math.round(st.tripProgress * 100)));
  }

  /** Row + map highlights (map only when a matching marker exists). */
  function applyHighlights(st) {
    const dayIndex = Number.isInteger(st.dayIndex) ? st.dayIndex : -1;
    const entryIndex = Number.isInteger(st.entryIndex) ? st.entryIndex : -1;
    callRender("highlightNow", [dayIndex, entryIndex, !!st.inGap]);
    if (!global.TripRender || dayIndex < 0 || entryIndex < 0) return;
    try {
      const api = global.TripRender.getMapApi(dayIndex);
      if (api && typeof api.highlight === "function") {
        api.highlight(global.TripRender.getWaypointIndex(dayIndex, entryIndex));
      }
    } catch (err) { /* map hidden / not ready — non-fatal */ }
  }

  // ------------------------------------------------------------------
  // Live engine
  // ------------------------------------------------------------------
  function tick() {
    if (previewTime !== null) return; // previewing — live engine paused
    if (!global.TripTimeline) return;

    let st;
    try {
      st = global.TripTimeline.state(Date.now());
    } catch (err) {
      warn("state() failed: " + (err && err.message ? err.message : err));
      return;
    }
    if (!st) return;

    const isLive = st.phase === "live";
    nowBar.classList.toggle("is-live", isLive);
    nowBar.classList.remove("is-previewing");
    liveBtn.setAttribute("aria-pressed", "true"); // live auto-follow mode

    setReadouts(st);
    setProgress(st);
    applyHighlights(st);

    // Auto-follow: switch tabs to the live day (first live tick included).
    if (isLive && Number.isInteger(st.dayIndex)) {
      if (liveDay === null || liveDay !== st.dayIndex) {
        liveDay = st.dayIndex;
        activeDay = st.dayIndex;
        callRender("activateDay", [st.dayIndex]);
        callRender("setNowDotOnTab", [st.dayIndex]);
        applyHighlights(st); // the day's map initializes on activateDay — re-apply
      }
    }
  }

  // ------------------------------------------------------------------
  // Scrubber preview
  // ------------------------------------------------------------------
  function renderPreview() {
    if (previewTime === null) return;
    let st;
    try {
      st = global.TripTimeline.state(previewTime);
    } catch (err) {
      warn("preview state() failed: " + (err && err.message ? err.message : err));
      return;
    }
    if (!st) return;

    // The scrubber reads as a time picker: expose the formatted Hobart time.
    scrubber.setAttribute("aria-valuetext", fmtPreview(previewTime));

    setReadouts(st);
    setProgress(st);

    // Now-dot follows the previewed day's tab (whichever day is on screen).
    if (Number.isInteger(st.dayIndex)) {
      callRender("setNowDotOnTab", [st.dayIndex]);
    }

    // No auto-follow: only highlight when the previewed day is on screen.
    if (Number.isInteger(st.dayIndex) && st.dayIndex === activeDay) {
      applyHighlights(st);
    }
  }

  function onScrubberInput() {
    const v = Number(scrubber.value);
    if (!isFinite(v)) return;
    previewTime = v;
    nowBar.classList.remove("is-live");
    nowBar.classList.add("is-previewing");
    liveBtn.setAttribute("aria-pressed", "false"); // previewing, not live
    previewBadge.hidden = false;
    previewBadge.textContent = "Previewing: " + fmtPreview(v);
    renderPreview();
  }

  function onLiveClick() {
    previewTime = null;
    nowBar.classList.add("is-live");
    nowBar.classList.remove("is-previewing");
    liveBtn.setAttribute("aria-pressed", "true"); // back to live auto-follow
    previewBadge.hidden = true;
    liveDay = null; // forget the followed day so the next tick re-follows live
    if (scrubber && scrubber.max !== undefined && scrubber.max !== "") {
      scrubber.value = String(scrubber.max);
    }
    tick();
  }

  // ------------------------------------------------------------------
  // Theme toggle
  // ------------------------------------------------------------------
  function updateThemeLabel() {
    const mode = global.TripTheme && global.TripTheme.mode ? global.TripTheme.mode : "auto";
    themeToggle.setAttribute("aria-label", "Theme: current " + mode);
  }

  function onThemeToggle() {
    if (global.TripTheme && typeof global.TripTheme.cycle === "function") {
      try {
        global.TripTheme.cycle();
      } catch (err) { /* theme must not break the app */ }
    }
    updateThemeLabel();
  }

  // ------------------------------------------------------------------
  // Other listeners
  // ------------------------------------------------------------------
  function onVisibility() {
    if (!doc.hidden) tick();
  }

  /** Track manual tab clicks so preview highlights follow the open day. */
  function onTabClick(ev) {
    const target = ev.target;
    if (!target || typeof target.closest !== "function") return;
    const tab = target.closest(".tab");
    if (!tab) return;
    const idx = Array.prototype.indexOf.call(dayTabs.children, tab);
    if (idx >= 0) activeDay = idx;
  }

  // ------------------------------------------------------------------
  // Startup
  // ------------------------------------------------------------------
  function requireElements() {
    const ids = [
      "theme-toggle", "hero-now", "now-bar", "now-readout", "now-sub",
      "trip-progress-fill", "trip-comet", "trip-progress-track",
      "preview-scrubber", "live-btn", "preview-badge"
    ];
    const els = {};
    const missing = [];
    for (let i = 0; i < ids.length; i++) {
      const el = doc.getElementById(ids[i]);
      if (!el) missing.push("#" + ids[i]);
      els[ids[i]] = el;
    }
    if (missing.length > 0) {
      warn("missing required elements (" + missing.join(", ") + ") — TripApp disabled.");
      return null;
    }
    return els;
  }

  function init() {
    if (inited) return;

    const els = requireElements();
    if (!els) return;
    themeToggle = els["theme-toggle"];
    heroNow = els["hero-now"];
    nowBar = els["now-bar"];
    nowReadout = els["now-readout"];
    nowSub = els["now-sub"];
    tripFill = els["trip-progress-fill"];
    tripComet = els["trip-comet"];
    tripTrack = els["trip-progress-track"];
    scrubber = els["preview-scrubber"];
    liveBtn = els["live-btn"];
    previewBadge = els["preview-badge"];
    dayTabs = doc.getElementById("day-tabs");

    if (!global.TRIP || !Array.isArray(global.TRIP.days) || global.TRIP.days.length === 0) {
      warn("TRIP data missing or empty — TripApp disabled.");
      return;
    }
    if (!global.TripTimeline) {
      warn("TripTimeline not loaded — TripApp disabled.");
      return;
    }

    // Sister modules — every init is guarded; none may break the app.
    if (global.TripTheme && typeof global.TripTheme.init === "function") {
      try { global.TripTheme.init(); } catch (err) { warn("TripTheme.init failed."); }
    }
    if (global.TripRender && typeof global.TripRender.init === "function") {
      try { global.TripRender.init(); } catch (err) { warn("TripRender.init failed."); }
    }
    if (global.TripLocate && typeof global.TripLocate.init === "function") {
      try { global.TripLocate.init(); } catch (err) { warn("TripLocate.init failed."); }
    }

    updateThemeLabel();
    themeToggle.addEventListener("click", onThemeToggle);

    // Scrubber: epoch-ms range, 5-minute steps, defaults to the trip end.
    // TripTimeline.tripDurationMs() exposes only the total duration, so the
    // min/max endpoints are still parsed from the TRIP ISO strings; the
    // duration is used to reject a zero-length trip (min === max scrubber).
    const startMs = Date.parse(global.TRIP.startISO);
    const endMs = Date.parse(global.TRIP.endISO);
    let durationMs = null;
    if (global.TripTimeline && typeof global.TripTimeline.tripDurationMs === "function") {
      try { durationMs = global.TripTimeline.tripDurationMs(); } catch (err) { /* non-fatal */ }
    }
    if (!isFinite(startMs) || !isFinite(endMs)) {
      warn("TRIP start/end ISO unparseable — scrubber disabled.");
    } else if (durationMs !== null && (!isFinite(durationMs) || durationMs <= 0)) {
      warn("TRIP duration invalid (zero-length trip) — scrubber disabled.");
    } else {
      scrubber.min = String(startMs);
      scrubber.max = String(endMs);
      scrubber.step = "300000";
      scrubber.value = String(endMs);
    }
    liveBtn.setAttribute("aria-pressed", "true"); // default state: live
    scrubber.addEventListener("input", onScrubberInput);
    liveBtn.addEventListener("click", onLiveClick);

    if (dayTabs) dayTabs.addEventListener("click", onTabClick);

    try {
      global.setInterval(function () { tick(); }, 30000);
    } catch (err) { warn("setInterval failed — live engine will not auto-run."); }

    if (typeof doc.addEventListener === "function") {
      doc.addEventListener("visibilitychange", onVisibility);
    }

    inited = true;
    tick();
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  global.TripApp = {
    init: init,
    tick: tick
  };

  // Auto-start — app.js loads last and owns startup.
  try {
    init();
  } catch (err) {
    warn("init failed: " + (err && err.message ? err.message : err));
  }
})(typeof window !== "undefined" ? window : null);
