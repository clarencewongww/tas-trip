/* TripRender — static itinerary UI (tabs, day cards, timeline, drive chips).
 *
 * Pure DOM building — no "now" engine logic (app.js owns live state).
 * Consumes window.TRIP (js/data.js) and window.TripMaps (js/maps.js).
 * All itinerary-derived strings are written with createTextNode/textContent
 * (titles contain "—", "→" and "&"); only SVG elements use createElementNS.
 *
 * Public API (window.TripRender):
 *   init()                          — builds tabs + day cards, activates day 0
 *   activateDay(i)                  — tab/panel switching + lazy map init
 *   getMapApi(i)                    — TripMaps api or null
 *   getDayRoot(i)                   — the day's <article> or null
 *   getActiveDay()                  — currently active day index (canonical owner)
 *   setActiveDay(i)                 — set the active day index (canonical owner)
 *   getEntryRow(dayIndex, entryIndex)   — tl-row element or null
 *   getWaypointIndex(dayIndex, entryIndex) — waypoint index (origin counts as 0)
 *   highlightNow(dayIndex, entryIndex, isGap) — .is-now / .is-next + scroll
 *   updateLegs(dayId, legResults)   — fill drive chip + drive rows for a day
 *   setNowDotOnTab(i)               — pulsing dot on tab i
 *   dayCount                        — number of itinerary days
 */
(function (global) {
  "use strict";
  if (typeof global === "undefined" || global === null) return;

  const win = global;
  const doc = win.document;
  const SVGNS = "http://www.w3.org/2000/svg";

  // Entry kind -> sprite symbol id (see <defs> in index.html).
  const ICON_BY_KIND = {
    transit: "car",
    flight: "plane",
    lodging: "bed",
    market: "shopping",
    food: "food",
    lookout: "map",
    historic: "map",
    lavender: "leaf",
    hike: "foot",
    beach: "map",
    park: "leaf",
    free: "clock",
    ferry: "ferry",
    shopping: "shopping"
  };
  const DEFAULT_ICON = "map";
  const ICON_BY_LEG_MODE = { driving: "car", flight: "plane", ferry: "ferry" };

  let inited = false;
  let styleInjected = false;
  let tabsEl = null;
  let sectionsEl = null;
  let days = [];
  let dayCount = 0;
  let activeDay = 0;
  let tabEls = [];
  let panelEls = [];
  const mapApis = new Map(); // dayIndex -> api | null
  const mapInitialized = new Set(); // dayIndex

  // ------------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------------
  function iconFor(kind) {
    const key = String(kind || "").toLowerCase();
    return ICON_BY_KIND[key] || DEFAULT_ICON;
  }

  function legModeIcon(mode) {
    const key = String(mode || "").toLowerCase();
    return ICON_BY_LEG_MODE[key] || "car";
  }

  function reducedMotion() {
    try {
      return (
        typeof win.matchMedia === "function" &&
        win.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (err) {
      return false;
    }
  }

  function warn(msg) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("TripRender: " + msg);
    }
  }

  function text(s) {
    return doc.createTextNode(String(s));
  }

  function svgIcon(iconId, className) {
    const svg = doc.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);
    const use = doc.createElementNS(SVGNS, "use");
    use.setAttribute("href", "#icon-" + iconId);
    svg.appendChild(use);
    return svg;
  }

  /** Injected once: now-dot pill on the day tabs (6px, accent, pulsing). */
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const style = doc.createElement("style");
    style.textContent = [
      ".tab__nowdot{display:none;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-left:6px;vertical-align:1px}",
      ".tab__nowdot--on{display:inline-block;animation:triprender-pulse 1.6s ease-out infinite}",
      "@keyframes triprender-pulse{0%{box-shadow:0 0 0 0 var(--accent)}100%{box-shadow:0 0 0 6px transparent}}",
      "@media (prefers-reduced-motion: reduce){.tab__nowdot--on{animation:none}}"
    ].join("\n");
    (doc.head || doc.documentElement).appendChild(style);
  }

  /** Find a data leg whose from/to titles match (falls back to "driving"). */
  function findLeg(day, fromTitle, toTitle) {
    const legs = day && Array.isArray(day.legs) ? day.legs : [];
    for (let k = 0; k < legs.length; k++) {
      const leg = legs[k];
      if (leg && leg.from === fromTitle && leg.to === toTitle) return leg;
    }
    return null;
  }

  function dayIndexById(dayId) {
    for (let i = 0; i < dayCount; i++) {
      if (days[i] && days[i].id === dayId) return i;
    }
    return -1;
  }

  function formatDuration(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return h > 0 ? h + " h " + m + " m" : m + " m";
  }

  /** True when two waypoints carry [lat, lng] coords within 1e-4 of each other. */
  function sameCoordinates(a, b) {
    const ca = a && a.coords;
    const cb = b && b.coords;
    if (!Array.isArray(ca) || !Array.isArray(cb) || ca.length < 2 || cb.length < 2) return false;
    return Math.abs(ca[0] - cb[0]) < 1e-4 && Math.abs(ca[1] - cb[1]) < 1e-4;
  }

  // ------------------------------------------------------------------
  // Building blocks
  // ------------------------------------------------------------------
  function buildTab(day, i) {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.id = "tab-" + day.id;
    btn.setAttribute("aria-controls", "panel-" + day.id);
    btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
    btn.setAttribute("tabindex", i === 0 ? "0" : "-1"); // roving tabindex
    btn.className = "tab" + (i === 0 ? " tab--active" : "");
    btn.textContent = day.label || day.id;
    const dot = doc.createElement("span");
    dot.className = "tab__nowdot";
    dot.setAttribute("aria-hidden", "true");
    btn.appendChild(dot);
    btn.addEventListener("click", function () {
      activateDay(i);
    });
    return btn;
  }

  /** Ordered timeline: [origin?] + entries, each followed by its drive row. */
  function buildTimeline(day, dayIndex) {
    const ol = doc.createElement("ol");
    ol.className = "day-timeline";

    // Every stop renders a row (origin included) — even entries that carry no
    // coordinates.
    const stops = [];
    if (day.origin) {
      stops.push({
        kind: "origin",
        idx: -1,
        title: day.origin.title || "Departure",
        time: day.origin.departTime || "",
        place: "",
        note: "",
        alt: false,
        kindName: "transit",
        coords: day.origin.coords
      });
    }
    (Array.isArray(day.entries) ? day.entries : []).forEach(function (e, j) {
      stops.push({
        kind: "entry",
        idx: j,
        title: e.title || "",
        time: e.start || "",
        place: e.place || "",
        note: e.note || "",
        alt: !!e.alt,
        kindName: e.kind || "",
        coords: e.coords
      });
    });

    // The waypoint sequence maps.js actually maps: origin + entries with a
    // valid coords array (same filter as maps.js). Timeline badges and map
    // markers are numbered from THIS list, so rows for coordless entries stay
    // visible but carry no waypoint number — keeping badge/marker numbering
    // in lockstep for every day.
    const waypoints = stops.filter(function (wp) {
      return Array.isArray(wp.coords) && wp.coords.length >= 2;
    });

    stops.forEach(function (wp, n) {
      const li = doc.createElement("li");
      li.className = "tl-row" + (wp.alt ? " entry--alt" : "");
      // Every waypoint row (origin included) carries its 0-based waypoint
      // index (origin counts as 0) so timeline badges and map markers stay in
      // lockstep with maps.js; non-waypoint rows get no data-wp.
      const waypointIndex = waypoints.indexOf(wp);
      const isWaypoint = waypointIndex !== -1;
      if (isWaypoint) {
        li.setAttribute("data-wp", String(waypointIndex));
      }
      if (wp.kind === "entry") {
        li.setAttribute("data-entry", dayIndex + ":" + wp.idx);
      }

      const time = doc.createElement("span");
      time.className = "tl-time";
      time.textContent = wp.time;
      li.appendChild(time);

      const icon = doc.createElement("span");
      icon.className = "tl-icon";
      icon.setAttribute("data-kind", wp.kindName || "default");
      icon.appendChild(svgIcon(wp.kind === "origin" ? "car" : iconFor(wp.kindName), "tl-ico"));
      li.appendChild(icon);

      // Number badge: waypoint index + 1 (maps.js numbers markers 1..N).
      // Non-waypoint rows (coordless entries) get no badge.
      if (isWaypoint) {
        const num = doc.createElement("span");
        num.className = "tl-num";
        num.setAttribute("aria-hidden", "true");
        num.textContent = String(waypointIndex + 1);
        li.appendChild(num);
      }

      const body = doc.createElement("span");
      body.className = "tl-body";
      const title = doc.createElement("span");
      title.className = "tl-title";
      title.textContent = wp.title;
      body.appendChild(title);
      if (wp.place) {
        const note = doc.createElement("span");
        note.className = "tl-note";
        note.textContent = wp.place;
        body.appendChild(note);
      }
      if (wp.note) {
        const note = doc.createElement("span");
        note.className = "tl-note";
        note.textContent = wp.note;
        body.appendChild(note);
      }
      li.appendChild(body);
      ol.appendChild(li);

      // Drive row between consecutive waypoints (positional: data-leg = gap n,
      // matching maps.js's legResults index). Pairs that share coordinates get
      // no row — maps.js reports mode "skip". Coordless stops are not waypoints
      // and therefore never start or end a drive row.
      if (
        isWaypoint &&
        waypointIndex < waypoints.length - 1 &&
        !sameCoordinates(wp, waypoints[waypointIndex + 1])
      ) {
        const next = waypoints[waypointIndex + 1];
        const leg = findLeg(day, wp.title, next.title);
        const mode = leg && leg.mode ? leg.mode : "driving";
        const dr = doc.createElement("li");
        dr.className = "drive-row";
        dr.setAttribute("data-leg", String(waypointIndex));
        const bodySpan = doc.createElement("span");
        bodySpan.className = "drive-row__body";
        bodySpan.appendChild(svgIcon(legModeIcon(mode), "drive-ico"));
        bodySpan.appendChild(text(wp.title + " to " + next.title + " · — · —"));
        dr.appendChild(bodySpan);
        ol.appendChild(dr);
      }
    });

    return ol;
  }

  function buildPanel(day, dayIndex) {
    const article = doc.createElement("article");
    article.id = "panel-" + day.id;
    article.className = "day-card";
    article.setAttribute("role", "tabpanel");
    article.setAttribute("aria-labelledby", "tab-" + day.id);
    article.hidden = dayIndex !== 0;

    // ---- header ----
    const header = doc.createElement("div");
    header.className = "day-card__header";

    const labelChip = doc.createElement("span");
    labelChip.className = "chip";
    labelChip.textContent = day.label || day.id;
    header.appendChild(labelChip);

    const title = doc.createElement("h2");
    title.className = "day-card__title";
    title.textContent = day.title || "";
    header.appendChild(title);

    const meta = doc.createElement("div");
    meta.className = "day-card__meta";

    const town = doc.createElement("span");
    town.textContent = day.town || "";
    meta.appendChild(town);

    const hotelChip = doc.createElement("span");
    hotelChip.className = "chip chip--hotel";
    hotelChip.appendChild(svgIcon("bed"));
    hotelChip.appendChild(text(day.hotel || ""));
    if (day.hotelNote) hotelChip.appendChild(text(" · " + day.hotelNote));
    meta.appendChild(hotelChip);

    const driveChip = doc.createElement("span");
    driveChip.className = "chip chip--drive";
    driveChip.id = "drive-" + day.id;
    driveChip.textContent = "Drive: calculating…";
    meta.appendChild(driveChip);

    header.appendChild(meta);
    article.appendChild(header);

    // ---- notes ----
    if (Array.isArray(day.notes)) {
      day.notes.forEach(function (n) {
        const p = doc.createElement("p");
        p.className = "day-note";
        p.textContent = n;
        article.appendChild(p);
      });
    }

    // ---- timeline ----
    article.appendChild(buildTimeline(day, dayIndex));

    // ---- map ----
    const mapEl = doc.createElement("div");
    mapEl.className = "day-map";
    mapEl.id = "map-" + day.id;
    mapEl.setAttribute("data-day", String(dayIndex));
    mapEl.setAttribute("aria-label", "Map of stops for " + (day.title || ""));
    const placeholder = doc.createElement("p");
    placeholder.className = "day-map__placeholder";
    placeholder.textContent = "Map loads when you open this day";
    mapEl.appendChild(placeholder);
    article.appendChild(mapEl);

    return article;
  }

  // ------------------------------------------------------------------
  // Map lifecycle (lazy init on first activation)
  // ------------------------------------------------------------------
  function initOrRefreshMap(i) {
    const day = days[i];
    if (!day) return;
    if (mapInitialized.has(i)) {
      const api = mapApis.get(i);
      if (api && typeof api.invalidateSize === "function") {
        try { api.invalidateSize(); } catch (err) { /* hidden container — ignore */ }
      }
      return;
    }
    mapInitialized.add(i);

    const mapEl = doc.getElementById("map-" + day.id);
    if (!mapEl) {
      mapApis.set(i, null);
      return;
    }
    // Hand the container to Leaflet cleanly (drop the placeholder).
    while (mapEl.firstChild) mapEl.removeChild(mapEl.firstChild);

    let api = null;
    if (win.TripMaps && typeof win.TripMaps.initDayMap === "function") {
      try {
        api = win.TripMaps.initDayMap("map-" + day.id, day, {
          onLegs: function (dayId, legResults) {
            updateLegs(dayId, legResults);
          }
        });
      } catch (err) {
        warn("day map init failed for " + day.id + " (" + err.message + ")");
        api = null;
      }
    } else {
      warn("TripMaps not loaded — day maps unavailable.");
    }
    mapApis.set(i, api || null);
  }

  // ------------------------------------------------------------------
  // Timeline <-> map interaction
  // ------------------------------------------------------------------
  const rowFlashTimers = new WeakMap();
  const ROW_FLASH_MS = 1000;

  /** One-shot visual flash on the clicked row (CSS styles .tl-row--flash). */
  function flashTimelineRow(row) {
    row.classList.add("tl-row--flash");
    const prev = rowFlashTimers.get(row);
    if (prev) clearTimeout(prev);
    rowFlashTimers.set(
      row,
      setTimeout(function () {
        row.classList.remove("tl-row--flash");
        rowFlashTimers.delete(row);
      }, ROW_FLASH_MS)
    );
  }

  /**
   * Delegated click: a stop row pans its day's map to that waypoint's marker
   * (maps.js api.panTo) and flashes the row. Drive rows and non-waypoint
   * clicks are ignored; a missing/unready map api is a silent no-op.
   */
  function onTimelineClick(event) {
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    if (target.closest("a")) return; // never intercept link clicks inside rows
    const row = target.closest(".tl-row");
    if (!row) return;
    const raw = row.getAttribute("data-wp");
    if (raw === null || raw === "") return; // no waypoint (drive rows)
    const panel = row.closest(".day-card");
    const dayIndex = panel ? panelEls.indexOf(panel) : -1;
    if (dayIndex < 0) return;
    const api = mapApis.get(dayIndex);
    if (api && typeof api.panTo === "function") {
      try {
        api.panTo(Number(raw));
      } catch (err) { /* map hidden / not ready — non-fatal */ }
    }
    flashTimelineRow(row);
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  function activateDay(i) {
    if (!sectionsEl) return;
    if (!Number.isInteger(i) || i < 0 || i >= dayCount) i = activeDay;
    activeDay = i;

    for (let k = 0; k < dayCount; k++) {
      const tab = tabEls[k];
      const panel = panelEls[k];
      const on = k === i;
      if (tab) {
        tab.classList.toggle("tab--active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.setAttribute("tabindex", on ? "0" : "-1"); // roving tabindex
      }
      if (panel) panel.hidden = !on;
    }

    initOrRefreshMap(i);
  }

  /** Canonical active-day owner: app.js/locate.js read this instead of keeping a copy. */
  function getActiveDay() {
    return activeDay;
  }

  /** Canonical active-day setter (ignores out-of-range input, like activateDay). */
  function setActiveDay(i) {
    if (Number.isInteger(i) && i >= 0 && i < dayCount) activeDay = i;
    return activeDay;
  }

  function getMapApi(i) {
    if (!Number.isInteger(i) || i < 0 || i >= dayCount) return null;
    const api = mapApis.get(i);
    return api || null;
  }

  function getDayRoot(i) {
    if (!Number.isInteger(i) || i < 0 || i >= dayCount) return null;
    return panelEls[i] || null;
  }

  function getEntryRow(dayIndex, entryIndex) {
    if (!Number.isInteger(dayIndex) || !Number.isInteger(entryIndex)) return null;
    const panel = panelEls[dayIndex];
    if (!panel) return null;
    return panel.querySelector('.tl-row[data-entry="' + dayIndex + ":" + entryIndex + '"]') || null;
  }

  function getWaypointIndex(dayIndex, entryIndex) {
    const day = days[dayIndex];
    if (!day) return -1;
    return (day.origin ? 1 : 0) + entryIndex;
  }

  function clearNowHighlight() {
    if (!sectionsEl) return;
    const rows = sectionsEl.querySelectorAll(".is-now, .is-next");
    for (let k = 0; k < rows.length; k++) {
      rows[k].classList.remove("is-now", "is-next");
    }
  }

  function highlightNow(dayIndex, entryIndex, isGap) {
    if (!sectionsEl) return;
    clearNowHighlight();
    const panel = panelEls[dayIndex];
    if (!panel) return;
    const row = getEntryRow(dayIndex, entryIndex);
    if (!row) return;
    row.classList.add(isGap ? "is-next" : "is-now");
    const behavior = reducedMotion() ? "auto" : "smooth";
    try {
      row.scrollIntoView({ block: "nearest", behavior: behavior });
    } catch (err) {
      row.scrollIntoView();
    }
  }

  function updateLegs(dayId, legResults) {
    const dayIndex = dayIndexById(dayId);
    if (dayIndex < 0) return;
    const legs = Array.isArray(legResults) ? legResults : [];

    // ---- drive chip: driving legs only (flight/ferry/skip excluded) ----
    let totalKm = 0;
    let totalMin = 0;
    let drivingCount = 0;
    let anyEstimate = false;
    legs.forEach(function (lr) {
      if (!lr || typeof lr !== "object") return;
      const mode = lr.mode || "driving";
      if (mode === "skip" || mode !== "driving") return;
      drivingCount += 1;
      if (typeof lr.km === "number" && isFinite(lr.km)) totalKm += lr.km;
      if (typeof lr.min === "number" && isFinite(lr.min)) totalMin += lr.min;
      if (lr.source === "estimate") anyEstimate = true;
    });

    const chip = doc.getElementById("drive-" + dayId);
    if (chip) {
      let label;
      if (drivingCount === 0) {
        label = "Drive: —";
      } else {
        label = "Drive: " + formatDuration(totalMin) + " · " + Math.round(totalKm) + " km";
        if (anyEstimate) label += " (est.)";
      }
      chip.textContent = label;
    }

    // ---- drive rows: leg n sits between waypoints n and n+1 ----
    legs.forEach(function (lr, n) {
      if (!lr || typeof lr !== "object") return;
      const mode = String(lr.mode || "driving").toLowerCase();
      if (mode === "skip") return; // same-coordinate leg — no row was built
      const panel = panelEls[dayIndex];
      const row = panel ? panel.querySelector('.drive-row[data-leg="' + n + '"]') : null;
      if (!row) return;

      const from = lr.from != null ? String(lr.from) : "";
      const to = lr.to != null ? String(lr.to) : "";
      let bodyText;
      if (mode === "driving") {
        const km = typeof lr.km === "number" && isFinite(lr.km) ? Math.round(lr.km) + " km" : "—";
        const min = typeof lr.min === "number" && isFinite(lr.min) ? lr.min : null;
        bodyText = from + " to " + to + " · " + km + " · " + (min === null ? "—" : formatDuration(min));
      } else {
        const min = typeof lr.min === "number" && isFinite(lr.min) ? Math.round(lr.min) : "—";
        bodyText = from + " to " + to + " · " + min + " min " + mode;
      }
      if (lr.source === "estimate") bodyText += " (est.)";

      const body = doc.createElement("span");
      body.className = "drive-row__body";
      body.appendChild(svgIcon(legModeIcon(mode), "drive-ico"));
      body.appendChild(text(bodyText));
      row.textContent = "";
      row.appendChild(body);
    });
  }

  function setNowDotOnTab(i) {
    for (let k = 0; k < tabEls.length; k++) {
      const tab = tabEls[k];
      if (!tab) continue;
      const dot = tab.querySelector(".tab__nowdot");
      if (dot) dot.classList.toggle("tab__nowdot--on", k === i);
    }
  }

  function init() {
    if (inited) return;
    tabsEl = doc.getElementById("day-tabs");
    sectionsEl = doc.getElementById("day-sections");
    if (!tabsEl || !sectionsEl) {
      warn("#day-tabs or #day-sections missing — renderer disabled.");
      return;
    }
    if (!win.TRIP || !Array.isArray(win.TRIP.days) || win.TRIP.days.length === 0) {
      warn("TRIP data missing or empty.");
      return;
    }
    inited = true;
    days = win.TRIP.days;
    dayCount = days.length;
    injectStyle();

    const tabFrag = doc.createDocumentFragment();
    const panelFrag = doc.createDocumentFragment();
    days.forEach(function (day, i) {
      const tab = buildTab(day, i);
      tabEls.push(tab);
      tabFrag.appendChild(tab);
      const panel = buildPanel(day, i);
      panelEls.push(panel);
      panelFrag.appendChild(panel);
    });
    tabsEl.appendChild(tabFrag);
    sectionsEl.appendChild(panelFrag);

    // Timeline rows link to the day map: one delegated listener for all days.
    sectionsEl.addEventListener("click", onTimelineClick);

    // WAI-ARIA tab pattern: arrow keys move + auto-activate (wrap around),
    // Home/End jump to first/last. activateDay does the roving tabindex.
    tabsEl.addEventListener("keydown", function (event) {
      const key = event.key;
      let target = -1;
      if (key === "ArrowRight") {
        target = (activeDay + 1) % dayCount;
      } else if (key === "ArrowLeft") {
        target = (activeDay - 1 + dayCount) % dayCount;
      } else if (key === "Home") {
        target = 0;
      } else if (key === "End") {
        target = dayCount - 1;
      }
      if (target < 0) return;
      event.preventDefault();
      activateDay(target);
      const tab = tabEls[target];
      if (tab && typeof tab.focus === "function") tab.focus();
    });

    activateDay(0);
  }

  win.TripRender = {
    init: init,
    activateDay: activateDay,
    getMapApi: getMapApi,
    getDayRoot: getDayRoot,
    getActiveDay: getActiveDay,
    setActiveDay: setActiveDay,
    getEntryRow: getEntryRow,
    getWaypointIndex: getWaypointIndex,
    highlightNow: highlightNow,
    updateLegs: updateLegs,
    setNowDotOnTab: setNowDotOnTab,
    get dayCount() { return dayCount; }
  };
})(typeof window !== "undefined" ? window : null);
