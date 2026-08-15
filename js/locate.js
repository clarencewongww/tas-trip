/* TripLocate — "Locate me" geolocation feature for the TasRoad itinerary.
 *
 * Consumes window.TripGeo (js/geo.js), window.TripTimeline (js/timeline.js),
 * window.TripRender (js/render.js) and window.TripMaps (js/maps.js) — all
 * loaded before this script in index.html.
 *
 * Privacy: the position is resolved on-device and only used to draw a marker
 * and ask OSRM for a driving route when the user presses "Locate me".
 * All DOM text is written via textContent (no HTML string interpolation of
 * itinerary or position data).
 *
 * Public API (window.TripLocate):
 *   init()      — hide #locate-btn when geolocation is unsupported; wire the
 *                 click handler; append a privacy line under #locate-readout.
 *                 Returns nothing.
 *   locate()    — the click handler (also exposed for testing): resolve the
 *                 position, pick the itinerary stop you should be at, drop a
 *                 user marker on the day map and show distance + ETA.
 */
(function (global) {
  "use strict";
  if (typeof global === "undefined" || global === null) return;

  const doc = global.document;

  function getEl(id) {
    return doc.getElementById(id);
  }

  function setReadout(readout, msg) {
    if (readout) readout.textContent = msg;
  }

  /** Normalize [lat,lng] arrays or {lat,lng} objects -> {lat,lng} | null. */
  function toLatLng(p) {
    if (Array.isArray(p)) {
      const lat = Number(p[0]);
      const lng = Number(p[1]);
      if (isFinite(lat) && isFinite(lng)) return { lat: lat, lng: lng };
      return null;
    }
    if (p && typeof p.lat === "number" && typeof p.lng === "number") {
      return { lat: p.lat, lng: p.lng };
    }
    return null;
  }

  /**
   * Great-circle distance in km between two [lat,lng] arrays or {lat,lng}
   * objects. Returns null if either coordinate is malformed.
   */
  function haversineKm(a, b) {
    const A = toLatLng(a);
    const B = toLatLng(b);
    if (!A || !B) return null;
    const R = 6371; // mean Earth radius, km
    const toRad = function (deg) { return (deg * Math.PI) / 180; };
    const dLat = toRad(B.lat - A.lat);
    const dLng = toRad(B.lng - A.lng);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(A.lat)) * Math.cos(toRad(B.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /**
   * Pick the itinerary stop the user should currently be heading toward:
   *   1. the live entry you are inside right now (phase "live", not a gap);
   *   2. otherwise the next scheduled item (st.next), matched by title across
   *      all days, falling back to the current day's first entry (live) or
   *      day 0's first entry (pre/post).
   * Returns { coords, place, dayIndex } or null.
   */
  function resolveTarget(st) {
    const trip = global.TRIP;
    const days = trip && Array.isArray(trip.days) ? trip.days : [];

    // 1. Currently inside a live entry.
    if (
      st &&
      st.phase === "live" &&
      !st.inGap &&
      typeof st.entryIndex === "number" &&
      st.entryIndex >= 0 &&
      days[st.dayIndex]
    ) {
      const entry = days[st.dayIndex].entries[st.entryIndex];
      if (entry && entry.coords) {
        return { coords: entry.coords, place: entry.place || entry.title, dayIndex: st.dayIndex };
      }
    }

    // 2. Aim for the next scheduled item (gaps, pre-trip, inter-day nights).
    if (st && st.next) {
      for (let i = 0; i < days.length; i++) {
        const entries = days[i] && Array.isArray(days[i].entries) ? days[i].entries : [];
        for (let j = 0; j < entries.length; j++) {
          if (entries[j] && entries[j].title === st.next.title && entries[j].coords) {
            return { coords: entries[j].coords, place: entries[j].place || entries[j].title, dayIndex: i };
          }
        }
      }
      // Fallback: live → that day's first entry; otherwise day 0's first entry.
      const dayIdx = st.phase === "live" && days[st.dayIndex] ? st.dayIndex : 0;
      const day = days[dayIdx];
      const first = day && Array.isArray(day.entries) ? day.entries[0] : null;
      if (first && first.coords) {
        return { coords: first.coords, place: first.place || first.title, dayIndex: dayIdx };
      }
    }

    return null;
  }

  /**
   * The "Locate me" click handler. Guarded; async flow runs in
   * try / catch / finally so the button always recovers.
   */
  async function locate() {
    const btn = getEl("locate-btn");
    const readout = getEl("locate-readout");
    if (!btn || !readout) return;

    // Guard: unsupported context or a request already in flight.
    if (!global.TripGeo || !global.TripGeo.isSupported()) return;
    if (btn.disabled) return;

    btn.disabled = true;
    btn.textContent = "Locating…";

    try {
      // 1. Resolve the device position (stays on-device).
      const pos = await global.TripGeo.getPosition();

      // 2. Decide where the user should be right now.
      let st = null;
      if (global.TripTimeline && typeof global.TripTimeline.state === "function") {
        st = global.TripTimeline.state(Date.now());
      }
      const target = resolveTarget(st);
      if (!target) {
        setReadout(readout, "No upcoming stop to route to right now.");
        return;
      }

      // 3. Ensure the target day's map exists (lazy-inits when needed).
      let api = null;
      if (global.TripRender) {
        api = global.TripRender.getMapApi(target.dayIndex);
        if (!api) {
          // Keep the canonical active day (TripRender) in sync when we
          // force-open a day's map so preview highlights follow it.
          if (typeof global.TripRender.setActiveDay === "function") {
            global.TripRender.setActiveDay(target.dayIndex);
          }
          global.TripRender.activateDay(target.dayIndex);
          api = global.TripRender.getMapApi(target.dayIndex);
        }
      }
      if (!api) {
        setReadout(readout, "Map not available");
        return;
      }

      // 4. Drop the user marker and frame it.
      api.addUserMarker([pos.lat, pos.lng], pos.accuracy);
      api.fitUser();

      // 5. Ask OSRM for a driving route; fall back to a straight line.
      let r = null;
      if (global.TripMaps && typeof global.TripMaps.osrmRoute === "function") {
        r = await global.TripMaps.osrmRoute([pos.lat, pos.lng], target.coords)
          .catch(function () { return null; });
      }

      if (r && typeof r.km === "number" && isFinite(r.km) && typeof r.min === "number") {
        setReadout(
          readout,
          "You are " + Math.round(r.km) + " km · ~" + Math.round(r.min) +
            " min from " + target.place
        );
        return;
      }

      const d = haversineKm(pos, target.coords);
      if (d === null) {
        setReadout(readout, "Location unavailable right now.");
        return;
      }
      setReadout(readout, "≈ " + Math.round(d) + " km from " + target.place + " (straight line)");
    } catch (e) {
      // 6. Geolocation error codes (TripGeo rejects with a string .code).
      const code = e && e.code;
      if (code === "denied") {
        setReadout(readout, "Location blocked — enable location access for this feature");
      } else if (code === "timeout") {
        setReadout(readout, "Couldn't get a fix — try again");
      } else {
        setReadout(readout, "Location unavailable right now.");
      }
    } finally {
      // 7. Always restore the button.
      btn.disabled = false;
      btn.textContent = "Locate me";
    }
  }

  /**
   * Wire up the feature. Returns nothing.
   * - Hides #locate-btn when geolocation is unsupported.
   * - Otherwise wires the click handler.
   * - Appends a privacy line as a sibling directly under #locate-readout
   *   (so locating in the readout doesn't erase it).
   */
  function init() {
    const btn = getEl("locate-btn");
    const readout = getEl("locate-readout");
    if (!btn || !readout) return;

    if (!global.TripGeo || !global.TripGeo.isSupported()) {
      btn.hidden = true;
    } else {
      btn.addEventListener("click", locate);
    }

    const privacy = doc.createElement("span");
    privacy.className = "locate-privacy";
    privacy.textContent = "Your location stays on your device — coordinates are sent only to the OSRM routing service to calculate a route and are never stored.";
    readout.parentNode.insertBefore(privacy, readout.nextSibling);
  }

  global.TripLocate = {
    init: init,
    locate: locate
  };
})(typeof window !== "undefined" ? window : null);
