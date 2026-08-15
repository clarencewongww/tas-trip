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
 *   getLegResults(), highlight(i), addUserMarker(latlng, accuracy?),
 *   fitUser(), invalidateSize(), destroy(), setTheme(mode)
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
  const OSRM_RATE_MS = 800; // demo server rate limit — one request per 800 ms
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
  const activeMaps = new Set(); // entries: { applyTheme } for live maps (theme re-apply)
  let queueTail = Promise.resolve(); // OSRM throttle queue (FIFO)
  let themeListenerAttached = false;

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
  // OSRM routing (shared helper: FIFO throttle queue + cache)
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

  /** Run `fn` after the previous queued request, then wait 800 ms before the next. */
  function throttled(fn) {
    const run = queueTail.then(fn);
    queueTail = run.then(
      function () { return new Promise(function (resolve) { setTimeout(resolve, OSRM_RATE_MS); }); },
      function () { return new Promise(function (resolve) { setTimeout(resolve, OSRM_RATE_MS); }); }
    );
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
    addUserMarker: function () {},
    fitUser: function () {},
    invalidateSize: function () {},
    destroy: function () {},
    setTheme: function () {}
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

    // Waypoint sequence: [origin] + entries (origin first when present).
    const waypoints = [];
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

    // Tiles (theme-aware; re-applied on "themechange" / setTheme).
    tileLayer = createTileLayer(effectiveTheme());
    tileLayer.addTo(map);

    // Numbered markers + popups (DOM built with textContent — no HTML string
    // interpolation of itinerary data).
    const markers = waypoints.map(function (wp, i) {
      const num = doc.createElement("span");
      num.className = "trip-marker__num";
      num.textContent = String(i + 1);

      const icon = L.divIcon({
        className: "trip-marker" + (wp.alt ? " trip-marker--alt" : ""),
        html: num,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -15]
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
      marker.bindPopup(content);

      return marker;
    });

    // Scale control (nice for a driving itinerary).
    L.control.scale({ imperial: false }).addTo(map);

    // Leg results are collected here; slots keep itinerary order even though
    // driving legs resolve asynchronously. Exposed live on the api.
    const legResults = new Array(Math.max(0, waypoints.length - 1)).fill(null);

    function findLeg(fromTitle, toTitle) {
      if (!day || !Array.isArray(day.legs)) return null;
      for (let k = 0; k < day.legs.length; k++) {
        const l = day.legs[k];
        if (l && l.from === fromTitle && l.to === toTitle) return l;
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
    function addRouteLine(latlngs, style) {
      if (destroyed || !style) return;
      const dark = effectiveTheme() === "dark";
      if (dark) {
        L.polyline(latlngs, {
          color: "#f4efe6",
          weight: style.haloWeight || 5,
          opacity: 0.55,
          interactive: false
        }).addTo(map);
      }
      const opts = {
        color: style.color,
        weight: style.weight,
        opacity: style.opacity
      };
      if (style.dashArray) opts.dashArray = style.dashArray;
      L.polyline(latlngs, opts).addTo(map);
    }

    function drawLeg(i, a, b) {
      // Same-coordinate legs (e.g. day-0 Flight -> Collect car at HBA, day-2
      // origin Swansea -> free morning) need no routing: skip the wasted OSRM
      // call and the phantom 0 km / 1 min line, but keep the result slot
      // indexed in itinerary order.
      if (sameCoords(a.coords, b.coords)) {
        if (!destroyed) {
          setLegResult(i, a.title, b.title, 0, 0, "skip", "skip");
        }
        return Promise.resolve();
      }

      const leg = findLeg(a.title, b.title);
      const mode = leg && leg.mode ? leg.mode : "driving";

      if (mode === "driving") {
        return osrmRoute(a.coords, b.coords).then(function (route) {
          if (destroyed) return;
          const dark = effectiveTheme() === "dark";
          addRouteLine(route.polyline, {
            color: BRAND_COLOR,
            weight: 4,
            opacity: dark ? 0.9 : 0.8,
            haloWeight: 7
          });
          setLegResult(i, a.title, b.title, route.km, route.min, "driving", "osrm");
        }).catch(function () {
          if (destroyed) return;
          addRouteLine([a.coords, b.coords], {
            dashArray: "4 8",
            color: FALLBACK_COLOR,
            weight: 3,
            opacity: 0.8,
            haloWeight: 5
          });
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
          addRouteLine([a.coords, b.coords], {
            dashArray: "6 10",
            color: WATER_COLOR,
            weight: 3,
            opacity: 0.8,
            haloWeight: 5
          });
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

    function applyTheme(themeArg) {
      if (destroyed) return;
      const theme = themeArg === "dark" || themeArg === "light" ? themeArg : effectiveTheme();
      if (tileLayer) {
        map.removeLayer(tileLayer);
        tileLayer = null;
      }
      tileLayer = createTileLayer(theme);
      tileLayer.addTo(map);
      // Marker borders need no JS: CSS [data-theme="dark"] / @media auto rules
      // handle the 3px dark-mode border reactively.
    }

    const themeEntry = { applyTheme: applyTheme };
    ensureThemeListener();
    activeMaps.add(themeEntry);

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

      destroy: function () {
        if (destroyed) return;
        destroyed = true;
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
