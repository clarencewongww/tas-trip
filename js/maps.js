/* global L */
"use strict";

/**
 * TripMaps — Leaflet map module for the Tasmania road-trip itinerary.
 *
 * Loaded AFTER Leaflet 1.9.4 and window.TRIP in index.html (plain script tags).
 * This module only touches the DOM inside the container it is given and does not
 * depend on app.js/timeline.js/geo.js/theme.js (it MAY read window.TripTheme
 * .effective() when TripTheme exists — guarded).
 *
 * Public API (window.TripMaps):
 *   initDayMap(containerId, day, opts?) -> dayMapApi | null
 *   osrmRoute(fromLatLng, toLatLng) -> Promise<{ km, min, polyline, source: "osrm" }>
 *
 * dayMapApi:
 *   legResults: Array<{ from, to, km, min, mode, source }>
 *   getLegResults(), highlight(i), panTo(i), fitLeg(i),
 *   addUserMarker(latlng, accuracy?), fitUser(), invalidateSize(), destroy(),
 *   setTheme(mode), setBase(mode)
 */
(function (global) {
  if (typeof global === "undefined" || typeof global.window === "undefined") return;

  const doc = global.document;
  const win = global.window;

  // ------------------------------------------------------------------
  // Constants
  // ------------------------------------------------------------------
  const BRAND_COLOR = "#2f6b4f"; // brand green ≈ oklch(0.45 0.09 160)
  const FALLBACK_COLOR = "#e07a3f"; // accent orange (estimated driving routes)
  const WATER_COLOR = "#5b7fa6"; // flight / ferry routes
  const ACCENT_COLOR = "#e07a3f"; // user location dot

  const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
  const OSRM_RATE_MS = 800; // demo server rate limit — min spacing between request starts
  const OSRM_CONCURRENCY = 2; // max OSRM requests in flight at once
  const OSRM_TIMEOUT_MS = 20000;

  const CACHE_PREFIX = "tasroad-osrm-v1:";
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  const MAX_POLYLINE_POINTS = 400;

  const TILE_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const L = typeof global.L !== "undefined" ? global.L : null;
  const leafletMissing = !L;

  // ------------------------------------------------------------------
  // Shared state
  // ------------------------------------------------------------------
  const activeMaps = new Set(); // entries: { applyTheme, setBase, invalidateSize } for live maps

  // Basemap preference: "map" (theme-aware CARTO/OSM), "sat" (Esri World
  // Imagery) or "osm" (OpenStreetMap standard). Shared across every live day
  // map, persisted under "tas-trip-basemap" so the choice survives day
  // switches and reloads. Storage failures (e.g. file:// with storage
  // disabled) fall back to "map".
  const BASE_STORAGE_KEY = "tas-trip-basemap";
  const BASE_MODES = ["map", "sat", "osm"];
  let currentBase = "map";

  function readBasePreference() {
    try {
      const v = win.localStorage.getItem(BASE_STORAGE_KEY);
      if (v === "map" || v === "sat" || v === "osm") return v;
    } catch (err) { /* storage unavailable — fall back to "map" */ }
    return "map";
  }

  function persistBase(mode) {
    try {
      win.localStorage.setItem(BASE_STORAGE_KEY, mode);
    } catch (err) { /* storage unavailable — preference is best-effort */ }
  }

  currentBase = readBasePreference();
  let osrmNextStart = Promise.resolve(); // resolves when the next OSRM request may start
  let osrmActive = 0; // OSRM requests currently in flight
  let osrmSlotWaiters = []; // resolvers queued for a free OSRM concurrency slot
  let themeListenerAttached = false;
  let resizeListenerAttached = false;

  // ------------------------------------------------------------------
  // Theme helpers
  // ------------------------------------------------------------------
  function effectiveTheme() {
    try {
      if (win.TripTheme && typeof win.TripTheme.effective === "function") {
        const t = win.TripTheme.effective();
        if (t === "dark" || t === "light") return t;
      }
    } catch (err) { /* guarded read only */ }
    try {
      if (
        typeof win.matchMedia === "function" &&
        win.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "dark";
      }
    } catch (err) { /* ignore */ }
    return "light";
  }

  function createTileLayer(theme) {
    const dark = theme === "dark";
    return L.tileLayer(
      dark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: TILE_ATTRIBUTION, maxZoom: 19 }
    );
  }

  const ESRI_SAT_ATTRIBUTION =
    "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics";
  const OSM_STANDARD_ATTRIBUTION = "© OpenStreetMap contributors";

  /** Basemap factory. "map" keeps the existing theme-aware layer (CARTO dark /
   *  OSM light via createTileLayer); "sat" is Esri World Imagery; "osm" is the
   *  standard OpenStreetMap layer. */
  function createBaseLayer(base, theme) {
    if (base === "sat") {
      return L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: ESRI_SAT_ATTRIBUTION }
      );
    }
    if (base === "osm") {
      return L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: OSM_STANDARD_ATTRIBUTION }
      );
    }
    return createTileLayer(theme);
  }

  /** Which scheme route halos should follow. Satellite imagery is always
   *  light, so a dark-mode white halo would read as an inverted outline
   *  there — treat "sat" as "light" for route styling only. */
  function routeTheme() {
    return currentBase === "sat" ? "light" : effectiveTheme();
  }

  /** Style object for a route line kind. Shared by the initial draw (drawLeg)
   *  and redrawRoutes so a basemap/theme switch re-styles already-drawn routes
   *  exactly as if they had been drawn after the switch. The sat
   *  white-main/dark-casing treatment is applied by addRouteLine itself via its
   *  currentBase branch — this helper only owns the non-sat style params. */
  function styleFor(kind) {
    if (kind === "route") {
      return {
        color: BRAND_COLOR,
        weight: 4,
        opacity: effectiveTheme() === "dark" ? 0.9 : 0.8,
        haloWeight: 7
      };
    }
    if (kind === "water") {
      return {
        dashArray: "6 10",
        color: WATER_COLOR,
        weight: 3,
        opacity: 0.8,
        haloWeight: 5
      };
    }
    if (kind === "pending") {
      return {
        dashArray: "4 8",
        color: FALLBACK_COLOR,
        weight: 3,
        opacity: 0.8,
        haloWeight: 5,
        className: "route--pending"
      };
    }
    // "estimate" — dashed accent-orange estimate (same dash params as pending,
    // but without the route--pending CSS class that drives the animation).
    return {
      dashArray: "4 8",
      color: FALLBACK_COLOR,
      weight: 3,
      opacity: 0.8,
      haloWeight: 5
    };
  }

  // ------------------------------------------------------------------
  // Coordinate helpers
  // ------------------------------------------------------------------
  function normalizePair(p) {
    if (Array.isArray(p)) {
      const lat = Number(p[0]);
      const lng = Number(p[1]);
      if (isFinite(lat) && isFinite(lng)) return [lat, lng];
      return null;
    }
    if (p && typeof p.lat === "number" && typeof p.lng === "number") {
      return [p.lat, p.lng];
    }
    return null;
  }

  /**
   * True when two waypoint coordinates are the same point (within 1e-4 deg,
   * i.e. ~11 m) — used to skip routing for zero-distance legs.
   */
  function sameCoords(a, b) {
    const pa = normalizePair(a);
    const pb = normalizePair(b);
    if (!pa || !pb) return false;
    return Math.abs(pa[0] - pb[0]) < 1e-4 && Math.abs(pa[1] - pb[1]) < 1e-4;
  }

  /**
   * Lookup key for exact-coordinate stacking (rounded to 1e-6 deg, ~0.1 m)
   * so near-identical floats from the same source point collide.
   */
  function coordKey(lat, lng) {
    return (
      Math.round(Number(lat) * 1e6) / 1e6 + "," +
      Math.round(Number(lng) * 1e6) / 1e6
    );
  }

  function prefersReducedMotion() {
    try {
      return (
        typeof win.matchMedia === "function" &&
        win.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (err) {
      return false;
    }
  }

  // ------------------------------------------------------------------
  // OSRM localStorage cache (best-effort)
  // ------------------------------------------------------------------
  function round3(v) {
    return Math.round(v * 1000) / 1000;
  }

  function cacheKey(lat1, lng1, lat2, lng2) {
    return (
      CACHE_PREFIX +
      round3(lat1) + "," + round3(lng1) + ":" +
      round3(lat2) + "," + round3(lng2)
    );
  }

  function cacheGet(key) {
    try {
      const raw = win.localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (
        !data ||
        typeof data.t !== "number" ||
        typeof data.km !== "number" ||
        typeof data.min !== "number" ||
        !Array.isArray(data.polyline)
      ) {
        return null;
      }
      if (Date.now() - data.t > CACHE_TTL_MS) {
        win.localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch (err) {
      return null;
    }
  }

  function cacheSet(key, value) {
    try {
      win.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) { /* storage unavailable — cache is best-effort */ }
  }

  // ------------------------------------------------------------------
  // OSRM routing (shared helper: throttled starts + concurrency limit + cache)
  // ------------------------------------------------------------------
  function downsample(points, maxPoints) {
    if (!Array.isArray(points) || points.length <= maxPoints) return points;
    const out = [];
    const step = (points.length - 1) / (maxPoints - 1);
    for (let i = 0; i < maxPoints; i++) {
      out.push(points[Math.round(i * step)]);
    }
    out[out.length - 1] = points[points.length - 1];
    return out;
  }

  /** Release an OSRM concurrency slot and hand it to the next queued request. */
  function releaseOsrmSlot() {
    osrmActive -= 1;
    if (osrmSlotWaiters.length > 0) {
      osrmSlotWaiters.shift()(releaseOsrmSlot);
      osrmActive += 1;
    }
  }

  function acquireOsrmSlot() {
    if (osrmActive < OSRM_CONCURRENCY) {
      osrmActive += 1;
      return Promise.resolve(releaseOsrmSlot);
    }
    return new Promise(function (resolve) {
      osrmSlotWaiters.push(resolve);
    });
  }

  /** Start `fn` at least OSRM_RATE_MS after the previous start, with at most
   *  OSRM_CONCURRENCY requests in flight at once. */
  function throttled(fn) {
    const start = osrmNextStart;
    osrmNextStart = start.then(function () {
      return new Promise(function (resolve) { setTimeout(resolve, OSRM_RATE_MS); });
    });
    const run = start.then(function () {
      return acquireOsrmSlot().then(function (release) {
        return fn().then(
          function (result) { release(); return result; },
          function (err) { release(); throw err; }
        );
      });
    });
    return run;
  }

  async function fetchOsrm(lat1, lng1, lat2, lng2) {
    const url =
      OSRM_BASE + "/" + lng1 + "," + lat1 + ";" + lng2 + "," + lat2 +
      "?overview=full&geometries=geojson";
    const controller = typeof win.AbortController !== "undefined" ? new win.AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, OSRM_TIMEOUT_MS) : null;

    let res;
    try {
      res = await win.fetch(url, {
        cache: "no-store",
        signal: controller ? controller.signal : undefined
      });
    } catch (err) {
      throw new Error("TripMaps: OSRM request failed (" + (err && err.message ? err.message : "network") + ")");
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error("TripMaps: OSRM HTTP " + res.status);
    }

    let json;
    try {
      json = await res.json();
    } catch (err) {
      throw new Error("TripMaps: OSRM invalid JSON");
    }

    const route = json && json.routes && json.routes[0];
    if (!route || typeof route.distance !== "number" || typeof route.duration !== "number") {
      throw new Error("TripMaps: OSRM returned no route");
    }
    const coords = route.geometry && route.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      throw new Error("TripMaps: OSRM returned no geometry");
    }

    return {
      km: route.distance / 1000,
      min: Math.max(1, Math.round(route.duration / 60)),
      polyline: downsample(
        coords.map(function (c) { return [c[1], c[0]]; }), // [lng, lat] -> [lat, lng]
        MAX_POLYLINE_POINTS
      )
    };
  }

  /**
   * Route between two points. `from`/`to` may be [lat, lng] arrays or Leaflet LatLng.
   * Resolves { km, min, polyline: [[lat,lng],...], source: "osrm" }.
   * Rejects on ANY failure — callers draw an estimated fallback.
   */
  function osrmRoute(fromLatLng, toLatLng) {
    const a = normalizePair(fromLatLng);
    const b = normalizePair(toLatLng);
    if (!a || !b) {
      return Promise.reject(new Error("TripMaps: osrmRoute received invalid coordinates"));
    }

    const key = cacheKey(a[0], a[1], b[0], b[1]);
    const cached = cacheGet(key);
    if (cached) {
      return Promise.resolve({
        km: cached.km,
        min: cached.min,
        polyline: cached.polyline,
        source: "osrm"
      });
    }

    return throttled(function () {
      return fetchOsrm(a[0], a[1], b[0], b[1]);
    }).then(function (data) {
      cacheSet(key, { km: data.km, min: data.min, polyline: data.polyline, t: Date.now() });
      return { km: data.km, min: data.min, polyline: data.polyline, source: "osrm" };
    });
  }

  // ------------------------------------------------------------------
  // No-op stub used when Leaflet is not loaded (null-safe per contract)
  // ------------------------------------------------------------------
  const noopApi = {
    legResults: [],
    getLegResults: function () { return []; },
    highlight: function () {},
    panTo: function () {},
    fitLeg: function () {},
    addUserMarker: function () {},
    fitUser: function () {},
    invalidateSize: function () {},
    destroy: function () {},
    setTheme: function () {},
    setBase: function () {}
  };

  // ------------------------------------------------------------------
  // Theme-change listener — only acts while we own at least one active map
  // ------------------------------------------------------------------
  function onThemeChange() {
    if (activeMaps.size === 0) return;
    const theme = effectiveTheme();
    activeMaps.forEach(function (entry) {
      if (entry && typeof entry.applyTheme === "function") entry.applyTheme(theme);
    });
  }

  function ensureThemeListener() {
    if (themeListenerAttached) return;
    win.addEventListener("themechange", onThemeChange);
    themeListenerAttached = true;
  }

  function maybeDetachThemeListener() {
    if (activeMaps.size === 0 && themeListenerAttached) {
      win.removeEventListener("themechange", onThemeChange);
      themeListenerAttached = false;
    }
  }

  // ------------------------------------------------------------------
  // Basemap switching — shared across every live day map
  // ------------------------------------------------------------------
  /** Switch the basemap on ALL live maps ("map" | "sat" | "osm"), persist the
   *  choice, and keep every switcher control's active button in sync. New maps
   *  initialized later read the (already-updated) module-level currentBase. */
  function setBaseAll(mode) {
    if (mode !== "map" && mode !== "sat" && mode !== "osm") return;
    currentBase = mode;
    persistBase(mode);
    activeMaps.forEach(function (entry) {
      if (entry && typeof entry.setBase === "function") entry.setBase(mode);
    });
  }

  /** Build a compact top-right basemap switcher for one map: three buttons
   *  (Map / Sat / OSM). `onSelect(mode)` fires on click; `update(mode)` syncs
   *  the active button and its aria-pressed state. */
  function buildBaseSwitcher(map, onSelect) {
    const container = L.DomUtil.create("div", "basemap-switch leaflet-control");
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "Basemap");
    const labels = { map: "Map", sat: "Sat", osm: "OSM" };
    const buttons = {};
    BASE_MODES.forEach(function (mode) {
      const btn = L.DomUtil.create("button", "basemap-switch__btn", container);
      btn.type = "button";
      btn.textContent = labels[mode];
      btn.setAttribute("aria-pressed", "false");
      btn.title = "Use " + labels[mode] + " basemap";
      btn.addEventListener("click", function () {
        onSelect(mode);
      });
      buttons[mode] = btn;
    });
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    function update(mode) {
      BASE_MODES.forEach(function (m) {
        const active = m === mode;
        buttons[m].classList.toggle("is-active", active);
        buttons[m].setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    const control = L.control({ position: "topright" });
    control.onAdd = function () {
      return container;
    };
    return { control: control, update: update };
  }

  // ------------------------------------------------------------------
  // Viewport resize — the map container height is CSS-clamped (45vh), so
  // mobile URL-bar show/hide and rotation change the container size without
  // Leaflet knowing. One shared, debounced listener covers every live map.
  // ------------------------------------------------------------------
  let viewportResizeTimer = null;

  function onViewportResize() {
    if (viewportResizeTimer) clearTimeout(viewportResizeTimer);
    viewportResizeTimer = setTimeout(function () {
      viewportResizeTimer = null;
      if (activeMaps.size === 0) return;
      activeMaps.forEach(function (entry) {
        if (entry && typeof entry.invalidateSize === "function") {
          entry.invalidateSize();
        }
      });
    }, 150);
  }

  function ensureResizeListener() {
    if (resizeListenerAttached) return;
    win.addEventListener("resize", onViewportResize, { passive: true });
    win.addEventListener("orientationchange", onViewportResize);
    resizeListenerAttached = true;
  }

  // ------------------------------------------------------------------
  // Day map
  // ------------------------------------------------------------------
  function initDayMap(containerId, day, opts) {
    if (leafletMissing) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("TripMaps: Leaflet (window.L) is not loaded — map '" + containerId + "' unavailable.");
      }
      return noopApi;
    }

    const container = doc.getElementById(containerId);
    if (!container) return null;

    opts = opts || {};
    const dayId = day && day.id;

    const map = L.map(container, { zoomControl: true, scrollWheelZoom: false });
    map.scrollWheelZoom.disable();
    map.on("click", function () {
      if (map.scrollWheelZoom && !map.scrollWheelZoom.enabled()) {
        map.scrollWheelZoom.enable();
      }
    });

    let destroyed = false;
    let tileLayer = null;
    let activeMarkerIndex = null;
    let userMarker = null;
    let userAccuracyCircle = null;

    // Waypoint sequence: origin + entries with coords, CHRONOLOGICALLY sorted
    // (by start / depart time) via TripData.getWaypoints — the SAME sequence
    // the timeline uses, so marker numbers, timeline badges, drive-row
    // data-leg indices and legResults indices stay in lockstep. Day-2's origin
    // ("Depart — Swansea", 12:00) sorts AFTER "Free morning — Swansea" (09:00,
    // same coords).
    const waypoints = [];
    if (win.TripData && typeof win.TripData.getWaypoints === "function") {
      waypoints.push.apply(waypoints, win.TripData.getWaypoints(day));
    } else {
      // Fallback (no TripData): origin first, then entries in authored order.
      if (day && day.origin && Array.isArray(day.origin.coords)) {
        waypoints.push({
          title: day.origin.title || "Departure",
          coords: day.origin.coords,
          start: null,
          end: null,
          place: "",
          departTime: day.origin.departTime || null,
          alt: false
        });
      }
      if (day && Array.isArray(day.entries)) {
        day.entries.forEach(function (e) {
          if (e && Array.isArray(e.coords)) {
            waypoints.push({
              title: e.title || "",
              coords: e.coords,
              start: e.start || null,
              end: e.end || null,
              place: e.place || "",
              departTime: null,
              alt: !!e.alt
            });
          }
        });
      }
    }

    // Tiles (base-aware; theme-aware for the "map" base; re-applied on
    // "themechange" / setTheme / setBase).
    tileLayer = createBaseLayer(currentBase, effectiveTheme());
    tileLayer.addTo(map);

    // Numbered markers + popups (DOM built with textContent — no HTML string
    // interpolation of itinerary data).
    // Waypoints that share the exact same coordinates (day-2 "Free morning —
    // Swansea" == origin "Depart — Swansea", two HBA entries, etc.) would
    // otherwise stack and let the later marker hide the earlier one's number.
    // Each subsequent marker at the same point is fanned out 30 px to the
    // right via a left-shifted anchor, keeping both numbers readable.
    // markers[] order stays waypoint (chronological) order — the rest of the
    // module relies on that index.
    const stackCounts = new Map(); // coordKey -> number of markers already placed there

    const markers = waypoints.map(function (wp, i) {
      const num = doc.createElement("span");
      num.className = "trip-marker__num";
      num.textContent = String(i + 1);

      const key = coordKey(wp.coords[0], wp.coords[1]);
      const stackedCount = stackCounts.get(key) || 0;
      stackCounts.set(key, stackedCount + 1);
      const stacked = stackedCount > 0;

      const icon = L.divIcon({
        className:
          "trip-marker" +
          (wp.alt ? " trip-marker--alt" : "") +
          (stacked ? " trip-marker--stacked" : ""),
        html: num,
        iconSize: [26, 26],
        iconAnchor: stacked ? [13 - stackedCount * 30, 13] : [13, 13],
        // Leaflet 1.9.4 opens popups at the marker's TRUE coordinate (the
        // iconAnchor is ignored for popup position), so a fanned (stacked)
        // marker's popup would open 30px * k to the LEFT of its icon. Shift
        // the popup right by the same 30px * k so it opens horizontally
        // centered on the fanned icon; the first marker (k = 0) keeps the
        // default [0, -15].
        popupAnchor: stacked ? [30 * stackedCount, -15] : [0, -15]
      });

      const marker = L.marker(wp.coords, { icon: icon, title: wp.title, keyboard: true }).addTo(map);

      // Popup: <b>title</b><br>start–end · place
      const content = doc.createElement("div");
      content.className = "trip-popup";
      const titleEl = doc.createElement("b");
      titleEl.textContent = wp.title;
      content.appendChild(titleEl);
      const timeLabel = wp.start
        ? wp.start + "–" + (wp.end || "")
        : (wp.departTime || "");
      const metaPieces = [timeLabel, wp.place].filter(function (s) {
        return s && String(s).trim();
      });
      if (metaPieces.length) {
        content.appendChild(doc.createElement("br"));
        const metaEl = doc.createElement("span");
        metaEl.textContent = metaPieces.join(" · ");
        content.appendChild(metaEl);
      }
      // Google Maps link: curated gmapsQuery when the data provides one,
      // otherwise fall back to "<title>, Tasmania, Australia".
      const gmaps = doc.createElement("a");
      gmaps.className = "trip-popup__gmaps";
      gmaps.href =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(wp.gmapsQuery || (wp.title + ", Tasmania, Australia"));
      gmaps.target = "_blank";
      gmaps.rel = "noopener noreferrer";
      gmaps.textContent = "View on Google Maps ↗";
      content.appendChild(gmaps);
      marker.bindPopup(content);

      return marker;
    });

    // Scale control (nice for a driving itinerary).
    L.control.scale({ imperial: false }).addTo(map);

    // Basemap switcher (top-right): Map / Sat / OSM. Clicking a button swaps
    // the basemap on every live day map and persists the preference.
    const switcher = buildBaseSwitcher(map, function (mode) {
      setBaseAll(mode);
    });
    switcher.control.addTo(map);
    switcher.update(currentBase);

    // Leg results are collected here; slots keep itinerary order even though
    // driving legs resolve asynchronously. Exposed live on the api.
    const legResults = new Array(Math.max(0, waypoints.length - 1)).fill(null);

    // Drawn route geometry + live layers, keyed by leg index. Kept so a
    // basemap/theme switch can tear down and re-draw every route line with the
    // new styling (sat: white main + dark casing; dark "map": white halo +
    // green main; light: single green main).
    const legShapes = new Array(legResults.length).fill(null);
    const routeLayers = [];
    // Provisional (route--pending) layers per leg. redrawRoutes may replace
    // them while OSRM is still resolving, so drawLeg's removePending must
    // remove the CURRENT pending layers, not the stale first-draw ones.
    const pendingLayersByLeg = new Array(legResults.length).fill(null);

    function recordRouteLayers(layers) {
      if (!layers) return;
      for (let k = 0; k < layers.length; k++) {
        routeLayers.push(layers[k]);
      }
    }

    function findLeg(a, b) {
      if (win.TripData && typeof win.TripData.findLeg === "function") {
        // TripData.findLeg: exact title match, then coordinate match (e.g.
        // day-2 "Depart — Swansea" -> Wineglass resolves to the authored leg
        // from "Free morning — Swansea", which shares the origin's coords).
        return win.TripData.findLeg(day, a, b);
      }
      if (!day || !Array.isArray(day.legs) || !a || !b) return null;
      for (let k = 0; k < day.legs.length; k++) {
        const l = day.legs[k];
        if (l && l.from === a.title && l.to === b.title) return l;
      }
      return null;
    }

    function setLegResult(i, from, to, km, min, mode, source) {
      if (i >= 0 && i < legResults.length) {
        legResults[i] = { from: from, to: to, km: km, min: min, mode: mode, source: source };
      }
    }

    // Draw a route as a halo + main line pair in dark mode (white halo lifts
    // the line off the dark CARTO tiles); a single line in light mode. For
    // dashed fallback/water lines the halo stays solid while the main line
    // keeps its dashes.
    //
    // Satellite imagery is always light, so a bright main line needs the
    // opposite treatment: a dark casing underneath (solid, even for dashed
    // lines) with the main line in white. Sat wins over the dark-map white
    // halo whenever both could apply — this branch returns before the pair
    // below runs, so the two schemes never coexist.
    function addRouteLine(latlngs, style) {
      if (destroyed || !style) return null;
      const layers = [];
      if (currentBase === "sat") {
        layers.push(
          L.polyline(latlngs, {
            color: "#0e1a12",
            weight: style.haloWeight ? style.haloWeight + 1 : style.weight + 4,
            opacity: 0.85,
            interactive: false
          }).addTo(map)
        );
        const satOpts = {
          color: "#ffffff",
          weight: style.weight,
          opacity: 0.95
        };
        if (style.dashArray) satOpts.dashArray = style.dashArray;
        if (style.className) satOpts.className = style.className;
        layers.push(L.polyline(latlngs, satOpts).addTo(map));
        return layers;
      }
      const dark = routeTheme() === "dark";
      if (dark) {
        layers.push(
          L.polyline(latlngs, {
            color: "#f4efe6",
            weight: style.haloWeight || 5,
            opacity: 0.55,
            interactive: false
          }).addTo(map)
        );
      }
      const opts = {
        color: style.color,
        weight: style.weight,
        opacity: style.opacity
      };
      if (style.dashArray) opts.dashArray = style.dashArray;
      if (style.className) opts.className = style.className;
      layers.push(L.polyline(latlngs, opts).addTo(map));
      return layers;
    }

    function drawLeg(i, a, b) {
      // Same-coordinate legs (e.g. day-0 Flight -> Collect car at HBA, day-2
      // origin Swansea -> free morning) need no routing: skip the wasted OSRM
      // call and the phantom 0 km / 1 min line, but keep the result slot
      // indexed in itinerary order.
      if (sameCoords(a.coords, b.coords)) {
        legShapes[i] = null;
        if (!destroyed) {
          setLegResult(i, a.title, b.title, 0, 0, "skip", "skip");
        }
        return Promise.resolve();
      }

      const leg = findLeg(a, b);
      const mode = leg && leg.mode ? leg.mode : "driving";

      if (mode === "driving") {
        // Provisional dashed straight line as soon as the markers exist, so a
        // connecting path is visible while OSRM resolves. Replaced by the
        // routed solid line on success or the dashed estimate on failure —
        // either way the provisional layers are removed first.
        if (!destroyed) {
          const pendingLayers = addRouteLine([a.coords, b.coords], styleFor("pending"));
          legShapes[i] = { latlngs: [a.coords, b.coords], kind: "pending" };
          recordRouteLayers(pendingLayers);
          pendingLayersByLeg[i] = pendingLayers;
        }

        // Removes the CURRENT provisional layers for this leg — redrawRoutes
        // may have replaced the first-draw pending layers with freshly
        // styled ones mid-flight, so we track them per-leg instead of in a
        // stale closure.
        function removePending() {
          const current = pendingLayersByLeg[i];
          if (current) {
            current.forEach(function (layer) {
              map.removeLayer(layer);
            });
            pendingLayersByLeg[i] = null;
          }
        }

        return osrmRoute(a.coords, b.coords).then(function (route) {
          if (destroyed) return;
          removePending();
          const layers = addRouteLine(route.polyline, styleFor("route"));
          legShapes[i] = { latlngs: route.polyline, kind: "route" };
          recordRouteLayers(layers);
          setLegResult(i, a.title, b.title, route.km, route.min, "driving", "osrm");
        }).catch(function () {
          if (destroyed) return;
          removePending();
          const layers = addRouteLine([a.coords, b.coords], styleFor("estimate"));
          legShapes[i] = { latlngs: [a.coords, b.coords], kind: "estimate" };
          recordRouteLayers(layers);
          setLegResult(
            i,
            a.title,
            b.title,
            leg && typeof leg.fallbackKm === "number" ? leg.fallbackKm : null,
            leg && typeof leg.fallbackMin === "number" ? leg.fallbackMin : null,
            "driving",
            "estimate"
          );
        });
      }

      // flight / ferry (and any other non-driving mode): fixed dashed straight line.
      if (!destroyed) {
        try {
          const layers = addRouteLine([a.coords, b.coords], styleFor("water"));
          legShapes[i] = { latlngs: [a.coords, b.coords], kind: "water" };
          recordRouteLayers(layers);
          setLegResult(
            i,
            a.title,
            b.title,
            leg && typeof leg.fallbackKm === "number" ? leg.fallbackKm : null,
            leg && typeof leg.fallbackMin === "number" ? leg.fallbackMin : null,
            mode,
            "fixed"
          );
        } catch (err) { /* malformed coordinates — skip visual, keep going */ }
      }
      return Promise.resolve();
    }

    /** Re-style every already-drawn route line after a basemap or theme
     *  switch. Removes all tracked route layers and re-draws from the recorded
     *  geometry (legShapes) with the style that matches the current base/theme:
     *  - sat base                    -> white main + dark casing (addRouteLine's
     *    currentBase branch), regardless of what was drawn before the switch;
     *  - "map" base + dark theme     -> white halo + green main;
     *  - "map" base + light / "osm"  -> single green main.
     *  Legs whose OSRM request is still in flight keep their dashed
     *  route--pending treatment (the CSS animation continues) and the new
     *  pending layers are tracked in pendingLayersByLeg so the eventual
     *  resolve/estimate still removes them. Never invoked during the initial
     *  drawing flow — only from applyTheme / setBase switch events. */
    function redrawRoutes() {
      if (destroyed) return;
      routeLayers.forEach(function (layer) {
        map.removeLayer(layer);
      });
      routeLayers.length = 0;
      for (let i = 0; i < legShapes.length; i++) {
        const shape = legShapes[i];
        if (!shape) continue;
        const result = legResults[i];
        if (result && result.mode === "skip") continue;
        const pending = !result; // leg still resolving — keep dashed pending style
        const layers = addRouteLine(shape.latlngs, styleFor(shape.kind));
        recordRouteLayers(layers);
        if (pending && layers) {
          pendingLayersByLeg[i] = layers;
        }
      }
    }

    function fitToWaypoints() {
      if (destroyed || waypoints.length === 0) return;
      if (waypoints.length === 1) {
        map.setView(waypoints[0].coords, 13, { animate: false });
      } else {
        map.fitBounds(
          L.latLngBounds(waypoints.map(function (w) { return w.coords; })),
          { padding: [70, 70], animate: false, maxZoom: 16 }
        );
      }
    }

    // Initial fit so the map is usable while routes resolve; refit once all
    // routes are drawn.
    fitToWaypoints();

    const legPromises = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      legPromises.push(drawLeg(i, waypoints[i], waypoints[i + 1]));
    }
    Promise.all(legPromises).then(function () {
      if (destroyed) return;
      fitToWaypoints();
      if (typeof opts.onLegs === "function") {
        try {
          opts.onLegs(dayId, legResults);
        } catch (err) { /* caller callback must not break the map */ }
      }
    });

    /** Remove the current tile layer and add a fresh one for `base` at
     *  `theme` (the "map" base is theme-aware; sat/osm ignore the theme). */
    function replaceTileLayer(base, theme) {
      if (tileLayer) {
        map.removeLayer(tileLayer);
        tileLayer = null;
      }
      tileLayer = createBaseLayer(base, theme);
      tileLayer.addTo(map);
      // Marker borders need no JS: CSS [data-theme="dark"] / @media auto rules
      // handle the 3px dark-mode border reactively.
      // Tile swap can shift the map pane's pixel size — re-sync it.
      try {
        map.invalidateSize();
      } catch (err) { /* ignore */ }
    }

    function applyTheme(themeArg) {
      if (destroyed) return;
      // Satellite / OSM layers don't depend on the theme — only the
      // theme-aware "map" base is swapped on "themechange" / setTheme.
      if (currentBase === "map") {
        const theme = themeArg === "dark" || themeArg === "light" ? themeArg : effectiveTheme();
        replaceTileLayer("map", theme);
      }
      // Re-style already-drawn routes on ANY theme change: dark↔light flips
      // the halo treatment on the "map" base; redrawing on sat/osm is a
      // harmless no-op style-wise (routeTheme() forces "light" for sat).
      // Only reached on themechange/setTheme — never during initial drawing.
      redrawRoutes();
    }

    /** Per-map basemap swap (also invoked via setBaseAll on every live map and
     *  exposed as api.setBase). Keeps this map's switcher button in sync. */
    function setBase(mode) {
      if (destroyed) return;
      if (mode !== "map" && mode !== "sat" && mode !== "osm") return;
      replaceTileLayer(mode, effectiveTheme());
      // Redraw every route line so already-drawn legs adopt the new base's
      // styling (e.g. sat: white main + dark casing instead of brand green on
      // green satellite imagery).
      redrawRoutes();
      if (switcher) switcher.update(mode);
    }

    const themeEntry = {
      applyTheme: applyTheme,
      setBase: setBase,
      invalidateSize: function () {
        if (destroyed) return;
        try {
          map.invalidateSize();
        } catch (err) { /* ignore */ }
      }
    };
    ensureThemeListener();
    ensureResizeListener();
    activeMaps.add(themeEntry);

    // Per-marker focus-pulse timers (panTo / fitLeg). Keyed by marker index so
    // rapid clicks never stack or leak timers.
    const focusTimers = new Map();

    /** Pulse a marker with .trip-marker--focus for ~1.4 s (reused by panTo
     *  and fitLeg; previous pulse on the same marker is cancelled first). */
    function pulseMarker(i) {
      const marker = markers[i];
      if (!marker) return;
      const prev = focusTimers.get(i);
      if (prev) clearTimeout(prev);
      const el = marker.getElement();
      if (el) el.classList.add("trip-marker--focus");
      focusTimers.set(i, setTimeout(function () {
        focusTimers.delete(i);
        const current = marker.getElement();
        if (current) current.classList.remove("trip-marker--focus");
      }, 1400));
    }

    const api = {
      legResults: legResults,

      getLegResults: function () {
        return legResults.slice();
      },

      highlight: function (i) {
        if (destroyed) return;
        if (activeMarkerIndex !== null && markers[activeMarkerIndex]) {
          const prevEl = markers[activeMarkerIndex].getElement();
          if (prevEl) prevEl.classList.remove("trip-marker--now");
        }
        const marker = markers[i];
        if (!marker) return;
        const el = marker.getElement();
        if (el) el.classList.add("trip-marker--now");
        activeMarkerIndex = i;
        try {
          map.panTo(marker.getLatLng(), { animate: !prefersReducedMotion() });
        } catch (err) { /* hidden container — ignore */ }
      },

      panTo: function (i) {
        if (destroyed) return;
        const marker = markers[i];
        if (!marker) return;
        pulseMarker(i);
        try {
          map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14), { animate: !prefersReducedMotion() });
        } catch (err) { /* hidden container — ignore */ }
      },

      /** Zoom the map to show the leg between sorted waypoints i and i+1
       *  (fitBounds), pulsing BOTH endpoint markers. Same-coordinate pairs
       *  just zoom in on the shared point. Guards: destroyed, non-integer or
       *  out-of-range index, missing coords -> silent no-op. */
      fitLeg: function (i) {
        if (destroyed) return;
        if (!Number.isInteger(i) || i < 0 || i >= waypoints.length - 1) return;
        const a = waypoints[i];
        const b = waypoints[i + 1];
        const ac = normalizePair(a && a.coords);
        const bc = normalizePair(b && b.coords);
        if (!ac || !bc) return;
        pulseMarker(i);
        pulseMarker(i + 1);
        try {
          if (sameCoords(ac, bc)) {
            map.setView(ac, Math.max(map.getZoom(), 15), { animate: !prefersReducedMotion() });
          } else {
            map.fitBounds(L.latLngBounds([ac, bc]), {
              padding: [60, 60],
              maxZoom: 16,
              animate: !prefersReducedMotion()
            });
          }
        } catch (err) { /* hidden container — ignore */ }
      },

      addUserMarker: function (latlng, accuracy) {
        if (destroyed) return;
        const ll = normalizePair(latlng);
        if (!ll) return;
        if (userMarker) {
          userMarker.setLatLng(ll);
          if (userAccuracyCircle) userAccuracyCircle.setLatLng(ll);
          return;
        }
        userMarker = L.circleMarker(ll, {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: ACCENT_COLOR,
          fillOpacity: 1,
          opacity: 1
        }).addTo(map);
        if (typeof accuracy === "number" && isFinite(accuracy) && accuracy > 0) {
          userAccuracyCircle = L.circle(ll, {
            radius: accuracy,
            color: ACCENT_COLOR,
            weight: 1,
            opacity: 0.5,
            fillColor: ACCENT_COLOR,
            fillOpacity: 0.15,
            interactive: false
          }).addTo(map);
        }
      },

      fitUser: function () {
        if (destroyed || !userMarker) return;
        try {
          const bounds = L.latLngBounds([userMarker.getLatLng(), userMarker.getLatLng()]);
          if (userAccuracyCircle) {
            bounds.extend(userMarker.getLatLng().toBounds(userAccuracyCircle.getRadius()));
          }
          map.fitBounds(bounds, { maxZoom: 16, padding: [40, 40], animate: false });
        } catch (err) { /* ignore */ }
      },

      invalidateSize: function () {
        if (destroyed) return;
        try {
          map.invalidateSize();
        } catch (err) { /* ignore */ }
      },

      setTheme: function (mode) {
        applyTheme(mode);
      },

      setBase: function (mode) {
        setBase(mode);
      },

      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        focusTimers.forEach(function (t) { clearTimeout(t); });
        focusTimers.clear();
        activeMaps.delete(themeEntry);
        try {
          map.remove();
        } catch (err) { /* ignore */ }
        userMarker = null;
        userAccuracyCircle = null;
        markers.length = 0;
        tileLayer = null;
        maybeDetachThemeListener();
      }
    };

    return api;
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  global.TripMaps = {
    initDayMap: initDayMap,
    osrmRoute: osrmRoute
  };
})(typeof window !== "undefined" ? window : null);
